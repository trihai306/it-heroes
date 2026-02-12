/**
 * PixelOffice — 2D Pixel-Art Virtual Office (Gather.town-inspired)
 *
 * Renders a top-down pixel office where AI agents sit at desks,
 * show their current status, and chat with each other.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Typography, Input, Badge, Tooltip, Empty } from "antd";
import {
    SendOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
    FullscreenOutlined,
    MessageOutlined,
    TeamOutlined,
} from "@ant-design/icons";
import useAgentStore from "@/stores/useAgentStore";
import useTaskStore from "@/stores/useTaskStore";
import useProjectStore from "@/stores/useProjectStore";
import "./PixelOffice.css";

const { Text } = Typography;

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS & CONFIG
   ═══════════════════════════════════════════════════════════════ */
const TILE = 32; // px per tile
const MAP_W = 30; // tiles wide
const MAP_H = 20; // tiles tall

/* Palette for the tilemap */
const COLORS = {
    wall: "#2d2f45",
    wallTop: "#383a52",
    floor: "#363854",
    floorAlt: "#3e4062",
    carpet: "#4a3f6b",
    carpetAlt: "#554a76",
    desk: "#5c4a3a",
    deskTop: "#7a6550",
    monitor: "#1a1b2e",
    monitorGlow: "#818cf8",
    plant: "#3a7d5c",
    plantPot: "#8b6b4a",
    chair: "#4a4a6a",
    window: "#6ea8d9",
    windowFrame: "#3a3c55",
    bookshelf: "#5c4a3a",
    whiteboard: "#d4d4d8",
    coffee: "#8B6914",
    rug: "#5a3e5a",
    lamp: "#fbbf24",
};

/* Department zone configs */
const DEPT_CONFIG = {
    lead: { color: "#fbbf24", bg: "rgba(251,191,36,0.06)", emoji: "👑", label: "Management" },
    backend: { color: "#818cf8", bg: "rgba(129,140,248,0.06)", emoji: "⚙️", label: "Backend" },
    frontend: { color: "#f472b6", bg: "rgba(244,114,182,0.06)", emoji: "🎨", label: "Frontend" },
    qa: { color: "#34d399", bg: "rgba(52,211,153,0.06)", emoji: "🧪", label: "QA" },
    docs: { color: "#60a5fa", bg: "rgba(96,165,250,0.06)", emoji: "📄", label: "Docs" },
    security: { color: "#f97316", bg: "rgba(249,115,22,0.06)", emoji: "🛡️", label: "Security" },
    custom: { color: "#a78bfa", bg: "rgba(167,139,250,0.06)", emoji: "🤖", label: "Other" },
};

/* Pixel-art character palette per role */
const CHAR_COLORS = {
    lead: { hair: "#fbbf24", shirt: "#92400e", skin: "#fcd6a8" },
    backend: { hair: "#6366f1", shirt: "#312e81", skin: "#ddb896" },
    frontend: { hair: "#ec4899", shirt: "#831843", skin: "#fcd6a8" },
    qa: { hair: "#10b981", shirt: "#064e3b", skin: "#c4a882" },
    docs: { hair: "#3b82f6", shirt: "#1e3a5f", skin: "#fcd6a8" },
    security: { hair: "#f97316", shirt: "#7c2d12", skin: "#ddb896" },
    custom: { hair: "#8b5cf6", shirt: "#4c1d95", skin: "#fcd6a8" },
};

/* Department desk zones (tile coordinates) */
const DEPT_ZONES = {
    lead: { x: 2, y: 2, w: 7, h: 5 },
    backend: { x: 11, y: 2, w: 8, h: 5 },
    frontend: { x: 21, y: 2, w: 7, h: 5 },
    qa: { x: 2, y: 10, w: 7, h: 5 },
    docs: { x: 11, y: 10, w: 8, h: 5 },
    security: { x: 21, y: 10, w: 7, h: 5 },
};

