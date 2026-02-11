/**
 * ChibiCharacter — Premium SVG 3D clay-style chibi office worker
 * Aesthetic: Genshin Impact chibi × vinyl toy × 3D clay render
 * - Big head (3:1 ratio), soft body
 * - Large expressive anime eyes with iris gradient + double highlight
 * - Rich layered hair with shine streaks
 * - Hoodie/jacket with role badge & collar details
 * - Status-specific particle effects (sparkles, code, zzz)
 * - Soft ambient occlusion + subsurface scattering gradients
 */
import { Popover, Typography, Tag, Flex } from "antd";

const { Text } = Typography;

/* ─── Role visual configs ─────────────────────────────────────────── */
const ROLES = {
    lead: {
        hair: "#5b4a3a", hairDark: "#3e3025", hairHighlight: "#c4a882", hairShine: "#e8d5b8",
        shirt: "#5b9bd5", shirtDark: "#3d7ab8", shirtHighlight: "#b8daf5", shirtAccent: "#2563eb",
        pants: "#3a4a6b", pantsShade: "#2c3a55",
        skin: "#ffddbc", skinMid: "#f5c9a0", skinShadow: "#e8b48e", skinDeep: "#d9a07a",
        hairStyle: "classic", accessory: "crown",
        eyeColor: "#4a3728", irisLight: "#8b6b4a", irisRing: "#2d1b0e",
        badge: "star", badgeColor: "#fbbf24",
    },
    backend: {
        hair: "#1e1b3a", hairDark: "#12102a", hairHighlight: "#4a4580", hairShine: "#7b75b0",
        shirt: "#6366f1", shirtDark: "#4f46e5", shirtHighlight: "#c7d2fe", shirtAccent: "#818cf8",
        pants: "#2d2b5e", pantsShade: "#1e1c48",
        skin: "#ffd5b8", skinMid: "#f2c09e", skinShadow: "#e0ae8a", skinDeep: "#d19b78",
        hairStyle: "short", accessory: "headphones",
        eyeColor: "#2a2060", irisLight: "#6366f1", irisRing: "#1a1540",
        badge: "terminal", badgeColor: "#818cf8",
    },
    frontend: {
        hair: "#6b2f7b", hairDark: "#4a1e58", hairHighlight: "#b06cc8", hairShine: "#d9a8e8",
        shirt: "#a855f7", shirtDark: "#9333ea", shirtHighlight: "#e9d5ff", shirtAccent: "#c084fc",
        pants: "#4a3065", pantsShade: "#3a2050",
        skin: "#ffe0c4", skinMid: "#f5ccaa", skinShadow: "#e8b897", skinDeep: "#dba584",
        hairStyle: "wavy", accessory: "none",
        eyeColor: "#5a2d6e", irisLight: "#a855f7", irisRing: "#3a1550",
        badge: "palette", badgeColor: "#c084fc",
    },
    qa: {
        hair: "#2a4a2a", hairDark: "#1a351a", hairHighlight: "#5a9a5a", hairShine: "#8bc98b",
        shirt: "#22c55e", shirtDark: "#16a34a", shirtHighlight: "#bbf7d0", shirtAccent: "#4ade80",
        pants: "#2a3d3a", pantsShade: "#1e2e2a",
        skin: "#ffdcc0", skinMid: "#f5c8a5", skinShadow: "#e5b490", skinDeep: "#d5a07e",
        hairStyle: "neat", accessory: "magnifier",
        eyeColor: "#2a5a2a", irisLight: "#22c55e", irisRing: "#1a3a1a",
        badge: "bug", badgeColor: "#4ade80",
    },
    docs: {
        hair: "#4a4038", hairDark: "#352e28", hairHighlight: "#7a6e60", hairShine: "#a89888",
        shirt: "#78716c", shirtDark: "#57534e", shirtHighlight: "#d6d3d1", shirtAccent: "#a8a29e",
        pants: "#3a3632", pantsShade: "#2a2622",
        skin: "#ffe0c8", skinMid: "#f5ceb0", skinShadow: "#e8ba9a", skinDeep: "#dba888",
        hairStyle: "side", accessory: "glasses",
        eyeColor: "#3a3028", irisLight: "#78716c", irisRing: "#2a2420",
        badge: "book", badgeColor: "#a8a29e",
    },
    security: {
        hair: "#4a1515", hairDark: "#351010", hairHighlight: "#8a3a3a", hairShine: "#c06060",
        shirt: "#ef4444", shirtDark: "#dc2626", shirtHighlight: "#fecaca", shirtAccent: "#f87171",
        pants: "#3a2020", pantsShade: "#2a1515",
        skin: "#ffd8b8", skinMid: "#f0c4a0", skinShadow: "#e0b08c", skinDeep: "#d09e7a",
        hairStyle: "buzz", accessory: "shield",
        eyeColor: "#5a1818", irisLight: "#ef4444", irisRing: "#3a1010",
        badge: "lock", badgeColor: "#f87171",
    },
    custom: {
        hair: "#2a3a4a", hairDark: "#1a2a3a", hairHighlight: "#5a7a9a", hairShine: "#8ab0d0",
        shirt: "#06b6d4", shirtDark: "#0891b2", shirtHighlight: "#a5f3fc", shirtAccent: "#22d3ee",
        pants: "#2a3540", pantsShade: "#1e2830",
        skin: "#ffddc4", skinMid: "#f5caaa", skinShadow: "#e5b695", skinDeep: "#d5a482",
        hairStyle: "short", accessory: "none",
        eyeColor: "#2a4a5a", irisLight: "#06b6d4", irisRing: "#1a2a3a",
        badge: "code", badgeColor: "#22d3ee",
    },
};

const STATUS_LABELS = {
    idle: "Idle", in_progress: "Working...", blocked: "Coffee break",
    review: "Reviewing", done: "Done!", failed: "Error",
};

