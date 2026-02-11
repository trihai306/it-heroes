/**
 * useThemeStore — Dark/Light mode state with localStorage persistence
 */
import { create } from "zustand";

const STORAGE_KEY = "chibi-office-theme";

const getInitialMode = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark") return stored;
    } catch { }
    return "dark"; // default
};

const useThemeStore = create((set) => ({
    mode: getInitialMode(),
    isDark: getInitialMode() === "dark",

    toggle: () =>
        set((state) => {
            const next = state.mode === "dark" ? "light" : "dark";
            try { localStorage.setItem(STORAGE_KEY, next); } catch { }
            document.documentElement.setAttribute("data-theme", next);
            return { mode: next, isDark: next === "dark" };
        }),

    setMode: (mode) => {
        try { localStorage.setItem(STORAGE_KEY, mode); } catch { }
        document.documentElement.setAttribute("data-theme", mode);
        set({ mode, isDark: mode === "dark" });
    },
}));

// Set initial data-theme attribute
document.documentElement.setAttribute("data-theme", getInitialMode());

export default useThemeStore;
