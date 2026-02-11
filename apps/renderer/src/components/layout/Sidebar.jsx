/**
 * Sidebar — Premium navigation with oversized touch targets, gradient accents,
 * glassmorphism, and studio-grade polish.
 *
 * Design language:
 *   - 260px expanded / 72px collapsed
 *   - 44px tall nav items with 18px icons
 *   - Gradient accent bar + glow on active item
 *   - Floating brand mark with animated gradient
 *   - Auth status indicator at bottom
 *   - Smooth cubic-bezier transitions
 */
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Tooltip, Badge } from "antd";
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    AppstoreOutlined,
    SmileOutlined,
    ProjectOutlined,
    TeamOutlined,
    ThunderboltOutlined,
    CheckCircleFilled,
} from "@ant-design/icons";
import useAgentStore from "@/stores/useAgentStore";
import useTaskStore from "@/stores/useTaskStore";
import useAuthStore from "@/stores/useAuthStore";

/* ── Navigation items ────────────────────────────────────────── */
const NAV_ITEMS = [
    { key: "/dashboard", icon: <AppstoreOutlined />, label: "Dashboard", desc: "Overview & stats" },
    { key: "/chibi", icon: <SmileOutlined />, label: "Chibi Office", desc: "3D figurines" },
    { key: "/kanban", icon: <ProjectOutlined />, label: "Kanban Board", desc: "Task management" },
    { key: "/team", icon: <TeamOutlined />, label: "Team", desc: "Manage agents" },
];

