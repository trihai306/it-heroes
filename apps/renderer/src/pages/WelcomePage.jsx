/**
 * WelcomePage — Setup Dashboard
 *
 * Shows system dependency status + project folders when no project is selected.
 * Premium design with animated status cards and project list.
 */
import { useState, useEffect, useCallback } from "react";
import { Flex, Typography, Spin } from "antd";
import {
    FolderOpenOutlined,
    PlusOutlined,
    ReloadOutlined,
    CheckCircleFilled,
    CloseCircleFilled,
    RightOutlined,
    CopyOutlined,
} from "@ant-design/icons";
import useProjectStore from "@/stores/useProjectStore";
import systemService from "@/services/systemService";
import "./WelcomePage.css";

const { Text } = Typography;

export default function WelcomePage({ onAddProject }) {
    const [loading, setLoading] = useState(false);
    const [deps, setDeps] = useState([]);
    const [allOk, setAllOk] = useState(null);
    const [appVersion, setAppVersion] = useState("");
    const [healthLoading, setHealthLoading] = useState(true);
    const [copiedCmd, setCopiedCmd] = useState(null);

    const projects = useProjectStore((s) => s.projects);
    const selectProject = useProjectStore((s) => s.selectProject);

    const checkHealth = useCallback(async () => {
        setHealthLoading(true);
        try {
            const data = await systemService.health();
            setDeps(data.dependencies || []);
            setAllOk(data.all_ok);
            setAppVersion(data.app_version || "");
        } catch (err) {
            console.error("Health check failed:", err);
        } finally {
            setHealthLoading(false);
        }
    }, []);

    useEffect(() => { checkHealth(); }, [checkHealth]);

    const handleClick = async () => {
        setLoading(true);
        try { await onAddProject(); }
        catch (err) { console.error("Failed:", err); }
        finally { setLoading(false); }
    };

    const copyCmd = (cmd, idx) => {
        navigator.clipboard.writeText(cmd);
        setCopiedCmd(idx);
        setTimeout(() => setCopiedCmd(null), 2000);
    };

    const installed = deps.filter((d) => d.installed);
    const missing = deps.filter((d) => !d.installed);

    return (
        <div className="setup-dashboard animate-fade-in">
            {/* ── Hero Header ──────────────── */}
            <div className="setup-hero">
                <div className="setup-hero-icon">⚡</div>
                <div className="setup-hero-text">
                    <h1 className="setup-title">
                        <span className="gradient-text">Chibi Office AI</span>
                    </h1>
                    <p className="setup-subtitle">
                        AI-powered development workspace {appVersion && <span className="setup-version">v{appVersion}</span>}
                    </p>
                </div>
            </div>

            <div className="setup-grid">
                {/* ── Left: System Status ──────── */}
                <div className="setup-section">
                    <div className="setup-section-header">
                        <Text className="setup-section-title">SYSTEM STATUS</Text>
                        <button className="setup-refresh-btn" onClick={checkHealth} disabled={healthLoading}>
                            <ReloadOutlined spin={healthLoading} />
                        </button>
                    </div>

                    {healthLoading && deps.length === 0 ? (
                        <div className="setup-loading">
                            <Spin size="small" />
                            <Text type="secondary" style={{ fontSize: 12 }}>Checking dependencies...</Text>
                        </div>
                    ) : (
                        <div className="setup-deps-list">
                            {deps.map((dep, i) => (
                                <div
                                    key={dep.name}
                                    className={`setup-dep-card ${dep.installed ? "ok" : "missing"}`}
                                    style={{ animationDelay: `${i * 60}ms` }}
                                >
                                    <div className="setup-dep-main">
                                        <span className="setup-dep-icon">{dep.icon}</span>
                                        <div className="setup-dep-info">
                                            <div className="setup-dep-name">
                                                {dep.name}
                                                {dep.required && <span className="setup-dep-req">required</span>}
                                            </div>
                                            <div className="setup-dep-desc">
                                                {dep.installed
                                                    ? (dep.version || "Installed")
                                                    : dep.description}
                                            </div>
                                        </div>
                                        <div className="setup-dep-status">
                                            {dep.installed ? (
                                                <CheckCircleFilled className="setup-check-ok" />
                                            ) : (
                                                <CloseCircleFilled className="setup-check-fail" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Install command for missing deps */}
                                    {!dep.installed && dep.install_cmd && (
                                        <div className="setup-install-row">
                                            <code className="setup-install-cmd">{dep.install_cmd}</code>
                                            <button
                                                className="setup-copy-btn"
                                                onClick={() => copyCmd(dep.install_cmd, i)}
                                            >
                                                {copiedCmd === i ? "✓" : <CopyOutlined />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Summary bar */}
                            <div className={`setup-summary-bar ${allOk ? "ok" : "warn"}`}>
                                {allOk ? (
                                    <>
                                        <CheckCircleFilled /> All systems ready
                                    </>
                                ) : (
                                    <>
                                        <CloseCircleFilled /> {missing.length} missing — install to unlock all features
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Right: Projects ──────────── */}
                <div className="setup-section">
                    <div className="setup-section-header">
                        <Text className="setup-section-title">YOUR PROJECTS</Text>
                        <button className="setup-add-btn" onClick={handleClick} disabled={loading}>
                            <PlusOutlined /> Add
                        </button>
                    </div>

                    {projects.length === 0 ? (
                        <div className="setup-empty-projects">
                            <div className="setup-empty-icon">📁</div>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                No projects yet
                            </Text>
                            <button className="setup-open-btn" onClick={handleClick} disabled={loading}>
                                <FolderOpenOutlined /> Open Repository
                            </button>
                        </div>
                    ) : (
                        <div className="setup-projects-list">
                            {projects.map((p, i) => (
                                <button
                                    key={p.id}
                                    className="setup-project-card"
                                    onClick={() => selectProject(p.id)}
                                    style={{ animationDelay: `${i * 60}ms` }}
                                >
                                    <div className="setup-project-icon">
                                        <FolderOpenOutlined />
                                    </div>
                                    <div className="setup-project-info">
                                        <div className="setup-project-name">{p.name}</div>
                                        <div className="setup-project-path">{p.repo_path}</div>
                                    </div>
                                    <RightOutlined className="setup-project-arrow" />
                                </button>
                            ))}

                            {/* Add another */}
                            <button className="setup-project-card add-card" onClick={handleClick} disabled={loading}>
                                <div className="setup-project-icon add-icon">
                                    <PlusOutlined />
                                </div>
                                <div className="setup-project-info">
                                    <div className="setup-project-name">Add Project</div>
                                    <div className="setup-project-path">Open a git repository</div>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Footer tags ──────────────── */}
            <div className="setup-footer">
                {["Multi-agent AI", "Kanban Board", "Agent Teams", "Git Worktrees"].map((label) => (
                    <span key={label} className="setup-tag">{label}</span>
                ))}
            </div>
        </div>
    );
}
