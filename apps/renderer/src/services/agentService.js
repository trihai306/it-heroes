/**
 * Agent & Team API service.
 */
import api from "./api";

const agentService = {
    /* ── Agents ─────────────────────────────────────────── */

    /** List agents for a project */
    list: (projectId) => api.get(`/projects/${projectId}/agents`),

    /** Get agent positions for 3D scene */
    positions: (projectId) => api.get(`/projects/${projectId}/agents/positions`),

    /* ── Team Management ────────────────────────────────── */

    /** Get team presets */
    presets: () => api.get("/projects/1/teams/presets"),

    /** Create a team */
    createTeam: (projectId, { prompt, teamName = "chibi-team", model = "claude-sonnet-4-5-20250929" }) =>
        api.post(`/projects/${projectId}/teams`, {
            prompt,
            team_name: teamName,
            model,
        }),

    /** Get team status */
    teamStatus: (projectId) => api.get(`/projects/${projectId}/teams`),

    /** Add a teammate */
    addTeammate: (projectId, prompt) =>
        api.post(`/projects/${projectId}/teams/teammates`, { prompt }),

    /** Remove a teammate */
    removeTeammate: (projectId, agentId) =>
        api.del(`/projects/${projectId}/teams/teammates/${agentId}`),

    /** Send message to specific agent */
    sendMessage: (projectId, toAgentName, message) =>
        api.post(`/projects/${projectId}/teams/message`, {
            to_agent_name: toAgentName,
            message,
        }),

    /** Broadcast message to all agents */
    broadcast: (projectId, message) =>
        api.post(`/projects/${projectId}/teams/broadcast`, { message }),

    /** Send command */
    command: (projectId, message) =>
        api.post(`/projects/${projectId}/teams/command`, { message }),

    /** Fetch team output */
    output: (projectId, lastN = 50) =>
        api.get(`/projects/${projectId}/teams/output?last_n=${lastN}`),

    /** Cleanup / disband team */
    cleanup: (projectId) =>
        api.post(`/projects/${projectId}/teams/cleanup`),
};

export default agentService;
