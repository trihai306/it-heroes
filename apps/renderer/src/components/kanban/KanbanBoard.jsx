/**
 * KanbanBoard — Department-based task board with workflow flow builder
 * Columns = Agent roles/departments. Drag tasks between departments to reassign.
 * Includes a workflow template system for defining task progression flows.
 */
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
    Button, Input, Typography, Select, Modal, Form, Tooltip, Popconfirm,
    Tag, Badge, Dropdown, message,
} from "antd";
import {
    PlusOutlined, DeleteOutlined, SearchOutlined, ClockCircleOutlined,
    CheckCircleFilled, ExclamationCircleFilled, SyncOutlined,
    MinusCircleOutlined, CloseCircleFilled, EditOutlined, EyeOutlined,
    UserOutlined, HolderOutlined, FilterOutlined, ThunderboltOutlined,
    FireOutlined, BranchesOutlined, ArrowRightOutlined, PlayCircleOutlined,
    SettingOutlined, SwapRightOutlined, RightOutlined, PlusCircleOutlined,
    TeamOutlined, InboxOutlined,
} from "@ant-design/icons";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import useProjectStore from "@/stores/useProjectStore";
import useTaskStore from "@/stores/useTaskStore";
import useAgentStore from "@/stores/useAgentStore";
import useWorkflowStore from "@/stores/useWorkflowStore";
import WorkflowFlow from "./WorkflowFlow";

const { Title, Text } = Typography;
const { TextArea } = Input;

/* ═══════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                         */
/* ═══════════════════════════════════════════════════════════════════ */

