/**
 * Task API service.
 */
import api from "./api";

const taskService = {
    /** List tasks for a project */
    list: (projectId) => api.get(`/projects/${projectId}/tasks`),

    /** Create a new task */
    create: (projectId, taskData) =>
        api.post(`/projects/${projectId}/tasks`, taskData),

    /** Update a task */
    update: (taskId, updates) => api.patch(`/tasks/${taskId}`, updates),

    /** Delete a task */
    remove: (taskId) => api.del(`/tasks/${taskId}`),
};

export default taskService;
