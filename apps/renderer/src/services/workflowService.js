/**
 * Workflow API service.
 */
import api from "./api";

const workflowService = {
    /** List workflows for a project */
    list: (projectId) => api.get(`/projects/${projectId}/workflows`),

    /** Create a workflow */
    create: (projectId, payload) =>
        api.post(`/projects/${projectId}/workflows`, payload),

    /** Update a workflow */
    update: (workflowId, data) => api.patch(`/workflows/${workflowId}`, data),

    /** Delete a workflow */
    remove: (workflowId) => api.del(`/workflows/${workflowId}`),

    /** Activate a workflow */
    activate: (workflowId) => api.post(`/workflows/${workflowId}/activate`),
};

export default workflowService;
