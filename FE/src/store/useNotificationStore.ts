import { create } from "zustand";
import { notificationApi, type Notification } from "../services/api";

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    total: number;

    fetchNotifications: () => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    addNotification: (notif: Notification) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    total: 0,

    fetchNotifications: async () => {
        set({ loading: true });
        try {
            const { items, total } = await notificationApi.list();
            set({ notifications: items, total, loading: false });
        } catch {
            set({ loading: false });
        }
    },

    fetchUnreadCount: async () => {
        try {
            const { count } = await notificationApi.getUnreadCount();
            set({ unreadCount: count });
        } catch { }
    },

    markAsRead: async (id) => {
        try {
            await notificationApi.markRead(id);
            set((s) => ({
                notifications: s.notifications.map((n) =>
                    n.id === id ? { ...n, is_read: true } : n
                ),
                unreadCount: Math.max(0, s.unreadCount - 1),
            }));
        } catch { }
    },

    markAllRead: async () => {
        try {
            await notificationApi.markAllRead();
            set((s) => ({
                notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
                unreadCount: 0,
            }));
        } catch { }
    },

    addNotification: (notif) => {
        set((s) => ({
            notifications: [notif, ...s.notifications],
            unreadCount: s.unreadCount + 1,
            total: s.total + 1,
        }));

        // Trigger Electron native notification
        if (window.electronAPI?.showNotification) {
            window.electronAPI.showNotification({
                title: notif.title,
                body: notif.message,
            });
        }
    },
}));
