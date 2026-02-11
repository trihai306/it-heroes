/**
 * OfficeFloor — Premium 2D office floor with agent zones,
 * workstations, ambient decorations, and lounge area
 */
import { Flex, Typography } from "antd";
import ChibiCharacter from "./ChibiCharacter";
import { Desk, Plant, WaterCooler, CoffeeMachine, Whiteboard, Bookshelf, WallClock } from "./OfficeFurniture";

const { Text } = Typography;

const DEPT_COLORS = {
    backend: { accent: "#6366f1", bg: "rgba(99, 102, 241, 0.04)", border: "rgba(99, 102, 241, 0.15)" },
    frontend: { accent: "#a855f7", bg: "rgba(168, 85, 247, 0.04)", border: "rgba(168, 85, 247, 0.15)" },
    qa: { accent: "#22c55e", bg: "rgba(34, 197, 94, 0.04)", border: "rgba(34, 197, 94, 0.15)" },
    desktop: { accent: "#f59e0b", bg: "rgba(245, 158, 11, 0.04)", border: "rgba(245, 158, 11, 0.15)" },
    default: { accent: "#6366f1", bg: "rgba(99, 102, 241, 0.03)", border: "rgba(99, 102, 241, 0.1)" },
};

function getDeptTheme(folderPath) {
    const path = (folderPath || "").toLowerCase();
    if (path.includes("backend") || path.includes("api")) return DEPT_COLORS.backend;
    if (path.includes("frontend") || path.includes("client") || path.includes("renderer")) return DEPT_COLORS.frontend;
    if (path.includes("test") || path.includes("qa")) return DEPT_COLORS.qa;
    if (path.includes("desktop") || path.includes("electron")) return DEPT_COLORS.desktop;
    return DEPT_COLORS.default;
}

function getRoomEmoji(folderPath) {
    const path = (folderPath || "").toLowerCase();
    if (path.includes("backend") || path.includes("api")) return "\u2699\uFE0F";
    if (path.includes("frontend") || path.includes("client") || path.includes("renderer")) return "\uD83C\uDFA8";
    if (path.includes("test")) return "\uD83E\uDDEA";
    if (path.includes("doc")) return "\uD83D\uDCC4";
    if (path.includes("desktop") || path.includes("electron")) return "\uD83D\uDDA5\uFE0F";
    if (path.includes("script")) return "\uD83D\uDCDC";
    return "\uD83D\uDCC1";
}

/* ─── Workstation: agent + desk combo ─────────────────────────────── */
function Workstation({ agent, status, onAgentClick }) {
    const isReview = status === "review";
    const isActive = status === "in_progress" || isReview;

    return (
        <div className="workstation">
            <ChibiCharacter
                agent={agent}
                status={status}
                onClick={onAgentClick}
            />
            <Desk active={isActive} reviewMode={isReview} />
        </div>
    );
}

/* ─── Office Zone ─────────────────────────────────────────────── */
function OfficeZone({ zone, onAgentClick }) {
    const { dept, deskAgents, walkingAgents, blockedAgents } = zone;
    const emoji = getRoomEmoji(dept.folder_path || "");
    const theme = getDeptTheme(dept.folder_path || "");
    const isEmpty = deskAgents.length === 0 && walkingAgents.length === 0 && blockedAgents.length === 0;
    const agentCount = deskAgents.length + walkingAgents.length + blockedAgents.length;

    return (
        <div className="dept-zone" style={{
            background: theme.bg,
            borderColor: theme.border,
        }}>
            {/* Zone header label */}
            <div className="dept-zone-label" style={{ borderColor: theme.border }}>
                <span className="dept-zone-icon">{emoji}</span>
                {dept.name}
                {agentCount > 0 && (
                    <span className="dept-zone-count" style={{ color: theme.accent }}>{agentCount}</span>
                )}
            </div>

            {/* Accent indicator bar */}
            <div className="dept-zone-accent" style={{ background: theme.accent }} />

            <div className="desk-row">
                {/* Agents working at desks */}
                {deskAgents.map(({ agent, status }) => (
                    <Workstation key={agent.id} agent={agent} status={status} onAgentClick={onAgentClick} />
                ))}

                {/* Idle agents walking around */}
                {walkingAgents.map(({ agent, status, walkIndex, walkDuration, walkDelay }) => (
                    <ChibiCharacter
                        key={agent.id}
                        agent={agent}
                        status={status}
                        walkIndex={walkIndex}
                        walkDuration={walkDuration}
                        walkDelay={walkDelay}
                        onClick={onAgentClick}
                    />
                ))}

                {/* Blocked agents holding coffee */}
                {blockedAgents.map(({ agent, status }) => (
                    <ChibiCharacter key={agent.id} agent={agent} status={status} onClick={onAgentClick} />
                ))}

                {/* Zone decorations */}
                {!isEmpty && (
                    <div className="zone-decor">
                        <Plant size="small" />
                    </div>
                )}

                {isEmpty && (
                    <Flex align="center" justify="center" style={{ width: "100%", height: 100 }}>
                        <Text type="secondary" style={{ fontSize: 11, fontStyle: "italic" }}>
                            Empty room — waiting for agents
                        </Text>
                    </Flex>
                )}
            </div>
        </div>
    );
}

/* ─── Main Office Floor ──────────────────────────────────────────── */
export default function OfficeFloor({ zoneLayouts, onAgentClick }) {
    return (
        <div className="office-floor">
            {/* Office ambient header */}
            <div className="office-floor-header">
                <WallClock style={{ position: "absolute", top: 8, right: 16 }} />
            </div>

            {/* Office zones grid */}
            <Flex gap={20} wrap="wrap">
                {zoneLayouts.map((zone) => (
                    <div key={zone.dept.id} style={{ flex: "1 1 360px", minWidth: 320 }}>
                        <OfficeZone zone={zone} onAgentClick={onAgentClick} />
                    </div>
                ))}
            </Flex>

            {/* Common Area — Lounge */}
            <div className="common-area">
                <span className="common-area-label">
                    <span className="common-area-label-icon">☕</span>
                    Lounge
                </span>
                <div className="common-area-items">
                    <CoffeeMachine />
                    <WaterCooler />
                    <Plant />
                    <Plant size="small" />
                    <Bookshelf />
                    <Whiteboard />
                </div>
            </div>
        </div>
    );
}