const ROLE_CONFIG = {
    lead: { label: "Lead", emoji: "👑", gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)", color: "#fbbf24", lightColor: "#fde68a", glow: "rgba(251,191,36,0.15)", bgTint: "rgba(245,158,11,0.04)" },
    backend: { label: "Backend", emoji: "⚙️", gradient: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#818cf8", lightColor: "#a5b4fc", glow: "rgba(129,140,248,0.15)", bgTint: "rgba(99,102,241,0.04)" },
    frontend: { label: "Frontend", emoji: "🎨", gradient: "linear-gradient(135deg, #ec4899, #f472b6)", color: "#f472b6", lightColor: "#f9a8d4", glow: "rgba(244,114,182,0.15)", bgTint: "rgba(236,72,153,0.04)" },
    qa: { label: "QA", emoji: "🧪", gradient: "linear-gradient(135deg, #22c55e, #4ade80)", color: "#4ade80", lightColor: "#86efac", glow: "rgba(74,222,128,0.15)", bgTint: "rgba(34,197,94,0.04)" },
    docs: { label: "Docs", emoji: "📄", gradient: "linear-gradient(135deg, #3b82f6, #60a5fa)", color: "#60a5fa", lightColor: "#93c5fd", glow: "rgba(96,165,250,0.15)", bgTint: "rgba(59,130,246,0.04)" },
    security: { label: "Security", emoji: "🛡️", gradient: "linear-gradient(135deg, #ef4444, #f87171)", color: "#f87171", lightColor: "#fca5a5", glow: "rgba(248,113,113,0.15)", bgTint: "rgba(239,68,68,0.04)" },
    custom: { label: "Custom", emoji: "🤖", gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)", color: "#a78bfa", lightColor: "#c4b5fd", glow: "rgba(167,139,250,0.15)", bgTint: "rgba(139,92,246,0.04)" },
};

const UNASSIGNED_COL = {
    label: "Unassigned", emoji: "📥",
    gradient: "linear-gradient(135deg, #64748b, #94a3b8)",
    color: "#94a3b8", lightColor: "#cbd5e1",
    glow: "rgba(148,163,184,0.12)", bgTint: "rgba(100,116,139,0.04)",
};

const STATUS_CONFIG = {
    todo: { label: "To Do", color: "#94a3b8", icon: <MinusCircleOutlined />, bg: "rgba(148,163,184,0.12)" },
    in_progress: { label: "In Progress", color: "#818cf8", icon: <SyncOutlined spin />, bg: "rgba(129,140,248,0.12)" },
    blocked: { label: "Blocked", color: "#fbbf24", icon: <ExclamationCircleFilled />, bg: "rgba(251,191,36,0.12)" },
    review: { label: "Review", color: "#c084fc", icon: <EyeOutlined />, bg: "rgba(192,132,252,0.12)" },
    done: { label: "Done", color: "#4ade80", icon: <CheckCircleFilled />, bg: "rgba(74,222,128,0.12)" },
    failed: { label: "Failed", color: "#f87171", icon: <CloseCircleFilled />, bg: "rgba(248,113,113,0.12)" },
};

const PRIORITIES = [
    { value: 1, label: "Urgent", color: "#ef4444", icon: <FireOutlined />, bg: "rgba(239,68,68,0.12)" },
    { value: 2, label: "High", color: "#f59e0b", icon: <ThunderboltOutlined />, bg: "rgba(245,158,11,0.10)" },
    { value: 3, label: "Medium", color: "#6366f1", icon: null, bg: "rgba(99,102,241,0.10)" },
    { value: 4, label: "Low", color: "#64748b", icon: null, bg: "rgba(100,116,139,0.10)" },
];

/* Workflow localStorage is now managed inside WorkflowFlow component */


/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN KANBAN BOARD                                                 */
/* ═══════════════════════════════════════════════════════════════════ */
export default function KanbanBoard() {
    const tasks = useTaskStore((s) => s.tasks);
    const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
    const createTask = useTaskStore((s) => s.createTask);
    const updateTask = useTaskStore((s) => s.updateTask);
    const deleteTask = useTaskStore((s) => s.deleteTask);
    const agents = useAgentStore((s) => s.agents);

    const [showNewTask, setShowNewTask] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newPriority, setNewPriority] = useState(3);
    const [newAssignee, setNewAssignee] = useState(null);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState(null);

    // Workflow (from store)
    const { activeWorkflow, fetchWorkflows } = useWorkflowStore();
    const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(false);

    // Fetch workflows when project changes
    useEffect(() => { if (selectedProjectId) fetchWorkflows(selectedProjectId); }, [selectedProjectId]);

    /* ── Compute columns from agents — ordered by workflow steps ── */
    const departmentColumns = useMemo(() => {
        const roleMap = {};
        agents.forEach((agent) => {
            const role = agent.role || "custom";
            if (!roleMap[role]) roleMap[role] = [];
            roleMap[role].push(agent);
        });

        const columns = [];

        // Unassigned column always first
        columns.push({ key: "__unassigned__", config: UNASSIGNED_COL, agents: [] });

        // Use workflow step order when available, fallback to default
        const workflowSteps = activeWorkflow?.steps?.length > 0 ? activeWorkflow.steps : null;
        const defaultOrder = ["lead", "backend", "frontend", "qa", "docs", "security", "custom"];
        const primaryOrder = workflowSteps || defaultOrder;

        const addedRoles = new Set();

        // Add columns in workflow/primary order
        primaryOrder.forEach((role) => {
            if (addedRoles.has(role)) return;
            addedRoles.add(role);
            if (roleMap[role] && roleMap[role].length > 0) {
                columns.push({
                    key: role,
                    config: ROLE_CONFIG[role] || ROLE_CONFIG.custom,
                    agents: roleMap[role],
                });
            }
        });

        // Append any remaining roles with agents that weren't in the workflow
        defaultOrder.forEach((role) => {
            if (addedRoles.has(role)) return;
            if (roleMap[role] && roleMap[role].length > 0) {
                columns.push({
                    key: role,
                    config: ROLE_CONFIG[role] || ROLE_CONFIG.custom,
                    agents: roleMap[role],
                });
            }
        });

        return columns;
    }, [agents, activeWorkflow]);

    /* ── Group tasks by department ── */
    const filteredTasks = useMemo(() => {
        return tasks.filter((t) => {
            if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
            if (filterStatus && t.status !== filterStatus) return false;
            return true;
        });
    }, [tasks, search, filterStatus]);

    const tasksByDepartment = useMemo(() => {
        const grouped = {};
        departmentColumns.forEach((col) => { grouped[col.key] = []; });

        filteredTasks.forEach((task) => {
            if (!task.assigned_agent_id) {
                grouped["__unassigned__"]?.push(task);
                return;
            }
            const agent = agents.find((a) => a.id === task.assigned_agent_id);
            if (agent) {
                const role = agent.role || "custom";
                if (grouped[role]) grouped[role].push(task);
                else grouped["__unassigned__"]?.push(task);
            } else {
                grouped["__unassigned__"]?.push(task);
            }
        });

        return grouped;
    }, [filteredTasks, departmentColumns, agents]);

    /* ── Stats ── */
    const stats = useMemo(() => ({
        total: tasks.length,
        inProgress: tasks.filter((t) => t.status === "in_progress").length,
        done: tasks.filter((t) => t.status === "done").length,
        unassigned: tasks.filter((t) => !t.assigned_agent_id).length,
    }), [tasks]);

    /* ── Create Task ── */
    const handleCreateTask = async () => {
        if (!newTitle.trim()) return;
        await createTask(selectedProjectId, {
            title: newTitle.trim(),
            description: newDesc.trim() || null,
            priority: newPriority,
            assigned_agent_id: newAssignee,
        });
        setNewTitle(""); setNewDesc(""); setNewPriority(3); setNewAssignee(null);
        setShowNewTask(false);
    };

    /* ── Drag & Drop: reassign agent by department ── */
    const onDragEnd = useCallback(async (result) => {
        const { draggableId, destination, source } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const targetDept = destination.droppableId;
        const taskId = isNaN(draggableId) ? draggableId : Number(draggableId);

        if (targetDept === "__unassigned__") {
            // Move to unassigned
            await updateTask(taskId, { assigned_agent_id: null });
            message.info("Task unassigned");
        } else {
            // Find least-loaded agent in target department
            const deptAgents = agents.filter((a) => a.role === targetDept);
            if (deptAgents.length === 0) return;

            // Count tasks per agent in this dept
            const loadMap = {};
            deptAgents.forEach((a) => { loadMap[a.id] = 0; });
            tasks.forEach((t) => {
                if (t.assigned_agent_id && loadMap[t.assigned_agent_id] !== undefined) {
                    loadMap[t.assigned_agent_id]++;
                }
            });

            // Pick least loaded
            deptAgents.sort((a, b) => (loadMap[a.id] || 0) - (loadMap[b.id] || 0));
            const targetAgent = deptAgents[0];

            await updateTask(taskId, { assigned_agent_id: targetAgent.id });
            message.success(`Assigned to ${targetAgent.name} (${ROLE_CONFIG[targetDept]?.label || targetDept})`);
        }
    }, [updateTask, agents, tasks]);

    /* ── Workflow: move task to next step ── */
    const moveTaskToNextStep = useCallback(async (task, workflow) => {
        if (!workflow || !workflow.steps) return;

        const agent = agents.find((a) => a.id === task.assigned_agent_id);
        const isUnassigned = !task.assigned_agent_id;
        const currentRole = agent?.role || "__unassigned__";
        // Unassigned tasks are at step -1 (before the workflow), so next = step 0
        const stepIdx = isUnassigned ? -1 : workflow.steps.indexOf(currentRole);

        if (!isUnassigned && (stepIdx < 0 || stepIdx >= workflow.steps.length - 1)) {
            message.info("Task already at final step");
            return;
        }

        const nextRole = workflow.steps[stepIdx + 1];
        const nextAgents = agents.filter((a) => a.role === nextRole);
        if (nextAgents.length === 0) {
            message.warning(`No agents in ${ROLE_CONFIG[nextRole]?.label || nextRole} department`);
            return;
        }

        // Least loaded
        const loadMap = {};
        nextAgents.forEach((a) => { loadMap[a.id] = 0; });
        tasks.forEach((t) => {
            if (t.assigned_agent_id && loadMap[t.assigned_agent_id] !== undefined) loadMap[t.assigned_agent_id]++;
        });
        nextAgents.sort((a, b) => (loadMap[a.id] || 0) - (loadMap[b.id] || 0));

        await updateTask(task.id, { assigned_agent_id: nextAgents[0].id });
        message.success(`Moved to ${nextAgents[0].name} → ${ROLE_CONFIG[nextRole]?.label}`);
    }, [agents, tasks, updateTask]);

    const clearFilters = () => { setSearch(""); setFilterStatus(null); };
    const hasFilters = search || filterStatus;

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>

            {/* ── Header ── */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 16, flexShrink: 0,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: "linear-gradient(135deg, #6366f1, #a78bfa)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, boxShadow: "0 4px 14px rgba(99,102,241,0.25)",
                    }}>
                        <TeamOutlined style={{ color: "#fff" }} />
                    </div>
                    <div>
                        <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: -0.5 }}>
                            Department Board
                        </Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Drag tasks between departments · Define workflow flows
                        </Text>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <Button
                        icon={<BranchesOutlined />}
                        onClick={() => setShowWorkflowBuilder(true)}
                        style={{
                            height: 40, paddingInline: 18, fontWeight: 600, fontSize: 13,
                            borderRadius: 10, border: "1px solid rgba(99,102,241,0.2)",
                            color: "#818cf8", background: "rgba(99,102,241,0.06)",
                        }}
                    >
                        Workflows
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setShowNewTask(true)}
                        style={{
                            height: 40, paddingInline: 24, fontWeight: 600, fontSize: 13,
                            borderRadius: 10,
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            border: "none", boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
                        }}
                    >
                        New Task
                    </Button>
                </div>
            </div>

            {/* ── Stats + Filters ── */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 14, flexShrink: 0, flexWrap: "wrap", gap: 10,
            }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {[
                        { label: "Total", value: stats.total, color: "var(--text-primary)", border: "var(--border-default)" },
                        { label: "Active", value: stats.inProgress, color: "#818cf8", border: "rgba(129,140,248,0.2)" },
                        { label: "Done", value: stats.done, color: "#4ade80", border: "rgba(74,222,128,0.2)" },
                        { label: "Unassigned", value: stats.unassigned, color: "#94a3b8", border: "rgba(148,163,184,0.2)" },
                    ].map(({ label, value, color, border }) => (
                        <div key={label} style={{
                            padding: "4px 12px", borderRadius: 20,
                            background: "var(--bg-surface)", border: `1px solid ${border}`,
                            display: "flex", alignItems: "center", gap: 7,
                        }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color, fontFamily: '"JetBrains Mono", monospace', lineHeight: 1 }}>{value}</span>
                            <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
                        </div>
                    ))}

                    {/* Active Workflow indicator */}
                    {activeWorkflow && (
                        <div style={{
                            padding: "4px 12px", borderRadius: 20,
                            background: "rgba(99,102,241,0.08)",
                            border: "1px solid rgba(99,102,241,0.15)",
                            display: "flex", alignItems: "center", gap: 6,
                            cursor: "pointer",
                        }}
                            onClick={() => setShowWorkflowBuilder(true)}
                        >
                            <BranchesOutlined style={{ fontSize: 11, color: "#818cf8" }} />
                            <span style={{ fontSize: 10.5, color: "#818cf8", fontWeight: 600 }}>
                                {activeWorkflow.name}
                            </span>
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: "var(--text-faint)", fontSize: 12 }} />}
                        placeholder="Search..."
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        size="small" allowClear
                        style={{ width: 170, fontSize: 12, borderRadius: 8, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
                    />
                    <Select
                        placeholder="Status"
                        value={filterStatus} onChange={setFilterStatus}
                        size="small" allowClear
                        style={{ width: 130, fontSize: 11 }}
                        options={Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
                            label: <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color }} />{cfg.label}
                            </div>,
                            value: key,
                        }))}
                    />
                    {hasFilters && (
                        <Button type="link" size="small" onClick={clearFilters}
                            style={{ fontSize: 11, color: "#818cf8", padding: "0 6px" }}>
                            Clear · {filteredTasks.length}/{tasks.length}
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Workflow Flow Visualization ── */}
            {activeWorkflow && activeWorkflow.steps.length > 1 && (
                <WorkflowFlowBar workflow={activeWorkflow} tasks={tasks} agents={agents} />
            )}

            {/* ── New Task Modal ── */}
            <Modal
                title={
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 14, color: "#fff",
                        }}><EditOutlined /></div>
                        <span style={{ fontWeight: 700, fontSize: 16 }}>Create New Task</span>
                    </div>
                }
                open={showNewTask} onOk={handleCreateTask} onCancel={() => setShowNewTask(false)}
                okText="Create Task"
                okButtonProps={{ disabled: !newTitle.trim(), style: { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", fontWeight: 600, borderRadius: 8 } }}
                cancelButtonProps={{ style: { borderRadius: 8 } }}
                width={520}
            >
                <Form layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item label={<Text strong style={{ fontSize: 12 }}>Title</Text>}>
                        <Input placeholder="What needs to be done?" value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)} onPressEnter={handleCreateTask} autoFocus style={{ borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item label={<Text strong style={{ fontSize: 12 }}>Description</Text>}>
                        <TextArea placeholder="Add details..." value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)} rows={3} style={{ borderRadius: 8 }} />
                    </Form.Item>
                    <div style={{ display: "flex", gap: 12 }}>
                        <Form.Item label={<Text strong style={{ fontSize: 12 }}>Priority</Text>} style={{ flex: 1 }}>
                            <Select value={newPriority} onChange={setNewPriority}
                                options={PRIORITIES.map((p) => ({
                                    label: <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />{p.label}
                                    </div>, value: p.value,
                                }))} />
                        </Form.Item>
                        {agents.length > 0 && (
                            <Form.Item label={<Text strong style={{ fontSize: 12 }}>Assign To</Text>} style={{ flex: 1 }}>
                                <Select value={newAssignee} onChange={setNewAssignee} allowClear placeholder="Unassigned"
                                    options={agents.map((a) => ({
                                        label: <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <span style={{ fontSize: 13 }}>{ROLE_CONFIG[a.role]?.emoji || "🤖"}</span>{a.name}
                                        </div>, value: a.id,
                                    }))} />
                            </Form.Item>
                        )}
                    </div>
                </Form>
            </Modal>

            {/* ── Workflow Builder Modal (React Flow) ── */}
            <Modal
                title={
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: "linear-gradient(135deg, #6366f1, #a78bfa)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 14, color: "#fff",
                        }}><BranchesOutlined /></div>
                        <span style={{ fontWeight: 700, fontSize: 16 }}>Workflow Builder</span>
                    </div>
                }
                open={showWorkflowBuilder}
                onCancel={() => setShowWorkflowBuilder(false)}
                footer={null}
                width="85vw"
                styles={{ body: { padding: 0, height: "70vh", display: "flex", flexDirection: "column" } }}
                destroyOnHidden
            >
                <WorkflowFlow
                    availableRoles={departmentColumns.filter((c) => c.key !== "__unassigned__").map((c) => c.key)}
                    agentsByRole={departmentColumns.reduce((acc, c) => { if (c.key !== "__unassigned__") acc[c.key] = c.agents; return acc; }, {})}
                    onClose={() => setShowWorkflowBuilder(false)}
                />
            </Modal>

            {/* ═══════════════════════════════════════════════ */}
            {/*  DEPARTMENT COLUMNS — DRAG & DROP              */}
            {/* ═══════════════════════════════════════════════ */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="kanban-scroll" style={{
                    display: "flex", gap: 12, flex: 1, overflowX: "auto",
                    paddingBottom: 12, minHeight: 0, paddingRight: 4,
                }}>
                    {departmentColumns.map((col) => (
                        <DepartmentColumn
                            key={col.key}
                            column={col}
                            tasks={tasksByDepartment[col.key] || []}
                            allAgents={agents}
                            activeWorkflow={activeWorkflow}
                            onMoveNext={(task) => moveTaskToNextStep(task, activeWorkflow)}
                            onStatusChange={(taskId, status) => updateTask(taskId, { status })}
                            onDelete={deleteTask}
                        />
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
}


/* ═══════════════════════════════════════════════════════════════════ */
/*  WORKFLOW FLOW BAR — Visual flow between departments               */
/* ═══════════════════════════════════════════════════════════════════ */
function WorkflowFlowBar({ workflow, tasks, agents }) {
    if (!workflow?.steps || workflow.steps.length < 2) return null;

    // Count unassigned tasks (first step in the workflow pipeline)
    const unassignedCount = tasks.filter((t) => !t.assigned_agent_id).length;

    // Count tasks at each step
    const stepCounts = workflow.steps.map((role) => {
        const roleAgentIds = agents.filter((a) => a.role === role).map((a) => a.id);
        return tasks.filter((t) => roleAgentIds.includes(t.assigned_agent_id)).length;
    });

    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 0, marginBottom: 14, flexShrink: 0,
            padding: "10px 20px", borderRadius: 12,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 12 }}>
                <BranchesOutlined style={{ fontSize: 12, color: "#818cf8" }} />
                <Text style={{ fontSize: 11, fontWeight: 700, color: "#818cf8" }}>
                    {workflow.name}
                </Text>
            </div>

            {/* ── Step 0: Unassigned (entry point) ── */}
            <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", borderRadius: 20,
                    background: UNASSIGNED_COL.glow,
                    border: `1px solid ${UNASSIGNED_COL.color}30`,
                }}>
                    <span style={{ fontSize: 13 }}>{UNASSIGNED_COL.emoji}</span>
                    <Text style={{ fontSize: 11, fontWeight: 600, color: UNASSIGNED_COL.color }}>
                        Unassigned
                    </Text>
                    {unassignedCount > 0 && (
                        <Badge count={unassignedCount} size="small"
                            style={{ backgroundColor: UNASSIGNED_COL.color, fontSize: 9, minWidth: 16, height: 16, lineHeight: "16px" }} />
                    )}
                </div>
                {/* Arrow to first workflow step */}
                <div style={{
                    display: "flex", alignItems: "center",
                    padding: "0 6px", color: "var(--text-faint)",
                }}>
                    <div style={{
                        width: 24, height: 2,
                        background: "linear-gradient(90deg, var(--border-default), var(--text-faint))",
                        borderRadius: 1,
                    }} />
                    <RightOutlined style={{ fontSize: 8, marginLeft: -2 }} />
                </div>
            </div>

            {workflow.steps.map((role, i) => {
                const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.custom;
                return (
                    <div key={`${role}-${i}`} style={{ display: "flex", alignItems: "center" }}>
                        {/* Step node */}
                        <div style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "5px 12px", borderRadius: 20,
                            background: cfg.glow,
                            border: `1px solid ${cfg.color}30`,
                        }}>
                            <span style={{ fontSize: 13 }}>{cfg.emoji}</span>
                            <Text style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>
                                {cfg.label}
                            </Text>
                            {stepCounts[i] > 0 && (
                                <Badge count={stepCounts[i]} size="small"
                                    style={{ backgroundColor: cfg.color, fontSize: 9, minWidth: 16, height: 16, lineHeight: "16px" }} />
                            )}
                        </div>

                        {/* Arrow connector */}
                        {i < workflow.steps.length - 1 && (
                            <div style={{
                                display: "flex", alignItems: "center",
                                padding: "0 6px", color: "var(--text-faint)",
                            }}>
                                <div style={{
                                    width: 24, height: 2,
                                    background: "linear-gradient(90deg, var(--border-default), var(--text-faint))",
                                    borderRadius: 1,
                                }} />
                                <RightOutlined style={{ fontSize: 8, marginLeft: -2 }} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}


/* ═══════════════════════════════════════════════════════════════════ */
/*  DEPARTMENT COLUMN (Droppable)                                     */
/* ═══════════════════════════════════════════════════════════════════ */
function DepartmentColumn({ column, tasks, allAgents, activeWorkflow, onMoveNext, onStatusChange, onDelete }) {
    const { key, config, agents: colAgents } = column;

    return (
        <div style={{
            flex: "0 0 280px",
            display: "flex", flexDirection: "column",
            borderRadius: 14,
            background: config.bgTint,
            border: "1px solid var(--border-subtle)",
            overflow: "hidden",
            transition: "all 0.25s ease",
        }}>
            {/* ── Column Header ── */}
            <div style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--border-subtle)",
                flexShrink: 0,
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: colAgents.length > 0 ? 8 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: config.gradient,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, color: "#fff",
                            boxShadow: `0 2px 8px ${config.glow}`,
                        }}>
                            {config.emoji}
                        </div>
                        <Text strong style={{ fontSize: 13, letterSpacing: -0.2 }}>
                            {config.label}
                        </Text>
                    </div>
                    <div style={{
                        minWidth: 24, height: 24, borderRadius: 8, padding: "0 7px",
                        background: tasks.length > 0 ? config.glow : "transparent",
                        color: tasks.length > 0 ? config.color : "var(--text-faint)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace',
                        border: tasks.length === 0 ? "1px solid var(--border-subtle)" : `1px solid ${config.glow}`,
                        transition: "all 0.2s ease",
                    }}>
                        {tasks.length}
                    </div>
                </div>

                {/* Agent avatars row */}
                {colAgents.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {colAgents.map((agent) => {
                            const agentTaskCount = tasks.filter((t) => t.assigned_agent_id === agent.id).length;
                            return (
                                <Tooltip key={agent.id} title={`${agent.name} · ${agentTaskCount} tasks`}>
                                    <div style={{
                                        display: "flex", alignItems: "center", gap: 4,
                                        padding: "2px 8px 2px 3px", borderRadius: 12,
                                        background: "var(--bg-container)",
                                        border: "1px solid var(--border-subtle)",
                                        fontSize: 10, cursor: "default",
                                    }}>
                                        <div style={{
                                            width: 18, height: 18, borderRadius: "50%",
                                            background: config.gradient,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 8, color: "#fff", fontWeight: 700,
                                        }}>
                                            {agent.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span style={{ fontWeight: 500, color: "var(--text-secondary)", fontSize: 10 }}>
                                            {agent.name}
                                        </span>
                                        {agentTaskCount > 0 && (
                                            <span style={{ fontWeight: 700, color: config.color, fontSize: 9, fontFamily: '"JetBrains Mono", monospace' }}>
                                                {agentTaskCount}
                                            </span>
                                        )}
                                    </div>
                                </Tooltip>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Droppable Area ── */}
            <Droppable droppableId={key}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                            flex: 1, display: "flex", flexDirection: "column",
                            gap: 8, padding: 8, overflowY: "auto", minHeight: 80,
                            transition: "all 0.25s ease", borderRadius: "0 0 14px 14px",
                            position: "relative",
                            ...(snapshot.isDraggingOver ? {
                                background: config.glow, boxShadow: `inset 0 0 0 2px ${config.color}40`,
                            } : {}),
                        }}
                    >
                        {tasks.map((task, index) => (
                            <TaskCard
                                key={task.id} task={task} index={index}
                                agents={allAgents} column={column}
                                activeWorkflow={activeWorkflow}
                                onMoveNext={() => onMoveNext(task)}
                                onStatusChange={onStatusChange}
                                onDelete={() => onDelete(task.id)}
                            />
                        ))}
                        {provided.placeholder}

                        {tasks.length === 0 && !snapshot.isDraggingOver && (
                            <div style={{
                                flex: 1, display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center",
                                padding: "28px 12px", opacity: 0.3,
                            }}>
                                {key === "__unassigned__" ? (
                                    <InboxOutlined style={{ fontSize: 22, marginBottom: 6 }} />
                                ) : (
                                    <span style={{ fontSize: 22, marginBottom: 6 }}>{config.emoji}</span>
                                )}
                                <Text type="secondary" style={{ fontSize: 11 }}>No tasks</Text>
                            </div>
                        )}

                        {tasks.length === 0 && snapshot.isDraggingOver && (
                            <div style={{
                                flex: 1, display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center",
                                padding: "28px 12px", borderRadius: 10,
                                border: `2px dashed ${config.color}60`, background: config.glow,
                            }}>
                                <Text style={{ fontSize: 12, color: config.color, fontWeight: 600 }}>
                                    Drop here
                                </Text>
                            </div>
                        )}
                    </div>
                )}
            </Droppable>
        </div>
    );
}


/* ═══════════════════════════════════════════════════════════════════ */
/*  TASK CARD (Draggable) — with status indicator & workflow action   */
/* ═══════════════════════════════════════════════════════════════════ */
function TaskCard({ task, index, agents, column, activeWorkflow, onMoveNext, onStatusChange, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const assignedAgent = agents.find((a) => a.id === task.assigned_agent_id);
    const priority = PRIORITIES.find((p) => p.value === task.priority) || PRIORITIES[2];
    const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
    const colConfig = column.config;

    // Is this task in the active workflow? Unassigned = step -1, can always move next
    const canMoveNext = useMemo(() => {
        if (!activeWorkflow?.steps || activeWorkflow.steps.length === 0) return false;
        if (!assignedAgent) return true; // Unassigned → can move to first step
        const idx = activeWorkflow.steps.indexOf(assignedAgent.role);
        return idx >= 0 && idx < activeWorkflow.steps.length - 1;
    }, [activeWorkflow, assignedAgent]);

    return (
        <Draggable draggableId={String(task.id)} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`kanban-card ${snapshot.isDragging ? "kanban-card-dragging" : ""}`}
                    onClick={() => setExpanded(!expanded)}
                    style={{
                        borderRadius: 12,
                        background: "var(--bg-container)",
                        border: snapshot.isDragging ? `1.5px solid ${colConfig.color}60` : "1px solid var(--border-subtle)",
                        cursor: "grab",
                        transition: snapshot.isDragging ? "none" : "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                        position: "relative", overflow: "hidden",
                        boxShadow: snapshot.isDragging
                            ? `0 20px 40px rgba(0,0,0,0.35), 0 0 0 1px ${colConfig.color}30`
                            : "0 1px 3px rgba(0,0,0,0.12)",
                        transform: snapshot.isDragging ? "rotate(2deg) scale(1.03)" : "none",
                        opacity: snapshot.isDragging ? 0.96 : 1,
                        ...provided.draggableProps.style,
                    }}
                >
                    {/* Top accent line */}
                    <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, height: 3,
                        background: colConfig.gradient,
                        opacity: snapshot.isDragging ? 1 : 0.5,
                        transition: "opacity 0.2s ease",
                    }} />

                    <div style={{ padding: "14px 14px 12px" }}>
                        {/* Priority + Status + Drag Handle */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {/* Priority */}
                                <div style={{
                                    display: "inline-flex", alignItems: "center", gap: 3,
                                    padding: "2px 7px", borderRadius: 5,
                                    background: priority.bg, fontSize: 9, fontWeight: 700,
                                    color: priority.color, letterSpacing: 0.3,
                                    border: `1px solid ${priority.color}18`,
                                }}>
                                    {priority.icon && <span style={{ fontSize: 9 }}>{priority.icon}</span>}
                                    {priority.label.toUpperCase()}
                                </div>
                                {/* Status chip */}
                                <div style={{
                                    display: "inline-flex", alignItems: "center", gap: 3,
                                    padding: "2px 7px", borderRadius: 5,
                                    background: status.bg, fontSize: 9, fontWeight: 600,
                                    color: status.color,
                                    border: `1px solid ${status.color}18`,
                                }}>
                                    <span style={{ fontSize: 8 }}>{status.icon}</span>
                                    {status.label}
                                </div>
                            </div>
                            {/* Drag handle */}
                            <div {...provided.dragHandleProps} className="kanban-drag-handle"
                                style={{
                                    width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                                    borderRadius: 5, cursor: "grab", color: "var(--text-faint)", fontSize: 11, opacity: 0,
                                    transition: "all 0.15s ease",
                                }}>
                                <HolderOutlined />
                            </div>
                        </div>

                        {/* Title */}
                        <Text strong style={{ fontSize: 13, lineHeight: 1.45, display: "block", letterSpacing: -0.15, marginBottom: 3 }}>
                            {task.title}
                        </Text>

                        {/* Description */}
                        {task.description && (
                            <Text type="secondary" style={{
                                fontSize: 11, lineHeight: 1.5, display: "block", marginBottom: 6,
                                overflow: expanded ? "visible" : "hidden",
                                textOverflow: expanded ? "unset" : "ellipsis",
                                whiteSpace: expanded ? "normal" : "nowrap",
                                maxHeight: expanded ? "none" : "18px",
                            }}>
                                {task.description}
                            </Text>
                        )}

                        {/* Footer: Agent + Next Step */}
                        <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            marginTop: 8, paddingTop: 7, borderTop: "1px solid var(--border-subtle)",
                        }}>
                            {assignedAgent ? (
                                <Tooltip title={`${assignedAgent.name} · ${assignedAgent.role}`}>
                                    <div style={{
                                        display: "flex", alignItems: "center", gap: 5,
                                        padding: "1px 7px 1px 1px", borderRadius: 14,
                                        background: `${colConfig.color}12`,
                                    }}>
                                        <div style={{
                                            width: 20, height: 20, borderRadius: "50%",
                                            background: colConfig.gradient,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 9, color: "#fff", fontWeight: 700,
                                        }}>
                                            {assignedAgent.name.charAt(0).toUpperCase()}
                                        </div>
                                        <Text style={{ fontSize: 10, fontWeight: 600, color: colConfig.color }}>
                                            {assignedAgent.name}
                                        </Text>
                                    </div>
                                </Tooltip>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: 4, opacity: 0.35 }}>
                                    <UserOutlined style={{ fontSize: 10 }} />
                                    <Text type="secondary" style={{ fontSize: 10, fontStyle: "italic" }}>Unassigned</Text>
                                </div>
                            )}

                            {canMoveNext && !expanded && (
                                <Tooltip title="Move to next department in workflow">
                                    <Button type="text" size="small"
                                        icon={<SwapRightOutlined />}
                                        onClick={(e) => { e.stopPropagation(); onMoveNext(); }}
                                        style={{
                                            height: 22, width: 22, padding: 0, borderRadius: 6,
                                            color: "#818cf8", fontSize: 12,
                                        }}
                                    />
                                </Tooltip>
                            )}

                            {!canMoveNext && !expanded && task.created_at && (
                                <Text type="secondary" style={{
                                    fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
                                    display: "flex", alignItems: "center", gap: 3,
                                }}>
                                    <ClockCircleOutlined style={{ fontSize: 9 }} />
                                    {new Date(task.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </Text>
                            )}
                        </div>

                        {/* Expanded Actions */}
                        {expanded && !snapshot.isDragging && (
                            <div className="animate-fade-in" style={{
                                marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-subtle)",
                                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
                            }}>
                                <Select
                                    value={task.status}
                                    onChange={(value) => onStatusChange(task.id, value)}
                                    onClick={(e) => e.stopPropagation()}
                                    size="small" style={{ width: 130, fontSize: 10 }}
                                    options={Object.entries(STATUS_CONFIG).map(([k, cfg]) => ({
                                        label: <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <div style={{ width: 7, height: 7, borderRadius: 2, background: cfg.color }} />
                                            <span style={{ fontSize: 11 }}>{cfg.label}</span>
                                        </div>,
                                        value: k,
                                    }))}
                                />
                                <div style={{ display: "flex", gap: 4 }}>
                                    {canMoveNext && (
                                        <Tooltip title="Next workflow step">
                                            <Button type="text" size="small"
                                                icon={<SwapRightOutlined />}
                                                onClick={(e) => { e.stopPropagation(); onMoveNext(); }}
                                                style={{ width: 28, height: 28, padding: 0, borderRadius: 7, color: "#818cf8" }}
                                            />
                                        </Tooltip>
                                    )}
                                    <Popconfirm title="Delete this task?"
                                        onConfirm={(e) => { e?.stopPropagation(); onDelete(); }}
                                        onCancel={(e) => e?.stopPropagation()}
                                        okText="Delete" okButtonProps={{ danger: true }}>
                                        <Button type="text" size="small" danger
                                            icon={<DeleteOutlined />}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ width: 28, height: 28, padding: 0, borderRadius: 7 }}
                                        />
                                    </Popconfirm>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Draggable>
    );
}


