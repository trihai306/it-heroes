/**
 * ClaudeLoginPage — Premium auth gate shown when not connected to Claude
 *
 * Shows step-by-step instructions to authenticate via:
 *   1. Claude Code CLI (`claude /login`)
 *   2. Or API key fallback
 *
 * Includes a "Kiểm tra lại" (Refresh) button to re-check auth after login.
 */
import { useState, useEffect, useCallback } from "react";
import useAuthStore from "@/stores/useAuthStore";

export default function ClaudeLoginPage() {
    const { loginInstructions, checking, source, error } = useAuthStore();
    const refreshAuth = useAuthStore((s) => s.refreshAuth);
    const [refreshing, setRefreshing] = useState(false);
    const [pulse, setPulse] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState(null);

    const steps = loginInstructions?.steps || [
        { step: 1, title: "Cài Claude Code CLI", command: "npm install -g @anthropic-ai/claude-code", description: "Cài Claude Code CLI qua npm" },
        { step: 2, title: "Đăng nhập tài khoản Claude", command: "claude /login", description: "Đăng nhập vào tài khoản Claude Pro/Max" },
        { step: 3, title: "Kiểm tra kết nối", command: "claude --version", description: "Xác nhận CLI đã kết nối thành công" },
    ];
    const alt = loginInstructions?.alternative;

    // Floating animation
    useEffect(() => {
        const id = setInterval(() => setPulse((p) => !p), 2000);
        return () => clearInterval(id);
    }, []);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshAuth();
        setRefreshing(false);
    }, [refreshAuth]);

    const handleCopy = useCallback((text, idx) => {
        navigator.clipboard.writeText(text);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    }, []);

    return (
        <div style={styles.container}>
            {/* Animated background grid */}
            <div style={styles.bgGrid} />
            <div style={styles.bgGlow} />

            {/* Main card */}
            <div style={styles.card}>
                {/* Logo + Title */}
                <div style={styles.logoSection}>
                    <div style={{
                        ...styles.logoIcon,
                        transform: pulse ? "translateY(-4px)" : "translateY(0)",
                    }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7v10l10 5 10-5V7l-10-5z" fill="url(#g1)" opacity="0.3" />
                            <path d="M12 2L2 7v10l10 5 10-5V7l-10-5z" stroke="url(#g1)" strokeWidth="1.5" fill="none" />
                            <path d="M12 22V12M2 7l10 5 10-5" stroke="url(#g1)" strokeWidth="1.5" opacity="0.5" />
                            <circle cx="12" cy="12" r="3" fill="url(#g1)" />
                            <defs>
                                <linearGradient id="g1" x1="2" y1="2" x2="22" y2="22">
                                    <stop offset="0%" stopColor="#818cf8" />
                                    <stop offset="100%" stopColor="#6366f1" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1 style={styles.title}>
                        <span style={styles.gradientText}>Chibi Office AI</span>
                    </h1>
                    <p style={styles.subtitle}>
                        Kết nối tài khoản Claude để bắt đầu
                    </p>
                </div>

                {/* Connection status badge */}
                <div style={styles.statusBadge}>
                    <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: "#ef4444",
                        boxShadow: "0 0 8px rgba(239,68,68,0.5)",
                    }} />
                    <span>Chưa kết nối</span>
                </div>

                {/* Steps */}
                <div style={styles.stepsContainer}>
                    {steps.map((s, i) => (
                        <div key={s.step} style={styles.stepCard}>
                            <div style={styles.stepHeader}>
                                <div style={styles.stepNumber}>{s.step}</div>
                                <div>
                                    <div style={styles.stepTitle}>{s.title}</div>
                                    <div style={styles.stepDesc}>{s.description}</div>
                                </div>
                            </div>
                            <div style={styles.commandRow}>
                                <code style={styles.commandCode}>
                                    <span style={styles.prompt}>$</span> {s.command}
                                </code>
                                <button
                                    style={styles.copyBtn}
                                    onClick={() => handleCopy(s.command, i)}
                                    title="Copy"
                                >
                                    {copiedIdx === i ? "✓" : "📋"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Divider */}
                <div style={styles.divider}>
                    <span style={styles.dividerText}>hoặc</span>
                </div>

                {/* Alternative - API Key */}
                {alt && (
                    <div style={styles.altCard}>
                        <div style={styles.altTitle}>{alt.title}</div>
                        <div style={styles.altDesc}>{alt.description}</div>
                        <div style={styles.commandRow}>
                            <code style={{ ...styles.commandCode, background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.1)" }}>
                                <span style={styles.prompt}>$</span> {alt.command}
                            </code>
                            <button
                                style={styles.copyBtn}
                                onClick={() => handleCopy(alt.command, "alt")}
                                title="Copy"
                            >
                                {copiedIdx === "alt" ? "✓" : "📋"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div style={styles.errorMsg}>
                        ⚠️ Backend không phản hồi: {error}
                    </div>
                )}

                {/* Refresh button */}
                <button
                    style={{
                        ...styles.refreshBtn,
                        opacity: refreshing ? 0.7 : 1,
                    }}
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    <span style={{
                        display: "inline-block",
                        transition: "transform 0.5s ease",
                        transform: refreshing ? "rotate(360deg)" : "none",
                    }}>
                        🔄
                    </span>
                    {refreshing ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
                </button>

                {/* Footer */}
                <p style={styles.footer}>
                    Cần tài khoản{" "}
                    <a
                        href="https://claude.ai/settings/billing"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.link}
                    >
                        Claude Pro/Max
                    </a>
                    {" "}hoặc API key từ{" "}
                    <a
                        href="https://console.anthropic.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.link}
                    >
                        console.anthropic.com
                    </a>
                </p>
            </div>
        </div>
    );
}

/* ─── Styles ─────────────────────────────────────────────────────────── */
const styles = {
    container: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        background: "var(--bg-primary, #0f1117)",
    },
    bgGrid: {
        position: "absolute",
        inset: 0,
        backgroundImage: `
            linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        pointerEvents: "none",
    },
    bgGlow: {
        position: "absolute",
        top: "30%",
        left: "50%",
        width: 500,
        height: 500,
        transform: "translate(-50%, -50%)",
        background: "radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
    },
    card: {
        position: "relative",
        width: "100%",
        maxWidth: 480,
        padding: "40px 36px 32px",
        borderRadius: 20,
        background: "var(--bg-surface, #181a24)",
        border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
        boxShadow: `
            0 0 0 1px rgba(99,102,241,0.05),
            0 4px 20px rgba(0,0,0,0.3),
            0 20px 60px rgba(0,0,0,0.2)
        `,
    },
    logoSection: {
        textAlign: "center",
        marginBottom: 28,
    },
    logoIcon: {
        width: 64,
        height: 64,
        borderRadius: 16,
        background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(129,140,248,0.08))",
        border: "1px solid rgba(99,102,241,0.15)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        transition: "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
    },
    title: {
        margin: "0 0 6px",
        fontSize: 24,
        fontWeight: 700,
        letterSpacing: "-0.02em",
    },
    gradientText: {
        background: "linear-gradient(135deg, #a5b4fc 0%, #818cf8 40%, #6366f1 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
    },
    subtitle: {
        margin: 0,
        fontSize: 14,
        color: "var(--text-secondary, rgba(255,255,255,0.55))",
        fontWeight: 400,
    },
    statusBadge: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "8px 16px",
        borderRadius: 10,
        background: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.12)",
        fontSize: 12,
        fontWeight: 600,
        color: "#ef4444",
        marginBottom: 24,
    },
    stepsContainer: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
    },
    stepCard: {
        padding: "14px 16px",
        borderRadius: 12,
        background: "var(--bg-hover, rgba(255,255,255,0.02))",
        border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
        transition: "border-color 0.2s ease",
    },
    stepHeader: {
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 10,
    },
    stepNumber: {
        width: 26,
        height: 26,
        borderRadius: 8,
        background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.08))",
        border: "1px solid rgba(99,102,241,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        color: "#a5b4fc",
        flexShrink: 0,
    },
    stepTitle: {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--text-primary, rgba(255,255,255,0.92))",
        marginBottom: 2,
    },
    stepDesc: {
        fontSize: 12,
        color: "var(--text-muted, rgba(255,255,255,0.4))",
        lineHeight: 1.4,
    },
    commandRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
    },
    commandCode: {
        flex: 1,
        display: "block",
        padding: "8px 12px",
        borderRadius: 8,
        background: "rgba(99,102,241,0.06)",
        border: "1px solid rgba(99,102,241,0.1)",
        fontSize: 12,
        fontFamily: '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
        color: "var(--text-primary, rgba(255,255,255,0.88))",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    prompt: {
        color: "#818cf8",
        marginRight: 6,
        userSelect: "none",
    },
    copyBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
        background: "var(--bg-hover, rgba(255,255,255,0.02))",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        transition: "all 0.2s ease",
        flexShrink: 0,
    },
    divider: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "20px 0",
    },
    dividerText: {
        flex: 1,
        textAlign: "center",
        fontSize: 11,
        fontWeight: 500,
        color: "var(--text-muted, rgba(255,255,255,0.3))",
        position: "relative",
    },
    altCard: {
        padding: "14px 16px",
        borderRadius: 12,
        background: "rgba(239,68,68,0.03)",
        border: "1px solid rgba(239,68,68,0.08)",
    },
    altTitle: {
        fontSize: 13,
        fontWeight: 600,
        color: "#fca5a5",
        marginBottom: 4,
    },
    altDesc: {
        fontSize: 12,
        color: "var(--text-muted, rgba(255,255,255,0.4))",
        marginBottom: 10,
    },
    errorMsg: {
        marginTop: 16,
        padding: "10px 14px",
        borderRadius: 10,
        background: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.12)",
        fontSize: 12,
        color: "#fca5a5",
    },
    refreshBtn: {
        width: "100%",
        marginTop: 24,
        height: 44,
        borderRadius: 12,
        border: "none",
        background: "linear-gradient(135deg, #6366f1, #818cf8)",
        color: "#fff",
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "all 0.2s ease",
        boxShadow: "0 2px 12px rgba(99,102,241,0.25)",
    },
    footer: {
        textAlign: "center",
        fontSize: 11,
        color: "var(--text-muted, rgba(255,255,255,0.3))",
        marginTop: 20,
        lineHeight: 1.6,
    },
    link: {
        color: "#818cf8",
        textDecoration: "none",
    },
};