/* Furniture definitions (tile coords) */
const FURNITURE = [
    // Meeting table (center)
    { type: "table", x: 13, y: 17, w: 4, h: 2 },
    // Plants
    { type: "plant", x: 0, y: 0 },
    { type: "plant", x: 29, y: 0 },
    { type: "plant", x: 0, y: 19 },
    { type: "plant", x: 29, y: 19 },
    { type: "plant", x: 10, y: 8 },
    { type: "plant", x: 19, y: 8 },
    // Coffee machine
    { type: "coffee", x: 10, y: 17 },
    // Whiteboard
    { type: "whiteboard", x: 11, y: 8, w: 3 },
    { type: "whiteboard", x: 21, y: 8, w: 3 },
];

/* ═══════════════════════════════════════════════════════════════
   TILEMAP RENDERER (canvas)
   ═══════════════════════════════════════════════════════════════ */
function drawTilemap(ctx, w, h, scale) {
    const T = TILE * scale;

    // Background
    ctx.fillStyle = "#1a1b2e";
    ctx.fillRect(0, 0, w * T, h * T);

    // Floor tiles (checkerboard)
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const isAlt = (x + y) % 2 === 0;
            ctx.fillStyle = isAlt ? COLORS.floor : COLORS.floorAlt;
            ctx.fillRect(x * T, y * T, T, T);
        }
    }

    // Walls (top 1 row + left/right edges)
    for (let x = 0; x < w; x++) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x * T, 0, T, T * 0.6);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x * T, T * 0.6, T, T * 0.4);
    }
    // Bottom wall
    for (let x = 0; x < w; x++) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x * T, (h - 1) * T + T * 0.4, T, T * 0.6);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x * T, (h - 1) * T, T, T * 0.4);
    }
    // Left/right walls
    for (let y = 0; y < h; y++) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(0, y * T, T * 0.3, T);
        ctx.fillRect((w - 1) * T + T * 0.7, y * T, T * 0.3, T);
    }

    // Windows on top wall
    for (let x = 3; x < w - 3; x += 4) {
        ctx.fillStyle = COLORS.windowFrame;
        ctx.fillRect(x * T + 2, 2, T * 2 - 4, T * 0.5);
        ctx.fillStyle = COLORS.window;
        ctx.fillRect(x * T + 4, 4, T * 2 - 8, T * 0.5 - 4);
        // Window shine
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(x * T + 6, 6, T * 0.4, T * 0.15);
    }

    // Department zone carpets
    Object.entries(DEPT_ZONES).forEach(([, zone]) => {
        for (let y = zone.y; y < zone.y + zone.h; y++) {
            for (let x = zone.x; x < zone.x + zone.w; x++) {
                const isAlt = (x + y) % 2 === 0;
                ctx.fillStyle = isAlt ? COLORS.carpet : COLORS.carpetAlt;
                ctx.fillRect(x * T, y * T, T, T);
            }
        }
    });

    // Desks in each department zone
    Object.values(DEPT_ZONES).forEach((zone) => {
        const desksPerRow = Math.floor(zone.w / 3);
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < desksPerRow; col++) {
                const dx = zone.x + col * 3 + 1;
                const dy = zone.y + row * 3 + 1;
                // Desk body
                ctx.fillStyle = COLORS.desk;
                ctx.fillRect(dx * T + 2, dy * T + T * 0.3, T * 1.6, T * 0.7);
                ctx.fillStyle = COLORS.deskTop;
                ctx.fillRect(dx * T + 2, dy * T + T * 0.2, T * 1.6, T * 0.15);
                // Monitor
                ctx.fillStyle = COLORS.monitor;
                ctx.fillRect(dx * T + T * 0.4, dy * T + 2, T * 0.7, T * 0.35);
                ctx.fillStyle = COLORS.monitorGlow;
                ctx.fillRect(dx * T + T * 0.5, dy * T + 4, T * 0.5, T * 0.22);
                // Monitor stand
                ctx.fillStyle = "#555";
                ctx.fillRect(dx * T + T * 0.65, dy * T + T * 0.34, T * 0.2, T * 0.08);
                // Chair
                ctx.fillStyle = COLORS.chair;
                ctx.fillRect(dx * T + T * 0.35, (dy + 1) * T + T * 0.15, T * 0.8, T * 0.6);
                ctx.fillStyle = "#5a5a7a";
                ctx.fillRect(dx * T + T * 0.45, (dy + 1) * T + T * 0.05, T * 0.6, T * 0.2);
            }
        }
    });

    // Furniture items
    FURNITURE.forEach((f) => {
        if (f.type === "plant") {
            // Plant pot
            ctx.fillStyle = COLORS.plantPot;
            ctx.fillRect(f.x * T + T * 0.25, f.y * T + T * 0.6, T * 0.5, T * 0.35);
            // Leaves
            ctx.fillStyle = COLORS.plant;
            ctx.fillRect(f.x * T + T * 0.15, f.y * T + T * 0.15, T * 0.7, T * 0.5);
            ctx.fillStyle = "#4a9d6c";
            ctx.fillRect(f.x * T + T * 0.3, f.y * T + T * 0.05, T * 0.4, T * 0.3);
        } else if (f.type === "table") {
            ctx.fillStyle = "#5c5040";
            ctx.fillRect(f.x * T + 2, f.y * T + 2, (f.w || 1) * T - 4, (f.h || 1) * T - 4);
            ctx.fillStyle = "#6e6352";
            ctx.fillRect(f.x * T + 4, f.y * T + 4, (f.w || 1) * T - 8, (f.h || 1) * T - 8);
            // Coffee cups on table
            ctx.fillStyle = "#d4d4d8";
            ctx.fillRect((f.x + 1) * T + 4, f.y * T + 8, 6, 8);
            ctx.fillRect((f.x + 2) * T + 8, f.y * T + T + 4, 6, 8);
        } else if (f.type === "coffee") {
            ctx.fillStyle = "#5a4a3a";
            ctx.fillRect(f.x * T + 4, f.y * T + 4, T - 8, T - 8);
            ctx.fillStyle = COLORS.coffee;
            ctx.fillRect(f.x * T + 8, f.y * T + 8, T - 16, T * 0.4);
            // Steam
            ctx.fillStyle = "rgba(255,255,255,0.2)";
            ctx.fillRect(f.x * T + T * 0.3, f.y * T, 2, 5);
            ctx.fillRect(f.x * T + T * 0.55, f.y * T - 2, 2, 5);
        } else if (f.type === "whiteboard") {
            const bw = (f.w || 2) * T;
            ctx.fillStyle = "#3a3c55";
            ctx.fillRect(f.x * T + 2, f.y * T + 4, bw - 4, T * 0.7);
            ctx.fillStyle = COLORS.whiteboard;
            ctx.fillRect(f.x * T + 5, f.y * T + 7, bw - 10, T * 0.55);
            // Some "writing" on whiteboard
            ctx.fillStyle = "#818cf8";
            ctx.fillRect(f.x * T + 10, f.y * T + 12, bw * 0.3, 2);
            ctx.fillStyle = "#f472b6";
            ctx.fillRect(f.x * T + 10, f.y * T + 18, bw * 0.5, 2);
            ctx.fillStyle = "#34d399";
            ctx.fillRect(f.x * T + 10, f.y * T + 24, bw * 0.4, 2);
        }
    });

    // Grid lines (subtle)
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= w; x++) {
        ctx.beginPath();
        ctx.moveTo(x * T, 0);
        ctx.lineTo(x * T, h * T);
        ctx.stroke();
    }
    for (let y = 0; y <= h; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * T);
        ctx.lineTo(w * T, y * T);
        ctx.stroke();
    }
}

