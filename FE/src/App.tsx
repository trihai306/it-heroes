import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router";
import { useEffect, useState } from "react";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import Calendar from "./pages/Calendar";

// Multi-Agent Pages
import AgentChat from "./pages/Agents/AgentChat";
import TaskBoard from "./pages/Agents/TaskBoard";

// Setup
import SetupWizard from "./pages/Setup/SetupWizard";
import AuthConnect from "./pages/Setup/AuthConnect";
import { useSetupStore } from "./store/useSetupStore";

/* ── Guard: redirect to /setup if CLI not available ── */
function SetupGuard({ children }: { children: React.ReactNode }) {
  const { cliAvailable, checkCLI } = useSetupStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    checkCLI().finally(() => setChecked(true));
  }, [checkCLI]);

  // Still checking — show nothing (or a tiny spinner)
  if (!checked) return null;

  // CLI not available → redirect to setup
  if (cliAvailable === false) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Setup — full-page, no sidebar */}
          <Route path="/setup" element={<SetupWizard />} />

          {/* App Layout (all pages with sidebar + header) */}
          <Route element={<AppLayout />}>
            {/* ── Auth — always accessible (no CLI required) ── */}
            <Route path="/auth" element={<AuthConnect />} />

            {/* ── Main pages — protected by SetupGuard ── */}
            <Route element={<SetupGuard><><Outlet /></></SetupGuard>}>
              <Route index path="/" element={<Home />} />

              {/* Redirect old /agents path to dashboard */}
              <Route path="/agents" element={<Navigate to="/" replace />} />

              {/* Multi-Agent */}
              <Route path="/agents/chat" element={<AgentChat />} />
              <Route path="/agents/tasks" element={<TaskBoard />} />

              {/* Work Calendar */}
              <Route path="/calendar" element={<Calendar />} />
            </Route>
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}

