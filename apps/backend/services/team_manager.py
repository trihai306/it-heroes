"""
Team Manager — orchestrates Claude Code Agent Teams.

Follows the official single-session architecture:
https://code.claude.com/docs/en/agent-teams

Architecture:
- Start ONE Claude Code session (the lead)
- Tell it via prompt to create teammates with specific roles & models
- Claude Code internally spawns teammates (tmux / in-process)
- Config: ~/.claude/teams/{team}/config.json
- Tasks: ~/.claude/tasks/{team}/
- Communication via lead's stdin (message / broadcast)
"""

import asyncio
import json
import logging
import os
import signal
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from config import settings

logger = logging.getLogger(__name__)

# Claude team config directories
CLAUDE_HOME = Path.home() / ".claude"
TEAMS_DIR = CLAUDE_HOME / "teams"
TASKS_DIR = CLAUDE_HOME / "tasks"


class LeadSession:
    """Tracks the single lead Claude Code process that manages the entire team."""

    def __init__(
        self,
        team_name: str,
        process: asyncio.subprocess.Process,
        project_id: int,
    ):
        self.team_name = team_name
        self.process = process
        self.project_id = project_id
        self.started_at = datetime.now(timezone.utc)
        self.output_lines: list[dict] = []

    @property
    def is_running(self) -> bool:
        return self.process.returncode is None

    def to_dict(self) -> dict:
        return {
            "team_name": self.team_name,
            "is_running": self.is_running,
            "started_at": self.started_at.isoformat(),
            "output_count": len(self.output_lines),
            "pid": self.process.pid,
            "exit_code": self.process.returncode,
        }


