"""Anthropic SDK Adapter — direct API calls to Claude without CLI dependency.

Uses the `anthropic` Python SDK for conversational AI with tool use.
Claude can execute bash commands, read/write files within the agent's worktree.
"""

import asyncio
import json
import logging
import os
import subprocess
from pathlib import Path
from typing import AsyncGenerator, Optional

from config import settings
from services.auth import get_auth_token, get_auth_source

logger = logging.getLogger(__name__)

# ─── Tool Definitions ─────────────────────────────────────────────────

TOOLS = [
    {
        "name": "bash",
        "description": (
            "Execute a bash command in the working directory. "
            "Use this for running tests, installing dependencies, git operations, etc."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The bash command to execute",
                },
                "timeout": {
                    "type": "integer",
                    "description": "Timeout in seconds (default: 60)",
                    "default": 60,
                },
            },
            "required": ["command"],
        },
    },
    {
        "name": "read_file",
        "description": "Read the contents of a file at the given path (relative to working directory).",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Relative path to the file to read",
                },
            },
            "required": ["path"],
        },
    },
    {
        "name": "write_file",
        "description": "Write content to a file at the given path (relative to working directory). Creates parent directories if needed.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Relative path to the file to write",
                },
                "content": {
                    "type": "string",
                    "description": "The content to write to the file",
                },
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "list_directory",
        "description": "List files and directories at the given path.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Relative path to list (default: current directory)",
                    "default": ".",
                },
            },
        },
    },
    {
        "name": "search_files",
        "description": "Search for a pattern in files using grep.",
        "input_schema": {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "Pattern to search for (regex supported)",
                },
                "path": {
                    "type": "string",
                    "description": "Directory or file to search in (default: .)",
                    "default": ".",
                },
                "include": {
                    "type": "string",
                    "description": "File glob pattern to include (e.g. '*.py')",
                },
            },
            "required": ["pattern"],
        },
    },
]

# ─── Security: Command Blocklist ──────────────────────────────────────

BLOCKED_COMMANDS = {
    "rm -rf /", "rm -rf /*", "mkfs", "dd if=",
    ":(){:|:&};:", "chmod -R 777 /",
    "curl | sh", "wget | sh", "curl | bash", "wget | bash",
}


def _is_command_safe(command: str) -> bool:
    """Basic safety check for bash commands."""
    cmd_lower = command.strip().lower()
    for blocked in BLOCKED_COMMANDS:
        if blocked in cmd_lower:
            return False
    return True


# ─── Tool Execution ───────────────────────────────────────────────────

async def _execute_tool(
    tool_name: str,
    tool_input: dict,
    working_dir: str,
) -> str:
    """Execute a tool call and return the result as a string."""

    if tool_name == "bash":
        command = tool_input.get("command", "")
        timeout = tool_input.get("timeout", 60)

        if not _is_command_safe(command):
            return f"⛔ Command blocked for safety: {command}"

        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                cwd=working_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=timeout
            )
            output = stdout.decode("utf-8", errors="replace")
            errors = stderr.decode("utf-8", errors="replace")

            result = ""
            if output:
                result += output
            if errors:
                result += f"\n[stderr]\n{errors}"
            if proc.returncode != 0:
                result += f"\n[exit code: {proc.returncode}]"

            return result.strip() or "(no output)"

        except asyncio.TimeoutError:
            return f"⏰ Command timed out after {timeout}s"
        except Exception as e:
            return f"❌ Error executing command: {e}"

    elif tool_name == "read_file":
        path = tool_input.get("path", "")
        full_path = Path(working_dir) / path

        # Security: prevent path traversal
        try:
            resolved = full_path.resolve()
            if not str(resolved).startswith(str(Path(working_dir).resolve())):
                return "⛔ Path traversal detected — access denied"
        except Exception:
            return "⛔ Invalid path"

        if not full_path.exists():
            return f"File not found: {path}"
        if not full_path.is_file():
            return f"Not a file: {path}"

        try:
            content = full_path.read_text(encoding="utf-8", errors="replace")
            # Truncate very large files
            if len(content) > 100_000:
                content = content[:100_000] + "\n\n... [truncated, file too large]"
            return content
        except Exception as e:
            return f"Error reading file: {e}"

    elif tool_name == "write_file":
        path = tool_input.get("path", "")
        content = tool_input.get("content", "")
        full_path = Path(working_dir) / path

        # Security: prevent path traversal
        try:
            resolved = full_path.resolve()
            if not str(resolved).startswith(str(Path(working_dir).resolve())):
                return "⛔ Path traversal detected — access denied"
        except Exception:
            return "⛔ Invalid path"

        try:
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content, encoding="utf-8")
            return f"✅ Written {len(content)} bytes to {path}"
        except Exception as e:
            return f"Error writing file: {e}"

    elif tool_name == "list_directory":
        path = tool_input.get("path", ".")
        full_path = Path(working_dir) / path

        try:
            resolved = full_path.resolve()
            if not str(resolved).startswith(str(Path(working_dir).resolve())):
                return "⛔ Path traversal detected — access denied"
        except Exception:
            return "⛔ Invalid path"

        if not full_path.exists():
            return f"Directory not found: {path}"

        try:
            entries = sorted(full_path.iterdir(), key=lambda p: (not p.is_dir(), p.name))
            lines = []
            for entry in entries[:200]:  # limit
                prefix = "📁 " if entry.is_dir() else "📄 "
                size = f" ({entry.stat().st_size:,}B)" if entry.is_file() else ""
                lines.append(f"{prefix}{entry.name}{size}")
            return "\n".join(lines) or "(empty directory)"
        except Exception as e:
            return f"Error listing directory: {e}"

    elif tool_name == "search_files":
        pattern = tool_input.get("pattern", "")
        path = tool_input.get("path", ".")
        include = tool_input.get("include", "")

        cmd = ["grep", "-rn", "--color=never"]
        if include:
            cmd.extend(["--include", include])
        cmd.extend([pattern, path])

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=working_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
            output = stdout.decode("utf-8", errors="replace")
            if len(output) > 50_000:
                output = output[:50_000] + "\n... [truncated]"
            return output.strip() or "(no matches)"
        except asyncio.TimeoutError:
            return "⏰ Search timed out"
        except Exception as e:
            return f"Error searching: {e}"

    else:
        return f"Unknown tool: {tool_name}"


