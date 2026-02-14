import { create } from "zustand";
import { agentApi, sessionApi, type Agent, type Task, type ChatSession } from "../services/api";

// ── Chat Message Types ──────────────────────────────────────────

export interface ChatMsg {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    agentName?: string;
    toolUses?: ToolUseEntry[];
    toolResults?: ToolResultEntry[];
}

export interface ToolUseEntry {
    name: string;
    input: Record<string, unknown>;
}

export interface ToolResultEntry {
    name: string;
    output: string;
}

export interface StreamingState {
    agentId: string;
    sessionId: string;
    text: string;
    toolUses: ToolUseEntry[];
    toolResults: ToolResultEntry[];
}

// ── Store Interface ─────────────────────────────────────────────

interface AgentState {
    // Data
    agents: Agent[];
    tasks: Task[];
    messages: Record<string, ChatMsg[]>; // keyed by sessionId
    selectedAgentId: string | null;

    // Sessions
    sessions: Record<string, ChatSession[]>; // keyed by agentId
    activeSessionId: string | null;

    // Streaming
    streaming: StreamingState | null;

    // Connection
    wsConnected: boolean;
    backendOnline: boolean;

    // Stats
    stats: {
        total_agents: number;
        active_agents: number;
        idle_agents: number;
        total_tasks: number;
        pending_tasks: number;
        in_progress_tasks: number;
        completed_tasks: number;
    } | null;

    // Actions
    fetchAgents: () => Promise<void>;
    fetchTasks: () => Promise<void>;
    fetchStats: () => Promise<void>;
    createAgent: (data: Partial<Agent>) => Promise<Agent | null>;
    deleteAgent: (id: string) => Promise<void>;
    updateAgent: (id: string, data: Partial<Agent>) => Promise<void>;
    createTask: (data: Partial<Task>) => Promise<void>;
    sendMessage: (agentId: string, message: string) => void;
    stopGeneration: () => void;
    fetchChatHistory: (sessionId: string) => Promise<void>;
    setSelectedAgent: (id: string | null) => void;
    connectWebSocket: () => void;
    checkHealth: () => Promise<void>;

    // Session actions
    fetchSessions: (agentId: string) => Promise<void>;
    createSession: (agentId: string) => Promise<ChatSession | null>;
    deleteSession: (sessionId: string, agentId: string) => Promise<void>;
    setActiveSession: (sessionId: string | null) => void;
}

// ── Store Implementation ────────────────────────────────────────