const STATUS_TAG_COLORS = {
    idle: "default", in_progress: "processing", blocked: "warning",
    review: "purple", done: "success", failed: "error",
};

const WALK_CLASSES = ["chibi-walk-1", "chibi-walk-2", "chibi-walk-3", "chibi-walk-4"];

/* ─── Hair renderers ──────────────────────────────────────────────── */
function renderHair(style, role, id) {
    const { hair, hairDark, hairHighlight, hairShine } = role;
    const common = (
        <>
            {/* Hair shine streak */}
            <ellipse cx="36" cy="8" rx="8" ry="3" fill={hairShine} opacity="0.35" />
            {/* Secondary shine */}
            <ellipse cx="44" cy="11" rx="4" ry="2" fill={hairShine} opacity="0.15" />
        </>
    );

    switch (style) {
        case "classic":
            return (
                <g>
                    {/* Main hair dome */}
                    <ellipse cx="40" cy="17" rx="21" ry="16" fill={`url(#hair-${id})`} />
                    {/* Top volume - multi-layer */}
                    <ellipse cx="40" cy="9" rx="15" ry="10" fill={hair} />
                    <ellipse cx="38" cy="7" rx="10" ry="7" fill={hairHighlight} opacity="0.15" />
                    {/* Fringe bangs */}
                    <path d="M22 20 Q28 8 34 10 Q38 6 42 10 Q46 6 50 10 Q56 8 58 20"
                        fill={hairDark} opacity="0.5" />
                    {/* Individual bang strands */}
                    <path d="M28 18 Q30 10 34 12" fill="none" stroke={hairHighlight} strokeWidth="1" opacity="0.3" />
                    <path d="M46 12 Q50 10 52 18" fill="none" stroke={hairHighlight} strokeWidth="1" opacity="0.3" />
                    {common}
                </g>
            );
        case "wavy":
            return (
                <g>
                    <ellipse cx="40" cy="17" rx="22" ry="15" fill={`url(#hair-${id})`} />
                    {/* Wavy volume bumps */}
                    <circle cx="25" cy="14" r="7" fill={hair} opacity="0.9" />
                    <circle cx="55" cy="14" r="7" fill={hair} opacity="0.9" />
                    <circle cx="40" cy="7" r="8" fill={hair} />
                    <circle cx="32" cy="9" r="5" fill={hairHighlight} opacity="0.2" />
                    {/* Flowing fringe */}
                    <path d="M20 22 Q25 6 34 10 Q38 4 44 8 Q50 4 55 10 Q60 6 62 22" fill={hair} />
                    {/* Side hair strands flowing down */}
                    <path d="M20 22 Q18 30 20 38" fill="none" stroke={hair} strokeWidth="4" strokeLinecap="round" opacity="0.6" />
                    <path d="M60 22 Q62 30 60 38" fill="none" stroke={hair} strokeWidth="4" strokeLinecap="round" opacity="0.6" />
                    {/* Wavy strand highlights */}
                    <path d="M22 24 Q20 30 22 36" fill="none" stroke={hairHighlight} strokeWidth="1" opacity="0.25" />
                    <path d="M58 24 Q60 30 58 36" fill="none" stroke={hairHighlight} strokeWidth="1" opacity="0.25" />
                    {common}
                </g>
            );
        case "neat":
            return (
                <g>
                    <ellipse cx="40" cy="18" rx="20" ry="14" fill={`url(#hair-${id})`} />
                    <path d="M21 22 Q28 8 40 10 Q52 8 59 22" fill={hair} />
                    {/* Clean side part line */}
                    <path d="M32 8 Q36 6 42 10" fill="none" stroke={hairDark} strokeWidth="1" opacity="0.3" />
                    {/* Combed-back look */}
                    <path d="M26 14 Q32 10 40 12" fill="none" stroke={hairHighlight} strokeWidth="0.8" opacity="0.2" />
                    <path d="M40 12 Q48 10 54 14" fill="none" stroke={hairHighlight} strokeWidth="0.8" opacity="0.15" />
                    {common}
                </g>
            );
        case "side":
            return (
                <g>
                    <ellipse cx="40" cy="18" rx="20" ry="14" fill={`url(#hair-${id})`} />
                    <path d="M21 22 Q28 10 40 10 Q52 10 59 22" fill={hair} />
                    {/* Side sweep bangs */}
                    <path d="M21 16 Q24 6 38 12 L21 24 Z" fill={hairDark} opacity="0.4" />
                    {/* Long side strand */}
                    <path d="M18 20 Q16 30 19 40" fill="none" stroke={hair} strokeWidth="5" strokeLinecap="round" opacity="0.7" />
                    <path d="M19 22 Q17 30 20 38" fill="none" stroke={hairHighlight} strokeWidth="1" opacity="0.25" />
                    {common}
                </g>
            );
        case "buzz":
            return (
                <g>
                    <ellipse cx="40" cy="19" rx="19" ry="13" fill={`url(#hair-${id})`} />
                    <path d="M22 24 Q28 12 40 12 Q52 12 58 24" fill={hair} opacity="0.7" />
                    {/* Buzz texture dots */}
                    <g opacity="0.12">
                        {[28, 32, 36, 40, 44, 48, 52].map(x =>
                            [14, 17, 20].map(y =>
                                <circle key={`${x}-${y}`} cx={x} cy={y} r="0.6" fill={hairHighlight} />
                            )
                        )}
                    </g>
                    <ellipse cx="37" cy="13" rx="5" ry="3" fill={hairShine} opacity="0.15" />
                </g>
            );
        default: // short
            return (
                <g>
                    <ellipse cx="40" cy="17" rx="20" ry="14" fill={`url(#hair-${id})`} />
                    <path d="M22 22 Q30 8 40 10 Q50 8 58 22" fill={hair} />
                    {/* Spiky front */}
                    <path d="M30 16 Q32 8 36 14" fill={hairDark} opacity="0.25" />
                    <path d="M44 14 Q48 8 50 16" fill={hairDark} opacity="0.25" />
                    {common}
                </g>
            );
    }
}

