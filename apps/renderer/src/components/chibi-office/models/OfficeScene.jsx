/**
 * OfficeScene — Premium god-view tech startup office
 * 
 * Layout (top-down, open roof):
 *   ┌──────────┬──────────┬──────────────┐
 *   │  Zone 0  │  Zone 1  │  Billiards   │
 *   │  (dept)  │  (dept)  │   Room       │
 *   ├──door────┼──door────┤──────────────┤
 *   │  Zone 2  │  Zone 3  │              │
 *   │  (dept)  │  (dept)  │   Café       │
 *   ├──door────┼──door────┤   Corner     │
 *   │        Lounge       │              │
 *   └─────────────────────┴──────────────┘
 * 
 * DeskModel already contains: monitor+arm, keyboard, mouse, coffee mug,
 * pen holder, desk lamp, drawer cabinet. DO NOT stack extra furniture on desks.
 */
import { useRef, useMemo, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ChibiModel from "./ChibiModel";
import {
    DeskModel,
    ChairModel,
    PlantModel,
    CoffeeMachineModel,
    WaterCoolerModel,
    WhiteboardModel,
    ServerRackModel,
    BookshelfModel,
    BilliardsTable,
    CafeTableSet,
    Sofa,
    GlassWall,
    ComputerModel,
} from "./FurnitureModels";

/* ─── Zone accent colors ─────────────────────────────────────────── */
const ZONE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

/* ─── Shared materials ───────────────────────────────────────────── */
const mat = {
    wallExt: new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.5 }),
    wallInt: new THREE.MeshStandardMaterial({ color: "#f1f5f9", roughness: 0.55 }),
    baseboard: new THREE.MeshStandardMaterial({ color: "#94a3b8", roughness: 0.5 }),
    doorFrame: new THREE.MeshStandardMaterial({ color: "#64748b", roughness: 0.4, metalness: 0.15 }),
    door: new THREE.MeshStandardMaterial({ color: "#94a3b8", roughness: 0.35, metalness: 0.1 }),
    doorKnob: new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.7, roughness: 0.2 }),
};

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 12);

/* ─── Wall height ────────────────────────────────────────────────── */
const WH = 1.8;


/* ═══════════════════════════════════════════════════════════════════ */
/* ─── WALL segment ─────────────────────────────────────────────────*/
/* ═══════════════════════════════════════════════════════════════════ */
function Wall({ from, to, height = WH, material = mat.wallInt, thickness = 0.08 }) {
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    const cx = (from[0] + to[0]) / 2;
    const cz = (from[1] + to[1]) / 2;

    return (
        <mesh position={[cx, height / 2, cz]} rotation={[0, -angle, 0]}
            geometry={boxGeo} material={material} scale={[len, height, thickness]} />
    );
}