# ─── Role-specific System Prompts ─────────────────────────────────────

ROLE_PROMPTS = {
    "lead": (
        "You are a Lead Developer. Analyze the task, break it down into subtasks, "
        "and create an implementation plan. Focus on architecture and coordination."
    ),
    "backend": (
        "You are a Backend Developer. Implement server-side logic, APIs, database models, "
        "and business logic. Write clean, tested, production-quality code."
    ),
    "frontend": (
        "You are a Frontend Developer. Implement UI components, styling, user interactions, "
        "and client-side logic. Follow modern best practices."
    ),
    "qa": (
        "You are a QA Engineer. Review code for bugs, write tests, run linters, "
        "and validate that implementations meet requirements."
    ),
    "docs": (
        "You are a Documentation Writer. Create and update documentation, README files, "
        "API docs, and inline code comments."
    ),
    "security": (
        "You are a Security Engineer. Review code for vulnerabilities, check dependencies, "
        "and ensure security best practices are followed."
    ),
}


def _build_system_prompt(role: str, working_dir: str) -> str:
    """Build a role-aware system prompt."""
    role_desc = ROLE_PROMPTS.get(role, ROLE_PROMPTS["backend"])
    return (
        f"{role_desc}\n\n"
        f"Your working directory is: {working_dir}\n"
        f"All file paths must be relative to this directory.\n"
        f"Use the provided tools (bash, read_file, write_file, list_directory, search_files) "
        f"to explore and modify the codebase.\n"
        f"After completing work, summarize what you did and the files changed."
    )


# ─── Main Adapter Class ──────────────────────────────────────────────

