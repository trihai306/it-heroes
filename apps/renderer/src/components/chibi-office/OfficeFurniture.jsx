/**
 * OfficeFurniture — Premium SVG isometric 3D office furniture
 * Style: Soft 3D clay render × isometric pixel art × warm cozy office
 * Each piece features multi-layer gradients, ambient glow, and rich details
 */

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── DESK — Premium desk with glowing monitor & peripherals ─────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function Desk({ active, reviewMode, style }) {
    const glowColor = reviewMode ? "#a78bfa" : "#6366f1";
    const glowOpacity = active ? 0.6 : 0;

    return (
        <div style={{ width: 100, height: 70, ...style }}>
            <svg viewBox="0 0 100 70" width="100" height="70" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="desk-top-g" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#deb887" />
                        <stop offset="50%" stopColor="#c9956e" />
                        <stop offset="100%" stopColor="#b8845a" />
                    </linearGradient>
                    <linearGradient id="desk-front-g" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#c9956e" />
                        <stop offset="100%" stopColor="#a07050" />
                    </linearGradient>
                    <linearGradient id="desk-leg-g" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#9ca3af" />
                        <stop offset="100%" stopColor="#6b7280" />
                    </linearGradient>
                    <linearGradient id="monitor-body" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2d2d3d" />
                        <stop offset="100%" stopColor="#1a1a2e" />
                    </linearGradient>
                    {active && (
                        <filter id="monitor-glow-f">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    )}
                    {active && (
                        <radialGradient id="screen-glow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor={glowColor} stopOpacity="0.15" />
                            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
                        </radialGradient>
                    )}
                </defs>

                {/* Desk surface — isometric 3D top */}
                <path d="M8 36 L50 30 L92 36 L92 40 L50 46 L8 40 Z" fill="url(#desk-top-g)" stroke="#a07050" strokeWidth="0.5" />
                {/* Wood grain lines */}
                <path d="M20 35 L55 31 L85 35" fill="none" stroke="#b8845a" strokeWidth="0.3" opacity="0.3" />
                <path d="M15 37 L50 33 L88 37" fill="none" stroke="#b8845a" strokeWidth="0.3" opacity="0.2" />
                {/* Desk top highlight */}
                <path d="M12 36.5 L50 31 L60 33" fill="none" stroke="#e8cba8" strokeWidth="0.8" opacity="0.3" />

                {/* Desk front panel */}
                <path d="M8 40 L50 46 L92 40 L92 58 L50 64 L8 58 Z" fill="url(#desk-front-g)" stroke="#8b6f47" strokeWidth="0.4" opacity="0.7" />
                {/* Front panel detail — drawer lines */}
                <path d="M20 48 L45 52" fill="none" stroke="#a07050" strokeWidth="0.4" opacity="0.3" />
                <path d="M20 52 L45 56" fill="none" stroke="#a07050" strokeWidth="0.4" opacity="0.3" />
                {/* Drawer handle */}
                <rect x="30" y="49.5" width="8" height="1.5" rx="0.75" fill="#9ca3af" opacity="0.4" />

                {/* Desk legs — metallic */}
                <rect x="12" y="58" width="4" height="8" rx="1" fill="url(#desk-leg-g)" />
                <rect x="84" y="58" width="4" height="8" rx="1" fill="url(#desk-leg-g)" />
                {/* Leg cross bar */}
                <rect x="14" y="62" width="74" height="1.5" rx="0.5" fill="#6b7280" opacity="0.25" />

                {/* Monitor */}
                <g>
                    {/* Monitor stand */}
                    <rect x="46" y="26" width="8" height="6" rx="1.5" fill="#4b5563" />
                    <rect x="42" y="31" width="16" height="3" rx="1.5" fill="#6b7280" opacity="0.7" />
                    {/* Stand highlight */}
                    <rect x="48" y="27" width="2" height="4" rx="0.5" fill="#9ca3af" opacity="0.2" />

                    {/* Monitor body */}
                    <rect x="28" y="2" width="44" height="26" rx="2.5" fill="url(#monitor-body)" stroke="#374151" strokeWidth="0.8" />
                    {/* Monitor bezel highlight */}
                    <rect x="29" y="3" width="42" height="1" rx="0.5" fill="#4b5563" opacity="0.4" />

                    {/* Screen */}
                    <rect x="31" y="5" width="38" height="20" rx="1.5" fill={active ? "#0f172a" : "var(--bg-terminal, #1e1e2e)"} />

                    {/* Screen content when active */}
                    {active && (
                        <g>
                            {/* Screen ambient glow */}
                            <rect x="31" y="5" width="38" height="20" rx="1.5" fill="url(#screen-glow)" />
                            {/* Code lines */}
                            <g opacity="0.8">
                                <rect x="35" y="8" width="12" height="1.5" rx="0.5" fill={glowColor} opacity="0.7" />
                                <rect x="35" y="11" width="20" height="1.5" rx="0.5" fill={glowColor} opacity="0.5" />
                                <rect x="35" y="14" width="16" height="1.5" rx="0.5" fill={glowColor} opacity="0.6" />
                                <rect x="35" y="17" width="8" height="1.5" rx="0.5" fill={glowColor} opacity="0.4" />
                                <rect x="35" y="20" width="24" height="1.5" rx="0.5" fill={glowColor} opacity="0.3" />
                                {/* Cursor blink */}
                                <rect x="43" y="17" width="2" height="2" fill={glowColor} opacity="0.9">
                                    <animate attributeName="opacity" values="0.9;0.15;0.9" dur="1s" repeatCount="indefinite" />
                                </rect>
                                {/* Line numbers */}
                                <g opacity="0.25">
                                    {[8, 11, 14, 17, 20].map((y, i) => (
                                        <text key={i} x="33" y={y + 1.2} fontSize="2" fill={glowColor} fontFamily="monospace">{i + 1}</text>
                                    ))}
                                </g>
                            </g>
                        </g>
                    )}

                    {/* Monitor glow border */}
                    {active && (
                        <rect x="28" y="2" width="44" height="26" rx="2.5" fill="none"
                            stroke={glowColor} strokeWidth="1.5" opacity={glowOpacity}
                            filter="url(#monitor-glow-f)">
                            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
                        </rect>
                    )}

                    {/* Power LED */}
                    <circle cx="50" cy="27" r="1.2" fill={active ? "#22c55e" : "#4b5563"}>
                        {active && <animate attributeName="opacity" values="1;0.5;1" dur="3s" repeatCount="indefinite" />}
                    </circle>
                    {/* Brand logo placeholder */}
                    <rect x="47" y="27.5" width="6" height="0.3" rx="0.15" fill="#6b7280" opacity="0.3" />
                </g>

                {/* Keyboard */}
                <g>
                    <rect x="36" y="35" width="24" height="6" rx="2" fill="var(--bg-elevated, #2d2d3d)" stroke="var(--border-subtle, #4b5563)" strokeWidth="0.5" />
                    {/* Key rows */}
                    <g opacity="0.35">
                        <rect x="38" y="36.5" width="2.5" height="1.2" rx="0.3" fill="var(--text-muted, #9ca3af)" />
                        <rect x="41" y="36.5" width="2.5" height="1.2" rx="0.3" fill="var(--text-muted, #9ca3af)" />
                        <rect x="44" y="36.5" width="2.5" height="1.2" rx="0.3" fill="var(--text-muted, #9ca3af)" />
                        <rect x="47" y="36.5" width="2.5" height="1.2" rx="0.3" fill="var(--text-muted, #9ca3af)" />
                        <rect x="50" y="36.5" width="2.5" height="1.2" rx="0.3" fill="var(--text-muted, #9ca3af)" />
                        <rect x="53" y="36.5" width="2.5" height="1.2" rx="0.3" fill="var(--text-muted, #9ca3af)" />
                        <rect x="38" y="38.5" width="4" height="1.2" rx="0.3" fill="var(--text-muted, #9ca3af)" />
                        <rect x="43" y="38.5" width="10" height="1.2" rx="0.3" fill="var(--text-muted, #9ca3af)" />
                        <rect x="54" y="38.5" width="4" height="1.2" rx="0.3" fill="var(--text-muted, #9ca3af)" />
                    </g>
                </g>

                {/* Mouse */}
                <ellipse cx="66" cy="37" rx="3" ry="4" fill="var(--bg-elevated, #2d2d3d)" stroke="var(--border-subtle, #4b5563)" strokeWidth="0.4" />
                <ellipse cx="66" cy="36" rx="1.2" ry="1.5" fill="var(--text-muted, #6b7280)" opacity="0.2" />
                {/* Mouse pad */}
                <rect x="62" y="33" width="12" height="9" rx="1.5" fill="var(--border-subtle, #374151)" opacity="0.15" />

                {/* Desk lamp */}
                <g opacity="0.6">
                    <rect x="18" y="32" width="2" height="5" rx="1" fill="#6b7280" />
                    <path d="M15 28 Q16 24 19 26 L21 28 Q22 30 19 32 L15 32 Z" fill="#f59e0b" opacity="0.7" />
                    <ellipse cx="18" cy="27" rx="4" ry="2" fill="#fbbf24" opacity={active ? "0.3" : "0.1"} />
                </g>

                {/* Coffee mug on desk */}
                <g>
                    <rect x="76" y="33" width="6" height="5" rx="2" fill="#f5f0eb" stroke="#ddd4cc" strokeWidth="0.4" />
                    <path d="M82 34.5 Q84 34.5 84 36 Q84 37.5 82 37.5" fill="none" stroke="#ddd4cc" strokeWidth="0.5" />
                    <rect x="77" y="34" width="4" height="2" rx="1" fill="#6f4e37" opacity="0.5" />
                </g>
            </svg>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── PLANT — Premium potted plant with animated sway ────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function Plant({ style, size = "medium" }) {
    const w = size === "small" ? 30 : 40;
    const h = size === "small" ? 44 : 55;
    return (
        <div style={{ width: w, height: h, ...style }}>
            <svg viewBox="0 0 40 55" width={w} height={h} xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <radialGradient id="leaf-g" cx="40%" cy="30%" r="60%">
                        <stop offset="0%" stopColor="#86efac" />
                        <stop offset="50%" stopColor="#4ade80" />
                        <stop offset="100%" stopColor="#16a34a" />
                    </radialGradient>
                    <linearGradient id="pot-g" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e87040" />
                        <stop offset="50%" stopColor="#c2410c" />
                        <stop offset="100%" stopColor="#9a3412" />
                    </linearGradient>
                    <radialGradient id="pot-shine" cx="30%" cy="30%" r="50%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Shadow */}
                <ellipse cx="20" cy="53" rx="10" ry="2" fill="#000" opacity="0.05" />

                {/* Pot body — 3D */}
                <path d="M10 39 L12 52 L28 52 L30 39 Z" fill="url(#pot-g)" />
                <path d="M10 39 L12 52 L16 52 L14 39 Z" fill="white" opacity="0.06" />
                {/* Pot rim */}
                <rect x="7" y="37" width="26" height="4" rx="1.5" fill="#c2410c" />
                <rect x="8" y="37.5" width="24" height="1.5" rx="0.5" fill="#ea580c" opacity="0.35" />
                {/* Pot shine overlay */}
                <rect x="7" y="37" width="26" height="18" rx="1.5" fill="url(#pot-shine)" />

                {/* Soil */}
                <ellipse cx="20" cy="39" rx="10" ry="2.5" fill="#78350f" />
                <ellipse cx="18" cy="38.5" rx="3" ry="1" fill="#92400e" opacity="0.3" />

                {/* Stem */}
                <rect x="19" y="32" width="2.5" height="8" rx="1" fill="#15803d" />
                <rect x="19.5" y="33" width="1" height="6" rx="0.5" fill="#22c55e" opacity="0.15" />

                {/* Leaves cluster */}
                <g className="chibi-plant-sway">
                    {/* Main leaf dome */}
                    <ellipse cx="20" cy="22" rx="12" ry="14" fill="url(#leaf-g)" />
                    {/* Sub-leaves */}
                    <ellipse cx="12" cy="18" rx="7" ry="9" fill="#22c55e" opacity="0.75" />
                    <ellipse cx="28" cy="18" rx="7" ry="9" fill="#22c55e" opacity="0.75" />
                    <ellipse cx="20" cy="14" rx="8" ry="7" fill="#4ade80" opacity="0.65" />
                    {/* Top sprout */}
                    <ellipse cx="20" cy="9" rx="4" ry="5" fill="#86efac" opacity="0.5" />
                    {/* Leaf highlights */}
                    <ellipse cx="15" cy="16" rx="3.5" ry="4.5" fill="#bbf7d0" opacity="0.25" />
                    <ellipse cx="24" cy="13" rx="2" ry="3" fill="#bbf7d0" opacity="0.15" />
                    {/* Leaf veins */}
                    <path d="M20 28 Q20 18 18 12" fill="none" stroke="#15803d" strokeWidth="0.5" opacity="0.15" />
                    <path d="M15 24 Q18 18 14 12" fill="none" stroke="#15803d" strokeWidth="0.4" opacity="0.1" />
                    <path d="M25 24 Q22 18 26 12" fill="none" stroke="#15803d" strokeWidth="0.4" opacity="0.1" />
                </g>
            </svg>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── WATER COOLER — Premium water dispenser ─────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function WaterCooler({ style }) {
    return (
        <div style={{ width: 34, height: 60, ...style }}>
            <svg viewBox="0 0 34 60" width="34" height="60" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="water-g" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.35" />
                    </linearGradient>
                    <linearGradient id="cooler-body" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--bg-elevated, #f5f5f5)" />
                        <stop offset="100%" stopColor="var(--bg-surface, #e5e5e5)" />
                    </linearGradient>
                    <radialGradient id="bottle-shine" cx="35%" cy="25%" r="50%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Shadow */}
                <ellipse cx="17" cy="58" rx="10" ry="2" fill="#000" opacity="0.04" />

                {/* Body */}
                <rect x="4" y="26" width="24" height="30" rx="3" fill="url(#cooler-body)" stroke="var(--border-default, #d1d5db)" strokeWidth="0.8" />
                {/* Body detail lines */}
                <line x1="6" y1="40" x2="26" y2="40" stroke="var(--border-subtle, #e5e7eb)" strokeWidth="0.5" />

                {/* Water bottle */}
                <ellipse cx="16" cy="26" rx="8" ry="2.5" fill="var(--border-default, #d1d5db)" />
                <rect x="8" y="6" width="16" height="22" rx="4" fill="url(#water-g)" stroke="rgba(59,130,246,0.3)" strokeWidth="0.8" />
                <ellipse cx="16" cy="6" rx="6" ry="3.5" fill="rgba(147,197,253,0.45)" stroke="rgba(59,130,246,0.3)" strokeWidth="0.5" />
                {/* Bottle shine */}
                <rect x="8" y="6" width="16" height="22" rx="4" fill="url(#bottle-shine)" />
                {/* Water level — animated */}
                <rect x="10" y="13" width="12" height="13" rx="2.5" fill="rgba(59,130,246,0.2)">
                    <animate attributeName="height" values="13;11;13" dur="6s" repeatCount="indefinite" />
                </rect>
                {/* Bubbles */}
                <circle cx="14" cy="18" r="0.8" fill="white" opacity="0.3">
                    <animate attributeName="cy" values="20;14;20" dur="4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="4s" repeatCount="indefinite" />
                </circle>
                <circle cx="18" cy="16" r="0.5" fill="white" opacity="0.2">
                    <animate attributeName="cy" values="18;12;18" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.2;0;0.2" dur="3s" repeatCount="indefinite" />
                </circle>

                {/* Hot/Cold labels */}
                <g opacity="0.5">
                    <circle cx="10" cy="34" r="3" fill="#ef4444" opacity="0.2" stroke="#ef4444" strokeWidth="0.5" />
                    <text x="10" y="35.5" textAnchor="middle" fontSize="3" fill="#ef4444" fontWeight="600">H</text>
                    <circle cx="22" cy="34" r="3" fill="#3b82f6" opacity="0.2" stroke="#3b82f6" strokeWidth="0.5" />
                    <text x="22" y="35.5" textAnchor="middle" fontSize="3" fill="#3b82f6" fontWeight="600">C</text>
                </g>

                {/* Spout */}
                <rect x="25" y="36" width="6" height="3.5" rx="1" fill="var(--border-default, #9ca3af)" />
                {/* Drip */}
                <circle cx="31" cy="42" r="1" fill="#3b82f6" opacity="0.4">
                    <animate attributeName="cy" values="40;46;40" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
                </circle>

                {/* Drip tray */}
                <rect x="6" y="44" width="20" height="2" rx="0.5" fill="var(--border-default, #9ca3af)" opacity="0.3" />

                {/* Legs */}
                <rect x="6" y="56" width="3.5" height="4" rx="1" fill="var(--border-default, #9ca3af)" />
                <rect x="22.5" y="56" width="3.5" height="4" rx="1" fill="var(--border-default, #9ca3af)" />
            </svg>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── COFFEE MACHINE — Premium espresso machine ──────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function CoffeeMachine({ style }) {
    return (
        <div style={{ width: 38, height: 54, ...style }}>
            <svg viewBox="0 0 38 54" width="38" height="54" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="cm-body" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4b5563" />
                        <stop offset="50%" stopColor="#374151" />
                        <stop offset="100%" stopColor="#1f2937" />
                    </linearGradient>
                    <radialGradient id="cm-shine" cx="30%" cy="25%" r="50%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Shadow */}
                <ellipse cx="19" cy="52" rx="14" ry="2" fill="#000" opacity="0.04" />

                {/* Body */}
                <rect x="4" y="8" width="28" height="40" rx="4" fill="url(#cm-body)" stroke="#4b5563" strokeWidth="0.8" />
                {/* Body shine */}
                <rect x="4" y="8" width="28" height="40" rx="4" fill="url(#cm-shine)" />

                {/* Top housing */}
                <rect x="6" y="4" width="24" height="6" rx="2.5" fill="#4b5563" />
                <rect x="7" y="4.5" width="22" height="2" rx="1" fill="#6b7280" opacity="0.25" />

                {/* Display */}
                <rect x="8" y="12" width="20" height="10" rx="2.5" fill="#0f172a" />
                {/* Display content */}
                <rect x="10" y="14" width="16" height="6" rx="1" fill="#0f172a" />
                <text x="18" y="18.5" textAnchor="middle" fontSize="5" fontFamily="monospace" fill="#22c55e" opacity="0.9">READY</text>
                {/* Display reflection */}
                <rect x="10" y="14" width="8" height="2" rx="0.5" fill="white" opacity="0.04" />

                {/* Buttons — chrome */}
                <circle cx="12" cy="26" r="2.5" fill="#4b5563" stroke="#9ca3af" strokeWidth="0.6" />
                <circle cx="12" cy="26" r="1.5" fill="#6b7280" opacity="0.4" />
                <circle cx="20" cy="26" r="2.5" fill="#4b5563" stroke="#9ca3af" strokeWidth="0.6" />
                <circle cx="20" cy="26" r="1.5" fill="#6b7280" opacity="0.4" />
                {/* Dial */}
                <circle cx="28" cy="26" r="2.5" fill="#374151" stroke="#9ca3af" strokeWidth="0.6" />
                <line x1="28" y1="24.5" x2="28" y2="26" stroke="#9ca3af" strokeWidth="0.5" />

                {/* Power LED */}
                <circle cx="28" cy="13" r="1.8" fill="#f97316">
                    <animate attributeName="opacity" values="1;0.35;1" dur="3s" repeatCount="indefinite" />
                </circle>
                {/* LED glow */}
                <circle cx="28" cy="13" r="3" fill="#f97316" opacity="0.15">
                    <animate attributeName="opacity" values="0.15;0.05;0.15" dur="3s" repeatCount="indefinite" />
                </circle>

                {/* Spout area */}
                <rect x="12" y="32" width="12" height="3" rx="1" fill="#1f2937" />
                {/* Drip tray */}
                <rect x="8" y="40" width="20" height="4" rx="1.5" fill="#374151" stroke="#4b5563" strokeWidth="0.5" />
                <rect x="10" y="41" width="16" height="2" rx="0.5" fill="#2d3748" opacity="0.3" />

                {/* Cup */}
                <rect x="12" y="34" width="12" height="10" rx="3" fill="#f5f5f4" stroke="#d6d3d1" strokeWidth="0.5" />
                <rect x="14" y="36" width="8" height="3" rx="1" fill="#92400e" opacity="0.5" />
                {/* Cup handle */}
                <path d="M24 36 Q27 36 27 39 Q27 42 24 42" fill="none" stroke="#d6d3d1" strokeWidth="0.6" />
                {/* Latte art hint */}
                <ellipse cx="18" cy="37" rx="2" ry="0.8" fill="#b8845a" opacity="0.3" />

                {/* Steam */}
                <g opacity="0.35">
                    <path d="M15 32 Q16 27 15 22" fill="none" stroke="#9ca3af" strokeWidth="0.7" strokeLinecap="round">
                        <animate attributeName="d" values="M15 32 Q16 27 15 22;M15 32 Q14 27 15 22;M15 32 Q16 27 15 22" dur="3s" repeatCount="indefinite" />
                    </path>
                    <path d="M21 32 Q22 26 21 20" fill="none" stroke="#9ca3af" strokeWidth="0.7" strokeLinecap="round">
                        <animate attributeName="d" values="M21 32 Q22 26 21 20;M21 32 Q20 26 21 20;M21 32 Q22 26 21 20" dur="3.5s" repeatCount="indefinite" />
                    </path>
                </g>

                {/* Brand plate */}
                <rect x="14" y="6" width="8" height="2" rx="0.5" fill="#6b7280" opacity="0.15" />
            </svg>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── WHITEBOARD — Premium wall-mounted board ────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function Whiteboard({ style }) {
    return (
        <div style={{ width: 90, height: 58, ...style }}>
            <svg viewBox="0 0 90 58" width="90" height="58" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="wb-frame" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#9ca3af" />
                        <stop offset="100%" stopColor="#6b7280" />
                    </linearGradient>
                </defs>

                {/* Shadow */}
                <rect x="6" y="4" width="78" height="44" rx="2" fill="#000" opacity="0.04" transform="translate(2, 2)" />

                {/* Frame — metallic */}
                <rect x="3" y="1" width="84" height="48" rx="3" fill="url(#wb-frame)" />
                {/* Inner frame */}
                <rect x="5" y="3" width="80" height="44" rx="2" fill="var(--bg-elevated, #fafaf9)" stroke="var(--border-default, #d1d5db)" strokeWidth="0.5" />
                {/* Board surface */}
                <rect x="6" y="4" width="78" height="42" rx="1.5" fill="#fafaf9" />
                {/* Surface reflection */}
                <rect x="6" y="4" width="78" height="10" rx="1.5" fill="white" opacity="0.08" />

                {/* Content */}
                <g opacity="0.6">
                    {/* Title */}
                    <rect x="10" y="8" width="22" height="3.5" rx="1" fill="#6366f1" />
                    <rect x="10" y="8" width="22" height="1" rx="0.5" fill="white" opacity="0.15" />
                    {/* Text lines */}
                    <rect x="10" y="14" width="16" height="2" rx="0.5" fill="#94a3b8" />
                    <rect x="10" y="18" width="20" height="2" rx="0.5" fill="#94a3b8" />
                    <rect x="10" y="22" width="12" height="2" rx="0.5" fill="#94a3b8" />
                    <rect x="10" y="26" width="18" height="2" rx="0.5" fill="#94a3b8" opacity="0.5" />

                    {/* Checkbox items */}
                    <rect x="10" y="31" width="2" height="2" rx="0.3" fill="none" stroke="#22c55e" strokeWidth="0.5" />
                    <path d="M10.5 32 L11 32.5 L12 31.2" fill="none" stroke="#22c55e" strokeWidth="0.4" />
                    <rect x="14" y="31" width="10" height="2" rx="0.5" fill="#94a3b8" />
                    <rect x="10" y="35" width="2" height="2" rx="0.3" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
                    <rect x="14" y="35" width="14" height="2" rx="0.5" fill="#94a3b8" />

                    {/* Sticky notes */}
                    <g>
                        <rect x="42" y="8" width="14" height="14" rx="1.5" fill="#fbbf24" opacity="0.75" />
                        <rect x="43" y="9" width="12" height="1" rx="0.3" fill="#92400e" opacity="0.2" />
                        <rect x="43" y="11" width="8" height="1" rx="0.3" fill="#92400e" opacity="0.15" />
                        {/* Pin */}
                        <circle cx="49" cy="7.5" r="1.5" fill="#ef4444" />
                        <circle cx="49" cy="7" r="0.5" fill="white" opacity="0.4" />
                    </g>
                    <g>
                        <rect x="60" y="8" width="14" height="14" rx="1.5" fill="#a78bfa" opacity="0.7" />
                        <rect x="61" y="9" width="10" height="1" rx="0.3" fill="#4c1d95" opacity="0.15" />
                        <rect x="61" y="11" width="6" height="1" rx="0.3" fill="#4c1d95" opacity="0.1" />
                        <circle cx="67" cy="7.5" r="1.5" fill="#3b82f6" />
                        <circle cx="67" cy="7" r="0.5" fill="white" opacity="0.4" />
                    </g>
                    <g>
                        <rect x="42" y="26" width="14" height="14" rx="1.5" fill="#86efac" opacity="0.65" />
                        <rect x="43" y="27" width="10" height="1" rx="0.3" fill="#14532d" opacity="0.15" />
                        <circle cx="49" cy="25.5" r="1.5" fill="#22c55e" />
                        <circle cx="49" cy="25" r="0.5" fill="white" opacity="0.4" />
                    </g>
                    <g>
                        <rect x="60" y="26" width="14" height="14" rx="1.5" fill="#fca5a5" opacity="0.6" />
                        <rect x="61" y="27" width="8" height="1" rx="0.3" fill="#7f1d1d" opacity="0.15" />
                        <circle cx="67" cy="25.5" r="1.5" fill="#f97316" />
                        <circle cx="67" cy="25" r="0.5" fill="white" opacity="0.4" />
                    </g>

                    {/* Arrow connecting notes */}
                    <path d="M56 15 L58 15" fill="none" stroke="#94a3b8" strokeWidth="0.5" markerEnd="url(#arrowhead)" />
                </g>

                {/* Marker tray */}
                <rect x="22" y="49" width="46" height="5" rx="1.5" fill="var(--border-default, #9ca3af)" />
                <rect x="23" y="49.5" width="44" height="2" rx="0.5" fill="var(--bg-elevated, #e5e7eb)" opacity="0.3" />
                {/* Markers */}
                <rect x="32" y="50" width="10" height="2.5" rx="1" fill="#ef4444" opacity="0.7" />
                <rect x="44" y="50" width="10" height="2.5" rx="1" fill="#3b82f6" opacity="0.7" />
                <rect x="56" y="50" width="6" height="2.5" rx="1" fill="#22c55e" opacity="0.6" />
                {/* Eraser */}
                <rect x="26" y="50" width="5" height="3" rx="0.5" fill="#9ca3af" opacity="0.5" />
            </svg>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── BOOKSHELF — Wall-mounted bookshelf ─────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function Bookshelf({ style }) {
    return (
        <div style={{ width: 50, height: 50, ...style }}>
            <svg viewBox="0 0 50 50" width="50" height="50" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="shelf-wood" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#deb887" />
                        <stop offset="100%" stopColor="#c9956e" />
                    </linearGradient>
                </defs>

                {/* Frame */}
                <rect x="2" y="2" width="46" height="46" rx="2" fill="url(#shelf-wood)" stroke="#a07050" strokeWidth="0.8" />

                {/* Shelves */}
                <rect x="4" y="16" width="42" height="2" rx="0.5" fill="#b8845a" />
                <rect x="4" y="32" width="42" height="2" rx="0.5" fill="#b8845a" />

                {/* Top shelf books */}
                <g>
                    <rect x="6" y="5" width="5" height="11" rx="0.5" fill="#6366f1" />
                    <rect x="12" y="4" width="4" height="12" rx="0.5" fill="#ef4444" />
                    <rect x="17" y="6" width="5" height="10" rx="0.5" fill="#22c55e" />
                    <rect x="23" y="5" width="4" height="11" rx="0.5" fill="#f59e0b" />
                    <rect x="28" y="3" width="5" height="13" rx="0.5" fill="#a78bfa" />
                    <rect x="34" y="5" width="4" height="11" rx="0.5" fill="#06b6d4" />
                    <rect x="39" y="6" width="5" height="10" rx="0.5" fill="#f87171" />
                </g>

                {/* Middle shelf books */}
                <g>
                    <rect x="6" y="19" width="6" height="13" rx="0.5" fill="#3b82f6" />
                    <rect x="13" y="20" width="4" height="12" rx="0.5" fill="#fbbf24" />
                    <rect x="18" y="19" width="5" height="13" rx="0.5" fill="#ec4899" />
                    <rect x="24" y="21" width="4" height="11" rx="0.5" fill="#14b8a6" />
                    {/* Leaning book */}
                    <rect x="30" y="21" width="5" height="11" rx="0.5" fill="#8b5cf6" transform="rotate(-8, 32, 32)" />
                    {/* Small plant */}
                    <circle cx="42" cy="28" r="3" fill="#4ade80" opacity="0.5" />
                    <rect x="41" y="28" width="2" height="4" rx="0.5" fill="#92400e" opacity="0.4" />
                </g>

                {/* Bottom shelf — box & trophy */}
                <g>
                    <rect x="6" y="35" width="8" height="11" rx="1" fill="#d6d3d1" opacity="0.5" />
                    <rect x="16" y="37" width="5" height="9" rx="0.5" fill="#78716c" />
                    <rect x="22" y="36" width="4" height="10" rx="0.5" fill="#0ea5e9" />
                    <rect x="27" y="38" width="6" height="8" rx="0.5" fill="#e879f9" />
                    {/* Trophy */}
                    <rect x="38" y="42" width="4" height="4" rx="0.5" fill="#fbbf24" opacity="0.6" />
                    <ellipse cx="40" cy="42" rx="3" ry="2" fill="#fbbf24" opacity="0.5" />
                </g>
            </svg>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── CLOCK — Wall clock ─────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function WallClock({ style }) {
    const now = new Date();
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const hourAngle = (hours + minutes / 60) * 30 - 90;
    const minuteAngle = minutes * 6 - 90;

    return (
        <div style={{ width: 32, height: 32, ...style }}>
            <svg viewBox="0 0 32 32" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                {/* Clock body */}
                <circle cx="16" cy="16" r="14" fill="var(--bg-elevated, white)" stroke="var(--border-default, #d1d5db)" strokeWidth="1.5" />
                <circle cx="16" cy="16" r="13" fill="white" opacity="0.05" />
                {/* Hour markers */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                    <line key={deg}
                        x1={16 + 10 * Math.cos(deg * Math.PI / 180)}
                        y1={16 + 10 * Math.sin(deg * Math.PI / 180)}
                        x2={16 + 12 * Math.cos(deg * Math.PI / 180)}
                        y2={16 + 12 * Math.sin(deg * Math.PI / 180)}
                        stroke="var(--text-muted, #9ca3af)" strokeWidth={deg % 90 === 0 ? "1.5" : "0.8"} />
                ))}
                {/* Hour hand */}
                <line x1="16" y1="16"
                    x2={16 + 7 * Math.cos(hourAngle * Math.PI / 180)}
                    y2={16 + 7 * Math.sin(hourAngle * Math.PI / 180)}
                    stroke="var(--text-primary, #1f2937)" strokeWidth="1.8" strokeLinecap="round" />
                {/* Minute hand */}
                <line x1="16" y1="16"
                    x2={16 + 10 * Math.cos(minuteAngle * Math.PI / 180)}
                    y2={16 + 10 * Math.sin(minuteAngle * Math.PI / 180)}
                    stroke="var(--text-secondary, #6b7280)" strokeWidth="1.2" strokeLinecap="round" />
                {/* Center dot */}
                <circle cx="16" cy="16" r="1.5" fill="#6366f1" />
            </svg>
        </div>
    );
}