/* ═══════════════════════════════════════════════════════════════════ */
/* ─── WALL WITH ANIMATED DOOR ──────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
const DOOR_SWING = 1.35;
const DOOR_LERP_SPEED = 0.07;

function WallWithDoor({ from, to, doorPos = 0.5, doorWidth = 1.0, height = WH, color, isOpen: defaultOpen = true }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const doorRef = useRef();
    const targetAngle = useRef(defaultOpen ? -DOOR_SWING : 0);
    const currentAngle = useRef(defaultOpen ? -DOOR_SWING : 0);

    const toggleDoor = useCallback(() => {
        setIsOpen(prev => {
            const next = !prev;
            targetAngle.current = next ? -DOOR_SWING : 0;
            return next;
        });
    }, []);

    useFrame(() => {
        if (!doorRef.current) return;
        const diff = targetAngle.current - currentAngle.current;
        if (Math.abs(diff) > 0.001) {
            currentAngle.current += diff * DOOR_LERP_SPEED;
            doorRef.current.rotation.y = currentAngle.current;
        }
    });

    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);

    const doorWorldX = from[0] + dx * doorPos;
    const doorWorldZ = from[1] + dz * doorPos;
    const halfDoor = doorWidth / 2;
    const segLeftLen = len * doorPos - halfDoor;
    const segRightLen = len * (1 - doorPos) - halfDoor;

    return (
        <group>
            {segLeftLen > 0.01 && (
                <mesh position={[from[0] + dx * (segLeftLen / 2 / len), height / 2, from[1] + dz * (segLeftLen / 2 / len)]}
                    rotation={[0, -angle, 0]} geometry={boxGeo} material={mat.wallInt}
                    scale={[segLeftLen, height, 0.08]} />
            )}
            {segRightLen > 0.01 && (
                <mesh position={[to[0] - dx * (segRightLen / 2 / len), height / 2, to[1] - dz * (segRightLen / 2 / len)]}
                    rotation={[0, -angle, 0]} geometry={boxGeo} material={mat.wallInt}
                    scale={[segRightLen, height, 0.08]} />
            )}

            {/* Door frame */}
            <mesh position={[doorWorldX - (dx / len) * halfDoor, height / 2, doorWorldZ - (dz / len) * halfDoor]}
                rotation={[0, -angle, 0]} geometry={boxGeo} material={mat.doorFrame}
                scale={[0.06, height, 0.12]} />
            <mesh position={[doorWorldX + (dx / len) * halfDoor, height / 2, doorWorldZ + (dz / len) * halfDoor]}
                rotation={[0, -angle, 0]} geometry={boxGeo} material={mat.doorFrame}
                scale={[0.06, height, 0.12]} />
            <mesh position={[doorWorldX, height - 0.04, doorWorldZ]}
                rotation={[0, -angle, 0]} geometry={boxGeo} material={mat.doorFrame}
                scale={[doorWidth + 0.12, 0.06, 0.12]} />

            {/* Door panel */}
            <group position={[doorWorldX - (dx / len) * halfDoor, 0, doorWorldZ - (dz / len) * halfDoor]}
                rotation={[0, -angle, 0]} onClick={toggleDoor}>
                <group ref={doorRef}>
                    <mesh position={[doorWidth / 2, height / 2, 0]}
                        geometry={boxGeo} material={mat.door}
                        scale={[doorWidth, height - 0.12, 0.05]} />
                    <mesh position={[doorWidth * 0.8, height * 0.45, 0.04]}
                        geometry={cylGeo} material={mat.doorKnob}
                        scale={[0.03, 0.12, 0.03]} rotation={[Math.PI / 2, 0, 0]} />
                </group>
            </group>

            {/* Floor accent strip */}
            {color && (
                <mesh position={[doorWorldX, 0.005, doorWorldZ]} rotation={[-Math.PI / 2, 0, angle]}>
                    <planeGeometry args={[doorWidth + 0.4, 0.06]} />
                    <meshStandardMaterial color={color} transparent opacity={0.5} />
                </mesh>
            )}
        </group>
    );
}


/* ═══════════════════════════════════════════════════════════════════ */
/* ─── ZONE SIGN — LED strip above door ─────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
function ZoneSign({ position, name, color }) {
    return (
        <group position={position}>
            <mesh position={[0, WH + 0.05, -0.04]} scale={[2.0, 0.04, 0.02]}>
                <boxGeometry />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
            </mesh>
        </group>
    );
}


/* ═══════════════════════════════════════════════════════════════════ */
/* ─── AMBIENT PARTICLES ────────────────────────────────────────────*/
/* ═══════════════════════════════════════════════════════════════════ */
function AmbientParticles({ count = 15 }) {
    const particlesRef = useRef();
    const data = useMemo(() => {
        const d = [];
        for (let i = 0; i < count; i++) {
            d.push({
                x: (Math.random() - 0.5) * 30,
                y: 0.3 + Math.random() * 1.5,
                z: (Math.random() - 0.5) * 22,
                speed: 0.002 + Math.random() * 0.003,
                phase: Math.random() * Math.PI * 2,
            });
        }
        return d;
    }, [count]);

    useFrame(({ clock }) => {
        if (!particlesRef.current) return;
        const t = clock.elapsedTime;
        const children = particlesRef.current.children;
        data.forEach((d, i) => {
            if (children[i]) {
                children[i].position.y = d.y + Math.sin(t * d.speed * 100 + d.phase) * 0.15;
                children[i].position.x = d.x + Math.sin(t * 0.3 + d.phase) * 0.2;
            }
        });
    });

    return (
        <group ref={particlesRef}>
            {data.map((d, i) => (
                <mesh key={i} position={[d.x, d.y, d.z]}>
                    <sphereGeometry args={[0.015, 6, 4]} />
                    <meshStandardMaterial color="#e2e8f0" emissive="#e2e8f0"
                        emissiveIntensity={0.3} transparent opacity={0.4} />
                </mesh>
            ))}
        </group>
    );
}


