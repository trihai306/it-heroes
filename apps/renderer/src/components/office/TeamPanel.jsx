/**
 * TeamPanel — prompt-based Claude Agent Teams UI.
 *
 * Official architecture: user writes ONE natural language prompt,
 * Claude Code creates the team, spawns teammates, assigns roles.
 *
 * UI:
 * 1. Prompt textarea + quick presets
 * 2. Optional: team name & model
 * 3. Live output stream dashboard
 */
import { useState, useEffect, useRef, useMemo } from "react";
import {
    Input, Button, Typography, Flex, Select, Tag, Space, Tooltip, Collapse,
    Tabs, Badge, Empty,
} from "antd";
import {
    TeamOutlined, SendOutlined, ThunderboltOutlined, DeleteOutlined,
    RocketOutlined, BugOutlined, SearchOutlined, CodeOutlined,
    SettingOutlined, ClearOutlined, LoadingOutlined, ExperimentOutlined,
    PlayCircleOutlined, StopOutlined, ExpandOutlined,
} from "@ant-design/icons";
import useAgentStore from "../../stores/useAgentStore";
import useProjectStore from "../../stores/useProjectStore";

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

/* ─── Quick Presets ─────────────────────────────────────────────────── */

const PRESETS = [
    {
        id: "fullstack",
        label: "🚀 Full Stack",
        icon: <RocketOutlined />,
        color: "#6366f1",
        prompt: `Create an agent team for full-stack development on this codebase.
Spawn 3 teammates:
- One backend specialist focused on API design, data models, and server logic
- One frontend specialist focused on UI components, UX, and responsive design
- One QA engineer focused on writing tests, verifying functionality, and quality
Coordinate the team, break tasks into subtasks, and review completed work.`,
    },
    {
        id: "review",
        label: "🔍 Code Review",
        icon: <SearchOutlined />,
        color: "#10b981",
        prompt: `Create an agent team to review this codebase in parallel. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review independently and report findings. Synthesize a final summary.`,
    },
    {
        id: "debug",
        label: "🐛 Debug Squad",
        icon: <BugOutlined />,
        color: "#f59e0b",
        prompt: `There seems to be an issue in this codebase. Spawn 3 agent teammates to investigate different hypotheses. Have them talk to each other to try to disprove each other's theories, like a scientific debate. Update findings with whatever consensus emerges.`,
    },
    {
        id: "research",
        label: "🔬 Research",
        icon: <ExperimentOutlined />,
        color: "#8b5cf6",
        prompt: `Create an agent team to explore this codebase from different angles:
- One teammate focused on architecture and design patterns
- One focused on potential improvements and modernization
- One playing devil's advocate, questioning decisions
Synthesize findings into a comprehensive report.`,
    },
];

