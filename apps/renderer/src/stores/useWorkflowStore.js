/**
 * Zustand store for workflow state — syncs with backend API.
 */
import { create } from "zustand";
import workflowService from "../services/workflowService";

const useWorkflowStore = create((set, get) => ({
    workflows: [],
    activeWorkflow: null,
    loading: false,
    error: null,

    fetchWorkflows: async (projectId) => {
        if (!projectId) return;
        set({ loading: true, error: null });
        try {
            const data = await workflowService.list(projectId);
            const active = data.find((w) => w.is_active) || null;
            set({ workflows: data, activeWorkflow: active, loading: false });
        } catch (err) {
            set({ error: err.message, loading: false });
        }
    },

    createWorkflow: async (projectId, payload) => {
        try {
            const wf = await workflowService.create(projectId, payload);
            set((s) => ({
                workflows: [...s.workflows, wf],
                activeWorkflow: wf.is_active ? wf : s.activeWorkflow,
            }));
            return wf;
        } catch (err) {
            set({ error: err.message });
            throw err;
        }
    },

    updateWorkflow: async (workflowId, data) => {
        try {
            const wf = await workflowService.update(workflowId, data);
            set((s) => ({
                workflows: s.workflows.map((w) => (w.id === wf.id ? wf : w)),
                activeWorkflow: wf.is_active ? wf : (s.activeWorkflow?.id === wf.id ? wf : s.activeWorkflow),
            }));
            return wf;
        } catch (err) {
            set({ error: err.message });
            throw err;
        }
    },

    deleteWorkflow: async (workflowId) => {
        try {
            await workflowService.remove(workflowId);
            set((s) => ({
                workflows: s.workflows.filter((w) => w.id !== workflowId),
                activeWorkflow: s.activeWorkflow?.id === workflowId ? null : s.activeWorkflow,
            }));
        } catch (err) {
            set({ error: err.message });
        }
    },

    activateWorkflow: async (workflowId) => {
        try {
            const wf = await workflowService.activate(workflowId);
            set((s) => ({
                workflows: s.workflows.map((w) => {
                    if (w.id === wf.id) return wf;
                    return w.is_active ? { ...w, is_active: false } : w;
                }),
                activeWorkflow: wf.is_active ? wf : null,
            }));
            return wf;
        } catch (err) {
            set({ error: err.message });
        }
    },
}));

export default useWorkflowStore;
