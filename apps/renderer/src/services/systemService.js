/**
 * System health API service.
 */
import api from "./api";

const systemService = {
    /** Check system dependencies */
    health: () => api.get("/system/health"),
};

export default systemService;
