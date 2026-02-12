"""
Nav Graph Generator — auto-generates walkable navigation graph from office layout.

Given placed objects, zones, and walls on a grid, produces a set of
connected nav nodes that the SimulationEngine can use for BFS pathfinding.
"""

import math

# Object types that block walking (must match frontend objectCatalog.js)
BLOCKS_WALK = {
    "bookshelf", "server_rack", "billiards_table",
    "glass_wall", "room_divider",
}

# Object types where agents can sit (desk approach nodes)
AGENT_SLOTS = {"desk", "computer_desk"}

SAMPLE_INTERVAL = 3   # place a nav node every N cells
MAX_EDGE_DIST = 5      # max cell distance for line-of-sight edges


def generate_nav_graph(
    objects: list[dict],
    zones: list[dict],
    walls: list[dict],
    grid_width: int,
    grid_height: int,
    cell_size: float,
) -> list[dict]:
    """
    Generate a walkable navigation graph from office layout data.

    Returns list of nav nodes:
        [{"id": str, "x": float, "z": float, "edges": [str]}]
    """
    # Step 1: Build occupancy grid
    occupied = [[False] * grid_height for _ in range(grid_width)]
    desk_positions = []

    for obj in objects:
        obj_type = obj.get("type", "")
        gx, gy = obj.get("gridX", 0), obj.get("gridY", 0)
        w = obj.get("width", 1)
        h = obj.get("height", 1)

        # Mark cells as occupied for blocking objects
        if obj_type in BLOCKS_WALK:
            for dx in range(w):
                for dy in range(h):
                    cx, cy = gx + dx, gy + dy
                    if 0 <= cx < grid_width and 0 <= cy < grid_height:
                        occupied[cx][cy] = True

        # Track desk positions for approach nodes
        if obj_type in AGENT_SLOTS:
            desk_positions.append((gx, gy, w, h, obj.get("rotation", 0)))

    # Rasterize walls
    for wall in walls:
        _rasterize_wall(occupied, wall, grid_width, grid_height)

    # Step 2: Sample nav nodes in walkable space
    nodes = []
    node_id_counter = 0

    for x in range(0, grid_width, SAMPLE_INTERVAL):
        for y in range(0, grid_height, SAMPLE_INTERVAL):
            if not occupied[x][y]:
                wx, wz = _grid_to_world(x, y, grid_width, grid_height, cell_size)
                nodes.append({
                    "id": f"nav_{node_id_counter:03d}",
                    "x": round(wx, 2),
                    "z": round(wz, 2),
                    "_gx": x,
                    "_gy": y,
                    "edges": [],
                })
                node_id_counter += 1

    # Step 3: Add desk approach nodes
    for gx, gy, w, h, rot in desk_positions:
        ax, ay = _desk_approach_cell(gx, gy, w, h, rot)
        if 0 <= ax < grid_width and 0 <= ay < grid_height and not occupied[ax][ay]:
            wx, wz = _grid_to_world(ax, ay, grid_width, grid_height, cell_size)
            nodes.append({
                "id": f"desk_{node_id_counter:03d}",
                "x": round(wx, 2),
                "z": round(wz, 2),
                "_gx": ax,
                "_gy": ay,
                "edges": [],
            })
            node_id_counter += 1

    # Step 4: Connect nodes via line-of-sight
    max_grid_dist = MAX_EDGE_DIST
    for i, a in enumerate(nodes):
        for j in range(i + 1, len(nodes)):
            b = nodes[j]
            gdist = math.hypot(a["_gx"] - b["_gx"], a["_gy"] - b["_gy"])
            if gdist > max_grid_dist:
                continue
            if _line_of_sight(occupied, a["_gx"], a["_gy"], b["_gx"], b["_gy"]):
                a["edges"].append(b["id"])
                b["edges"].append(a["id"])

    # Clean up internal grid coords
    for node in nodes:
        node.pop("_gx", None)
        node.pop("_gy", None)

    # Remove isolated nodes (no edges)
    nodes = [n for n in nodes if len(n["edges"]) > 0]

    return nodes


# ─── Helpers ──────────────────────────────────────────────────────────────


def _grid_to_world(
    gx: int, gy: int,
    grid_width: int, grid_height: int,
    cell_size: float,
) -> tuple[float, float]:
    """Convert grid cell to world (x, z) centered at origin."""
    world_x = (gx - grid_width / 2) * cell_size + cell_size / 2
    world_z = (gy - grid_height / 2) * cell_size + cell_size / 2
    return world_x, world_z


def _desk_approach_cell(
    gx: int, gy: int, w: int, h: int, rotation: int,
) -> tuple[int, int]:
    """Find the cell in front of a desk where an agent would sit."""
    rot = rotation % 360
    if rot == 0:
        return gx + w // 2, gy + h  # below
    elif rot == 90:
        return gx - 1, gy + h // 2  # left
    elif rot == 180:
        return gx + w // 2, gy - 1  # above
    elif rot == 270:
        return gx + w, gy + h // 2  # right
    return gx + w // 2, gy + h


def _rasterize_wall(
    occupied: list[list[bool]],
    wall: dict,
    grid_width: int,
    grid_height: int,
):
    """Mark grid cells along a wall segment as occupied using Bresenham."""
    x0, y0 = int(wall.get("fromX", 0)), int(wall.get("fromY", 0))
    x1, y1 = int(wall.get("toX", 0)), int(wall.get("toY", 0))

    # Skip door position cells if wall has a door
    has_door = wall.get("hasDoor", False)
    door_pos = wall.get("doorPosition", 0.5)

    points = _bresenham(x0, y0, x1, y1)
    door_idx = int(len(points) * door_pos) if has_door else -1

    for i, (px, py) in enumerate(points):
        if has_door and abs(i - door_idx) <= 1:
            continue  # leave door opening
        if 0 <= px < grid_width and 0 <= py < grid_height:
            occupied[px][py] = True


def _bresenham(x0: int, y0: int, x1: int, y1: int) -> list[tuple[int, int]]:
    """Bresenham's line algorithm — returns list of (x, y) cells."""
    points = []
    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy

    while True:
        points.append((x0, y0))
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x0 += sx
        if e2 < dx:
            err += dx
            y0 += sy

    return points


def _line_of_sight(
    occupied: list[list[bool]],
    x0: int, y0: int,
    x1: int, y1: int,
) -> bool:
    """Check if there's a clear line-of-sight between two grid cells."""
    for px, py in _bresenham(x0, y0, x1, y1):
        if 0 <= px < len(occupied) and 0 <= py < len(occupied[0]):
            if occupied[px][py]:
                return False
    return True
