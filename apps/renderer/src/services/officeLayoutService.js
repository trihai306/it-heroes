/**
 * Office Layout API service.
 */
import api from "./api";

const officeLayoutService = {
    /** List layouts for a project */
    list: (projectId) => api.get(`/projects/${projectId}/office-layouts`),

    /** Get the active layout for a project */
    getActive: (projectId) => api.get(`/projects/${projectId}/office-layouts/active`),

    /** Get a single layout */
    get: (layoutId) => api.get(`/office-layouts/${layoutId}`),

    /** Create a layout */
    create: (projectId, payload) =>
        api.post(`/projects/${projectId}/office-layouts`, payload),

    /** Update a layout */
    update: (layoutId, data) => api.patch(`/office-layouts/${layoutId}`, data),

    /** Delete a layout */
    remove: (layoutId) => api.del(`/office-layouts/${layoutId}`),

    /** Activate a layout */
    activate: (layoutId) => api.post(`/office-layouts/${layoutId}/activate`),
};

export default officeLayoutService;
