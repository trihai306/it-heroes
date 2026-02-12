/**
 * PixelOffice — 2D Pixel-Art Virtual Office (Gather.town-inspired)
 *
 * Uses sprite-sheet characters and pixel-art office tiles for a
 * rich retro environment where AI agents walk, sit, and chat.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Typography, Badge } from "antd";
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
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */
const TILE = 32;
const MAP_W = 30;
const MAP_H = 20;
const SPRITE_W = 32;
const SPRITE_H = 32;

/* ── PIPOYA sprite sheet: per-role, 3 cols × 4 rows (32×32 cells) ── */
/* Rows: 0=down, 1=left, 2=right, 3=up                               */
/* Cols: 3 walk-cycle frames (0,1,2) — frame 1 is idle/standing       */
const ROLE_SHEETS = {
    lead: "/sprites/chars/lead.png",
    backend: "/sprites/chars/backend.png",
    frontend: "/sprites/chars/frontend.png",
    qa: "/sprites/chars/qa.png",
    docs: "/sprites/chars/docs.png",
    security: "/sprites/chars/security.png",
    custom: "/sprites/chars/custom.png",
};
const SHEET_COLS = 3;
const SHEET_ROWS = 4;
const CELL_W = 32;
const CELL_H = 32;

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

/* Department desk zones (tile coordinates) */
const DEPT_ZONES = {
    lead: { x: 2, y: 2, w: 7, h: 5 },
    backend: { x: 11, y: 2, w: 8, h: 5 },
    frontend: { x: 21, y: 2, w: 7, h: 5 },
    qa: { x: 2, y: 10, w: 7, h: 5 },
    docs: { x: 11, y: 10, w: 8, h: 5 },
    security: { x: 21, y: 10, w: 7, h: 5 },
};

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
    whiteboard: "#d4d4d8",
    coffee: "#8B6914",
    lamp: "#fbbf24",
    rugBorder: "#6a4a6a",
};

/* Static furniture (tile coordinates) */
const FURNITURE = [
    { type: "table", x: 13, y: 17, w: 4, h: 2 },
    { type: "plant", x: 0, y: 0 },
    { type: "plant", x: 29, y: 0 },
    { type: "plant", x: 0, y: 19 },
    { type: "plant", x: 29, y: 19 },
    { type: "plant", x: 10, y: 8 },
    { type: "plant", x: 19, y: 8 },
    { type: "coffee", x: 10, y: 17 },
    { type: "coffee", x: 11, y: 17 },
    { type: "whiteboard", x: 11, y: 8, w: 3 },
    { type: "whiteboard", x: 21, y: 8, w: 3 },
    { type: "bookshelf", x: 25, y: 8 },
    { type: "bookshelf", x: 26, y: 8 },
    { type: "plant", x: 5, y: 8 },
    { type: "lamp", x: 28, y: 17 },
    { type: "printer", x: 1, y: 17 },
];

/* Where agents can walk (meeting spots, coffee, etc.) */
const WANDER_SPOTS = [
    { x: 13, y: 18 }, { x: 14, y: 18 }, { x: 15, y: 18 }, { x: 16, y: 18 }, // meeting table
    { x: 10, y: 16 }, { x: 11, y: 16 }, // coffee area
    { x: 15, y: 9 }, { x: 14, y: 9 },   // hallway
    { x: 5, y: 9 }, { x: 24, y: 9 },   // cross corridor
];

/* ═══════════════════════════════════════════════════════════════
   TILEMAP RENDERER (canvas)
   ═══════════════════════════════════════════════════════════════ */
