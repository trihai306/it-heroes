/**
 * PixelArtEditor.jsx — Lightweight Pixel Art Sprite Editor
 * Tailored for PIPOYA-format sprite sheets (3 cols × 4 rows, 32×32 per frame)
 * 
 * Features: Pen, Eraser, Fill, Eyedropper, Mirror, Undo/Redo,
 *           12-frame sheet editor, animation preview, export/import PNG
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import "./PixelArtEditor.css";

/* ── Constants ──────────────────────────────────────────────── */
const FRAME_W = 32;
const FRAME_H = 32;
const SHEET_COLS = 3;
const SHEET_ROWS = 4;
const TOTAL_FRAMES = SHEET_COLS * SHEET_ROWS; // 12
const SHEET_W = FRAME_W * SHEET_COLS; // 96
const SHEET_H = FRAME_H * SHEET_ROWS; // 128

const DIR_LABELS = ["Down", "Left", "Right", "Up"];
const TOOLS = [
    { id: "pen", icon: "✏️", label: "Pen", shortcut: "P" },
    { id: "eraser", icon: "🧹", label: "Eraser", shortcut: "E" },
    { id: "fill", icon: "🪣", label: "Fill", shortcut: "G" },
    { id: "eyedropper", icon: "💧", label: "Eyedropper", shortcut: "I" },
    { id: "mirror", icon: "🪞", label: "Mirror X", shortcut: "M" },
];

/* ── Default color palettes ─────────────────────────────────── */
const PALETTES = {
    skin: ["#ffe0bd", "#ffcd94", "#eac086", "#dca570", "#c68642", "#8d5524", "#613318", "#3b1f0b"],
    hair: ["#090806", "#2c222b", "#71635a", "#b7a69e", "#d6c4c2", "#cabfb1", "#dcd0ba", "#fff5e1",
        "#a52a2a", "#b55239", "#8b4513", "#cd853f", "#daa520", "#f0e130", "#ff6347", "#ff4500"],
    clothing: ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#1abc9c", "#3498db", "#9b59b6", "#ecf0f1",
        "#95a5a6", "#7f8c8d", "#2c3e50", "#34495e", "#1a1a2e", "#16213e", "#0f3460", "#533483"],
    basic: ["#000000", "#333333", "#666666", "#999999", "#cccccc", "#ffffff",
        "#ff0000", "#ff8800", "#ffff00", "#00ff00", "#0088ff", "#8800ff",
        "#ff0088", "#00ffff", "#ff00ff", "#884400"],
};

/* ── Helpers ────────────────────────────────────────────────── */
function createEmptyFrame() {
    return Array.from({ length: FRAME_H }, () =>
        Array.from({ length: FRAME_W }, () => null)
    );
}

function cloneFrame(frame) {
    return frame.map((row) => [...row]);
}

function cloneAllFrames(frames) {
    return frames.map(cloneFrame);
}

/* Flood-fill (iterative) */
function floodFill(grid, x, y, newColor) {
    const target = grid[y][x];
    if (target === newColor) return grid;
    const result = cloneFrame(grid);
    const stack = [[x, y]];
    while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cx >= FRAME_W || cy < 0 || cy >= FRAME_H) continue;
        if (result[cy][cx] !== target) continue;
        result[cy][cx] = newColor;
        stack.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]);
    }
    return result;
}

/* Mirror frame horizontally */
function mirrorFrameX(frame) {
    return frame.map((row) => [...row].reverse());
}

/* ── Role template sprite sheets ────────────────────────────── */
const ROLE_TEMPLATES = ["lead", "backend", "frontend", "qa", "docs", "security", "custom"];

