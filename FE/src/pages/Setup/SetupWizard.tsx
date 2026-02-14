import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import PageMeta from "@/components/common/PageMeta";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { useSetupStore } from "@/store/useSetupStore";
import {
    BoltIcon,
    CheckCircleIcon,
    BoxCubeIcon,
    DownloadIcon,
    ArrowRightIcon,
} from "@/icons";

/* ── Step definitions ── */
const STEPS = [
    { id: 1, label: "Welcome" },
    { id: 2, label: "Install CLI" },
    { id: 3, label: "Ready" },
];

export default function SetupWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const logRef = useRef<HTMLDivElement>(null);

    const {
        cliAvailable,
        installing,
        installLogs,
        error,
        checkCLI,
        installCLI,
    } = useSetupStore();

    // On mount, check CLI status
    useEffect(() => {
        checkCLI();
    }, [checkCLI]);

    // If CLI already available, skip to step 3
    useEffect(() => {
        if (cliAvailable === true && step < 3) {
            setStep(3);
        }
    }, [cliAvailable, step]);

    // Auto-scroll logs
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [installLogs]);

    const handleInstall = async () => {
        setStep(2);
        await installCLI();
        // After install, if successful the store sets cliAvailable=true
        // which triggers the useEffect above to go to step 3
    };

    const handleGetStarted = () => {
        navigate("/");
    };

    return (
        <>
            <PageMeta title="Setup | IT Heroes" description="Set up your AI agent environment" />
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
                <div className="w-full max-w-2xl">
                    {/* Logo + Title */}
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/25">
                            <BoxCubeIcon className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            IT Heroes Setup
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Configure your multi-agent environment
                        </p>
                    </div>

                    {/* Step Indicator */}
                    <div className="mb-8 flex items-center justify-center gap-0">
                        {STEPS.map((s, i) => (
                            <div key={s.id} className="flex items-center">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${step >= s.id
                                            ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                                            : "border border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500"
                                            }`}
                                    >
                                        {step > s.id ? (
                                            <CheckCircleIcon className="h-4 w-4" />
                                        ) : (
                                            s.id
                                        )}
                                    </div>
                                    <span
                                        className={`text-sm font-medium transition-colors ${step >= s.id
                                            ? "text-gray-800 dark:text-white"
                                            : "text-gray-400 dark:text-gray-500"
                                            }`}
                                    >
                                        {s.label}
                                    </span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div
                                        className={`mx-4 h-px w-12 transition-colors ${step > s.id
                                            ? "bg-brand-500"
                                            : "bg-gray-200 dark:bg-gray-700"
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Card */}
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
                        {/* ── Step 1: Welcome ── */}
                        {step === 1 && (
                            <div className="p-8">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
                                        <BoltIcon className="h-5 w-5 text-brand-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                                            Welcome to IT Heroes
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Let's set up your AI agent environment
                                        </p>
                                    </div>
                                </div>

                                <div className="mb-6 space-y-4 rounded-xl bg-gray-50 p-5 dark:bg-white/[0.02]">
                                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                                        IT Heroes needs the{" "}
                                        <span className="font-semibold text-brand-500">
                                            Claude CLI
                                        </span>{" "}
                                        to power your AI agents. We'll install it automatically
                                        with your permission.
                                    </p>

                                    <div className="space-y-3">
                                        <SetupItem
                                            icon={<DownloadIcon className="h-4 w-4" />}
                                            title="Install Claude CLI"
                                            desc="via npm (requires Node.js)"
                                        />
                                        <SetupItem
                                            icon={<BoltIcon className="h-4 w-4" />}
                                            title="Start Backend Services"
                                            desc="Python FastAPI server (auto-managed)"
                                        />
                                        <SetupItem
                                            icon={<BoxCubeIcon className="h-4 w-4" />}
                                            title="Initialize Agents"
                                            desc="Set up default AI agents"
                                        />
                                    </div>
                                </div>

                                {cliAvailable === false && (
                                    <div className="mb-4 rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700 dark:border-warning-800 dark:bg-warning-500/10 dark:text-warning-400">
                                        Claude CLI is not detected on your system. Click below to
                                        install it.
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <Button
                                        variant="primary"
                                        size="md"
                                        onClick={handleInstall}
                                        startIcon={<DownloadIcon />}
                                    >
                                        Install & Setup
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ── Step 2: Installing ── */}
                        {step === 2 && (
                            <div className="p-8">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
                                        <DownloadIcon className="h-5 w-5 text-brand-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                                            Installing Claude CLI
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {installing
                                                ? "Please wait while we set things up..."
                                                : error
                                                    ? "Installation encountered an issue"
                                                    : "Installation complete!"}
                                        </p>
                                    </div>
                                    <div className="ml-auto">
                                        {installing && (
                                            <Badge variant="light" color="info">
                                                Installing...
                                            </Badge>
                                        )}
                                        {!installing && error && (
                                            <Badge variant="light" color="error">
                                                Error
                                            </Badge>
                                        )}
                                        {!installing && !error && (
                                            <Badge variant="solid" color="success">
                                                Done
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Progress bar */}
                                {installing && (
                                    <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                        <div className="animate-progress h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" />
                                    </div>
                                )}

                                {/* Log output */}
                                <div
                                    ref={logRef}
                                    className="mb-6 h-56 overflow-y-auto rounded-xl border border-gray-200 bg-gray-900 p-4 font-mono text-xs text-green-400 custom-scrollbar dark:border-gray-700"
                                >
                                    {installLogs.length === 0 && (
                                        <span className="text-gray-600">
                                            Waiting for output...
                                        </span>
                                    )}
                                    {installLogs.map((log, i) => (
                                        <div key={i} className="leading-5">
                                            <span className="mr-2 text-gray-600">$</span>
                                            {log}
                                        </div>
                                    ))}
                                </div>

                                {/* Error state */}
                                {error && (
                                    <div className="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-400">
                                        {error}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex justify-end gap-3">
                                    {error && (
                                        <Button
                                            variant="outline"
                                            size="md"
                                            onClick={() => {
                                                setStep(1);
                                            }}
                                        >
                                            Back
                                        </Button>
                                    )}
                                    {error && (
                                        <Button
                                            variant="primary"
                                            size="md"
                                            onClick={handleInstall}
                                            startIcon={<DownloadIcon />}
                                        >
                                            Retry Install
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Step 3: Complete ── */}
                        {step === 3 && (
                            <div className="p-8 text-center">
                                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10">
                                    <CheckCircleIcon className="h-8 w-8 text-success-500" />
                                </div>
                                <h2 className="mb-2 text-xl font-bold text-gray-800 dark:text-white">
                                    You're All Set!
                                </h2>
                                <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
                                    Claude CLI is installed and backend is running.
                                    <br />
                                    Your AI agents are ready to go.
                                </p>

                                <div className="mb-8 inline-flex items-center gap-3 rounded-xl bg-gray-50 px-5 py-3 dark:bg-white/[0.03]">
                                    <Badge variant="solid" color="success">
                                        Connected
                                    </Badge>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Claude CLI
                                    </span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <Badge variant="solid" color="success">
                                        Running
                                    </Badge>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Backend
                                    </span>
                                </div>

                                <div>
                                    <Button
                                        variant="primary"
                                        size="md"
                                        onClick={handleGetStarted}
                                        endIcon={<ArrowRightIcon />}
                                    >
                                        Get Started
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Help */}
                    <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
                        Need help?{" "}
                        <a
                            href="https://docs.anthropic.com/en/docs/claude-code"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-500 hover:underline"
                        >
                            View Claude CLI documentation
                        </a>
                    </p>
                </div>
            </div>

            {/* Progress bar animation */}
            <style>{`
                @keyframes progress {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                }
                .animate-progress {
                    animation: progress 3s ease-in-out infinite;
                }
            `}</style>
        </>
    );
}

/* ── Setup Item ── */
function SetupItem({
    icon,
    title,
    desc,
}: {
    icon: React.ReactNode;
    title: string;
    desc: string;
}) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-500 shadow-theme-xs dark:bg-gray-800 dark:text-brand-400">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {title}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{desc}</p>
            </div>
        </div>
    );
}