/* ── Transition ──────────────────────────────────────────────── */
const EASE = "cubic-bezier(.4, 0, .2, 1)";
const W_EXPANDED = 260;
const W_COLLAPSED = 72;

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const agents = useAgentStore((s) => s.agents);
    const tasks = useTaskStore((s) => s.tasks);
    const authenticated = useAuthStore((s) => s.authenticated);
    const source = useAuthStore((s) => s.source);
    const [collapsed, setCollapsed] = useState(false);
    const [hoveredKey, setHoveredKey] = useState(null);

    const activeKey = location.pathname || "/dashboard";
    const w = collapsed ? W_COLLAPSED : W_EXPANDED;

    const getBadge = (key) => {
        if (key === "/team") return agents.length || null;
        if (key === "/kanban")
            return tasks.filter((t) => t.status === "in_progress").length || null;
        return null;
    };

    return (
        <aside
            className="app-sidebar"
            style={{
                width: w,
                minWidth: w,
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                background: "var(--bg-sidebar)",
                borderRight: "1px solid var(--border-subtle)",
                transition: `width 0.3s ${EASE}, min-width 0.3s ${EASE}`,
                overflow: "hidden",
                position: "relative",
            }}
        >
            {/* ── Brand ──────────────────────────────────── */}
            <div
                style={{
                    padding: collapsed ? "20px 0 16px" : "20px 20px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "space-between",
                    flexShrink: 0,
                    minHeight: 68,
                }}
            >
                {!collapsed && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {/* Logo mark */}
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 17,
                                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
                                flexShrink: 0,
                            }}
                        >
                            <ThunderboltOutlined style={{ color: "#fff" }} />
                        </div>
                        {/* Brand text */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <span
                                style={{
                                    fontWeight: 800,
                                    fontSize: 16,
                                    letterSpacing: "-0.03em",
                                    lineHeight: 1.2,
                                    background: "linear-gradient(135deg, var(--gradient-text-from), var(--gradient-text-to))",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                }}
                            >
                                Chibi Office
                            </span>
                            <span
                                style={{
                                    fontSize: 10,
                                    fontWeight: 500,
                                    color: "var(--text-muted)",
                                    letterSpacing: "0.02em",
                                }}
                            >
                                AI Command Center
                            </span>
                        </div>
                    </div>
                )}

                {/* Collapse toggle */}
                <Tooltip title={collapsed ? "Mở rộng" : "Thu gọn"} placement="right">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        style={{
                            background: "none",
                            border: "1px solid transparent",
                            cursor: "pointer",
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--text-muted)",
                            fontSize: 14,
                            transition: `all 0.2s ${EASE}`,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--bg-hover)";
                            e.currentTarget.style.borderColor = "var(--border-subtle)";
                            e.currentTarget.style.color = "var(--text-secondary)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "none";
                            e.currentTarget.style.borderColor = "transparent";
                            e.currentTarget.style.color = "var(--text-muted)";
                        }}
                    >
                        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    </button>
                </Tooltip>
            </div>

            {/* ── Divider ────────────────────────────────── */}
            <div style={{
                height: 1,
                background: "var(--border-subtle)",
                margin: collapsed ? "0 12px" : "0 20px",
                flexShrink: 0,
            }} />

            {/* ── Navigation ─────────────────────────────── */}
            <nav
                style={{
                    flex: 1,
                    padding: collapsed ? "16px 10px" : "16px 14px",
                    overflowY: "auto",
                    overflowX: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                }}
            >
                {/* Section label */}
                {!collapsed && (
                    <div
                        style={{
                            padding: "4px 10px 10px",
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: "var(--text-muted)",
                        }}
                    >
                        Navigation
                    </div>
                )}

                {NAV_ITEMS.map((item) => {
                    const isActive = activeKey === item.key;
                    const isHovered = hoveredKey === item.key;
                    const badge = getBadge(item.key);

                    const btn = (
                        <button
                            key={item.key}
                            onClick={() => navigate(item.key)}
                            onMouseEnter={() => setHoveredKey(item.key)}
                            onMouseLeave={() => setHoveredKey(null)}
                            style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: collapsed ? "12px 0" : "10px 14px",
                                justifyContent: collapsed ? "center" : "flex-start",
                                borderRadius: 10,
                                border: "none",
                                cursor: "pointer",
                                fontSize: 14,
                                fontWeight: isActive ? 600 : 450,
                                fontFamily: "inherit",
                                position: "relative",
                                color: isActive
                                    ? "var(--text-primary)"
                                    : isHovered
                                        ? "var(--text-primary)"
                                        : "var(--text-secondary)",
                                background: isActive
                                    ? "var(--sidebar-active-bg)"
                                    : isHovered
                                        ? "var(--bg-hover)"
                                        : "transparent",
                                transition: `all 0.18s ${EASE}`,
                                overflow: "hidden",
                                minHeight: 44,
                                letterSpacing: "-0.01em",
                            }}
                        >
                            {/* Gradient accent bar */}
                            {isActive && (
                                <div
                                    style={{
                                        position: "absolute",
                                        left: 0,
                                        top: "15%",
                                        bottom: "15%",
                                        width: 3.5,
                                        borderRadius: "0 4px 4px 0",
                                        background: "linear-gradient(180deg, #818cf8, #6366f1, #8b5cf6)",
                                        boxShadow: "0 0 12px rgba(99, 102, 241, 0.5), 0 0 4px rgba(99, 102, 241, 0.3)",
                                    }}
                                />
                            )}

                            {/* Icon container */}
                            <span
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 9,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 17,
                                    flexShrink: 0,
                                    background: isActive
                                        ? "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))"
                                        : isHovered
                                            ? "rgba(99,102,241,0.06)"
                                            : "transparent",
                                    color: isActive
                                        ? "#818cf8"
                                        : isHovered
                                            ? "#a5b4fc"
                                            : "inherit",
                                    transition: `all 0.18s ${EASE}`,
                                    border: isActive ? "1px solid rgba(99,102,241,0.12)" : "1px solid transparent",
                                }}
                            >
                                {item.icon}
                            </span>

                            {/* Label + description */}
                            {!collapsed && (
                                <>
                                    <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                                        <div style={{
                                            lineHeight: 1.3,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}>
                                            {item.label}
                                        </div>
                                        <div style={{
                                            fontSize: 10,
                                            fontWeight: 400,
                                            color: "var(--text-muted)",
                                            lineHeight: 1.3,
                                            marginTop: 1,
                                            opacity: isActive || isHovered ? 1 : 0.7,
                                            transition: `opacity 0.18s ${EASE}`,
                                        }}>
                                            {item.desc}
                                        </div>
                                    </div>

                                    {/* Badge */}
                                    {badge && (
                                        <div style={{
                                            minWidth: 22,
                                            height: 22,
                                            borderRadius: 7,
                                            background: isActive
                                                ? "rgba(99,102,241,0.15)"
                                                : "rgba(99,102,241,0.08)",
                                            color: "#818cf8",
                                            fontSize: 11,
                                            fontWeight: 700,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: "0 6px",
                                            flexShrink: 0,
                                            transition: `all 0.18s ${EASE}`,
                                        }}>
                                            {badge}
                                        </div>
                                    )}
                                </>
                            )}
                        </button>
                    );

                    return collapsed ? (
                        <Tooltip key={item.key} title={item.label} placement="right">
                            {btn}
                        </Tooltip>
                    ) : (
                        <div key={item.key}>{btn}</div>
                    );
                })}
            </nav>

            {/* ── Bottom: Auth + Version ──────────────────── */}
            <div
                style={{
                    padding: collapsed ? "12px 10px" : "12px 14px",
                    borderTop: "1px solid var(--border-subtle)",
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                }}
            >
                {/* Auth status */}
                {!collapsed ? (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            borderRadius: 10,
                            background: authenticated
                                ? "rgba(34,197,94,0.05)"
                                : "rgba(239,68,68,0.05)",
                            border: `1px solid ${authenticated
                                ? "rgba(34,197,94,0.1)"
                                : "rgba(239,68,68,0.1)"
                                }`,
                        }}
                    >
                        <div style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: authenticated
                                ? "rgba(34,197,94,0.1)"
                                : "rgba(239,68,68,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}>
                            {authenticated ? (
                                <CheckCircleFilled style={{ color: "#22c55e", fontSize: 14 }} />
                            ) : (
                                <span style={{ fontSize: 12 }}>⚠️</span>
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: authenticated ? "#22c55e" : "#ef4444",
                                lineHeight: 1.3,
                            }}>
                                {authenticated ? "Đã kết nối" : "Chưa kết nối"}
                            </div>
                            <div style={{
                                fontSize: 10,
                                color: "var(--text-muted)",
                                lineHeight: 1.3,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}>
                                {authenticated ? (source || "Claude API") : "Cần đăng nhập Claude"}
                            </div>
                        </div>
                    </div>
                ) : (
                    <Tooltip
                        title={authenticated ? `Đã kết nối · ${source || "Claude API"}` : "Chưa kết nối"}
                        placement="right"
                    >
                        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
                            <div style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                background: authenticated
                                    ? "rgba(34,197,94,0.1)"
                                    : "rgba(239,68,68,0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}>
                                {authenticated ? (
                                    <CheckCircleFilled style={{ color: "#22c55e", fontSize: 14 }} />
                                ) : (
                                    <span style={{ fontSize: 12 }}>⚠️</span>
                                )}
                            </div>
                        </div>
                    </Tooltip>
                )}

                {/* Version */}
                {!collapsed ? (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            padding: "6px 0",
                        }}
                    >
                        <div
                            className="live-pulse-dot"
                            style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: "#22c55e",
                                flexShrink: 0,
                            }}
                        />
                        <span
                            style={{
                                fontSize: 10,
                                fontFamily: '"JetBrains Mono", monospace',
                                color: "var(--text-muted)",
                                letterSpacing: "0.02em",
                            }}
                        >
                            v0.1.0 · Development
                        </span>
                    </div>
                ) : (
                    <Tooltip title="v0.1.0 · Development" placement="right">
                        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
                            <div
                                className="live-pulse-dot"
                                style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: "50%",
                                    background: "#22c55e",
                                }}
                            />
                        </div>
                    </Tooltip>
                )}
            </div>
        </aside>
    );
}