/* ═══════════════════════════════════════════════════════════════
   PIXEL CHARACTER RENDERER (canvas for each agent)
   ═══════════════════════════════════════════════════════════════ */
function drawPixelCharacter(canvas, role, facing = "down", frame = 0) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = 32, h = 40;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    const c = CHAR_COLORS[role] || CHAR_COLORS.custom;
    const bounce = frame % 2 === 0 ? 0 : -1;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(6, 36, 20, 4);

    // Body (shirt)
    ctx.fillStyle = c.shirt;
    ctx.fillRect(8, 18 + bounce, 16, 14);

    // Arms
    ctx.fillStyle = c.skin;
    ctx.fillRect(4, 20 + bounce, 5, 10);
    ctx.fillRect(23, 20 + bounce, 5, 10);

    // Legs
    ctx.fillStyle = "#2a2a4a";
    ctx.fillRect(10, 32 + bounce, 5, 6);
    ctx.fillRect(17, 32 + bounce, 5, 6);

    // Shoes
    ctx.fillStyle = "#1a1a3a";
    ctx.fillRect(9, 36 + bounce, 6, 3);
    ctx.fillRect(17, 36 + bounce, 6, 3);

    // Head
    ctx.fillStyle = c.skin;
    ctx.fillRect(9, 4 + bounce, 14, 15);

    // Hair
    ctx.fillStyle = c.hair;
    ctx.fillRect(8, 2 + bounce, 16, 7);
    ctx.fillRect(7, 4 + bounce, 2, 6);
    ctx.fillRect(23, 4 + bounce, 2, 6);

    // Eyes
    if (facing !== "up") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(12, 10 + bounce, 3, 3);
        ctx.fillRect(18, 10 + bounce, 3, 3);
        ctx.fillStyle = "#1a1b2e";
        const eyeOff = facing === "left" ? 0 : facing === "right" ? 2 : 1;
        ctx.fillRect(12 + eyeOff, 11 + bounce, 2, 2);
        ctx.fillRect(18 + eyeOff, 11 + bounce, 2, 2);
    }

    // Mouth
    if (facing !== "up") {
        ctx.fillStyle = "#c97a6a";
        ctx.fillRect(14, 15 + bounce, 4, 1);
    }

    // Collar
    ctx.fillStyle = c.shirt;
    ctx.fillRect(12, 17 + bounce, 8, 2);
}