class AnthropicSDKAdapter:
    """
    Claude adapter using the Anthropic Python SDK for direct API calls.

    This bypasses the Claude CLI entirely and talks directly to the API.
    Tool calls (bash, file ops) are executed locally in the agent's worktree.
    """

    def __init__(self):
        self.model = settings.CLAUDE_MODEL
        self.max_tokens = settings.CLAUDE_MAX_TOKENS
        self._sessions: dict[int, dict] = {}
        self._running: dict[int, bool] = {}
        self._output_queues: dict[int, asyncio.Queue] = {}
        # Resolve auth token (OAuth from Keychain > env vars > API key)
        self._auth_token = get_auth_token()
        self._auth_source = get_auth_source()

    async def check_cli_available(self) -> bool:
        """Check if the Anthropic SDK is configured with a valid token."""
        if not self._auth_token:
            logger.warning(
                "❌ No auth token found — set CLAUDE_CODE_OAUTH_TOKEN, "
                "run `claude /login`, or set ANTHROPIC_API_KEY"
            )
            return False

        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=self._auth_token)
            logger.info(
                f"✅ Anthropic SDK ready (model={self.model}, "
                f"auth={self._auth_source})"
            )
            return True
        except ImportError:
            logger.warning("❌ anthropic package not installed")
            return False
        except Exception as e:
            logger.warning(f"❌ Anthropic SDK error: {e}")
            return False

    async def start_session(
        self,
        agent_id: int,
        working_dir: str,
        prompt: str,
        role: str = "backend",
        team_name: Optional[str] = None,
    ) -> None:
        """
        Start an SDK-based Claude session for an agent.

        Unlike the CLI adapter, this doesn't spawn a subprocess.
        Instead, it stores the session config and starts the conversation loop.
        """
        import anthropic

        system_prompt = _build_system_prompt(role, working_dir)

        self._sessions[agent_id] = {
            "working_dir": working_dir,
            "prompt": prompt,
            "role": role,
            "system_prompt": system_prompt,
            "messages": [{"role": "user", "content": prompt}],
        }
        self._running[agent_id] = True
        self._output_queues[agent_id] = asyncio.Queue()

        logger.info(
            f"🤖 Starting agent-{agent_id} via Anthropic SDK "
            f"(model={self.model}, role={role})"
        )

        # Start the conversation loop in background
        asyncio.create_task(self._run_conversation(agent_id))

    async def _run_conversation(self, agent_id: int) -> None:
        """Run the multi-turn conversation loop with tool execution."""
        import anthropic

        session = self._sessions.get(agent_id)
        if not session or not self._auth_token:
            return

        queue = self._output_queues[agent_id]
        client = anthropic.AsyncAnthropic(api_key=self._auth_token)

        max_turns = 50  # Safety limit
        turn = 0

        try:
            while self._running.get(agent_id) and turn < max_turns:
                turn += 1

                # Call Claude API
                response = await client.messages.create(
                    model=self.model,
                    max_tokens=self.max_tokens,
                    system=session["system_prompt"],
                    messages=session["messages"],
                    tools=TOOLS,
                )

                # Process response blocks
                assistant_content = []
                has_tool_use = False

                for block in response.content:
                    if block.type == "text":
                        await queue.put({
                            "type": "text",
                            "content": block.text,
                            "agent_id": agent_id,
                        })
                        assistant_content.append(block)

                    elif block.type == "tool_use":
                        has_tool_use = True
                        tool_name = block.name
                        tool_input = block.input

                        await queue.put({
                            "type": "tool_use",
                            "content": f"🔧 {tool_name}: {json.dumps(tool_input)[:200]}",
                            "agent_id": agent_id,
                            "raw": {"tool": tool_name, "input": tool_input},
                        })

                        # Execute the tool
                        result = await _execute_tool(
                            tool_name, tool_input, session["working_dir"]
                        )

                        await queue.put({
                            "type": "tool_result",
                            "content": result[:500],  # Truncate for display
                            "agent_id": agent_id,
                        })

                        assistant_content.append(block)

                        # Add tool result to messages
                        session["messages"].append({
                            "role": "assistant",
                            "content": [
                                {"type": b.type, "text": b.text}
                                if b.type == "text"
                                else {
                                    "type": "tool_use",
                                    "id": b.id,
                                    "name": b.name,
                                    "input": b.input,
                                }
                                for b in assistant_content
                            ],
                        })
                        session["messages"].append({
                            "role": "user",
                            "content": [
                                {
                                    "type": "tool_result",
                                    "tool_use_id": block.id,
                                    "content": result,
                                }
                            ],
                        })
                        # Reset for next tool call in this turn
                        assistant_content = []

                # If no tool use, conversation is done
                if not has_tool_use:
                    if assistant_content:
                        session["messages"].append({
                            "role": "assistant",
                            "content": [
                                {"type": b.type, "text": b.text}
                                if b.type == "text"
                                else {
                                    "type": "tool_use",
                                    "id": b.id,
                                    "name": b.name,
                                    "input": b.input,
                                }
                                for b in assistant_content
                            ],
                        })
                    break

                # Check stop_reason
                if response.stop_reason == "end_turn":
                    break

            # Signal completion
            await queue.put({
                "type": "complete",
                "content": f"Session completed after {turn} turns",
                "agent_id": agent_id,
            })

        except Exception as e:
            logger.error(f"SDK session error for agent-{agent_id}: {e}", exc_info=True)
            await queue.put({
                "type": "error",
                "content": str(e),
                "agent_id": agent_id,
            })

        finally:
            self._running[agent_id] = False

    async def stream_output(self, agent_id: int) -> AsyncGenerator[dict, None]:
        """
        Async generator yielding events from the SDK session.

        Yields dicts with: {type, content, agent_id}
        """
        queue = self._output_queues.get(agent_id)
        if not queue:
            return

        while self._running.get(agent_id, False) or not queue.empty():
            try:
                event = await asyncio.wait_for(queue.get(), timeout=1.0)
                yield event

                if event.get("type") in ("complete", "error"):
                    return

            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                return

    async def get_stderr(self, agent_id: int) -> str:
        """No stderr in SDK mode — return empty."""
        return ""

    async def stop_session(self, agent_id: int, timeout: float = 10.0) -> int:
        """Stop an SDK session."""
        self._running[agent_id] = False
        self._sessions.pop(agent_id, None)
        self._output_queues.pop(agent_id, None)
        logger.info(f"🛑 Agent-{agent_id} SDK session stopped")
        return 0

    async def stop_all(self) -> None:
        """Stop all SDK sessions."""
        agent_ids = list(self._sessions.keys())
        for agent_id in agent_ids:
            await self.stop_session(agent_id)
        logger.info(f"🛑 Stopped {len(agent_ids)} SDK sessions")

    def get_active_count(self) -> int:
        """Get count of active sessions."""
        return sum(1 for v in self._running.values() if v)

    def is_running(self, agent_id: int) -> bool:
        """Check if an agent session is still running."""
        return self._running.get(agent_id, False)
