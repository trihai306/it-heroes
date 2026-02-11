/**
 * AgentTerminal — Full-page per-agent CLI viewer with integrated agent tabs
 */
import { useEffect, useRef, useState, useMemo } from "react";
import { Button, Select, Input, Typography, Flex, Space, Segmented } from "antd";
import {
    PauseCircleOutlined,
    CaretRightOutlined,
    CopyOutlined,
    SearchOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function AgentTerminal({ logs = [], agents = [], agentId: initialAgentId, agentName: initialAgentName }) {
    const containerRef = useRef(null);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [paused, setPaused] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(initialAgentId || "all");

    const currentAgentId = selectedAgent === "all" ? null : selectedAgent;
    const currentAgentName = currentAgentId
        ? agents.find((a) => a.id === currentAgentId)?.name || initialAgentName || "Agent"
        : "All Agents";

    const agentLogs = useMemo(() => {
        return logs.filter((log) => {
            if (currentAgentId && log.agent_id !== currentAgentId) return false;
            if (filter !== "all" && log.level !== filter) return false;
            if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [logs, currentAgentId, filter, search]);

    useEffect(() => {
        if (!paused && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [agentLogs.length, paused]);

    const copyAll = () => {
        const text = agentLogs.map((l) => `${l.ts || ""} [${l.level}] ${l.message}`).join("\n");
        navigator.clipboard.writeText(text);
    };

    // Build agent tabs
    const agentOptions = [
        { label: "All", value: "all" },
        ...agents.map((a) => ({
            label: `${ROLE_EMOJIS[a.role] || "🤖"} ${a.name}`,
            value: a.id,
        })),
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }} className="animate-fade-in">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
                        ⌨️ Terminal
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {currentAgentName} · {agentLogs.length} lines
                    </Text>
                </div>
                <Space size={4}>
                    <Select
                        value={filter}
                        onChange={setFilter}
                        size="small"
                        style={{ width: 80, fontSize: 10 }}
                        options={[
                            { label: "All", value: "all" },
                            { label: "Info", value: "info" },
                            { label: "Warn", value: "warn" },
                            { label: "Error", value: "error" },
                            { label: "Done", value: "success" },
                        ]}
                    />
                    <Button
                        type={paused ? "primary" : "text"}
                        ghost={paused}
                        size="small"
                        icon={paused ? <CaretRightOutlined /> : <PauseCircleOutlined />}
                        onClick={() => setPaused(!paused)}
                        title={paused ? "Resume" : "Pause scroll"}
                        style={{ width: 28, height: 28, padding: 0 }}
                    />
                    <Button
                        type="text" size="small"
                        icon={<CopyOutlined />}
                        onClick={copyAll}
                        title="Copy all"
                        style={{ width: 28, height: 28, padding: 0 }}
                    />
                </Space>
            </div>

            {/* Agent Selector Tabs */}
            {agents.length > 0 && (
                <div style={{ marginBottom: 10, flexShrink: 0 }}>
                    <Segmented
                        value={selectedAgent}
                        onChange={setSelectedAgent}
                        options={agentOptions}
                        size="small"
                        style={{ overflowX: "auto" }}
                    />
                </div>
            )}

            {/* Search Bar */}
            <div style={{ padding: "0 0 8px", flexShrink: 0 }}>
                <Input
                    prefix={<SearchOutlined style={{ color: "var(--text-faint)", fontSize: 11 }} />}
                    placeholder="Search output..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="small"
                    variant="borderless"
                    style={{
                        fontSize: 11,
                        background: "var(--bg-surface)",
                        borderRadius: 6,
                        border: "1px solid var(--border-subtle)",
                    }}
                    allowClear
                />
            </div>

            {/* Terminal Output */}
            <div
                ref={containerRef}
                className="log-terminal"
                style={{ flex: 1, overflow: "auto", margin: 0 }}
                onScroll={(e) => {
                    const { scrollTop, scrollHeight, clientHeight } = e.target;
                    if (scrollHeight - scrollTop - clientHeight > 100) setPaused(true);
                }}
            >
                {agentLogs.length === 0 ? (
                    <Flex align="center" justify="center" style={{ height: "100%" }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 32, opacity: 0.12, marginBottom: 6 }}>💤</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {logs.length === 0 ? "No output yet" : "No matching output"}
                            </Text>
                        </div>
                    </Flex>
                ) : (
                    agentLogs.map((log, i) => (
                        <div
                            key={i}
                            style={{ display: "flex", gap: 8, lineHeight: 1.7, padding: "0 4px", borderRadius: 4 }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                            <span style={{ color: "var(--time-stamp)", flexShrink: 0, fontSize: 10, userSelect: "none", fontFamily: '"JetBrains Mono", monospace' }}>
                                {log.ts ? new Date(log.ts).toLocaleTimeString("en-US", { hour12: false }) : ""}
                            </span>
                            {!currentAgentId && log.agent_id && (
                                <span style={{ color: "var(--agent-tag)", flexShrink: 0, fontWeight: 500, fontSize: 10 }}>
                                    [A{log.agent_id}]
                                </span>
                            )}
                            <span className={LOG_COLORS[log.level] || ""} style={{ wordBreak: "break-all" }}>
                                {log.message}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

const LOG_COLORS = {
    info: "log-info",
    warn: "log-warn",
    error: "log-error",
    success: "log-success",
};

const ROLE_EMOJIS = {
    lead: "👑", backend: "⚙️", frontend: "🎨",
    qa: "🧪", docs: "📄", security: "🛡️",
};
