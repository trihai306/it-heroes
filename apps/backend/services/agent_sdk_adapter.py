"""Claude Agent SDK Adapter — uses the official claude-agent-sdk package.

This adapter wraps Claude Code CLI via the Python Agent SDK, providing:
- Full Claude Code tool suite (Bash, Read, Write, Edit, Glob, Grep, etc.)
- PreToolUse hooks for security validation
- Streaming messages (AssistantMessage, ToolUseBlock, ToolResultBlock)
- Session continuity via resume
- Sandbox support

Requires: pip install claude-agent-sdk
Requires: Claude Code CLI installed (npm install -g @anthropic-ai/claude-code)
"""

import asyncio
import logging
from typing import AsyncGenerator, Optional

from config import settings

logger = logging.getLogger(__name__)

# ─── Role-specific system prompts ────────────────────────────────────

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

# ─── Bash security hook ──────────────────────────────────────────────

BLOCKED_COMMANDS = {
    "rm -rf /", "rm -rf /*", "mkfs", "dd if=",
    ":(){:|:&};:", "chmod -R 777 /",
    "curl | sh", "wget | sh", "curl | bash", "wget | bash",
}


async def _bash_security_hook(input_data, tool_use_id, context):
    """PreToolUse hook: validate bash commands before execution."""
    tool_input = input_data.get("tool_input", {})
    command = tool_input.get("command", "")
    cmd_lower = command.strip().lower()

    for blocked in BLOCKED_COMMANDS:
        if blocked in cmd_lower:
            logger.warning(f"Blocked dangerous command: {command[:100]}")
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"Command blocked for safety: {blocked}",
                }
            }
    return {}


# ─── Main Adapter Class ─────────────────────────────────────────────