/* ═══════════════════════════════════════════════════════════════════ */
/* ─── NAV GRAPH ────────────────────────────────────────────────────*/
/* ═══════════════════════════════════════════════════════════════════ */
const GLOBAL_NAV_GRAPH = [
    { id: 'z0_a', x: -5, z: -9, edges: ['z0_b', 'z0_door'] },
    { id: 'z0_b', x: -3, z: -10, edges: ['z0_a', 'z0_door'] },
    { id: 'z0_door', x: -4, z: -7.5, edges: ['z0_a', 'z0_b', 'cor_w'] },
    { id: 'z1_a', x: 3, z: -9, edges: ['z1_b', 'z1_door'] },
    { id: 'z1_b', x: 5, z: -10, edges: ['z1_a', 'z1_door'] },
    { id: 'z1_door', x: 4, z: -7.5, edges: ['z1_a', 'z1_b', 'cor_e'] },
    { id: 'z2_a', x: -5, z: -4, edges: ['z2_b', 'z2_door'] },
    { id: 'z2_b', x: -3, z: -3, edges: ['z2_a', 'z2_door'] },
    { id: 'z2_door', x: -4, z: -0.5, edges: ['z2_a', 'z2_b', 'cor_w'] },
    { id: 'z3_a', x: 3, z: -4, edges: ['z3_b', 'z3_door'] },
    { id: 'z3_b', x: 5, z: -3, edges: ['z3_a', 'z3_door'] },
    { id: 'z3_door', x: 4, z: -0.5, edges: ['z3_a', 'z3_b', 'cor_e'] },
    { id: 'cor_w', x: -4, z: -4, edges: ['z0_door', 'z2_door', 'cor_sw'] },
    { id: 'cor_e', x: 4, z: -4, edges: ['z1_door', 'z3_door', 'cor_mid'] },
    { id: 'cor_sw', x: -4, z: -2, edges: ['cor_w', 'cor_mid', 'cor_nw'] },
    { id: 'cor_mid', x: 2, z: -2, edges: ['cor_sw', 'cor_e'] },
    { id: 'cor_nw', x: -3, z: 3, edges: ['cor_sw', 'lounge_a', 'cor_ne'] },
    { id: 'cor_ne', x: 4, z: 3, edges: ['cor_nw', 'lounge_b'] },
    { id: 'lounge_a', x: -2.5, z: 7, edges: ['cor_nw', 'lounge_c'] },
    { id: 'lounge_b', x: 2.5, z: 7, edges: ['cor_ne', 'lounge_c'] },
    { id: 'lounge_c', x: 0, z: 6, edges: ['lounge_a', 'lounge_b'] },
];


