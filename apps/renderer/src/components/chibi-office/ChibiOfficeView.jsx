/**
 * ChibiOfficeView — 3D interactive chibi office using Three.js
 * React Three Fiber + Drei for rendering
 */
import { useState, useCallback, useEffect, Suspense, Component } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Typography, Flex, Space, Drawer, Tag, Button, Tooltip, Spin, Result } from "antd";
import {
    TeamOutlined,
    ExpandOutlined,
    EyeOutlined,
    ReloadOutlined,
} from "@ant-design/icons";

import useAgentStore from "@/stores/useAgentStore";
import useTaskStore from "@/stores/useTaskStore";
import useAgentWebSocket from "@/hooks/useAgentWebSocket";
import OfficeScene from "./models/OfficeScene";
import useOfficePositions from "./useOfficePositions";
import useTimeOfDay from "./useTimeOfDay";
import "./ChibiOfficeView.css";

/* ─── Error boundary for WebGL crashes ────────────────────────────── */
class Canvas3DErrorBoundary extends Component {
    state = { hasError: false, error: null };
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <Result
                    status="warning"
                    title="3D Rendering Error"
                    subTitle={this.state.error?.message || "WebGL context was lost. This can happen due to GPU resource limits."}
                    extra={
                        <Button
                            type="primary"
                            icon={<ReloadOutlined />}
                            onClick={() => { this.setState({ hasError: false, error: null }); }}
                        >
                            Retry
                        </Button>
                    }
                    style={{ padding: "40px 0" }}
                />
            );
        }
        return this.props.children;
    }
}

const { Title, Text } = Typography;

/* ─── Updates WebGL clear color when time changes ────────────────── */
function ClearColorUpdater({ color }) {
    const { gl } = useThree();
    useEffect(() => { gl.setClearColor(color); }, [gl, color]);
    return null;
}

/* ─── Camera presets ──────────────────────────────────────────────── */
const CAMERA_PRESETS = {
    overview: { position: [8, 10, 12], target: [0, 0, 0] },
    top: { position: [0, 22, 3], target: [0, 0, -1] },
    close: { position: [3, 4, 5], target: [0, 0.5, 0] },
};

