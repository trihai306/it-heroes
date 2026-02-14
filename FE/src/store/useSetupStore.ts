import { create } from "zustand";

interface SetupState {
    /* ── State ── */
    cliAvailable: boolean | null; // null = not checked yet
    backendReady: boolean;
    installing: boolean;
    installLogs: string[];
    error: string | null;

    /* ── Actions ── */
    checkCLI: () => Promise<void>;
    installCLI: () => Promise<void>;
    addLog: (msg: string) => void;
    reset: () => void;
}

export const useSetupStore = create<SetupState>((set, get) => ({
    cliAvailable: null,
    backendReady: false,
    installing: false,
    installLogs: [],
    error: null,

    checkCLI: async () => {
        try {
            // Try Electron IPC first
            if (window.electronAPI?.checkCLI) {
                const result = await window.electronAPI.checkCLI();
                set({ cliAvailable: result.available });
                return;
            }
            // Fallback: HTTP API
            const res = await fetch("http://localhost:8000/api/setup/check-cli", { method: "POST" });
            const data = await res.json();
            set({ cliAvailable: data.available });
        } catch {
            // If backend isn't ready either, assume not available
            set({ cliAvailable: false });
        }
    },

    installCLI: async () => {
        set({ installing: true, installLogs: [], error: null });

        try {
            // Electron IPC path (preferred)
            if (window.electronAPI?.installCLI) {
                // Listen for progress events
                const cleanup = window.electronAPI.onInstallProgress((data) => {
                    get().addLog(data.message);
                });

                get().addLog("Starting Claude CLI installation...");
                const result = await window.electronAPI.installCLI();
                cleanup();

                if (result.success) {
                    get().addLog("✓ Claude CLI installed successfully!");
                    set({ installing: false, cliAvailable: true });
                } else {
                    const errMsg = result.error || `Installation failed (exit code: ${result.exitCode})`;
                    get().addLog(`✗ ${errMsg}`);
                    set({ installing: false, error: errMsg });
                }
                return;
            }

            // Fallback: SSE stream from backend
            get().addLog("Starting Claude CLI installation via backend...");
            const res = await fetch("http://localhost:8000/api/setup/install-cli", { method: "POST" });
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                set({ installing: false, error: "Failed to start installation stream" });
                return;
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value);
                const lines = text.split("\n");
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const event = JSON.parse(line.slice(6));
                            get().addLog(event.message);
                            if (event.step === "complete") {
                                set({ installing: false, cliAvailable: true });
                            } else if (event.step === "error") {
                                set({ installing: false, error: event.message });
                            }
                        } catch {
                            // ignore parse errors
                        }
                    }
                }
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            set({ installing: false, error: msg });
        }
    },

    addLog: (msg: string) => {
        set((s) => ({ installLogs: [...s.installLogs, msg] }));
    },

    reset: () => {
        set({ cliAvailable: null, backendReady: false, installing: false, installLogs: [], error: null });
    },
}));
