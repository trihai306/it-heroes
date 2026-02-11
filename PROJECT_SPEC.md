# Chibi Office AI — Project Spec

## Mục lục
1. Tổng quan
2. Mục tiêu & Phạm vi
3. Trải nghiệm sản phẩm (Product UX)
4. Kiến trúc hệ thống
5. Data Model (Schema)
6. API Design (REST + WebSocket)
7. Claude Code + Agent Teams Integration
8. Git Workflow (Worktree per Agent)
9. QA Gate & Department Policies
10. Roadmap (3 Sprint) + Acceptance Criteria
11. Rủi ro & Giảm thiểu
12. Appendix: Config mẫu

---

## 1) Tổng quan
**Chibi Office AI** là desktop app mô phỏng “văn phòng chibi” để điều phối đội agent (Claude Code Agent Teams) làm việc trên codebase local.

- **Mỗi agent = 1 nhân vật chibi** (Lead/BE/FE/QA/Docs/Security…)
- **Mỗi folder/project = 1 phòng ban** (Department/Room)
- Điều phối: tạo task → phân công → theo dõi realtime → QA gate → tổng hợp kết quả.

---

## 2) Mục tiêu & Phạm vi

### 2.1 Goals
- Chọn repo local → tự động tạo phòng ban theo folder.
- Triệu tập “Agent Team”: 1 lead + N teammate.
- Kanban task theo phòng ban + trạng thái agent realtime.
- Mỗi agent làm trên branch/worktree riêng để tránh conflict.
- QA gate trước khi đề xuất merge.

### 2.2 Scope (MVP)
- Chạy local (offline), không cần cloud.
- Backend: Python FastAPI orchestration.
- Frontend: Electron + React + Tailwind.
- Storage: SQLite.

### 2.3 Out of scope (giai đoạn đầu)
- GitHub PR thật (có thể thêm ở giai đoạn sau).
- Multi-user, auth, collaboration online.
- 3D office.

---

## 3) Trải nghiệm sản phẩm (Product UX)

### 3.1 Screen chính
- **Sidebar**: Projects + Departments (phòng ban)
- **Office Map (Canvas)**: hiển thị phòng ban dạng grid, mỗi phòng có bàn làm việc (agents)
- **Right Panel**: Task detail + log/chat + output chạy lệnh

### 3.2 Flow chính
1. User chọn repo (Electron dialog)
2. Backend tạo Project, scan folder tạo Departments
3. User bấm “Summon Team” → spawn Lead + Teammates
4. User nhập Goal/Sprint → Lead breakdown thành tasks, assign theo phòng ban
5. Agents thực thi trên worktree riêng, log realtime
6. QA Gate chạy lint/test theo policy từng phòng
7. Lead tổng hợp kết quả, đề xuất merge plan

### 3.3 Chibi status mapping
- `idle`: ngồi chờ
- `in_progress`: gõ máy
- `blocked`: đứng “kẹt”
- `review`: cầm kính lúp
- `failed`: mặt buồn + bảng đỏ
- `done`: ăn mừng

---

## 4) Kiến trúc hệ thống

### 4.1 Monorepo layout (đề xuất)
```
chibi-office/
  apps/
    backend/        # Python FastAPI
    desktop/        # Electron main/preload
    renderer/       # React + Vite + Tailwind
  docs/
  packages/shared/  # shared types (optional)
```

### 4.2 Components
**Backend (FastAPI)**
- Project/Department Manager
- Agent Orchestrator (sessions)
- Task Manager
- Claude Code Adapter (CLI + Agent Teams)
- Git Workspace Manager (worktree/branch)
- QA Gate Runner
- Realtime WebSocket (event push)

**Electron**
- spawn backend process (uvicorn)
- file/folder dialog (select repo)
- IPC bridge cho renderer
- packaging

**React**
- Office map UI + Rooms + Agents
- Kanban + Task detail
- Logs/Chat viewer
- Realtime WS subscriber

---

## 5) Data Model (Schema)

> Storage MVP: SQLite (SQLModel/SQLAlchemy)

### 5.1 Tables
| Entity | Fields |
|---|---|
| Project | id, name, repo_path, created_at |
| Department | id, project_id, name, folder_path, policy_json |
| Agent | id, project_id, role, name, avatar_key |
| Session | id, agent_id, status, started_at, last_seen |
| Task | id, project_id, department_id, title, description, status, assigned_agent_id, created_at, updated_at |
| EventLog | id, project_id, ts, type, payload_json |

### 5.2 Enums
- TaskStatus: `todo | in_progress | blocked | review | done | failed`
- AgentRole: `lead | backend | frontend | qa | docs | security | custom`