/* ═══════════════════════════════════════════════════════════════════ */
/* ─── ROOM SHELL — Exterior walls, floor, windows (no ceiling) ─── */
/* ═══════════════════════════════════════════════════════════════════ */
function RoomShell() {
    const roomW = 32;
    const roomD = 24;
    const halfW = roomW / 2;
    const halfD = roomD / 2;

    return (
        <group>
            {/* ── Premium polished concrete floor ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <planeGeometry args={[roomW + 4, roomD + 4]} />
                <meshStandardMaterial color="#e8e0d6" roughness={0.45} metalness={0.03} />
            </mesh>
            <gridHelper args={[roomW, 32, "#d6cfc5", "#ddd6cc"]} position={[0, 0.002, 0]} />

            {/* ── Exterior walls ── */}
            <Wall from={[-halfW, -halfD]} to={[halfW, -halfD]} material={mat.wallExt} thickness={0.15} />
            <Wall from={[-halfW, -halfD]} to={[-halfW, halfD]} material={mat.wallExt} thickness={0.15} />
            <Wall from={[halfW, -halfD]} to={[halfW, halfD]} material={mat.wallExt} thickness={0.15} />
            <Wall from={[-halfW, halfD]} to={[-3, halfD]} material={mat.wallExt} thickness={0.15} />
            <Wall from={[3, halfD]} to={[halfW, halfD]} material={mat.wallExt} thickness={0.15} />

            {/* ── Windows (back wall — tall glass) ── */}
            {[-12, -6, 0, 6, 12].map((x, i) => (
                <group key={i}>
                    <mesh position={[x, WH * 0.55, -halfD + 0.08]} scale={[3.6, WH * 0.85, 0.01]}>
                        <planeGeometry />
                        <meshStandardMaterial color="#bae6fd" emissive="#87ceeb"
                            emissiveIntensity={0.08} roughness={0.05} transparent opacity={0.7} />
                    </mesh>
                    <mesh position={[x, WH * 0.55, -halfD + 0.09]} scale={[3.7, WH * 0.9, 0.015]}>
                        <boxGeometry />
                        <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.25} />
                    </mesh>
                    <mesh position={[x, WH * 0.55, -halfD + 0.1]} scale={[0.025, WH * 0.85, 0.012]}>
                        <boxGeometry />
                        <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.25} />
                    </mesh>
                </group>
            ))}

            {/* ── Side windows (left wall) ── */}
            {[-8, -2, 4].map((z, i) => (
                <group key={`lw-${i}`}>
                    <mesh position={[-halfW + 0.08, WH * 0.55, z]} rotation={[0, Math.PI / 2, 0]} scale={[2.5, WH * 0.7, 0.01]}>
                        <planeGeometry />
                        <meshStandardMaterial color="#bae6fd" emissive="#87ceeb" emissiveIntensity={0.05} roughness={0.05} transparent opacity={0.6} />
                    </mesh>
                </group>
            ))}

            {/* ── Baseboard ── */}
            <mesh geometry={boxGeo} material={mat.baseboard}
                position={[0, 0.03, -halfD + 0.08]} scale={[roomW, 0.06, 0.03]} />
            <mesh geometry={boxGeo} material={mat.baseboard}
                position={[-halfW + 0.08, 0.03, 0]} scale={[0.03, 0.06, roomD]} />
            <mesh geometry={boxGeo} material={mat.baseboard}
                position={[halfW - 0.08, 0.03, 0]} scale={[0.03, 0.06, roomD]} />

            {/* ── Main entrance (glass) ── */}
            <mesh geometry={boxGeo} material={mat.doorFrame}
                position={[-3.05, WH / 2, halfD]} scale={[0.08, WH, 0.14]} />
            <mesh geometry={boxGeo} material={mat.doorFrame}
                position={[3.05, WH / 2, halfD]} scale={[0.08, WH, 0.14]} />
            <mesh geometry={boxGeo} material={mat.doorFrame}
                position={[0, WH - 0.03, halfD]} scale={[6.2, 0.06, 0.14]} />
            {/* Glass doors */}
            <mesh position={[-1.5, WH / 2, halfD]} scale={[2.8, WH - 0.1, 0.02]}>
                <boxGeometry />
                <meshStandardMaterial color="#bae6fd" transparent opacity={0.2} roughness={0.05} />
            </mesh>
            <mesh position={[1.5, WH / 2, halfD]} scale={[2.8, WH - 0.1, 0.02]}>
                <boxGeometry />
                <meshStandardMaterial color="#bae6fd" transparent opacity={0.2} roughness={0.05} />
            </mesh>

            {/* Welcome mat */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, halfD - 0.5]}>
                <planeGeometry args={[3, 1.2]} />
                <meshStandardMaterial color="#475569" roughness={0.9} />
            </mesh>

            {/* ── Lighting ── */}
            <ambientLight intensity={0.65} color="#f8fafc" />
            <directionalLight position={[10, 18, 8]} intensity={0.45} color="#f1f5f9" castShadow={false} />
            <directionalLight position={[-8, 12, -5]} intensity={0.15} color="#e2e8f0" />
        </group>
    );
}


