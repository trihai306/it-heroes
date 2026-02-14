import { useEffect, useState } from "react";
import { useAgentStore } from "@/store/useAgentStore";
import type { Task } from "@/services/api";
import PageMeta from "@/components/common/PageMeta";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { PlusIcon, TimeIcon, EyeIcon, CheckCircleIcon, BoltIcon, CloseIcon } from "@/icons";

// ── Column definitions ───────────────────────────────────────
const columns = [
    {
        key: "planning",
        label: "Planning",
        statuses: ["pending"],
        accentColor: "bg-gray-400",
        accentBg: "bg-gray-50 dark:bg-gray-800/30",
        countBg: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
        icon: "📋",
    },
    {
        key: "in_progress",
        label: "In Progress",
        statuses: ["in_progress"],
        accentColor: "bg-brand-500",
        accentBg: "bg-brand-50/40 dark:bg-brand-500/5",
        countBg: "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300",
        icon: "⚡",
    },
    {
        key: "ai_review",
        label: "AI Review",
        statuses: ["ai_review"],
        accentColor: "bg-purple-500",
        accentBg: "bg-purple-50/40 dark:bg-purple-500/5",
        countBg: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300",
        icon: "🤖",
    },
    {
        key: "human_review",
        label: "Human Review",
        statuses: ["human_review", "review"],
        accentColor: "bg-warning-500",
        accentBg: "bg-orange-50/40 dark:bg-warning-500/5",
        countBg: "bg-orange-100 text-orange-600 dark:bg-warning-500/20 dark:text-warning-300",
        icon: "👁️",
    },
    {
        key: "done",
        label: "Done",
        statuses: ["completed", "done"],
        accentColor: "bg-success-500",
        accentBg: "bg-green-50/40 dark:bg-success-500/5",
        countBg: "bg-green-100 text-green-600 dark:bg-success-500/20 dark:text-success-300",
        icon: "✅",
    },
];

// ── Status badge mapping ─────────────────────────────────────
const statusConfig: Record<string, { color: "primary" | "success" | "error" | "warning" | "info" | "light" | "dark"; label: string }> = {
    pending: { color: "light", label: "Pending" },
    in_progress: { color: "primary", label: "Running" },
    ai_review: { color: "info", label: "AI Review" },
    human_review: { color: "warning", label: "Needs Review" },
    review: { color: "warning", label: "Needs Review" },
    completed: { color: "success", label: "Completed" },
    done: { color: "success", label: "Done" },
    failed: { color: "error", label: "Failed" },
};

const priorityConfig: Record<string, { color: "error" | "warning" | "primary" | "light"; label: string }> = {
    critical: { color: "error", label: "Critical" },
    high: { color: "warning", label: "High" },
    medium: { color: "primary", label: "Medium" },
    low: { color: "light", label: "Low" },
};