---

## 6) API Design (REST + WebSocket)

### 6.1 REST endpoints
| Method | Path | Mô tả |
|---|---|---|
| POST | /projects | tạo project từ repo_path |
| GET | /projects | list projects |
| GET | /projects/{id} | project detail |
| POST | /projects/{id}/departments/scan | scan folders tạo rooms |
| GET | /projects/{id}/departments | list rooms |
| POST | /projects/{id}/team | create team config |
| POST | /projects/{id}/team/start | spawn lead + teammates |
| POST | /sessions/{id}/stop | stop session |
| POST | /projects/{id}/tasks | tạo task |
| PATCH | /tasks/{id} | update task |
| POST | /tasks/{id}/run | chạy task (dispatch agent) |
| POST | /projects/{id}/qa/run | chạy QA gate |
| GET | /projects/{id}/qa/status | trạng thái QA |

### 6.2 WebSocket
- **WS** `/ws/projects/{id}`
- Event types:
  - `agent.status`
  - `task.updated`
  - `log.append`
  - `room.occupancy`
  - `qa.status`

**Ví dụ payload**
```json
{
  "type": "task.updated",
  "ts": "2026-02-11T10:22:01Z",
  "data": {
    "task_id": "t_123",
    "status": "in_progress",
    "assigned_agent_id": "a_backend_1"
  }
}
```

---

## 7) Claude Code + Agent Teams Integration

### 7.1 Team mode
- Enable Agent Teams (experimental) bằng env/setting:
  - `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
- Orchestrator tạo:
  - `Lead session`
  - `Teammate sessions[]` theo role

### 7.2 Adapter strategy
- BE gọi Claude Code CLI qua `subprocess`
- Streaming stdout → convert thành events (log.append / agent.status)
- Nếu Team mode fail → fallback “single-agent mode”

---

## 8) Git Workflow (Worktree per Agent)

### 8.1 Mục tiêu
- Tránh xung đột file khi nhiều agent sửa cùng lúc.

### 8.2 Cách làm
- Mỗi agent có:
  - `branch: chibi/{project}/{agent_id}`
  - `worktree: worktrees/{agent_id}/`
- Khi hoàn thành:
  - tạo diff summary
  - export patch
  - Lead tổng hợp và tạo merge plan (MVP chưa cần PR thật)

---

## 9) QA Gate & Department Policies

### 9.1 Policy per Department
- Mỗi phòng có policy:
  - allowed commands
  - lint/test commands
  - prompt template hints

### 9.2 QA Gate pipeline
- `qa.run` sẽ:
  - chạy lệnh theo department (hoặc global)
  - emit `qa.status` realtime
  - fail → block merge plan

---

## 10) Roadmap (3 Sprint) + Acceptance Criteria

### Sprint 1 — MVP chạy được
- Electron spawn BE + chọn repo
- Scan folder → tạo rooms
- UI Office map + Kanban + basic logs
- WS realtime

**Acceptance**
- User chọn repo, thấy rooms và tạo task được.
- WS push task/agent status hiển thị realtime.

### Sprint 2 — Multi-agent (Agent Teams)
- Start lead + 2-3 teammates
- Dispatch tasks theo phòng ban
- Worktree per agent

**Acceptance**
- Mỗi agent có worktree riêng.
- Lead phân công tasks, trạng thái đổi realtime.

### Sprint 3 — QA gate + polish chibi
- Policy file
- Lint/test theo phòng ban
- Animations + trạng thái chibi

**Acceptance**
- QA fail → tasks chuyển blocked/failed, merge plan bị chặn.
- Policy thay đổi được mà không sửa code.

---

## 11) Rủi ro & Giảm thiểu
- Agent Teams experimental → **fallback single-agent**
- Parsing CLI logs dễ vỡ → lưu raw logs + parse tối thiểu
- Conflict Git → worktree per agent + lead merge
- Performance Electron → dùng WS + debounce UI updates

---

## 12) Appendix: Config mẫu

### 12.1 `.chibi/departments.yml`
```yaml
departments:
  - name: Backend Dept
    folder: apps/backend
    policy:
      role_defaults: [backend, qa]
      qa:
        commands:
          - "python -m ruff check ."
          - "python -m pytest -q"
  - name: Frontend Dept
    folder: apps/frontend
    policy:
      role_defaults: [frontend, qa]
      qa:
        commands:
          - "pnpm -C apps/frontend lint"
          - "pnpm -C apps/frontend test"
ignore_folders:
  - .git
  - node_modules
  - dist
  - build
```
