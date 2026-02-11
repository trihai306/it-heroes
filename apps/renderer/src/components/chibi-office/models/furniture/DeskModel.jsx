/**
 * DeskModel — Premium L-shaped office desk with monitor arm,
 * drawer cabinet, cable tray, and desk accessories
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { geo, mat } from "./shared";

export default function DeskModel({ position = [0, 0, 0], active = false, accentColor = "#3b82f6" }) {
    const screenRef = useRef();

    const screenMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: active ? "#0f172a" : "#1e293b",
        emissive: active ? accentColor : "#000",
        emissiveIntensity: active ? 0.6 : 0,
        roughness: 0.9,
    }), [active, accentColor]);

    useFrame((state) => {
        if (!active || !screenRef.current) return;
        const t = state.clock.elapsedTime;
        screenRef.current.material.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.15;
    });

    return (
        <group position={position}>
            {/* ── Main desk top (thick with edge banding) ── */}
            <mesh geometry={geo.box} material={mat.woodMaple}
                position={[0, 0.58, 0]} scale={[1.5, 0.05, 0.75]} />
            {/* Front edge banding (darker accent) */}
            <mesh geometry={geo.box} material={mat.woodDark}
                position={[0, 0.58, 0.375]} scale={[1.5, 0.05, 0.015]} />
            {/* Left edge banding */}
            <mesh geometry={geo.box} material={mat.woodDark}
                position={[-0.75, 0.58, 0]} scale={[0.015, 0.05, 0.75]} />
            {/* Right edge banding */}
            <mesh geometry={geo.box} material={mat.woodDark}
                position={[0.75, 0.58, 0]} scale={[0.015, 0.05, 0.75]} />

            {/* ── Metal frame legs (T-shaped) ── */}
            {/* Left T-leg */}
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[-0.65, 0.29, 0]} scale={[0.035, 0.56, 0.04]} />
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[-0.65, 0.015, 0]} scale={[0.035, 0.025, 0.55]} />
            {/* Right T-leg */}
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[0.65, 0.29, 0]} scale={[0.035, 0.56, 0.04]} />
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[0.65, 0.015, 0]} scale={[0.035, 0.025, 0.55]} />
            {/* Cross brace */}
            <mesh geometry={geo.box} material={mat.metalDark}
                position={[0, 0.08, 0]} scale={[1.25, 0.02, 0.025]} />

            {/* ── Cable management tray ── */}
            <mesh geometry={geo.box} material={mat.metalDark}
                position={[0, 0.5, -0.2]} scale={[0.6, 0.015, 0.15]} />
            <mesh geometry={geo.box} material={mat.metalDark}
                position={[0, 0.52, -0.275]} scale={[0.6, 0.05, 0.01]} />

            {/* ── Drawer cabinet (right side) ── */}
            <mesh geometry={geo.box} material={mat.white}
                position={[0.42, 0.35, 0.05]} scale={[0.35, 0.44, 0.52]} />
            {/* Drawer fronts (3 drawers) */}
            {[0.17, 0.35, 0.53].map((y, i) => (
                <group key={i}>
                    <mesh geometry={geo.box} material={mat.offWhite}
                        position={[0.42, y, 0.315]} scale={[0.32, 0.12, 0.01]} />
                    {/* Drawer handle */}
                    <mesh geometry={geo.cylinder} material={mat.chrome}
                        position={[0.42, y, 0.33]} rotation={[0, 0, Math.PI / 2]}
                        scale={[0.008, 0.08, 0.008]} />
                </group>
            ))}

            {/* ── Monitor arm ── */}
            {/* Clamp on desk edge */}
            <mesh geometry={geo.box} material={mat.metalDark}
                position={[-0.15, 0.6, -0.35]} scale={[0.06, 0.04, 0.04]} />
            {/* Vertical arm */}
            <mesh geometry={geo.cylinder} material={mat.metalDark}
                position={[-0.15, 0.82, -0.35]} scale={[0.018, 0.42, 0.018]} />
            {/* Horizontal arm */}
            <mesh geometry={geo.box} material={mat.metalDark}
                position={[-0.15, 1.03, -0.28]} scale={[0.025, 0.025, 0.16]} />
            {/* Arm joint */}
            <mesh geometry={geo.sphere} material={mat.chrome}
                position={[-0.15, 1.03, -0.35]} scale={[0.02, 0.02, 0.02]} />

            {/* ── Monitor (ultra-thin bezel) ── */}
            {/* Bezel */}
            <mesh geometry={geo.box} material={mat.screenBezel}
                position={[-0.15, 1.05, -0.2]} scale={[0.92, 0.54, 0.018]} />
            {/* Screen panel */}
            <mesh ref={screenRef} geometry={geo.plane} material={screenMat}
                position={[-0.15, 1.05, -0.188]} scale={[0.86, 0.48, 1]} />
            {/* Chin (bottom bezel accent) */}
            <mesh geometry={geo.box}
                position={[-0.15, 0.78, -0.2]} scale={[0.92, 0.008, 0.018]}>
                <meshStandardMaterial color={active ? accentColor : "#374151"} />
            </mesh>

            {/* ── Keyboard (mechanical) ── */}
            <mesh geometry={geo.box} material={mat.peripheral}
                position={[-0.15, 0.613, 0.1]} scale={[0.42, 0.018, 0.14]} />
            {/* Keycap rows */}
            {[-0.05, 0.01, 0.07, 0.13].map((oz, ri) => (
                <mesh key={ri} geometry={geo.box} material={mat.keycap}
                    position={[-0.15, 0.625, oz + 0.04]}
                    scale={[0.38, 0.008, 0.022]} />
            ))}
            {/* Spacebar */}
            <mesh geometry={geo.box} material={mat.keycap}
                position={[-0.15, 0.625, 0.168]} scale={[0.15, 0.008, 0.02]} />

            {/* ── Mouse + mousepad ── */}
            <mesh geometry={geo.box} material={mat.peripheral}
                position={[0.12, 0.605, 0.12]} scale={[0.2, 0.004, 0.22]}>
                <meshStandardMaterial color="#1a1a2e" roughness={0.8} />
            </mesh>
            <mesh geometry={geo.box} material={mat.peripheral}
                position={[0.12, 0.615, 0.1]} scale={[0.04, 0.018, 0.06]}
                rotation={[0.05, 0, 0]} />

            {/* ── Coffee mug ── */}
            <mesh geometry={geo.cylinder} material={mat.porcelain}
                position={[-0.55, 0.625, 0.2]} scale={[0.025, 0.035, 0.025]} />
            {/* Mug handle */}
            <mesh geometry={geo.torus} material={mat.porcelain}
                position={[-0.575, 0.625, 0.2]} rotation={[0, Math.PI / 2, 0]}
                scale={[0.012, 0.012, 0.012]} />
            {/* Coffee surface */}
            <mesh geometry={geo.cylinder} material={mat.coffee}
                position={[-0.55, 0.643, 0.2]} scale={[0.022, 0.003, 0.022]} />

            {/* ── Pen holder ── */}
            <mesh geometry={geo.cylinder} material={mat.metalDark}
                position={[0.55, 0.62, -0.08]} scale={[0.022, 0.04, 0.022]} />
            {/* Pens */}
            <mesh geometry={geo.cylinder}
                position={[0.55, 0.66, -0.085]} rotation={[0, 0, 0.08]}
                scale={[0.003, 0.05, 0.003]}>
                <meshStandardMaterial color="#3b82f6" />
            </mesh>
            <mesh geometry={geo.cylinder}
                position={[0.545, 0.66, -0.075]} rotation={[0, 0, -0.06]}
                scale={[0.003, 0.045, 0.003]}>
                <meshStandardMaterial color="#ef4444" />
            </mesh>

            {/* ── Power LED (active indicator) ── */}
            {active && (
                <mesh geometry={geo.sphere}
                    position={[-0.59, 1.3, -0.2]} scale={[0.008, 0.008, 0.008]}>
                    <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2} />
                </mesh>
            )}

            {/* ── Desk lamp (small, on right side) ── */}
            <mesh geometry={geo.cylinder} material={mat.chrome}
                position={[-0.58, 0.62, -0.15]} scale={[0.04, 0.008, 0.04]} />
            <mesh geometry={geo.cylinder} material={mat.chrome}
                position={[-0.58, 0.72, -0.15]} scale={[0.005, 0.1, 0.005]} />
            <mesh geometry={geo.cylinder} material={mat.chrome}
                position={[-0.58, 0.78, -0.12]} rotation={[0.5, 0, 0]}
                scale={[0.005, 0.08, 0.005]} />
            <mesh geometry={geo.cone}
                position={[-0.58, 0.82, -0.08]} rotation={[0.3, 0, 0]}
                scale={[0.03, 0.04, 0.03]}>
                <meshStandardMaterial color="#fef3c7" emissive="#fef9c3"
                    emissiveIntensity={active ? 0.3 : 0} roughness={0.4} />
            </mesh>
        </group>
    );
}