/* ═══════════════════════════════════════════════════════════════════ */
/* ─── DEPARTMENT ZONE ──────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
/*
 * Each zone is 8 × 7 units. Always shows 6 desk workstations (3×2 grid).
 * DeskModel is ~1.5 wide × 0.75 deep, with built-in monitor+keyboard+accessories.
 * Agents are assigned to desk slots — unoccupied desks still render as furniture.
 * 
 *   ┌──────────────────────────────────────┐
 *   │  [whiteboard]  [glass]  [bookshelf]  │  ← back wall
 *   │                                      │
 *   │   desk0      desk1      desk2        │  ← row 0
 *   │   chair      chair      chair        │
 *   │                                      │
 *   │   desk3      desk4      desk5        │  ← row 1
 *   │   chair      chair      chair        │
 *   │                                      │
 *   │  [plant]      door      [plant]      │  ← front wall
 *   └──────────────────────────────────────┘
 */
const DESKS_PER_ZONE = 6; // 3 columns × 2 rows

function DepartmentZone3D({ zone, zoneIndex = 0, navGraph, agentPositions = {} }) {
    const ZONE_W = 8;
    const ZONE_D = 7;
    const col = zoneIndex % 2;
    const row = Math.floor(zoneIndex / 2);
    const offsetX = -4 + col * (ZONE_W + 0.08);
    const offsetZ = -11 + row * (ZONE_D + 0.08);

    const color = ZONE_COLORS[zoneIndex % ZONE_COLORS.length];
    const { deskAgents = [], walkingAgents = [], blockedAgents = [] } = zone || {};

    const left = offsetX - ZONE_W / 2;
    const right = offsetX + ZONE_W / 2;
    const back = offsetZ - ZONE_D / 2;
    const front = offsetZ + ZONE_D / 2;

    const walkData = useMemo(() => ({ graph: navGraph }), [navGraph]);

    /* Build a map of desk slot → agent (if any) */
    const deskSlots = useMemo(() => {
        const slots = [];
        for (let i = 0; i < DESKS_PER_ZONE; i++) {
            const deskCol = i % 3;
            const deskRow = Math.floor(i / 3);
            const dx = offsetX + (deskCol - 1) * 2.2;
            const dz = offsetZ - 0.5 + deskRow * 1.6;
            const agent = deskAgents[i] || null;
            slots.push({ dx, dz, agent });
        }
        return slots;
    }, [offsetX, offsetZ, deskAgents]);

    return (
        <group>
            {/* ── Zone floor rug ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[offsetX, 0.006, offsetZ]}>
                <planeGeometry args={[ZONE_W - 0.5, ZONE_D - 0.5]} />
                <meshStandardMaterial color={color} transparent opacity={0.06} roughness={0.9} />
            </mesh>

            {/* ── Partition walls ── */}
            <Wall from={[left, back]} to={[right, back]} />
            {col === 0 ? null : <Wall from={[left, back]} to={[left, front]} />}
            {col === 1 ? null : <Wall from={[right, back]} to={[right, front]} />}
            {col === 0 && <Wall from={[right, back]} to={[right, front]} />}

            {/* Front wall with door */}
            <WallWithDoor from={[left, front]} to={[right, front]}
                doorPos={0.5} doorWidth={1.2} color={color} isOpen={true} />

            {/* Zone sign */}
            <ZoneSign position={[offsetX, 0, front]} name={zone?.dept?.name || `Zone ${zoneIndex}`} color={color} />

            {/* ── Glass partition (between back furniture and desk area) ── */}
            <GlassWall
                position={[offsetX, 0, back + 1.0]}
                rotation={[0, 0, 0]}
                width={ZONE_W - 1.5}
                height={0.9}
                tintColor={color}
            />

            {/* ═══ 6 DESK WORKSTATIONS (always rendered) ═══ */}
            {deskSlots.map((slot, i) => {
                const isOccupied = !!slot.agent;
                const isActive = isOccupied && (slot.agent.status === "in_progress" || slot.agent.status === "review");
                return (
                    <group key={`desk-${zoneIndex}-${i}`}>
                        {/* Desk always shows (with or without agent) */}
                        <DeskModel position={[slot.dx, 0, slot.dz]} active={isActive} accentColor={color} />
                        {/* Desktop PC + monitors */}
                        <ComputerModel
                            position={[slot.dx, 0, slot.dz]}
                            variant={zoneIndex === 0 ? "tower" : "mini"}
                            active={isActive}
                            accentColor={color}
                            dualMonitor={isActive}
                        />
                        {/* Chair always shows */}
                        <ChairModel position={[slot.dx, 0, slot.dz + 0.9]} color={isOccupied ? "#3b4a6b" : "#475569"} />
                        {/* Only render chibi if desk is occupied */}
                        {isOccupied && (
                            <ChibiModel agent={slot.agent.agent} status={slot.agent.status}
                                position={[slot.dx, 0, slot.dz + 0.7]} />
                        )}
                    </group>
                );
            })}

            {/* ── Walking agents ── */}
            {walkingAgents.map((entry, i) => (
                <ChibiModel key={entry.agent.id}
                    agent={entry.agent} status={entry.status}
                    position={[offsetX - 1 + i * 1.8, 0, offsetZ + 2.0]}
                    walkArea={walkData}
                    serverPosition={agentPositions[entry.agent.id] || null} />
            ))}

            {/* ── Blocked agents (near side wall) ── */}
            {blockedAgents.map((entry, i) => (
                <ChibiModel key={entry.agent.id}
                    agent={entry.agent} status={entry.status}
                    position={[col === 0 ? right - 0.8 : left + 0.8, 0, offsetZ - 0.5 + i * 1.2]} />
            ))}

            {/* ═══ ROOM FURNITURE (always present) ═══ */}

            {/* Whiteboard — back wall left side */}
            <WhiteboardModel position={[offsetX - 1.5, 0, back + 0.4]} />

            {/* Bookshelf — back wall right side */}
            <BookshelfModel position={[offsetX + 2.0, 0, back + 0.4]} />

            {/* Server rack — even zones only */}
            {zoneIndex % 2 === 0 && (
                <ServerRackModel position={[col === 0 ? left + 0.6 : right - 0.6, 0, offsetZ - 0.5]} />
            )}

            {/* Plants — corners */}
            <PlantModel position={[left + 0.5, 0, front - 0.6]} scale={0.65} />
            <PlantModel position={[right - 0.5, 0, front - 0.6]} scale={0.55} />
            <PlantModel position={[right - 0.5, 0, back + 0.5]} scale={0.7} />

            {/* Water cooler — odd zones */}
            {zoneIndex % 2 === 1 && (
                <WaterCoolerModel position={[left + 0.6, 0, front - 0.6]} />
            )}
        </group>
    );
}


