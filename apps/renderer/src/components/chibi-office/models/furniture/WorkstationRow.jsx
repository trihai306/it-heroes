/**
 * WorkstationRow — A row of organized workstations with desk dividers
 * 
 * Creates a professional office desk row layout like a coworking space:
 *   ┌─────┬─────┬─────┬─────┐
 *   │ PC1 │ PC2 │ PC3 │ PC4 │  ← back-to-back desks
 *   ├─────┼─────┼─────┼─────┤
 *   │ PC5 │ PC6 │ PC7 │ PC8 │
 *   └─────┴─────┴─────┴─────┘
 * 
 * Each station: desk + chair + computer + optional divider
 */
import { useMemo } from "react";
import * as THREE from "three";
import { geo, mat } from "./shared";
import DeskModel from "./DeskModel";
import ChairModel from "./ChairModel";
import ComputerModel from "./ComputerModel";

/* ── Divider materials ─────────────────────────────────────────────── */
const dividerMat = new THREE.MeshStandardMaterial({
    color: "#cbd5e1", roughness: 0.6, metalness: 0.05,
});
const dividerFrameMat = new THREE.MeshStandardMaterial({
    color: "#94a3b8", metalness: 0.3, roughness: 0.4,
});
const dividerFrostMat = new THREE.MeshStandardMaterial({
    color: "#e2e8f0", transparent: true, opacity: 0.35,
    roughness: 0.1, metalness: 0.05,
});

/* ── Desk partition divider ────────────────────────────────────────── */
function DeskDivider({ position = [0, 0, 0], height = 0.45, width = 0.02, depth = 0.6, frosted = false }) {
    return (
        <group position={position}>
            {/* Frame */}
            <mesh geometry={geo.box} material={dividerFrameMat}
                position={[0, 0.6 + height / 2, 0]}
                scale={[width + 0.01, height + 0.02, depth + 0.02]} />
            {/* Panel */}
            <mesh geometry={geo.box} material={frosted ? dividerFrostMat : dividerMat}
                position={[0, 0.6 + height / 2, 0]}
                scale={[width, height, depth]} />
            {/* Top accent strip */}
            <mesh geometry={geo.box}
                position={[0, 0.6 + height + 0.005, 0]}
                scale={[width + 0.02, 0.008, depth + 0.02]}>
                <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.3} />
            </mesh>
        </group>
    );
}

/* ── Cable management spine ────────────────────────────────────────── */
function CableSpine({ position = [0, 0, 0], length = 3.0 }) {
    return (
        <group position={position}>
            {/* Main trunking */}
            <mesh geometry={geo.box} material={mat.metalDark}
                position={[0, 0.08, 0]} scale={[0.08, 0.06, length]} />
            {/* Power strip */}
            <mesh geometry={geo.box} material={mat.peripheral}
                position={[0, 0.04, 0]} scale={[0.06, 0.025, length * 0.6]} />
            {/* LED indicator dots */}
            {[-0.4, 0, 0.4].map((z, i) => (
                <mesh key={i} geometry={geo.sphere}
                    position={[0, 0.055, z * length * 0.4]}
                    scale={[0.005, 0.005, 0.005]}>
                    <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.6} />
                </mesh>
            ))}
        </group>
    );
}

/**
 * WorkstationRow — Creates a row of workstations
 * 
 * @param {Object} props
 * @param {Array} props.position - [x, y, z] position
 * @param {number} props.count - Number of desks in the row (default: 3)
 * @param {number} props.spacing - Space between desk centers (default: 2.0)
 * @param {boolean} props.backToBack - If true, creates mirror row facing opposite (default: false)
 * @param {boolean} props.dividers - Show dividers between desks (default: true)
 * @param {string} props.accentColor - Accent color for active states
 * @param {Array} props.agents - Array of { agent, status } for each desk slot
 * @param {string} props.computerVariant - "tower" | "mini" | "laptop"
 * @param {boolean} props.dualMonitor - Whether to use dual monitors
 * @param {number} props.rowRotation - Y-axis rotation of the entire row
 */
export default function WorkstationRow({
    position = [0, 0, 0],
    count = 3,
    spacing = 2.2,
    backToBack = false,
    dividers = true,
    accentColor = "#3b82f6",
    agents = [],
    computerVariant = "tower",
    dualMonitor = false,
    rowRotation = 0,
}) {
    const totalWidth = (count - 1) * spacing;
    const startX = -totalWidth / 2;

    const frontRow = useMemo(() => {
        const row = [];
        for (let i = 0; i < count; i++) {
            const entry = agents[i] || null;
            const isActive = entry?.status === "in_progress" || entry?.status === "review";
            row.push({ index: i, x: startX + i * spacing, entry, isActive });
        }
        return row;
    }, [count, spacing, startX, agents]);

    const backRow = useMemo(() => {
        if (!backToBack) return [];
        const row = [];
        for (let i = 0; i < count; i++) {
            const entryIdx = count + i;
            const entry = agents[entryIdx] || null;
            const isActive = entry?.status === "in_progress" || entry?.status === "review";
            row.push({ index: i, x: startX + i * spacing, entry, isActive });
        }
        return row;
    }, [count, spacing, startX, agents, backToBack]);

    return (
        <group position={position} rotation={[0, rowRotation, 0]}>
            {/* ═══ FRONT ROW ═══ */}
            {frontRow.map(({ index, x, isActive }) => (
                <group key={`front-${index}`} position={[x, 0, 0]}>
                    {/* Desk */}
                    <DeskModel position={[0, 0, 0]} active={isActive} accentColor={accentColor} />
                    {/* Chair (facing desk) */}
                    <ChairModel position={[0, 0, 0.85]} color={isActive ? "#4b5580" : "#6b7280"} />
                    {/* Computer (on/beside desk) */}
                    <ComputerModel
                        position={[0, 0, 0]}
                        variant={computerVariant}
                        active={isActive}
                        accentColor={accentColor}
                        dualMonitor={dualMonitor && isActive}
                    />
                    {/* Divider (between desks) */}
                    {dividers && index < count - 1 && (
                        <DeskDivider
                            position={[spacing / 2, 0, 0]}
                            frosted={index % 2 === 0}
                        />
                    )}
                </group>
            ))}

            {/* ═══ BACK ROW (mirror) ═══ */}
            {backToBack && (
                <group rotation={[0, Math.PI, 0]} position={[0, 0, -1.6]}>
                    {backRow.map(({ index, x, isActive }) => (
                        <group key={`back-${index}`} position={[x, 0, 0]}>
                            <DeskModel position={[0, 0, 0]} active={isActive} accentColor={accentColor} />
                            <ChairModel position={[0, 0, 0.85]} color={isActive ? "#4b5580" : "#6b7280"} />
                            <ComputerModel
                                position={[0, 0, 0]}
                                variant={computerVariant}
                                active={isActive}
                                accentColor={accentColor}
                                dualMonitor={dualMonitor && isActive}
                            />
                            {dividers && index < count - 1 && (
                                <DeskDivider position={[spacing / 2, 0, 0]} />
                            )}
                        </group>
                    ))}
                </group>
            )}

            {/* ═══ SHARED INFRASTRUCTURE ═══ */}
            {/* Cable management spine (between rows) */}
            {backToBack && (
                <CableSpine
                    position={[0, 0, -0.8]}
                    length={totalWidth + 0.5}
                />
            )}
        </group>
    );
}
