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
                        case "log.append":
                            addLog({
                                ts: msg.ts,
                                level: msg.data.level || "info",
                                agent_id: msg.data.agent_id,
                                message: msg.data.message,
                            });
                            break;
                        case "qa.status":
                            addLog({
                                ts: msg.ts,
                                level: msg.data.passed ? "success" : "error",
                                message: `QA: ${msg.data.message}`,
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
    }, [projectId, updateAgentStatus, handleTaskEvent, addLog]);

    return { connected, logs, clearLogs: () => setLogs([]) };
}
