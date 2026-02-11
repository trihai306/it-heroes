/**
 * WorkflowFlow — Single workflow per project (auto-load / auto-save)
 */
import { useState, useCallback, useEffect } from "react";
import {
    ReactFlow, Controls, Background, MiniMap,
    applyNodeChanges, applyEdgeChanges, addEdge,
    Handle, Position, MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button, Typography, Tooltip, message, Spin } from "antd";
import {
    SaveOutlined, ClearOutlined, NodeExpandOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";
import useWorkflowStore from "@/stores/useWorkflowStore";
import useProjectStore from "@/stores/useProjectStore";

const { Text } = Typography;

/* ═══════════════════ ROLE CONFIG ═══════════════════ */
const ROLE_CONFIG = {
    lead: { label: "Lead", emoji: "👑", color: "#d97706", bg: "#fffbeb", border: "#fde68a", shadow: "rgba(217,119,6,0.12)", gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)" },
    backend: { label: "Backend", emoji: "⚙️", color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe", shadow: "rgba(79,70,229,0.12)", gradient: "linear-gradient(135deg, #6366f1, #818cf8)" },
    frontend: { label: "Frontend", emoji: "🎨", color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8", shadow: "rgba(219,39,119,0.12)", gradient: "linear-gradient(135deg, #ec4899, #f472b6)" },
    qa: { label: "QA", emoji: "🧪", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", shadow: "rgba(5,150,105,0.12)", gradient: "linear-gradient(135deg, #10b981, #34d399)" },
    custom: { label: "Custom", emoji: "🤖", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", shadow: "rgba(124,58,237,0.12)", gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)" },
};

/* ═══════════════════ DEPARTMENT NODE ═══════════════════ */
function DepartmentNode({ data, selected }) {
    const cfg = ROLE_CONFIG[data.role] || ROLE_CONFIG.custom;
    return (
        <div style={{
            padding: "16px 28px", borderRadius: 16,
            background: "#fff",
            border: `2px solid ${selected ? cfg.color : cfg.border}`,
            minWidth: 150, textAlign: "center",
            boxShadow: selected
                ? `0 0 0 3px ${cfg.shadow}, 0 8px 24px ${cfg.shadow}`
                : `0 2px 12px rgba(0,0,0,0.06)`,
            cursor: "grab", transition: "all 0.25s ease",
            transform: selected ? "scale(1.03)" : "scale(1)",
        }}>
            <Handle type="target" position={Position.Left} style={{
                width: 12, height: 12, background: cfg.color,
                border: "3px solid #fff", borderRadius: "50%",
                boxShadow: `0 0 0 2px ${cfg.border}`,
            }} />
            <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: cfg.gradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 10px", fontSize: 20, color: "#fff",
                boxShadow: `0 4px 12px ${cfg.shadow}`,
            }}>
                {cfg.emoji}
            </div>
            <Text strong style={{ fontSize: 14, color: cfg.color, display: "block" }}>
                {cfg.label}
            </Text>
            {data.agentCount > 0 && (
                <Text style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, display: "block" }}>
                    {data.agentCount} agent{data.agentCount > 1 ? "s" : ""}
                </Text>
            )}
            <Handle type="source" position={Position.Right} style={{
                width: 12, height: 12, background: cfg.color,
                border: "3px solid #fff", borderRadius: "50%",
                boxShadow: `0 0 0 2px ${cfg.border}`,
            }} />
        </div>
    );
}

const nodeTypes = { department: DepartmentNode };

/* ── Topological sort ── */
function extractSteps(nodes, edges) {
    if (nodes.length === 0) return [];
    const adj = {}; const inDeg = {};
    nodes.forEach((n) => { adj[n.id] = []; inDeg[n.id] = 0; });
    edges.forEach((e) => { if (adj[e.source]) { adj[e.source].push(e.target); inDeg[e.target] = (inDeg[e.target] || 0) + 1; } });
    const queue = nodes.filter((n) => (inDeg[n.id] || 0) === 0).map((n) => n.id);
    const order = [];
    while (queue.length) {
        const cur = queue.shift(); order.push(cur);
        (adj[cur] || []).forEach((t) => { inDeg[t]--; if (inDeg[t] === 0) queue.push(t); });
    }
    return order.map((id) => nodes.find((n) => n.id === id)?.data?.role).filter(Boolean);
}

const EDGE_DEFAULTS = {
    type: "smoothstep",
    animated: true,
    style: { stroke: "#6366f1", strokeWidth: 2, strokeDasharray: "6 4" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1", width: 14, height: 14 },
};

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
export default function WorkflowFlow({ availableRoles, agentsByRole }) {
    const projectId = useProjectStore((s) => s.selectedProjectId);
    const {
        workflows, loading,
        fetchWorkflows, createWorkflow, updateWorkflow,
    } = useWorkflowStore();

    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // The single workflow for this project (first one)
    const currentWf = workflows.length > 0 ? workflows[0] : null;

    // Fetch & auto-load on mount
    useEffect(() => {
        if (projectId) fetchWorkflows(projectId);
    }, [projectId]);

    // Auto-load workflow into canvas when fetched
    useEffect(() => {
        if (loaded) return;
        if (currentWf) {
            if (currentWf.nodes_data?.length) {
                setNodes(currentWf.nodes_data.map((n) => ({ ...n, type: "department" })));
                setEdges((currentWf.edges_data || []).map((e) => ({ ...e, ...EDGE_DEFAULTS })));
            } else if (currentWf.steps?.length) {
                const newNodes = currentWf.steps.map((role, i) => ({
                    id: `${role}_${i}`, type: "department",
                    position: { x: 80 + i * 240, y: 80 },
                    data: { role, agentCount: agentsByRole?.[role]?.length || 0 },
                }));
                const newEdges = currentWf.steps.slice(0, -1).map((_, i) => ({
                    id: `e_${i}`, source: newNodes[i].id, target: newNodes[i + 1].id, ...EDGE_DEFAULTS,
                }));
                setNodes(newNodes); setEdges(newEdges);
            }
            setLoaded(true);
        }
    }, [currentWf, loaded, agentsByRole]);

    const onNodesChange = useCallback((changes) => setNodes((ns) => applyNodeChanges(changes, ns)), []);
    const onEdgesChange = useCallback((changes) => setEdges((es) => applyEdgeChanges(changes, es)), []);
    const onConnect = useCallback((params) => setEdges((es) => addEdge({ ...params, ...EDGE_DEFAULTS }, es)), []);

    const addNode = (role) => {
        if (nodes.some((n) => n.data.role === role)) return;
        const row = Math.floor(nodes.length / 3);
        const col = nodes.length % 3;
        setNodes((ns) => [...ns, {
            id: `${role}_${Date.now()}`,
            type: "department",
            position: { x: 80 + col * 240, y: 80 + row * 160 },
            data: { role, agentCount: agentsByRole?.[role]?.length || 0 },
        }]);
    };

    const handleSave = async () => {
        const steps = extractSteps(nodes, edges);
        if (steps.length < 2) { message.warning("Connect at least 2 departments"); return; }
        if (!projectId) { message.error("No project selected"); return; }

        setSaving(true);
        try {
            const payload = {
                name: "Default Workflow",
                steps,
                nodes_data: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
                edges_data: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
                is_active: true,
            };
            if (currentWf) {
                await updateWorkflow(currentWf.id, payload);
            } else {
                await createWorkflow(projectId, payload);
            }
            message.success("Workflow saved!");
        } catch {
            message.error("Failed to save");
        }
        setSaving(false);
    };

    const clearCanvas = () => { setNodes([]); setEdges([]); };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* ══════ TOOLBAR ══════ */}
            <div style={{
                display: "flex", alignItems: "center", gap: 8, padding: "12px 20px",
                borderBottom: "1px solid #f1f5f9",
                background: "#fafbfd", flexShrink: 0, flexWrap: "wrap",
            }}>
                {/* Department pills */}
                {availableRoles.map((role) => {
                    const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.custom;
                    const onCanvas = nodes.some((n) => n.data.role === role);
                    return (
                        <Tooltip key={role} title={onCanvas ? "Already on canvas" : `Add ${cfg.label}`}>
                            <Button size="small" onClick={() => addNode(role)}
                                disabled={onCanvas}
                                style={{
                                    borderRadius: 10,
                                    border: `1.5px solid ${onCanvas ? "#e2e8f0" : cfg.border}`,
                                    color: onCanvas ? "#cbd5e1" : cfg.color,
                                    background: onCanvas ? "#f8fafc" : cfg.bg,
                                    fontSize: 12, fontWeight: 600,
                                }}>
                                <span style={{ marginRight: 4 }}>{cfg.emoji}</span>
                                {cfg.label}
                            </Button>
                        </Tooltip>
                    );
                })}

                <div style={{ flex: 1 }} />

                {currentWf && (
                    <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        fontSize: 11, color: "#059669",
                    }}>
                        <CheckCircleOutlined /> Saved
                    </span>
                )}

                <Button size="small" icon={<ClearOutlined />} onClick={clearCanvas}
                    style={{ borderRadius: 10, fontSize: 12, border: "1px solid #e2e8f0", color: "#64748b" }}>
                    Clear
                </Button>
                <Button type="primary" size="small" icon={<SaveOutlined />}
                    onClick={handleSave} loading={saving}
                    style={{
                        borderRadius: 10, fontSize: 12, fontWeight: 600,
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        border: "none", color: "#fff",
                        boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
                    }}>
                    Save
                </Button>
            </div>

            {/* ══════ CANVAS ══════ */}
            <div style={{ flex: 1, minHeight: 300, position: "relative" }}>
                {loading && !loaded ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                        <Spin />
                    </div>
                ) : (
                    <ReactFlow
                        nodes={nodes} edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        fitView
                        style={{ background: "#f8fafc" }}
                        defaultEdgeOptions={EDGE_DEFAULTS}
                        connectionLineStyle={{ stroke: "#6366f1", strokeWidth: 2 }}
                    >
                        <Background color="#e2e8f0" gap={20} size={1} />
                        <Controls position="bottom-right" style={{
                            borderRadius: 10, overflow: "hidden",
                            border: "1px solid #e2e8f0", background: "#fff",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                        }} />
                        <MiniMap
                            nodeColor={(n) => ROLE_CONFIG[n.data?.role]?.color || "#94a3b8"}
                            style={{
                                borderRadius: 10, background: "#fff",
                                border: "1px solid #e2e8f0",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            }}
                            maskColor="rgba(99,102,241,0.06)"
                        />
                    </ReactFlow>
                )}

                {/* Empty State */}
                {nodes.length === 0 && !loading && (
                    <div style={{
                        position: "absolute", inset: 0, display: "flex",
                        flexDirection: "column", alignItems: "center", justifyContent: "center",
                        pointerEvents: "none", zIndex: 5,
                    }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: 16,
                            background: "#eef2ff", border: "1px solid #c7d2fe",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            marginBottom: 14,
                        }}>
                            <NodeExpandOutlined style={{ fontSize: 26, color: "#818cf8" }} />
                        </div>
                        <Text style={{ fontSize: 14, color: "#94a3b8", fontWeight: 500 }}>
                            Add departments, then drag to connect
                        </Text>
                        <Text style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}>
                            Each connection defines a task handoff between teams
                        </Text>
                    </div>
                )}
            </div>
        </div>
    );
}
