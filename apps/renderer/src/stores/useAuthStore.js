/**
 * Zustand store for Claude Code authentication state.
 */
import { create } from "zustand";
import authService from "../services/authService";

const useAuthStore = create((set, get) => ({
    // State
    authenticated: null,   // null = loading, true/false = known
    source: null,          // "macOS Keychain", "ANTHROPIC_API_KEY", etc.
    isOAuth: false,
    hasApiKey: false,
    tokenPreview: null,
    loginInstructions: null,
    checking: false,
    error: null,

    // Actions
    checkAuth: async () => {
        set({ checking: true, error: null });
        try {
            const data = await authService.status();
            set({
                authenticated: data.authenticated,
                source: data.source,
                isOAuth: data.is_oauth,
                hasApiKey: data.has_api_key,
                tokenPreview: data.token_preview,
                loginInstructions: data.login_instructions,
                checking: false,
            });
        } catch (err) {
            set({
                authenticated: false,
                error: err.message,
                checking: false,
            });
        }
    },

    refreshAuth: async () => {
        set({ checking: true, error: null });
        try {
            const data = await authService.refresh();
            set({
                authenticated: data.authenticated,
                source: data.source,
                tokenPreview: data.token_preview,
                checking: false,
            });
            return data.authenticated;
        } catch (err) {
            set({ error: err.message, checking: false });
            return false;
        }
    },
}));

export default useAuthStore;