// ── Time helper ──────────────────────────────────────────────
function timeAgo(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// ── Task Card ────────────────────────────────────────────────
function TaskCard({ task, agents }: { task: Task; agents: { id: string; name: string; avatar: string }[] }) {
    const statusCfg = statusConfig[task.status] || statusConfig.pending;
    const priorityCfg = priorityConfig[task.priority] || priorityConfig.medium;
    const agent = agents.find((a) => a.id === task.assigned_agent_id);
    const progress =
        task.status === "completed" || task.status === "done"
            ? 100
            : task.status === "in_progress"
                ? 60
                : task.status === "ai_review" || task.status === "human_review"
                    ? 80
                    : 0;

    return (
        <div className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-brand-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/60 dark:hover:border-brand-500/30">
            {/* Top row: priority + status */}
            <div className="mb-2.5 flex items-center justify-between gap-2">
                <Badge variant="light" color={priorityCfg.color} size="sm">
                    {priorityCfg.label}
                </Badge>
                <Badge variant="solid" color={statusCfg.color} size="sm">
                    {statusCfg.label}
                </Badge>
            </div>

            {/* Title */}
            <h4 className="mb-1.5 text-sm font-semibold leading-snug text-gray-800 line-clamp-2 dark:text-white/90">
                {task.title}
            </h4>

            {/* Description */}
            {task.description && (
                <p className="mb-3 text-xs leading-relaxed text-gray-500 line-clamp-2 dark:text-gray-400">
                    {task.description}
                </p>
            )}

            {/* Progress bar */}
            {progress > 0 && (
                <div className="mb-3">
                    <div className="mb-1 flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">Progress</span>
                        <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${progress === 100
                                ? "bg-success-500"
                                : "bg-brand-500"
                                }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Footer: agent + time */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700/50">
                {agent ? (
                    <div className="flex items-center gap-1.5">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] dark:bg-brand-500/20">
                            {agent.avatar || agent.name.charAt(0)}
                        </div>
                        <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                            {agent.name}
                        </span>
                    </div>
                ) : (
                    <span className="text-[11px] text-gray-400">Unassigned</span>
                )}
                <div className="flex items-center gap-1 text-gray-400">
                    <TimeIcon className="h-3 w-3" />
                    <span className="text-[11px]">{timeAgo(task.updated_at || task.created_at)}</span>
                </div>
            </div>
        </div>
    );
}

// ── Column Empty States ──────────────────────────────────────
function EmptyState({ columnKey }: { columnKey: string }) {
    const emptyConfig: Record<string, { icon: React.ReactNode; title: string; subtitle: string }> = {
        planning: {
            icon: <PlusIcon className="h-5 w-5 text-gray-400" />,
            title: "No planned tasks",
            subtitle: "Create a new task to get started",
        },
        in_progress: {
            icon: <BoltIcon className="h-5 w-5 text-brand-400" />,
            title: "Nothing running",
            subtitle: "Start a task from Planning",
        },
        ai_review: {
            icon: <EyeIcon className="h-5 w-5 text-purple-400" />,
            title: "No tasks in review",
            subtitle: "AI will review completed work",
        },
        human_review: {
            icon: <EyeIcon className="h-5 w-5 text-warning-400" />,
            title: "No reviews pending",
            subtitle: "Reviewed tasks appear here",
        },
        done: {
            icon: <CheckCircleIcon className="h-5 w-5 text-success-400" />,
            title: "Nothing completed yet",
            subtitle: "Completed tasks will show here",
        },
    };

    const cfg = emptyConfig[columnKey] || emptyConfig.planning;

    return (
        <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700/50">
                {cfg.icon}
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{cfg.title}</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{cfg.subtitle}</p>
        </div>
    );
}

// ── Create Task Modal ────────────────────────────────────────
function CreateTaskForm({
    onClose,
    onSubmit,
    agents,
}: {
    onClose: () => void;
    onSubmit: (data: { title: string; description: string; assigned_agent_id: string; priority: string }) => void;
    agents: { id: string; name: string; role: string }[];
}) {
    const [form, setForm] = useState({
        title: "",
        description: "",
        assigned_agent_id: "",
        priority: "medium",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        onSubmit(form);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Task Title
                </label>
                <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="What needs to be done?"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                    required
                    autoFocus
                />
            </div>
            <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                </label>
                <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe the task in detail..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Assign Agent
                    </label>
                    <select
                        value={form.assigned_agent_id}
                        onChange={(e) => setForm({ ...form, assigned_agent_id: e.target.value })}
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                        <option value="">Unassigned</option>
                        {agents.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name} ({a.role})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Priority
                    </label>
                    <select
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                    Cancel
                </Button>
                <button
                    type="submit"
                    className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                >
                    Create Task
                </button>
            </div>
        </form>
    );
}

// ── Main TaskBoard ───────────────────────────────────────────
export default function TaskBoard() {
    const { agents, tasks, fetchTasks, fetchAgents, createTask, connectWebSocket } = useAgentStore();
    const { isOpen, openModal, closeModal } = useModal();

    useEffect(() => {
        fetchAgents();
        fetchTasks();
        connectWebSocket();
    }, []);

    const handleCreate = async (data: { title: string; description: string; assigned_agent_id: string; priority: string }) => {
        await createTask({
            title: data.title,
            description: data.description,
            assigned_agent_id: data.assigned_agent_id || undefined,
            priority: data.priority,
        });
        closeModal();
    };

    const getColumnTasks = (col: (typeof columns)[0]): Task[] => {
        return tasks.filter((t: Task) => col.statuses.includes(t.status));
    };

    // Stats
    const totalTasks = tasks.length;
    const inProgressCount = tasks.filter((t: Task) => t.status === "in_progress").length;
    const completedCount = tasks.filter((t: Task) => ["completed", "done"].includes(t.status)).length;

    return (
        <>
            <PageMeta title="Task Board | IT Heroes" description="Track and manage agent tasks" />
            <PageBreadcrumb pageTitle="Task Board" />

            <div className="min-w-0 overflow-hidden space-y-4 sm:space-y-5">
                {/* Stats bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-gray-800 sm:text-2xl dark:text-white">{totalTasks}</span>
                            <span className="text-xs text-gray-500 sm:text-sm">Total Tasks</span>
                        </div>
                        <div className="hidden h-6 w-px bg-gray-200 sm:block dark:bg-gray-700" />
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-brand-500" />
                                <span className="text-xs text-gray-500 sm:text-sm">{inProgressCount} Running</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-success-500" />
                                <span className="text-xs text-gray-500 sm:text-sm">{completedCount} Done</span>
                            </div>
                        </div>
                    </div>
                    <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={openModal}>
                        New Task
                    </Button>
                </div>

                {/* Kanban Columns */}
                <div className="flex gap-3 overflow-x-auto pb-4 sm:gap-4 custom-scrollbar" style={{ minHeight: "calc(100vh - 280px)" }}>
                    {columns.map((col) => {
                        const colTasks = getColumnTasks(col);
                        return (
                            <div
                                key={col.key}
                                className="flex w-64 min-w-[240px] flex-shrink-0 flex-col rounded-2xl border border-gray-200 bg-white sm:w-72 sm:min-w-[272px] dark:border-gray-700 dark:bg-gray-900/50"
                            >
                                {/* Column accent bar */}
                                <div className={`h-1 rounded-t-2xl ${col.accentColor}`} />

                                {/* Column header */}
                                <div className={`flex items-center justify-between px-4 pt-4 pb-3 ${col.accentBg} rounded-t-none`}>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                                            {col.label}
                                        </h3>
                                        <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${col.countBg}`}>
                                            {colTasks.length}
                                        </span>
                                    </div>
                                    {col.key === "planning" && (
                                        <button
                                            onClick={openModal}
                                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
                                            title="Add task"
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Cards */}
                                <div className="flex-1 space-y-3 overflow-y-auto px-3 pb-4 pt-2 custom-scrollbar">
                                    {colTasks.length > 0 ? (
                                        colTasks.map((task: Task) => (
                                            <TaskCard key={task.id} task={task} agents={agents} />
                                        ))
                                    ) : (
                                        <EmptyState columnKey={col.key} />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Create Task Modal */}
            <Modal isOpen={isOpen} onClose={closeModal} className="max-w-lg">
                <div className="p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                            Create New Task
                        </h3>
                        <button
                            onClick={closeModal}
                            className="text-gray-400 transition hover:text-gray-600 dark:hover:text-white"
                        >
                            <CloseIcon className="h-5 w-5" />
                        </button>
                    </div>
                    <CreateTaskForm
                        onClose={closeModal}
                        onSubmit={handleCreate}
                        agents={agents}
                    />
                </div>
            </Modal>
        </>
    );
}
