/**
 * ComputerModel — Desktop tower PC with optional dual monitors,
 * RGB lighting, and activity indicators
 * 
 * Variants:
 *   - "tower"    : Full tower PC with side panel window
 *   - "mini"     : Mini ITX compact PC
 *   - "laptop"   : Laptop (open lid)
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { geo, mat } from "./shared";

/* ── Variant-specific sizes ────────────────────────────────────────── */
const VARIANTS = {
    tower: { w: 0.18, h: 0.4, d: 0.35 },
    mini: { w: 0.12, h: 0.16, d: 0.16 },
    laptop: { w: 0.3, h: 0.015, d: 0.22 },
};

export default function ComputerModel({
    position = [0, 0, 0],
    variant = "tower",
    active = false,
    accentColor = "#3b82f6",
    dualMonitor = false,
    rotation = [0, 0, 0],
}) {
    const ledRef = useRef();
    const fan1Ref = useRef();
    const fan2Ref = useRef();
    const screen1Ref = useRef();
    const screen2Ref = useRef();

    const screenMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: active ? "#0a0f1a" : "#1a1f2e",
        emissive: active ? accentColor : "#000",
        emissiveIntensity: active ? 0.5 : 0,
        roughness: 0.9,
    }), [active, accentColor]);

    const rgbMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: active ? 1.2 : 0,
        transparent: true,
        opacity: active ? 0.9 : 0.2,
    }), [active, accentColor]);

    useFrame((state) => {
        if (!active) return;
        const t = state.clock.elapsedTime;

        // LED breathing
        if (ledRef.current) {
            ledRef.current.material.emissiveIntensity = 0.5 + Math.sin(t * 3) * 0.5;
        }
        // Fan rotation
        if (fan1Ref.current) fan1Ref.current.rotation.z = t * 8;
        if (fan2Ref.current) fan2Ref.current.rotation.z = -t * 6;
        // Screen flicker
        if (screen1Ref.current) {
            screen1Ref.current.material.emissiveIntensity = 0.4 + Math.sin(t * 1.5) * 0.1;
        }
        if (screen2Ref.current) {
            screen2Ref.current.material.emissiveIntensity = 0.35 + Math.cos(t * 1.8) * 0.12;
        }
    });

    const v = VARIANTS[variant] || VARIANTS.tower;

    if (variant === "laptop") {
        return (
            <group position={position} rotation={rotation}>
                {/* Base (keyboard half) */}
                <mesh geometry={geo.box} material={mat.metalDark}
                    position={[0, 0.61, 0]} scale={[v.w, v.h, v.d]} />
                {/* Keyboard area */}
                <mesh geometry={geo.box} material={mat.keycap}
                    position={[0, 0.619, -0.02]} scale={[v.w - 0.04, 0.003, v.d * 0.55]} />
                {/* Trackpad */}
                <mesh geometry={geo.box} material={mat.peripheral}
                    position={[0, 0.619, 0.06]} scale={[0.06, 0.002, 0.04]} />
                {/* Screen (tilted back) */}
                <group position={[0, 0.62, -v.d / 2]} rotation={[-0.35, 0, 0]}>
                    <mesh geometry={geo.box} material={mat.screenBezel}
                        position={[0, v.d / 2, -0.005]} scale={[v.w, v.d, 0.008]} />
                    <mesh ref={screen1Ref} geometry={geo.plane} material={screenMat}
                        position={[0, v.d / 2, 0.001]} scale={[v.w - 0.015, v.d - 0.015, 1]} />
                </group>
                {/* Power LED */}
                {active && (
                    <mesh ref={ledRef} geometry={geo.sphere}
                        position={[v.w / 2 - 0.02, 0.618, v.d / 2 - 0.01]}
                        scale={[0.004, 0.004, 0.004]}>
                        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
                    </mesh>
                )}
            </group>
        );
    }

    return (
        <group position={position} rotation={rotation}>
            {/* ═══ TOWER PC ═══ */}
            {/* Main case */}
            <mesh geometry={geo.box} material={mat.metalDark}
                position={[0.55, v.h / 2, -0.15]} scale={[v.w, v.h, v.d]} />
            {/* Front panel (darker) */}
            <mesh geometry={geo.box} material={mat.peripheral}
                position={[0.55, v.h / 2, -0.15 + v.d / 2 + 0.002]}
                scale={[v.w - 0.01, v.h - 0.01, 0.005]} />
            {/* Side panel window (tempered glass) */}
            <mesh geometry={geo.box}
                position={[0.55 - v.w / 2 - 0.002, v.h / 2, -0.15]}
                scale={[0.003, v.h * 0.7, v.d * 0.65]}>
                <meshStandardMaterial
                    color="#1a1a2e" transparent opacity={0.4}
                    roughness={0.05} metalness={0.1} />
            </mesh>
            {/* RGB strip (bottom) */}
            <mesh geometry={geo.box}
                position={[0.55, 0.02, -0.15 + v.d / 2 + 0.004]}
                scale={[v.w - 0.02, 0.008, 0.003]}>
                <primitive object={rgbMat} attach="material" />
            </mesh>
            {/* RGB strip (side) */}
            <mesh geometry={geo.box}
                position={[0.55 - v.w / 2 - 0.003, v.h * 0.15, -0.15]}
                scale={[0.003, 0.008, v.d * 0.5]}>
                <primitive object={rgbMat} attach="material" />
            </mesh>
            {/* Power button */}
            <mesh geometry={geo.cylinder} material={mat.chrome}
                position={[0.55, v.h - 0.03, -0.15 + v.d / 2 + 0.003]}
                rotation={[Math.PI / 2, 0, 0]}
                scale={[0.01, 0.005, 0.01]} />
            {/* Power LED */}
            {active && (
                <mesh ref={ledRef} geometry={geo.sphere}
                    position={[0.55, v.h - 0.06, -0.15 + v.d / 2 + 0.005]}
                    scale={[0.005, 0.005, 0.005]}>
                    <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
                </mesh>
            )}
            {/* Fan vents (front) */}
            {variant === "tower" && (
                <group position={[0.55, v.h * 0.35, -0.15 + v.d / 2 + 0.004]}>
                    <mesh ref={fan1Ref} geometry={geo.cylinder}
                        rotation={[Math.PI / 2, 0, 0]}
                        scale={[0.05, 0.003, 0.05]}>
                        <meshStandardMaterial color="#374151" transparent opacity={0.7} />
                    </mesh>
                    {/* Fan blades (visual) */}
                    {[0, 1, 2, 3].map(i => (
                        <mesh key={i} geometry={geo.box}
                            rotation={[Math.PI / 2, 0, (i / 4) * Math.PI * 2]}
                            position={[0, 0.002, 0]}
                            scale={[0.003, 0.003, 0.04]}>
                            <meshStandardMaterial color="#64748b" />
                        </mesh>
                    ))}
                </group>
            )}
            {/* USB ports (front) */}
            {[0, 1].map(i => (
                <mesh key={`usb-${i}`} geometry={geo.box} material={mat.peripheral}
                    position={[0.55 - 0.02 + i * 0.04, v.h * 0.75, -0.15 + v.d / 2 + 0.004]}
                    scale={[0.015, 0.005, 0.003]} />
            ))}

            {/* ═══ MONITOR 1 (Primary) ═══ */}
            {/* Monitor stand base */}
            <mesh geometry={geo.cylinder} material={mat.brushedSteel}
                position={[-0.15, 0.61, -0.28]} scale={[0.06, 0.005, 0.04]} />
            {/* Monitor stand neck */}
            <mesh geometry={geo.cylinder} material={mat.metalDark}
                position={[-0.15, 0.72, -0.28]} scale={[0.012, 0.2, 0.012]} />
            {/* Monitor bezel */}
            <mesh geometry={geo.box} material={mat.screenBezel}
                position={[dualMonitor ? -0.38 : -0.15, 1.0, -0.25]}
                scale={[dualMonitor ? 0.48 : 0.7, 0.42, 0.018]}
                rotation={[0, dualMonitor ? 0.12 : 0, 0]} />
            {/* Screen surface */}
            <mesh ref={screen1Ref} geometry={geo.plane} material={screenMat}
                position={[dualMonitor ? -0.38 : -0.15, 1.0, dualMonitor ? -0.245 : -0.238]}
                scale={[dualMonitor ? 0.44 : 0.65, 0.37, 1]}
                rotation={[0, dualMonitor ? 0.12 : 0, 0]} />
            {/* Chin LED */}
            {active && (
                <mesh geometry={geo.box}
                    position={[dualMonitor ? -0.38 : -0.15, 0.785, dualMonitor ? -0.245 : -0.238]}
                    scale={[0.12, 0.004, 0.005]}
                    rotation={[0, dualMonitor ? 0.12 : 0, 0]}>
                    <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.8} />
                </mesh>
            )}

            {/* ═══ MONITOR 2 (Secondary, optional) ═══ */}
            {dualMonitor && (
                <>
                    {/* Monitor 2 bezel */}
                    <mesh geometry={geo.box} material={mat.screenBezel}
                        position={[0.1, 1.0, -0.25]}
                        scale={[0.48, 0.42, 0.018]}
                        rotation={[0, -0.12, 0]} />
                    {/* Screen 2 surface */}
                    <mesh ref={screen2Ref} geometry={geo.plane} material={screenMat}
                        position={[0.1, 1.0, -0.245]}
                        scale={[0.44, 0.37, 1]}
                        rotation={[0, -0.12, 0]} />
                    {/* Chin LED 2 */}
                    {active && (
                        <mesh geometry={geo.box}
                            position={[0.1, 0.785, -0.245]}
                            scale={[0.12, 0.004, 0.005]}
                            rotation={[0, -0.12, 0]}>
                            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.8} />
                        </mesh>
                    )}
                </>
            )}
        </group>
    );
}
