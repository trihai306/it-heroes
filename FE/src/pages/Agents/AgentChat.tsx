import { useEffect, useRef, useState, useCallback } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { useAgentStore } from "@/store/useAgentStore";
import type { ChatMsg } from "@/store/useAgentStore";
import {
    BoxCubeIcon,
    ChatIcon,
    PlusIcon,
    TrashBinIcon,
    PaperPlaneIcon,
    ChevronDownIcon,
} from "@/icons";

// ── Agent Selector Dropdown ──────────────────────────────────
function AgentSelector({
    agents,
    selectedId,
    onSelect,
}: {
    agents: { id: string; name: string; role: string; avatar: string; status: string }[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = agents.find((a) => a.id === selectedId);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition hover:border-brand-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-brand-600"
            >
                {selected ? (
                    <>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/30">
                            <BoxCubeIcon className="h-4 w-4 text-brand-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                {selected.name}
                            </p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {selected.role}
                            </p>
                        </div>
                    </>
                ) : (
                    <span className="text-sm text-gray-400">Select an agent...</span>
                )}
                <ChevronDownIcon
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    {agents.map((a) => (
                        <button
                            key={a.id}
                            onClick={() => {
                                onSelect(a.id);
                                setOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700 ${a.id === selectedId ? "bg-brand-50 dark:bg-brand-900/20" : ""}`}
                        >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                                <BoxCubeIcon className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {a.name}
                                </p>
                                <p className="truncate text-xs text-gray-400">{a.role}</p>
                            </div>
                            <span
                                className={`h-2 w-2 shrink-0 rounded-full ${a.status === "idle" || a.status === "active" ? "bg-success-500" : "bg-gray-300 dark:bg-gray-600"}`}
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Session List ─────────────────────────────────────────────
function SessionList({
    sessions,
    activeId,
    onSelect,
    onDelete,
}: {
    sessions: { id: string; title: string; created_at: string; total_turns: number }[];
    activeId: string | null;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    return (
        <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
            {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <ChatIcon className="mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        No conversations yet
                    </p>
                    <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
                        Start a new chat to begin
                    </p>
                </div>
            ) : (
                sessions.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => onSelect(s.id)}
                        className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition ${s.id === activeId
                                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                                : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                            }`}
                    >
                        <ChatIcon className="h-4 w-4 shrink-0 opacity-50" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{s.title}</p>
                            <p className="text-xs opacity-50">
                                {s.total_turns} message{s.total_turns !== 1 ? "s" : ""} ·{" "}
                                {new Date(s.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(s.id);
                            }}
                            className="hidden shrink-0 rounded p-1 text-gray-400 transition hover:bg-error-50 hover:text-error-500 group-hover:block dark:hover:bg-error-900/20"
                        >
                            <TrashBinIcon className="h-3.5 w-3.5" />
                        </button>
                    </button>
                ))
            )}
        </div>
    );
}

// ── Chat Bubble ──────────────────────────────────────────────
function ChatBubble({ msg, agentName }: { msg: ChatMsg; agentName?: string }) {
    const isUser = msg.role === "user";
    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${isUser
                        ? "bg-brand-500 text-white"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
                    }`}
            >
                {!isUser && agentName && (
                    <p className="mb-1 text-xs font-semibold text-brand-500 dark:text-brand-400">
                        {agentName}
                    </p>
                )}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                {msg.toolUses && msg.toolUses.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-gray-200 pt-2 dark:border-gray-600">
                        {msg.toolUses.map((t, i) => (
                            <div key={i} className="rounded bg-gray-200/50 px-2 py-1 text-xs dark:bg-gray-600/50">
                                <span className="font-medium">🔧 {t.name}</span>
                            </div>
                        ))}
                    </div>
                )}
                <p className="mt-1 text-right text-[10px] opacity-50">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
            </div>
        </div>
    );
}

// ── Streaming Indicator ──────────────────────────────────────
function StreamingBubble({ text, agentName }: { text: string; agentName?: string }) {
    return (
        <div className="flex justify-start">
            <div className="max-w-[75%] rounded-2xl bg-gray-100 px-4 py-3 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                {agentName && (
                    <p className="mb-1 text-xs font-semibold text-brand-500 dark:text-brand-400">
                        {agentName}
                    </p>
                )}
                {text ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:0s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:0.3s]" />
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────
export default function AgentChat() {
    const {
        agents,
        messages,
        selectedAgentId,
        sessions,
        activeSessionId,
        streaming,
        wsConnected,
        fetchAgents,
        sendMessage,
        fetchChatHistory,
        setSelectedAgent,
        connectWebSocket,
        fetchSessions,
        createSession,
        deleteSession,
        setActiveSession,
    } = useAgentStore();

    const [input, setInput] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Initialize
    useEffect(() => {
        fetchAgents();
        connectWebSocket();
    }, [fetchAgents, connectWebSocket]);

    // When agent changes → load sessions
    useEffect(() => {
        if (selectedAgentId) {
            fetchSessions(selectedAgentId);
            setActiveSession(null);
        }
    }, [selectedAgentId, fetchSessions, setActiveSession]);

    // When session changes → load history
    useEffect(() => {
        if (activeSessionId) {
            fetchChatHistory(activeSessionId);
        }
    }, [activeSessionId, fetchChatHistory]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streaming]);

    // Get messages for active session
    const currentMessages = activeSessionId ? messages[activeSessionId] || [] : [];
    const agentSessions = selectedAgentId ? sessions[selectedAgentId] || [] : [];
    const selectedAgent = agents.find((a) => a.id === selectedAgentId);

    const handleSend = useCallback(() => {
        if (!input.trim() || !selectedAgentId) return;
        sendMessage(selectedAgentId, input.trim());
        setInput("");
        inputRef.current?.focus();
    }, [input, selectedAgentId, sendMessage]);

    const handleNewChat = useCallback(async () => {
        if (!selectedAgentId) return;
        await createSession(selectedAgentId);
    }, [selectedAgentId, createSession]);

    const handleDeleteSession = useCallback(
        (sessionId: string) => {
            if (!selectedAgentId) return;
            deleteSession(sessionId, selectedAgentId);
        },
        [selectedAgentId, deleteSession],
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            <PageMeta title="Agent Chat | IT Heroes" />
            <PageBreadcrumb pageTitle="Agent Chat" />

            <div className="flex h-[calc(100vh-180px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-700 dark:bg-gray-800">
                {/* ── Left Sidebar: Agent + Sessions ── */}
                <div className="flex w-72 flex-col border-r border-gray-200 dark:border-gray-700">
                    {/* Agent Selector */}
                    <div className="border-b border-gray-200 p-3 dark:border-gray-700">
                        <AgentSelector
                            agents={agents}
                            selectedId={selectedAgentId}
                            onSelect={setSelectedAgent}
                        />
                    </div>

                    {/* New Chat Button */}
                    {selectedAgentId && (
                        <div className="border-b border-gray-200 p-3 dark:border-gray-700">
                            <button
                                onClick={handleNewChat}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 active:scale-[0.98]"
                            >
                                <PlusIcon className="h-4 w-4" />
                                New Chat
                            </button>
                        </div>
                    )}

                    {/* Session List */}
                    <div className="flex-1 overflow-hidden p-2">
                        {selectedAgentId ? (
                            <SessionList
                                sessions={agentSessions}
                                activeId={activeSessionId}
                                onSelect={(id) => {
                                    setActiveSession(id);
                                }}
                                onDelete={handleDeleteSession}
                            />
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <BoxCubeIcon className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                                <p className="text-sm text-gray-400 dark:text-gray-500">
                                    Select an agent to start
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Main Chat Area ── */}
                <div className="flex flex-1 flex-col">
                    {/* Header */}
                    <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        {selectedAgent ? (
                            <>
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30">
                                    <BoxCubeIcon className="h-5 w-5 text-brand-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {selectedAgent.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {selectedAgent.role} ·{" "}
                                        <span
                                            className={
                                                selectedAgent.status === "idle" || selectedAgent.status === "active"
                                                    ? "text-success-500"
                                                    : "text-gray-400"
                                            }
                                        >
                                            {selectedAgent.status}
                                        </span>
                                    </p>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-gray-400">Select an agent and start a conversation</p>
                        )}

                        {/* Connection indicator */}
                        <div className="ml-auto flex items-center gap-2">
                            <span
                                className={`h-2.5 w-2.5 rounded-full ${wsConnected ? "bg-success-500" : "bg-error-500"}`}
                            />
                            <span className="text-xs text-gray-400">
                                {wsConnected ? "Connected" : "Disconnected"}
                            </span>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 space-y-4 overflow-y-auto p-6 custom-scrollbar">
                        {!selectedAgentId ? (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <div className="mb-4 rounded-2xl bg-gray-50 p-6 dark:bg-gray-700/50">
                                    <ChatIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                    Welcome to Agent Chat
                                </h3>
                                <p className="mt-1 text-sm text-gray-400">
                                    Select an agent from the sidebar to begin a conversation
                                </p>
                            </div>
                        ) : !activeSessionId ? (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <div className="mb-4 rounded-2xl bg-gray-50 p-6 dark:bg-gray-700/50">
                                    <PlusIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                    Start a New Chat
                                </h3>
                                <p className="mt-1 text-sm text-gray-400">
                                    Click &quot;New Chat&quot; or select a previous conversation
                                </p>
                            </div>
                        ) : (
                            <>
                                {currentMessages.map((msg) => (
                                    <ChatBubble
                                        key={msg.id}
                                        msg={msg}
                                        agentName={msg.role === "assistant" ? selectedAgent?.name : undefined}
                                    />
                                ))}
                                {streaming && streaming.agentId === selectedAgentId && (
                                    <StreamingBubble text={streaming.text} agentName={selectedAgent?.name} />
                                )}
                            </>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    {selectedAgentId && activeSessionId && (
                        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                            <div className="flex items-end gap-3">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                    placeholder={`Message ${selectedAgent?.name || "agent"}...`}
                                    className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-600 dark:focus:bg-gray-700 dark:focus:ring-brand-900/30"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || !!streaming}
                                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-40 disabled:hover:bg-brand-500"
                                >
                                    <PaperPlaneIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
