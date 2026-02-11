"""Task Dispatcher — auto-assigns tasks to agents based on role."""

import logging
from sqlmodel import Session, select

from models.task import Task, TaskStatus
from models.agent import Agent, AgentRole

logger = logging.getLogger(__name__)


class TaskDispatcher:
    """Handles task assignment and dispatching logic."""

    # Mapping: keywords → preferred agent role
    ROLE_MAP = {
        "backend": AgentRole.BACKEND,
        "api": AgentRole.BACKEND,
        "server": AgentRole.BACKEND,
        "frontend": AgentRole.FRONTEND,
        "client": AgentRole.FRONTEND,
        "renderer": AgentRole.FRONTEND,
        "ui": AgentRole.FRONTEND,
        "test": AgentRole.QA,
        "spec": AgentRole.QA,
        "qa": AgentRole.QA,
        "doc": AgentRole.DOCS,
        "guide": AgentRole.DOCS,
        "security": AgentRole.SECURITY,
    }

    def auto_assign(
        self,
        db: Session,
        project_id: int,
        task_id: int | None = None,
    ) -> list[dict]:
        """
        Auto-assign unassigned tasks to matching agents.

        Strategy:
        1. Match task title keywords to agent role
        2. Balance load: prefer agents with fewer active tasks
        3. Lead handles unmatched tasks

        Returns list of {task_id, agent_id, reason}.
        """
        # Get all agents for this project
        agents = db.exec(
            select(Agent).where(Agent.project_id == project_id)
        ).all()

        if not agents:
            return []

        # Get unassigned tasks
        query = select(Task).where(
            Task.project_id == project_id,
            Task.assigned_agent_id == None,  # noqa: E711
            Task.status == TaskStatus.TODO,
        )
        if task_id:
            query = query.where(Task.id == task_id)

        tasks = db.exec(query).all()
        if not tasks:
            return []

        # Build agent load map (count of active tasks per agent)
        active_tasks = db.exec(
            select(Task).where(
                Task.project_id == project_id,
                Task.status.in_([TaskStatus.IN_PROGRESS, TaskStatus.REVIEW]),
            )
        ).all()

        load_map: dict[int, int] = {a.id: 0 for a in agents}
        for t in active_tasks:
            if t.assigned_agent_id and t.assigned_agent_id in load_map:
                load_map[t.assigned_agent_id] += 1

        # Assign
        assignments = []
        lead = next((a for a in agents if a.role == AgentRole.LEAD), None)

        for task in tasks:
            agent = self._find_best_agent(task, agents, load_map)
            if not agent and lead:
                agent = lead
                reason = "No matching role — assigned to Lead"
            elif agent:
                reason = f"Matched role: {agent.role.value}"
            else:
                continue

            task.assigned_agent_id = agent.id
            task.status = TaskStatus.TODO  # Keep as todo until orchestrator starts
            db.add(task)

            load_map[agent.id] = load_map.get(agent.id, 0) + 1

            assignments.append({
                "task_id": task.id,
                "agent_id": agent.id,
                "agent_name": agent.name,
                "reason": reason,
            })

        db.commit()
        logger.info(f"📋 Auto-assigned {len(assignments)} tasks")
        return assignments

    def _find_best_agent(
        self,
        task: Task,
        agents: list[Agent],
        load_map: dict[int, int],
    ) -> Agent | None:
        """Find the best agent for a task based on title keyword match + load balance."""
        preferred_role = None

        # Determine preferred role from task title
        if task.title:
            title_lower = task.title.lower()
            for keyword, role in self.ROLE_MAP.items():
                if keyword in title_lower:
                    preferred_role = role
                    break

        # Find matching agents (exclude lead from auto-match)
        candidates = [
            a for a in agents
            if a.role == preferred_role and a.role != AgentRole.LEAD
        ] if preferred_role else []

        if not candidates:
            # Fallback: any non-lead agent with the lowest load
            candidates = [a for a in agents if a.role != AgentRole.LEAD]

        if not candidates:
            return None

        # Load balance: pick agent with fewest tasks
        candidates.sort(key=lambda a: load_map.get(a.id, 0))
        return candidates[0]

    def requeue_failed(self, db: Session, task_id: int) -> Task | None:
        """
        Requeue a failed task — reset status to TODO and unassign.
        """
        task = db.get(Task, task_id)
        if not task:
            return None

        task.status = TaskStatus.TODO
        task.assigned_agent_id = None
        db.add(task)
        db.commit()
        db.refresh(task)

        logger.info(f"🔄 Requeued task #{task_id}")
        return task

    def build_prompt(self, task: Task) -> str:
        """
        Build a Claude prompt from a task.
        """
        lines = [
            f"## Task: {task.title}",
        ]

        if task.description:
            lines.append(f"\n{task.description}")

        lines.append("\n### Instructions")
        lines.append("1. Read and understand the existing code structure")
        lines.append("2. Implement the changes described above")
        lines.append("3. Ensure your changes don't break existing functionality")
        lines.append("4. Write clean, well-documented code")

        return "\n".join(lines)
