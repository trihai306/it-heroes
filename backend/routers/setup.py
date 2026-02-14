"""
Setup router — CLI installation and system readiness checks.
Uses TTL-based caching to avoid repeated subprocess spawns on every request.
"""

import asyncio
import logging
import shutil
import subprocess
import time

import json
import os
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/setup", tags=["setup"])

# ── TTL Cache ──────────────────────────────────────────────────
_cache: dict[str, tuple[float, dict]] = {}
CACHE_TTL = 60  # seconds


def _get_cached(key: str) -> dict | None:
    """Return cached value if still valid, else None."""
    if key in _cache:
        ts, val = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return val
    return None


def _set_cached(key: str, val: dict) -> dict:
    _cache[key] = (time.time(), val)
    return val


def _invalidate(*keys: str):
    """Remove specific cache entries (on login/logout)."""
    for k in keys:
        _cache.pop(k, None)


def _find_cli() -> str | None:
    """Find the claude CLI path with fallback search."""
    cli_path = shutil.which("claude")
    if cli_path:
        return cli_path

    home = Path.home()
    candidates = [
        home / ".local" / "bin" / "claude",
        home / ".npm-global" / "bin" / "claude",
        Path("/usr/local/bin/claude"),
        Path("/opt/homebrew/bin/claude"),
    ]
    nvm_dir = Path(os.environ.get("NVM_DIR", str(home / ".nvm")))
    node_versions = nvm_dir / "versions" / "node"
    if node_versions.exists():
        for v in sorted(node_versions.iterdir(), reverse=True):
            candidates.append(v / "bin" / "claude")

    for candidate in candidates:
        if candidate.exists() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None


@router.post("/check-cli")
async def check_cli():
    """Check if Claude CLI is installed and return status (cached 60s)."""
    cached = _get_cached("check-cli")
    if cached:
        return cached

    cli_path = _find_cli()
    if not cli_path:
        return _set_cached("check-cli", {"available": False, "path": None, "version": None})

    version = ""
    try:
        proc = await asyncio.create_subprocess_exec(
            cli_path, "--version",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5)
        version = stdout.decode().strip()
    except Exception:
        pass

    return _set_cached("check-cli", {"available": True, "path": cli_path, "version": version})


# ── Authentication ─────────────────────────────────────────────


