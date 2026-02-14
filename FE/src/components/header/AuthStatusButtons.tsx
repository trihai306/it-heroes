import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { CheckCircleIcon, BoltIcon } from "@/icons";

/* ── Types ── */
type AuthState = {
    claude: { loggedIn: boolean; email?: string; subscriptionType?: string } | null;
    github: { loggedIn: boolean; account?: string; available?: boolean } | null;
    loading: boolean;
};

const API = "http://localhost:8000/api";

/* ── GitHub Icon (inline) ── */
function GhIcon({ className = "h-4 w-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
    );
}

export default function AuthStatusButtons() {
    const [auth, setAuth] = useState<AuthState>({ claude: null, github: null, loading: true });

    const fetchStatus = useCallback(async () => {
        try {
            const [claudeRes, ghRes] = await Promise.all([
                fetch(`${API}/setup/auth-status`).then((r) => r.json()).catch(() => null),
                fetch(`${API}/setup/gh-auth-status`).then((r) => r.json()).catch(() => null),
            ]);
            setAuth({ claude: claudeRes, github: ghRes, loading: false });
        } catch {
            setAuth({ claude: null, github: null, loading: false });
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    if (auth.loading) return null;

    const claudeOk = auth.claude?.loggedIn;
    const ghOk = auth.github?.loggedIn;

    return (
        <div className="flex items-center gap-1.5">
            {/* Claude Status */}
            <Link
                to="/setup/auth"
                className={`group relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${claudeOk
                        ? "bg-success-50 text-success-700 hover:bg-success-100 dark:bg-success-500/10 dark:text-success-400 dark:hover:bg-success-500/20"
                        : "bg-warning-50 text-warning-700 hover:bg-warning-100 dark:bg-warning-500/10 dark:text-warning-400 dark:hover:bg-warning-500/20"
                    }`}
                title={claudeOk ? `Claude: ${auth.claude?.email || "Connected"}` : "Claude: Not connected — Click to sign in"}
            >
                {claudeOk ? (
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                ) : (
                    <BoltIcon className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">
                    {claudeOk
                        ? auth.claude?.subscriptionType?.toUpperCase() || "Claude"
                        : "Sign In"}
                </span>
            </Link>

            {/* GitHub Status */}
            <Link
                to="/setup/auth"
                className={`group relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${ghOk
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        : "bg-warning-50 text-warning-700 hover:bg-warning-100 dark:bg-warning-500/10 dark:text-warning-400 dark:hover:bg-warning-500/20"
                    }`}
                title={ghOk ? `GitHub: @${auth.github?.account}` : "GitHub: Not connected — Click to connect"}
            >
                {ghOk ? (
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                ) : (
                    <GhIcon className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">
                    {ghOk ? `@${auth.github?.account}` : "GitHub"}
                </span>
            </Link>
        </div>
    );
}
