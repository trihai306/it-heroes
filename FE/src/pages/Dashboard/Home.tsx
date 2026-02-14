import { useEffect } from "react";
import { useAgentStore } from "@/store/useAgentStore";
import { Link } from "react-router";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import Badge from "@/components/ui/badge/Badge";
import {
  BoxCubeIcon,
  BoltIcon,
  TaskIcon,
  CheckCircleIcon,
  ChatIcon,
  CalenderIcon,
  GridIcon,
} from "@/icons";



export default function Dashboard() {
  const {
    tasks, stats,
    wsConnected, backendOnline,
    fetchAgents, fetchTasks, fetchStats, connectWebSocket,
  } = useAgentStore();

  useEffect(() => {
    fetchAgents();
    fetchTasks();
    fetchStats();
    connectWebSocket();
  }, []);

  const pendingTasks = tasks.filter((t) => t.status === "pending").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  return (
    <>
      <PageMeta
        title="Dashboard | IT Heroes"
        description="IT Heroes Multi-Agent Platform — Dashboard overview"
      />
      <PageBreadcrumb pageTitle="Dashboard" />

      <div className="space-y-6">
        {/* ─── Stat Cards ─── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Agents"
            value={stats?.total_agents ?? 0}
            icon={<BoxCubeIcon className="h-6 w-6 text-brand-500" />}
            bgColor="bg-brand-50 dark:bg-brand-500/10"
          />
          <StatCard
            title="Active Agents"
            value={stats?.active_agents ?? 0}
            icon={<BoltIcon className="h-6 w-6 text-success-500" />}
            bgColor="bg-success-50 dark:bg-success-500/10"
          />
          <StatCard
            title="Total Tasks"
            value={stats?.total_tasks ?? tasks.length}
            icon={<TaskIcon className="h-6 w-6 text-warning-500" />}
            bgColor="bg-warning-50 dark:bg-warning-500/10"
          />
          <StatCard
            title="Completed Tasks"
            value={stats?.completed_tasks ?? completedTasks}
            icon={<CheckCircleIcon className="h-6 w-6 text-success-600" />}
            bgColor="bg-success-50 dark:bg-success-500/10"
          />
        </div>

        {/* ─── Connection Status ─── */}
        <div className="flex items-center gap-3">
          <Badge variant="solid" color={backendOnline ? "success" : "error"}>
            Backend: {backendOnline ? "Online" : "Offline"}
          </Badge>
          <Badge variant="solid" color={wsConnected ? "success" : "warning"}>
            WebSocket: {wsConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>



        {/* ─── Task Summary + Quick Links ─── */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* Task Breakdown */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
              <TaskIcon className="h-4 w-4 text-gray-500" />
              Task Breakdown
            </h3>
            <div className="space-y-3">
              <TaskRow label="Pending" count={pendingTasks} total={tasks.length} color="bg-gray-400" />
              <TaskRow label="In Progress" count={inProgressTasks} total={tasks.length} color="bg-brand-500" />
              <TaskRow label="Completed" count={completedTasks} total={tasks.length} color="bg-success-500" />
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-2">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
              <GridIcon className="h-4 w-4 text-gray-500" />
              Quick Access
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <QuickLink to="/agents/chat" icon={<ChatIcon className="h-5 w-5" />} label="Agent Chat" />
              <QuickLink to="/agents/tasks" icon={<TaskIcon className="h-5 w-5" />} label="Task Board" />
              <QuickLink to="/calendar" icon={<CalenderIcon className="h-5 w-5" />} label="Calendar" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ── */

function StatCard({ title, value, icon, bgColor }: { title: string; value: number; icon: React.ReactNode; bgColor: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-800 dark:text-white/90">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bgColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-800 dark:text-white/90">{count} ({pct}%)</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center transition-all hover:border-brand-300 hover:bg-brand-50 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-brand-800 dark:hover:bg-brand-500/5"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-500 shadow-theme-xs group-hover:text-brand-500 dark:bg-gray-800">
        {icon}
      </div>
      <span className="text-xs font-medium text-gray-700 group-hover:text-brand-500 dark:text-gray-300">{label}</span>
    </Link>
  );
}