/* ═══════════════════════════════════════════════════════════════════ */
/* ─── BILLIARDS ROOM ─────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
function BilliardsRoom() {
    const left = 9; const right = 16;
    const back = -12; const front = -4;
    const cx = (left + right) / 2;
    const cz = (back + front) / 2;

    return (
        <group>
            <Wall from={[left, back]} to={[left, front]} />
            <WallWithDoor from={[left, front]} to={[right, front]}
                doorPos={0.3} doorWidth={1.2} color="#22c55e" />

            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.004, cz]}>
                <planeGeometry args={[right - left - 0.3, front - back - 0.3]} />
                <meshStandardMaterial color="#22c55e" transparent opacity={0.05} />
            </mesh>

            <BilliardsTable position={[cx, 0, cz]} />
            <PlantModel position={[right - 1, 0, back + 1]} scale={0.9} />
            <PlantModel position={[left + 1, 0, front - 1]} scale={0.7} />
        </group>
    );
}


/* ═══════════════════════════════════════════════════════════════════ */
/* ─── CAFÉ ROOM ──────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
function CafeRoom() {
    const left = 9; const right = 16;
    const back = -4; const front = 8;
    const cx = (left + right) / 2;
    const cz = (back + front) / 2;

    return (
        <group>
            <Wall from={[left, back]} to={[left, front]} />
            <WallWithDoor from={[left, front]} to={[right, front]}
                doorPos={0.4} doorWidth={1.2} color="#f59e0b" />
            <Wall from={[left, back]} to={[right, back]} />

            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.004, cz]}>
                <planeGeometry args={[right - left - 0.3, front - back - 0.3]} />
                <meshStandardMaterial color="#f59e0b" transparent opacity={0.05} />
            </mesh>

            {/* Café tables — 2×2 grid, well-spaced */}
            <CafeTableSet position={[left + 2.2, 0, back + 2.5]} tableColor="#8b6f47" />
            <CafeTableSet position={[left + 5.0, 0, back + 2.5]} tableColor="#a0845c" />
            <CafeTableSet position={[left + 2.2, 0, back + 5.5]} tableColor="#8b6f47" />
            <CafeTableSet position={[left + 5.0, 0, back + 5.5]} tableColor="#a0845c" />

            {/* Counter */}
            <mesh position={[right - 1.3, 0.45, cz]}>
                <boxGeometry args={[0.6, 0.9, 4]} />
                <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.1} />
            </mesh>
            <mesh position={[right - 1.3, 0.91, cz]}>
                <boxGeometry args={[0.65, 0.025, 4.1]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.15} />
            </mesh>

            <CoffeeMachineModel position={[right - 1.3, 0, back + 1.5]} />
            <WaterCoolerModel position={[right - 1.3, 0, back + 3.5]} />

            <PlantModel position={[left + 1, 0, front - 1]} scale={1.1} />
            <PlantModel position={[left + 1, 0, back + 1]} scale={0.7} />
        </group>
    );
}