function drawTilemap(ctx, w, h, tileImg) {
    const T = TILE;

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

    // Walls
    for (let x = 0; x < w; x++) {
        // Top wall
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x * T, 0, T, T * 0.7);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x * T, T * 0.7, T, T * 0.3);
        // Bottom wall
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x * T, (h - 1) * T, T, T * 0.3);
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x * T, (h - 1) * T + T * 0.3, T, T * 0.7);
    }
    for (let y = 0; y < h; y++) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(0, y * T, T * 0.3, T);
        ctx.fillRect((w - 1) * T + T * 0.7, y * T, T * 0.3, T);
    }

    // Windows (top wall)
    for (let x = 3; x < w - 3; x += 4) {
        ctx.fillStyle = COLORS.windowFrame;
        ctx.fillRect(x * T + 2, 2, T * 2 - 4, T * 0.55);
        ctx.fillStyle = COLORS.window;
        ctx.fillRect(x * T + 4, 4, T * 2 - 8, T * 0.45);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(x * T + 6, 6, T * 0.4, T * 0.15);
        ctx.fillStyle = "rgba(135,206,250,0.15)";
        ctx.fillRect(x * T + T, 4, T - 6, T * 0.45);
    }

    // Department zone carpets
    Object.values(DEPT_ZONES).forEach((zone) => {
        // Rug border
        ctx.fillStyle = COLORS.rugBorder;
        ctx.fillRect(zone.x * T - 2, zone.y * T - 2, zone.w * T + 4, zone.h * T + 4);
        for (let y = zone.y; y < zone.y + zone.h; y++) {
            for (let x = zone.x; x < zone.x + zone.w; x++) {
                const isAlt = (x + y) % 2 === 0;
                ctx.fillStyle = isAlt ? COLORS.carpet : COLORS.carpetAlt;
                ctx.fillRect(x * T, y * T, T, T);
            }
        }
    });

    // Desks in each zone
    Object.values(DEPT_ZONES).forEach((zone) => {
        const desksPerRow = Math.floor(zone.w / 3);
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < desksPerRow; col++) {
                const dx = zone.x + col * 3 + 1;
                const dy = zone.y + row * 3 + 1;
                drawDesk(ctx, dx * T, dy * T);
            }
        }
    });

    // Static furniture
    FURNITURE.forEach((f) => {
        if (f.type === "plant") drawPlant(ctx, f.x * T, f.y * T);
        else if (f.type === "table") drawMeetingTable(ctx, f.x * T, f.y * T, f.w, f.h);
        else if (f.type === "coffee") drawCoffeeMachine(ctx, f.x * T, f.y * T);
        else if (f.type === "whiteboard") drawWhiteboard(ctx, f.x * T, f.y * T, f.w || 2);
        else if (f.type === "bookshelf") drawBookshelf(ctx, f.x * T, f.y * T);
        else if (f.type === "lamp") drawLamp(ctx, f.x * T, f.y * T);
        else if (f.type === "printer") drawPrinter(ctx, f.x * T, f.y * T);
    });

    // Subtle grid
    ctx.strokeStyle = "rgba(255,255,255,0.025)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= w; x++) {
        ctx.beginPath(); ctx.moveTo(x * T, 0); ctx.lineTo(x * T, h * T); ctx.stroke();
    }
    for (let y = 0; y <= h; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * T); ctx.lineTo(w * T, y * T); ctx.stroke();
    }

    // Use tile sheet as background pattern for floor if loaded
    if (tileImg && tileImg.complete) {
        // Draw select tile items from the sheet over the canvas
        // E.g. use the desk/computer/plant tiles from the tileset
        // This adds visual richness on top of our procedural tiles
    }
}

