/**
 * Agent & Team API service — CLI Agent Teams only.
 */
import api from "./api";

const agentService = {
    /* ── Agents ─────────────────────────────────────────── */

    /** List agents for a project */
    list: (projectId) => api.get(`/projects/${projectId}/agents`),

    /** Update agent (rules, name, etc.) */
    update: (agentId, data) => api.patch(`/agents/${agentId}`, data),

    /* ── Team Management (CLI Agent Teams) ─────────────── */

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

    /** Check prerequisites (CLI available) */
    checkPrerequisites: (projectId = 1) =>
        api.get(`/projects/${projectId}/teams/prerequisites`),

    /** Get full team status */
    teamStatus: (projectId) => api.get(`/projects/${projectId}/teams`),

    /** Send command to lead agent */
    command: (projectId, message) =>
        api.post(`/projects/${projectId}/teams/command`, { message }),

    /** Send message to specific agent */
    sendMessage: (projectId, toAgentName, message) =>
        api.post(`/projects/${projectId}/teams/message`, {
            to_agent_name: toAgentName,
            message,
        }),

    /** Broadcast message to all agents */
    broadcast: (projectId, message) =>
        api.post(`/projects/${projectId}/teams/broadcast`, { message }),

    /** Cleanup / disband team */
    cleanup: (projectId) =>
        api.post(`/projects/${projectId}/teams/cleanup`),

    /* ── CLI Agent Teams file-based data ───────────────── */

    /** Get team config.json from ~/.claude/teams/ */
    teamConfig: (projectId) =>
        api.get(`/projects/${projectId}/teams/config`),

    /** Get all inbox messages for the team */
    teamInboxes: (projectId) =>
        api.get(`/projects/${projectId}/teams/inboxes`),

    /** Get Claude Code shared task list */
    teamTasks: (projectId) =>
        api.get(`/projects/${projectId}/teams/tasks`),
};

export default agentService;
