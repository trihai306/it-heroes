/**
 * Dashboard — Premium AI Command Center
 *
 * Features:
 *   - Hero stats row with gradient icons and live pulse
 *   - Agent team grid with status cards
 *   - System health monitoring
 *   - Test & build reports section
 *   - Activity timeline
 *   - Quick actions panel
 */
import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Drawer, Typography, Flex } from "antd";
import {
    ThunderboltOutlined,
    TeamOutlined,
    ProjectOutlined,
    ClockCircleOutlined,
    RocketOutlined,
    CheckCircleFilled,
    ExclamationCircleFilled,
    PlayCircleFilled,
    ArrowRightOutlined,
    BugOutlined,
    CodeOutlined,
    SafetyCertificateOutlined,
    ApiOutlined,
    DatabaseOutlined,
    CloudServerOutlined,
    FileTextOutlined,
    BarChartOutlined,
} from "@ant-design/icons";
import useProjectStore from "@/stores/useProjectStore";
import useAgentStore from "@/stores/useAgentStore";
import useTaskStore from "@/stores/useTaskStore";
import "./Dashboard.css";

const { Text } = Typography;

/* ─── Constants ──────────────────────────────────────────────────── */
const ROLE_EMOJIS = {
    lead: "👑", backend: "⚙️", frontend: "🎨",
    qa: "🧪", docs: "📄", security: "🛡️", custom: "🤖",
};

const STATUS_CONFIGS = {
    idle: { label: "Idle", color: "var(--text-muted)", dot: "var(--status-idle)" },
    in_progress: { label: "Working", color: "#818cf8", dot: "#6366f1" },
    blocked: { label: "Blocked", color: "#eab308", dot: "#eab308" },
    review: { label: "Reviewing", color: "#a78bfa", dot: "#a78bfa" },
    done: { label: "Done", color: "#22c55e", dot: "#22c55e" },
    failed: { label: "Failed", color: "#ef4444", dot: "#ef4444" },
};

