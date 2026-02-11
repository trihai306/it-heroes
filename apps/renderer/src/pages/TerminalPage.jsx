/**
 * TerminalPage — Agent terminal output viewer
 */
import AgentTerminal from "@/components/logs/AgentTerminal";

export default function TerminalPage({ logs, agents }) {
    return <AgentTerminal logs={logs} agents={agents} />;
}
