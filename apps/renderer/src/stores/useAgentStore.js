/**
 * Zustand store for agent & team management — CLI Agent Teams.
 */
import { create } from "zustand";
import agentService from "../services/agentService";

const useAgentStore = create((set, get) => ({
    // State
    agents: [],  // All agents for the current project
    agentStatuses: {}, // agent_id -> { status, lastSeen }
    agentPositions: {}, // agent_id -> { x, z, facing_angle, is_walking, status }
    teamConfig: null, // Current team configuration
    teamOutput: [], // Output lines from lead session
    loading: false,
    presets: [], // Team presets from server

    // ── Agent Queries ────────────────────────────────────────────────

    fetchAgents: async (projectId) => {
        set({ loading: true });
        try {
            const data = await agentService.list(projectId);
            set({ agents: data, loading: false });
        } catch {
            set({ loading: false });
        }
    },

    fetchPositions: async (projectId) => {
        try {
            const data = await agentService.positions(projectId);
            if (data.positions) {
                set({ agentPositions: data.positions });
            }
        } catch {
            // Silently fail — positions will come via WebSocket
        }
    },

    setPositions: (positions) => {
        set({ agentPositions: positions });
    },

    updatePosition: (agentId, posData) => {
        set((s) => ({
            agentPositions: {
                ...s.agentPositions,
                [agentId]: posData,
            },
        }));
    },

    clearPositions: () => {
        set({ agentPositions: {} });
    },

    // ── Team Management (CLI Agent Teams) ────────────────────────────

    fetchPresets: async () => {
        try {
            const data = await agentService.presets();
            set({ presets: data.presets || [] });
        } catch {
            // ignore
        }
    },

    createTeamFromPreset: async (projectId, presetId, model = "") => {
        set({ loading: true });
        try {
            const data = await agentService.createTeamFromPreset(projectId, { presetId, model });
            set({
                agents: data.agents || [],
                teamConfig: data,
                loading: false,
            });
            return data;
        } catch (err) {
            set({ loading: false });
            throw err;
        }
    },

    createTeamFromPrompt: async (projectId, prompt, teamName = "chibi-team", model = "") => {
        set({ loading: true });
        try {
            const data = await agentService.createTeamFromPrompt(projectId, { prompt, teamName, model });
            set({
                agents: data.agents || [],
                teamConfig: data,
                loading: false,
            });
            return data;
        } catch (err) {
            set({ loading: false });
            throw err;
        }
    },

    dispatchTeam: async (projectId) => {
        try {
            return await agentService.dispatchTeam(projectId);
        } catch {
            return null;
        }
    },

    startAgent: async (projectId, agentId, taskId) => {
        try {
            return await agentService.startAgent(projectId, agentId, taskId);
        } catch {
            return null;
        }
    },

    stopAgent: async (projectId, agentId) => {
        try {
            const result = await agentService.stopAgent(projectId, agentId);
            set((s) => ({
                agentStatuses: {
                    ...s.agentStatuses,
                    [agentId]: { status: "idle", lastSeen: new Date().toISOString() },
                },
            }));
            return result;
        } catch {
            return null;
        }
    },

    fetchTeamStatus: async (projectId) => {
        try {
            const data = await agentService.teamStatus(projectId);
            set({
                agents: data.agents || [],
                teamConfig: data,  // { active, team_name, preset_id, agents, agent_count }
            });
            return data;
        } catch {
            return null;
        }
    },

    sendMessage: async (projectId, toAgentName, message) => {
        try {
            return await agentService.sendMessage(projectId, toAgentName, message);
        } catch {
            return null;
        }
    },

    broadcastMessage: async (projectId, message) => {
        try {
            return await agentService.broadcast(projectId, message);
        } catch {
            return null;
        }
    },

    sendCommand: async (projectId, message) => {
        try {
            return await agentService.command(projectId, message);
        } catch {
            return null;
        }
    },

    appendTeamOutput: (entry) => {
        set((s) => ({
            teamOutput: [...(s.teamOutput || []), entry].slice(-200),
        }));
    },

    cleanupTeam: async (projectId) => {
        set({ loading: true });
        try {
            await agentService.cleanup(projectId);
            set({
                agents: [],
                agentStatuses: {},
                agentPositions: {},
                teamOutput: [],
                teamConfig: null,
                loading: false,
            });
        } catch {
            set({ loading: false });
        }
    },

    updateAgentStatus: (agentId, status) => {
        set((s) => ({
            agentStatuses: {
                ...s.agentStatuses,
                [agentId]: { status, lastSeen: new Date().toISOString() },
            },
        }));
    },

    getAgentById: (agentId) => {
        return get().agents.find((a) => a.id === agentId);
    },

    getAgentsByRole: (role) => {
        return get().agents.filter((a) => a.role === role);
    },
}));

export default useAgentStore;