/* ─── Accessory renderers ─────────────────────────────────────────── */
function renderAccessory(type, role) {
    switch (type) {
        case "crown":
            return (
                <g className="chibi-accessory">
                    {/* Crown base */}
                    <rect x="29" y="3" width="22" height="3" rx="1" fill="#e8a810" />
                    {/* Crown spikes */}
                    <polygon points="29,3 32,-4 35,1 38,-5 41,0 44,-5 47,1 50,-4 51,3"
                        fill="#fbbf24" stroke="#e8a810" strokeWidth="0.5" />
                    {/* Gems */}
                    <circle cx="35" cy="-1" r="1.5" fill="#ef4444" />
                    <ellipse cx="35" cy="-1.5" rx="0.8" ry="0.5" fill="white" opacity="0.4" />
                    <circle cx="41" cy="-2.5" r="1.8" fill="#3b82f6" />
                    <ellipse cx="41" cy="-3" rx="0.9" ry="0.5" fill="white" opacity="0.4" />
                    <circle cx="47" cy="-1" r="1.5" fill="#22c55e" />
                    <ellipse cx="47" cy="-1.5" rx="0.8" ry="0.5" fill="white" opacity="0.4" />
                    {/* Crown shine */}
                    <polygon points="29,3 32,-4 35,1 38,-5 41,0 44,-5 47,1 50,-4 51,3"
                        fill="url(#crown-shine)" opacity="0.25" />
                </g>
            );
        case "glasses":
            return (
                <g className="chibi-accessory">
                    {/* Frame - rounder, thicker */}
                    <circle cx="33" cy="27" r="6" fill="none" stroke="#444" strokeWidth="1.8" />
                    <circle cx="47" cy="27" r="6" fill="none" stroke="#444" strokeWidth="1.8" />
                    {/* Bridge */}
                    <path d="M39 27 Q40 25.5 41 27" fill="none" stroke="#444" strokeWidth="1.4" />
                    {/* Temple arms */}
                    <line x1="21" y1="26" x2="27" y2="27" stroke="#444" strokeWidth="1.2" />
                    <line x1="59" y1="26" x2="53" y2="27" stroke="#444" strokeWidth="1.2" />
                    {/* Lens tint */}
                    <circle cx="33" cy="27" r="5.2" fill="rgba(147,197,253,0.1)" />
                    <circle cx="47" cy="27" r="5.2" fill="rgba(147,197,253,0.1)" />
                    {/* Lens reflection */}
                    <ellipse cx="31" cy="25" rx="2.5" ry="1.8" fill="white" opacity="0.18" />
                    <ellipse cx="45" cy="25" rx="2.5" ry="1.8" fill="white" opacity="0.18" />
                </g>
            );
        case "headphones":
            return (
                <g className="chibi-accessory">
                    {/* Headband */}
                    <path d="M18 22 Q18 4 40 4 Q62 4 62 22" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M18 22 Q18 4.5 40 4.5 Q62 4.5 62 22" fill="none" stroke="#555" strokeWidth="1" opacity="0.4" />
                    {/* Left ear cup */}
                    <rect x="13" y="20" width="10" height="14" rx="5" fill="#333" />
                    <rect x="14" y="22" width="8" height="10" rx="4" fill="#444" />
                    <ellipse cx="18" cy="27" rx="2.5" ry="3" fill="#555" opacity="0.3" />
                    {/* Right ear cup */}
                    <rect x="57" y="20" width="10" height="14" rx="5" fill="#333" />
                    <rect x="58" y="22" width="8" height="10" rx="4" fill="#444" />
                    <ellipse cx="62" cy="27" rx="2.5" ry="3" fill="#555" opacity="0.3" />
                    {/* LED accent on cups */}
                    <circle cx="18" cy="27" r="1" fill={role.shirtAccent} opacity="0.6">
                        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="62" cy="27" r="1" fill={role.shirtAccent} opacity="0.6">
                        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
                    </circle>
                </g>
            );
        case "magnifier":
            return (
                <g className="chibi-accessory chibi-magnifier">
                    <circle cx="60" cy="22" r="7" fill="none" stroke="#555" strokeWidth="2" />
                    <circle cx="60" cy="22" r="6" fill="rgba(167,243,208,0.08)" />
                    <line x1="65" y1="27.5" x2="69" y2="32" stroke="#555" strokeWidth="2.2" strokeLinecap="round" />
                    {/* Lens reflection */}
                    <ellipse cx="58" cy="20" rx="2.5" ry="2" fill="white" opacity="0.2" />
                    {/* Green tint */}
                    <circle cx="60" cy="22" r="5.5" fill={role.shirtAccent} opacity="0.06" />
                </g>
            );
        case "shield":
            return (
                <g className="chibi-accessory">
                    <path d="M60 18 L68 21 L68 28 Q68 35 60 38 Q52 35 52 28 L52 21 Z"
                        fill={role.shirtHighlight} fillOpacity="0.2" stroke={role.shirt} strokeWidth="1.5" />
                    {/* Shield cross */}
                    <path d="M60 22 L60 34" stroke={role.shirt} strokeWidth="1" opacity="0.4" />
                    <path d="M54 27 L66 27" stroke={role.shirt} strokeWidth="1" opacity="0.4" />
                    {/* Shield shine */}
                    <path d="M55 22 L60 21 L60 26 Q57 25 55 22 Z" fill="white" opacity="0.1" />
                </g>
            );
        default:
            return null;
    }
}

