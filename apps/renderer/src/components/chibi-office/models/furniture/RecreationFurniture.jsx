/**
 * Recreation furniture — Premium BilliardsTable, CafeTableSet,
 * Sofa, GlassWall, CeilingLight with rich detail
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { geo, mat } from "./shared";

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── BILLIARDS TABLE ─────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function BilliardsTable({ position = [0, 0, 0] }) {
    const ballColors = ["#fefce8", "#fbbf24", "#3b82f6", "#ef4444", "#7c3aed",
        "#f97316", "#16a34a", "#7f1d1d", "#0f172a"];

    return (
        <group position={position}>
            {/* ── Table body ── */}
            <mesh geometry={geo.box} material={mat.mahogany}
                position={[0, 0.5, 0]} scale={[2.6, 0.18, 1.4]} />
            {/* Felt surface */}
            <mesh geometry={geo.box} material={mat.felt}
                position={[0, 0.60, 0]} scale={[2.3, 0.025, 1.15]} />

            {/* ── Rails (cushions) ── */}
            <mesh geometry={geo.box} material={mat.mahogany}
                position={[0, 0.64, 0.6]} scale={[2.35, 0.065, 0.09]} />
            <mesh geometry={geo.box} material={mat.mahogany}
                position={[0, 0.64, -0.6]} scale={[2.35, 0.065, 0.09]} />
            <mesh geometry={geo.box} material={mat.mahogany}
                position={[1.2, 0.64, 0]} scale={[0.09, 0.065, 1.2]} />
            <mesh geometry={geo.box} material={mat.mahogany}
                position={[-1.2, 0.64, 0]} scale={[0.09, 0.065, 1.2]} />

            {/* ── Rail top inlay (decorative wood strip) ── */}
            {[
                { pos: [0, 0.675, 0.6], scale: [2.2, 0.008, 0.06] },
                { pos: [0, 0.675, -0.6], scale: [2.2, 0.008, 0.06] },
                { pos: [1.2, 0.675, 0], scale: [0.06, 0.008, 1.08] },
                { pos: [-1.2, 0.675, 0], scale: [0.06, 0.008, 1.08] },
            ].map(({ pos, scale }, i) => (
                <mesh key={`inlay-${i}`} geometry={geo.box}
                    position={pos} scale={scale}>
                    <meshStandardMaterial color="#9f1d1d" roughness={0.45} metalness={0.05} />
                </mesh>
            ))}

            {/* ── Corner pockets ── */}
            {[[-1.11, 0.62, -0.55], [0, 0.62, -0.58], [1.11, 0.62, -0.55],
                [-1.11, 0.62, 0.55], [0, 0.62, 0.58], [1.11, 0.62, 0.55]].map((p, i) => (
                <group key={i}>
                    <mesh geometry={geo.cylinder}
                        position={p} scale={[0.045, 0.025, 0.045]}>
                        <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
                    </mesh>
                    {/* Pocket rim */}
                    <mesh geometry={geo.cylinder} material={mat.brass}
                        position={[p[0], p[1] + 0.012, p[2]]} scale={[0.05, 0.005, 0.05]} />
                </group>
            ))}

            {/* ── Ornate legs ── */}
            {[[-1.1, -0.55], [1.1, -0.55], [-1.1, 0.55], [1.1, 0.55]].map((p, i) => (
                <group key={i}>
                    {/* Leg post */}
                    <mesh geometry={geo.cylinder} material={mat.mahogany}
                        position={[p[0], 0.22, p[1]]} scale={[0.05, 0.42, 0.05]} />
                    {/* Leg cap */}
                    <mesh geometry={geo.cylinder} material={mat.brass}
                        position={[p[0], 0.008, p[1]]} scale={[0.04, 0.012, 0.04]} />
                    {/* Leg collar */}
                    <mesh geometry={geo.cylinder} material={mat.mahogany}
                        position={[p[0], 0.38, p[1]]} scale={[0.06, 0.02, 0.06]} />
                </group>
            ))}

            {/* ── Balls in triangle ── */}
            {ballColors.map((c, i) => {
                const bx = -0.5 + (i % 5) * 0.22;
                const bz = -0.15 + Math.floor(i / 5) * 0.2;
                return (
                    <mesh key={i} geometry={geo.sphere}
                        position={[bx, 0.64, bz]} scale={[0.025, 0.025, 0.025]}>
                        <meshStandardMaterial color={c} roughness={0.15} metalness={0.1} />
                    </mesh>
                );
            })}

            {/* ── Cue sticks (resting against wall) ── */}
            {[0, 0.15].map((oz, i) => (
                <mesh key={i} geometry={geo.cylinder} material={mat.cue}
                    position={[1.55 + i * 0.1, 0.55, oz]} rotation={[0, 0, 0.15 + i * 0.05]}
                    scale={[0.008, 0.72, 0.008]} />
            ))}
            {/* Cue tips */}
            {[0, 0.15].map((oz, i) => (
                <mesh key={`tip-${i}`} geometry={geo.cylinder}
                    position={[1.55 + i * 0.1, 0.92, oz + (i === 0 ? 0 : 0)]}
                    rotation={[0, 0, 0.15 + i * 0.05]}
                    scale={[0.005, 0.015, 0.005]}>
                    <meshStandardMaterial color="#e0d5c0" roughness={0.3} />
                </mesh>
            ))}

            {/* ── Overhead lamp ── */}
            <group position={[0, 1.6, 0]}>
                <mesh geometry={geo.cone}
                    rotation={[Math.PI, 0, 0]} scale={[0.45, 0.2, 0.45]}>
                    <meshStandardMaterial color="#15803d" roughness={0.5} metalness={0.1} />
                </mesh>
                {/* Inner shade (warm glow) */}
                <mesh geometry={geo.cone}
                    rotation={[Math.PI, 0, 0]} scale={[0.42, 0.18, 0.42]}>
                    <meshStandardMaterial color="#fef9c3" emissive="#fef9c3"
                        emissiveIntensity={0.2} side={THREE.BackSide} />
                </mesh>
                {/* Chain */}
                <mesh geometry={geo.cylinder} material={mat.brass}
                    position={[0, 0.2, 0]} scale={[0.005, 0.2, 0.005]} />
                <pointLight color="#fef9c3" intensity={1.2} distance={3.5} position={[0, -0.15, 0]} />
            </group>
        </group>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── CAFÉ TABLE SET ──────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function CafeTableSet({ position = [0, 0, 0], tableColor = "#c4956a" }) {
    const tMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: tableColor, roughness: 0.4, metalness: 0.05,
    }), [tableColor]);

    return (
        <group position={position}>
            {/* ── Table ── */}
            {/* Tabletop */}
            <mesh geometry={geo.cylinderSmooth} material={tMat}
                position={[0, 0.55, 0]} scale={[0.42, 0.022, 0.42]} />
            {/* Edge banding */}
            <mesh position={[0, 0.55, 0]} scale={[0.43, 0.015, 0.43]}>
                <cylinderGeometry args={[1, 1, 1, 24]} />
                <meshStandardMaterial color="#8b6f47" roughness={0.5} />
            </mesh>
            {/* Pedestal */}
            <mesh geometry={geo.cylinderSmooth} material={mat.brushedSteel}
                position={[0, 0.3, 0]} scale={[0.025, 0.28, 0.025]} />
            {/* Base */}
            <mesh geometry={geo.cylinderSmooth} material={mat.brushedSteel}
                position={[0, 0.06, 0]} scale={[0.16, 0.012, 0.16]} />

            {/* ── Table items ── */}
            {/* Coffee cup 1 */}
            <mesh geometry={geo.cylinder} material={mat.porcelain}
                position={[-0.12, 0.585, 0.05]} scale={[0.02, 0.025, 0.02]} />
            <mesh geometry={geo.cylinder} material={mat.coffee}
                position={[-0.12, 0.6, 0.05]} scale={[0.017, 0.003, 0.017]} />
            {/* Saucer */}
            <mesh geometry={geo.cylinderSmooth} material={mat.porcelain}
                position={[-0.12, 0.563, 0.05]} scale={[0.03, 0.003, 0.03]} />

            {/* Coffee cup 2 */}
            <mesh geometry={geo.cylinder} material={mat.porcelain}
                position={[0.12, 0.585, -0.08]} scale={[0.02, 0.025, 0.02]} />
            <mesh geometry={geo.cylinder} material={mat.coffee}
                position={[0.12, 0.6, -0.08]} scale={[0.017, 0.003, 0.017]} />
            <mesh geometry={geo.cylinderSmooth} material={mat.porcelain}
                position={[0.12, 0.563, -0.08]} scale={[0.03, 0.003, 0.03]} />

            {/* Napkin holder */}
            <mesh geometry={geo.box} material={mat.chrome}
                position={[0, 0.575, 0]} scale={[0.03, 0.03, 0.02]} />

            {/* ── Chairs (2 bistro stools) ── */}
            {[[-0.5, 0], [0.5, 0]].map(([ox, oz], i) => (
                <group key={i} position={[ox, 0, oz]}>
                    {/* Seat pad */}
                    <mesh geometry={geo.cylinderSmooth} material={mat.fabricBlue}
                        position={[0, 0.39, 0]} scale={[0.15, 0.028, 0.15]} />
                    {/* Seat edge ring */}
                    <mesh geometry={geo.cylinderSmooth} material={mat.metalDark}
                        position={[0, 0.38, 0]} scale={[0.152, 0.008, 0.152]} />
                    {/* Backrest (small curved) */}
                    <mesh geometry={geo.cylinder} material={mat.brushedSteel}
                        position={[ox > 0 ? -0.08 : 0.08, 0.55, 0]}
                        rotation={[0, 0, ox > 0 ? 0.15 : -0.15]}
                        scale={[0.005, 0.15, 0.005]} />
                    <mesh geometry={geo.box} material={mat.fabricBlue}
                        position={[ox > 0 ? -0.12 : 0.12, 0.62, 0]}
                        rotation={[0, 0, ox > 0 ? 0.08 : -0.08]}
                        scale={[0.015, 0.1, 0.2]} />
                    {/* Leg */}
                    <mesh geometry={geo.cylinderSmooth} material={mat.brushedSteel}
                        position={[0, 0.2, 0]} scale={[0.015, 0.2, 0.015]} />
                    {/* Base ring */}
                    <mesh geometry={geo.cylinderSmooth} material={mat.brushedSteel}
                        position={[0, 0.03, 0]} scale={[0.1, 0.008, 0.1]} />
                    {/* Footrest ring */}
                    <mesh geometry={geo.cylinderSmooth} material={mat.metalDark}
                        position={[0, 0.15, 0]} scale={[0.08, 0.005, 0.08]} />
                </group>
            ))}
        </group>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── SOFA ────────────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function Sofa({ position = [0, 0, 0], color = "#6366f1" }) {
    const sofaMat = useMemo(() => new THREE.MeshStandardMaterial({
        color, roughness: 0.7, metalness: 0.02,
    }), [color]);

    const darkerColor = useMemo(() => {
        const c = new THREE.Color(color);
        c.multiplyScalar(0.8);
        return new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });
    }, [color]);

    return (
        <group position={position}>
            {/* ── Base frame ── */}
            <mesh geometry={geo.box} material={darkerColor}
                position={[0, 0.12, 0]} scale={[1.25, 0.15, 0.54]} />

            {/* ── Seat cushions (two sections) ── */}
            <mesh geometry={geo.box} material={sofaMat}
                position={[-0.28, 0.24, 0.02]} scale={[0.55, 0.1, 0.46]} />
            <mesh geometry={geo.box} material={sofaMat}
                position={[0.28, 0.24, 0.02]} scale={[0.55, 0.1, 0.46]} />
            {/* Cushion seam */}
            <mesh geometry={geo.box} material={darkerColor}
                position={[0, 0.24, 0.02]} scale={[0.015, 0.09, 0.44]} />

            {/* ── Backrest ── */}
            <mesh geometry={geo.box} material={sofaMat}
                position={[0, 0.4, -0.22]} scale={[1.2, 0.25, 0.1]} />
            {/* Backrest top pillow */}
            <mesh geometry={geo.box} material={sofaMat}
                position={[0, 0.54, -0.22]} scale={[1.15, 0.06, 0.08]} />

            {/* ── Armrests ── */}
            <mesh geometry={geo.box} material={sofaMat}
                position={[-0.58, 0.3, 0]} scale={[0.1, 0.22, 0.52]} />
            <mesh geometry={geo.box} material={sofaMat}
                position={[0.58, 0.3, 0]} scale={[0.1, 0.22, 0.52]} />
            {/* Armrest tops (rounded look) */}
            <mesh geometry={geo.cylinder} material={sofaMat}
                position={[-0.58, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}
                scale={[0.05, 0.52, 0.05]} />
            <mesh geometry={geo.cylinder} material={sofaMat}
                position={[0.58, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}
                scale={[0.05, 0.52, 0.05]} />

            {/* ── Throw pillows ── */}
            <mesh geometry={geo.box}
                position={[-0.4, 0.34, -0.08]} rotation={[0.15, 0.2, 0.1]}
                scale={[0.15, 0.15, 0.06]}>
                <meshStandardMaterial color="#fbbf24" roughness={0.75} />
            </mesh>
            <mesh geometry={geo.box}
                position={[0.35, 0.34, -0.06]} rotation={[-0.1, -0.15, -0.08]}
                scale={[0.14, 0.14, 0.06]}>
                <meshStandardMaterial color="#f472b6" roughness={0.75} />
            </mesh>

            {/* ── Legs ── */}
            {[[-0.52, -0.22], [0.52, -0.22], [-0.52, 0.22], [0.52, 0.22]].map(([x, z], i) => (
                <mesh key={i} geometry={geo.cylinder} material={mat.brushedSteel}
                    position={[x, 0.035, z]} scale={[0.018, 0.065, 0.018]} />
            ))}
        </group>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── GLASS WALL ──────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function GlassWall({ position = [0, 0, 0], rotation = [0, 0, 0], width = 5, height = 2.5, tintColor = "#93c5fd" }) {
    const glassMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: tintColor, transparent: true, opacity: 0.08,
        roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide,
    }), [tintColor]);

    return (
        <group position={position} rotation={rotation}>
            {/* Glass panel */}
            <mesh geometry={geo.plane} material={glassMat}
                position={[0, height / 2, 0]} scale={[width, height, 1]} />
            {/* Frame - top */}
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[0, height, 0]} scale={[width, 0.025, 0.025]} />
            {/* Frame - bottom */}
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[0, 0, 0]} scale={[width, 0.025, 0.025]} />
            {/* Frame - left */}
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[-width / 2, height / 2, 0]} scale={[0.025, height, 0.025]} />
            {/* Frame - right */}
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[width / 2, height / 2, 0]} scale={[0.025, height, 0.025]} />

            {/* Frosted band at bottom (privacy strip) */}
            <mesh geometry={geo.plane}
                position={[0, 0.3, 0.001]} scale={[width - 0.05, 0.6, 1]}>
                <meshStandardMaterial color="#e0f2fe" transparent opacity={0.12}
                    roughness={0.3} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── CEILING LIGHT ───────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function CeilingLight({ position = [0, 3.2, 0], color = "#fef3c7", width = 2 }) {
    return (
        <group position={position}>
            {/* Housing */}
            <mesh geometry={geo.box} material={mat.white}
                scale={[width, 0.035, 0.18]} />
            {/* Diffuser panel */}
            <mesh position={[0, -0.022, 0]}>
                <boxGeometry args={[width * 0.88, 0.012, 0.12]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
            </mesh>
            {/* End caps */}
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[-width / 2, 0, 0]} scale={[0.02, 0.035, 0.18]} />
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[width / 2, 0, 0]} scale={[0.02, 0.035, 0.18]} />
            <pointLight color={color} intensity={0.6} distance={6} position={[0, -0.15, 0]} />
        </group>
    );
}