const MODEL_OPTIONS = [
    { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
    { value: "claude-opus-4-6-20270210", label: "Claude Opus 4.6" },
    { value: "claude-haiku-4-5-20250929", label: "Claude Haiku 4.5" },
];

/* ─── Styles ───────────────────────────────────────────────────────── */

const sty = {
    container: {
        maxWidth: 860,
        margin: "0 auto",
    },
    promptBox: {
        background: "var(--bg-secondary)",
        border: "1.5px solid var(--border-subtle)",
        borderRadius: 16,
        padding: 24,
    },
    presetBtn: (color, isActive) => ({
        background: isActive ? `${color}22` : "var(--bg-hover)",
        border: `1.5px solid ${isActive ? color : "var(--border-subtle)"}`,
        borderRadius: 10,
        padding: "8px 14px",
        cursor: "pointer",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 500,
        color: isActive ? color : "inherit",
    }),
    outputContainer: {
        background: "#0d1117",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: 16,
        maxHeight: 400,
        overflowY: "auto",
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 12,
        lineHeight: 1.7,
    },
    outputLine: (type) => ({
        color: type === "error" ? "#f87171"
            : type === "teammate_event" ? "#34d399"
                : "rgba(255,255,255,0.75)",
        padding: "1px 0",
    }),
    settingsRow: {
        background: "var(--bg-hover)",
        borderRadius: 10,
        padding: "12px 16px",
        border: "1px solid var(--border-subtle)",
    },
};

/* ─── Component ────────────────────────────────────────────────────── */

export default function TeamPanel() {
    const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
    const {
        loading, teamConfig, teamSessions, teamOutput,
        createTeam, fetchTeamStatus, cleanupTeam,
        sendCommand, fetchTeamOutput, broadcastMessage,
    } = useAgentStore();

    // ── State ────────────────────────────────────────────────────────
    const [prompt, setPrompt] = useState("");
    const [teamName, setTeamName] = useState("chibi-team");
    const [model, setModel] = useState("claude-sonnet-4-5-20250929");
    const [activePreset, setActivePreset] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [creating, setCreating] = useState(false);
    const [commandText, setCommandText] = useState("");
    const [sending, setSending] = useState(false);

    const outputRef = useRef(null);
    const pollRef = useRef(null);

    // Auto-scroll output
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [teamOutput]);

    // Poll when team is active
    const isTeamActive = teamSessions?.active;
    useEffect(() => {
        if (isTeamActive && selectedProjectId) {
            const poll = () => {
                fetchTeamStatus(selectedProjectId);
                fetchTeamOutput(selectedProjectId, 50);
            };
            poll();
            pollRef.current = setInterval(poll, 4000);
            return () => clearInterval(pollRef.current);
        }
    }, [isTeamActive, selectedProjectId]);

    // Check status on mount
    useEffect(() => {
        if (selectedProjectId) {
            fetchTeamStatus(selectedProjectId);
            fetchTeamOutput(selectedProjectId, 50);
        }
    }, [selectedProjectId]);

    /* ── Handlers ───────────────────────────────────────────────────── */

    const handlePreset = (preset) => {
        setActivePreset(preset.id);
        setPrompt(preset.prompt);
    };

    const handleCreate = async () => {
        if (!selectedProjectId || !prompt.trim()) return;
        setCreating(true);
        try {
            await createTeam(selectedProjectId, prompt.trim(), teamName, model);
            // Start polling
            await fetchTeamStatus(selectedProjectId);
        } finally {
            setCreating(false);
        }
    };

    const handleSendCommand = async () => {
        if (!selectedProjectId || !commandText.trim()) return;
        setSending(true);
        try {
            await sendCommand(selectedProjectId, commandText.trim());
            setCommandText("");
        } finally {
            setSending(false);
        }
    };

    const handleCleanup = async () => {
        if (!selectedProjectId) return;
        setCreating(true);
        try {
            await cleanupTeam(selectedProjectId);
            setPrompt("");
            setActivePreset(null);
        } finally {
            setCreating(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (isTeamActive) {
                handleSendCommand();
            } else if (prompt.trim()) {
                handleCreate();
            }
        }
    };

    /* ── Render ─────────────────────────────────────────────────────── */

    return (
        <div className="animate-fade-in" style={sty.container}>
            {/* ── Header ─────────────────────────────────────── */}
            <div className="page-header" style={{ marginBottom: 24 }}>
                <Flex align="center" gap={12}>
                    <TeamOutlined style={{ fontSize: 22, color: "var(--accent-primary)" }} />
                    <div>
                        <Title level={4} style={{ margin: 0, fontSize: 18 }}>
                            Agent Teams
                        </Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Describe what you want — Claude creates the team
                        </Text>
                    </div>
                    <div style={{ flex: 1 }} />
                    {isTeamActive && (
                        <Flex gap={8}>
                            <Tag color="green" icon={<PlayCircleOutlined />}>
                                Team Active
                            </Tag>
                            <Button
                                danger size="small" type="text"
                                icon={<StopOutlined />}
                                onClick={handleCleanup}
                                loading={creating}
                            >
                                Cleanup
                            </Button>
                        </Flex>
                    )}
                </Flex>
            </div>

            {/* ── Team Creation / Prompt ──────────────────────── */}
            {!isTeamActive && (
                <div style={sty.promptBox}>
                    {/* Quick Presets */}
                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
                        QUICK PRESETS
                    </Text>
                    <Flex gap={8} wrap="wrap" style={{ marginTop: 8, marginBottom: 16 }}>
                        {PRESETS.map((p) => (
                            <div
                                key={p.id}
                                style={sty.presetBtn(p.color, activePreset === p.id)}
                                onClick={() => handlePreset(p)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = p.color;
                                    e.currentTarget.style.opacity = "0.9";
                                }}
                                onMouseLeave={(e) => {
                                    if (activePreset !== p.id) {
                                        e.currentTarget.style.borderColor = "var(--border-subtle)";
                                    }
                                    e.currentTarget.style.opacity = "1";
                                }}
                            >
                                {p.label}
                            </div>
                        ))}
                    </Flex>

                    {/* Main Prompt */}
                    <TextArea
                        value={prompt}
                        onChange={(e) => {
                            setPrompt(e.target.value);
                            setActivePreset(null);
                        }}
                        placeholder={`Describe what you want the team to do...

Example: "Create an agent team with 3 teammates to refactor the authentication module. One teammate on API endpoints, one on database schema, one on tests. Use Sonnet for each teammate."`}
                        autoSize={{ minRows: 5, maxRows: 12 }}
                        style={{
                            background: "var(--bg-primary)",
                            border: "1.5px solid var(--border-subtle)",
                            borderRadius: 12,
                            fontSize: 13,
                            lineHeight: 1.6,
                            padding: "12px 16px",
                            fontFamily: '"Inter", -apple-system, sans-serif',
                        }}
                        onKeyDown={handleKeyDown}
                    />

                    {/* Settings Toggle */}
                    <Flex
                        align="center" justify="space-between"
                        style={{ marginTop: 12 }}
                    >
                        <Button
                            type="text" size="small"
                            icon={<SettingOutlined />}
                            onClick={() => setShowSettings(!showSettings)}
                            style={{ fontSize: 11, color: "var(--text-muted)" }}
                        >
                            {showSettings ? "Hide" : "Settings"}
                        </Button>
                        <Text type="secondary" style={{ fontSize: 10 }}>
                            ⌘+Enter to launch
                        </Text>
                    </Flex>

                    {/* Optional Settings */}
                    {showSettings && (
                        <div style={{ ...sty.settingsRow, marginTop: 8 }}>
                            <Flex gap={16} align="center" wrap="wrap">
                                <div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>Team Name</Text>
                                    <Input
                                        size="small" value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        style={{ width: 160, marginTop: 2 }}
                                    />
                                </div>
                                <div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>Model</Text>
                                    <Select
                                        size="small" value={model}
                                        onChange={setModel}
                                        options={MODEL_OPTIONS}
                                        style={{ width: 180, marginTop: 2 }}
                                    />
                                </div>
                            </Flex>
                        </div>
                    )}

                    {/* Launch Button */}
                    <Button
                        type="primary" size="large" block
                        icon={creating ? <LoadingOutlined /> : <ThunderboltOutlined />}
                        onClick={handleCreate}
                        loading={creating}
                        disabled={!prompt.trim() || creating}
                        style={{
                            marginTop: 16,
                            height: 48,
                            borderRadius: 12,
                            fontSize: 15,
                            fontWeight: 600,
                            background: prompt.trim()
                                ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                                : undefined,
                            border: "none",
                        }}
                    >
                        {creating ? "Launching Team..." : "Launch Agent Team"}
                    </Button>
                </div>
            )}

            {/* ── Active Team Dashboard ──────────────────────── */}
            {isTeamActive && (
                <div style={{ marginTop: 4 }}>
                    {/* Team Info Bar */}
                    <div style={{
                        ...sty.settingsRow,
                        marginBottom: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                    }}>
                        <div>
                            <Text type="secondary" style={{ fontSize: 10 }}>TEAM</Text>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>
                                {teamSessions?.team || teamConfig?.team_name || "—"}
                            </div>
                        </div>
                        <div style={{
                            width: 1, height: 28,
                            background: "var(--border-subtle)",
                        }} />
                        <div>
                            <Text type="secondary" style={{ fontSize: 10 }}>STATUS</Text>
                            <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{
                                    width: 7, height: 7,
                                    borderRadius: "50%",
                                    background: teamSessions?.running ? "#34d399" : "#6b7280",
                                    boxShadow: teamSessions?.running
                                        ? "0 0 6px rgba(52,211,153,0.5)" : "none",
                                }} />
                                {teamSessions?.running ? "Running" : "Stopped"}
                            </div>
                        </div>
                        <div style={{
                            width: 1, height: 28,
                            background: "var(--border-subtle)",
                        }} />
                        <div>
                            <Text type="secondary" style={{ fontSize: 10 }}>PID</Text>
                            <div style={{
                                fontSize: 12,
                                fontFamily: '"JetBrains Mono", monospace',
                            }}>
                                {teamSessions?.lead?.pid || "—"}
                            </div>
                        </div>
                    </div>

                    {/* Live Output */}
                    <div style={{ marginBottom: 12 }}>
                        <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
                                LIVE OUTPUT
                            </Text>
                            <Badge
                                count={teamOutput?.length || 0}
                                showZero
                                size="small"
                                style={{ backgroundColor: "var(--accent-primary)" }}
                            />
                        </Flex>
                        <div ref={outputRef} style={sty.outputContainer}>
                            {(!teamOutput || teamOutput.length === 0) ? (
                                <div style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 40 }}>
                                    Waiting for output...
                                </div>
                            ) : (
                                teamOutput.map((line, i) => (
                                    <div key={i} style={sty.outputLine(line.teammate_event ? "teammate_event" : line.type)}>
                                        <span style={{ color: "rgba(255,255,255,0.25)", marginRight: 8 }}>
                                            {new Date(line.timestamp).toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                        </span>
                                        {typeof line.content === "string"
                                            ? line.content
                                            : JSON.stringify(line.content)}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Command Input */}
                    <Flex gap={8}>
                        <TextArea
                            value={commandText}
                            onChange={(e) => setCommandText(e.target.value)}
                            placeholder="Send a command to the lead agent... (⌘+Enter)"
                            autoSize={{ minRows: 2, maxRows: 5 }}
                            onKeyDown={handleKeyDown}
                            style={{
                                flex: 1,
                                background: "var(--bg-secondary)",
                                border: "1.5px solid var(--border-subtle)",
                                borderRadius: 10,
                                fontSize: 13,
                            }}
                        />
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={handleSendCommand}
                            loading={sending}
                            disabled={!commandText.trim()}
                            style={{
                                height: "auto",
                                borderRadius: 10,
                                minWidth: 48,
                            }}
                        />
                    </Flex>

                    {/* Quick Actions */}
                    <Flex gap={6} wrap="wrap" style={{ marginTop: 12 }}>
                        {[
                            { label: "Check status", cmd: "What's the status of each teammate?" },
                            { label: "Show tasks", cmd: "Show the current task list" },
                            { label: "Clean up", cmd: "Clean up the team", danger: true },
                        ].map((action) => (
                            <Button
                                key={action.label}
                                size="small"
                                type="text"
                                danger={action.danger}
                                onClick={async () => {
                                    if (action.danger) {
                                        handleCleanup();
                                    } else {
                                        await sendCommand(selectedProjectId, action.cmd);
                                    }
                                }}
                                style={{ fontSize: 11, borderRadius: 6 }}
                            >
                                {action.label}
                            </Button>
                        ))}
                    </Flex>
                </div>
            )}

            {/* ── Empty State ────────────────────────────────── */}
            {!isTeamActive && !prompt && (
                <div style={{
                    marginTop: 32,
                    textAlign: "center",
                    padding: "24px 0",
                }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Write a prompt or pick a preset to launch an agent team.
                        <br />
                        Claude will create teammates, assign roles, and coordinate the work.
                    </Text>
                </div>
            )}
        </div>
    );
}
