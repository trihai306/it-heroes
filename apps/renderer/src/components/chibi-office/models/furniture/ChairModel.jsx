/**
 * ChairModel — Premium ergonomic office chair with mesh back,
 * armrests, headrest, and gas-lift cylinder
 */
import { useMemo } from "react";
import * as THREE from "three";
import { geo, mat } from "./shared";

export default function ChairModel({ position = [0, 0, 0], color = "#4b5563" }) {
    const seatMat = useMemo(() => new THREE.MeshStandardMaterial({
        color, roughness: 0.75, metalness: 0.02,
    }), [color]);

    const meshBackMat = useMemo(() => new THREE.MeshStandardMaterial({
        color, roughness: 0.85, metalness: 0.02, transparent: true, opacity: 0.9,
    }), [color]);

    return (
        <group position={position}>
            {/* ── Seat cushion (contoured) ── */}
            <mesh geometry={geo.box} material={seatMat}
                position={[0, 0.37, 0.02]} scale={[0.4, 0.06, 0.38]} />
            {/* Seat front curve */}
            <mesh geometry={geo.cylinder} material={seatMat}
                position={[0, 0.37, 0.21]} rotation={[0, 0, Math.PI / 2]}
                scale={[0.03, 0.4, 0.03]} />

            {/* ── Backrest (mesh-style) ── */}
            {/* Main back panel */}
            <mesh geometry={geo.box} material={meshBackMat}
                position={[0, 0.58, -0.17]} scale={[0.36, 0.36, 0.025]} />
            {/* Back frame */}
            <mesh geometry={geo.box} material={mat.metalDark}
                position={[0, 0.58, -0.185]} scale={[0.38, 0.38, 0.01]} />
            {/* Lumbar support curve */}
            <mesh geometry={geo.cylinder} material={seatMat}
                position={[0, 0.45, -0.155]} rotation={[0, 0, Math.PI / 2]}
                scale={[0.025, 0.3, 0.025]} />

            {/* ── Headrest ── */}
            <mesh geometry={geo.box} material={seatMat}
                position={[0, 0.83, -0.17]} scale={[0.2, 0.08, 0.03]} />
            {/* Headrest arm */}
            <mesh geometry={geo.cylinder} material={mat.metalDark}
                position={[0, 0.79, -0.17]} scale={[0.008, 0.04, 0.008]} />

            {/* ── Armrests ── */}
            {[-1, 1].map(side => (
                <group key={side}>
                    {/* Arm support bracket */}
                    <mesh geometry={geo.box} material={mat.metalDark}
                        position={[side * 0.2, 0.42, -0.04]} scale={[0.02, 0.1, 0.02]} />
                    {/* Arm pad */}
                    <mesh geometry={geo.box} material={seatMat}
                        position={[side * 0.2, 0.48, 0]} scale={[0.04, 0.015, 0.18]} />
                    {/* Arm pad front cap */}
                    <mesh geometry={geo.cylinder} material={seatMat}
                        position={[side * 0.2, 0.48, 0.09]} rotation={[0, 0, Math.PI / 2]}
                        scale={[0.007, 0.04, 0.007]} />
                </group>
            ))}

            {/* ── Gas lift cylinder ── */}
            <mesh geometry={geo.cylinderSmooth} material={mat.chrome}
                position={[0, 0.26, 0]} scale={[0.025, 0.08, 0.025]} />
            {/* Cylinder housing */}
            <mesh geometry={geo.cylinderSmooth} material={mat.metalDark}
                position={[0, 0.2, 0]} scale={[0.03, 0.04, 0.03]} />

            {/* ── 5-star base ── */}
            <mesh geometry={geo.cylinderSmooth} material={mat.brushedSteel}
                position={[0, 0.06, 0]} scale={[0.04, 0.015, 0.04]} />
            {[0, 1, 2, 3, 4].map(i => {
                const a = (i / 5) * Math.PI * 2;
                const r = 0.14;
                return (
                    <group key={i}>
                        {/* Star arm */}
                        <mesh geometry={geo.box} material={mat.brushedSteel}
                            position={[Math.cos(a) * r * 0.5, 0.05, Math.sin(a) * r * 0.5]}
                            rotation={[0, -a, 0]}
                            scale={[0.02, 0.018, r]} />
                        {/* Caster wheel */}
                        <mesh geometry={geo.sphere} material={mat.metalDark}
                            position={[Math.cos(a) * r, 0.018, Math.sin(a) * r]}
                            scale={[0.02, 0.018, 0.02]} />
                        {/* Caster housing */}
                        <mesh geometry={geo.cylinder} material={mat.brushedSteel}
                            position={[Math.cos(a) * r, 0.035, Math.sin(a) * r]}
                            scale={[0.012, 0.015, 0.012]} />
                    </group>
                );
            })}

            {/* ── Tilt mechanism ── */}
            <mesh geometry={geo.box} material={mat.metalDark}
                position={[0, 0.32, 0]} scale={[0.12, 0.018, 0.08]} />
        </group>
    );
}
