/**
 * LogsPage — Real-time log viewer
 */
import LogViewer from "@/components/logs/LogViewer";

export default function LogsPage({ logs, onClear }) {
    return <LogViewer logs={logs} onClear={onClear} />;
}
