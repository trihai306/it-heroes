/**
 * App.jsx — Root shell · Layout + Header + Sidebar
 * Routes are defined in router.jsx, pages in pages/
 */
import { useState, useEffect } from "react";
import { Layout, Button, Space, Tooltip, Dropdown } from "antd";
import {
    PlusOutlined,
    WifiOutlined,
    DisconnectOutlined,
    SunOutlined,
    MoonOutlined,
    DownOutlined,
} from "@ant-design/icons";
import useProjectStore from "@/stores/useProjectStore";
import useAgentStore from "@/stores/useAgentStore";
import useTaskStore from "@/stores/useTaskStore";
import useThemeStore from "@/stores/useThemeStore";
import useAuthStore from "@/stores/useAuthStore";
import useWebSocket from "@/hooks/useWebSocket";
import Sidebar from "@/components/layout/Sidebar";
import FolderPickerModal from "@/components/layout/FolderPickerModal";
import WelcomePage from "@/pages/WelcomePage";
import ClaudeLoginPage from "@/pages/ClaudeLoginPage";
import AppRouter from "@/router";

const { Content } = Layout;

export default function App() {
    const [showPicker, setShowPicker] = useState(false);
    const agents = useAgentStore((s) => s.agents);

    const projects = useProjectStore((s) => s.projects);
    const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
    const selectProject = useProjectStore((s) => s.selectProject);
    const createProject = useProjectStore((s) => s.createProject);
    const fetchProjects = useProjectStore((s) => s.fetchProjects);

    const fetchAgents = useAgentStore((s) => s.fetchAgents);
    const fetchTasks = useTaskStore((s) => s.fetchTasks);

    const isDark = useThemeStore((s) => s.isDark);
    const toggleTheme = useThemeStore((s) => s.toggle);

    // Auth state
    const authenticated = useAuthStore((s) => s.authenticated);
    const checkAuth = useAuthStore((s) => s.checkAuth);

    const { connected, logs, clearLogs } = useWebSocket(selectedProjectId);

    // Check auth on mount
    useEffect(() => { checkAuth(); }, [checkAuth]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);
    useEffect(() => {
        if (selectedProjectId) {
            fetchAgents(selectedProjectId);
            fetchTasks(selectedProjectId);
        }
    }, [selectedProjectId, fetchAgents, fetchTasks]);

    // Show login page if not authenticated
    if (authenticated === null) {
        // Still checking — show minimal loading
        return (
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: "100vh", background: "var(--bg-primary, #0f1117)",
            }}>
                <div style={{
                    fontSize: 14, color: "var(--text-secondary, rgba(255,255,255,0.5))",
                    display: "flex", alignItems: "center", gap: 10,
                }}>
                    <span className="live-pulse-dot" style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: "#6366f1", display: "inline-block",
                    }} />
                    Đang kiểm tra kết nối...
                </div>
            </div>
        );
    }

    if (authenticated === false) {
        return <ClaudeLoginPage />;
    }

    // Handle add project
    const handleAddProject = async () => {
        if (window.chibiAPI) {
            const repoPath = await window.chibiAPI.selectRepo();
            if (repoPath) await createProject(repoPath);
        } else {
            setShowPicker(true);
        }
    };

    const handlePickerOk = async (repoPath) => {
        setShowPicker(false);
        if (repoPath) await createProject(repoPath);
    };

    // Project dropdown items
    const projectDropdownItems = [
        ...projects.map((p) => ({
            key: String(p.id),
            label: (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minWidth: 200, padding: "2px 0" }}>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    </div>
                    {selectedProjectId === p.id && (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1" }} />
                    )}
                </div>
            ),
        })),
        { type: "divider" },
        {
            key: "add",
            icon: <PlusOutlined />,
            label: "Add Project...",
        },
    ];

    const handleProjectDropdown = ({ key }) => {
        if (key === "add") {
            handleAddProject();
        } else {
            selectProject(Number(key));
        }
    };

    const selectedProject = projects.find((p) => p.id === selectedProjectId);

    return (
        <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
            <Sidebar />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* ── Header ─────────────────────────────────── */}
                <header
                    className="titlebar-drag"
                    style={{
                        padding: "0 20px",
                        height: 52,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid var(--border-subtle)",
                        background: "var(--bg-header)",
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        flexShrink: 0,
                    }}
                >
                    {/* Left: Project Selector */}
                    <div className="titlebar-no-drag" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {projects.length > 0 ? (
                            <Dropdown
                                menu={{ items: projectDropdownItems, onClick: handleProjectDropdown }}
                                trigger={["click"]}
                            >
                                <button
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        height: 34,
                                        padding: "0 12px",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        fontFamily: "inherit",
                                        color: "var(--text-primary)",
                                        background: "var(--bg-surface)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: 8,
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)";
                                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.08)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "var(--border-subtle)";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                >
                                    <span style={{
                                        width: 20, height: 20, borderRadius: 5,
                                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 10, color: "#fff",
                                    }}>
                                        📁
                                    </span>
                                    {selectedProject?.name || "Select Project"}
                                    <DownOutlined style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 2 }} />
                                </button>
                            </Dropdown>
                        ) : (
                            <Button
                                type="text"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={handleAddProject}
                                style={{ fontSize: 12, color: "var(--text-secondary)" }}
                            >
                                Add Project
                            </Button>
                        )}

                    </div>

                    {/* Right: Status & Actions */}
                    <Space className="titlebar-no-drag" size={6}>
                        {/* Connection status */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                height: 30,
                                padding: "0 10px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 500,
                                color: connected ? "#22c55e" : "var(--text-muted)",
                                background: connected
                                    ? "rgba(34,197,94,0.08)"
                                    : "var(--bg-hover)",
                                border: `1px solid ${connected ? "rgba(34,197,94,0.15)" : "var(--border-subtle)"}`,
                                transition: "all 0.3s ease",
                            }}
                        >
                            <div
                                className={connected ? "live-pulse-dot" : ""}
                                style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: connected ? "#22c55e" : "var(--text-muted)",
                                    flexShrink: 0,
                                }}
                            />
                            {connected ? "Live" : "Offline"}
                        </div>

                        {/* Agent count */}
                        {agents.length > 0 && (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    height: 30,
                                    padding: "0 10px",
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 500,
                                    color: "#818cf8",
                                    background: "rgba(99,102,241,0.08)",
                                    border: "1px solid rgba(99,102,241,0.12)",
                                }}
                            >
                                <span style={{ fontSize: 12 }}>👥</span>
                                {agents.length} agents
                            </div>
                        )}

                        {/* Theme toggle */}
                        <Tooltip title={isDark ? "Light mode" : "Dark mode"}>
                            <button
                                onClick={toggleTheme}
                                style={{
                                    background: "none",
                                    border: "1px solid var(--border-subtle)",
                                    cursor: "pointer",
                                    width: 30,
                                    height: 30,
                                    borderRadius: 6,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "var(--text-secondary)",
                                    fontSize: 13,
                                    transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = "var(--border-hover)";
                                    e.currentTarget.style.background = "var(--bg-hover)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                                    e.currentTarget.style.background = "none";
                                }}
                            >
                                {isDark ? <SunOutlined /> : <MoonOutlined />}
                            </button>
                        </Tooltip>
                    </Space>
                </header>

                {/* ── Main Content — React Router ────────────── */}
                <main style={{ flex: 1, overflow: "auto", padding: 20 }}>
                    {!selectedProjectId ? (
                        <WelcomePage onAddProject={handleAddProject} />
                    ) : (
                        <AppRouter logs={logs} clearLogs={clearLogs} agents={agents} />
                    )}
                </main>
            </div>

            <FolderPickerModal
                open={showPicker}
                onOk={handlePickerOk}
                onCancel={() => setShowPicker(false)}
            />
        </div>
    );
}
