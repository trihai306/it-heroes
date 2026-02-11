"""Git Workspace Manager — handles worktree creation and cleanup per agent."""

import logging
import os
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)


class GitWorkspaceManager:
    """Manages git worktrees so each agent works in isolated directories."""

    def __init__(self, worktree_base: str = "worktrees"):
        self.worktree_base = worktree_base

    def _run_git(self, cwd: str, *args: str) -> subprocess.CompletedProcess:
        """Run a git command in the given directory."""
        cmd = ["git"] + list(args)
        logger.debug(f"git: {' '.join(cmd)} (cwd={cwd})")
        return subprocess.run(
            cmd, cwd=cwd, capture_output=True, text=True, timeout=30
        )

    def create_worktree(
        self, repo_path: str, agent_id: int, project_name: str = "project"
    ) -> dict:
        """
        Create a git worktree for an agent.

        Returns dict with: worktree_path, branch_name
        """
        branch_name = f"chibi/{project_name}/agent-{agent_id}"
        worktree_dir = os.path.join(
            repo_path, self.worktree_base, f"agent-{agent_id}"
        )

        # Create worktrees base dir
        os.makedirs(os.path.dirname(worktree_dir), exist_ok=True)

        # Clean up if exists from a previous session
        if os.path.exists(worktree_dir):
            logger.info(f"Cleaning up existing worktree: {worktree_dir}")
            self._run_git(repo_path, "worktree", "remove", worktree_dir, "--force")

        # Delete branch if it exists
        self._run_git(repo_path, "branch", "-D", branch_name)

        # Create new worktree with a fresh branch from HEAD
        result = self._run_git(
            repo_path, "worktree", "add", worktree_dir, "-b", branch_name
        )

        if result.returncode != 0:
            # Fallback: try without -b (branch may exist)
            logger.warning(f"Worktree creation with new branch failed: {result.stderr}")
            result = self._run_git(
                repo_path, "worktree", "add", worktree_dir, branch_name
            )
            if result.returncode != 0:
                raise RuntimeError(
                    f"Failed to create worktree: {result.stderr.strip()}"
                )

        logger.info(f"✅ Created worktree for agent-{agent_id}: {worktree_dir}")
        return {
            "worktree_path": worktree_dir,
            "branch_name": branch_name,
        }

    def get_worktree_path(self, repo_path: str, agent_id: int) -> str | None:
        """Resolve the worktree path for an agent."""
        path = os.path.join(repo_path, self.worktree_base, f"agent-{agent_id}")
        return path if os.path.isdir(path) else None

    def list_worktrees(self, repo_path: str) -> list[dict]:
        """List all worktrees for a repo."""
        result = self._run_git(repo_path, "worktree", "list", "--porcelain")
        if result.returncode != 0:
            return []

        worktrees = []
        current = {}
        for line in result.stdout.strip().split("\n"):
            if line.startswith("worktree "):
                if current:
                    worktrees.append(current)
                current = {"path": line.split(" ", 1)[1]}
            elif line.startswith("HEAD "):
                current["head"] = line.split(" ", 1)[1]
            elif line.startswith("branch "):
                current["branch"] = line.split(" ", 1)[1]
            elif line == "bare":
                current["bare"] = True
            elif line == "detached":
                current["detached"] = True
        if current:
            worktrees.append(current)

        return worktrees

    def get_diff_summary(self, worktree_path: str) -> str:
        """Get a summary of changes in a worktree."""
        result = self._run_git(worktree_path, "diff", "--stat")
        if result.returncode != 0:
            return ""
        return result.stdout.strip()

    def get_full_diff(self, worktree_path: str) -> str:
        """Get the full diff of changes in a worktree."""
        result = self._run_git(worktree_path, "diff")
        return result.stdout if result.returncode == 0 else ""

    def export_patch(self, worktree_path: str) -> str:
        """Create a formatted patch of committed changes."""
        result = self._run_git(worktree_path, "format-patch", "HEAD~1", "--stdout")
        return result.stdout if result.returncode == 0 else ""

    def commit_changes(
        self, worktree_path: str, message: str, agent_name: str = "Chibi Agent"
    ) -> bool:
        """Stage all changes and commit in the worktree."""
        self._run_git(worktree_path, "add", "-A")
        result = self._run_git(
            worktree_path,
            "commit",
            "-m",
            message,
            "--author",
            f"{agent_name} <chibi@office.ai>",
            "--allow-empty",
        )
        return result.returncode == 0

    def cleanup_worktree(self, repo_path: str, agent_id: int) -> bool:
        """Remove worktree and its branch."""
        worktree_dir = os.path.join(
            repo_path, self.worktree_base, f"agent-{agent_id}"
        )

        # Remove worktree
        result = self._run_git(repo_path, "worktree", "remove", worktree_dir, "--force")
        if result.returncode != 0:
            logger.warning(f"Failed to remove worktree: {result.stderr}")
            # Force remove directory
            import shutil
            if os.path.exists(worktree_dir):
                shutil.rmtree(worktree_dir)

        # Prune worktree references
        self._run_git(repo_path, "worktree", "prune")

        logger.info(f"🧹 Cleaned up worktree for agent-{agent_id}")
        return True

    def cleanup_all(self, repo_path: str) -> None:
        """Remove all chibi worktrees."""
        worktrees_dir = os.path.join(repo_path, self.worktree_base)
        if os.path.isdir(worktrees_dir):
            import shutil
            shutil.rmtree(worktrees_dir)
        self._run_git(repo_path, "worktree", "prune")
        logger.info("🧹 Cleaned up all worktrees")

    def create_merge_plan(self, repo_path: str, agent_ids: list[int]) -> list[dict]:
        """
        Generate a merge plan showing diffs from each agent's branch.
        Returns list of {agent_id, branch, files_changed, diff_summary}.
        """
        plan = []
        for agent_id in agent_ids:
            branch = f"chibi/project/agent-{agent_id}"
            diff_stat = self._run_git(repo_path, "diff", "HEAD", branch, "--stat")
            diff_names = self._run_git(
                repo_path, "diff", "HEAD", branch, "--name-only"
            )

            if diff_stat.returncode == 0:
                plan.append({
                    "agent_id": agent_id,
                    "branch": branch,
                    "files_changed": [
                        f for f in diff_names.stdout.strip().split("\n") if f
                    ],
                    "diff_summary": diff_stat.stdout.strip(),
                })

        return plan