async function loadSpriteSheetData(role) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = SHEET_W;
            canvas.height = SHEET_H;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, SHEET_W, SHEET_H);
            const frames = [];
            for (let row = 0; row < SHEET_ROWS; row++) {
                for (let col = 0; col < SHEET_COLS; col++) {
                    const frameData = ctx.getImageData(col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H);
                    const grid = createEmptyFrame();
                    for (let py = 0; py < FRAME_H; py++) {
                        for (let px = 0; px < FRAME_W; px++) {
                            const i = (py * FRAME_W + px) * 4;
                            const a = frameData.data[i + 3];
                            if (a > 20) {
                                const r = frameData.data[i];
                                const g = frameData.data[i + 1];
                                const b = frameData.data[i + 2];
                                grid[py][px] = `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`;
                            }
                        }
                    }
                    frames.push(grid);
                }
            }
            resolve(frames);
        };
        img.onerror = () => resolve(null);
        img.src = `/sprites/chars/${role}.png`;
    });
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function PixelArtEditor() {
    /* ── State ─────────────────────────────────────────────── */
    const [frames, setFrames] = useState(() =>
        Array.from({ length: TOTAL_FRAMES }, createEmptyFrame)
    );
    const [activeFrame, setActiveFrame] = useState(0);
    const [tool, setTool] = useState("pen");
    const [color, setColor] = useState("#000000");
    const [zoom, setZoom] = useState(14);
    const [showGrid, setShowGrid] = useState(true);
    const [mirrorX, setMirrorX] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyIdx, setHistoryIdx] = useState(-1);
    const [animPlaying, setAnimPlaying] = useState(false);
    const [animFrame, setAnimFrame] = useState(0);
    const [animFps, setAnimFps] = useState(6);
    const [animDir, setAnimDir] = useState(0); // 0=down, 1=left, 2=right, 3=up
    const [activePalette, setActivePalette] = useState("basic");
    const [recentColors, setRecentColors] = useState(["#000000"]);
    const canvasRef = useRef(null);
    const lastPixelRef = useRef(null);

    /* ── History ────────────────────────────────────────────── */
    const pushHistory = useCallback((newFrames) => {
        setHistory((prev) => {
            const trimmed = prev.slice(0, historyIdx + 1);
            const next = [...trimmed, cloneAllFrames(newFrames)];
            if (next.length > 50) next.shift();
            return next;
        });
        setHistoryIdx((prev) => Math.min(prev + 1, 49));
    }, [historyIdx]);

    const undo = useCallback(() => {
        if (historyIdx <= 0) return;
        const newIdx = historyIdx - 1;
        setHistoryIdx(newIdx);
        setFrames(cloneAllFrames(history[newIdx]));
    }, [history, historyIdx]);

    const redo = useCallback(() => {
        if (historyIdx >= history.length - 1) return;
        const newIdx = historyIdx + 1;
        setHistoryIdx(newIdx);
        setFrames(cloneAllFrames(history[newIdx]));
    }, [history, historyIdx]);

    // Initialize history
    useEffect(() => {
        if (history.length === 0) {
            setHistory([cloneAllFrames(frames)]);
            setHistoryIdx(0);
        }
    }, []); // eslint-disable-line

    /* ── Keyboard shortcuts ────────────────────────────────── */
    useEffect(() => {
        const handler = (e) => {
            if (e.target.tagName === "INPUT") return;
            const k = e.key.toLowerCase();
            if ((e.metaKey || e.ctrlKey) && k === "z" && e.shiftKey) { e.preventDefault(); redo(); return; }
            if ((e.metaKey || e.ctrlKey) && k === "z") { e.preventDefault(); undo(); return; }
            if (k === "p") setTool("pen");
            if (k === "e") setTool("eraser");
            if (k === "g") setTool("fill");
            if (k === "i") setTool("eyedropper");
            if (k === "m") setMirrorX((v) => !v);
            if (k === "[") setZoom((z) => Math.max(4, z - 2));
            if (k === "]") setZoom((z) => Math.min(24, z + 2));
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [undo, redo]);

    /* ── Canvas drawing ────────────────────────────────────── */
    const currentGrid = frames[activeFrame];
    const canvasSize = FRAME_W * zoom;

    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvasSize, canvasSize);

        // Draw pixels
        for (let y = 0; y < FRAME_H; y++) {
            for (let x = 0; x < FRAME_W; x++) {
                const c = currentGrid[y][x];
                if (c) {
                    ctx.fillStyle = c;
                    ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
                }
            }
        }

        // Draw grid
        if (showGrid && zoom >= 6) {
            ctx.strokeStyle = "rgba(255,255,255,0.08)";
            ctx.lineWidth = 0.5;
            for (let x = 0; x <= FRAME_W; x++) {
                ctx.beginPath();
                ctx.moveTo(x * zoom, 0);
                ctx.lineTo(x * zoom, canvasSize);
                ctx.stroke();
            }
            for (let y = 0; y <= FRAME_H; y++) {
                ctx.beginPath();
                ctx.moveTo(0, y * zoom);
                ctx.lineTo(canvasSize, y * zoom);
                ctx.stroke();
            }
        }
    }, [currentGrid, zoom, showGrid, canvasSize]);

    useEffect(() => { renderCanvas(); }, [renderCanvas]);

    /* ── Pixel coordinate from mouse ───────────────────────── */
    const getPixel = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / zoom);
        const y = Math.floor((e.clientY - rect.top) / zoom);
        if (x < 0 || x >= FRAME_W || y < 0 || y >= FRAME_H) return null;
        return { x, y };
    };

    /* ── Apply tool ────────────────────────────────────────── */
    const applyTool = useCallback((px, py, isStart) => {
        const newFrames = cloneAllFrames(frames);
        const grid = newFrames[activeFrame];

        switch (tool) {
            case "pen":
                grid[py][px] = color;
                if (mirrorX) {
                    const mx = FRAME_W - 1 - px;
                    grid[py][mx] = color;
                }
                break;
            case "eraser":
                grid[py][px] = null;
                if (mirrorX) {
                    const mx = FRAME_W - 1 - px;
                    grid[py][mx] = null;
                }
                break;
            case "fill":
                if (isStart) {
                    newFrames[activeFrame] = floodFill(grid, px, py, color);
                }
                break;
            case "eyedropper":
                if (grid[py][px]) {
                    setColor(grid[py][px]);
                    addRecentColor(grid[py][px]);
                    setTool("pen");
                }
                return; // Don't push history for eyedropper
            default:
                break;
        }

        setFrames(newFrames);
        if (isStart || tool === "pen" || tool === "eraser") {
            // Defer history push for continuous drawing
        }
    }, [frames, activeFrame, tool, color, mirrorX]);

    /* ── Mouse handlers ────────────────────────────────────── */
    const handleMouseDown = (e) => {
        e.preventDefault();
        const p = getPixel(e);
        if (!p) return;
        setIsDrawing(true);
        lastPixelRef.current = p;
        applyTool(p.x, p.y, true);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing) return;
        const p = getPixel(e);
        if (!p) return;
        if (lastPixelRef.current?.x === p.x && lastPixelRef.current?.y === p.y) return;
        lastPixelRef.current = p;
        applyTool(p.x, p.y, false);
    };

    const handleMouseUp = () => {
        if (isDrawing) {
            pushHistory(frames);
            setIsDrawing(false);
        }
    };

    /* ── Recent colors ─────────────────────────────────────── */
    const addRecentColor = (c) => {
        setRecentColors((prev) => {
            const filtered = prev.filter((x) => x !== c);
            return [c, ...filtered].slice(0, 16);
        });
    };

    const handleColorChange = (c) => {
        setColor(c);
        addRecentColor(c);
    };

    /* ── Frame operations ──────────────────────────────────── */
    const clearFrame = () => {
        const newFrames = cloneAllFrames(frames);
        newFrames[activeFrame] = createEmptyFrame();
        setFrames(newFrames);
        pushHistory(newFrames);
    };

    const copyFrame = (fromIdx) => {
        const newFrames = cloneAllFrames(frames);
        newFrames[activeFrame] = cloneFrame(newFrames[fromIdx]);
        setFrames(newFrames);
        pushHistory(newFrames);
    };

    const mirrorCurrentFrame = () => {
        const newFrames = cloneAllFrames(frames);
        newFrames[activeFrame] = mirrorFrameX(newFrames[activeFrame]);
        setFrames(newFrames);
        pushHistory(newFrames);
    };

    /* ── Import / Load template ────────────────────────────── */
    const loadTemplate = async (role) => {
        const loaded = await loadSpriteSheetData(role);
        if (loaded) {
            setFrames(loaded);
            pushHistory(loaded);
            setActiveFrame(0);
        }
    };

    const importPNG = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png";
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            const loaded = await loadSpriteSheetData("__import__");
            // Load via img element instead
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                const newFrames = [];
                const fw = Math.floor(img.width / SHEET_COLS);
                const fh = Math.floor(img.height / SHEET_ROWS);
                for (let row = 0; row < SHEET_ROWS; row++) {
                    for (let col = 0; col < SHEET_COLS; col++) {
                        const frameData = ctx.getImageData(col * fw, row * fh, fw, fh);
                        const grid = createEmptyFrame();
                        for (let py = 0; py < Math.min(FRAME_H, fh); py++) {
                            for (let px = 0; px < Math.min(FRAME_W, fw); px++) {
                                const i = (py * fw + px) * 4;
                                const a = frameData.data[i + 3];
                                if (a > 20) {
                                    const r = frameData.data[i];
                                    const g = frameData.data[i + 1];
                                    const b = frameData.data[i + 2];
                                    grid[py][px] = `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`;
                                }
                            }
                        }
                        newFrames.push(grid);
                    }
                }
                setFrames(newFrames);
                pushHistory(newFrames);
                setActiveFrame(0);
                URL.revokeObjectURL(url);
            };
            img.src = url;
        };
        input.click();
    };

    /* ── Export ──────────────────────────────────────────────── */
    const exportPNG = () => {
        const canvas = document.createElement("canvas");
        canvas.width = SHEET_W;
        canvas.height = SHEET_H;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;

        for (let row = 0; row < SHEET_ROWS; row++) {
            for (let col = 0; col < SHEET_COLS; col++) {
                const idx = row * SHEET_COLS + col;
                const grid = frames[idx];
                for (let py = 0; py < FRAME_H; py++) {
                    for (let px = 0; px < FRAME_W; px++) {
                        if (grid[py][px]) {
                            ctx.fillStyle = grid[py][px];
                            ctx.fillRect(col * FRAME_W + px, row * FRAME_H + py, 1, 1);
                        }
                    }
                }
            }
        }

        const link = document.createElement("a");
        link.download = "sprite_sheet.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    /* ── Animation preview ──────────────────────────────────── */
    useEffect(() => {
        if (!animPlaying) return;
        const interval = setInterval(() => {
            setAnimFrame((f) => (f + 1) % 3);
        }, 1000 / animFps);
        return () => clearInterval(interval);
    }, [animPlaying, animFps]);

    const animPreviewFrame = useMemo(() => {
        const cycle = [0, 1, 2];
        const col = cycle[animFrame % 3];
        const idx = animDir * SHEET_COLS + col;
        return frames[idx];
    }, [frames, animDir, animFrame]);

    /* ── Frame thumbnails ──────────────────────────────────── */
    const FrameThumb = ({ idx }) => {
        const thumbRef = useRef(null);
        const grid = frames[idx];
        const size = 48;
        const scale = size / FRAME_W;

        useEffect(() => {
            const c = thumbRef.current;
            if (!c) return;
            const ctx = c.getContext("2d");
            ctx.clearRect(0, 0, size, size);
            ctx.imageSmoothingEnabled = false;
            for (let y = 0; y < FRAME_H; y++) {
                for (let x = 0; x < FRAME_W; x++) {
                    if (grid[y][x]) {
                        ctx.fillStyle = grid[y][x];
                        ctx.fillRect(x * scale, y * scale, scale, scale);
                    }
                }
            }
        }, [grid, scale]);

        const row = Math.floor(idx / SHEET_COLS);
        const col = idx % SHEET_COLS;

        return (
            <div
                className={`sprite-frame-thumb ${activeFrame === idx ? "active" : ""}`}
                onClick={() => setActiveFrame(idx)}
                title={`${DIR_LABELS[row]} · Frame ${col + 1}`}
            >
                <canvas ref={thumbRef} width={size} height={size}
                    style={{ width: size, height: size, imageRendering: "pixelated" }} />
                <span className="frame-label">{col + 1}</span>
            </div>
        );
    };

    /* ── Animation preview canvas ──────────────────────────── */
    const AnimPreview = () => {
        const prevRef = useRef(null);
        const size = 96;
        const scale = size / FRAME_W;

        useEffect(() => {
            const c = prevRef.current;
            if (!c) return;
            const ctx = c.getContext("2d");
            ctx.clearRect(0, 0, size, size);
            ctx.imageSmoothingEnabled = false;
            for (let y = 0; y < FRAME_H; y++) {
                for (let x = 0; x < FRAME_W; x++) {
                    if (animPreviewFrame[y][x]) {
                        ctx.fillStyle = animPreviewFrame[y][x];
                        ctx.fillRect(x * scale, y * scale, scale, scale);
                    }
                }
            }
        }, [animPreviewFrame, scale]);

        return (
            <canvas ref={prevRef} width={size} height={size}
                style={{
                    width: size, height: size, imageRendering: "pixelated",
                    background: "rgba(0,0,0,0.3)", borderRadius: 8
                }} />
        );
    };

    /* ═══════════════════════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════════════════════ */
    return (
        <div className="pixel-editor">
            {/* ── Toolbar ───────────────────────────────────── */}
            <div className="pe-toolbar">
                <div className="pe-toolbar-group">
                    {TOOLS.map((t) => (
                        <button
                            key={t.id}
                            className={`pe-tool-btn ${tool === t.id || (t.id === "mirror" && mirrorX) ? "active" : ""}`}
                            onClick={() =>
                                t.id === "mirror"
                                    ? setMirrorX((v) => !v)
                                    : setTool(t.id)
                            }
                            title={`${t.label} (${t.shortcut})`}
                        >
                            <span className="pe-tool-icon">{t.icon}</span>
                            <span className="pe-tool-label">{t.label}</span>
                        </button>
                    ))}
                </div>

                <div className="pe-toolbar-group">
                    <button className="pe-tool-btn" onClick={undo} title="Undo (Ctrl+Z)" disabled={historyIdx <= 0}>
                        <span className="pe-tool-icon">↩️</span>
                        <span className="pe-tool-label">Undo</span>
                    </button>
                    <button className="pe-tool-btn" onClick={redo} title="Redo (Ctrl+Shift+Z)" disabled={historyIdx >= history.length - 1}>
                        <span className="pe-tool-icon">↪️</span>
                        <span className="pe-tool-label">Redo</span>
                    </button>
                </div>

                <div className="pe-toolbar-group">
                    <label className="pe-grid-toggle">
                        <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                        Grid
                    </label>
                    <div className="pe-zoom-ctrl">
                        <button onClick={() => setZoom((z) => Math.max(4, z - 2))}>−</button>
                        <span>{zoom}×</span>
                        <button onClick={() => setZoom((z) => Math.min(24, z + 2))}>+</button>
                    </div>
                </div>

                <div className="pe-toolbar-group pe-toolbar-right">
                    <button className="pe-action-btn" onClick={clearFrame} title="Clear current frame">
                        🗑️ Clear
                    </button>
                    <button className="pe-action-btn" onClick={mirrorCurrentFrame} title="Mirror current frame">
                        🔄 Flip
                    </button>
                    <button className="pe-action-btn" onClick={importPNG}>
                        📂 Import
                    </button>
                    <button className="pe-action-btn pe-export-btn" onClick={exportPNG}>
                        💾 Export PNG
                    </button>
                </div>
            </div>

            {/* ── Main Area ─────────────────────────────────── */}
            <div className="pe-main">
                {/* ── Canvas (center) ─────────────────────── */}
                <div className="pe-canvas-wrap">
                    <div className="pe-canvas-header">
                        <span>Frame {(activeFrame % SHEET_COLS) + 1} · {DIR_LABELS[Math.floor(activeFrame / SHEET_COLS)]}</span>
                        <span className="pe-canvas-size">{FRAME_W}×{FRAME_H}px</span>
                    </div>
                    <div className="pe-canvas-container" style={{ width: canvasSize, height: canvasSize }}>
                        <canvas
                            ref={canvasRef}
                            width={canvasSize}
                            height={canvasSize}
                            className="pe-canvas"
                            style={{ cursor: tool === "eyedropper" ? "crosshair" : tool === "fill" ? "cell" : "crosshair" }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        />
                    </div>
                </div>

                {/* ── Right Panel ─────────────────────────── */}
                <div className="pe-right-panel">
                    {/* Color picker */}
                    <div className="pe-section">
                        <div className="pe-section-title">🎨 Color</div>
                        <div className="pe-color-current">
                            <div className="pe-color-swatch-big" style={{ background: color }} />
                            <input
                                type="color"
                                value={color.startsWith("rgba") ? "#000000" : color}
                                onChange={(e) => handleColorChange(e.target.value)}
                                className="pe-color-input"
                            />
                        </div>
                    </div>

                    {/* Palette tabs */}
                    <div className="pe-section">
                        <div className="pe-palette-tabs">
                            {Object.keys(PALETTES).map((p) => (
                                <button
                                    key={p}
                                    className={`pe-palette-tab ${activePalette === p ? "active" : ""}`}
                                    onClick={() => setActivePalette(p)}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <div className="pe-palette-grid">
                            {PALETTES[activePalette].map((c, i) => (
                                <button
                                    key={i}
                                    className={`pe-color-swatch ${color === c ? "active" : ""}`}
                                    style={{ background: c }}
                                    onClick={() => handleColorChange(c)}
                                    title={c}
                                />
                            ))}
                        </div>
                        {recentColors.length > 1 && (
                            <>
                                <div className="pe-section-subtitle">Recent</div>
                                <div className="pe-palette-grid">
                                    {recentColors.map((c, i) => (
                                        <button
                                            key={i}
                                            className={`pe-color-swatch ${color === c ? "active" : ""}`}
                                            style={{ background: c }}
                                            onClick={() => handleColorChange(c)}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Animation preview */}
                    <div className="pe-section">
                        <div className="pe-section-title">🚶 Animation Preview</div>
                        <div className="pe-anim-preview">
                            <AnimPreview />
                            <div className="pe-anim-controls">
                                <button
                                    className={`pe-play-btn ${animPlaying ? "playing" : ""}`}
                                    onClick={() => setAnimPlaying((v) => !v)}
                                >
                                    {animPlaying ? "⏸" : "▶️"}
                                </button>
                                <select
                                    value={animDir}
                                    onChange={(e) => setAnimDir(Number(e.target.value))}
                                    className="pe-dir-select"
                                >
                                    {DIR_LABELS.map((d, i) => (
                                        <option key={i} value={i}>{d}</option>
                                    ))}
                                </select>
                                <div className="pe-fps-ctrl">
                                    <span>FPS:</span>
                                    <input
                                        type="range"
                                        min={2}
                                        max={16}
                                        value={animFps}
                                        onChange={(e) => setAnimFps(Number(e.target.value))}
                                    />
                                    <span>{animFps}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Templates */}
                    <div className="pe-section">
                        <div className="pe-section-title">🎭 Templates</div>
                        <div className="pe-template-grid">
                            {ROLE_TEMPLATES.map((role) => (
                                <button
                                    key={role}
                                    className="pe-template-btn"
                                    onClick={() => loadTemplate(role)}
                                    title={`Load ${role} sprite`}
                                >
                                    <img
                                        src={`/sprites/chars/${role}.png`}
                                        alt={role}
                                        style={{ width: 32, height: 32, imageRendering: "pixelated", objectFit: "cover", objectPosition: "0 0" }}
                                    />
                                    <span>{role}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Frame Grid (bottom) ───────────────────────── */}
            <div className="pe-frame-strip">
                {DIR_LABELS.map((dir, rowIdx) => (
                    <div key={rowIdx} className="pe-frame-row">
                        <div className="pe-frame-dir">{dir}</div>
                        {Array.from({ length: SHEET_COLS }, (_, colIdx) => (
                            <FrameThumb key={colIdx} idx={rowIdx * SHEET_COLS + colIdx} />
                        ))}
                        <button
                            className="pe-frame-copy-btn"
                            onClick={() => {
                                // Copy frame 1 of this row to current active frame
                                const srcIdx = rowIdx * SHEET_COLS + 1;
                                if (srcIdx !== activeFrame) copyFrame(srcIdx);
                            }}
                            title="Copy middle frame to active"
                        >
                            📋
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
