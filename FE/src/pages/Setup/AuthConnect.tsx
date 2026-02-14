import { useState, useEffect, useCallback } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import {
    LockIcon,
    UserCircleIcon,
    CheckCircleIcon,
    BoltIcon,
    EyeIcon,
    EyeCloseIcon,
    CopyIcon,
    ArrowRightIcon,
} from "@/icons";

/* ── Types ── */
type AuthStatus = {
    loggedIn: boolean;
    authMethod?: string;
    apiProvider?: string;
    email?: string;
    orgId?: string;
    orgName?: string;
    subscriptionType?: string;
    error?: string;
};

type GhAuthStatus = {
    available: boolean;
    loggedIn: boolean;
    account?: string;
    protocol?: string;
    scopes?: string;
    error?: string;
};

type TabKey = "account" | "apikey" | "github";

/* ── API fallback for non-Electron ── */
const API_BASE = "http://localhost:8000/api";

async function fetchAuthStatus(): Promise<AuthStatus> {
    if (window.electronAPI?.authStatus) {
        return window.electronAPI.authStatus();
    }
    const res = await fetch(`${API_BASE}/setup/auth-status`);
    return res.json();
}

async function doLogin(): Promise<{ success: boolean; error?: string }> {
    if (window.electronAPI?.authLogin) {
        return window.electronAPI.authLogin();
    }
    const res = await fetch(`${API_BASE}/setup/auth-login`, { method: "POST" });
    const text = await res.text();
    const lastLine = text.trim().split("\n").pop() || "";
    try {
        const data = JSON.parse(lastLine.replace("data: ", ""));
        return { success: data.step === "complete" };
    } catch {
        return { success: false, error: "Login flow ended unexpectedly" };
    }
}

async function doLogout(): Promise<{ success: boolean; error?: string }> {
    if (window.electronAPI?.authLogout) {
        return window.electronAPI.authLogout();
    }
    const res = await fetch(`${API_BASE}/setup/auth-logout`, { method: "POST" });
    return res.json();
}

async function saveApiKey(key: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${API_BASE}/setup/set-api-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key }),
    });
    return res.json();
}

/* ── GitHub API helpers ── */
async function fetchGhStatus(): Promise<GhAuthStatus> {
    if (window.electronAPI?.ghAuthStatus) {
        return window.electronAPI.ghAuthStatus();
    }
    const res = await fetch(`${API_BASE}/setup/gh-auth-status`);
    return res.json();
}

async function doGhLogin(): Promise<{ success: boolean; error?: string }> {
    if (window.electronAPI?.ghAuthLogin) {
        return window.electronAPI.ghAuthLogin();
    }
    const res = await fetch(`${API_BASE}/setup/gh-auth-login`, { method: "POST" });
    const text = await res.text();
    const lastLine = text.trim().split("\n").pop() || "";
    try {
        const data = JSON.parse(lastLine.replace("data: ", ""));
        return { success: data.step === "complete" };
    } catch {
        return { success: false, error: "GitHub login failed" };
    }
}

async function doGhLogout(): Promise<{ success: boolean; error?: string }> {
    if (window.electronAPI?.ghAuthLogout) {
        return window.electronAPI.ghAuthLogout();
    }
    const res = await fetch(`${API_BASE}/setup/gh-auth-logout`, { method: "POST" });
    return res.json();
}

/* ── GitHub SVG Icon (inline — not in icon barrel yet) ── */
function GitHubIcon({ className = "h-5 w-5" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
    );
}