/* ── Pixel furniture drawing helpers ─────────────────────────── */
function drawDesk(ctx, x, y) {
    const T = TILE;
    // Desk surface
    ctx.fillStyle = COLORS.desk;
    ctx.fillRect(x + 2, y + T * 0.3, T * 1.6, T * 0.7);
    ctx.fillStyle = COLORS.deskTop;
    ctx.fillRect(x + 2, y + T * 0.2, T * 1.6, T * 0.15);
    // Desk legs
    ctx.fillStyle = "#4a3a2a";
    ctx.fillRect(x + 4, y + T * 0.9, 3, T * 0.15);
    ctx.fillRect(x + T * 1.3, y + T * 0.9, 3, T * 0.15);
    // Monitor
    ctx.fillStyle = COLORS.monitor;
    ctx.fillRect(x + T * 0.35, y + 2, T * 0.8, T * 0.35);
    // Screen glow
    ctx.fillStyle = COLORS.monitorGlow;
    ctx.fillRect(x + T * 0.42, y + 4, T * 0.65, T * 0.25);
    // Code lines on screen
    ctx.fillStyle = "#34d399";
    ctx.fillRect(x + T * 0.48, y + 7, T * 0.25, 1);
    ctx.fillStyle = "#f472b6";
    ctx.fillRect(x + T * 0.48, y + 10, T * 0.4, 1);
    ctx.fillStyle = "#60a5fa";
    ctx.fillRect(x + T * 0.55, y + 13, T * 0.2, 1);
    // Monitor stand
    ctx.fillStyle = "#555";
    ctx.fillRect(x + T * 0.6, y + T * 0.34, T * 0.3, T * 0.06);
    ctx.fillRect(x + T * 0.68, y + T * 0.34, T * 0.12, T * 0.1);
    // Keyboard
    ctx.fillStyle = "#444";
    ctx.fillRect(x + T * 0.4, y + T * 0.5, T * 0.6, T * 0.12);
    ctx.fillStyle = "#555";
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(x + T * 0.44 + i * T * 0.13, y + T * 0.52, T * 0.08, T * 0.03);
    }
    // Chair
    ctx.fillStyle = COLORS.chair;
    ctx.fillRect(x + T * 0.25, y + T + T * 0.15, T * 1.0, T * 0.55);
    ctx.fillStyle = "#5a5a7a";
    ctx.fillRect(x + T * 0.35, y + T + T * 0.05, T * 0.8, T * 0.18);
    // Chair wheels
    ctx.fillStyle = "#333";
    ctx.fillRect(x + T * 0.3, y + T + T * 0.68, T * 0.12, T * 0.06);
    ctx.fillRect(x + T * 1.08, y + T + T * 0.68, T * 0.12, T * 0.06);
}

function drawPlant(ctx, x, y) {
    const T = TILE;
    // Pot
    ctx.fillStyle = COLORS.plantPot;
    ctx.fillRect(x + T * 0.25, y + T * 0.55, T * 0.5, T * 0.4);
    ctx.fillStyle = "#9a7b5a";
    ctx.fillRect(x + T * 0.2, y + T * 0.52, T * 0.6, T * 0.08);
    // Soil
    ctx.fillStyle = "#4a3520";
    ctx.fillRect(x + T * 0.28, y + T * 0.55, T * 0.44, T * 0.06);
    // Leaves (lush)
    ctx.fillStyle = COLORS.plant;
    ctx.fillRect(x + T * 0.1, y + T * 0.15, T * 0.8, T * 0.42);
    ctx.fillStyle = "#4a9d6c";
    ctx.fillRect(x + T * 0.2, y + T * 0.05, T * 0.6, T * 0.25);
    ctx.fillStyle = "#5ab87c";
    ctx.fillRect(x + T * 0.3, y + T * 0.0, T * 0.4, T * 0.15);
    // Leaf detail
    ctx.fillStyle = "#2d6b48";
    ctx.fillRect(x + T * 0.15, y + T * 0.35, T * 0.15, T * 0.08);
    ctx.fillRect(x + T * 0.65, y + T * 0.25, T * 0.15, T * 0.08);
}

function drawMeetingTable(ctx, x, y, w, h) {
    const T = TILE;
    // Table body
    ctx.fillStyle = "#5c5040";
    ctx.fillRect(x + 3, y + 3, w * T - 6, h * T - 6);
    ctx.fillStyle = "#6e6352";
    ctx.fillRect(x + 5, y + 5, w * T - 10, h * T - 10);
    // Table highlight
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(x + 8, y + 8, w * T - 16, 3);
    // Items on table
    ctx.fillStyle = "#d4d4d8";
    ctx.fillRect(x + T * 0.8, y + T * 0.5, 7, 9);
    ctx.fillStyle = "#818cf8";
    ctx.fillRect(x + T * 2.2, y + T * 0.6, 8, 6);
    ctx.fillStyle = "#f472b6";
    ctx.fillRect(x + T * 1.5, y + T * 1.2, 6, 6);
    // Chairs around table
    const chairColor = "#5a4a6a";
    for (let i = 0; i < w; i++) {
        // Top chairs
        ctx.fillStyle = chairColor;
        ctx.fillRect(x + i * T + T * 0.25, y - T * 0.3, T * 0.5, T * 0.35);
        ctx.fillStyle = "#6a5a7a";
        ctx.fillRect(x + i * T + T * 0.3, y - T * 0.35, T * 0.4, T * 0.1);
        // Bottom chairs
        ctx.fillStyle = chairColor;
        ctx.fillRect(x + i * T + T * 0.25, y + h * T - T * 0.05, T * 0.5, T * 0.35);
    }
}

