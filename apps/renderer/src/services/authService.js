/**
 * Auth API service.
 */
import api from "./api";

const authService = {
    /** Check authentication status */
    status: () => api.get("/auth/status"),

    /** Refresh authentication */
    refresh: () => api.post("/auth/refresh"),
};

export default authService;
