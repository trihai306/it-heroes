/**
 * Service barrel export — import all services from one place.
 *
 * Usage:
 *   import { agentService, taskService } from "@/services";
 *   // or
 *   import api from "@/services/api";
 */

export { default as api } from "./api";
export { default as agentService } from "./agentService";
export { default as authService } from "./authService";
export { default as filesystemService } from "./filesystemService";
export { default as projectService } from "./projectService";
export { default as taskService } from "./taskService";
export { default as workflowService } from "./workflowService";
export { default as systemService } from "./systemService";
export { default as officeLayoutService } from "./officeLayoutService";
