import { useEffect, useState, useRef } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { projectApi } from "@/services/api";
import type { Project } from "@/services/api";
import { ChevronDownIcon, PlusIcon, TrashBinIcon, DocsIcon } from "@/icons";

export default function ProjectSelector() {
    const { projects, activeProjectId, fetchProjects, createProject, deleteProject, setActiveProject } =
        useProjectStore();
    const [isOpen, setIsOpen] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({ name: "", path: "" });
    const [addError, setAddError] = useState("");
    const [selectingFolder, setSelectingFolder] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setShowAdd(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const activeProject = projects.find((p) => p.id === activeProjectId);

    const handleSelectFolder = async () => {
        setSelectingFolder(true);
        try {
            // Try Electron native dialog first
            if (window.electronAPI?.selectDirectory) {
                const dirPath = await window.electronAPI.selectDirectory();
                if (dirPath) {
                    setAddForm((f) => ({
                        ...f,
                        path: dirPath,
                        name: f.name || dirPath.split("/").pop() || "Project",
                    }));
                }
                return;
            }

            // Fallback: backend Python folder picker (works in browser)
            const dirPath = await projectApi.selectDirectory();
            if (dirPath) {
                setAddForm((f) => ({
                    ...f,
                    path: dirPath,
                    name: f.name || dirPath.split("/").pop() || "Project",
                }));
            }
        } finally {
            setSelectingFolder(false);
        }
    };

    const handleAdd = async () => {
        if (!addForm.name.trim() || !addForm.path.trim()) {
            setAddError("Name and folder path are required");
            return;
        }
        setAddError("");
        const result = await createProject({
            name: addForm.name.trim(),
            path: addForm.path.trim(),
        });
        if (result) {
            setAddForm({ name: "", path: "" });
            setShowAdd(false);
        } else {
            setAddError("Failed — check that path exists");
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await deleteProject(id);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger */}
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    setShowAdd(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
                <DocsIcon className="h-4 w-4 text-brand-500" />
                <span className="max-w-[140px] truncate font-medium text-gray-700 dark:text-gray-200">
                    {activeProject ? activeProject.name : "No Project"}
                </span>
                <ChevronDownIcon
                    className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute left-0 top-full z-[99999] mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Projects
                        </h4>
                        <button
                            onClick={() => setShowAdd(!showAdd)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                            title="Add project"
                        >
                            <PlusIcon className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Add form */}
                    {showAdd && (
                        <div className="border-b border-gray-100 p-3 dark:border-gray-700">
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={addForm.name}
                                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                    placeholder="Project name"
                                    className="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500"
                                    autoFocus
                                />

                                {/* Folder picker */}
                                {addForm.path ? (
                                    <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2 dark:border-brand-500/30 dark:bg-brand-500/10">
                                        <DocsIcon className="h-4 w-4 shrink-0 text-brand-500" />
                                        <span className="min-w-0 flex-1 truncate text-xs text-gray-700 dark:text-gray-300">
                                            {addForm.path}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setAddForm({ ...addForm, path: "" })}
                                            className="shrink-0 text-xs text-gray-400 hover:text-error-500"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    /* Folder picker — always works via Electron or backend API */
                                    <button
                                        type="button"
                                        onClick={handleSelectFolder}
                                        disabled={selectingFolder}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:border-brand-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                    >
                                        {selectingFolder ? (
                                            <>
                                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Waiting for selection...
                                            </>
                                        ) : (
                                            <>
                                                <DocsIcon className="h-4 w-4" />
                                                Select Folder
                                            </>
                                        )}
                                    </button>
                                )}
                                {addError && (
                                    <p className="text-xs text-error-500">{addError}</p>
                                )}
                                <button
                                    onClick={handleAdd}
                                    className="h-8 w-full rounded-lg bg-brand-500 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
                                >
                                    Add Project
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Project list */}
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {projects.length === 0 && !showAdd && (
                            <div className="py-8 text-center">
                                <DocsIcon className="mx-auto mb-2 h-6 w-6 text-gray-300 dark:text-gray-600" />
                                <p className="text-sm text-gray-400">No projects yet</p>
                                <button
                                    onClick={() => setShowAdd(true)}
                                    className="mt-2 text-xs font-medium text-brand-500 hover:underline"
                                >
                                    Add your first project
                                </button>
                            </div>
                        )}
                        {projects.map((project: Project) => (
                            <div
                                key={project.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                    setActiveProject(project.id);
                                    setIsOpen(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        setActiveProject(project.id);
                                        setIsOpen(false);
                                    }
                                }}
                                className={`group flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${project.id === activeProjectId
                                    ? "bg-brand-50/50 dark:bg-brand-500/5"
                                    : ""
                                    }`}
                            >
                                {/* Radio indicator */}
                                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-500">
                                    {project.id === activeProjectId && (
                                        <div className="h-2 w-2 rounded-full bg-brand-500" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-gray-800 dark:text-white">
                                        {project.name}
                                    </p>
                                    <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                                        {project.path}
                                    </p>
                                </div>

                                {/* Delete */}
                                <button
                                    onClick={(e) => handleDelete(e, project.id)}
                                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-300 opacity-0 transition-all hover:text-error-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:text-error-400"
                                    title="Remove project"
                                >
                                    <TrashBinIcon className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add Project button — always visible */}
                    {!showAdd && (
                        <div className="border-t border-gray-100 p-2 dark:border-gray-700">
                            <button
                                onClick={() => setShowAdd(true)}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-brand-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                            >
                                <PlusIcon className="h-4 w-4" />
                                Add Project
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