/* ═══════════════════════════════════════════════════════════════
   COMPUTE AGENT POSITIONS (seat them at desks)
   ═══════════════════════════════════════════════════════════════ */
function computeAgentPositions(agents) {
    // Group by role
    const byRole = {};
    agents.forEach((a) => {
        const r = a.role || "custom";
        if (!byRole[r]) byRole[r] = [];
        byRole[r].push(a);
    });

    const positions = {};
    Object.entries(byRole).forEach(([role, roleAgents]) => {
        const zone = DEPT_ZONES[role] || DEPT_ZONES.custom;
        if (!zone) {
            // Place overflow agents in meeting area
            roleAgents.forEach((a, i) => {
                positions[a.id] = {
                    x: (13 + i) * TILE + TILE / 2,
                    y: 18 * TILE + TILE / 2,
                };
            });
            return;
        }

        const desksPerRow = Math.floor(zone.w / 3);
        roleAgents.forEach((a, i) => {
            const row = Math.floor(i / desksPerRow);
            const col = i % desksPerRow;
            const dx = zone.x + col * 3 + 1;
            const dy = zone.y + row * 3 + 2; // Sit at chair position
            positions[a.id] = {
                x: dx * TILE + TILE * 0.5,
                y: dy * TILE + TILE * 0.2,
            };
        });
    });

    return positions;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function PixelOffice() {
    const agents = useAgentStore((s) => s.agents);
    const agentStatuses = useAgentStore((s) => s.agentStatuses);
    const teamOutput = useAgentStore((s) => s.teamOutput);
    const broadcastMessage = useAgentStore((s) => s.broadcastMessage);
    const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
    const tasks = useTaskStore((s) => s.tasks);

    const canvasRef = useRef(null);
    const chatEndRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [chatInput, setChatInput] = useState("");
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [speechBubbles, setSpeechBubbles] = useState({});
    const [frame, setFrame] = useState(0);

    // Animation frame ticker
    useEffect(() => {
        const interval = setInterval(() => setFrame((f) => f + 1), 600);
        return () => clearInterval(interval);
    }, []);

    // Compute positions
    const agentPositions = useMemo(() => computeAgentPositions(agents), [agents]);

    // Draw the tilemap
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        canvas.width = MAP_W * TILE * scale;
        canvas.height = MAP_H * TILE * scale;
        drawTilemap(ctx, MAP_W, MAP_H, scale);
    }, [scale]);

    // Draw zone labels on overlay
    const zoneLabels = useMemo(() => {
        const labels = [];
        Object.entries(DEPT_ZONES).forEach(([role]) => {
            const zone = DEPT_ZONES[role];
            const cfg = DEPT_CONFIG[role] || DEPT_CONFIG.custom;
            const agentsInZone = agents.filter((a) => a.role === role);
            labels.push({ role, zone, cfg, count: agentsInZone.length });
        });
        return labels;
    }, [agents]);

    // Chat auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [teamOutput]);

    // Show speech bubbles from team output
    useEffect(() => {
        if (!teamOutput || teamOutput.length === 0) return;
        const last = teamOutput[teamOutput.length - 1];
        if (!last || !last.agent) return;
        const agent = agents.find((a) => a.name === last.agent);
        if (!agent) return;
        setSpeechBubbles((prev) => ({ ...prev, [agent.id]: last.content?.slice(0, 40) }));
        const timer = setTimeout(() => {
            setSpeechBubbles((prev) => {
                const next = { ...prev };
                delete next[agent.id];
                return next;
            });
        }, 4000);
        return () => clearTimeout(timer);
    }, [teamOutput, agents]);

    // Send chat
    const handleSend = useCallback(() => {
        if (!chatInput.trim() || !selectedProjectId) return;
        broadcastMessage(selectedProjectId, chatInput.trim());
        setChatInput("");
    }, [chatInput, selectedProjectId, broadcastMessage]);

    const getAgentStatus = (agentId) => agentStatuses[agentId]?.status || "idle";

    const getAgentTask = (agentId) => {
        return tasks.find((t) => t.assigned_agent_id === agentId && t.status !== "done");
    };

    if (agents.length === 0) {
        return (
            <div className="pixel-office" style={{ alignItems: "center", justifyContent: "center" }}>
                <div className="pixel-empty">
                    <span className="pixel-empty-icon">🏢</span>
                    <span className="pixel-empty-text">No agents in the office</span>
                    <span className="pixel-empty-sub">Create a team from the Team page first</span>
                </div>
            </div>
        );
    }

    return (
        <div className="pixel-office">
            {/* ── Map Area ── */}
            <div className="pixel-office-map">
                {/* Toolbar */}
                <div className="pixel-toolbar">
                    <button className="pixel-toolbar-btn" onClick={() => setScale((s) => Math.min(s + 0.25, 2))}
                        title="Zoom In">
                        <ZoomInOutlined />
                    </button>
                    <button className="pixel-toolbar-btn" onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
                        title="Zoom Out">
                        <ZoomOutOutlined />
                    </button>
                    <button className="pixel-toolbar-btn" onClick={() => setScale(1)} title="Reset Zoom">
                        <FullscreenOutlined />
                    </button>
                    <div style={{
                        padding: "6px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                        background: "rgba(26,27,46,0.85)", color: "rgba(255,255,255,0.5)",
                        border: "1px solid rgba(255,255,255,0.12)", fontFamily: '"JetBrains Mono", monospace',
                        backdropFilter: "blur(8px)",
                    }}>
                        👥 {agents.length} agents online
                    </div>
                </div>

                {/* Canvas tilemap */}
                <div style={{
                    position: "absolute", inset: 0,
                    overflow: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 40,
                }}>
                    <div style={{
                        position: "relative",
                        width: MAP_W * TILE * scale,
                        height: MAP_H * TILE * scale,
                        flexShrink: 0,
                    }}>
                        <canvas
                            ref={canvasRef}
                            className="pixel-tilemap"
                            style={{ width: MAP_W * TILE * scale, height: MAP_H * TILE * scale }}
                        />

                        {/* Floor grid overlay */}
                        <div className="pixel-floor-pattern"
                            style={{ backgroundSize: `${TILE * scale}px ${TILE * scale}px` }} />

                        {/* Zone labels */}
                        {zoneLabels.map(({ role, zone, cfg, count }) => (
                            <div key={role} className="pixel-zone" style={{
                                left: zone.x * TILE * scale,
                                top: zone.y * TILE * scale,
                                width: zone.w * TILE * scale,
                                height: zone.h * TILE * scale,
                                borderColor: cfg.color + "30",
                                background: cfg.bg,
                            }}>
                                <div className="pixel-zone-label" style={{
                                    background: cfg.color + "18",
                                    color: cfg.color,
                                    border: `1px solid ${cfg.color}30`,
                                }}>
                                    {cfg.emoji} {cfg.label}
                                    {count > 0 && (
                                        <Badge count={count} size="small"
                                            style={{ backgroundColor: cfg.color, marginLeft: 6, fontSize: 8, height: 14, lineHeight: "14px", minWidth: 14 }} />
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Agent sprites */}
                        {agents.map((agent) => {
                            const pos = agentPositions[agent.id];
                            if (!pos) return null;
                            const status = getAgentStatus(agent.id);
                            const currentTask = getAgentTask(agent.id);
                            const bubble = speechBubbles[agent.id];

                            return (
                                <div
                                    key={agent.id}
                                    className={`pixel-agent ${status}`}
                                    style={{
                                        left: pos.x * scale - 16 * scale,
                                        top: pos.y * scale - 20 * scale,
                                        transform: `scale(${scale})`,
                                        transformOrigin: "top left",
                                    }}
                                    onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                                >
                                    {/* Speech bubble */}
                                    {bubble && (
                                        <div className="pixel-bubble">{bubble}…</div>
                                    )}

                                    {/* Pixel character */}
                                    <div className="pixel-agent-body">
                                        <PixelCharCanvas role={agent.role} frame={frame} />
                                        <div className={`pixel-agent-status ${status}`} />
                                    </div>

                                    {/* Name tag */}
                                    <div className="pixel-agent-name">
                                        {agent.name}
                                    </div>

                                    {/* Agent info tooltip */}
                                    {selectedAgent === agent.id && (
                                        <div className="pixel-agent-tooltip" style={{
                                            left: 40, top: -10,
                                        }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                                                {(DEPT_CONFIG[agent.role] || DEPT_CONFIG.custom).emoji} {agent.name}
                                            </div>
                                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
                                                Role: <span style={{ color: (DEPT_CONFIG[agent.role] || DEPT_CONFIG.custom).color }}>{agent.role}</span>
                                            </div>
                                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
                                                Status: <span style={{ color: status === "in_progress" ? "#818cf8" : status === "idle" ? "#64748b" : "#fbbf24" }}>{status.replace("_", " ")}</span>
                                            </div>
                                            {currentTask && (
                                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 4 }}>
                                                    📋 {currentTask.title}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Chat Panel ── */}
            <div className="pixel-office-chat">
                <div className="pixel-chat-header">
                    <h3><MessageOutlined /> Office Chat</h3>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                        <TeamOutlined /> {agents.length}
                    </Text>
                </div>

                <div className="pixel-chat-messages">
                    {(!teamOutput || teamOutput.length === 0) ? (
                        <div className="pixel-chat-empty">
                            <span>💬</span>
                            <span>Agent conversations will appear here</span>
                        </div>
                    ) : (
                        teamOutput.slice(-50).map((entry, i) => {
                            const agent = agents.find((a) => a.name === entry.agent);
                            const roleCfg = DEPT_CONFIG[agent?.role] || DEPT_CONFIG.custom;
                            return (
                                <div key={i} className="pixel-chat-msg">
                                    <div className="pixel-chat-avatar" style={{
                                        background: roleCfg.color + "18",
                                        border: `1px solid ${roleCfg.color}30`,
                                    }}>
                                        {roleCfg.emoji}
                                    </div>
                                    <div className="pixel-chat-content">
                                        <div className="pixel-chat-sender" style={{ color: roleCfg.color }}>
                                            {entry.agent || "System"}
                                            <span className="time">{entry.ts ? new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                                        </div>
                                        <div className="pixel-chat-text">{entry.content || entry.text || JSON.stringify(entry)}</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="pixel-chat-input-area">
                    <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Broadcast to team..."
                    />
                    <button onClick={handleSend} title="Send">
                        <SendOutlined />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   PIXEL CHARACTER CANVAS (individual agent sprite)
   ═══════════════════════════════════════════════════════════════ */
function PixelCharCanvas({ role, frame }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        drawPixelCharacter(canvasRef.current, role, "down", frame);
    }, [role, frame]);

    return (
        <canvas
            ref={canvasRef}
            width={32}
            height={40}
            style={{ width: 32, height: 40, imageRendering: "pixelated" }}
        />
    );
}
