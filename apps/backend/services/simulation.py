"""
Chibi Simulation Engine — Hybrid client/server movement.

When a browser tab is connected, the CLIENT drives walk animation locally
and periodically syncs positions here. When no clients are connected,
this engine ticks the simulation so chibis keep moving in the background.
"""

import asyncio
import logging
import math
import random
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ─── Navigation Graph (mirrors frontend GLOBAL_NAV_GRAPH) ────────────

NAV_GRAPH = [
    {"id": "z0_a", "x": -5, "z": -9, "edges": ["z0_b", "z0_door"]},
    {"id": "z0_b", "x": -3, "z": -10, "edges": ["z0_a", "z0_door"]},
    {"id": "z0_door", "x": -4, "z": -7.5, "edges": ["z0_a", "z0_b", "cor_w"]},
    {"id": "z1_a", "x": 5, "z": -9, "edges": ["z1_b", "z1_door"]},
    {"id": "z1_b", "x": 3, "z": -10, "edges": ["z1_a", "z1_door"]},
    {"id": "z1_door", "x": 4, "z": -7.5, "edges": ["z1_a", "z1_b", "cor_c"]},
    {"id": "cor_w", "x": -4, "z": -6, "edges": ["z0_door", "cor_c", "cor_sw"]},
    {"id": "cor_c", "x": 2, "z": -6, "edges": ["z1_door", "cor_w", "cor_e"]},
    {"id": "cor_e", "x": 7, "z": -6, "edges": ["cor_c", "bil_door"]},
    {"id": "bil_door", "x": 9, "z": -4, "edges": ["cor_e", "bil_a", "cafe_door"]},
    {"id": "bil_a", "x": 12, "z": -8, "edges": ["bil_door", "bil_b"]},
    {"id": "bil_b", "x": 14, "z": -6, "edges": ["bil_a"]},
    {"id": "cafe_door", "x": 11.8, "z": -4, "edges": ["bil_door", "cafe_a", "cafe_b"]},
    {"id": "cafe_a", "x": 11.5, "z": -1, "edges": ["cafe_door", "cafe_b"]},
    {"id": "cafe_b", "x": 13, "z": 3, "edges": ["cafe_a", "cafe_door"]},
    {"id": "cor_sw", "x": -4, "z": -2, "edges": ["cor_w", "cor_mid", "cor_nw"]},
    {"id": "cor_mid", "x": 2, "z": -2, "edges": ["cor_sw", "cor_e"]},
    {"id": "cor_nw", "x": -3, "z": 3, "edges": ["cor_sw", "lounge_a", "cor_ne"]},
    {"id": "cor_ne", "x": 4, "z": 3, "edges": ["cor_nw", "lounge_b"]},
    {"id": "lounge_a", "x": -2.5, "z": 7, "edges": ["cor_nw", "lounge_c"]},
    {"id": "lounge_b", "x": 2.5, "z": 7, "edges": ["cor_ne", "lounge_c"]},
    {"id": "lounge_c", "x": 0, "z": 6, "edges": ["lounge_a", "lounge_b"]},
]

# Build lookup
_NODE_MAP: dict[str, dict] = {n["id"]: n for n in NAV_GRAPH}


def _bfs_path(start_id: str, end_id: str) -> list[str] | None:
    """BFS shortest path through nav graph. Returns list of node IDs or None."""
    if start_id == end_id:
        return [start_id]
    visited = {start_id}
    queue: deque[list[str]] = deque([[start_id]])
    while queue:
        path = queue.popleft()
        current = path[-1]
        node = _NODE_MAP.get(current)
        if not node:
            continue
        for neighbor_id in node["edges"]:
            if neighbor_id in visited:
                continue
            new_path = path + [neighbor_id]
            if neighbor_id == end_id:
                return new_path
            visited.add(neighbor_id)
            queue.append(new_path)
    return None


def _nearest_node(x: float, z: float) -> str:
    """Find nearest graph node to position."""
    best_id = NAV_GRAPH[0]["id"]
    best_dist = float("inf")
    for node in NAV_GRAPH:
        d = math.hypot(node["x"] - x, node["z"] - z)
        if d < best_dist:
            best_dist = d
            best_id = node["id"]
    return best_id


# ─── Agent simulation state ──────────────────────────────────────────

@dataclass
class AgentSimState:
    agent_id: int
    x: float = 0.0
    z: float = 0.0
    facing_angle: float = 0.0
    is_walking: bool = False
    status: str = "idle"
    walk_speed: float = 0.4
    walk_timer: float = 2.0  # seconds until next walk
    walk_path: list[dict] = field(default_factory=list)  # [{x, z, node_id}]
    last_node_id: str | None = None

    def to_dict(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "x": round(self.x, 3),
            "z": round(self.z, 3),
            "facing_angle": round(self.facing_angle, 3),
            "is_walking": self.is_walking,
            "status": self.status,
        }


# ─── Simulation Engine ───────────────────────────────────────────────

