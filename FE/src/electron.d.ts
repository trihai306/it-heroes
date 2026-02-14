export { };

declare global {
    interface Window {
        electronAPI?: {
            // Python backend
            getPythonStatus: () => Promise<{ running: boolean; port: number }>;
            restartPython: () => Promise<{ success: boolean }>;

            // App info
            getAppInfo: () => Promise<{
                version: string;
                platform: string;
                arch: string;
                electron: string;
                node: string;
            }>;

            // Python logs
            onPythonLog: (callback: (data: string) => void) => () => void;

            // Notification
            showNotification: (opts: { title: string; body: string }) => Promise<{ success: boolean }>;

            // CLI
            checkCLI: () => Promise<{ available: boolean; path: string | null; version: string | null }>;
            installCLI: () => Promise<{ success: boolean; exitCode?: number; error?: string }>;
            onInstallProgress: (callback: (data: { type: string; message: string }) => void) => () => void;

            // CLI Authentication
            authStatus: () => Promise<{
                loggedIn: boolean;
                authMethod?: string;
                apiProvider?: string;
                email?: string;
                orgId?: string;
                orgName?: string;
                subscriptionType?: string;
                error?: string;
            }>;
            authLogin: () => Promise<{ success: boolean; exitCode?: number; error?: string }>;
            authLogout: () => Promise<{ success: boolean; error?: string }>;
            onAuthProgress: (callback: (data: { type: string; message: string }) => void) => () => void;

            // GitHub Authentication
            ghAuthStatus: () => Promise<{
                available: boolean;
                loggedIn: boolean;
                account?: string;
                protocol?: string;
                scopes?: string;
                error?: string;
            }>;
            ghAuthLogin: () => Promise<{ success: boolean; exitCode?: number; error?: string }>;
            ghAuthLogout: () => Promise<{ success: boolean; error?: string }>;
            onGhAuthProgress: (callback: (data: { type: string; message: string }) => void) => () => void;

            // Directory picker
            selectDirectory: () => Promise<string | null>;
        };
    }
}