function drawCoffeeMachine(ctx, x, y) {
    const T = TILE;
    ctx.fillStyle = "#4a3a2a";
    ctx.fillRect(x + 4, y + 6, T - 8, T - 10);
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(x + 6, y + 8, T - 12, T * 0.35);
    // Cup
    ctx.fillStyle = "#d4d4d8";
    ctx.fillRect(x + T * 0.35, y + T * 0.6, T * 0.25, T * 0.25);
    ctx.fillStyle = COLORS.coffee;
    ctx.fillRect(x + T * 0.38, y + T * 0.63, T * 0.19, T * 0.12);
    // Steam
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x + T * 0.4, y + T * 0.45, 2, 6);
    ctx.fillRect(x + T * 0.52, y + T * 0.4, 2, 6);
    // Light
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(x + T * 0.7, y + T * 0.2, 3, 3);
}

function drawWhiteboard(ctx, x, y, w) {
    const T = TILE;
    const bw = w * T;
    ctx.fillStyle = "#3a3c55";
    ctx.fillRect(x + 2, y + 4, bw - 4, T * 0.75);
    ctx.fillStyle = COLORS.whiteboard;
    ctx.fillRect(x + 5, y + 7, bw - 10, T * 0.6);
    // Sticky notes
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(x + 10, y + 10, 8, 8);
    ctx.fillStyle = "#f472b6";
    ctx.fillRect(x + 22, y + 12, 8, 8);
    ctx.fillStyle = "#34d399";
    ctx.fillRect(x + 36, y + 9, 8, 8);
    // Lines
    ctx.fillStyle = "#818cf8";
    ctx.fillRect(x + 50, y + 11, bw * 0.2, 1.5);
    ctx.fillStyle = "#f97316";
    ctx.fillRect(x + 50, y + 16, bw * 0.25, 1.5);
    ctx.fillStyle = "#60a5fa";
    ctx.fillRect(x + 50, y + 21, bw * 0.15, 1.5);
}

function drawBookshelf(ctx, x, y) {
    const T = TILE;
    ctx.fillStyle = "#5c4a3a";
    ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
    ctx.fillStyle = "#4a3a2a";
    ctx.fillRect(x + 4, y + 4, T - 8, T * 0.25);
    ctx.fillRect(x + 4, y + T * 0.45, T - 8, T * 0.25);
    // Books
    const bookColors = ["#ef4444", "#3b82f6", "#22c55e", "#fbbf24", "#8b5cf6", "#f97316"];
    bookColors.forEach((c, i) => {
        const bx = x + 5 + i * 4;
        ctx.fillStyle = c;
        ctx.fillRect(bx, y + 5, 3, T * 0.2);
        ctx.fillRect(bx, y + T * 0.47, 3, T * 0.2);
    });
}

function drawLamp(ctx, x, y) {
    const T = TILE;
    // Glow
    ctx.fillStyle = "rgba(251,191,36,0.08)";
    ctx.beginPath();
    ctx.arc(x + T / 2, y + T * 0.3, T * 0.6, 0, Math.PI * 2);
    ctx.fill();
    // Stand
    ctx.fillStyle = "#555";
    ctx.fillRect(x + T * 0.45, y + T * 0.35, T * 0.1, T * 0.55);
    // Base
    ctx.fillStyle = "#444";
    ctx.fillRect(x + T * 0.3, y + T * 0.85, T * 0.4, T * 0.1);
    // Shade
    ctx.fillStyle = COLORS.lamp;
    ctx.fillRect(x + T * 0.25, y + T * 0.15, T * 0.5, T * 0.25);
    ctx.fillStyle = "#fcd34d";
    ctx.fillRect(x + T * 0.3, y + T * 0.2, T * 0.4, T * 0.15);
}

