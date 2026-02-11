/**
 * PlantModel — Premium potted plant with layered foliage,
 * visible leaf branches, pot rim, decorative pebbles, and gentle sway
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { geo, mat } from "./shared";

export default function PlantModel({ position = [0, 0, 0], scale = 1 }) {
    const fRef = useRef();

    useFrame((state) => {
        if (!fRef.current) return;
        const t = state.clock.elapsedTime;
        fRef.current.rotation.z = Math.sin(t * 0.5) * 0.02;
        fRef.current.rotation.x = Math.cos(t * 0.3) * 0.01;
    });

    return (
        <group position={position} scale={scale}>
            {/* ── Pot body (tapered cylinder) ── */}
            <mesh position={[0, 0.08, 0]} scale={[0.1, 0.12, 0.1]}>
                <cylinderGeometry args={[1, 0.85, 1, 16]} />
                <meshStandardMaterial color="#c87941" roughness={0.65} />
            </mesh>
            {/* Pot rim */}
            <mesh geometry={geo.cylinderSmooth} material={mat.potTerra}
                position={[0, 0.15, 0]} scale={[0.115, 0.015, 0.115]} />
            {/* Inner pot rim shadow */}
            <mesh geometry={geo.cylinderSmooth}
                position={[0, 0.145, 0]} scale={[0.105, 0.005, 0.105]}>
                <meshStandardMaterial color="#a0652e" roughness={0.7} />
            </mesh>

            {/* ── Soil surface ── */}
            <mesh geometry={geo.cylinder} material={mat.soil}
                position={[0, 0.14, 0]} scale={[0.09, 0.006, 0.09]} />

            {/* ── Decorative pebbles ── */}
            {[
                [0.04, 0.148, 0.02], [-0.03, 0.148, 0.05],
                [0.05, 0.148, -0.03], [-0.05, 0.148, -0.02],
                [0, 0.148, -0.05], [0.02, 0.148, 0.06],
            ].map((p, i) => (
                <mesh key={i} geometry={geo.sphere} material={mat.pebble}
                    position={p} scale={[0.012, 0.008, 0.012]} />
            ))}

            {/* ── Trunk (slightly curved) ── */}
            <mesh geometry={geo.cylinder} material={mat.trunk}
                position={[0, 0.22, 0]} scale={[0.018, 0.1, 0.018]} />
            {/* Trunk slight bend */}
            <mesh geometry={geo.cylinder} material={mat.trunk}
                position={[0.01, 0.3, 0]} rotation={[0, 0, 0.1]}
                scale={[0.015, 0.08, 0.015]} />

            {/* ── Branch splits ── */}
            <mesh geometry={geo.cylinder} material={mat.trunk}
                position={[-0.03, 0.36, 0.01]} rotation={[0.1, 0, -0.5]}
                scale={[0.008, 0.06, 0.008]} />
            <mesh geometry={geo.cylinder} material={mat.trunk}
                position={[0.04, 0.38, -0.01]} rotation={[-0.1, 0, 0.4]}
                scale={[0.007, 0.05, 0.007]} />

            {/* ── Animated foliage group ── */}
            <group ref={fRef}>
                {/* Main canopy (large, soft) */}
                <mesh geometry={geo.sphere} material={mat.leafGreen}
                    position={[0, 0.44, 0]} scale={[0.18, 0.2, 0.18]} />
                {/* Secondary canopy clusters */}
                <mesh geometry={geo.sphere} material={mat.darkGreen}
                    position={[0.08, 0.48, 0.05]} scale={[0.12, 0.16, 0.12]} />
                <mesh geometry={geo.sphere} material={mat.leafDark}
                    position={[-0.07, 0.5, -0.04]} scale={[0.1, 0.14, 0.1]} />
                <mesh geometry={geo.sphere} material={mat.green}
                    position={[0.02, 0.54, 0.03]} scale={[0.09, 0.12, 0.09]} />
                {/* Topknot */}
                <mesh geometry={geo.sphere} material={mat.leafGreen}
                    position={[-0.01, 0.58, -0.01]} scale={[0.06, 0.09, 0.06]} />

                {/* ── Individual leaf accents ── */}
                {[
                    { pos: [0.15, 0.42, 0.08], rot: [0, 0.3, -0.3], s: 0.04 },
                    { pos: [-0.14, 0.46, 0.06], rot: [0.2, -0.5, 0.2], s: 0.035 },
                    { pos: [0.1, 0.52, -0.1], rot: [-0.2, 0.4, 0.3], s: 0.03 },
                    { pos: [-0.08, 0.55, 0.08], rot: [0.1, -0.2, -0.4], s: 0.032 },
                ].map(({ pos, rot, s }, i) => (
                    <mesh key={i} geometry={geo.sphere}
                        material={i % 2 === 0 ? mat.green : mat.leafDark}
                        position={pos} rotation={rot}
                        scale={[s * 2, s, s * 1.5]} />
                ))}
            </group>
        </group>
    );
}