/* ─── Role badge on shirt ─────────────────────────────────────────── */
function renderBadge(badge, color) {
    const cx = 40, cy = 54;
    switch (badge) {
        case "star":
            return (
                <g opacity="0.7">
                    <polygon points={`${cx},${cy - 3} ${cx + 1.2},${cy - 0.8} ${cx + 3.2},${cy - 0.5} ${cx + 1.8},${cy + 1} ${cx + 2.2},${cy + 3.2} ${cx},${cy + 2} ${cx - 2.2},${cy + 3.2} ${cx - 1.8},${cy + 1} ${cx - 3.2},${cy - 0.5} ${cx - 1.2},${cy - 0.8}`}
                        fill={color} />
                </g>
            );
        case "terminal":
            return (
                <g opacity="0.6">
                    <text x={cx} y={cy + 2} textAnchor="middle" fontSize="7" fontFamily="monospace" fontWeight="700" fill={color}>&gt;_</text>
                </g>
            );
        case "palette":
            return (
                <g opacity="0.6">
                    <circle cx={cx - 1} cy={cy - 1} r="1.2" fill="#f87171" />
                    <circle cx={cx + 1.5} cy={cy - 1.5} r="1.2" fill="#fbbf24" />
                    <circle cx={cx + 0.5} cy={cy + 1} r="1.2" fill="#22d3ee" />
                </g>
            );
        case "bug":
            return (
                <g opacity="0.55">
                    <text x={cx} y={cy + 2.5} textAnchor="middle" fontSize="8" fill={color}>&#x1F41B;</text>
                </g>
            );
        case "book":
            return (
                <g opacity="0.5">
                    <rect x={cx - 3} y={cy - 2.5} width="6" height="5" rx="0.5" fill={color} />
                    <line x1={cx} y1={cy - 2.5} x2={cx} y2={cy + 2.5} stroke="white" strokeWidth="0.5" opacity="0.4" />
                </g>
            );
        case "lock":
            return (
                <g opacity="0.6">
                    <rect x={cx - 2.5} y={cy - 0.5} width="5" height="4" rx="1" fill={color} />
                    <path d={`M${cx - 1.5} ${cy - 0.5} L${cx - 1.5} ${cy - 2} Q${cx} ${cy - 4} ${cx + 1.5} ${cy - 2} L${cx + 1.5} ${cy - 0.5}`}
                        fill="none" stroke={color} strokeWidth="1.2" />
                </g>
            );
        case "code":
            return (
                <g opacity="0.55">
                    <text x={cx} y={cy + 2} textAnchor="middle" fontSize="6" fontFamily="monospace" fontWeight="700" fill={color}>&lt;/&gt;</text>
                </g>
            );
        default:
            return null;
    }
}

/* ─── Eye expressions — Large anime style ─────────────────────────── */
function renderEyes(status, role, id) {
    const { eyeColor, irisLight, irisRing } = role;

    switch (status) {
        case "done":
            return (
                <g className="chibi-eyes-group">
                    {/* Happy squint — thick arc */}
                    <path d="M28 27 Q33 22 38 27" fill="none" stroke={eyeColor} strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M42 27 Q47 22 52 27" fill="none" stroke={eyeColor} strokeWidth="2.5" strokeLinecap="round" />
                    {/* Sparkle dots below eyes */}
                    <circle cx="29" cy="29" r="0.8" fill={irisLight} opacity="0.5" />
                    <circle cx="51" cy="29" r="0.8" fill={irisLight} opacity="0.5" />
                </g>
            );
        case "failed":
            return (
                <g className="chibi-eyes-group">
                    {/* X eyes */}
                    <g>
                        <line x1="30" y1="24" x2="36" y2="30" stroke={eyeColor} strokeWidth="2.2" strokeLinecap="round" />
                        <line x1="36" y1="24" x2="30" y2="30" stroke={eyeColor} strokeWidth="2.2" strokeLinecap="round" />
                    </g>
                    <g>
                        <line x1="44" y1="24" x2="50" y2="30" stroke={eyeColor} strokeWidth="2.2" strokeLinecap="round" />
                        <line x1="50" y1="24" x2="44" y2="30" stroke={eyeColor} strokeWidth="2.2" strokeLinecap="round" />
                    </g>
                </g>
            );
        case "blocked":
            return (
                <g className="chibi-eyes-group">
                    {/* Sleepy half-closed with droopy lid */}
                    <ellipse cx="33" cy="27" rx="4" ry="2" fill={eyeColor} opacity="0.7" />
                    <rect x="28" y="23" width="10" height="5" fill={`url(#skin-${id})`} />
                    <ellipse cx="47" cy="27" rx="4" ry="2" fill={eyeColor} opacity="0.7" />
                    <rect x="42" y="23" width="10" height="5" fill={`url(#skin-${id})`} />
                </g>
            );
        default: {
            // Big anime eyes with iris gradient + double highlight + pupil
            return (
                <g className="chibi-eyes-group">
                    {/* Left eye */}
                    <g>
                        {/* White sclera */}
                        <ellipse cx="33" cy="27" rx="5" ry="5.5" fill="white" />
                        <ellipse cx="33" cy="27" rx="5" ry="5.5" fill="white" opacity="0.3" />
                        {/* Iris gradient */}
                        <ellipse cx="33" cy="27.5" rx="3.8" ry="4.2" fill={`url(#iris-${id})`} />
                        {/* Iris ring */}
                        <ellipse cx="33" cy="27.5" rx="3.8" ry="4.2" fill="none" stroke={irisRing} strokeWidth="0.5" opacity="0.4" />
                        {/* Pupil */}
                        <ellipse cx="33" cy="28" rx="1.8" ry="2.2" fill={irisRing} />
                        {/* Main highlight — top right */}
                        <ellipse cx="35" cy="25.5" rx="1.8" ry="2" fill="white" opacity="0.95" />
                        {/* Secondary highlight — bottom left */}
                        <circle cx="31.5" cy="29.5" r="1" fill="white" opacity="0.5" />
                        {/* Subtle rim light */}
                        <ellipse cx="33" cy="24" rx="3" ry="1" fill="white" opacity="0.08" />
                    </g>
                    {/* Right eye */}
                    <g>
                        <ellipse cx="47" cy="27" rx="5" ry="5.5" fill="white" />
                        <ellipse cx="47" cy="27" rx="5" ry="5.5" fill="white" opacity="0.3" />
                        <ellipse cx="47" cy="27.5" rx="3.8" ry="4.2" fill={`url(#iris-${id})`} />
                        <ellipse cx="47" cy="27.5" rx="3.8" ry="4.2" fill="none" stroke={irisRing} strokeWidth="0.5" opacity="0.4" />
                        <ellipse cx="47" cy="28" rx="1.8" ry="2.2" fill={irisRing} />
                        <ellipse cx="49" cy="25.5" rx="1.8" ry="2" fill="white" opacity="0.95" />
                        <circle cx="45.5" cy="29.5" r="1" fill="white" opacity="0.5" />
                        <ellipse cx="47" cy="24" rx="3" ry="1" fill="white" opacity="0.08" />
                    </g>
                </g>
            );
        }
    }
}

