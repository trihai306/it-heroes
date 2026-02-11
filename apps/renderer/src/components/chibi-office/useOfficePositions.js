/**
 * useOfficePositions — Calculates agent positions in the office
 * Groups agents and assigns desk vs walking roles.
 * Always uses a single "Main Office" zone.
 */
import { useMemo } from "react";

const DESK_STATUSES = ["in_progress", "review", "failed"];
const WALKING_STATUSES = ["idle", "done"];
const BLOCKED_STATUS = "blocked";

/**
 * Hash agent id to a number for deterministic random assignments
 */
function hashId(id) {
    if (typeof id === "number") return id;
    let h = 0;
    const s = String(id);
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

export default function useOfficePositions(agents, agentStatuses) {
    return useMemo(() => {
        const mainOffice = { id: "__virtual_main__", name: "Main Office" };

        const zoneLayouts = [mainOffice].map((dept) => {
            const deskAgents = [];
            const walkingAgents = [];
            const blockedAgents = [];

            agents.forEach((agent, idx) => {
                const status = agentStatuses[agent.id]?.status || "idle";
                const h = hashId(agent.id);

                if (DESK_STATUSES.includes(status)) {
                    deskAgents.push({ agent, status, deskIndex: idx });
                } else if (status === BLOCKED_STATUS) {
                    blockedAgents.push({ agent, status });
                } else {
                    walkingAgents.push({
                        agent,
                        status,
                        walkIndex: h % 4,
                        walkDuration: 8 + (h % 7),
                        walkDelay: (h % 5),
                        startX: 40 + (idx * 90),
                        startY: 60,
                    });
                }
            });

            return {
                dept,
                deptAgents: agents,
                deskAgents,
                walkingAgents,
                blockedAgents,
            };
        });

        // Global summaries
        const totalWorking = zoneLayouts.reduce((sum, z) => sum + z.deskAgents.length, 0);
        const totalWalking = zoneLayouts.reduce((sum, z) => sum + z.walkingAgents.length, 0);
        const totalBlocked = zoneLayouts.reduce((sum, z) => sum + z.blockedAgents.length, 0);

        return {
            zoneLayouts,
            totalWorking,
            totalWalking,
            totalBlocked,
        };
    }, [agents, agentStatuses]);
}
