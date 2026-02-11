/**
 * ChibiAgent — Theme-aware animated chibi
 */
import { Tooltip, Typography } from "antd";

const { Text } = Typography;

export default function ChibiAgent({ agent, status = "idle" }) {
    const emoji = ROLE_EMOJIS[agent.role] || "🤖";
    const animClass = STATUS_ANIMATIONS[status] || "";
    const meta = STATUS_META[status] || STATUS_META.idle;

    return (
        <Tooltip title={`${agent.name} — ${agent.role} (${meta.label})`} placement="top">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <div
                    className={animClass}
                    style={{
                        position: "relative",
                        width: 52, height: 52, borderRadius: 12,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 24,
                        background: "var(--bg-elevated)",
                        border: `1px solid ${status !== "idle" ? meta.color + "30" : "var(--border-subtle)"}`,
                        transition: "all 0.2s ease",
                    }}
                >
                    <span>{emoji}</span>
                    <div
                        className={`status-dot ${status}`}
                        style={{
                            position: "absolute", bottom: -2, right: -2,
                            width: 8, height: 8,
                            border: "2px solid var(--bg-sidebar)",
                        }}
                    />
                </div>
                <Text type="secondary" style={{ fontSize: 10, maxWidth: 68, textAlign: "center", lineHeight: 1.2 }} ellipsis>
                    {agent.name}
                </Text>
                <span style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, color: meta.color, opacity: 0.8 }}>
                    {meta.label}
                </span>
            </div>
        </Tooltip>
    );
}

const ROLE_EMOJIS = {
    lead: "👑", backend: "⚙️", frontend: "🎨",
    qa: "🧪", docs: "📄", security: "🛡️", custom: "🤖",
};
const STATUS_ANIMATIONS = {
    idle: "chibi-idle", in_progress: "chibi-working",
    blocked: "chibi-blocked", review: "chibi-review",
    done: "chibi-done", failed: "chibi-failed",
};
const STATUS_META = {
    idle: { color: "var(--text-tertiary)", label: "idle" },
    in_progress: { color: "#818cf8", label: "working..." },
    blocked: { color: "#eab308", label: "blocked" },
    review: { color: "#a78bfa", label: "reviewing" },
    done: { color: "#22c55e", label: "done ✓" },
    failed: { color: "#ef4444", label: "failed ✗" },
};