/* ─── Eyebrows ────────────────────────────────────────────────────── */
function renderEyebrows(status, eyeColor) {
    switch (status) {
        case "failed":
            return (
                <g>
                    {/* Angry brows */}
                    <path d="M28 20 L38 23" fill="none" stroke={eyeColor} strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
                    <path d="M52 20 L42 23" fill="none" stroke={eyeColor} strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
                </g>
            );
        case "in_progress":
            return (
                <g>
                    {/* Focused brows */}
                    <path d="M28 21 Q33 18.5 38 21" fill="none" stroke={eyeColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                    <path d="M42 21 Q47 18.5 52 21" fill="none" stroke={eyeColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                </g>
            );
        case "blocked":
            return (
                <g>
                    {/* Worried tilted brows */}
                    <path d="M29 21 Q33 22 37 21.5" fill="none" stroke={eyeColor} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
                    <path d="M43 21.5 Q47 22 51 21" fill="none" stroke={eyeColor} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
                </g>
            );
        default:
            return (
                <g>
                    <path d="M28 21 Q33 19 38 21" fill="none" stroke={eyeColor} strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
                    <path d="M42 21 Q47 19 52 21" fill="none" stroke={eyeColor} strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
                </g>
            );
    }
}

/* ─── Mouth expressions ───────────────────────────────────────────── */
function renderMouth(status) {
    switch (status) {
        case "done":
            return (
                <g>
                    {/* Big cat-smile */}
                    <path d="M33 34 Q37 39 40 38 Q43 39 47 34" fill="#d4956a" stroke="#c4856a" strokeWidth="0.5" />
                    {/* Teeth peek */}
                    <path d="M35 34 Q40 36 45 34" fill="white" opacity="0.85" />
                    {/* Tongue hint */}
                    <ellipse cx="40" cy="36.5" rx="2.5" ry="1.5" fill="#e88080" opacity="0.5" />
                </g>
            );
        case "failed":
            return (
                <g>
                    <path d="M35 37 Q40 33 45 37" fill="none" stroke="#c4956a" strokeWidth="2" strokeLinecap="round" />
                    {/* Wobble line */}
                    <path d="M36 37.5 Q38 36 40 37 Q42 36 44 37.5" fill="none" stroke="#c4956a" strokeWidth="0.6" opacity="0.3" />
                </g>
            );
        case "blocked":
            return (
                <g>
                    {/* Yawn / open mouth */}
                    <ellipse cx="40" cy="35" rx="3" ry="3.5" fill="#c4956a" />
                    <ellipse cx="40" cy="34" rx="2" ry="1.5" fill="#a87a5a" opacity="0.3" />
                    {/* Tongue */}
                    <ellipse cx="40" cy="36.5" rx="1.5" ry="1" fill="#e88080" opacity="0.4" />
                </g>
            );
        case "in_progress":
            return (
                <g>
                    {/* Determined small smile */}
                    <path d="M36 34 Q40 37 44 34" fill="none" stroke="#c4956a" strokeWidth="1.6" strokeLinecap="round" />
                </g>
            );
        case "review":
            return (
                <g>
                    {/* Hmm pursed lip */}
                    <path d="M37 35 Q40 34 43 35" fill="none" stroke="#c4956a" strokeWidth="1.4" strokeLinecap="round" />
                    <circle cx="44" cy="34.5" r="0.5" fill="#c4956a" opacity="0.4" />
                </g>
            );
        default:
            return (
                <g>
                    {/* Gentle smile */}
                    <path d="M36 34 Q40 38 44 34" fill="none" stroke="#c4956a" strokeWidth="1.5" strokeLinecap="round" />
                </g>
            );
    }
}

/* ─── Blush ───────────────────────────────────────────────────────── */
function renderBlush(status) {
    if (status === "failed") return null;
    const strong = status === "done" || status === "blocked";
    return (
        <g opacity={strong ? "0.5" : "0.25"}>
            <ellipse cx="26" cy="31" rx="4.5" ry="2.5" fill="#fca5c0" />
            <ellipse cx="54" cy="31" rx="4.5" ry="2.5" fill="#fca5c0" />
            {/* Blush shine */}
            <ellipse cx="25" cy="30.5" rx="1.5" ry="1" fill="white" opacity="0.15" />
            <ellipse cx="53" cy="30.5" rx="1.5" ry="1" fill="white" opacity="0.15" />
        </g>
    );
}

/* ─── Coffee cup for blocked ──────────────────────────────────────── */
function CoffeeCup() {
    return (
        <g className="chibi-coffee-cup">
            {/* Cup body */}
            <rect x="58" y="42" width="12" height="14" rx="3" fill="#f5f0eb" stroke="#ddd4cc" strokeWidth="0.8" />
            {/* Handle */}
            <path d="M70 46 Q75 46 75 50 Q75 54 70 54" fill="none" stroke="#ddd4cc" strokeWidth="1" />
            {/* Coffee */}
            <rect x="60" y="44" width="8" height="4" rx="2" fill="#6f4e37" opacity="0.8" />
            {/* Coffee shine */}
            <ellipse cx="63" cy="45" rx="2" ry="0.8" fill="#a0744e" opacity="0.4" />
            {/* Heart on cup */}
            <path d="M63 50 Q63 48 64 48 Q65 48 65 49.5 L64 51 L63 49.5 Q63 48 63 50" fill="#ef4444" opacity="0.3" />
            {/* Steam */}
            <g className="coffee-steam-svg">
                <path d="M62 40 Q63 36 62 32" fill="none" stroke="#d6d3d1" strokeWidth="0.8" opacity="0.5" strokeLinecap="round" />
                <path d="M65 40 Q66 35 65 31" fill="none" stroke="#d6d3d1" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
                <path d="M68 41 Q69 37 68 33" fill="none" stroke="#d6d3d1" strokeWidth="0.6" opacity="0.3" strokeLinecap="round" />
            </g>
        </g>
    );
}

/* ─── Emotion Bubble — Animated emoji thought system ──────────────── */
const EMOTION_MAP = {
    idle: { emoji: "🎧", text: "relaxing...", altEmojis: ["☕", "💭", "🎮", "🎵"] },
    in_progress: { emoji: "💻", text: "coding...", altEmojis: ["⌨️", "🔧", "⚡", "🧠"] },
    review: { emoji: "🔍", text: "hmm...", altEmojis: ["🤔", "📝", "👀", "📋"] },
    done: { emoji: "🎉", text: "yay!", altEmojis: ["✅", "🏆", "⭐", "🥳"] },
    blocked: { emoji: "💤", text: "zzz...", altEmojis: ["☕", "😴", "🛋️"] },
    failed: { emoji: "💢", text: "bug!", altEmojis: ["❌", "🐛", "😤", "🔥"] },
};

function EmotionBubble({ status }) {
    const emotion = EMOTION_MAP[status] || EMOTION_MAP.idle;
    return (
        <g className="chibi-emotion-bubble">
            {/* Trail dots — connecting head to bubble */}
            <circle cx="24" cy="10" r="2.5" fill="var(--bg-elevated)" stroke="var(--border-subtle)" strokeWidth="0.6"
                className="chibi-emotion-trail-1" />
            <circle cx="19" cy="4" r="2" fill="var(--bg-elevated)" stroke="var(--border-subtle)" strokeWidth="0.6"
                className="chibi-emotion-trail-2" />
            <circle cx="14" cy="-1" r="1.5" fill="var(--bg-elevated)" stroke="var(--border-subtle)" strokeWidth="0.6"
                className="chibi-emotion-trail-3" />

            {/* Main bubble — pill shape */}
            <rect x="16" y="-18" width="52" height="22" rx="11"
                fill="var(--bg-elevated)" stroke="var(--border-subtle)" strokeWidth="0.8" />
            {/* Bubble inner glow */}
            <rect x="20" y="-15" width="18" height="5" rx="2.5"
                fill="white" opacity="0.06" />

            {/* Emoji — bouncing independently */}
            <text x="30" y="-3" textAnchor="middle" fontSize="11"
                className="chibi-emotion-emoji" dominantBaseline="central">
                {emotion.emoji}
            </text>

            {/* Thought text */}
            <text x="52" y="-4" textAnchor="middle" fontSize="7"
                fontFamily="'JetBrains Mono', monospace" fontWeight="500"
                fill="var(--text-secondary)" dominantBaseline="central">
                {emotion.text}
            </text>
        </g>
    );
}

/* ─── Sparkle effect for done ─────────────────────────────────────── */
function SparkleEffect() {
    return (
        <g className="chibi-sparkles">
            {/* Star sparkles around character */}
            <g className="chibi-sparkle-1">
                <polygon points="8,10 9.5,7 11,10 9.5,12" fill="#fbbf24" opacity="0.8" />
                <polygon points="9.5,7 8.5,9 10.5,9" fill="white" opacity="0.4" />
            </g>
            <g className="chibi-sparkle-2">
                <polygon points="68,8 69.5,5 71,8 69.5,10" fill="#f472b6" opacity="0.7" />
            </g>
            <g className="chibi-sparkle-3">
                <polygon points="14,40 15.5,37 17,40 15.5,42" fill="#22d3ee" opacity="0.6" />
            </g>
            <g className="chibi-sparkle-4">
                <circle cx="66" cy="38" r="1.5" fill="#a78bfa" opacity="0.5" />
            </g>
        </g>
    );
}

/* ─── ZZZ for blocked ─────────────────────────────────────────────── */
function ZzzEffect() {
    return (
        <g className="chibi-zzz">
            <text x="12" y="14" fontSize="8" fontWeight="700" fill="var(--text-muted)" opacity="0.6" className="chibi-z-1">Z</text>
            <text x="8" y="6" fontSize="6" fontWeight="700" fill="var(--text-muted)" opacity="0.4" className="chibi-z-2">z</text>
            <text x="4" y="0" fontSize="5" fontWeight="700" fill="var(--text-muted)" opacity="0.25" className="chibi-z-3">z</text>
        </g>
    );
}

/* ─── Sweat drop for failed ───────────────────────────────────────── */
function SweatDrop() {
    return (
        <g className="chibi-sweat">
            <path d="M62 16 Q63 12 64 16 Q64 18 63 18 Q62 18 62 16 Z" fill="#93c5fd" opacity="0.6" />
            <ellipse cx="63" cy="14.5" rx="0.5" ry="0.8" fill="white" opacity="0.4" />
        </g>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── MAIN COMPONENT ─────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export default function ChibiCharacter({
    agent,
    status = "idle",
    walkIndex = 0,
    walkDuration,
    walkDelay,
    style = {},
    onClick,
}) {
    const role = ROLES[agent.role] || ROLES.custom;
    const id = `chibi-${agent.id}`;
    const statusClass = `chibi-status-${status}`;
    const isWalking = status === "idle" || status === "done";
    const isBlocked = status === "blocked";
    const walkClass = isWalking ? WALK_CLASSES[walkIndex % WALK_CLASSES.length] : "";

    const charStyle = {
        ...style,
        ...(isWalking && walkDuration ? { "--walk-duration": `${walkDuration}s` } : {}),
        ...(isWalking && walkDelay ? { "--walk-delay": `${walkDelay}s` } : {}),
    };

    const popoverContent = (
        <div className="agent-popover">
            <Flex align="center" gap={8}>
                <Text strong style={{ fontSize: 13 }}>{agent.name}</Text>
                <Tag color={STATUS_TAG_COLORS[status]} style={{ margin: 0, fontSize: 10, borderRadius: 4, lineHeight: "16px" }}>
                    {STATUS_LABELS[status]}
                </Tag>
            </Flex>
            <Text className="agent-popover-role" style={{ display: "block", marginTop: 4, color: role.shirtHighlight }}>
                {agent.role}
            </Text>
        </div>
    );

    return (
        <Popover content={popoverContent} placement="top" arrow={false}>
            <div
                className={`chibi-char ${statusClass} ${walkClass}`}
                style={charStyle}
                onClick={() => onClick?.(agent)}
            >
                <svg viewBox="0 0 80 100" width="72" height="90" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        {/* Hair gradient — rich multi-stop */}
                        <radialGradient id={`hair-${id}`} cx="38%" cy="22%" r="70%">
                            <stop offset="0%" stopColor={role.hairShine} stopOpacity="0.5" />
                            <stop offset="25%" stopColor={role.hairHighlight} stopOpacity="0.7" />
                            <stop offset="55%" stopColor={role.hair} />
                            <stop offset="100%" stopColor={role.hairDark} />
                        </radialGradient>
                        {/* Skin gradient — subsurface scattering */}
                        <radialGradient id={`skin-${id}`} cx="38%" cy="30%" r="68%">
                            <stop offset="0%" stopColor={role.skin} />
                            <stop offset="40%" stopColor={role.skinMid} />
                            <stop offset="75%" stopColor={role.skinShadow} />
                            <stop offset="100%" stopColor={role.skinDeep} />
                        </radialGradient>
                        {/* Iris gradient — anime-style depth */}
                        <radialGradient id={`iris-${id}`} cx="45%" cy="35%" r="55%">
                            <stop offset="0%" stopColor={role.irisLight} />
                            <stop offset="60%" stopColor={role.eyeColor} />
                            <stop offset="100%" stopColor={role.irisRing} />
                        </radialGradient>
                        {/* Shirt gradient — richer */}
                        <linearGradient id={`shirt-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={role.shirtHighlight} stopOpacity="0.5" />
                            <stop offset="25%" stopColor={role.shirt} />
                            <stop offset="100%" stopColor={role.shirtDark} />
                        </linearGradient>
                        {/* Pants gradient */}
                        <linearGradient id={`pants-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={role.pants} />
                            <stop offset="100%" stopColor={role.pantsShade} />
                        </linearGradient>
                        {/* Face ambient light — softer */}
                        <radialGradient id={`face-light-${id}`} cx="35%" cy="28%" r="45%">
                            <stop offset="0%" stopColor="white" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="white" stopOpacity="0" />
                        </radialGradient>
                        {/* Body shadow */}
                        <filter id={`shadow-${id}`}>
                            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodOpacity="0.18" />
                        </filter>
                        {/* Crown shine */}
                        <linearGradient id="crown-shine" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="white" stopOpacity="0" />
                        </linearGradient>
                        {/* Hoodie collar gradient */}
                        <linearGradient id={`collar-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={role.shirtHighlight} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={role.shirtDark} stopOpacity="0.6" />
                        </linearGradient>
                    </defs>

                    {/* Drop shadow on ground */}
                    <ellipse cx="40" cy="96" rx="18" ry="3.5" fill="#000" opacity="0.06" />

                    <g filter={`url(#shadow-${id})`}>
                        {/* ── Legs — Rounded, chubby ────────────── */}
                        <g className="chibi-legs-group">
                            <g className="chibi-leg-l">
                                <rect x="28" y="68" width="11" height="19" rx="5.5" fill={`url(#pants-${id})`} />
                                {/* Shoe */}
                                <ellipse cx="33.5" cy="88" rx="7.5" ry="4.5" fill="#3a3a3a" />
                                <ellipse cx="33.5" cy="87" rx="7" ry="3.2" fill="#4a4a4a" />
                                {/* Shoe sole line */}
                                <ellipse cx="33.5" cy="89.5" rx="6" ry="1" fill="#2a2a2a" opacity="0.3" />
                                {/* Shoe highlight */}
                                <ellipse cx="32" cy="86" rx="3" ry="1.5" fill="white" opacity="0.08" />
                                {/* Shoe accent */}
                                <ellipse cx="33.5" cy="87.5" rx="4" ry="0.5" fill={role.shirtAccent} opacity="0.25" />
                            </g>
                            <g className="chibi-leg-r">
                                <rect x="41" y="68" width="11" height="19" rx="5.5" fill={`url(#pants-${id})`} />
                                <ellipse cx="46.5" cy="88" rx="7.5" ry="4.5" fill="#3a3a3a" />
                                <ellipse cx="46.5" cy="87" rx="7" ry="3.2" fill="#4a4a4a" />
                                <ellipse cx="46.5" cy="89.5" rx="6" ry="1" fill="#2a2a2a" opacity="0.3" />
                                <ellipse cx="45" cy="86" rx="3" ry="1.5" fill="white" opacity="0.08" />
                                <ellipse cx="46.5" cy="87.5" rx="4" ry="0.5" fill={role.shirtAccent} opacity="0.25" />
                            </g>
                        </g>

                        {/* ── Body / Hoodie — Bean shaped ────────── */}
                        <g className="chibi-body-group">
                            {/* Main body shape */}
                            <path d="M23 48 Q23 39 40 39 Q57 39 57 48 L57 72 Q57 75 40 75 Q23 75 23 72 Z"
                                fill={`url(#shirt-${id})`} />
                            {/* Hoodie 3D roundness highlight */}
                            <path d="M29 43 Q37 40 42 46" fill={role.shirtHighlight} opacity="0.2" />
                            {/* Center zipper/seam line */}
                            <line x1="40" y1="47" x2="40" y2="74" stroke={role.shirtDark} strokeWidth="0.8" opacity="0.2" />
                            {/* Hoodie collar — layered */}
                            <path d="M30 39 Q35 36 40 38 Q45 36 50 39"
                                fill="none" stroke={role.shirtHighlight} strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
                            <path d="M32 40 L40 48 L48 40" fill="none" stroke={role.shirtDark} strokeWidth="1.2" opacity="0.3" />
                            {/* Hoodie pocket */}
                            <path d="M30 60 Q40 63 50 60" fill="none" stroke={role.shirtDark} strokeWidth="0.8" opacity="0.15" />
                            {/* Bottom shade */}
                            <path d="M25 67 Q40 73 55 67 Q55 75 40 75 Q25 75 25 67 Z" fill={role.shirtDark} opacity="0.15" />
                            {/* Role badge */}
                            {renderBadge(role.badge, role.badgeColor)}
                        </g>

                        {/* ── Arms — Round sausage ────────────────── */}
                        <g className="chibi-arms-group">
                            <g className="chibi-arm-l">
                                {/* Sleeve */}
                                <rect x="14" y="43" width="12" height="22" rx="6" fill={`url(#shirt-${id})`} />
                                {/* Arm highlight */}
                                <rect x="15" y="45" width="4.5" height="10" rx="2.2" fill={role.shirtHighlight} opacity="0.15" />
                                {/* Sleeve cuff */}
                                <ellipse cx="20" cy="63" rx="6" ry="2.5" fill={role.shirtDark} opacity="0.2" />
                                {/* Hand — round, plump */}
                                <circle cx="20" cy="67" r="5.5" fill={`url(#skin-${id})`} />
                                {/* Hand highlight */}
                                <ellipse cx="19" cy="65.5" rx="2.2" ry="1.8" fill="white" opacity="0.1" />
                                {/* Thumb hint */}
                                <ellipse cx="24" cy="66" rx="1.8" ry="2.2" fill={role.skinMid} opacity="0.5" />
                            </g>
                            <g className="chibi-arm-r">
                                <rect x="54" y="43" width="12" height="22" rx="6" fill={`url(#shirt-${id})`} />
                                <rect x="60.5" y="45" width="4.5" height="10" rx="2.2" fill={role.shirtHighlight} opacity="0.15" />
                                <ellipse cx="60" cy="63" rx="6" ry="2.5" fill={role.shirtDark} opacity="0.2" />
                                <circle cx="60" cy="67" r="5.5" fill={`url(#skin-${id})`} />
                                <ellipse cx="59" cy="65.5" rx="2.2" ry="1.8" fill="white" opacity="0.1" />
                                <ellipse cx="56" cy="66" rx="1.8" ry="2.2" fill={role.skinMid} opacity="0.5" />
                            </g>
                        </g>

                        {/* ── Head — Big round, 3D clay feel ─────── */}
                        <g className="chibi-head-group">
                            {/* Face base — slightly larger */}
                            <ellipse cx="40" cy="26" rx="21" ry="20" fill={`url(#skin-${id})`} />
                            {/* Ambient light overlay */}
                            <ellipse cx="40" cy="26" rx="21" ry="20" fill={`url(#face-light-${id})`} />
                            {/* Face rim shadow (chin) */}
                            <ellipse cx="40" cy="38" rx="14" ry="5" fill={role.skinDeep} opacity="0.12" />

                            {/* Ear left — detailed */}
                            <ellipse cx="19" cy="28" rx="4.5" ry="5.5" fill={role.skinShadow} />
                            <ellipse cx="19.5" cy="28" rx="3.5" ry="4.5" fill={role.skin} />
                            <ellipse cx="19.5" cy="28" rx="1.5" ry="2.8" fill={role.skinDeep} opacity="0.2" />
                            {/* Ear right */}
                            <ellipse cx="61" cy="28" rx="4.5" ry="5.5" fill={role.skinShadow} />
                            <ellipse cx="60.5" cy="28" rx="3.5" ry="4.5" fill={role.skin} />
                            <ellipse cx="60.5" cy="28" rx="1.5" ry="2.8" fill={role.skinDeep} opacity="0.2" />

                            {/* Nose — tiny cute triangle bump */}
                            <path d="M39 31 L40 32.5 L41 31" fill={role.skinShadow} opacity="0.3" />
                            <ellipse cx="40" cy="31.5" rx="1.5" ry="0.8" fill={role.skinShadow} opacity="0.15" />

                            {/* Hair */}
                            {renderHair(role.hairStyle, role, id)}

                            {/* Eyebrows */}
                            {renderEyebrows(status, role.eyeColor)}

                            {/* Eyes */}
                            {renderEyes(status, role, id)}

                            {/* Blush */}
                            {renderBlush(status)}

                            {/* Mouth */}
                            {renderMouth(status)}
                        </g>

                        {/* ── Accessory ──────────────────────────── */}
                        {renderAccessory(role.accessory, role)}
                    </g>

                    {/* ── Status-specific effects ─────────────── */}
                    {isBlocked && <CoffeeCup />}
                    {isBlocked && <ZzzEffect />}
                    <EmotionBubble status={status} />
                    {status === "done" && <SparkleEffect />}
                    {status === "failed" && <SweatDrop />}
                </svg>

                {/* Name tag */}
                <div className="chibi-name-tag">{agent.name}</div>

                {/* Status dot */}
                <div className={`chibi-status-badge status-${status}`} />
            </div>
        </Popover>
    );
}