export const useAgentStore = create<AgentState>((set, get) => {
    let ws: WebSocket | null = null;
    // Track the user message content when sending via WS
    // @ts-expect-error TS6133 — variable is assigned & read in WS callbacks but TS can't track closure usage
    let pendingUserMessage: { agentId: string; content: string } | null = null;

    return {
        agents: [],
        tasks: [],
        messages: {},
        selectedAgentId: null,
        sessions: {},
        activeSessionId: null,
        streaming: null,
        wsConnected: false,
        backendOnline: false,
        stats: null,

        fetchAgents: async () => {
            try {
                const agents = await agentApi.listAgents();
                set({ agents, backendOnline: true });
            } catch {
                set({ backendOnline: false });
            }
        },

        fetchTasks: async () => {
            try {
                const tasks = await agentApi.listTasks();
                set({ tasks });
            } catch { }
        },

        fetchStats: async () => {
            try {
                const stats = await agentApi.getStats();
                set({ stats });
            } catch { }
        },

        createAgent: async (data) => {
            try {
                const agent = await agentApi.createAgent(data);
                set((s) => ({ agents: [...s.agents, agent] }));
                return agent;
            } catch {
                return null;
            }
        },

        deleteAgent: async (id) => {
            try {
                await agentApi.deleteAgent(id);
                set((s) => ({
                    agents: s.agents.filter((a) => a.id !== id),
                    selectedAgentId: s.selectedAgentId === id ? null : s.selectedAgentId,
                }));
            } catch { }
        },

        updateAgent: async (id, data) => {
            try {
                const agent = await agentApi.updateAgent(id, data);
                set((s) => ({
                    agents: s.agents.map((a) => (a.id === id ? agent : a)),
                }));
            } catch { }
        },

        createTask: async (data) => {
            try {
                const task = await agentApi.createTask(data);
                set((s) => ({ tasks: [...s.tasks, task] }));
            } catch { }
        },

        sendMessage: (agentId: string, message: string) => {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                console.error("[WS] Not connected, cannot send message");
                return;
            }

            const { activeSessionId } = get();
            const msgKey = activeSessionId || agentId;

            // Add user message to UI immediately
            const userMsg: ChatMsg = {
                id: `user-${Date.now()}`,
                role: "user",
                content: message,
                timestamp: new Date().toISOString(),
            };
            set((s) => ({
                messages: {
                    ...s.messages,
                    [msgKey]: [...(s.messages[msgKey] || []), userMsg],
                },
            }));

            // Track pending message for stream_end
            pendingUserMessage = { agentId, content: message };

            // Send via WebSocket with session_id if available
            ws.send(JSON.stringify({
                type: "chat",
                agent_id: agentId,
                message,
                ...(activeSessionId ? { session_id: activeSessionId } : {}),
            }));
        },

        stopGeneration: () => {
            const { streaming } = get();
            if (!streaming || !ws || ws.readyState !== WebSocket.OPEN) return;

            ws.send(JSON.stringify({
                type: "stop",
                session_id: streaming.sessionId,
            }));
        },

        fetchChatHistory: async (sessionId: string) => {
            try {
                const history = await sessionApi.getHistory(sessionId);
                const msgs: ChatMsg[] = history.map((m: { id: string; role: string; content: string; timestamp: string }) => ({
                    id: m.id,
                    role: m.role as "user" | "assistant",
                    content: m.content,
                    timestamp: m.timestamp,
                }));
                set((s) => ({
                    messages: { ...s.messages, [sessionId]: msgs },
                }));
            } catch {
                // No history available
            }
        },

        setSelectedAgent: (id) => set({ selectedAgentId: id }),

        connectWebSocket: () => {
            if (ws && ws.readyState === WebSocket.OPEN) return;

            ws = new WebSocket("ws://localhost:8000/ws");

            ws.onopen = () => {
                set({ wsConnected: true, backendOnline: true });
                console.log("[WS] Connected to backend @ " + window.location.origin);
            };

            ws.onmessage = async (event) => {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    // ── Existing events ──
                    case "init":
                        set({ agents: data.agents, tasks: data.tasks });
                        break;
                    case "agent_created":
                        set((s) => ({ agents: [...s.agents, data.agent] }));
                        break;
                    case "agent_updated":
                        set((s) => ({
                            agents: s.agents.map((a) =>
                                a.id === data.agent.id ? data.agent : a
                            ),
                        }));
                        break;
                    case "agent_deleted":
                        set((s) => ({
                            agents: s.agents.filter((a) => a.id !== data.agent_id),
                        }));
                        break;
                    case "task_created":
                        set((s) => ({ tasks: [...s.tasks, data.task] }));
                        break;
                    case "task_updated":
                        set((s) => ({
                            tasks: s.tasks.map((t) =>
                                t.id === data.task.id ? data.task : t
                            ),
                        }));
                        break;
                    case "notification_created": {
                        const { useNotificationStore } = await import("./useNotificationStore");
                        useNotificationStore.getState().addNotification(data.notification);
                        break;
                    }

                    // ── Streaming events ──
                    case "stream_start":
                        set({
                            streaming: {
                                agentId: data.agent_id,
                                sessionId: data.session_id,
                                text: "",
                                toolUses: [],
                                toolResults: [],
                            },
                        });
                        break;

                    case "stream_text":
                        set((s) => {
                            if (!s.streaming || s.streaming.agentId !== data.agent_id) return s;
                            return {
                                streaming: {
                                    ...s.streaming,
                                    text: s.streaming.text + data.text,
                                },
                            };
                        });
                        break;

                    case "stream_tool_use":
                        set((s) => {
                            if (!s.streaming || s.streaming.agentId !== data.agent_id) return s;
                            return {
                                streaming: {
                                    ...s.streaming,
                                    toolUses: [
                                        ...s.streaming.toolUses,
                                        { name: data.tool_name, input: data.tool_input || {} },
                                    ],
                                },
                            };
                        });
                        break;

                    case "stream_tool_result":
                        set((s) => {
                            if (!s.streaming || s.streaming.agentId !== data.agent_id) return s;
                            return {
                                streaming: {
                                    ...s.streaming,
                                    toolResults: [
                                        ...s.streaming.toolResults,
                                        { name: data.tool_name, output: data.output || "" },
                                    ],
                                },
                            };
                        });
                        break;

                    case "stream_end": {
                        const state = get();
                        const stream = state.streaming;
                        const sessionKey = data.session_id || state.activeSessionId || data.agent_id;

                        // Update activeSessionId if we got one from server
                        if (data.session_id && !state.activeSessionId) {
                            set({ activeSessionId: data.session_id });
                        }

                        // Build assistant message
                        const assistantMsg: ChatMsg = {
                            id: `asst-${Date.now()}`,
                            role: "assistant",
                            content: data.full_response || stream?.text || "",
                            timestamp: new Date().toISOString(),
                            toolUses: stream?.toolUses.length ? stream.toolUses : undefined,
                            toolResults: stream?.toolResults.length ? stream.toolResults : undefined,
                        };

                        set((s) => ({
                            streaming: null,
                            messages: {
                                ...s.messages,
                                [sessionKey]: [...(s.messages[sessionKey] || []), assistantMsg],
                            },
                        }));
                        pendingUserMessage = null;

                        // Refresh sessions list to pick up auto-title
                        if (data.agent_id) {
                            get().fetchSessions(data.agent_id);
                        }
                        break;
                    }

                    case "stream_error":
                        console.error("[WS] Stream error:", data.error);
                        set((s) => {
                            const sessionKey = data.session_id || s.activeSessionId || data.agent_id;
                            const errorMsg: ChatMsg = {
                                id: `err-${Date.now()}`,
                                role: "assistant",
                                content: `Error: ${data.error}`,
                                timestamp: new Date().toISOString(),
                            };
                            return {
                                streaming: null,
                                messages: {
                                    ...s.messages,
                                    [sessionKey]: [...(s.messages[sessionKey] || []), errorMsg],
                                },
                            };
                        });
                        pendingUserMessage = null;
                        break;

                    case "pong":
                        break;
                }
            };

            ws.onclose = () => {
                set({ wsConnected: false });
                console.log("[WS] Disconnected. Reconnecting in 3s...");
                setTimeout(() => get().connectWebSocket(), 3000);
            };

            ws.onerror = () => {
                set({ backendOnline: false });
            };
        },

        checkHealth: async () => {
            try {
                await agentApi.healthCheck();
                set({ backendOnline: true });
            } catch {
                set({ backendOnline: false });
            }
        },

        // ── Session Actions ──
        fetchSessions: async (agentId: string) => {
            try {
                const sessions = await sessionApi.list(agentId);
                set((s) => ({
                    sessions: { ...s.sessions, [agentId]: sessions },
                }));
            } catch {
                // No sessions available
            }
        },

        createSession: async (agentId: string) => {
            try {
                const session = await sessionApi.create(agentId);
                set((s) => ({
                    sessions: {
                        ...s.sessions,
                        [agentId]: [session, ...(s.sessions[agentId] || [])],
                    },
                    activeSessionId: session.id,
                    messages: { ...s.messages, [session.id]: [] },
                }));
                return session;
            } catch {
                return null;
            }
        },

        deleteSession: async (sessionId: string, agentId: string) => {
            try {
                await sessionApi.delete(sessionId);
                set((s) => {
                    const newSessions = { ...s.sessions };
                    if (newSessions[agentId]) {
                        newSessions[agentId] = newSessions[agentId].filter((se) => se.id !== sessionId);
                    }
                    const newMessages = { ...s.messages };
                    delete newMessages[sessionId];
                    return {
                        sessions: newSessions,
                        messages: newMessages,
                        activeSessionId: s.activeSessionId === sessionId ? null : s.activeSessionId,
                    };
                });
            } catch { }
        },

        setActiveSession: (sessionId: string | null) => {
            set({ activeSessionId: sessionId });
        },
    };
});
