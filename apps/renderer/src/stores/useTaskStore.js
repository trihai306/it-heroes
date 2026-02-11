/**
 * Zustand store for task management.
 */
import { create } from "zustand";
import taskService from "../services/taskService";

const STATUSES = ["todo", "in_progress", "blocked", "review", "done", "failed"];

const useTaskStore = create((set, get) => ({
    // State
    tasks: [],
    selectedTaskId: null,
    loading: false,

    // Computed
    tasksByStatus: () => {
        const grouped = {};
        STATUSES.forEach((s) => (grouped[s] = []));
        get().tasks.forEach((t) => {
            if (grouped[t.status]) grouped[t.status].push(t);
        });
        return grouped;
    },

    selectedTask: () => {
        return get().tasks.find((t) => t.id === get().selectedTaskId) || null;
    },

    // Actions
    fetchTasks: async (projectId) => {
        set({ loading: true });
        try {
            const data = await taskService.list(projectId);
            set({ tasks: data, loading: false });
        } catch {
            set({ loading: false });
        }
    },

    createTask: async (projectId, taskData) => {
        try {
            const task = await taskService.create(projectId, taskData);
            set((s) => ({ tasks: [...s.tasks, task] }));
            return task;
        } catch {
            // ignore
        }
    },

    updateTask: async (taskId, updates) => {
        try {
            const updated = await taskService.update(taskId, updates);
            set((s) => ({
                tasks: s.tasks.map((t) => (t.id === taskId ? updated : t)),
            }));
            return updated;
        } catch {
            // ignore
        }
    },

    deleteTask: async (taskId) => {
        try {
            await taskService.remove(taskId);
            set((s) => ({
                tasks: s.tasks.filter((t) => t.id !== taskId),
                selectedTaskId: s.selectedTaskId === taskId ? null : s.selectedTaskId,
            }));
        } catch {
            // ignore
        }
    },

    selectTask: (taskId) => set({ selectedTaskId: taskId }),

    // WebSocket event handler
    handleTaskEvent: (data) => {
        set((s) => ({
            tasks: s.tasks.map((t) =>
                t.id === data.task_id ? { ...t, ...data } : t
            ),
        }));
    },
}));

export default useTaskStore;
