/**
 * LogViewer — Full-page realtime log stream with level filters
 */
import { useEffect, useRef, useState, useMemo } from "react";
import { Button, Typography, Flex, Badge, Input, Switch, Space, Empty } from "antd";
import {
    ClearOutlined,
    SearchOutlined,
    VerticalAlignBottomOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const LEVEL_FILTERS = [
    { key: "all", label: "All", color: "var(--text-secondary)" },
    { key: "info", label: "Info", color: "#818cf8" },
    { key: "warn", label: "Warn", color: "#eab308" },
    { key: "error", label: "Error", color: "#ef4444" },
    { key: "success", label: "Done", color: "#22c55e" },
];

export default function LogViewer({ logs = [], onClear }) {
    const containerRef = useRef(null);
    const [level, setLevel] = useState("all");
    const [search, setSearch] = useState("");
    const [autoScroll, setAutoScroll] = useState(true);

    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            if (level !== "all" && log.level !== level) return false;
            if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [logs, level, search]);

    useEffect(() => {
        if (autoScroll && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [filteredLogs.length, autoScroll]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop - clientHeight > 80) {
            setAutoScroll(false);
        }
    };

    const scrollToBottom = () => {
        setAutoScroll(true);
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    };

    const levelCounts = useMemo(() => {
        const counts = {};
        logs.forEach((l) => {
            counts[l.level] = (counts[l.level] || 0) + 1;
        });
        return counts;
    }, [logs]);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }} className="animate-fade-in">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
                        <Badge status={autoScroll ? "success" : "default"} style={{ marginRight: 8 }} />
                        Live Logs
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {logs.length} events · {filteredLogs.length} shown
                    </Text>
                </div>
                <Space>
                    {!autoScroll && (
                        <Button
                            type="text"
                            size="small"
                            icon={<VerticalAlignBottomOutlined />}
                            onClick={scrollToBottom}
                            style={{ fontSize: 11 }}
                        >
                            Scroll to end
                        </Button>
                    )}
                    <Button
                        type="text"
                        size="small"
                        icon={<ClearOutlined />}
                        onClick={onClear}
                        style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                    >
                        Clear
                    </Button>
                </Space>
            </div>

            {/* Filter & Search Bar */}
            <Flex gap={8} align="center" style={{ marginBottom: 10, flexShrink: 0 }} wrap="wrap">
                {/* Level filter pills */}
                <Flex gap={4}>
                    {LEVEL_FILTERS.map((f) => {
                        const count = f.key === "all" ? logs.length : (levelCounts[f.key] || 0);
                        return (
                            <div
                                key={f.key}
                                className={`filter-pill ${level === f.key ? "active" : ""}`}
                                onClick={() => setLevel(f.key)}
                                style={level === f.key ? { borderColor: f.color + "40", color: f.color } : undefined}
                            >
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: f.color, flexShrink: 0 }} />
                                {f.label}
                                <span style={{ fontSize: 9, opacity: 0.6, fontFamily: '"JetBrains Mono", monospace' }}>
                                    {count}
                                </span>
                            </div>
                        );
                    })}
                </Flex>

                <Input
                    prefix={<SearchOutlined style={{ color: "var(--text-faint)", fontSize: 11 }} />}
                    placeholder="Search logs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="small"
                    style={{ width: 200, fontSize: 11 }}
                    allowClear
                />
            </Flex>

            {/* Log Stream */}
            <div
                ref={containerRef}
                className="log-terminal"
                style={{ flex: 1, margin: 0, overflow: "auto" }}
                onScroll={handleScroll}
            >
                {filteredLogs.length === 0 ? (
                    <Flex align="center" justify="center" style={{ height: "100%" }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 36, opacity: 0.15, marginBottom: 8 }}>📡</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {logs.length === 0 ? "Waiting for events..." : "No logs match your filters"}
                            </Text>
                        </div>
                    </Flex>
                ) : (
                    filteredLogs.map((log, i) => <LogEntry key={i} log={log} />)
                )}
            </div>
        </div>
    );
}

/* ─── Log Entry ────────────────────────────────────────────────────── */
function LogEntry({ log }) {
    const levelClass = LOG_LEVEL_CLASSES[log.level] || "";
    const time = log.ts ? new Date(log.ts).toLocaleTimeString("en-US", { hour12: false }) : "";

    return (
        <div
            style={{ display: "flex", gap: 8, lineHeight: 1.7, padding: "0 6px", borderRadius: 4 }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
            <span style={{ color: "var(--time-stamp)", flexShrink: 0, userSelect: "none", fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}>
                {time}
            </span>
            {log.agent_id && (
                <span style={{ color: "var(--agent-tag)", flexShrink: 0, fontWeight: 500, fontSize: 10 }}>
                    [A{log.agent_id}]
                </span>
            )}
            <span className={levelClass} style={{ wordBreak: "break-all" }}>{log.message}</span>
        </div>
    );
}

const LOG_LEVEL_CLASSES = {
    info: "log-info",
    warn: "log-warn",
    error: "log-error",
    success: "log-success",
};
