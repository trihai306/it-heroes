"""Team File Watcher — monitors ~/.claude/teams/ and ~/.claude/tasks/ for changes.

Polls the file-based infrastructure that Claude Code Agent Teams use:
- ~/.claude/teams/{team-name}/config.json (team members)
- ~/.claude/teams/{team-name}/inboxes/{agent}.json (mailbox messages)
- ~/.claude/tasks/ (shared task list)
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Awaitable, Callable, Optional

logger = logging.getLogger(__name__)

CLAUDE_HOME = Path.home() / ".claude"
TEAMS_DIR = CLAUDE_HOME / "teams"
TASKS_DIR = CLAUDE_HOME / "tasks"

# Type alias for async callbacks
AsyncCallback = Callable[..., Awaitable[None]]


class TeamFileWatcher:
    """Polls ~/.claude/teams/{team_name}/ for config, inbox, and task changes."""

    def __init__(self, team_name: str, poll_interval: float = 1.5):
        self.team_name = team_name
        self.poll_interval = poll_interval
        self._stop_event = asyncio.Event()

        # File state tracking (for delta detection)
        self._config_mtime: float = 0
        self._inbox_mtimes: dict[str, float] = {}
        self._inbox_lengths: dict[str, int] = {}
        self._task_mtimes: dict[str, float] = {}
        self._known_members: set[str] = set()
        self._task_dir: Optional[Path] = None

        # Callbacks
        self._on_member_joined: Optional[AsyncCallback] = None
        self._on_member_left: Optional[AsyncCallback] = None
        self._on_inbox_message: Optional[AsyncCallback] = None
        self._on_task_update: Optional[AsyncCallback] = None
        self._on_config_change: Optional[AsyncCallback] = None

    # ─── Paths ──────────────────────────────────────────────────────

    @property
    def team_dir(self) -> Path:
        return TEAMS_DIR / self.team_name

    @property
    def inboxes_dir(self) -> Path:
        return self.team_dir / "inboxes"

    # ─── Callback registration ──────────────────────────────────────

    def on_member_joined(self, cb: AsyncCallback):
        self._on_member_joined = cb

    def on_member_left(self, cb: AsyncCallback):
        self._on_member_left = cb

    def on_inbox_message(self, cb: AsyncCallback):
        self._on_inbox_message = cb

    def on_task_update(self, cb: AsyncCallback):
        self._on_task_update = cb

    def on_config_change(self, cb: AsyncCallback):
        self._on_config_change = cb

    # ─── Lifecycle ──────────────────────────────────────────────────

    async def start(self):
        """Start the polling loop. Blocks until stop() is called."""
        logger.info(f"File watcher started for team '{self.team_name}'")
        self._snapshot_current_state()

        while not self._stop_event.is_set():
            try:
                await self._poll_config()
                await self._poll_inboxes()
                await self._poll_tasks()
            except Exception as e:
                logger.error(f"File watcher poll error: {e}")

            try:
                await asyncio.wait_for(
                    self._stop_event.wait(),
                    timeout=self.poll_interval,
                )
                break
            except asyncio.TimeoutError:
                continue

        logger.info(f"File watcher stopped for team '{self.team_name}'")

    def stop(self):
        """Signal the polling loop to stop."""
        self._stop_event.set()

    # ─── Snapshot baseline ──────────────────────────────────────────

    def _snapshot_current_state(self):
        """Record initial file state so we only emit deltas."""
        config_path = self.team_dir / "config.json"
        if config_path.exists():
            self._config_mtime = config_path.stat().st_mtime
            try:
                config = json.loads(config_path.read_text())
                self._known_members = {
                    m["agentId"] for m in config.get("members", [])
                }
            except Exception:
                pass

        if self.inboxes_dir.exists():
            for inbox_file in self.inboxes_dir.glob("*.json"):
                name = inbox_file.stem
                self._inbox_mtimes[name] = inbox_file.stat().st_mtime
                try:
                    messages = json.loads(inbox_file.read_text())
                    self._inbox_lengths[name] = len(messages) if isinstance(messages, list) else 0
                except Exception:
                    self._inbox_lengths[name] = 0

        self._discover_task_dir()
        if self._task_dir and self._task_dir.exists():
            for f in self._task_dir.glob("*.json"):
                if f.name != ".lock":
                    self._task_mtimes[f.name] = f.stat().st_mtime

    def _discover_task_dir(self):
        """Find the task directory for this team (may be UUID-based)."""
        if self._task_dir and self._task_dir.exists():
            return

        # Check by team name first
        by_name = TASKS_DIR / self.team_name
        if by_name.exists():
            self._task_dir = by_name
            return

        # Scan for recently created task dirs (within last 60s)
        if TASKS_DIR.exists():
            import time
            now = time.time()
            candidates = []
            for d in TASKS_DIR.iterdir():
                if d.is_dir() and (now - d.stat().st_ctime) < 60:
                    candidates.append(d)
            if candidates:
                # Pick most recently created
                candidates.sort(key=lambda x: x.stat().st_ctime, reverse=True)
                self._task_dir = candidates[0]

    # ─── Poll config.json ───────────────────────────────────────────

    async def _poll_config(self):
        """Check config.json for member join/leave."""
        config_path = self.team_dir / "config.json"
        if not config_path.exists():
            return

        mtime = config_path.stat().st_mtime
        if mtime <= self._config_mtime:
            return
        self._config_mtime = mtime

        try:
            config = json.loads(config_path.read_text())
        except Exception:
            return

        members = config.get("members", [])
        current_ids = {m["agentId"] for m in members}
        members_by_id = {m["agentId"]: m for m in members}

        # New members
        for agent_id in current_ids - self._known_members:
            member = members_by_id[agent_id]
            logger.info(f"File watcher: member joined — {member.get('name')}")
            if self._on_member_joined:
                await self._on_member_joined(member)

        # Removed members
        for agent_id in self._known_members - current_ids:
            logger.info(f"File watcher: member left — {agent_id}")
            if self._on_member_left:
                await self._on_member_left(agent_id)

        self._known_members = current_ids

        if self._on_config_change:
            await self._on_config_change(config)

    # ─── Poll inboxes ──────────────────────────────────────────────

    async def _poll_inboxes(self):
        """Check inbox files for new messages."""
        if not self.inboxes_dir.exists():
            return

        for inbox_file in self.inboxes_dir.glob("*.json"):
            name = inbox_file.stem
            mtime = inbox_file.stat().st_mtime
            if mtime <= self._inbox_mtimes.get(name, 0):
                continue
            self._inbox_mtimes[name] = mtime

            try:
                messages = json.loads(inbox_file.read_text())
                if not isinstance(messages, list):
                    continue
            except Exception:
                continue

            prev_len = self._inbox_lengths.get(name, 0)
            new_messages = messages[prev_len:]
            self._inbox_lengths[name] = len(messages)

            for msg in new_messages:
                if self._on_inbox_message:
                    await self._on_inbox_message(name, msg)

    # ─── Poll tasks ─────────────────────────────────────────────────

    async def _poll_tasks(self):
        """Check task files for new/updated tasks."""
        self._discover_task_dir()
        if not self._task_dir or not self._task_dir.exists():
            return

        for task_file in self._task_dir.glob("*.json"):
            if task_file.name == ".lock":
                continue

            mtime = task_file.stat().st_mtime
            prev = self._task_mtimes.get(task_file.name, 0)
            if mtime <= prev:
                continue
            self._task_mtimes[task_file.name] = mtime

            try:
                task_data = json.loads(task_file.read_text())
            except Exception:
                continue

            if self._on_task_update:
                is_new = prev == 0
                await self._on_task_update(task_data, is_new)

    # ─── Read helpers (for API endpoints) ───────────────────────────

    def read_config(self) -> Optional[dict]:
        """Read current team config.json."""
        config_path = self.team_dir / "config.json"
        if config_path.exists():
            try:
                return json.loads(config_path.read_text())
            except Exception:
                return None
        return None

    def read_all_inboxes(self) -> dict[str, list]:
        """Read all inbox contents."""
        result: dict[str, list] = {}
        if self.inboxes_dir.exists():
            for f in self.inboxes_dir.glob("*.json"):
                try:
                    data = json.loads(f.read_text())
                    result[f.stem] = data if isinstance(data, list) else []
                except Exception:
                    result[f.stem] = []
        return result

    def read_tasks(self) -> list[dict]:
        """Read all tasks from the task directory."""
        tasks: list[dict] = []
        self._discover_task_dir()
        if not self._task_dir or not self._task_dir.exists():
            return tasks
        for f in sorted(self._task_dir.glob("*.json")):
            if f.name == ".lock":
                continue
            try:
                tasks.append(json.loads(f.read_text()))
            except Exception:
                pass
        return tasks
