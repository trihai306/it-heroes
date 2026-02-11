---
trigger: always_on
glob:
description: Frontend development standards for the IT Heroes renderer app
---

# Frontend Development Rules

## API Service Layer (`src/services/`)

All HTTP API calls MUST go through the centralized service layer. **Never use raw `fetch()` directly in stores or components.**

### Architecture

```
src/services/
├── api.js               ← Core HTTP client (DO NOT MODIFY unless adding global behavior)
├── {domain}Service.js   ← Domain-specific endpoints
└── index.js             ← Barrel export (update when adding new services)
```

### Creating a New API Service

1. **Create `src/services/{domain}Service.js`**:

```js
import api from "./api";

const {domain}Service = {
    list: (parentId) => api.get(`/parent/${parentId}/items`),
    get: (id) => api.get(`/items/${id}`),
    create: (parentId, data) => api.post(`/parent/${parentId}/items`, data),
    update: (id, data) => api.patch(`/items/${id}`, data),
    remove: (id) => api.del(`/items/${id}`),
};

export default {domain}Service;
```

2. **Register in `src/services/index.js`**:

```js
export { default as {domain}Service } from "./{domain}Service";
```

3. **Use in Zustand store**:

```js
import {domain}Service from "../services/{domain}Service";

// Inside store actions:
const data = await {domain}Service.list(parentId);
```

### Rules

- **`API_BASE`** is defined ONLY in `api.js` — never duplicate it
- Use `api.get()`, `api.post()`, `api.patch()`, `api.del()` — never raw `fetch()`
- Service methods return parsed JSON directly (no `.json()` needed)
- Service methods throw on HTTP errors with `error.message` and `error.data`
- Error handling (try/catch) belongs in the **store**, not the service
- Naming: `{domain}Service.js` with camelCase (e.g., `agentService.js`, `taskService.js`)
- Method naming: `list`, `get`, `create`, `update`, `remove`, `activate` — use clear verbs
- WebSocket connections are separate from the service layer (handled in `src/hooks/`)

### Existing Services Reference

| Service | Endpoints | Used by |
|---------|-----------|---------|
| `agentService` | agents, positions, teams, messaging | `useAgentStore` |
| `taskService` | list, create, update, remove | `useTaskStore` |
| `projectService` | list, create | `useProjectStore` |
| `workflowService` | list, create, update, remove, activate | `useWorkflowStore` |
| `authService` | status, refresh | `useAuthStore` |
| `filesystemService` | browse | `FolderPickerModal` |

## Zustand Stores (`src/stores/`)

- Each store imports its corresponding service
- Stores handle loading/error state, not services
- Stores handle Zustand `set()` calls after API responses
- Import services with relative path: `../services/{domain}Service`

## Styling

- Use CSS files co-located with components (e.g., `Dashboard.css` next to `Dashboard.jsx`)
- Follow theme variables defined in `src/index.css` (e.g., `--bg-surface`, `--text-primary`)
- Use `JetBrains Mono` for monospace/data displays
