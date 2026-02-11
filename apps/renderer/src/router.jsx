/**
 * router.jsx — Centralized route definitions
 */
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "@/pages/DashboardPage";
import ChibiOfficePage from "@/pages/ChibiOfficePage";
import KanbanPage from "@/pages/KanbanPage";
import TeamPage from "@/pages/TeamPage";
import LogsPage from "@/pages/LogsPage";
import TerminalPage from "@/pages/TerminalPage";

export default function AppRouter({ logs, clearLogs, agents }) {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/chibi" element={<ChibiOfficePage />} />
            <Route path="/kanban" element={<KanbanPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/logs" element={<LogsPage logs={logs} onClear={clearLogs} />} />
            <Route path="/terminal" element={<TerminalPage logs={logs} agents={agents} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}