function drawPrinter(ctx, x, y) {
    const T = TILE;
    ctx.fillStyle = "#555";
    ctx.fillRect(x + 4, y + T * 0.3, T - 8, T * 0.5);
    ctx.fillStyle = "#666";
    ctx.fillRect(x + 6, y + T * 0.35, T - 12, T * 0.15);
    // Paper
    ctx.fillStyle = "#e4e4e4";
    ctx.fillRect(x + T * 0.3, y + T * 0.15, T * 0.4, T * 0.2);
    // Light
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(x + T * 0.7, y + T * 0.55, 3, 3);
}

/* ═══════════════════════════════════════════════════════════════
   AGENT POSITION & MOVEMENT SYSTEM
   ═══════════════════════════════════════════════════════════════ */
function getDeskPosition(agents, agentId) {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return null;
    const role = agent.role || "custom";
    const zone = DEPT_ZONES[role];
    if (!zone) return { x: 15 * TILE, y: 18 * TILE };

    const roleAgents = agents.filter((a) => a.role === role);
    const idx = roleAgents.findIndex((a) => a.id === agentId);
    const desksPerRow = Math.floor(zone.w / 3);
    const row = Math.floor(idx / desksPerRow);
    const col = idx % desksPerRow;
    return {
        x: (zone.x + col * 3 + 1) * TILE + TILE * 0.5,
        y: (zone.y + row * 3 + 2) * TILE + TILE * 0.2,
    };
}

function useAgentMovement(agents, agentStatuses) {
    const [positions, setPositions] = useState({});
    const [states, setStates] = useState({}); // { agentId: { action, targetX, targetY, facing } }

    // Initialize positions at desks
    useEffect(() => {
        const initPos = {};
        const initState = {};
        agents.forEach((a) => {
            const desk = getDeskPosition(agents, a.id);
            if (desk) {
                initPos[a.id] = { x: desk.x, y: desk.y };
                initState[a.id] = { action: "sitting", facing: "down", frame: 0 };
            }
        });
        setPositions(initPos);
        setStates(initState);
    }, [agents]);

    // Movement ticker — agents randomly walk to spots and return
    useEffect(() => {
        if (agents.length === 0) return;

        const interval = setInterval(() => {
            setStates((prev) => {
                const next = { ...prev };
                agents.forEach((a) => {
                    const st = next[a.id];
                    if (!st) return;
                    const status = agentStatuses[a.id]?.status || "idle";

                    if (st.action === "sitting") {
                        // Random chance to get up and walk (only if idle)
                        if (status === "idle" && Math.random() < 0.03) {
                            const spot = WANDER_SPOTS[Math.floor(Math.random() * WANDER_SPOTS.length)];
                            next[a.id] = {
                                action: "walking",
                                targetX: spot.x * TILE + TILE / 2,
                                targetY: spot.y * TILE + TILE / 2,
                                facing: "down",
                                frame: 0,
                                returnTimer: 80 + Math.floor(Math.random() * 60),
                            };
                        } else {
                            next[a.id] = { ...st, frame: st.frame + 1 };
                        }
                    } else if (st.action === "walking") {
                        // Move towards target
                        setPositions((pp) => {
                            const pos = pp[a.id];
                            if (!pos) return pp;
                            const dx = st.targetX - pos.x;
                            const dy = st.targetY - pos.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);

                            if (dist < 4) {
                                // Arrived — stand around then return
                                next[a.id] = {
                                    action: "standing",
                                    facing: "down",
                                    frame: st.frame + 1,
                                    returnTimer: st.returnTimer,
                                };
                                return pp;
                            }

                            const speed = 3;
                            const nx = pos.x + (dx / dist) * speed;
                            const ny = pos.y + (dy / dist) * speed;
                            const facing = Math.abs(dx) > Math.abs(dy)
                                ? (dx > 0 ? "right" : "left")
                                : (dy > 0 ? "down" : "up");
                            next[a.id] = { ...st, facing, frame: st.frame + 1 };

                            return { ...pp, [a.id]: { x: nx, y: ny } };
                        });
                    } else if (st.action === "standing") {
                        if (st.returnTimer <= 0) {
                            // Walk back to desk
                            const desk = getDeskPosition(agents, a.id);
                            if (desk) {
                                next[a.id] = {
                                    action: "returning",
                                    targetX: desk.x,
                                    targetY: desk.y,
                                    facing: "up",
                                    frame: st.frame + 1,
                                    returnTimer: 0,
                                };
                            }
                        } else {
                            next[a.id] = { ...st, returnTimer: st.returnTimer - 1, frame: st.frame + 1 };
                        }
                    } else if (st.action === "returning") {
                        setPositions((pp) => {
                            const pos = pp[a.id];
                            if (!pos) return pp;
                            const dx = st.targetX - pos.x;
                            const dy = st.targetY - pos.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);

                            if (dist < 4) {
                                next[a.id] = { action: "sitting", facing: "down", frame: 0 };
                                return { ...pp, [a.id]: { x: st.targetX, y: st.targetY } };
                            }

                            const speed = 3;
                            const nx = pos.x + (dx / dist) * speed;
                            const ny = pos.y + (dy / dist) * speed;
                            const facing = Math.abs(dx) > Math.abs(dy)
                                ? (dx > 0 ? "right" : "left")
                                : (dy > 0 ? "down" : "up");
                            next[a.id] = { ...st, facing, frame: st.frame + 1 };

                            return { ...pp, [a.id]: { x: nx, y: ny } };
                        });
                    }
                });
                return next;
            });
        }, 80); // ~12 FPS movement

        return () => clearInterval(interval);
    }, [agents, agentStatuses]);

    return { positions, states };
}

