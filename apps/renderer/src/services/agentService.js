/**
 * Agent & Team API service.
 */
import api from "./api";

const agentService = {
    /* ── Agents ─────────────────────────────────────────── */

    /** List agents for a project */
    list: (projectId) => api.get(`/projects/${projectId}/agents`),

    /** Update agent (rules, name, etc.) */
    update: (agentId, data) => api.patch(`/agents/${agentId}`, data),

    /* ── Unified Team Management (new) ───────────────────── */

    /** Get team presets (from team_presets.py) */
    presets: (projectId = 1) => api.get(`/projects/${projectId}/teams/presets`),

    /** Create team from preset (fullstack, research, review, debug) */
    createTeamFromPreset: (projectId, { presetId, model = "" }) =>
        api.post(`/projects/${projectId}/teams/create-from-preset`, {
            preset_id: presetId,
            model,
        }),

    /** Create team from natural language prompt */
    createTeamFromPrompt: (projectId, { prompt, teamName = "chibi-team", model = "" }) =>
        api.post(`/projects/${projectId}/teams/create-from-prompt`, {
            prompt,
            team_name: teamName,
            model,
        }),

    /** Auto-dispatch pending tasks to agents */
    dispatchTeam: (projectId) =>
        api.post(`/projects/${projectId}/teams/dispatch`),

    /** Start a specific agent on a specific task */
    startAgent: (projectId, agentId, taskId) =>
        api.post(`/projects/${projectId}/teams/start-agent`, {
            agent_id: agentId,
            task_id: taskId,
        }),

    /** Stop a specific agent */
    stopAgent: (projectId, agentId) =>
        api.post(`/projects/${projectId}/teams/stop-agent`, {
            agent_id: agentId,
            task_id: 0,
        }),

    /** Check prerequisites (SDK, CLI available) */
    checkPrerequisites: (projectId = 1) =>
        api.get(`/projects/${projectId}/teams/prerequisites`),

    /** Get full team status */
    teamStatus: (projectId) => api.get(`/projects/${projectId}/teams`),

    /** Get agent/team output */
    getAgentOutput: (projectId, agentId = 0, lastN = 50) =>
        api.get(`/projects/${projectId}/teams/output?agent_id=${agentId}&last_n=${lastN}`),

    /* ── Legacy Team Management (backward compat) ──────── */

    /** Create a team (legacy — uses old TeamManager) */
    createTeam: (projectId, { prompt, teamName = "chibi-team", model = "claude-sonnet-4-5-20250929" }) =>
        api.post(`/projects/${projectId}/teams`, {
            prompt,
            team_name: teamName,
            model,
        }),

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

    /** Fetch team output (legacy) */
    output: (projectId, lastN = 50) =>
        api.get(`/projects/${projectId}/teams/output?last_n=${lastN}`),

    /** Cleanup / disband team */
    cleanup: (projectId) =>
        api.post(`/projects/${projectId}/teams/cleanup`),
};

export default agentService;
