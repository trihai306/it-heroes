/**
 * GLBWorkstation — Loads the desk.glb model as a workstation decoration
 * 
 * The GLB (from r3f-journey-levels) contains:
 *   Cactus, Camera, Level, Pyramid, Sudo, SudoHead, React
 * 
 * The scene's nodes have a 90° X rotation in the GLB, so we counter-rotate
 * to stand it upright. Scale is adjusted for the chibi office proportions.
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Preload
useGLTF.preload("/office/desk.glb");

export default function GLBWorkstation({
    position = [0, 0, 0],
    scale = 1,
    active = false,
    accentColor = "#3b82f6",
    rotation = [0, 0, 0],
}) {
    const groupRef = useRef();
    const { scene } = useGLTF("/office/desk.glb");

    // Clone the scene so each instance is independent
    const clonedScene = useMemo(() => {
        const clone = scene.clone(true);
        clone.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone();
                child.castShadow = false;
                child.receiveShadow = true;
            }
        });
        return clone;
    }, [scene]);

    // Subtle hover animation when active
    useFrame((state) => {
        if (!groupRef.current) return;
        if (active) {
            const t = state.clock.elapsedTime;
            groupRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.02;
        }
    });

    return (
        <group
            ref={groupRef}
            position={position}
            rotation={rotation}
        >
            {/* Counter-rotate -90° on X to stand the model upright,
                since GLB nodes all have a 90° X rotation baked in */}
            <group rotation={[-Math.PI / 2, 0, 0]} scale={[scale, scale, scale]}>
                <primitive object={clonedScene} />
            </group>

            {/* Active glow platform under the workstation */}
            {active && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
                    <circleGeometry args={[0.8, 24]} />
                    <meshBasicMaterial
                        color={accentColor}
                        transparent
                        opacity={0.2}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
        </group>
    );
}