/* ═══════════════════════════════════════════════════════════════
   SPRITE-BASED CHARACTER COMPONENT (PIPOYA)
   ═══════════════════════════════════════════════════════════════ */
/* Preload sprite images for each role */
const spriteImageCache = {};
function getSpriteImage(role) {
    const key = role || "custom";
    if (spriteImageCache[key]) return spriteImageCache[key];
    const src = ROLE_SHEETS[key] || ROLE_SHEETS.custom;
    const img = new Image();
    img.src = src;
    spriteImageCache[key] = img;
    return img;
}

/* Direction → row mapping for PIPOYA sheets */
const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };

function PixelCharSprite({ role, state, status }) {
    const canvasRef = useRef(null);
    const [loaded, setLoaded] = useState(false);
    const imgRef = useRef(null);

    const normRole = role && ROLE_SHEETS[role] ? role : "custom";

    // Load sprite sheet for this role
    useEffect(() => {
        const img = getSpriteImage(normRole);
        imgRef.current = img;
        if (img.complete) {
            setLoaded(true);
        } else {
            img.onload = () => setLoaded(true);
        }
    }, [normRole]);

    const action = state?.action || "sitting";
    const facing = state?.facing || "down";
    const frame = state?.frame || 0;

    // Render scale (1.5× for better visibility on the map)
    const DRAW_SCALE = 1.5;
    const drawW = CELL_W * DRAW_SCALE;
    const drawH = CELL_H * DRAW_SCALE;

    useEffect(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img || !loaded || !img.complete) return;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, drawW, drawH);

        // Determine row from facing direction
        const row = DIR_ROW[facing] ?? 0;

        // Determine column (walk frame)
        let col;
        if (action === "walking" || action === "returning") {
            // Walk cycle: 0 → 1 → 2 → 1 → 0 → ...
            const cycle = [0, 1, 2, 1];
            col = cycle[frame % 4];
        } else {
            // Idle/sitting: use middle frame (standing pose)
            col = 1;
        }

        const sx = col * CELL_W;
        const sy = row * CELL_H;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, sx, sy, CELL_W, CELL_H, 0, 0, drawW, drawH);
    }, [normRole, action, facing, frame, status, loaded, drawW, drawH]);

    return (
        <canvas
            ref={canvasRef}
            width={drawW}
            height={drawH}
            style={{
                width: drawW,
                height: drawH,
                imageRendering: "pixelated",
            }}
        />
    );
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

    // Movement system
    const { positions, states } = useAgentMovement(agents, agentStatuses);

    // Draw the tilemap
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        canvas.width = MAP_W * TILE;
        canvas.height = MAP_H * TILE;
        drawTilemap(ctx, MAP_W, MAP_H, null);
    }, []);

    // Zone labels
    const zoneLabels = useMemo(() => {
        return Object.entries(DEPT_ZONES).map(([role, zone]) => {
            const cfg = DEPT_CONFIG[role] || DEPT_CONFIG.custom;
            const count = agents.filter((a) => a.role === role).length;
            return { role, zone, cfg, count };
        });
    }, [agents]);

    // Chat auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [teamOutput]);

    // Speech bubbles from team output
    useEffect(() => {
        if (!teamOutput || teamOutput.length === 0) return;
        const last = teamOutput[teamOutput.length - 1];
        if (!last?.agent) return;
        const agent = agents.find((a) => a.name === last.agent);
        if (!agent) return;
        setSpeechBubbles((p) => ({ ...p, [agent.id]: last.content?.slice(0, 40) }));
        const timer = setTimeout(() => {
            setSpeechBubbles((p) => { const n = { ...p }; delete n[agent.id]; return n; });
        }, 4000);
        return () => clearTimeout(timer);
    }, [teamOutput, agents]);

    // Send chat
    const handleSend = useCallback(() => {
        if (!chatInput.trim() || !selectedProjectId) return;
        broadcastMessage(selectedProjectId, chatInput.trim());
        setChatInput("");
    }, [chatInput, selectedProjectId, broadcastMessage]);

    const getStatus = (id) => agentStatuses[id]?.status || "idle";
    const getTask = (id) => tasks.find((t) => t.assigned_agent_id === id && t.status !== "done");

    return (
        <div className="pixel-office">
            {/* ── Map Area ── */}
            <div className="pixel-office-map">
                {/* Toolbar */}
                <div className="pixel-toolbar">
                    <button className="pixel-toolbar-btn" onClick={() => setScale((s) => Math.min(s + 0.25, 2.5))} title="Zoom In">
                        <ZoomInOutlined />
                    </button>
                    <button className="pixel-toolbar-btn" onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))} title="Zoom Out">
                        <ZoomOutOutlined />
                    </button>
                    <button className="pixel-toolbar-btn" onClick={() => setScale(1)} title="Reset">
                        <FullscreenOutlined />
                    </button>
                    <div style={{
                        padding: "6px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                        background: "rgba(26,27,46,0.85)", color: "rgba(255,255,255,0.5)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        fontFamily: '"JetBrains Mono", monospace',
                        backdropFilter: "blur(8px)",
                    }}>
                        👥 {agents.length} agents online
                    </div>
                </div>

                {/* Scrollable map container */}
                <div style={{
                    position: "absolute", inset: 0, overflow: "auto",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 60,
                }}>
                    <div style={{
                        position: "relative",
                        width: MAP_W * TILE * scale,
                        height: MAP_H * TILE * scale,
                        flexShrink: 0,
                    }}>
                        {/* Tilemap canvas */}
                        <canvas
                            ref={canvasRef}
                            style={{
                                width: MAP_W * TILE * scale,
                                height: MAP_H * TILE * scale,
                                imageRendering: "pixelated",
                            }}
                        />

                        {/* Zone labels */}
                        {zoneLabels.map(({ role, zone, cfg, count }) => (
                            <div key={role} className="pixel-zone" style={{
                                left: zone.x * TILE * scale,
                                top: zone.y * TILE * scale,
                                width: zone.w * TILE * scale,
                                height: zone.h * TILE * scale,
                                borderColor: cfg.color + "30",
                                background: "transparent",
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
                            const pos = positions[agent.id];
                            if (!pos) return null;
                            const status = getStatus(agent.id);
                            const state = states[agent.id] || { action: "sitting", facing: "down", frame: 0 };
                            const currentTask = getTask(agent.id);
                            const bubble = speechBubbles[agent.id];
                            const isWalking = state.action === "walking" || state.action === "returning";

                            return (
                                <div
                                    key={agent.id}
                                    className={`pixel-agent ${isWalking ? "walking" : status}`}
                                    style={{
                                        left: pos.x * scale - (SPRITE_W / 2) * scale,
                                        top: pos.y * scale - (SPRITE_H / 2) * scale,
                                        transform: `scale(${scale})`,
                                        transformOrigin: "top left",
                                        transition: isWalking ? "none" : "left 0.3s ease, top 0.3s ease",
                                    }}
                                    onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                                >
                                    {/* Speech bubble */}
                                    {bubble && <div className="pixel-bubble">{bubble}…</div>}

                                    {/* Character sprite */}
                                    <div className="pixel-agent-body" style={{
                                        width: SPRITE_W, height: SPRITE_H,
                                        transform: state.facing === "right" ? "scaleX(-1)" : "none",
                                    }}>
                                        <PixelCharSprite role={agent.role} state={state} status={status} />
                                        <div className={`pixel-agent-status ${status}`} />
                                    </div>

                                    {/* Name */}
                                    <div className="pixel-agent-name">{agent.name}</div>

                                    {/* Status label */}
                                    {isWalking && (
                                        <div style={{
                                            fontSize: 8, color: "#818cf8", fontFamily: '"JetBrains Mono", monospace',
                                            fontWeight: 600, textAlign: "center", marginTop: 1,
                                        }}>
                                            {state.action === "returning" ? "↩ returning" : "🚶 walking"}
                                        </div>
                                    )}

                                    {/* Info tooltip */}
                                    {selectedAgent === agent.id && (
                                        <div className="pixel-agent-tooltip" style={{ left: 42, top: -10 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                                                {(DEPT_CONFIG[agent.role] || DEPT_CONFIG.custom).emoji} {agent.name}
                                            </div>
                                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
                                                Role: <span style={{ color: (DEPT_CONFIG[agent.role] || DEPT_CONFIG.custom).color }}>{agent.role}</span>
                                            </div>
                                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
                                                Status: <span style={{ color: status === "in_progress" ? "#818cf8" : "#64748b" }}>{status.replace("_", " ")}</span>
                                            </div>
                                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
                                                {isWalking ? "🚶 On a break" : state.action === "standing" ? "☕ At coffee" : "💻 At desk"}
                                            </div>
                                            {currentTask && (
                                                <div style={{
                                                    fontSize: 10, color: "rgba(255,255,255,0.5)",
                                                    borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 4, marginTop: 4,
                                                }}>
                                                    📋 {currentTask.title}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Empty state hint (floating over the office) */}
                        {agents.length === 0 && (
                            <div style={{
                                position: "absolute", inset: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                pointerEvents: "none",
                            }}>
                                <div style={{
                                    background: "rgba(26,27,46,0.88)",
                                    backdropFilter: "blur(8px)",
                                    borderRadius: 16,
                                    padding: "28px 40px",
                                    textAlign: "center",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                                }}>
                                    <div style={{ fontSize: 36, marginBottom: 8 }}>🏢</div>
                                    <div style={{
                                        fontFamily: '"JetBrains Mono", monospace',
                                        fontSize: 14, fontWeight: 700,
                                        color: "rgba(255,255,255,0.7)", marginBottom: 6,
                                    }}>
                                        Office is empty
                                    </div>
                                    <div style={{
                                        fontFamily: '"JetBrains Mono", monospace',
                                        fontSize: 11, color: "rgba(255,255,255,0.4)",
                                    }}>
                                        Create a team from the Team page
                                    </div>
                                </div>
                            </div>
                        )}
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
                                            <span className="time">
                                                {entry.ts ? new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                            </span>
                                        </div>
                                        <div className="pixel-chat-text">
                                            {entry.content || entry.text || JSON.stringify(entry)}
                                        </div>
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
