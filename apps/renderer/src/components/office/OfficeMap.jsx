/**
 * OfficeMap — Full-page agent overview with stats dashboard
 */
import { useState } from "react";
import { Card, Tag, Button, Row, Col, Typography, Space, Flex, Empty, Drawer, Progress } from "antd";
import {
    ThunderboltOutlined,
    TeamOutlined,
    ProjectOutlined,
    ClockCircleOutlined,
} from "@ant-design/icons";
import useProjectStore from "@/stores/useProjectStore";
import useAgentStore from "@/stores/useAgentStore";
import useTaskStore from "@/stores/useTaskStore";
import ChibiAgent from "./ChibiAgent";

const { Title, Text } = Typography;

export default function OfficeMap() {
    const agents = useAgentStore((s) => s.agents);
    const agentStatuses = useAgentStore((s) => s.agentStatuses);
    const tasks = useTaskStore((s) => s.tasks);
    const [selectedAgent, setSelectedAgent] = useState(null);

    const activeAgents = agents.filter((a) => agentStatuses[a.id]?.status === "in_progress").length;
    const activeTasks = tasks.filter((t) => t.status === "in_progress").length;
    const doneTasks = tasks.filter((t) => t.status === "done").length;

    return (
        <div className="animate-fade-in">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Office Map</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Virtual workspace · {agents.length} agents
                    </Text>
                </div>
                {agents.length === 0 && <SummonTeamButton />}
            </div>

            {/* Stats Row */}
            <Flex gap={12} style={{ marginBottom: 20, flexShrink: 0 }} wrap="wrap">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: "rgba(99,102,241,0.1)" }}>
                        <TeamOutlined style={{ color: "#a78bfa" }} />
                    </div>
                    <div>
                        <div className="stat-value">{agents.length}</div>
                        <div className="stat-label">Agents{activeAgents > 0 ? ` · ${activeAgents} active` : ""}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: "rgba(34,197,94,0.1)" }}>
                        <ProjectOutlined style={{ color: "#22c55e" }} />
                    </div>
                    <div>
                        <div className="stat-value">{activeTasks}</div>
                        <div className="stat-label">In Progress</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: "rgba(234,179,8,0.1)" }}>
                        <ClockCircleOutlined style={{ color: "#eab308" }} />
                    </div>
                    <div>
                        <div className="stat-value">{doneTasks}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                </div>
            </Flex>

            {/* Agent Grid */}
            <div style={{ flex: 1, overflow: "auto" }}>
                {agents.length > 0 ? (
                    <Row gutter={[14, 14]}>
                        {agents.map((agent) => {
                            const status = agentStatuses[agent.id]?.status || "idle";
                            const agentTasks = tasks.filter((t) => t.assigned_agent_id === agent.id);
                            const taskCount = agentTasks.length;
                            const doneCount = agentTasks.filter((t) => t.status === "done").length;
                            const progress = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

                            return (
                                <Col key={agent.id} xs={24} sm={12} lg={8} xxl={6}>
                                    <Card
                                        className="room-card"
                                        size="small"
                                        styles={{ body: { padding: 14 } }}
                                        hoverable
                                        onClick={() => setSelectedAgent(agent)}
                                    >
                                        <Flex align="center" gap={10} style={{ marginBottom: 10 }}>
                                            <div style={{
                                                width: 36, height: 36, borderRadius: 10,
                                                background: "var(--bg-elevated)",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: 16,
                                            }}>
                                                {ROLE_EMOJIS[agent.role] || "🤖"}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <Text strong style={{ fontSize: 13 }}>{agent.name}</Text>
                                                <br />
                                                <Text type="secondary" style={{ fontSize: 10 }}>{agent.role}</Text>
                                            </div>
                                            <span className={`status-dot ${status}`} />
                                        </Flex>

                                        <div style={{
                                            borderRadius: 8, padding: 10, minHeight: 40,
                                            background: "var(--bg-hover)",
                                            border: "1px solid var(--border-subtle)",
                                            marginBottom: taskCount > 0 ? 10 : 0,
                                        }}>
                                            <ChibiAgent agent={agent} status={status} />
                                        </div>

                                        {/* Task progress */}
                                        {taskCount > 0 && (
                                            <Flex align="center" gap={8}>
                                                <Progress
                                                    percent={progress}
                                                    size="small"
                                                    strokeColor="#6366f1"
                                                    trailColor="var(--border-subtle)"
                                                    style={{ flex: 1 }}
                                                    format={() => null}
                                                />
                                                <Text type="secondary" style={{ fontSize: 10, whiteSpace: "nowrap", fontFamily: '"JetBrains Mono", monospace' }}>
                                                    {doneCount}/{taskCount}
                                                </Text>
                                            </Flex>
                                        )}
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                ) : (
                    <Flex align="center" justify="center" style={{ height: 280 }}>
                        <Empty
                            image={<div style={{ fontSize: 42, lineHeight: 1, opacity: 0.3 }}>🏗️</div>}
                            description={
                                <div style={{ textAlign: "center" }}>
                                    <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                                        No agents yet
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        Summon a team to populate the office
                                    </Text>
                                </div>
                            }
                        />
                    </Flex>
                )}
            </div>

            {/* Agent Detail Drawer */}
            <Drawer
                title={selectedAgent && (
                    <Flex align="center" gap={10}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: "var(--bg-badge)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 16,
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

/* ─── Agent Detail Panel ──────────────────────────────────────── */
function AgentDetail({ agent, status, tasks: agentTasks }) {
    return (
        <div>
            <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12 }}>Status:</Text>
                <Tag color={STATUS_TAG_COLORS[status]} style={{ margin: 0 }}>
                    {STATUS_LABELS[status]}
                </Tag>
            </Flex>

            <div>
                <span className="section-label" style={{ display: "block", marginBottom: 8 }}>
                    Assigned Tasks
                </span>
                {agentTasks.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {agentTasks.map((task) => (
                            <Flex key={task.id} align="center" gap={8} style={{
                                padding: "6px 10px", borderRadius: 6,
                                background: "var(--bg-hover)",
                            }}>
                                <span className={`status-dot ${task.status}`} />
                                <Text style={{ fontSize: 12, flex: 1 }}>{task.title}</Text>
                                <Tag style={{ margin: 0, fontSize: 9, borderRadius: 4 }}>
                                    {task.status.replace("_", " ")}
                                </Tag>
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

/* ─── Summon Team Button ───────────────────────────────────────────── */
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
    return <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleSummon} loading={summoning}>Summon Team</Button>;
}

/* ─── Helpers ──────────────────────────────────────────────────────── */
const ROLE_EMOJIS = {
    lead: "👑", backend: "⚙️", frontend: "🎨",
    qa: "🧪", docs: "📄", security: "🛡️",
};

const STATUS_LABELS = {
    idle: "Idle", in_progress: "Working", blocked: "Blocked",
    review: "Reviewing", done: "Done", failed: "Failed",
};

const STATUS_TAG_COLORS = {
    idle: "default", in_progress: "processing", blocked: "warning",
    review: "purple", done: "success", failed: "error",
};