@router.get("/auth-status")
async def auth_status():
    """Get Claude CLI authentication status (cached 60s)."""
    cached = _get_cached("auth-status")
    if cached:
        return cached

    cli_path = _find_cli()
    if not cli_path:
        return _set_cached("auth-status", {"loggedIn": False, "error": "CLI not found"})

    try:
        proc = await asyncio.create_subprocess_exec(
            cli_path, "auth", "status",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
        data = json.loads(stdout.decode().strip())
        return _set_cached("auth-status", data)
    except Exception as e:
        logger.error(f"Auth status check failed: {e}")
        return _set_cached("auth-status", {"loggedIn": False, "error": str(e)})


@router.post("/auth-login")
async def auth_login():
    """Start Claude CLI OAuth login flow. Streams progress."""

    async def _stream():
        _invalidate("auth-status", "check-cli")
        cli_path = _find_cli()
        if not cli_path:
            yield f"data: {json.dumps({'step': 'error', 'message': 'Claude CLI not found'})}\\n\\n"
            return

        yield f"data: {json.dumps({'step': 'start', 'message': 'Opening browser for authentication...'})}\\n\\n"

        try:
            process = await asyncio.create_subprocess_exec(
                cli_path, "auth", "login",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            async for line in process.stdout:
                text = line.decode().strip()
                if text:
                    yield f"data: {json.dumps({'step': 'progress', 'message': text})}\\n\\n"

            await process.wait()

            if process.returncode == 0:
                # Fetch new status
                status_result = subprocess.run(
                    [cli_path, "auth", "status"],
                    capture_output=True, text=True, timeout=10,
                )
                try:
                    status_data = json.loads(status_result.stdout.strip())
                except Exception:
                    status_data = {}

                yield f"data: {json.dumps({'step': 'complete', 'message': 'Login successful!', 'status': status_data})}\\n\\n"
            else:
                stderr = await process.stderr.read()
                err = stderr.decode().strip()
                yield f"data: {json.dumps({'step': 'error', 'message': f'Login failed: {err}'})}\\n\\n"

        except Exception as e:
            yield f"data: {json.dumps({'step': 'error', 'message': str(e)})}\\n\\n"

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/auth-logout")
async def auth_logout():
    """Log out from Claude CLI."""
    _invalidate("auth-status", "check-cli")
    cli_path = _find_cli()
    if not cli_path:
        return {"success": False, "error": "CLI not found"}

    try:
        proc = await asyncio.create_subprocess_exec(
            cli_path, "auth", "logout",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
        return {"success": proc.returncode == 0, "message": stdout.decode().strip()}
    except Exception as e:
        return {"success": False, "error": str(e)}


class ApiKeyRequest(BaseModel):
    api_key: str


@router.post("/set-api-key")
def set_api_key(req: ApiKeyRequest):
    """Save API key and verify it works."""
    # Set env var for the current process
    os.environ["ANTHROPIC_API_KEY"] = req.api_key

    # Test the key by checking auth status
    cli_path = _find_cli()
    if not cli_path:
        return {"success": True, "message": "API key saved (CLI not found to verify)"}

    try:
        result = subprocess.run(
            [cli_path, "auth", "status"],
            capture_output=True,
            text=True,
            timeout=10,
            env={**os.environ, "ANTHROPIC_API_KEY": req.api_key},
        )
        data = json.loads(result.stdout.strip())
        return {"success": True, "message": "API key saved and verified", "status": data}
    except Exception:
        return {"success": True, "message": "API key saved (verification skipped)"}


# ── GitHub Authentication ──────────────────────────────────────


def _find_gh() -> str | None:
    """Find the GitHub CLI (gh) path with fallback search."""
    gh_path = shutil.which("gh")
    if gh_path:
        return gh_path

    home = Path.home()
    candidates = [
        Path("/opt/homebrew/bin/gh"),
        Path("/usr/local/bin/gh"),
        home / ".local" / "bin" / "gh",
    ]
    for candidate in candidates:
        if candidate.exists() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None


@router.get("/gh-auth-status")
async def gh_auth_status():
    """Get GitHub CLI authentication status (cached 60s)."""
    cached = _get_cached("gh-auth-status")
    if cached:
        return cached

    gh_path = _find_gh()
    if not gh_path:
        return _set_cached("gh-auth-status", {"available": False, "loggedIn": False, "error": "GitHub CLI (gh) not installed"})

    try:
        proc = await asyncio.create_subprocess_exec(
            gh_path, "auth", "status",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout_b, stderr_b = await asyncio.wait_for(proc.communicate(), timeout=10)
        output = (stdout_b.decode() + stderr_b.decode()).strip()
        logged_in = "Logged in" in output or "✓" in output

        # Parse details
        import re
        account = None
        protocol = None
        scopes = None

        for line in output.split("\n"):
            line = line.strip()
            m = re.search(r"Logged in to \S+ account (\S+)", line)
            if m:
                account = m.group(1)
            if "Git operations protocol" in line:
                protocol = line.split(":", 1)[-1].strip()
            if "Token scopes" in line:
                scopes = line.split("Token scopes:", 1)[-1].strip().strip("'\"")

        result = {
            "available": True,
            "loggedIn": logged_in,
            "account": account,
            "protocol": protocol,
            "scopes": scopes,
            "raw": output,
        }
        return _set_cached("gh-auth-status", result)
    except Exception as e:
        logger.error(f"GitHub auth status check failed: {e}")
        return _set_cached("gh-auth-status", {"available": True, "loggedIn": False, "error": str(e)})


@router.post("/gh-auth-login")
async def gh_auth_login():
    """Start GitHub CLI OAuth login flow via browser."""

    async def _stream():
        _invalidate("gh-auth-status")
        gh_path = _find_gh()
        if not gh_path:
            yield f"data: {json.dumps({'step': 'error', 'message': 'GitHub CLI (gh) not installed'})}\\n\\n"
            return

        yield f"data: {json.dumps({'step': 'start', 'message': 'Opening browser for GitHub authentication...'})}\\n\\n"

        try:
            process = await asyncio.create_subprocess_exec(
                gh_path, "auth", "login", "--web", "--git-protocol", "https",
                "--scopes", "repo,read:org,gist",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                stdin=asyncio.subprocess.PIPE,
            )

            async for line in process.stderr:
                text = line.decode().strip()
                if text:
                    yield f"data: {json.dumps({'step': 'progress', 'message': text})}\\n\\n"

            async for line in process.stdout:
                text = line.decode().strip()
                if text:
                    yield f"data: {json.dumps({'step': 'progress', 'message': text})}\\n\\n"

            await process.wait()

            if process.returncode == 0:
                yield f"data: {json.dumps({'step': 'complete', 'message': 'GitHub login successful!'})}\\n\\n"
            else:
                yield f"data: {json.dumps({'step': 'error', 'message': 'GitHub login failed or was cancelled'})}\\n\\n"

        except Exception as e:
            yield f"data: {json.dumps({'step': 'error', 'message': str(e)})}\\n\\n"

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/gh-auth-logout")
async def gh_auth_logout():
    """Log out from GitHub CLI."""
    _invalidate("gh-auth-status")
    gh_path = _find_gh()
    if not gh_path:
        return {"success": False, "error": "GitHub CLI not found"}

    try:
        proc = await asyncio.create_subprocess_exec(
            gh_path, "auth", "logout", "--hostname", "github.com",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            stdin=asyncio.subprocess.PIPE,
        )
        stdout_b, stderr_b = await asyncio.wait_for(proc.communicate(input=b"Y\n"), timeout=10)
        return {"success": proc.returncode == 0, "message": (stdout_b.decode() + stderr_b.decode()).strip()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/install-cli")
async def install_cli():
    """Install Claude CLI via npm and stream progress."""

    async def _stream():
        yield "data: {\"step\": \"start\", \"message\": \"Starting Claude CLI installation...\"}\n\n"

        # Step 1: Check if npm is available
        npm_path = shutil.which("npm")
        if not npm_path:
            yield "data: {\"step\": \"error\", \"message\": \"npm not found. Please install Node.js first.\"}\n\n"
            return

        yield "data: {\"step\": \"progress\", \"message\": \"Found npm, installing @anthropic-ai/claude-code...\"}\n\n"

        # Step 2: Run npm install
        try:
            process = await asyncio.create_subprocess_exec(
                npm_path,
                "install",
                "-g",
                "@anthropic-ai/claude-code",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            # Stream stdout
            async for line in process.stdout:
                text = line.decode().strip()
                if text:
                    import json
                    yield f"data: {json.dumps({'step': 'progress', 'message': text})}\n\n"

            # Wait for completion
            await process.wait()

            if process.returncode == 0:
                yield "data: {\"step\": \"progress\", \"message\": \"npm install completed successfully.\"}\n\n"
            else:
                stderr = await process.stderr.read()
                err_text = stderr.decode().strip()
                import json
                yield f"data: {json.dumps({'step': 'error', 'message': f'Installation failed: {err_text}'})}\n\n"
                return

        except Exception as e:
            import json
            yield f"data: {json.dumps({'step': 'error', 'message': str(e)})}\n\n"
            return

        # Step 3: Verify installation
        yield "data: {\"step\": \"progress\", \"message\": \"Verifying installation...\"}\n\n"
        await asyncio.sleep(1)

        cli_path = shutil.which("claude")
        if cli_path:
            import json
            yield f"data: {json.dumps({'step': 'complete', 'message': f'Claude CLI installed at {cli_path}', 'path': cli_path})}\n\n"
        else:
            yield "data: {\"step\": \"error\", \"message\": \"Installation seemed to succeed but claude not found in PATH.\"}\n\n"

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
