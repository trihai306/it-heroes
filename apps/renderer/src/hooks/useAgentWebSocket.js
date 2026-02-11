/**
 * useAgentWebSocket — Hybrid position sync.
 *
 * Maintains a WebSocket connection to the backend. Instead of RECEIVING
 * positions from the server, the client SENDS its local walk positions
 * every 2 seconds so the server can store them for F5 resume.
 */
import { useEffect, useRef } from "react";
import useAgentStore from "@/stores/useAgentStore";

const WS_BASE = "ws://127.0.0.1:8420";
const SYNC_INTERVAL_MS = 2000;

export default function useAgentWebSocket(projectId) {
    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);
    const syncTimer = useRef(null);

    useEffect(() => {
        if (!projectId) return;

        let alive = true;

        function connect() {
            if (!alive) return;

            const ws = new WebSocket(`${WS_BASE}/ws/projects/${projectId}`);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("[WS] Connected — client-side walk mode");
                // Start periodic position sync
                startSync(ws);
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    // Handle any server→client messages if needed in the future
                    if (msg.type === "connected") {
                        console.log("[WS] Server acknowledged connection");
                    }
                } catch {
                    // ignore
                }
            };

            ws.onclose = () => {
                stopSync();
                if (!alive) return;
                console.log("[WS] Disconnected — reconnecting in 2s");
                reconnectTimer.current = setTimeout(connect, 2000);
            };

            ws.onerror = () => {
                ws.close();
            };
        }

        function startSync(ws) {
            stopSync();
            syncTimer.current = setInterval(() => {
                if (ws.readyState !== WebSocket.OPEN) return;

                // Collect current positions from the store
                const positions = useAgentStore.getState().agentPositions;
                if (!positions || Object.keys(positions).length === 0) return;

                ws.send(JSON.stringify({
                    type: "positions.sync",
                    data: positions,
                }));
            }, SYNC_INTERVAL_MS);
        }

        function stopSync() {
            if (syncTimer.current) {
                clearInterval(syncTimer.current);
                syncTimer.current = null;
            }
        }

        connect();

        return () => {
            alive = false;
            stopSync();
            clearTimeout(reconnectTimer.current);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [projectId]);
}
