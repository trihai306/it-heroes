/**
 * Project API service.
 */
import api from "./api";

const projectService = {
    /** List all projects */
    list: () => api.get("/projects"),

    /** Create a new project */
    create: (repoPath, name) =>
        api.post("/projects", { repo_path: repoPath, name }),
};

export default projectService;
