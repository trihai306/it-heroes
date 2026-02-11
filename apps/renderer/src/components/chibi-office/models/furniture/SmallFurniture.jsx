/**
 * Small furniture — Premium CoffeeMachine, WaterCooler, Whiteboard,
 * ServerRack, Bookshelf with rich detail
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { geo, mat } from "./shared";

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── COFFEE MACHINE ──────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function CoffeeMachineModel({ position = [0, 0, 0] }) {
    const steamRef = useRef();

    useFrame((state) => {
        if (!steamRef.current) return;
        const t = state.clock.elapsedTime;
        steamRef.current.position.y = 0.72 + Math.sin(t * 3) * 0.02;
        steamRef.current.material.opacity = 0.15 + Math.sin(t * 2) * 0.1;
    });

    return (
        <group position={position}>
            {/* Machine body */}
            <mesh geometry={geo.box} material={mat.metalDark}
                position={[0, 0.3, 0]} scale={[0.32, 0.45, 0.24]} />
            {/* Top section (lighter) */}
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[0, 0.56, 0]} scale={[0.34, 0.08, 0.26]} />
            {/* Bean hopper (top) */}
            <mesh geometry={geo.cylinder} material={mat.peripheral}
                position={[0, 0.64, -0.02]} scale={[0.06, 0.06, 0.06]} />
            {/* Hopper lid */}
            <mesh geometry={geo.cylinder} material={mat.chrome}
                position={[0, 0.68, -0.02]} scale={[0.065, 0.008, 0.065]} />

            {/* Drip tray area */}
            <mesh geometry={geo.box} material={mat.chrome}
                position={[0, 0.1, 0.04]} scale={[0.26, 0.015, 0.16]} />
            {/* Drip tray grid */}
            <mesh geometry={geo.box}
                position={[0, 0.11, 0.04]} scale={[0.22, 0.005, 0.12]}>
                <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} />
            </mesh>

            {/* Dispensing nozzle */}
            <mesh geometry={geo.cylinder} material={mat.chrome}
                position={[0, 0.2, 0.04]} scale={[0.015, 0.06, 0.015]} />
            <mesh geometry={geo.cylinder} material={mat.metalDark}
                position={[0, 0.17, 0.04]} scale={[0.02, 0.008, 0.02]} />

            {/* Control panel area */}
            <mesh geometry={geo.box}
                position={[0, 0.42, 0.125]} scale={[0.2, 0.12, 0.005]}>
                <meshStandardMaterial color="#1e293b" roughness={0.5} />
            </mesh>

            {/* Buttons */}
            {[-0.05, 0, 0.05].map((x, i) => (
                <mesh key={i} geometry={geo.cylinder}
                    position={[x, 0.42, 0.13]} rotation={[Math.PI / 2, 0, 0]}
                    scale={[0.012, 0.005, 0.012]}>
                    <meshStandardMaterial
                        color={["#3b82f6", "#22c55e", "#f59e0b"][i]}
                        emissive={["#3b82f6", "#22c55e", "#f59e0b"][i]}
                        emissiveIntensity={0.8} />
                </mesh>
            ))}

            {/* LED indicator */}
            <mesh geometry={geo.sphere}
                position={[0.12, 0.52, 0.135]} scale={[0.008, 0.008, 0.008]}>
                <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.5} />
            </mesh>

            {/* Steam wisps */}
            <mesh ref={steamRef} geometry={geo.sphere}
                position={[0, 0.72, 0.04]} scale={[0.04, 0.06, 0.02]}>
                <meshStandardMaterial color="#ffffff" transparent opacity={0.15} />
            </mesh>

            {/* Waiting cup */}
            <mesh geometry={geo.cylinder} material={mat.porcelain}
                position={[0, 0.12, 0.04]} scale={[0.018, 0.025, 0.018]} />
        </group>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── WATER COOLER ────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function WaterCoolerModel({ position = [0, 0, 0] }) {
    const bubbleRef = useRef();

    useFrame((state) => {
        if (!bubbleRef.current) return;
        const t = state.clock.elapsedTime;
        bubbleRef.current.position.y = 0.52 + ((t * 0.3) % 0.2);
        bubbleRef.current.scale.setScalar(0.004 + Math.sin(t * 5) * 0.002);
    });

    return (
        <group position={position}>
            {/* Base cabinet */}
            <mesh geometry={geo.box} material={mat.white}
                position={[0, 0.18, 0]} scale={[0.24, 0.28, 0.22]} />
            {/* Main body */}
            <mesh geometry={geo.box} material={mat.offWhite}
                position={[0, 0.42, 0]} scale={[0.24, 0.2, 0.22]} />

            {/* Dispensing area (recessed) */}
            <mesh geometry={geo.box}
                position={[0, 0.34, 0.1]} scale={[0.18, 0.08, 0.04]}>
                <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
            </mesh>

            {/* Hot/Cold taps */}
            <mesh geometry={geo.cylinder} material={mat.chrome}
                position={[-0.05, 0.38, 0.12]} rotation={[Math.PI / 2, 0, 0]}
                scale={[0.008, 0.02, 0.008]} />
            <mesh geometry={geo.cylinder} material={mat.chrome}
                position={[0.05, 0.38, 0.12]} rotation={[Math.PI / 2, 0, 0]}
                scale={[0.008, 0.02, 0.008]} />
            {/* Hot label (red) */}
            <mesh geometry={geo.sphere}
                position={[-0.05, 0.4, 0.125]} scale={[0.006, 0.006, 0.006]}>
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
            </mesh>
            {/* Cold label (blue) */}
            <mesh geometry={geo.sphere}
                position={[0.05, 0.4, 0.125]} scale={[0.006, 0.006, 0.006]}>
                <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
            </mesh>

            {/* Drip tray */}
            <mesh geometry={geo.box} material={mat.chrome}
                position={[0, 0.3, 0.1]} scale={[0.14, 0.008, 0.04]} />

            {/* Water bottle */}
            <mesh position={[0, 0.62, 0]} scale={[0.065, 0.18, 0.065]}>
                <cylinderGeometry args={[1, 1, 1, 16]} />
                <meshStandardMaterial color="#bfdbfe" transparent opacity={0.35} roughness={0.08} />
            </mesh>
            {/* Bottle neck */}
            <mesh geometry={geo.cylinderSmooth}
                position={[0, 0.52, 0]} scale={[0.03, 0.015, 0.03]}>
                <meshStandardMaterial color="#93c5fd" transparent opacity={0.4} roughness={0.1} />
            </mesh>
            {/* Bottle cap */}
            <mesh geometry={geo.cylinderSmooth} material={mat.white}
                position={[0, 0.72, 0]} scale={[0.04, 0.008, 0.04]} />

            {/* Animated bubble */}
            <mesh ref={bubbleRef} geometry={geo.sphere}
                position={[0.01, 0.55, 0]} scale={[0.004, 0.004, 0.004]}>
                <meshStandardMaterial color="#dbeafe" transparent opacity={0.6} />
            </mesh>

            {/* Cup holder (side) */}
            <mesh geometry={geo.box} material={mat.chrome}
                position={[0.13, 0.44, 0]} scale={[0.02, 0.03, 0.1]} />
            {/* Stacked cups */}
            <mesh geometry={geo.cylinder} material={mat.white}
                position={[0.16, 0.44, 0]} scale={[0.015, 0.025, 0.015]} />
        </group>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── WHITEBOARD / PLANNING BOARD ────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function WhiteboardModel({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
    return (
        <group position={position} rotation={rotation}>
            {/* ── Easel-style A-frame legs ── */}
            {/* Front legs (V-shape) */}
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[-0.55, 0.55, 0.18]} rotation={[0.15, 0, 0.04]}
                scale={[0.025, 1.1, 0.025]} />
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[0.55, 0.55, 0.18]} rotation={[0.15, 0, -0.04]}
                scale={[0.025, 1.1, 0.025]} />
            {/* Back support leg */}
            <mesh geometry={geo.box} material={mat.metalDark}
                position={[0, 0.45, -0.25]} rotation={[-0.3, 0, 0]}
                scale={[0.02, 0.9, 0.02]} />
            {/* Cross brace */}
            <mesh geometry={geo.box} material={mat.metalDark}
                position={[0, 0.2, 0.08]} scale={[1.0, 0.018, 0.018]} />

            {/* ── Main board surface ── */}
            <mesh geometry={geo.box} material={mat.whiteboard}
                position={[0, 1.05, 0]} scale={[1.4, 0.9, 0.02]} />

            {/* ── Premium aluminum frame ── */}
            {/* Top frame */}
            <mesh geometry={geo.box} material={mat.chrome}
                position={[0, 1.505, 0]} scale={[1.45, 0.03, 0.035]} />
            {/* Bottom frame */}
            <mesh geometry={geo.box} material={mat.chrome}
                position={[0, 0.595, 0]} scale={[1.45, 0.03, 0.035]} />
            {/* Left frame */}
            <mesh geometry={geo.box} material={mat.chrome}
                position={[-0.72, 1.05, 0]} scale={[0.03, 0.92, 0.035]} />
            {/* Right frame */}
            <mesh geometry={geo.box} material={mat.chrome}
                position={[0.72, 1.05, 0]} scale={[0.03, 0.92, 0.035]} />

            {/* ── Kanban column dividers ── */}
            {[-0.23, 0.23].map((x, i) => (
                <mesh key={i} geometry={geo.box}
                    position={[x, 1.05, 0.012]} scale={[0.004, 0.8, 0.001]}>
                    <meshStandardMaterial color="#cbd5e1" />
                </mesh>
            ))}

            {/* ── Column headers (To Do / In Progress / Done) ── */}
            {[
                { x: -0.47, color: "#ef4444" },  // To Do — red
                { x: 0, color: "#f59e0b" },       // In Progress — amber
                { x: 0.47, color: "#22c55e" },    // Done — green
            ].map(({ x, color }, i) => (
                <mesh key={i} geometry={geo.box}
                    position={[x, 1.42, 0.012]} scale={[0.4, 0.06, 0.002]}>
                    <meshStandardMaterial color={color} roughness={0.6} />
                </mesh>
            ))}

            {/* ── Sticky notes — To Do column ── */}
            {[
                { y: 1.28, mat: mat.stickyYellow, rot: 0.03 },
                { y: 1.12, mat: mat.stickyPink, rot: -0.02 },
                { y: 0.96, mat: mat.stickyBlue, rot: 0.01 },
                { y: 0.80, mat: mat.stickyYellow, rot: -0.04 },
            ].map(({ y, mat: m, rot }, i) => (
                <mesh key={`td-${i}`} geometry={geo.box} material={m}
                    position={[-0.47, y, 0.013]} rotation={[0, 0, rot]}
                    scale={[0.14, 0.1, 0.002]} />
            ))}

            {/* ── Sticky notes — In Progress column ── */}
            {[
                { y: 1.28, mat: mat.stickyPink, rot: -0.03 },
                { y: 1.12, mat: mat.stickyYellow, rot: 0.02 },
            ].map(({ y, mat: m, rot }, i) => (
                <mesh key={`ip-${i}`} geometry={geo.box} material={m}
                    position={[0, y, 0.013]} rotation={[0, 0, rot]}
                    scale={[0.14, 0.1, 0.002]} />
            ))}

            {/* ── Sticky notes — Done column ── */}
            {[
                { y: 1.28, mat: mat.stickyBlue, rot: 0.02 },
            ].map(({ y, mat: m, rot }, i) => (
                <mesh key={`d-${i}`} geometry={geo.box} material={m}
                    position={[0.47, y, 0.013]} rotation={[0, 0, rot]}
                    scale={[0.14, 0.1, 0.002]} />
            ))}

            {/* ── Marker tray (bottom ledge) ── */}
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[0, 0.58, 0.04]} scale={[0.8, 0.018, 0.05]} />
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[0, 0.605, 0.065]} scale={[0.8, 0.03, 0.008]} />

            {/* Markers in tray */}
            {[
                { x: -0.18, color: "#ef4444" },
                { x: -0.08, color: "#3b82f6" },
                { x: 0.02, color: "#22c55e" },
                { x: 0.12, color: "#f59e0b" },
                { x: 0.22, color: "#8b5cf6" },
            ].map(({ x, color }, i) => (
                <mesh key={i} geometry={geo.cylinder}
                    position={[x, 0.595, 0.04]} rotation={[0, 0, Math.PI / 2]}
                    scale={[0.007, 0.065, 0.007]}>
                    <meshStandardMaterial color={color} />
                </mesh>
            ))}

            {/* Eraser */}
            <mesh geometry={geo.box}
                position={[0.32, 0.595, 0.04]} scale={[0.06, 0.016, 0.03]}>
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
        </group>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── SERVER RACK ─────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function ServerRackModel({ position = [0, 0, 0] }) {
    const ledsRef = useRef([]);
    const fanRef = useRef();

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        ledsRef.current.forEach((led, i) => {
            if (led) led.material.emissiveIntensity = 0.4 + Math.sin(t * 4 + i * 1.8) * 0.5;
        });
        if (fanRef.current) {
            fanRef.current.rotation.z = t * 8;
        }
    });

    return (
        <group position={position}>
            {/* Main rack body */}
            <mesh geometry={geo.box} material={mat.rackBody}
                position={[0, 0.6, 0]} scale={[0.48, 1.2, 0.32]} />

            {/* Front panel frame */}
            <mesh geometry={geo.box} material={mat.brushedSteel}
                position={[0, 0.6, 0.165]} scale={[0.5, 1.22, 0.005]} />

            {/* ── Rack units (5U) ── */}
            {[0.22, 0.42, 0.62, 0.82, 1.02].map((y, i) => (
                <group key={i}>
                    {/* Unit face plate */}
                    <mesh geometry={geo.box} material={mat.rackUnit}
                        position={[0, y, 0.16]} scale={[0.42, 0.14, 0.015]} />

                    {/* Ventilation slits */}
                    {[-0.1, -0.05, 0, 0.05, 0.1].map((x, j) => (
                        <mesh key={j} geometry={geo.box} material={mat.rackVent}
                            position={[x, y, 0.17]} scale={[0.02, 0.08, 0.003]} />
                    ))}

                    {/* Status LED */}
                    <mesh ref={el => ledsRef.current[i] = el}
                        geometry={geo.sphere}
                        position={[0.18, y, 0.175]} scale={[0.006, 0.006, 0.006]}>
                        <meshStandardMaterial
                            color={["#22c55e", "#818cf8", "#fbbf24", "#22c55e", "#fb7185"][i]}
                            emissive={["#22c55e", "#818cf8", "#fbbf24", "#22c55e", "#fb7185"][i]}
                            emissiveIntensity={0.5} />
                    </mesh>

                    {/* Activity LED (secondary) */}
                    <mesh geometry={geo.sphere}
                        position={[0.18, y + 0.035, 0.175]} scale={[0.004, 0.004, 0.004]}>
                        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
                    </mesh>

                    {/* Rack ear screws */}
                    {[-0.19, 0.19].map((x, j) => (
                        <mesh key={j} geometry={geo.cylinder} material={mat.chrome}
                            position={[x, y, 0.17]} rotation={[Math.PI / 2, 0, 0]}
                            scale={[0.005, 0.005, 0.005]} />
                    ))}
                </group>
            ))}

            {/* ── Top exhaust fan ── */}
            <group ref={fanRef} position={[0, 1.18, 0.17]}>
                {[0, 1, 2, 3].map(i => (
                    <mesh key={i} geometry={geo.box}
                        position={[0, 0, 0]}
                        rotation={[0, 0, (i / 4) * Math.PI * 2]}
                        scale={[0.06, 0.005, 0.005]}>
                        <meshStandardMaterial color="#64748b" metalness={0.3} />
                    </mesh>
                ))}
            </group>
            {/* Fan housing */}
            <mesh geometry={geo.cylinderSmooth}
                position={[0, 1.18, 0.17]} rotation={[Math.PI / 2, 0, 0]}
                scale={[0.04, 0.006, 0.04]}>
                <meshStandardMaterial color="#475569" metalness={0.4} roughness={0.4} />
            </mesh>

            {/* ── Cable management (back) ── */}
            {[-0.12, 0, 0.12].map((x, i) => (
                <mesh key={i} geometry={geo.cylinder} material={mat.peripheral}
                    position={[x, 0.5, -0.17]} scale={[0.008, 0.8, 0.008]} />
            ))}

            {/* ── Power strip (back bottom) ── */}
            <mesh geometry={geo.box} material={mat.metalDark}
                position={[0, 0.08, -0.14]} scale={[0.35, 0.04, 0.04]} />
        </group>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── BOOKSHELF ───────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════ */
/* ─── BOOKSHELF (PREMIUM) ─────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ */
export function BookshelfModel({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
    return (
        <group position={position} rotation={rotation}>
            {/* ── Main Frame ── */}
            {/* Back panel (dark wood) */}
            <mesh geometry={geo.box} material={mat.woodWalnut}
                position={[0, 1.0, -0.15]} scale={[1.2, 2.0, 0.02]} />

            {/* Side panels (thick) */}
            <mesh geometry={geo.box} material={mat.woodDark}
                position={[-0.62, 1.0, 0]} scale={[0.04, 2.0, 0.35]} />
            <mesh geometry={geo.box} material={mat.woodDark}
                position={[0.62, 1.0, 0]} scale={[0.04, 2.0, 0.35]} />

            {/* Top / Bottom / Base */}
            <mesh geometry={geo.box} material={mat.woodDark}
                position={[0, 2.02, 0]} scale={[1.28, 0.04, 0.35]} />
            <mesh geometry={geo.box} material={mat.woodDark}
                position={[0, 0.05, 0]} scale={[1.28, 0.1, 0.35]} />

            {/* ── Shelves (5 tiers) ── */}
            {[0.4, 0.8, 1.2, 1.6].map((y, i) => (
                <mesh key={i} geometry={geo.box} material={mat.woodDark}
                    position={[0, y, 0]} scale={[1.2, 0.02, 0.32]} />
            ))}

            {/* ── Shelf Content ── */}

            {/* Shelf 1 (Bottom) - Heavy Binders */}
            {[-0.5, -0.38, -0.26, -0.14].map((x, i) => (
                <mesh key={`b1-${i}`} geometry={geo.box} material={mat.rackBody}
                    position={[x, 0.24, 0]} scale={[0.1, 0.35, 0.26]} />
            ))}
            {/* Storage Box */}
            <mesh geometry={geo.box} material={mat.cardboard || mat.wood}
                position={[0.3, 0.22, 0]} scale={[0.4, 0.3, 0.28]} />

            {/* Shelf 2 - Books + Decor */}
            {Array.from({ length: 8 }, (_, i) => (
                <mesh key={`b2-${i}`} geometry={geo.box}
                    material={mat.bookColors[i % mat.bookColors.length]}
                    position={[-0.5 + i * 0.08, 0.6, 0]}
                    scale={[0.05 + Math.random() * 0.02, 0.2 + Math.random() * 0.1, 0.24]} />
            ))}
            {/* Decorative Pyramid */}
            <mesh geometry={geo.cylinder} material={mat.brass}
                position={[0.4, 0.55, 0]} scale={[0.1, 0.15, 0.1]} />

            {/* Shelf 3 - Sparse Books + Leaning */}
            <mesh geometry={geo.box} material={mat.bookColors[0]}
                position={[-0.4, 1.0, 0]} rotation={[0, 0, 0.2]}
                scale={[0.06, 0.28, 0.24]} />
            <mesh geometry={geo.box} material={mat.bookColors[1]}
                position={[-0.3, 0.95, 0]}
                scale={[0.06, 0.28, 0.24]} />
            {/* Horizontal Stack */}
            <mesh geometry={geo.box} material={mat.bookColors[2]}
                position={[0.3, 0.84, 0]} scale={[0.3, 0.05, 0.24]} />
            <mesh geometry={geo.box} material={mat.bookColors[3]}
                position={[0.3, 0.89, 0]} scale={[0.25, 0.05, 0.22]} />

            {/* Shelf 4 - High Row of Books */}
            {Array.from({ length: 12 }, (_, i) => (
                <mesh key={`b4-${i}`} geometry={geo.box}
                    material={mat.bookColors[(i + 3) % mat.bookColors.length]}
                    position={[-0.5 + i * 0.09, 1.4, 0]}
                    scale={[0.06, 0.25, 0.24]} />
            ))}

            {/* Shelf 5 (Top) - Plant + Trophy */}
            <group position={[-0.4, 1.75, 0]}>
                {/* Plant Pot */}
                <mesh geometry={geo.cylinder} material={mat.white}
                    position={[0, 0, 0]} scale={[0.1, 0.12, 0.1]} />
                {/* Plant Leaves */}
                <mesh geometry={geo.sphere} material={mat.foliage || mat.leafGreen}
                    position={[0, 0.15, 0]} scale={[0.18, 0.18, 0.18]} />
            </group>

            <mesh geometry={geo.cylinder} material={mat.brass}
                position={[0.3, 1.75, 0]} scale={[0.08, 0.2, 0.08]} />
        </group>
    );
}