class SimulationEngine:
    """
    Runs a background loop that moves agents along the nav graph.
    Broadcasts positions to connected WebSocket clients.
    """

    TICK_INTERVAL = 0.2  # 200ms (only when no clients)

    def __init__(self, ws_manager=None):
        self.ws_manager = ws_manager
        self.agents: dict[int, AgentSimState] = {}
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self._project_id: int | None = None

    def init_agents(self, agent_list: list[dict], project_id: int):
        """
        Initialize simulation for a set of agents.
        agent_list: [{"id": int, "role": str, ...}]
        """
        self._project_id = project_id
        self.agents.clear()

        # Spread agents across starting nodes
        start_nodes = ["z0_a", "z0_b", "z1_a", "z1_b", "cor_w", "cor_c",
                        "lounge_a", "lounge_b", "cor_sw", "cor_mid"]

        for i, agent_data in enumerate(agent_list):
            node_id = start_nodes[i % len(start_nodes)]
            node = _NODE_MAP[node_id]
            state = AgentSimState(
                agent_id=agent_data["id"],
                x=node["x"] + random.uniform(-0.5, 0.5),
                z=node["z"] + random.uniform(-0.5, 0.5),
                walk_speed=0.35 + random.uniform(0, 0.15),
                walk_timer=1.0 + random.uniform(0, 3.0),
                last_node_id=node_id,
                status=agent_data.get("status", "idle"),
            )
            self.agents[agent_data["id"]] = state

        logger.info(f"🎮 Simulation initialized with {len(self.agents)} agents for project {project_id}")

    def clear(self):
        """Remove all agents from simulation."""
        self.agents.clear()
        self._project_id = None

    def update_agent_status(self, agent_id: int, status: str):
        """Update an agent's status (affects walk behavior)."""
        if agent_id in self.agents:
            self.agents[agent_id].status = status

    def get_all_positions(self) -> dict[int, dict]:
        """Get current positions of all agents."""
        return {aid: state.to_dict() for aid, state in self.agents.items()}

    def receive_client_sync(self, positions: dict):
        """
        Accept position updates from a connected client.
        Called when the client sends a 'positions.sync' WebSocket message.
        """
        for agent_id_str, pos in positions.items():
            agent_id = int(agent_id_str) if isinstance(agent_id_str, str) else agent_id_str
            if agent_id in self.agents:
                state = self.agents[agent_id]
                state.x = pos.get("x", state.x)
                state.z = pos.get("z", state.z)
                state.facing_angle = pos.get("facing_angle", state.facing_angle)
                state.is_walking = pos.get("is_walking", state.is_walking)
                # Update last_node_id so server can resume pathfinding correctly
                state.last_node_id = _nearest_node(state.x, state.z)

    @property
    def has_active_clients(self) -> bool:
        """Check if any WebSocket clients are connected for this project."""
        if not self.ws_manager or not self._project_id:
            return False
        return self.ws_manager.get_connection_count(self._project_id) > 0

    # ── Tick: move agents ────────────────────────────────────────────

    def _tick(self, delta: float):
        """Advance simulation by delta seconds."""
        for state in self.agents.values():
            # Only walk if idle/done — working/blocked agents stay at desk
            if state.status in ("in_progress", "review", "blocked", "failed"):
                state.is_walking = False
                continue

            self._tick_agent(state, delta)

    def _tick_agent(self, state: AgentSimState, delta: float):
        """Tick a single agent's movement."""

        # No path → count down timer then pick new destination
        if not state.is_walking and len(state.walk_path) == 0:
            state.walk_timer -= delta
            if state.walk_timer <= 0:
                self._pick_new_destination(state)
            return

        # Walk along path
        if state.is_walking and len(state.walk_path) > 0:
            target = state.walk_path[0]
            dx = target["x"] - state.x
            dz = target["z"] - state.z
            dist = math.hypot(dx, dz)

            if dist > 0.15:
                step = min(state.walk_speed * delta, dist)
                state.x += (dx / dist) * step
                state.z += (dz / dist) * step
                state.facing_angle = math.atan2(dx, dz)
            else:
                # Reached waypoint
                state.walk_path.pop(0)
                if len(state.walk_path) == 0:
                    # Reached final destination — pause
                    state.is_walking = False
                    state.walk_timer = 3.0 + random.uniform(0, 4.0)

    def _pick_new_destination(self, state: AgentSimState):
        """Pick a random destination on the nav graph via BFS."""
        nearest = _nearest_node(state.x, state.z)

        # Pick random destination (prefer distant ones)
        candidates = [n for n in NAV_GRAPH if n["id"] != nearest and n["id"] != state.last_node_id]
        if not candidates:
            state.walk_timer = 1.0
            return

        # Weight toward distant nodes
        weights = []
        for n in candidates:
            w = math.hypot(n["x"] - state.x, n["z"] - state.z)
            weights.append(w)
        total = sum(weights)
        roll = random.uniform(0, total)
        dest = candidates[0]
        for c, w in zip(candidates, weights):
            roll -= w
            if roll <= 0:
                dest = c
                break

        path = _bfs_path(nearest, dest["id"])
        if path and len(path) > 1:
            # Convert to position waypoints (skip first — we're already there)
            state.walk_path = [
                {"x": _NODE_MAP[nid]["x"], "z": _NODE_MAP[nid]["z"], "node_id": nid}
                for nid in path[1:]
            ]
            state.is_walking = True
            state.last_node_id = dest["id"]
        else:
            state.walk_timer = 1.0

    # ── Background loop ──────────────────────────────────────────────

    async def start(self):
        """Start the simulation background loop."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("🎮 Simulation loop started")

    async def stop(self):
        """Stop the simulation background loop."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("🎮 Simulation loop stopped")

    async def _loop(self):
        """Main simulation loop — only ticks when NO clients are connected."""
        last_time = time.monotonic()

        while self._running:
            try:
                await asyncio.sleep(self.TICK_INTERVAL)
                now = time.monotonic()
                delta = now - last_time
                last_time = now

                if not self.agents:
                    continue

                # Skip simulation when a browser tab is driving the animation
                if self.has_active_clients:
                    continue

                # No clients connected — server drives the simulation
                self._tick(delta)

            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Simulation loop error")
                await asyncio.sleep(1)