/* ─── Mock system data (can be replaced with real API) ───────── */
function useSystemHealth() {
    const [health, setHealth] = useState({
        uptime: "3h 42m",
        cpu: 12,
        memory: 34,
        wsConnections: 1,
        apiLatency: 23,
    });

    // Simulate live updates
    useEffect(() => {
        const interval = setInterval(() => {
            setHealth((prev) => ({
                ...prev,
                cpu: Math.min(100, Math.max(5, prev.cpu + (Math.random() - 0.5) * 6)),
                memory: Math.min(100, Math.max(15, prev.memory + (Math.random() - 0.5) * 4)),
                apiLatency: Math.max(8, Math.round(prev.apiLatency + (Math.random() - 0.5) * 8)),
            }));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return health;
}

function useTestReports(tasks) {
    return useMemo(() => {
        const total = tasks.length;
        const passed = tasks.filter((t) => t.status === "done").length;
        const failed = tasks.filter((t) => t.status === "failed").length;
        const running = tasks.filter((t) => t.status === "in_progress").length;
        const skipped = total - passed - failed - running;
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
        return { total, passed, failed, running, skipped, passRate };
    }, [tasks]);
}

/* ═══════════════════════════════════════════════════════════════ */
/* ─── MAIN DASHBOARD ─────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
    const navigate = useNavigate();
    const agents = useAgentStore((s) => s.agents);
    const agentStatuses = useAgentStore((s) => s.agentStatuses);
    const tasks = useTaskStore((s) => s.tasks);
    const [selectedAgent, setSelectedAgent] = useState(null);

    const activeAgents = agents.filter((a) => agentStatuses[a.id]?.status === "in_progress").length;
    const activeTasks = tasks.filter((t) => t.status === "in_progress").length;
    const doneTasks = tasks.filter((t) => t.status === "done").length;
    const blockedTasks = tasks.filter((t) => t.status === "blocked").length;
    const totalTasks = tasks.length;
    const taskProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const health = useSystemHealth();
    const testReport = useTestReports(tasks);

    const statusBreakdown = useMemo(() => {
        const counts = { idle: 0, in_progress: 0, blocked: 0, review: 0, done: 0, failed: 0 };
        agents.forEach((a) => {
            const s = agentStatuses[a.id]?.status || "idle";
            if (counts[s] !== undefined) counts[s]++;
        });
        return counts;
    }, [agents, agentStatuses]);

    const now = new Date();
    const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

    // ─── Empty state ──────────────────────────────────
    if (agents.length === 0) {
        return (
            <div className="dashboard animate-fade-in">
                <div className="dashboard-empty">
                    <div className="dashboard-empty-glow" />
                    <div className="dashboard-empty-icon">🚀</div>
                    <h2 className="dashboard-empty-title">Welcome to AI Command Center</h2>
                    <p className="dashboard-empty-desc">
                        Summon your AI team to start orchestrating tasks, writing code, and building together.
                    </p>
                    <SummonTeamButton />

                    {/* System health shown even when empty */}
                    <div className="dashboard-empty-health">
                        <SystemHealthMini health={health} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard animate-fade-in">
            {/* ── Greeting + Time ────────────────────── */}
            <div className="dashboard-greeting">
                <div>
                    <h2 className="dashboard-greeting-title">{greeting} 👋</h2>
                    <p className="dashboard-greeting-sub">
                        {agents.length} agents · {totalTasks} tasks · {activeTasks} running
                    </p>
                </div>
                <div className="dashboard-time">
                    {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </div>
            </div>

            {/* ── Hero Stats ────────────────────────────── */}
            <div className="dashboard-stats">
                <StatCard
                    icon={<TeamOutlined />}
                    value={agents.length}
                    label="Total Agents"
                    sub={activeAgents > 0 ? `${activeAgents} active` : "All idle"}
                    gradient="linear-gradient(135deg, #6366f1, #818cf8)"
                    glow="rgba(99, 102, 241, 0.2)"
                    pulse={activeAgents > 0}
                />
                <StatCard
                    icon={<PlayCircleFilled />}
                    value={activeTasks}
                    label="In Progress"
                    sub={`of ${totalTasks} tasks`}
                    gradient="linear-gradient(135deg, #3b82f6, #60a5fa)"
                    glow="rgba(59, 130, 246, 0.2)"
                    pulse={activeTasks > 0}
                />
                <StatCard
                    icon={<CheckCircleFilled />}
                    value={doneTasks}
                    label="Completed"
                    sub={taskProgress > 0 ? `${taskProgress}%` : "—"}
                    gradient="linear-gradient(135deg, #22c55e, #4ade80)"
                    glow="rgba(34, 197, 94, 0.2)"
                />
                <StatCard
                    icon={<ExclamationCircleFilled />}
                    value={blockedTasks}
                    label="Blocked"
                    sub={blockedTasks > 0 ? "Attention" : "Clear"}
                    gradient="linear-gradient(135deg, #eab308, #facc15)"
                    glow="rgba(234, 179, 8, 0.2)"
                    warn={blockedTasks > 0}
                />
            </div>

            {/* ── Main Layout ───────────────────────────── */}
            <div className="dashboard-main">
                {/* ─── LEFT COLUMN ─────────────────────── */}
                <div className="dashboard-left-col">
                    {/* Team Overview */}
                    <DashboardPanel
                        icon={<TeamOutlined />}
                        title="Team Overview"
                        action="Manage"
                        onAction={() => navigate("/team")}
                    >
                        <div className="dashboard-agents-grid">
                            {agents.map((agent) => {
                                const status = agentStatuses[agent.id]?.status || "idle";
                                const cfg = STATUS_CONFIGS[status] || STATUS_CONFIGS.idle;
                                const agentTasks = tasks.filter((t) => t.assigned_agent_id === agent.id);
                                const done = agentTasks.filter((t) => t.status === "done").length;
                                const prog = agentTasks.length > 0 ? Math.round((done / agentTasks.length) * 100) : 0;

                                return (
                                    <div
                                        key={agent.id}
                                        className={`dashboard-agent-card ${status === "in_progress" ? "working" : ""}`}
                                        onClick={() => setSelectedAgent(agent)}
                                    >
                                        <div className="agent-card-status-line" style={{ background: cfg.dot }} />
                                        <div className="agent-card-top">
                                            <div className="agent-card-avatar">
                                                {ROLE_EMOJIS[agent.role] || "🤖"}
                                            </div>
                                            <div className="agent-card-info">
                                                <div className="agent-card-name">{agent.name}</div>
                                                <div className="agent-card-role">{agent.role}</div>
                                            </div>
                                            <div className="agent-card-status-badge" style={{ background: `${cfg.dot}20`, color: cfg.color }}>
                                                <span className="agent-card-dot" style={{ background: cfg.dot }} />
                                                {cfg.label}
                                            </div>
                                        </div>
                                        {agentTasks.length > 0 && (
                                            <div className="agent-card-progress">
                                                <div className="agent-card-progress-bar">
                                                    <div className="agent-card-progress-fill" style={{ width: `${prog}%`, background: cfg.dot }} />
                                                </div>
                                                <span className="agent-card-progress-text">{done}/{agentTasks.length}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </DashboardPanel>

                    {/* Test & Build Report */}
                    <DashboardPanel
                        icon={<BugOutlined />}
                        title="Test & Build Report"
                        action="View Logs"
                        onAction={() => navigate("/logs")}
                    >
                        <div className="test-report">
                            {/* Test bars */}
                            <div className="test-report-bars">
                                <TestBar label="Passed" count={testReport.passed} total={testReport.total} color="#22c55e" />
                                <TestBar label="Failed" count={testReport.failed} total={testReport.total} color="#ef4444" />
                                <TestBar label="Running" count={testReport.running} total={testReport.total} color="#6366f1" />
                                <TestBar label="Pending" count={testReport.skipped} total={testReport.total} color="var(--text-muted)" />
                            </div>

                            {/* Pass rate ring */}
                            <div className="test-report-summary">
                                <div className="test-pass-ring">
                                    <svg viewBox="0 0 36 36" className="test-ring-svg">
                                        <path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="var(--border-subtle)"
                                            strokeWidth="3"
                                        />
                                        <path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke={testReport.passRate >= 80 ? "#22c55e" : testReport.passRate >= 50 ? "#eab308" : "#ef4444"}
                                            strokeWidth="3"
                                            strokeDasharray={`${testReport.passRate}, 100`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="test-ring-text">
                                        <span className="test-ring-pct">{testReport.passRate}%</span>
                                        <span className="test-ring-label">Pass</span>
                                    </div>
                                </div>
                                <div className="test-report-meta">
                                    <div className="test-meta-row">
                                        <span className="test-meta-label">Total Tests</span>
                                        <span className="test-meta-value">{testReport.total}</span>
                                    </div>
                                    <div className="test-meta-row">
                                        <span className="test-meta-label">Coverage</span>
                                        <span className="test-meta-value">{testReport.total > 0 ? "—" : "N/A"}</span>
                                    </div>
                                    <div className="test-meta-row">
                                        <span className="test-meta-label">Last Build</span>
                                        <span className="test-meta-value" style={{ color: "#22c55e" }}>✓ OK</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DashboardPanel>
                </div>

                {/* ─── RIGHT COLUMN ────────────────────── */}
                <div className="dashboard-right-col">
                    {/* System Health */}
                    <DashboardPanel icon={<CloudServerOutlined />} title="System Health">
                        <div className="health-grid">
                            <HealthMetric label="CPU" value={`${Math.round(health.cpu)}%`} pct={health.cpu} color="#6366f1" />
                            <HealthMetric label="Memory" value={`${Math.round(health.memory)}%`} pct={health.memory} color="#3b82f6" />
                            <HealthMetric label="API" value={`${health.apiLatency}ms`} pct={Math.min(100, health.apiLatency)} color="#22c55e" />
                            <HealthMetric label="WS" value={health.wsConnections} pct={health.wsConnections * 25} color="#a78bfa" />
                        </div>
                        <div className="health-uptime">
                            <span>Uptime</span>
                            <span className="health-uptime-value">{health.uptime}</span>
                        </div>
                    </DashboardPanel>

                    {/* Status Breakdown */}
                    <DashboardPanel icon={<BarChartOutlined />} title="Status Breakdown">
                        <div className="status-ring-grid">
                            {Object.entries(statusBreakdown)
                                .filter(([, count]) => count > 0)
                                .map(([key, count]) => {
                                    const cfg = STATUS_CONFIGS[key];
                                    return (
                                        <div key={key} className="status-ring-item">
                                            <div className="status-ring-dot" style={{ background: cfg.dot }} />
                                            <span className="status-ring-label">{cfg.label}</span>
                                            <span className="status-ring-count" style={{ color: cfg.color }}>{count}</span>
                                        </div>
                                    );
                                })}
                            {Object.values(statusBreakdown).every(c => c === 0) && (
                                <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0" }}>No activity</div>
                            )}
                        </div>
                        {totalTasks > 0 && (
                            <div className="dashboard-overall-progress">
                                <div className="dashboard-progress-header">
                                    <span>Overall Progress</span>
                                    <span className="dashboard-progress-pct">{taskProgress}%</span>
                                </div>
                                <div className="dashboard-progress-bar">
                                    <div className="dashboard-progress-fill" style={{ width: `${taskProgress}%` }} />
                                </div>
                            </div>
                        )}
                    </DashboardPanel>

                    {/* Quick Nav */}
                    <DashboardPanel icon={<ThunderboltOutlined />} title="Quick Actions">
                        <div className="quick-nav-grid">
                            <button className="quick-nav-btn" onClick={() => navigate("/kanban")}>
                                <ProjectOutlined />
                                <span>Kanban</span>
                            </button>
                            <button className="quick-nav-btn" onClick={() => navigate("/team")}>
                                <TeamOutlined />
                                <span>Team</span>
                            </button>
                        </div>
                    </DashboardPanel>

                    {/* Recent Tasks */}
                    {tasks.length > 0 && (
                        <DashboardPanel
                            icon={<ClockCircleOutlined />}
                            title="Recent Tasks"
                            action="Kanban"
                            onAction={() => navigate("/kanban")}
                        >
                            <div className="recent-tasks-list">
                                {tasks.slice(0, 5).map((task) => {
                                    const cfg = STATUS_CONFIGS[task.status] || STATUS_CONFIGS.idle;
                                    return (
                                        <div key={task.id} className="recent-task-item">
                                            <span className="recent-task-dot" style={{ background: cfg.dot }} />
                                            <span className="recent-task-title">{task.title}</span>
                                            <span className="recent-task-status" style={{ color: cfg.color }}>{cfg.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </DashboardPanel>
                    )}
                </div>
            </div>

            {/* Agent Detail Drawer */}
            <Drawer
                title={selectedAgent && (
                    <Flex align="center" gap={10}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 17, border: "1px solid rgba(99,102,241,0.1)",
                        }}>
                            {ROLE_EMOJIS[selectedAgent.role] || "🤖"}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedAgent.name}</div>
                            <Text type="secondary" style={{ fontSize: 11 }}>{selectedAgent.role}</Text>
                        </div>
                    </Flex>
                )}
                open={!!selectedAgent}
                onClose={() => setSelectedAgent(null)}
                width={380}
            >
                {selectedAgent && (
                    <AgentDetail
                        agent={selectedAgent}
                        status={agentStatuses[selectedAgent.id]?.status || "idle"}
                        tasks={tasks.filter((t) => t.assigned_agent_id === selectedAgent.id)}
                    />
                )}
            </Drawer>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════ */
/* ─── SUBCOMPONENTS ──────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════ */

function DashboardPanel({ icon, title, action, onAction, children }) {
    return (
        <div className="dashboard-panel">
            <div className="dashboard-section-header">
                <div className="dashboard-section-title">
                    {icon && <span style={{ color: "#818cf8" }}>{icon}</span>}
                    <span>{title}</span>
                </div>
                {action && (
                    <button className="dashboard-section-action" onClick={onAction}>
                        {action} <ArrowRightOutlined />
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}

function StatCard({ icon, value, label, sub, gradient, glow, pulse, warn }) {
    return (
        <div className={`dashboard-stat ${pulse ? "pulse" : ""} ${warn ? "warn" : ""}`}>
            <div className="dashboard-stat-icon" style={{ background: gradient, boxShadow: `0 4px 16px ${glow}` }}>
                {icon}
            </div>
            <div className="dashboard-stat-content">
                <div className="dashboard-stat-value">{value}</div>
                <div className="dashboard-stat-label">{label}</div>
                <div className="dashboard-stat-sub">{sub}</div>
            </div>
        </div>
    );
}

function TestBar({ label, count, total, color }) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="test-bar-row">
            <span className="test-bar-label">{label}</span>
            <div className="test-bar-track">
                <div className="test-bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="test-bar-count" style={{ color }}>{count}</span>
        </div>
    );
}

function HealthMetric({ label, value, pct, color }) {
    return (
        <div className="health-metric">
            <div className="health-metric-header">
                <span className="health-metric-label">{label}</span>
                <span className="health-metric-value" style={{ color }}>{value}</span>
            </div>
            <div className="health-metric-bar">
                <div
                    className="health-metric-fill"
                    style={{
                        width: `${Math.min(100, pct)}%`,
                        background: color,
                        transition: "width 0.8s ease",
                    }}
                />
            </div>
        </div>
    );
}

function SystemHealthMini({ health }) {
    return (
        <div className="health-mini">
            <span className="health-mini-item">
                <span className="health-mini-dot" style={{ background: health.cpu < 80 ? "#22c55e" : "#ef4444" }} />
                CPU {Math.round(health.cpu)}%
            </span>
            <span className="health-mini-sep">·</span>
            <span className="health-mini-item">
                <span className="health-mini-dot" style={{ background: health.memory < 80 ? "#22c55e" : "#ef4444" }} />
                Mem {Math.round(health.memory)}%
            </span>
            <span className="health-mini-sep">·</span>
            <span className="health-mini-item">
                <span className="health-mini-dot" style={{ background: "#22c55e" }} />
                {health.apiLatency}ms
            </span>
        </div>
    );
}

function AgentDetail({ agent, status, tasks: agentTasks }) {
    const cfg = STATUS_CONFIGS[status] || STATUS_CONFIGS.idle;
    return (
        <div>
            <Flex align="center" gap={8} style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 12 }}>Status:</Text>
                <Tag color={status === "in_progress" ? "processing" : status === "done" ? "success" :
                    status === "blocked" ? "warning" : status === "failed" ? "error" : "default"}
                    style={{ margin: 0 }}>
                    {cfg.label}
                </Tag>
            </Flex>
            <div>
                <span className="section-label" style={{ display: "block", marginBottom: 10 }}>Assigned Tasks</span>
                {agentTasks.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {agentTasks.map((task) => (
                            <Flex key={task.id} align="center" gap={8} style={{
                                padding: "8px 12px", borderRadius: 8,
                                background: "var(--bg-hover)", border: "1px solid var(--border-subtle)",
                            }}>
                                <span className={`status-dot ${task.status}`} />
                                <Text style={{ fontSize: 12, flex: 1 }}>{task.title}</Text>
                                <Tag style={{ margin: 0, fontSize: 9, borderRadius: 4 }}>{task.status.replace("_", " ")}</Tag>
                            </Flex>
                        ))}
                    </div>
                ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>No tasks assigned</Text>
                )}
            </div>
        </div>
    );
}

function SummonTeamButton() {
    const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
    const createTeamFromPreset = useAgentStore((s) => s.createTeamFromPreset);
    const [summoning, setSummoning] = useState(false);
    const handleSummon = async () => {
        if (!selectedProjectId || summoning) return;
        setSummoning(true);
        try {
            await createTeamFromPreset(selectedProjectId, "fullstack");
        } finally {
            setSummoning(false);
        }
    };
    return (
        <button className="dashboard-summon-btn" onClick={handleSummon} disabled={summoning}>
            <ThunderboltOutlined />
            {summoning ? "Summoning..." : "Summon AI Team"}
        </button>
    );
}
