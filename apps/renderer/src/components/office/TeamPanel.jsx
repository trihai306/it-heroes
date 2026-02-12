/**
 * TeamPanel — Unified Agent Teams UI.
 *
 * Uses the unified orchestrator backend:
 * - Preset-based team creation (SDK subagents)
 * - Custom prompt team creation
 * - Per-agent status dashboard
 * - Real-time updates via WebSocket (no polling)
 */
import { useState, useEffect, useRef } from "react";
import {
    Input, Button, Typography, Flex, Select, Tag, Badge, message,
} from "antd";
import {
    TeamOutlined, SendOutlined, ThunderboltOutlined,
    SettingOutlined, LoadingOutlined,
    PlayCircleOutlined, StopOutlined,
} from "@ant-design/icons";
import useAgentStore from "../../stores/useAgentStore";
import useProjectStore from "../../stores/useProjectStore";

const { Text, Title } = Typography;
const { TextArea } = Input;

/* ─── Constants ───────────────────────────────────────────────────── */

const MODEL_OPTIONS = [
    { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
    { value: "claude-opus-4-6-20270210", label: "Claude Opus 4.6" },
    { value: "claude-haiku-4-5-20250929", label: "Claude Haiku 4.5" },
];

const PRESET_COLORS = {
    fullstack: "#6366f1",
    review: "#10b981",
    debug: "#f59e0b",
    research: "#8b5cf6",
};

const ROLE_EMOJIS = {
    lead: "\u{1F451}", backend: "\u{2699}\uFE0F", frontend: "\u{1F3A8}",
    qa: "\u{1F9EA}", docs: "\u{1F4C4}", security: "\u{1F6E1}\uFE0F", custom: "\u{1F916}",
};

const STATUS_CONFIG = {
    idle: { cssColor: "var(--text-tertiary)", label: "Idle" },
    working: { cssColor: "var(--log-success)", label: "Working" },
    reviewing: { cssColor: "var(--log-info)", label: "Reviewing" },
    blocked: { cssColor: "var(--log-error)", label: "Blocked" },
    stopped: { cssColor: "var(--text-muted)", label: "Stopped" },
};

/* ─── Styles ──────────────────────────────────────────────────────── */

const sty = {
    container: { maxWidth: 860, margin: "0 auto" },
    promptBox: {
        background: "var(--bg-container)",
        border: "1.5px solid var(--border-subtle)",
        borderRadius: 16, padding: 24,
    },
    presetCard: (color, isActive) => ({
        background: isActive ? `${color}18` : "var(--bg-hover)",
        border: `1.5px solid ${isActive ? color : "var(--border-subtle)"}`,
        borderRadius: 12, padding: "12px 16px",
        cursor: "pointer", transition: "all 0.2s",
        flex: "1 1 180px", minWidth: 170,
    }),
    agentRow: {
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px", borderRadius: 8,
        background: "var(--bg-surface)", marginBottom: 4,
        border: "1px solid var(--border-subtle)",
    },
    statusDot: (cssColor) => ({
        width: 8, height: 8, borderRadius: "50%",
        background: cssColor,
    }),
    outputContainer: {
        background: "var(--bg-terminal)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 12, padding: 16,
        maxHeight: 350, overflowY: "auto",
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 12, lineHeight: 1.7,
    },
    outputLine: (level) => ({
        color: level === "error" ? "var(--log-error)"
            : level === "success" ? "var(--log-success)"
            : level === "tool" ? "var(--log-info)"
            : "var(--text-secondary)",
        padding: "1px 0",
    }),
    settingsRow: {
        background: "var(--bg-surface)", borderRadius: 10,
        padding: "12px 16px", border: "1px solid var(--border-subtle)",
    },
};

/* ─── Component ───────────────────────────────────────────────────── */

export default function TeamPanel() {
    const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
    const {
        loading, agents, teamConfig, presets, agentStatuses, teamOutput,
        createTeamFromPreset, createTeamFromPrompt,
        fetchTeamStatus, fetchPresets, dispatchTeam,
        cleanupTeam, sendCommand,
    } = useAgentStore();

    // ── Local State ──────────────────────────────────────────────────
    const [prompt, setPrompt] = useState("");
    const [teamName, setTeamName] = useState("chibi-team");
    const [model, setModel] = useState("");
    const [activePreset, setActivePreset] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [creating, setCreating] = useState(false);
    const [commandText, setCommandText] = useState("");
    const [sending, setSending] = useState(false);

    const outputRef = useRef(null);

    // ── Effects ──────────────────────────────────────────────────────

    // Fetch presets + team status on mount
    useEffect(() => {
        fetchPresets();
    }, []);

    useEffect(() => {
        if (selectedProjectId) {
            fetchTeamStatus(selectedProjectId);
        }
    }, [selectedProjectId]);

    // Auto-scroll output
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [teamOutput]);

    // ── Derived State ────────────────────────────────────────────────
    const isTeamActive = teamConfig?.active || agents.length > 0;
    const canLaunch = activePreset || prompt.trim();

    // ── Handlers ─────────────────────────────────────────────────────

    const handlePresetClick = (preset) => {
        if (activePreset === preset.id) {
            setActivePreset(null);
            setPrompt("");
        } else {
            setActivePreset(preset.id);
            setPrompt(""); // Clear custom prompt when selecting preset
        }
    };

    const handleCreate = async () => {
        if (!selectedProjectId) {
            message.error("No project selected.");
            return;
        }
        if (!canLaunch) {
            message.warning("Select a preset or enter a custom prompt.");
            return;
        }

        setCreating(true);
        try {
            let result;
            if (activePreset) {
                // Preset-based: use structured backend presets
                result = await createTeamFromPreset(selectedProjectId, activePreset, model);
            } else {
                // Custom prompt
                result = await createTeamFromPrompt(selectedProjectId, prompt.trim(), teamName, model);
            }

            if (result?.error) {
                message.error(`Team creation error: ${result.error}`, 5);
            } else {
                const count = result?.agents?.length || 0;
                message.success(`Team created with ${count} agents!`);
            }
            await fetchTeamStatus(selectedProjectId);
        } catch (err) {
            console.error("[TeamPanel] create failed:", err);
            message.error(err?.message || "Failed to create team. Check backend logs.");
        } finally {
            setCreating(false);
        }
    };

    const handleDispatch = async () => {
        if (!selectedProjectId) return;
        try {
            const result = await dispatchTeam(selectedProjectId);
            if (result?.count > 0) {
                message.success(`Dispatched ${result.count} tasks`);
            } else {
                message.info("No tasks to dispatch. Create tasks first.");
            }
        } catch {
            message.error("Failed to dispatch tasks.");
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
            } else if (canLaunch) {
                handleCreate();
            }
        }
    };

    // Get live status for an agent (WS updates override DB status)
    const getAgentStatus = (agent) => {
        const ws = agentStatuses[agent.id];
        return ws?.status || agent.status || "idle";
    };

    /* ── Render ────────────────────────────────────────────────────── */

    return (
        <div className="animate-fade-in" style={sty.container}>
            {/* ── Header ─────────────────────────────────────── */}
            <div className="page-header" style={{ marginBottom: 24 }}>
                <Flex align="center" gap={12}>
                    <TeamOutlined style={{ fontSize: 22, color: "var(--log-info)" }} />
                    <div>
                        <Title level={4} style={{ margin: 0, fontSize: 18 }}>
                            Agent Teams
                        </Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {isTeamActive
                                ? `${teamConfig?.team_name || "Team"} \u2014 ${agents.length} agents`
                                : "Select a preset or describe your team"
                            }
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
                                Disband
                            </Button>
                        </Flex>
                    )}
                </Flex>
            </div>

            {/* ── Team Creation ───────────────────────────────── */}
            {!isTeamActive && (
                <div style={sty.promptBox}>
                    {/* Presets from backend */}
                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
                        TEAM PRESETS
                    </Text>
                    <Flex gap={10} wrap="wrap" style={{ marginTop: 8, marginBottom: 16 }}>
                        {(presets || []).map((p) => {
                            const color = PRESET_COLORS[p.id] || "#6366f1";
                            const isActive = activePreset === p.id;
                            return (
                                <div
                                    key={p.id}
                                    style={sty.presetCard(color, isActive)}
                                    onClick={() => handlePresetClick(p)}
                                >
                                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: isActive ? color : "inherit" }}>
                                        {p.icon} {p.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                                        {p.description}
                                    </div>
                                    <Flex gap={4} wrap="wrap">
                                        {(p.agents || []).map((a, i) => (
                                            <Tag
                                                key={i}
                                                style={{
                                                    fontSize: 10, padding: "0 6px", margin: 0,
                                                    borderRadius: 4, border: "none",
                                                    background: isActive ? `${color}22` : "var(--bg-tag)",
                                                }}
                                            >
                                                {ROLE_EMOJIS[a.role] || ""} {a.name}
                                            </Tag>
                                        ))}
                                    </Flex>
                                </div>
                            );
                        })}
                        {(!presets || presets.length === 0) && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Loading presets...
                            </Text>
                        )}
                    </Flex>

                    {/* Divider */}
                    <Flex align="center" gap={8} style={{ margin: "8px 0 12px" }}>
                        <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
                        <Text type="secondary" style={{ fontSize: 10 }}>OR CUSTOM PROMPT</Text>
                        <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
                    </Flex>

                    {/* Custom Prompt */}
                    <TextArea
                        value={prompt}
                        onChange={(e) => {
                            setPrompt(e.target.value);
                            if (e.target.value.trim()) setActivePreset(null);
                        }}
                        placeholder="Describe what you want the team to do..."
                        autoSize={{ minRows: 3, maxRows: 10 }}
                        style={{
                            background: "var(--bg-input)",
                            border: "1.5px solid var(--border-subtle)",
                            borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                            padding: "12px 16px",
                            fontFamily: '"Inter", -apple-system, sans-serif',
                        }}
                        onKeyDown={handleKeyDown}
                    />

                    {/* Settings */}
                    <Flex align="center" justify="space-between" style={{ marginTop: 12 }}>
                        <Button
                            type="text" size="small"
                            icon={<SettingOutlined />}
                            onClick={() => setShowSettings(!showSettings)}
                            style={{ fontSize: 11, color: "var(--text-muted)" }}
                        >
                            {showSettings ? "Hide" : "Settings"}
                        </Button>
                        <Text type="secondary" style={{ fontSize: 10 }}>
                            {"\u2318"}+Enter to launch
                        </Text>
                    </Flex>

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
                                    <Text type="secondary" style={{ fontSize: 10 }}>Lead Model</Text>
                                    <Select
                                        size="small" value={model || undefined}
                                        onChange={setModel}
                                        options={MODEL_OPTIONS}
                                        placeholder="Default"
                                        allowClear
                                        style={{ width: 180, marginTop: 2 }}
                                    />
                                </div>
                            </Flex>
                        </div>
                    )}

                    {/* Launch */}
                    <Button
                        type="primary" size="large" block
                        icon={creating ? <LoadingOutlined /> : <ThunderboltOutlined />}
                        onClick={handleCreate}
                        loading={creating}
                        disabled={!canLaunch || creating}
                        style={{
                            marginTop: 16, height: 48, borderRadius: 12,
                            fontSize: 15, fontWeight: 600,
                            background: canLaunch
                                ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                                : undefined,
                            border: "none",
                        }}
                    >
                        {creating ? "Launching Team..." : (
                            activePreset
                                ? `Launch ${(presets || []).find(p => p.id === activePreset)?.name || "Team"}`
                                : "Launch Agent Team"
                        )}
                    </Button>
                </div>
            )}

            {/* ── Active Team Dashboard ──────────────────────── */}
            {isTeamActive && (
                <div style={{ marginTop: 4 }}>
                    {/* Team Info Bar */}
                    <div style={{ ...sty.settingsRow, marginBottom: 16 }}>
                        <Flex align="center" gap={16}>
                            <div>
                                <Text type="secondary" style={{ fontSize: 10 }}>TEAM</Text>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>
                                    {teamConfig?.team_name || "Agent Team"}
                                </div>
                            </div>
                            {teamConfig?.preset_id && (
                                <>
                                    <div style={{ width: 1, height: 28, background: "var(--border-subtle)" }} />
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 10 }}>PRESET</Text>
                                        <div style={{ fontSize: 13 }}>
                                            {teamConfig.preset_id}
                                        </div>
                                    </div>
                                </>
                            )}
                            <div style={{ width: 1, height: 28, background: "var(--border-subtle)" }} />
                            <div>
                                <Text type="secondary" style={{ fontSize: 10 }}>AGENTS</Text>
                                <div style={{ fontSize: 13 }}>
                                    {agents.length}
                                </div>
                            </div>
                        </Flex>
                    </div>

                    {/* Agents List */}
                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
                        AGENTS
                    </Text>
                    <div style={{ marginTop: 8, marginBottom: 16 }}>
                        {agents.map((agent) => {
                            const status = getAgentStatus(agent);
                            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
                            return (
                                <div key={agent.id} style={sty.agentRow}>
                                    <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>
                                        {ROLE_EMOJIS[agent.role] || ROLE_EMOJIS.custom}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                                            {agent.name}
                                            {agent.is_lead && (
                                                <Tag
                                                    color="purple"
                                                    style={{
                                                        fontSize: 9, padding: "0 6px", marginLeft: 6,
                                                        borderRadius: 4, lineHeight: "18px",
                                                    }}
                                                >
                                                    LEAD
                                                </Tag>
                                            )}
                                        </div>
                                        {agent.sdk_agent_key && (
                                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                                                {agent.sdk_agent_key}
                                            </div>
                                        )}
                                    </div>
                                    <Flex align="center" gap={6}>
                                        <div style={sty.statusDot(cfg.cssColor)} />
                                        <Text style={{ fontSize: 11, color: cfg.cssColor }}>
                                            {cfg.label}
                                        </Text>
                                    </Flex>
                                </div>
                            );
                        })}
                        {agents.length === 0 && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                No agents created yet.
                            </Text>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <Flex gap={8} wrap="wrap" style={{ marginBottom: 16 }}>
                        <Button
                            type="primary" size="small"
                            icon={<ThunderboltOutlined />}
                            onClick={handleDispatch}
                        >
                            Dispatch Tasks
                        </Button>
                        <Button
                            size="small"
                            onClick={() => sendCommand(selectedProjectId, "What's the status of each teammate?")}
                        >
                            Check Status
                        </Button>
                        <Button
                            size="small"
                            onClick={() => fetchTeamStatus(selectedProjectId)}
                        >
                            Refresh
                        </Button>
                    </Flex>

                    {/* Live Output (from WS logs) */}
                    <div style={{ marginBottom: 12 }}>
                        <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
                                LIVE OUTPUT
                            </Text>
                            <Badge
                                count={teamOutput?.length || 0}
                                showZero size="small"
                                style={{ backgroundColor: "var(--log-info)" }}
                            />
                        </Flex>
                        <div ref={outputRef} style={sty.outputContainer}>
                            {(!teamOutput || teamOutput.length === 0) ? (
                                <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
                                    Waiting for output...
                                </div>
                            ) : (
                                teamOutput.map((line, i) => (
                                    <div key={i} style={sty.outputLine(line.level)}>
                                        <span style={{ color: "var(--time-stamp)", marginRight: 8 }}>
                                            {line.ts ? new Date(line.ts).toLocaleTimeString("en", {
                                                hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
                                            }) : ""}
                                        </span>
                                        {line.agent_id != null && (
                                            <span style={{ color: "var(--agent-tag)", marginRight: 6 }}>
                                                [{agents.find(a => a.id === line.agent_id)?.name || `agent-${line.agent_id}`}]
                                            </span>
                                        )}
                                        {line.message || ""}
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
                            placeholder={"Send a command to the lead agent... (\u2318+Enter)"}
                            autoSize={{ minRows: 2, maxRows: 5 }}
                            onKeyDown={handleKeyDown}
                            style={{
                                flex: 1, background: "var(--bg-input)",
                                border: "1.5px solid var(--border-subtle)",
                                borderRadius: 10, fontSize: 13,
                            }}
                        />
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={handleSendCommand}
                            loading={sending}
                            disabled={!commandText.trim()}
                            style={{ height: "auto", borderRadius: 10, minWidth: 48 }}
                        />
                    </Flex>
                </div>
            )}

            {/* ── Empty State ─────────────────────────────────── */}
            {!isTeamActive && !activePreset && !prompt && (
                <div style={{ marginTop: 32, textAlign: "center", padding: "24px 0" }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Pick a team preset or write a custom prompt to get started.
                    </Text>
                </div>
            )}
        </div>
    );
}
