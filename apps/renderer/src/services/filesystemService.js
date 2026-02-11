/**
 * Filesystem API service.
 */
import api from "./api";

const filesystemService = {
    /** Browse filesystem at a given path */
    browse: (path = "~") =>
        api.get(`/filesystem/browse?path=${encodeURIComponent(path)}`),
};

export default filesystemService;