/* ── Component ── */
export default function AuthConnect() {
    const [tab, setTab] = useState<TabKey>("account");

    /* Claude auth state */
    const [status, setStatus] = useState<AuthStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [showKey, setShowKey] = useState(false);
    const [keySaved, setKeySaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /* GitHub auth state */
    const [ghStatus, setGhStatus] = useState<GhAuthStatus | null>(null);
    const [ghLoading, setGhLoading] = useState(true);
    const [ghActionLoading, setGhActionLoading] = useState(false);
    const [ghError, setGhError] = useState<string | null>(null);

    /* ── Data fetching ── */
    const refreshClaude = useCallback(async () => {
        setLoading(true);
        try {
            const s = await fetchAuthStatus();
            setStatus(s);
            setError(null);
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshGh = useCallback(async () => {
        setGhLoading(true);
        try {
            const s = await fetchGhStatus();
            setGhStatus(s);
            setGhError(null);
        } catch (e) {
            setGhError(String(e));
        } finally {
            setGhLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshClaude();
        refreshGh();
    }, [refreshClaude, refreshGh]);

    /* ── Claude handlers ── */
    const handleLogin = async () => {
        setActionLoading(true);
        setError(null);
        try {
            const result = await doLogin();
            if (!result.success) setError(result.error || "Login was cancelled or failed");
            await refreshClaude();
        } catch (e) {
            setError(String(e));
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogout = async () => {
        setActionLoading(true);
        setError(null);
        try {
            await doLogout();
            await refreshClaude();
        } catch (e) {
            setError(String(e));
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveKey = async () => {
        if (!apiKey.trim()) return;
        setActionLoading(true);
        setError(null);
        try {
            const result = await saveApiKey(apiKey.trim());
            if (result.success) {
                setKeySaved(true);
                setTimeout(() => setKeySaved(false), 3000);
                await refreshClaude();
            }
        } catch (e) {
            setError(String(e));
        } finally {
            setActionLoading(false);
        }
    };

    /* ── GitHub handlers ── */
    const handleGhLogin = async () => {
        setGhActionLoading(true);
        setGhError(null);
        try {
            const result = await doGhLogin();
            if (!result.success) setGhError(result.error || "GitHub login was cancelled or failed");
            await refreshGh();
        } catch (e) {
            setGhError(String(e));
        } finally {
            setGhActionLoading(false);
        }
    };

    const handleGhLogout = async () => {
        setGhActionLoading(true);
        setGhError(null);
        try {
            await doGhLogout();
            await refreshGh();
        } catch (e) {
            setGhError(String(e));
        } finally {
            setGhActionLoading(false);
        }
    };

    const subscriptionColors: Record<string, "success" | "primary" | "warning" | "info"> = {
        max: "success",
        pro: "primary",
        free: "warning",
    };

    return (
        <>
            <PageMeta
                title="Authentication | IT Heroes"
                description="Connect Claude CLI and GitHub for AI-powered development"
            />
            <PageBreadcrumb pageTitle="Authentication" />

            <div className="mx-auto max-w-3xl space-y-6">
                {/* ── Status Cards ── */}
                <div className="grid gap-4 sm:grid-cols-2">
                    {/* Claude Status */}
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                        <div className="relative overflow-hidden px-5 py-5">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-transparent to-transparent dark:from-brand-500/5" />
                            <div className="relative flex items-center gap-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${status?.loggedIn ? "bg-success-50 text-success-500 dark:bg-success-500/10" : "bg-gray-100 text-gray-400 dark:bg-gray-800"}`}>
                                    {status?.loggedIn ? <CheckCircleIcon className="h-6 w-6" /> : <LockIcon className="h-6 w-6" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Claude AI</h3>
                                        {status?.loggedIn && (
                                            <Badge variant="light" color={subscriptionColors[status.subscriptionType || ""] || "info"} size="sm">
                                                {status.subscriptionType?.toUpperCase() || "Active"}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                                        {loading ? "Checking..." : status?.loggedIn ? status.email || "Connected" : "Not connected"}
                                    </p>
                                </div>
                                {status?.loggedIn && !loading && (
                                    <Button variant="outline" size="sm" onClick={handleLogout} disabled={actionLoading}>
                                        Sign Out
                                    </Button>
                                )}
                            </div>
                            {status?.loggedIn && (
                                <div className="relative mt-3 flex flex-wrap gap-1.5">
                                    {status.authMethod && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                            <BoltIcon className="h-3 w-3" />{status.authMethod}
                                        </span>
                                    )}
                                    {status.orgName && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                            <UserCircleIcon className="h-3 w-3" />{status.orgName}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* GitHub Status */}
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                        <div className="relative overflow-hidden px-5 py-5">
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 via-transparent to-transparent dark:from-gray-500/5" />
                            <div className="relative flex items-center gap-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${ghStatus?.loggedIn ? "bg-success-50 text-success-500 dark:bg-success-500/10" : "bg-gray-100 text-gray-400 dark:bg-gray-800"}`}>
                                    {ghStatus?.loggedIn ? <CheckCircleIcon className="h-6 w-6" /> : <GitHubIcon className="h-6 w-6" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">GitHub</h3>
                                        {ghStatus?.loggedIn && (
                                            <Badge variant="light" color="success" size="sm">Connected</Badge>
                                        )}
                                    </div>
                                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                                        {ghLoading ? "Checking..." : ghStatus?.loggedIn ? `@${ghStatus.account}` : ghStatus?.available ? "Not connected" : "gh CLI not installed"}
                                    </p>
                                </div>
                                {ghStatus?.loggedIn && !ghLoading && (
                                    <Button variant="outline" size="sm" onClick={handleGhLogout} disabled={ghActionLoading}>
                                        Sign Out
                                    </Button>
                                )}
                            </div>
                            {ghStatus?.loggedIn && (
                                <div className="relative mt-3 flex flex-wrap gap-1.5">
                                    {ghStatus.protocol && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                            <BoltIcon className="h-3 w-3" />{ghStatus.protocol}
                                        </span>
                                    )}
                                    {ghStatus.scopes && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                            <LockIcon className="h-3 w-3" />{ghStatus.scopes}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Error Banner ── */}
                {(error || ghError) && (
                    <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-400">
                        {error || ghError}
                    </div>
                )}

                {/* ── Tabs ── */}
                <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                    {([
                        { key: "account" as TabKey, label: "Account Login", icon: <UserCircleIcon className="h-4 w-4" /> },
                        { key: "apikey" as TabKey, label: "API Key", icon: <LockIcon className="h-4 w-4" /> },
                        { key: "github" as TabKey, label: "GitHub", icon: <GitHubIcon className="h-4 w-4" /> },
                    ]).map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${tab === t.key
                                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                }`}
                        >
                            {t.icon}
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── Tab Content ── */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    {tab === "account" ? (
                        /* ─── ACCOUNT LOGIN ─── */
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Claude Account</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Sign in with your{" "}
                                    <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
                                        claude.ai
                                    </a>{" "}
                                    account. Requires Claude Pro or Max subscription.
                                </p>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { step: 1, text: "Click \"Sign In\" to open Anthropic login in your browser" },
                                    { step: 2, text: "Authenticate with your Claude Pro/Max account" },
                                    { step: 3, text: "Return here — status updates automatically" },
                                ].map((s) => (
                                    <div key={s.step} className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                                            {s.step}
                                        </span>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{s.text}</span>
                                    </div>
                                ))}
                            </div>
                            {status?.loggedIn ? (
                                <div className="flex items-center gap-3 rounded-xl bg-success-50 px-4 py-3 dark:bg-success-500/10">
                                    <CheckCircleIcon className="h-5 w-5 text-success-500" />
                                    <span className="text-sm font-medium text-success-700 dark:text-success-400">
                                        You&apos;re signed in as {status.email}
                                    </span>
                                </div>
                            ) : (
                                <Button variant="primary" size="md" onClick={handleLogin} disabled={actionLoading || loading}
                                    startIcon={<UserCircleIcon />} endIcon={<ArrowRightIcon />}>
                                    {actionLoading ? "Opening browser..." : "Sign In with Claude"}
                                </Button>
                            )}
                        </div>
                    ) : tab === "apikey" ? (
                        /* ─── API KEY ─── */
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">API Key</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Use your Anthropic API key for pay-as-you-go access.{" "}
                                    <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
                                        Get your key →
                                    </a>
                                </p>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ANTHROPIC_API_KEY</label>
                                <div className="relative">
                                    <input
                                        type={showKey ? "text" : "password"}
                                        value={apiKey}
                                        onChange={(e) => { setApiKey(e.target.value); setKeySaved(false); }}
                                        placeholder="sk-ant-api03-..."
                                        className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 pr-20 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-500"
                                    />
                                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                                        <button onClick={() => setShowKey(!showKey)} className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title={showKey ? "Hide" : "Show"}>
                                            {showKey ? <EyeCloseIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                        </button>
                                        {apiKey && (
                                            <button onClick={() => navigator.clipboard.writeText(apiKey)} className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Copy">
                                                <CopyIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {keySaved && (
                                    <div className="flex items-center gap-2 text-sm text-success-600 dark:text-success-400">
                                        <CheckCircleIcon className="h-4 w-4" />
                                        API key saved successfully
                                    </div>
                                )}
                            </div>
                            <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-800 dark:bg-warning-500/10 dark:text-warning-400">
                                <strong>Note:</strong> API key usage is billed per request via your Anthropic account.
                            </div>
                            <Button variant="primary" size="md" onClick={handleSaveKey} disabled={!apiKey.trim() || actionLoading} startIcon={<LockIcon />}>
                                {actionLoading ? "Saving..." : "Save & Connect"}
                            </Button>
                        </div>
                    ) : (
                        /* ─── GITHUB ─── */
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">GitHub Account</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Connect your{" "}
                                    <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
                                        GitHub
                                    </a>{" "}
                                    account so AI agents can manage repositories, push code, and create pull requests.
                                </p>
                            </div>

                            {!ghStatus?.available && !ghLoading && (
                                <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 dark:border-warning-800 dark:bg-warning-500/10">
                                    <p className="text-sm font-medium text-warning-700 dark:text-warning-400">GitHub CLI not installed</p>
                                    <p className="mt-1 text-xs text-warning-600 dark:text-warning-500">
                                        Install it with:{" "}
                                        <code className="rounded bg-warning-100 px-1.5 py-0.5 font-mono dark:bg-warning-500/20">brew install gh</code>
                                    </p>
                                </div>
                            )}

                            {ghStatus?.available && (
                                <>
                                    <div className="space-y-3">
                                        {[
                                            { step: 1, text: "Click \"Connect GitHub\" to open OAuth login in your browser" },
                                            { step: 2, text: "Authorize the GitHub CLI with your account" },
                                            { step: 3, text: "AI agents can now push, pull, and manage your repos" },
                                        ].map((s) => (
                                            <div key={s.step} className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                                    {s.step}
                                                </span>
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{s.text}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Permissions info */}
                                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Requested Permissions</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {["repo", "read:org", "gist"].map((scope) => (
                                                <span key={scope} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                                                    <CheckCircleIcon className="h-3 w-3 text-success-500" />
                                                    {scope}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {ghStatus.loggedIn ? (
                                        <div className="flex items-center gap-3 rounded-xl bg-success-50 px-4 py-3 dark:bg-success-500/10">
                                            <CheckCircleIcon className="h-5 w-5 text-success-500" />
                                            <span className="text-sm font-medium text-success-700 dark:text-success-400">
                                                Connected as <strong>@{ghStatus.account}</strong> via {ghStatus.protocol}
                                            </span>
                                        </div>
                                    ) : (
                                        <Button variant="primary" size="md" onClick={handleGhLogin} disabled={ghActionLoading || ghLoading}
                                            startIcon={<GitHubIcon className="h-5 w-5" />} endIcon={<ArrowRightIcon />}>
                                            {ghActionLoading ? "Opening browser..." : "Connect GitHub"}
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Help link ── */}
                <p className="text-center text-sm text-gray-400 dark:text-gray-500">
                    Need help?{" "}
                    <a href="https://docs.anthropic.com/en/docs/claude-code/overview" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
                        Claude CLI docs
                    </a>
                    {" · "}
                    <a href="https://cli.github.com/manual/" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
                        GitHub CLI docs
                    </a>
                </p>
            </div>
        </>
    );
}
