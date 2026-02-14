import axios from "axios";

const API_BASE = "http://localhost:8000";

const api = axios.create({
    baseURL: API_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 10000,
});

// ── Types ──────────────────────────────────────────────────────

export interface Agent {
    id: string;
    name: string;
    role: string;
    model: string;
    system_prompt: string;
    avatar: string;
    status: string;
    created_at: string;
    last_active: string | null;
    current_task: string | null;
    metrics: {
        tasks_completed: number;
        messages_sent: number;
        errors: number;
        uptime_seconds: number;
    };
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    assigned_agent_id: string | null;
    assigned_agent_name: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
}

export interface ChatResponse {
    conversation_id: string;
    user_message: {
        id: string;
        role: string;
        content: string;
        timestamp: string;
    };
    assistant_message: {
        id: string;
        role: string;
        content: string;
        agent_id: string;
        agent_name: string;
        agent_avatar: string;
        timestamp: string;
    };
}

// ── API Functions ──────────────────────────────────────────────

export const agentApi = {
    // Agents
    listAgents: async (): Promise<Agent[]> => {
        const { data } = await api.get("/api/agents");
        return data;
    },

    getAgent: async (id: string): Promise<Agent> => {
        const { data } = await api.get(`/api/agents/${id}`);
        return data;
    },

    createAgent: async (agent: Partial<Agent>): Promise<Agent> => {
        const { data } = await api.post("/api/agents", agent);
        return data;
    },

    updateAgent: async (id: string, updates: Partial<Agent>): Promise<Agent> => {
        const { data } = await api.put(`/api/agents/${id}`, updates);
        return data;
    },

    deleteAgent: async (id: string): Promise<void> => {
        await api.delete(`/api/agents/${id}`);
    },

    // Tasks
    listTasks: async (): Promise<Task[]> => {
        const { data } = await api.get("/api/tasks");
        return data;
    },

    createTask: async (task: Partial<Task>): Promise<Task> => {
        const { data } = await api.post("/api/tasks", task);
        return data;
    },

    // Chat
    sendMessage: async (agentId: string, message: string): Promise<ChatResponse> => {
        const { data } = await api.post("/api/chat", {
            agent_id: agentId,
            message,
        });
        return data;
    },

    getChatHistory: async (agentId: string) => {
        const { data } = await api.get(`/api/chat/${agentId}/history`);
        return data;
    },

    // System
    healthCheck: async () => {
        const { data } = await api.get("/api/health");
        return data;
    },

    getStats: async () => {
        const { data } = await api.get("/api/stats");
        return data;
    },
};

// ── Session Types ──────────────────────────────────────────────

export interface ChatSession {
    id: string;
    agent_id: string;
    project_id: string | null;
    title: string;
    status: string;
    cwd: string;
    created_at: string;
    last_active: string | null;
    total_turns: number;
}

// ── Session API ────────────────────────────────────────────────

export const sessionApi = {
    list: async (agentId: string): Promise<ChatSession[]> => {
        const { data } = await api.get("/api/sessions", { params: { agent_id: agentId } });
        return data;
    },

    create: async (agentId: string): Promise<ChatSession> => {
        const { data } = await api.post("/api/sessions", { agent_id: agentId });
        return data;
    },

    delete: async (sessionId: string): Promise<void> => {
        await api.delete(`/api/sessions/${sessionId}`);
    },

    getHistory: async (sessionId: string) => {
        const { data } = await api.get(`/api/chat/sessions/${sessionId}/history`);
        return data;
    },
};

// ── Notification Types ─────────────────────────────────────────

export interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    avatar: string;
    is_read: boolean;
    related_id: string | null;
    created_at: string;
}

// ── Notification API ───────────────────────────────────────────

export const notificationApi = {
    list: async (limit = 50, offset = 0): Promise<{ items: Notification[]; total: number }> => {
        const { data } = await api.get("/api/notifications", { params: { limit, offset } });
        return data;
    },

    markRead: async (id: string): Promise<Notification> => {
        const { data } = await api.patch(`/api/notifications/${id}/read`);
        return data;
    },

    markAllRead: async (): Promise<{ success: boolean; updated: number }> => {
        const { data } = await api.post("/api/notifications/read-all");
        return data;
    },

    getUnreadCount: async (): Promise<{ count: number }> => {
        const { data } = await api.get("/api/notifications/unread-count");
        return data;
    },
};

// ── Project Types ──────────────────────────────────────────────

export interface Project {
    id: string;
    name: string;
    path: string;
    description: string;
    created_at: string;
}

// ── Project API ────────────────────────────────────────────────

export const projectApi = {
    list: async (): Promise<Project[]> => {
        const { data } = await api.get("/api/projects");
        return data;
    },

    create: async (project: { name: string; path: string; description?: string }): Promise<Project> => {
        const { data } = await api.post("/api/projects", project);
        return data;
    },

    update: async (id: string, updates: Partial<Project>): Promise<Project> => {
        const { data } = await api.put(`/api/projects/${id}`, updates);
        return data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/api/projects/${id}`);
    },

    selectDirectory: async (): Promise<string | null> => {
        const { data } = await api.get("/api/select-directory");
        return data.path || null;
    },
};
