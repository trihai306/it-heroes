"""Claude Code Adapter — wraps the Claude CLI subprocess for agent sessions."""

import asyncio
import logging
import os
import signal
from typing import AsyncGenerator, Optional

from config import settings

logger = logging.getLogger(__name__)


class ClaudeCodeAdapter:
    """
    Manages Claude Code CLI subprocesses.

    Supports two modes:
    1. Agent Teams mode (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1)
    2. Single-agent mode (fallback)
    """

    def __init__(self):
        self.cli_path = settings.CLAUDE_CLI
        self.agent_teams_enabled = settings.AGENT_TEAMS_ENABLED
        self._processes: dict[int, asyncio.subprocess.Process] = {}

    async def check_cli_available(self) -> bool:
        """Check if the Claude CLI is installed and accessible."""
        try:
            proc = await asyncio.create_subprocess_exec(
                self.cli_path, "--version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
            available = proc.returncode == 0
            if available:
                logger.info(f"✅ Claude CLI found: {stdout.decode().strip()}")
            return available
        except (FileNotFoundError, asyncio.TimeoutError):
            logger.warning(f"❌ Claude CLI not found at: {self.cli_path}")
            return False

    async def start_session(
        self,
        agent_id: int,
        working_dir: str,
        prompt: str,
        role: str = "backend",
        team_name: Optional[str] = None,
    ) -> asyncio.subprocess.Process:
        """
        Spawn a Claude CLI session for an agent.

        Args:
            agent_id: Unique agent identifier
            working_dir: Directory to execute in (worktree path)
            prompt: The task/prompt to send
            role: Agent role (for team mode)
            team_name: Team name (for agent teams mode)

        Returns:
            The subprocess.Process handle
        """
        env = {**os.environ}

        # Build command args
        cmd = [self.cli_path]

        if self.agent_teams_enabled and team_name:
            # Agent Teams mode
            env["CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"] = "1"
            cmd.extend([
                "--team", team_name,
                "--role", role,
            ])
            logger.info(f"🤖 Starting agent-{agent_id} in team mode (team={team_name}, role={role})")
        else:
            logger.info(f"🤖 Starting agent-{agent_id} in single mode")

        # Add the prompt
        cmd.extend(["--print", "--output-format", "stream-json", "-p", prompt])

        logger.debug(f"CMD: {' '.join(cmd)}")

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=working_dir,
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            # Ensure process group for cleanup
            preexec_fn=os.setsid if os.name != "nt" else None,
        )

        self._processes[agent_id] = proc
        logger.info(f"✅ Agent-{agent_id} started (PID={proc.pid})")
        return proc

    async def stream_output(
        self, agent_id: int
    ) -> AsyncGenerator[dict, None]:
        """
        Async generator yielding parsed output lines from a Claude session.

        Yields dicts with: {type, content, agent_id}
        """
        proc = self._processes.get(agent_id)
        if not proc or not proc.stdout:
            return

        import json

        buffer = ""
        try:
            async for raw_line in proc.stdout:
                line = raw_line.decode("utf-8", errors="replace").strip()
                if not line:
                    continue

                # Try to parse as JSON (stream-json format)
                try:
                    data = json.loads(line)
                    yield {
                        "type": data.get("type", "text"),
                        "content": data.get("content", data.get("text", line)),
                        "agent_id": agent_id,
                        "raw": data,
                    }
                except json.JSONDecodeError:
                    # Plain text output
                    yield {
                        "type": "text",
                        "content": line,
                        "agent_id": agent_id,
                    }

        except asyncio.CancelledError:
            logger.info(f"Stream cancelled for agent-{agent_id}")
        except Exception as e:
            logger.error(f"Stream error for agent-{agent_id}: {e}")
            yield {
                "type": "error",
                "content": str(e),
                "agent_id": agent_id,
            }

    async def get_stderr(self, agent_id: int) -> str:
        """Get stderr output from a process (for debugging)."""
        proc = self._processes.get(agent_id)
        if proc and proc.stderr:
            try:
                stderr = await asyncio.wait_for(proc.stderr.read(), timeout=1)
                return stderr.decode("utf-8", errors="replace")
            except asyncio.TimeoutError:
                return ""
        return ""

    async def stop_session(self, agent_id: int, timeout: float = 10.0) -> int:
        """
        Gracefully stop an agent session. Returns exit code.

        Sends SIGTERM first, then SIGKILL after timeout.
        """
        proc = self._processes.pop(agent_id, None)
        if not proc:
            return -1

        if proc.returncode is not None:
            logger.info(f"Agent-{agent_id} already exited (code={proc.returncode})")
            return proc.returncode

        try:
            # Graceful: SIGTERM to process group
            if os.name != "nt":
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            else:
                proc.terminate()

            # Wait for graceful exit
            try:
                code = await asyncio.wait_for(proc.wait(), timeout=timeout)
                logger.info(f"🛑 Agent-{agent_id} stopped gracefully (code={code})")
                return code
            except asyncio.TimeoutError:
                # Force kill
                if os.name != "nt":
                    os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
                else:
                    proc.kill()
                code = await proc.wait()
                logger.warning(f"💀 Agent-{agent_id} force-killed (code={code})")
                return code

        except ProcessLookupError:
            logger.info(f"Agent-{agent_id} already gone")
            return -1

    async def stop_all(self) -> None:
        """Stop all running agent sessions."""
        agent_ids = list(self._processes.keys())
        for agent_id in agent_ids:
            await self.stop_session(agent_id)
        logger.info(f"🛑 Stopped {len(agent_ids)} agent sessions")

    def get_active_count(self) -> int:
        """Get count of active sessions."""
        return sum(
            1 for p in self._processes.values() if p.returncode is None
        )

    def is_running(self, agent_id: int) -> bool:
        """Check if an agent session is still running."""
        proc = self._processes.get(agent_id)
        return proc is not None and proc.returncode is None
