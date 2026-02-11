/**
 * Zustand store for project state.
 */
import { create } from "zustand";
import projectService from "../services/projectService";

const STORAGE_KEY = "chibi_selectedProjectId";

const useProjectStore = create((set, get) => ({
    // State
    projects: [],
    selectedProjectId: (() => {
        try { const v = localStorage.getItem(STORAGE_KEY); return v ? Number(v) : null; } catch { return null; }
    })(),
    loading: false,
    error: null,

    // Computed
    selectedProject: () => {
        const { projects, selectedProjectId } = get();
        return projects.find((p) => p.id === selectedProjectId) || null;
    },

    // Actions
    fetchProjects: async () => {
        set({ loading: true, error: null });
        try {
            const data = await projectService.list();
            const currentId = get().selectedProjectId;
            const validSelection = currentId && data.some((p) => p.id === currentId);

            // Only restore persisted selection if valid — DON'T auto-select
            // so the Setup Dashboard (WelcomePage) is visible on first open
            const selectedProjectId = validSelection ? currentId : null;

            set({ projects: data, selectedProjectId, loading: false });

            // Clear invalid persisted selection
            if (!validSelection && currentId) {
                try { localStorage.removeItem(STORAGE_KEY); } catch { }
            }
        } catch (err) {
            set({ error: err.message, loading: false });
        }
    },

    createProject: async (repoPath, name) => {
        set({ loading: true, error: null });
        try {
            const project = await projectService.create(repoPath, name);
            set((s) => ({
                projects: [...s.projects, project],
                selectedProjectId: project.id,
                loading: false,
            }));
            try { localStorage.setItem(STORAGE_KEY, String(project.id)); } catch { }
            return project;
        } catch (err) {
            set({ error: err.message, loading: false });
            throw err;
        }
    },

    selectProject: async (projectId) => {
        set({ selectedProjectId: projectId });
        try { localStorage.setItem(STORAGE_KEY, String(projectId)); } catch { }
    },
}));

export default useProjectStore;
