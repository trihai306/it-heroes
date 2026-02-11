"""
System health & dependency checks.
"""

import asyncio
import shutil
import sys
import logging
from pathlib import Path

from fastapi import APIRouter

from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/system", tags=["system"])


async def _check_command(name: str, cmd: str, version_flag: str = "--version") -> dict:
    """Check if a CLI command exists and get its version."""
    path = shutil.which(cmd)
    if not path:
        return {"name": name, "installed": False, "version": None, "path": None}

    try:
        proc = await asyncio.create_subprocess_exec(
            path, version_flag,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=5)
        version_str = (stdout or stderr).decode("utf-8", errors="replace").strip()
        # Extract version number from output
        version = version_str.split("\n")[0].strip()
        return {"name": name, "installed": True, "version": version, "path": path}
    except Exception as e:
        logger.warning(f"Version check failed for {name}: {e}")
        return {"name": name, "installed": True, "version": "unknown", "path": path}


@router.get("/health")
async def system_health():
    """Check system dependencies and return their status."""

    deps = []

    # 1. Claude CLI
    claude_info = await _check_command("Claude CLI", settings.CLAUDE_CLI)
    claude_info["required"] = True
    claude_info["description"] = "AI agent orchestration"
    claude_info["install_cmd"] = "npm install -g @anthropic-ai/claude-code"
    claude_info["icon"] = "🤖"
    deps.append(claude_info)

    # 2. Git
    git_info = await _check_command("Git", "git")
    git_info["required"] = True
    git_info["description"] = "Version control"
    git_info["install_cmd"] = "brew install git"
    git_info["icon"] = "📦"
    deps.append(git_info)

    # 3. Node.js
    node_info = await _check_command("Node.js", "node", "-v")
    node_info["required"] = False
    node_info["description"] = "JavaScript runtime"
    node_info["install_cmd"] = "brew install node"
    node_info["icon"] = "💚"
    deps.append(node_info)

    # 4. Python
    py_info = {
        "name": "Python",
        "installed": True,
        "version": f"Python {sys.version.split()[0]}",
        "path": sys.executable,
        "required": True,
        "description": "Backend runtime",
        "install_cmd": "brew install python",
        "icon": "🐍",
    }
    deps.append(py_info)

    # 5. Anthropic API Key
    has_key = bool(settings.ANTHROPIC_API_KEY)
    key_info = {
        "name": "API Key",
        "installed": has_key,
        "version": "Configured" if has_key else None,
        "path": None,
        "required": True,
        "description": "Anthropic API access",
        "install_cmd": "export ANTHROPIC_API_KEY=sk-ant-...",
        "icon": "🔑",
    }
    deps.append(key_info)

    all_ok = all(d["installed"] for d in deps if d.get("required"))

    return {
        "dependencies": deps,
        "all_ok": all_ok,
        "python_version": sys.version.split()[0],
        "app_version": settings.APP_VERSION,
    }
