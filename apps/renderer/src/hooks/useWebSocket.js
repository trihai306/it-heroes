/**
 * WebSocket hook — connects to the backend and dispatches events to stores.
 * Uses a startup delay to avoid React StrictMode double-mount noise.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import useAgentStore from "@/stores/useAgentStore";
import useTaskStore from "@/stores/useTaskStore";

const WS_BASE = "ws://127.0.0.1:8420";
const STARTUP_DELAY = 100; // ms — skip StrictMode's unmount window
const RECONNECT_DELAY = 3000;

export default function useWebSocket(projectId) {
    const wsRef = useRef(null);
    const timersRef = useRef({ startup: null, reconnect: null });
    const cancelledRef = useRef(false);
    const [connected, setConnected] = useState(false);
    const [logs, setLogs] = useState([]);

    const updateAgentStatus = useAgentStore((s) => s.updateAgentStatus);
    const fetchAgents = useAgentStore((s) => s.fetchAgents);
    const appendTeamOutput = useAgentStore((s) => s.appendTeamOutput);
    const handleTaskEvent = useTaskStore((s) => s.handleTaskEvent);

    const addLog = useCallback((log) => {
        setLogs((prev) => [...prev.slice(-500), log]);
    }, []);

    useEffect(() => {
        if (!projectId) return;

        cancelledRef.current = false;

        const openSocket = () => {
            if (cancelledRef.current) return;

            const url = `${WS_BASE}/ws/projects/${projectId}`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                if (cancelledRef.current) { ws.close(); return; }
                console.log("[WS] Connected ✓");
                setConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    switch (msg.type) {
                        case "agent.status":
                            updateAgentStatus(msg.data.agent_id, msg.data.status);
                            break;
                        case "task.updated":
                            handleTaskEvent(msg.data);
                            break;
                        case "log.append": {
                            const logEntry = {
                                ts: msg.ts,
                                level: msg.data.level || "info",
                                agent_id: msg.data.agent_id,
                                message: msg.data.message,
                            };
                            addLog(logEntry);
                            appendTeamOutput(logEntry);
                            break;
                        }
                        case "qa.status":
                            addLog({
                                ts: msg.ts,
                                level: msg.data.passed ? "success" : "error",
                                message: `QA: ${msg.data.message}`,
                            });
                            break;
                        case "tool.execution":
                            addLog({
                                ts: msg.ts,
                                level: msg.data.is_error ? "error" : "tool",
                                agent_id: msg.data.agent_id,
                                message: msg.data.content,
                                tool: msg.data.raw?.tool,
                                event_type: msg.data.event_type,
                            });
                            break;
                        case "session.result":
                            addLog({
                                ts: msg.ts,
                                level: msg.data.is_error ? "error" : "success",
                                agent_id: msg.data.agent_id,
                                message: `Session done: ${msg.data.num_turns} turns, ${msg.data.duration_ms}ms` +
                                    (msg.data.total_cost_usd ? `, $${msg.data.total_cost_usd.toFixed(4)}` : ""),
                            });
                            break;
                        case "team.created":
                            addLog({
                                ts: msg.ts,
                                level: "success",
                                message: `Team created: ${msg.data.team_name} (${msg.data.agents?.length || 0} agents)`,
                            });
                            // Refresh agent list to get all new agents
                            if (projectId) fetchAgents(projectId);
                            break;
                        case "team.agent_spawned":
                            addLog({
                                ts: msg.ts,
                                level: "info",
                                agent_id: msg.data.id,
                                message: `Agent spawned: ${msg.data.name} (${msg.data.role})`,
                            });
                            if (projectId) fetchAgents(projectId);
                            break;
                        case "team.agent_completed":
                            updateAgentStatus(msg.data.agent_id, "idle");
                            addLog({
                                ts: msg.ts,
                                level: "success",
                                agent_id: msg.data.agent_id,
                                message: `Agent completed: ${msg.data.name || `agent-${msg.data.agent_id}`}`,
                            });
                            break;
                        case "team.task_delegated":
                            updateAgentStatus(msg.data.to_agent_id, "working");
                            addLog({
                                ts: msg.ts,
                                level: "info",
                                agent_id: msg.data.to_agent_id,
                                message: `Task delegated to ${msg.data.to_agent_name}: ${msg.data.description}`,
                            });
                            break;
                        case "team.message":
                            addLog({
                                ts: msg.ts,
                                level: "info",
                                agent_id: msg.data.agent_id,
                                message: msg.data.message,
                            });
                            break;
                        case "team.inbox_message": {
                            const inboxEntry = {
                                ts: msg.ts,
                                level: "info",
                                agent_id: msg.data.agent_id,
                                message: `[inbox] ${msg.data.from}: ${msg.data.text}`,
                            };
                            addLog(inboxEntry);
                            appendTeamOutput(inboxEntry);
                            break;
                        }
                        case "team.config_changed":
                            addLog({
                                ts: msg.ts,
                                level: "info",
                                message: "Team config updated",
                            });
                            if (projectId) fetchAgents(projectId);
                            break;
                        case "claude.task_created":
                            addLog({
                                ts: msg.ts,
                                level: "info",
                                message: `Claude task created: ${msg.data.subject || msg.data.task_id || ""}`,
                            });
                            break;
                        case "claude.task_updated":
                            addLog({
                                ts: msg.ts,
                                level: "info",
                                message: `Claude task updated: ${msg.data.subject || msg.data.task_id || ""} → ${msg.data.status || ""}`,
                            });
                            break;
                        case "connected":
                            addLog({
                                ts: new Date().toISOString(),
                                level: "info",
                                message: `Connected to project #${msg.data.project_id}`,
                            });
                            break;
                        default:
                            console.log("[WS] Unknown event:", msg.type);
                    }
                } catch (err) {
                    console.error("[WS] Parse error:", err);
                }
            };

            ws.onclose = () => {
                if (cancelledRef.current) return;
                console.log("[WS] Disconnected — reconnecting...");
                setConnected(false);
                timersRef.current.reconnect = setTimeout(openSocket, RECONNECT_DELAY);
            };

            ws.onerror = () => {
                // Suppress — onclose will handle reconnect
            };
        };

        // Delay connection to skip StrictMode's instant unmount cycle
        timersRef.current.startup = setTimeout(openSocket, STARTUP_DELAY);

        return () => {
            cancelledRef.current = true;
            clearTimeout(timersRef.current.startup);
            clearTimeout(timersRef.current.reconnect);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setConnected(false);
        };
    }, [projectId, updateAgentStatus, fetchAgents, appendTeamOutput, handleTaskEvent, addLog]);

    return { connected, logs, clearLogs: () => setLogs([]) };
}