export default function ChibiOfficeView() {

    const agents = useAgentStore((s) => s.agents);
    const agentStatuses = useAgentStore((s) => s.agentStatuses);
    const agentPositions = useAgentStore((s) => s.agentPositions);
    const fetchPositions = useAgentStore((s) => s.fetchPositions);
    const tasks = useTaskStore((s) => s.tasks);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [cameraPreset, setCameraPreset] = useState("top");

    // WebSocket connection for real-time position updates
    const projectId = agents.length > 0 ? agents[0].project_id : null;
    useAgentWebSocket(projectId);

    // Fetch initial positions on mount / when agents change
    useEffect(() => {
        if (projectId) fetchPositions(projectId);
    }, [projectId, fetchPositions]);

    const { zoneLayouts, totalWorking, totalWalking, totalBlocked } =
        useOfficePositions(agents, agentStatuses);

    const timeColors = useTimeOfDay();
    const cam = CAMERA_PRESETS[cameraPreset];

    if (agents.length === 0) {
        return (
            <div className="animate-fade-in">
                <div className="page-header">
                    <div>
                        <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Chibi Office 3D</Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Virtual workspace visualization
                        </Text>
                    </div>
                </div>
                <div className="chibi-office-empty">
                    <div className="chibi-office-empty-icon">🏢</div>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        No agents yet. Summon a team from the Office Map to see them here.
                    </Text>
                </div>
            </div>
        );
    }

    return (
        <div className="chibi-office-page animate-fade-in">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Chibi Office 3D</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {agents.length} agents · {timeColors.label} · Drag to orbit
                    </Text>
                </div>
                <Space size={8}>
                    {totalWorking > 0 && (
                        <span className="filter-pill active">
                            <TeamOutlined /> {totalWorking} working
                        </span>
                    )}
                    {totalWalking > 0 && (
                        <span className="filter-pill">
                            {totalWalking} idle
                        </span>
                    )}
                    {totalBlocked > 0 && (
                        <span className="filter-pill" style={{ borderColor: "rgba(234,179,8,0.3)", color: "#eab308" }}>
                            {totalBlocked} blocked
                        </span>
                    )}

                    <div style={{ borderLeft: "1px solid var(--border-subtle)", paddingLeft: 8, display: "flex", gap: 4 }}>
                        <Tooltip title="Overview">
                            <Button type={cameraPreset === "overview" ? "primary" : "text"} size="small"
                                icon={<EyeOutlined />} onClick={() => setCameraPreset("overview")} />
                        </Tooltip>
                        <Tooltip title="Top-down">
                            <Button type={cameraPreset === "top" ? "primary" : "text"} size="small"
                                icon={<ExpandOutlined />} onClick={() => setCameraPreset("top")} />
                        </Tooltip>
                        <Tooltip title="Close-up">
                            <Button type={cameraPreset === "close" ? "primary" : "text"} size="small"
                                icon={<TeamOutlined />} onClick={() => setCameraPreset("close")} />
                        </Tooltip>
                    </div>
                </Space>
            </div>

            {/* 3D Canvas */}
            <div className="chibi-office-canvas">
                <Canvas3DErrorBoundary>
                    <Canvas
                        dpr={[1, 1.5]}
                        gl={{
                            antialias: false,
                            powerPreference: "default",
                            failIfMajorPerformanceCaveat: false,
                            alpha: false,
                        }}
                        onCreated={({ gl }) => {
                            gl.setClearColor(timeColors.clearColor);
                            const canvas = gl.domElement;
                            canvas.addEventListener("webglcontextlost", (e) => {
                                e.preventDefault();
                                console.warn("[Chibi3D] WebGL context lost — will attempt recovery");
                            });
                            canvas.addEventListener("webglcontextrestored", () => {
                                console.info("[Chibi3D] WebGL context restored");
                            });
                        }}
                    >
                        <Suspense fallback={null}>
                            <ClearColorUpdater color={timeColors.clearColor} />
                            <PerspectiveCamera
                                makeDefault
                                position={cam.position}
                                fov={45}
                            />
                            <OrbitControls
                                target={cam.target}
                                minDistance={3}
                                maxDistance={40}
                                maxPolarAngle={Math.PI / 2.1}
                                enableDamping
                                dampingFactor={0.05}
                            />

                            {/* Lighting — bright warm professional */}
                            <ambientLight intensity={0.9} color="#fffbf0" />
                            <directionalLight
                                position={[10, 15, 8]}
                                intensity={1.2}
                                color="#fffaf0"
                            />
                            <directionalLight
                                position={[-5, 8, -3]}
                                intensity={0.4}
                                color="#e0e8ff"
                            />
                            <hemisphereLight
                                color="#fefce8"
                                groundColor="#d4a574"
                                intensity={0.5}
                            />



                            {/* The 3D office scene */}
                            <OfficeScene zoneLayouts={zoneLayouts} agentPositions={agentPositions} />
                        </Suspense>
                    </Canvas>
                </Canvas3DErrorBoundary>
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
                size="default"
            >
                {selectedAgent && (
                    <AgentDetail
                        agent={selectedAgent}
                        status={agentStatuses[selectedAgent.id]?.status || "idle"}
                        tasks={tasks.filter((t) => t.assignee_id === selectedAgent.id)}
                    />
                )}
            </Drawer>
        </div>
    );
}

/* ─── Agent Detail Panel ──────────────────────────────────────────── */
function AgentDetail({ agent, status, tasks: agentTasks }) {
    return (
        <div>
            <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12 }}>Status:</Text>
                <Tag color={STATUS_TAG_COLORS[status]} style={{ margin: 0 }}>
                    {STATUS_LABELS[status]}
                </Tag>
            </Flex>

            <div style={{ marginBottom: 16 }}>
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

const ROLE_EMOJIS = {
    lead: "👑", backend: "⚙️", frontend: "🎨",
    qa: "🧪", docs: "📄", security: "🛡️", custom: "🤖",
};

const STATUS_LABELS = {
    idle: "Idle", in_progress: "Working", blocked: "Blocked",
    review: "Reviewing", done: "Done", failed: "Failed",
};

const STATUS_TAG_COLORS = {
    idle: "default", in_progress: "processing", blocked: "warning",
    review: "purple", done: "success", failed: "error",
};