class TeamManager:
    """
    Manages Claude Code Agent Teams lifecycle.

    Official architecture (single-session):
    1. Enable with CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
    2. Spawn ONE Claude Code CLI process (the lead)
    3. Send it a prompt instructing it to create teammates
    4. Claude handles teammate spawning internally
    5. All communication goes through the lead's stdin
    """

    def __init__(self, ws_manager=None):
        self.ws_manager = ws_manager
        self.cli_path = settings.CLAUDE_CLI
        self._lead: Optional[LeadSession] = None
        self._monitor_task: Optional[asyncio.Task] = None
        self._active_team: Optional[str] = None
        self._project_id: Optional[int] = None

    # ── Team Lifecycle ────────────────────────────────────────────────

    async def create_team(
        self,
        team_name: str,
        project_id: int,
        working_dir: str,
        prompt: str,
        model: str = "",
    ) -> dict:
        """
        Create a new agent team by spawning ONE lead Claude session.

        The user's natural language prompt is passed directly to Claude Code.
        Claude reads the prompt and creates the team itself — spawning
        teammates, assigning roles, choosing models — all internally.

        Args:
            team_name: Unique team name
            project_id: Project ID
            working_dir: Repository path
            prompt: User's natural language prompt (e.g. "Create a team with 3 reviewers...")
            model: Optional model preference for the lead
        """
        if self._lead and self._lead.is_running:
            await self.cleanup_team()

        self._active_team = team_name
        self._project_id = project_id

        # Spawn the single lead Claude process
        env = {**os.environ}
        env["CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"] = "1"

        cmd = [self.cli_path]
        cmd.extend(["--print", "--output-format", "stream-json"])

        # Use in-process teammate mode (no tmux required)
        cmd.extend(["--teammate-mode", "in-process"])

        # Model preference
        lead_model = model or settings.CLAUDE_MODEL
        if lead_model:
            cmd.extend(["--model", lead_model])

        # Pass the creation prompt
        cmd.extend(["-p", prompt])

        logger.info(f"🚀 Spawning lead session for team '{team_name}'")
        logger.debug(f"CMD: {' '.join(cmd[:8])}...")

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=working_dir,
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            stdin=asyncio.subprocess.PIPE,
            preexec_fn=os.setsid if os.name != "nt" else None,
        )

        self._lead = LeadSession(
            team_name=team_name,
            process=proc,
            project_id=project_id,
        )

        # Start output monitor
        self._monitor_task = asyncio.create_task(self._monitor_output())

        logger.info(f"✅ Team '{team_name}' lead spawned (PID={proc.pid})")

        return {
            "team_name": team_name,
            "model": lead_model,
            "pid": proc.pid,
            "prompt_preview": prompt[:200],
        }

    async def send_to_lead(self, message: str) -> dict:
        """Send a message/command to the lead session's stdin."""
        if not self._lead or not self._lead.is_running:
            return {"error": "No active lead session"}

        try:
            self._lead.process.stdin.write(f"{message}\n".encode())
            await self._lead.process.stdin.drain()
            logger.info(f"📨 Sent to lead: {message[:80]}...")
            return {"sent": True, "message": message[:80]}
        except Exception as e:
            logger.error(f"Failed to send to lead: {e}")
            return {"error": str(e)}

    async def send_message(
        self,
        from_agent_id: int,
        to_agent_name: str,
        message: str,
    ) -> dict:
        """
        Send a message to a specific teammate via the lead.

        In official Agent Teams, you tell the lead to relay messages:
        "Send a message to {teammate}: {message}"
        """
        cmd = f"Send a message to {to_agent_name}: {message}"
        return await self.send_to_lead(cmd)

    async def broadcast(self, from_agent_id: int, message: str) -> dict:
        """Broadcast a message to all teammates via the lead."""
        cmd = f"Broadcast to all teammates: {message}"
        return await self.send_to_lead(cmd)

    async def stop_teammate(self, agent_name: str) -> dict:
        """Ask a specific teammate to shut down via the lead."""
        cmd = f"Ask the {agent_name} teammate to shut down"
        return await self.send_to_lead(cmd)

    async def cleanup_team(self) -> dict:
        """Clean up the entire team — send cleanup command then kill process."""
        if not self._lead:
            return {"cleaned": False, "reason": "No active team"}

        team_name = self._active_team

        # Try graceful cleanup
        if self._lead.is_running:
            try:
                # Send cleanup command
                self._lead.process.stdin.write(b"Clean up the team\n")
                await self._lead.process.stdin.drain()
                # Wait briefly for graceful shutdown
                try:
                    await asyncio.wait_for(self._lead.process.wait(), timeout=5.0)
                except asyncio.TimeoutError:
                    pass
            except Exception:
                pass

            # Force kill if still running
            if self._lead.is_running:
                try:
                    if os.name != "nt":
                        os.killpg(os.getpgid(self._lead.process.pid), signal.SIGTERM)
                    else:
                        self._lead.process.terminate()

                    try:
                        await asyncio.wait_for(self._lead.process.wait(), timeout=5.0)
                    except asyncio.TimeoutError:
                        if os.name != "nt":
                            os.killpg(os.getpgid(self._lead.process.pid), signal.SIGKILL)
                        else:
                            self._lead.process.kill()
                        await self._lead.process.wait()
                except ProcessLookupError:
                    pass

        # Cancel monitor
        if self._monitor_task:
            self._monitor_task.cancel()
            self._monitor_task = None

        self._lead = None
        self._active_team = None
        self._project_id = None

        logger.info(f"🧹 Team '{team_name}' cleaned up")
        return {"cleaned": True, "team": team_name}

    # ── Status & Info ─────────────────────────────────────────────────

    def get_team_status(self) -> dict:
        """Get team status — stays active until explicit cleanup."""
        if not self._lead:
            return {"active": False, "team": None}

        info = self._lead.to_dict()
        info["recent_output"] = self._lead.output_lines[-10:] if self._lead.output_lines else []

        # Try reading team config from disk
        config = self.read_team_config()

        return {
            "active": True,  # stays True until cleanup is called
            "team": self._active_team,
            "project_id": self._project_id,
            "lead": info,
            "config": config,
            "running": self._lead.is_running,
        }

    def get_agent_output(self, last_n: int = 50) -> list[dict]:
        """Get output lines from the lead session."""
        if not self._lead:
            return []
        return self._lead.output_lines[-last_n:]

    def get_team_config_path(self) -> Optional[Path]:
        """Get path to team config file if it exists."""
        if not self._active_team:
            return None
        config_path = TEAMS_DIR / self._active_team / "config.json"
        return config_path if config_path.exists() else None

    def read_team_config(self) -> Optional[dict]:
        """Read current team config from disk (created by Claude Code)."""
        path = self.get_team_config_path()
        if path:
            try:
                return json.loads(path.read_text())
            except Exception:
                return None
        return None

    # ── Internal Helpers ──────────────────────────────────────────────


    async def _monitor_output(self):
        """Background task: stream output from both stdout and stderr."""
        if not self._lead:
            return

        async def _read_stream(stream, source: str):
            """Read lines from a stream (stdout or stderr)."""
            try:
                async for raw_line in stream:
                    line = raw_line.decode("utf-8", errors="replace").strip()
                    if not line:
                        continue

                    # Try JSON parse (stream-json format)
                    try:
                        data = json.loads(line)
                        entry = {
                            "type": data.get("type", "text"),
                            "content": data.get("content", data.get("text", line)),
                            "source": source,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }

                        # Check for teammate-related events
                        if data.get("type") in ("teammate_spawned", "teammate_stopped", "teammate_message"):
                            entry["teammate_event"] = True

                    except json.JSONDecodeError:
                        entry = {
                            "type": "stderr" if source == "stderr" else "text",
                            "content": line,
                            "source": source,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }

                    self._lead.output_lines.append(entry)

                    # Cap stored output
                    if len(self._lead.output_lines) > 500:
                        self._lead.output_lines = self._lead.output_lines[-300:]

                    # Broadcast via WebSocket
                    if self.ws_manager and self._project_id:
                        from websocket.events import WSEvent
                        event = WSEvent(
                            type="team.output",
                            data={
                                "team_name": self._lead.team_name,
                                **entry,
                            },
                        )
                        await self.ws_manager.broadcast(self._project_id, event)

            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.error(f"Monitor {source} error: {e}")

        # Read both stdout and stderr concurrently
        try:
            await asyncio.gather(
                _read_stream(self._lead.process.stdout, "stdout"),
                _read_stream(self._lead.process.stderr, "stderr"),
            )
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Monitor error: {e}")

        # Lead session finished
        if self.ws_manager and self._project_id and self._lead:
            from websocket.events import WSEvent
            event = WSEvent(
                type="team.stopped",
                data={
                    "team_name": self._lead.team_name,
                    "exit_code": self._lead.process.returncode,
                },
            )
            await self.ws_manager.broadcast(self._project_id, event)

        if self._lead:
            logger.info(
                f"👋 Lead session finished (exit={self._lead.process.returncode})"
            )