class ClaudeAgentSDKAdapter:
    """
    Claude adapter using the official claude-agent-sdk package.

    Uses query() from claude-agent-sdk to run Claude Code sessions.
    Provides full Claude Code tool suite + hooks + sandbox.
    """

    def __init__(self):
        self.model = settings.CLAUDE_MODEL
        self._running: dict[int, bool] = {}
        self._output_queues: dict[int, asyncio.Queue] = {}
        self._conversation_tasks: dict[int, asyncio.Task] = {}
        self._session_ids: dict[int, Optional[str]] = {}  # agent_id -> SDK session_id

    async def check_cli_available(self) -> bool:
        """Check if claude-agent-sdk and Claude Code CLI are available."""
        try:
            from claude_agent_sdk import query  # noqa: F401
            logger.info("claude-agent-sdk package found")
        except ImportError:
            logger.warning(
                "claude-agent-sdk not installed. "
                "Install with: pip install claude-agent-sdk"
            )
            return False

        # Check CLI binary
        proc = await asyncio.create_subprocess_exec(
            settings.CLAUDE_CLI, "--version",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
            if proc.returncode == 0:
                version = stdout.decode().strip()
                logger.info(f"Claude Code CLI found: {version}")
                return True
            else:
                logger.warning("Claude Code CLI returned non-zero exit code")
                return False
        except (FileNotFoundError, asyncio.TimeoutError):
            logger.warning(f"Claude Code CLI not found at: {settings.CLAUDE_CLI}")
            return False

    def _build_options(self, working_dir: str, role: str):
        """Build ClaudeAgentOptions for an agent session."""
        from claude_agent_sdk import ClaudeAgentOptions, HookMatcher

        role_desc = ROLE_PROMPTS.get(role, ROLE_PROMPTS["backend"])
        system_prompt = (
            f"{role_desc}\n\n"
            f"Your working directory is: {working_dir}\n"
            f"After completing work, summarize what you did and the files changed."
        )

        allowed_tools = settings.AGENT_SDK_ALLOWED_TOOLS
        max_turns = settings.AGENT_SDK_MAX_TURNS

        opts = ClaudeAgentOptions(
            model=self.model,
            system_prompt=system_prompt,
            allowed_tools=allowed_tools,
            permission_mode="acceptEdits",
            cwd=working_dir,
            max_turns=max_turns,
            hooks={
                "PreToolUse": [
                    HookMatcher(
                        matcher="Bash",
                        hooks=[_bash_security_hook],
                    ),
                ],
            },
        )

        # Enable sandbox if configured
        if settings.AGENT_SDK_SANDBOX:
            opts.sandbox = {
                "enabled": True,
                "autoAllowBashIfSandboxed": True,
            }

        return opts

    async def start_session(
        self,
        agent_id: int,
        working_dir: str,
        prompt: str,
        role: str = "backend",
        team_name: Optional[str] = None,
    ) -> None:
        """
        Start a Claude Agent SDK session for an agent.

        Builds options and starts a query() in a background task,
        streaming responses to the output queue.
        """
        options = self._build_options(working_dir, role)

        self._running[agent_id] = True
        self._output_queues[agent_id] = asyncio.Queue()

        logger.info(
            f"Starting agent-{agent_id} via Agent SDK "
            f"(model={self.model}, role={role}, cwd={working_dir})"
        )

        # Run conversation in background task
        task = asyncio.create_task(self._run_conversation(agent_id, options, prompt))
        self._conversation_tasks[agent_id] = task

    async def _run_conversation(
        self,
        agent_id: int,
        options,
        prompt: str,
    ) -> None:
        """Run the Agent SDK conversation loop using query()."""
        from claude_agent_sdk import (
            query,
            AssistantMessage,
            ResultMessage,
            SystemMessage,
            TextBlock,
            ToolUseBlock,
            ToolResultBlock,
        )

        queue = self._output_queues[agent_id]

        try:
            async for message in query(prompt=prompt, options=options):
                if not self._running.get(agent_id, False):
                    break

                if isinstance(message, SystemMessage):
                    # Capture session_id from init message
                    sid = getattr(message, "session_id", None)
                    if sid:
                        self._session_ids[agent_id] = sid
                    await queue.put({
                        "type": "system",
                        "content": f"[{getattr(message, 'subtype', '')}]",
                        "agent_id": agent_id,
                    })

                elif isinstance(message, AssistantMessage):
                    for block in message.content:
                        if isinstance(block, TextBlock):
                            await queue.put({
                                "type": "text",
                                "content": block.text,
                                "agent_id": agent_id,
                            })
                        elif isinstance(block, ToolUseBlock):
                            await queue.put({
                                "type": "tool_use",
                                "content": f"[{block.name}] {_summarize_input(block.name, block.input)}",
                                "agent_id": agent_id,
                                "raw": {
                                    "tool": block.name,
                                    "tool_id": block.id,
                                    "input": block.input,
                                },
                            })
                        elif isinstance(block, ToolResultBlock):
                            content = block.content
                            if isinstance(content, list):
                                content = " ".join(
                                    b.get("text", "") for b in content
                                    if isinstance(b, dict)
                                )
                            await queue.put({
                                "type": "tool_result",
                                "content": str(content)[:500] if content else "",
                                "agent_id": agent_id,
                                "is_error": getattr(block, "is_error", False),
                            })

                elif isinstance(message, ResultMessage):
                    # Store session_id for potential resume
                    sid = getattr(message, "session_id", None)
                    if sid:
                        self._session_ids[agent_id] = sid

                    await queue.put({
                        "type": "complete",
                        "content": (
                            f"Session completed: {getattr(message, 'num_turns', '?')} turns, "
                            f"{getattr(message, 'duration_ms', '?')}ms"
                        ),
                        "agent_id": agent_id,
                        "raw": {
                            "num_turns": getattr(message, "num_turns", None),
                            "duration_ms": getattr(message, "duration_ms", None),
                            "is_error": getattr(message, "is_error", False),
                            "session_id": sid,
                            "total_cost_usd": getattr(message, "total_cost_usd", None),
                            "result": getattr(message, "result", None),
                        },
                    })
                    break

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Agent SDK session error for agent-{agent_id}: {e}", exc_info=True)
            await queue.put({
                "type": "error",
                "content": str(e),
                "agent_id": agent_id,
            })
        finally:
            self._running[agent_id] = False

    async def stream_output(self, agent_id: int) -> AsyncGenerator[dict, None]:
        """
        Async generator yielding events from the Agent SDK session.

        Yields dicts with: {type, content, agent_id, [raw], [is_error]}
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
        """No separate stderr in Agent SDK mode."""
        return ""

    async def stop_session(self, agent_id: int, timeout: float = 10.0) -> int:
        """Stop an Agent SDK session by cancelling the conversation task."""
        self._running[agent_id] = False

        # Cancel the conversation task (which cancels the query)
        task = self._conversation_tasks.pop(agent_id, None)
        if task and not task.done():
            task.cancel()
            try:
                await asyncio.wait_for(task, timeout=timeout)
            except (asyncio.CancelledError, asyncio.TimeoutError):
                pass

        self._output_queues.pop(agent_id, None)
        self._session_ids.pop(agent_id, None)

        logger.info(f"Agent-{agent_id} Agent SDK session stopped")
        return 0

    async def stop_all(self) -> None:
        """Stop all Agent SDK sessions."""
        agent_ids = list(self._conversation_tasks.keys())
        for agent_id in agent_ids:
            await self.stop_session(agent_id)
        logger.info(f"Stopped {len(agent_ids)} Agent SDK sessions")

    def get_active_count(self) -> int:
        """Get count of active sessions."""
        return sum(1 for v in self._running.values() if v)

    def is_running(self, agent_id: int) -> bool:
        """Check if an agent session is still running."""
        return self._running.get(agent_id, False)


def _summarize_input(tool_name: str, tool_input: dict) -> str:
    """Create a short summary of tool input for logging."""
    if tool_name == "Bash":
        cmd = tool_input.get("command", "")
        return cmd[:120] if cmd else "(empty)"
    elif tool_name in ("Read", "Write", "Edit"):
        return tool_input.get("file_path", "")[:120]
    elif tool_name == "Glob":
        return tool_input.get("pattern", "")[:80]
    elif tool_name == "Grep":
        return f"{tool_input.get('pattern', '')} in {tool_input.get('path', '.')}"[:120]
    else:
        import json
        return json.dumps(tool_input)[:120]
