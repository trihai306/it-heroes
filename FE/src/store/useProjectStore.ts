import { create } from "zustand";
import { projectApi, type Project } from "../services/api";

interface ProjectState {
    projects: Project[];
    activeProjectId: string | null;
    loading: boolean;

    fetchProjects: () => Promise<void>;
    createProject: (data: { name: string; path: string; description?: string }) => Promise<Project | null>;
    deleteProject: (id: string) => Promise<void>;
    setActiveProject: (id: string | null) => void;
}

const STORAGE_KEY = "ithero_active_project";

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    activeProjectId: localStorage.getItem(STORAGE_KEY),
    loading: false,

    fetchProjects: async () => {
        set({ loading: true });
        try {
            const projects = await projectApi.list();
            set({ projects, loading: false });

            // If active project no longer exists, reset
            const { activeProjectId } = get();
            if (activeProjectId && !projects.find((p) => p.id === activeProjectId)) {
                set({ activeProjectId: null });
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch {
            set({ loading: false });
        }
    },

    createProject: async (data) => {
        try {
            const project = await projectApi.create(data);
            set((s) => ({
                projects: [...s.projects, project],
                activeProjectId: project.id,
            }));
            localStorage.setItem(STORAGE_KEY, project.id);
            return project;
        } catch {
            return null;
        }
    },

    deleteProject: async (id) => {
        try {
            await projectApi.delete(id);
            set((s) => {
                const newProjects = s.projects.filter((p) => p.id !== id);
                const newActiveId = s.activeProjectId === id
                    ? (newProjects[0]?.id || null)
                    : s.activeProjectId;
                if (newActiveId) {
                    localStorage.setItem(STORAGE_KEY, newActiveId);
                } else {
                    localStorage.removeItem(STORAGE_KEY);
                }
                return { projects: newProjects, activeProjectId: newActiveId };
            });
        } catch { }
    },

    setActiveProject: (id) => {
        set({ activeProjectId: id });
        if (id) {
            localStorage.setItem(STORAGE_KEY, id);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    },
}));