/* ═══════════════════════════════════════════════════════════════════ */
/* ─── LOUNGE AREA ────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
function LoungeArea() {
    return (
        <group position={[0, 0, 7]}>
            {/* Area rug */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
                <planeGeometry args={[8, 4]} />
                <meshStandardMaterial color="#6366f1" transparent opacity={0.06} roughness={0.9} />
            </mesh>

            {/* Sofas */}
            <Sofa position={[-2.5, 0, 0]} color="#475569" />
            <Sofa position={[2.5, 0, 0]} color="#475569" />

            {/* Coffee table */}
            <mesh position={[0, 0.22, 0]}>
                <boxGeometry args={[1.4, 0.03, 0.7]} />
                <meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.15} />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[1.2, 0.18, 0.55]} />
                <meshStandardMaterial color="#475569" roughness={0.35} metalness={0.1} />
            </mesh>

            {/* Bookshelves flanking the lounge */}
            <BookshelfModel position={[-5, 0, -0.5]} />
            <BookshelfModel position={[5, 0, -0.5]} />

            {/* Plants */}
            <PlantModel position={[-4, 0, 1.2]} scale={1.0} />
            <PlantModel position={[4, 0, 1.2]} scale={0.9} />
            <PlantModel position={[0, 0, -1.8]} scale={0.6} />

            {/* Hallway carpet strip */}
            <mesh position={[0, 0.003, -3]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[6, 2.5]} />
                <meshStandardMaterial color="#64748b" transparent opacity={0.05} />
            </mesh>
        </group>
    );
}


/* ═══════════════════════════════════════════════════════════════════ */
/* ─── CORRIDOR DECORATION ──────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
function CorridorDecor() {
    return (
        <group>
            {/* Plants along corridor */}
            <PlantModel position={[-8, 0, -7.5]} scale={0.9} />
            <PlantModel position={[-8, 0, -0.5]} scale={0.7} />
            <PlantModel position={[8, 0, -4]} scale={0.8} />

            {/* Water cooler in corridor */}
            <WaterCoolerModel position={[8, 0, 0]} />
        </group>
    );
}


/* ═══════════════════════════════════════════════════════════════════ */
/* ─── MAIN OFFICE SCENE ──────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export default function OfficeScene({ zoneLayouts = [], agentPositions = {} }) {
    return (
        <group>
            <RoomShell />

            {zoneLayouts.map((zone, i) => (
                <DepartmentZone3D key={zone?.dept?.id || i} zone={zone} zoneIndex={i}
                    navGraph={GLOBAL_NAV_GRAPH} agentPositions={agentPositions} />
            ))}

            <BilliardsRoom />
            <CafeRoom />
            <LoungeArea />
            <CorridorDecor />

            <AmbientParticles count={15} />
        </group>
    );
}
