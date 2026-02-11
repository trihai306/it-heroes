/**
 * Centralized API client — single source for all HTTP calls.
 *
 * Features:
 *   - Centralized API_BASE config
 *   - JSON request/response helpers (get, post, patch, del)
 *   - Automatic Content-Type headers for JSON bodies
 *   - Consistent error handling
 *
 * Usage:
 *   import api from "@/services/api";
 *   const data = await api.get("/projects");
 *   const project = await api.post("/projects", { name: "foo" });
 */

export const API_BASE = "http://127.0.0.1:8420";

/**
 * Core request function — all API calls go through here.
 */
async function request(method, path, body = null, options = {}) {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

    const headers = { ...options.headers };
    if (body && typeof body === "object") {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        ...options,
    });

    // For DELETE or 204 responses, return null
    if (res.status === 204 || (method === "DELETE" && res.ok)) {
        return null;
    }

    if (!res.ok) {
        const error = new Error(`HTTP ${res.status}`);
        try {
            error.data = await res.json();
            error.message = error.data.detail || error.message;
        } catch {
            // No JSON body in error response
        }
        throw error;
    }

    return res.json();
}

/**
 * API client with convenience methods.
 */
const api = {
    get: (path, options) => request("GET", path, null, options),
    post: (path, body, options) => request("POST", path, body, options),
    patch: (path, body, options) => request("PATCH", path, body, options),
    put: (path, body, options) => request("PUT", path, body, options),
    del: (path, options) => request("DELETE", path, null, options),
};

export default api;
