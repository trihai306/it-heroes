/**
 * Zustand store for agent & team management.
 */
import { create } from "zustand";
import agentService from "../services/agentService";

const useAgentStore = create((set, get) => ({
    // State
    agents: [],  // All agents for the current project
    agentStatuses: {}, // agent_id -> { status, lastSeen }
    agentPositions: {}, // agent_id -> { x, z, facing_angle, is_walking, status }
    teamConfig: null, // Current team configuration
    teamSessions: null, // Live session status
    teamOutput: [], // Output lines from lead session
    loading: false,
    presets: [], // Team presets from server

    // Actions — Legacy (keep backward compat)
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

    // ── Team Management (new) ──────────────────────────────────────

    fetchPresets: async () => {
        try {
            const data = await agentService.presets();
            set({ presets: data.presets || [] });
        } catch {
            // ignore
        }
    },

    createTeam: async (projectId, prompt, teamName = "chibi-team", model = "claude-sonnet-4-5-20250929") => {
        set({ loading: true });
        try {
            const data = await agentService.createTeam(projectId, { prompt, teamName, model });
            set({
                teamConfig: data,
                loading: false,
            });
            return data;
        } catch (err) {
            set({ loading: false });
            throw err;
        }
    },

    fetchTeamStatus: async (projectId) => {
        try {
            const data = await agentService.teamStatus(projectId);
            set({
                agents: data.agents || [],
                teamSessions: data.session || null,
            });
            return data;
        } catch {
            return null;
        }
    },

    addTeammate: async (projectId, prompt) => {
        try {
            return await agentService.addTeammate(projectId, prompt);
        } catch {
            return null;
        }
    },

    removeTeammate: async (projectId, agentId) => {
        try {
            await agentService.removeTeammate(projectId, agentId);
            set((s) => ({ agents: s.agents.filter((a) => a.id !== agentId) }));
        } catch {
            // ignore
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

    fetchTeamOutput: async (projectId, lastN = 50) => {
        try {
            const data = await agentService.output(projectId, lastN);
            set({ teamOutput: data.output || [] });
            return data.output;
        } catch {
            return [];
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
                teamSessions: null,
                loading: false,
            });
        } catch {
            set({ loading: false });
        }
    },

    // Legacy compat
    disbandTeam: async (projectId) => {
        return get().cleanupTeam(projectId);
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