/* WorkflowBuilderModal removed — replaced by WorkflowFlow component */
/* eslint-disable no-unused-vars */
function _WorkflowBuilderModal_REMOVED({ open, onClose, workflows, setWorkflows, activeWorkflow, setActiveWorkflow, availableRoles }) {
    const [newName, setNewName] = useState("");
    const [newSteps, setNewSteps] = useState([]);

    const handleCreate = () => {
        if (!newName.trim() || newSteps.length < 2) {
            message.warning("Name + at least 2 steps required");
            return;
        }
        const wf = { id: Date.now(), name: newName.trim(), steps: [...newSteps] };
        const updated = [...workflows, wf];
        setWorkflows(updated);
        setNewName(""); setNewSteps([]);
        message.success("Workflow created!");
    };

    const handleDelete = (id) => {
        setWorkflows((prev) => prev.filter((w) => w.id !== id));
        if (activeWorkflow?.id === id) setActiveWorkflow(null);
    };

    const handleActivate = (wf) => {
        setActiveWorkflow(activeWorkflow?.id === wf.id ? null : wf);
    };

    const addStep = (role) => {
        setNewSteps((prev) => [...prev, role]);
    };

    const removeStep = (idx) => {
        setNewSteps((prev) => prev.filter((_, i) => i !== idx));
    };

    return (
        <Modal
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: "linear-gradient(135deg, #6366f1, #a78bfa)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, color: "#fff",
                    }}><BranchesOutlined /></div>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Workflow Builder</span>
                </div>
            }
            open={open} onCancel={onClose} footer={null}
            width={600}
        >
            <div style={{ marginTop: 16 }}>

                {/* ── Existing Workflows ── */}
                {workflows.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                        <Text strong style={{ fontSize: 12, color: "var(--text-secondary)" }}>Saved Workflows</Text>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                            {workflows.map((wf) => (
                                <div key={wf.id} style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "10px 14px", borderRadius: 10,
                                    background: activeWorkflow?.id === wf.id ? "rgba(99,102,241,0.08)" : "var(--bg-surface)",
                                    border: activeWorkflow?.id === wf.id ? "1px solid rgba(99,102,241,0.2)" : "1px solid var(--border-subtle)",
                                    transition: "all 0.2s ease",
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <Text strong style={{ fontSize: 13 }}>{wf.name}</Text>
                                        <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                                            {wf.steps.map((role, i) => {
                                                const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.custom;
                                                return (
                                                    <div key={`${role}-${i}`} style={{ display: "flex", alignItems: "center" }}>
                                                        <Tag style={{
                                                            margin: 0, borderRadius: 6,
                                                            background: cfg.glow, border: `1px solid ${cfg.color}25`,
                                                            color: cfg.color, fontSize: 10, fontWeight: 600,
                                                            padding: "1px 8px", lineHeight: "18px",
                                                        }}>
                                                            {cfg.emoji} {cfg.label}
                                                        </Tag>
                                                        {i < wf.steps.length - 1 && (
                                                            <RightOutlined style={{ fontSize: 8, color: "var(--text-faint)", margin: "0 2px" }} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 4 }}>
                                        <Tooltip title={activeWorkflow?.id === wf.id ? "Deactivate" : "Activate"}>
                                            <Button
                                                type={activeWorkflow?.id === wf.id ? "primary" : "default"}
                                                size="small"
                                                icon={<PlayCircleOutlined />}
                                                onClick={() => handleActivate(wf)}
                                                style={{
                                                    borderRadius: 7,
                                                    ...(activeWorkflow?.id === wf.id ? {
                                                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                                        border: "none",
                                                    } : {}),
                                                }}
                                            />
                                        </Tooltip>
                                        <Popconfirm title="Delete workflow?" onConfirm={() => handleDelete(wf.id)}
                                            okText="Delete" okButtonProps={{ danger: true }}>
                                            <Button type="text" size="small" danger icon={<DeleteOutlined />}
                                                style={{ borderRadius: 7 }} />
                                        </Popconfirm>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Create New Workflow ── */}
                <div style={{
                    padding: 16, borderRadius: 12,
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                }}>
                    <Text strong style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10, display: "block" }}>
                        Create New Workflow
                    </Text>

                    <Input
                        placeholder="Workflow name (e.g. Feature Development)"
                        value={newName} onChange={(e) => setNewName(e.target.value)}
                        style={{ borderRadius: 8, marginBottom: 12 }}
                    />

                    {/* Current Steps Preview */}
                    {newSteps.length > 0 && (
                        <div style={{
                            display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
                            marginBottom: 12, padding: "8px 12px",
                            borderRadius: 8, background: "var(--bg-container)",
                            border: "1px solid var(--border-subtle)",
                        }}>
                            {newSteps.map((role, i) => {
                                const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.custom;
                                return (
                                    <div key={`${role}-${i}`} style={{ display: "flex", alignItems: "center" }}>
                                        <Tag
                                            closable
                                            onClose={(e) => { e.preventDefault(); removeStep(i); }}
                                            style={{
                                                margin: 0, borderRadius: 6,
                                                background: cfg.glow, border: `1px solid ${cfg.color}25`,
                                                color: cfg.color, fontSize: 10.5, fontWeight: 600,
                                                padding: "2px 8px", lineHeight: "20px",
                                            }}
                                        >
                                            {cfg.emoji} {cfg.label}
                                        </Tag>
                                        {i < newSteps.length - 1 && (
                                            <ArrowRightOutlined style={{ fontSize: 9, color: "var(--text-faint)", margin: "0 3px" }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add Step Buttons */}
                    <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" style={{ fontSize: 11, marginBottom: 6, display: "block" }}>
                            Add departments to flow:
                        </Text>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {availableRoles.map((role) => {
                                const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.custom;
                                return (
                                    <Button
                                        key={role} size="small"
                                        icon={<PlusCircleOutlined />}
                                        onClick={() => addStep(role)}
                                        style={{
                                            borderRadius: 8, fontSize: 11,
                                            border: `1px solid ${cfg.color}25`,
                                            color: cfg.color,
                                            background: cfg.glow,
                                        }}
                                    >
                                        {cfg.emoji} {cfg.label}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreate}
                        disabled={!newName.trim() || newSteps.length < 2}
                        style={{
                            borderRadius: 8, fontWeight: 600,
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            border: "none",
                        }}
                        block
                    >
                        Create Workflow
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
