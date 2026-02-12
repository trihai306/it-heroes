"""Backend services module."""

from services.git_workspace import GitWorkspaceManager
from services.claude_adapter import ClaudeCodeAdapter
from services.task_dispatcher import TaskDispatcher
from services.unified_orchestrator import UnifiedTeamOrchestrator

__all__ = [
    "GitWorkspaceManager",
    "ClaudeCodeAdapter",
    "TaskDispatcher",
    "UnifiedTeamOrchestrator",
]
