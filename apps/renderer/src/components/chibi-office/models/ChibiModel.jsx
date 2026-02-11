/**
 * ChibiModel — Premium 3D vinyl-figurine chibi character
 * 
 * Design: Studio-grade collectible figurine aesthetic.
 *   - Oversized round head (~2.5:1 ratio)
 *   - Detailed hands with individual fingers
 *   - Multi-layer volumetric hair with shine streaks
 *   - Big glossy anime eyes with tri-layer iris + eyelashes
 *   - MeshPhysicalMaterial with clearcoat & sheen (clay/wax feel)
 *   - Clothing details: sleeves, collar, belt, pockets, wrinkles
 *   - Role-specific accessories (glasses, crown, badge, etc.)
 *   - Rim-light backlit effect for depth
 *   - Premium pill-shaped name tag with gradient
 * 
 * Performance: shared geometries, single useFrame, ref mutation.
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import useAgentStore from "@/stores/useAgentStore";

/* ─── Role color palettes ────────────────────────────────────────── */
const ROLE_COLORS = {
    lead: { // DIRECTOR LOOK (Navy Suit + Red Tie)
        hair: "#3E2723", hairDark: "#2D1B18", hairHighlight: "#5D4037",
        shirt: "#1A237E", shirtDark: "#121858", shirtLight: "#283593", // Navy Suit Jacket
        pants: "#1A237E", pantsShade: "#121858", // Navy Pants
        skin: "#FFE0BD", skinDark: "#F5CCA0", skinLight: "#FFF0E0", // Fair Skin
        accent: "#D32F2F", // Red Tie
        eye: "#121212", eyeLight: "#333333", // Black Eyes
        shoeColor: "#121212", shoeAccent: "#1A237E", // Black Shoes
        accessory: "#121212", // Black Glasses
    },
    backend: {
        hair: "#1e1b3a", hairDark: "#12102a", hairHighlight: "#505080",
        shirt: "#5b5ef0", shirtDark: "#4845d8", shirtLight: "#9a9efc",
        pants: "#28265a", pantsShade: "#1c1a45",
        skin: "#ffd5b8", skinDark: "#e0ae8a", skinLight: "#ffe2cc",
        accent: "#7880f8", eye: "#1a1540", eyeLight: "#4040a0",
        shoeColor: "#252340", shoeAccent: "#7880f8",
        accessory: "#a0b0c8",
    },
    frontend: {
        hair: "#5a2868", hairDark: "#421e50", hairHighlight: "#8a50a0",
        shirt: "#9a4ef0", shirtDark: "#7e35d0", shirtLight: "#c8a0fe",
        pants: "#402858", pantsShade: "#321e45",
        skin: "#ffe0c4", skinDark: "#e8b897", skinLight: "#ffebda",
        accent: "#b070fc", eye: "#3a1550", eyeLight: "#7040a0",
        shoeColor: "#351c48", shoeAccent: "#b070fc",
        accessory: "#f080a0",
    },
    qa: {
        hair: "#254525", hairDark: "#183018", hairHighlight: "#4a7a4a",
        shirt: "#1eb850", shirtDark: "#149840", shirtLight: "#70e898",
        pants: "#253832", pantsShade: "#1a2a25",
        skin: "#ffdcc0", skinDark: "#e5b490", skinLight: "#ffe8d5",
        accent: "#70e898", eye: "#1a3a1a", eyeLight: "#3a7a3a",
        shoeColor: "#253028", shoeAccent: "#70e898",
        accessory: "#c0d8e0",
    },
    docs: {
        hair: "#423830", hairDark: "#302820", hairHighlight: "#6a5e52",
        shirt: "#686058", shirtDark: "#504840", shirtLight: "#989088",
        pants: "#323028", pantsShade: "#242220",
        skin: "#ffe0c8", skinDark: "#e8ba9a", skinLight: "#ffecdd",
        accent: "#989088", eye: "#2a2420", eyeLight: "#5a5040",
        shoeColor: "#323028", shoeAccent: "#888",
        accessory: "#f0c040",
    },
    security: {
        hair: "#401215", hairDark: "#300e10", hairHighlight: "#783030",
        shirt: "#e03838", shirtDark: "#c02828", shirtLight: "#f89898",
        pants: "#321a1a", pantsShade: "#251212",
        skin: "#ffd8b8", skinDark: "#e0b08c", skinLight: "#ffe5cc",
        accent: "#f89898", eye: "#3a1010", eyeLight: "#7a2020",
        shoeColor: "#321a1a", shoeAccent: "#e03838",
        accessory: "#c0c0d0",
    },
    custom: {
        hair: "#253545", hairDark: "#182535", hairHighlight: "#4a6888",
        shirt: "#05a8c8", shirtDark: "#048098", shirtLight: "#58d8f0",
        pants: "#253038", pantsShade: "#1a2428",
        skin: "#ffddc4", skinDark: "#e5b695", skinLight: "#ffe9d8",
        accent: "#58d8f0", eye: "#1a2a3a", eyeLight: "#3a6a8a",
        shoeColor: "#252a30", shoeAccent: "#58d8f0",
        accessory: "#58d8f0",
    },
};

/* ─── Shared geometries ──────────────────────────────────────────── */
const geo = {
    // Head
    head: new THREE.SphereGeometry(0.44, 32, 28),

    // Body
    bodyUpper: new THREE.CapsuleGeometry(0.22, 0.14, 10, 18),
    bodyLower: new THREE.CapsuleGeometry(0.20, 0.08, 10, 16),
    belt: new THREE.TorusGeometry(0.20, 0.018, 8, 20),
    beltBuckle: new THREE.BoxGeometry(0.04, 0.03, 0.015),
    wrinkle: new THREE.CapsuleGeometry(0.004, 0.06, 3, 6),
    pocket: new THREE.BoxGeometry(0.06, 0.05, 0.005),

    // Arms
    upperArm: new THREE.CapsuleGeometry(0.058, 0.10, 6, 12),
    forearm: new THREE.CapsuleGeometry(0.048, 0.09, 6, 12),
    sleeve: new THREE.CylinderGeometry(0.07, 0.06, 0.04, 12),
    sleeveCuff: new THREE.TorusGeometry(0.055, 0.008, 6, 12),

    // Hands & Fingers
    palm: new THREE.SphereGeometry(0.042, 10, 8),
    thumb: new THREE.CapsuleGeometry(0.014, 0.032, 4, 6),
    finger: new THREE.CapsuleGeometry(0.011, 0.03, 4, 6),
    fingerTip: new THREE.SphereGeometry(0.012, 6, 5),

    // Legs
    thigh: new THREE.CapsuleGeometry(0.068, 0.10, 6, 12),
    shin: new THREE.CapsuleGeometry(0.055, 0.08, 6, 12),

    // Shoes (sneaker style)
    shoeMain: new THREE.CapsuleGeometry(0.06, 0.05, 8, 12),
    shoeSole: new THREE.BoxGeometry(0.13, 0.025, 0.16),
    shoeToe: new THREE.SphereGeometry(0.055, 10, 8),
    shoeStripe: new THREE.BoxGeometry(0.005, 0.035, 0.10),
    shoeLace: new THREE.SphereGeometry(0.008, 6, 5),

    // Face
    eyeWhite: new THREE.SphereGeometry(0.068, 16, 14),
    iris: new THREE.SphereGeometry(0.048, 16, 14),
    irisRing: new THREE.RingGeometry(0.028, 0.038, 16),
    pupil: new THREE.SphereGeometry(0.024, 10, 8),
    highlight1: new THREE.SphereGeometry(0.014, 8, 6),
    highlight2: new THREE.SphereGeometry(0.008, 6, 5),
    highlight3: new THREE.SphereGeometry(0.005, 6, 5),
    blush: new THREE.SphereGeometry(0.048, 10, 8),
    nose: new THREE.SphereGeometry(0.02, 8, 6),
    mouth: new THREE.TorusGeometry(0.032, 0.007, 8, 16, Math.PI),
    upperLip: new THREE.SphereGeometry(0.018, 8, 6),
    lowerLip: new THREE.SphereGeometry(0.022, 8, 6),
    eyebrow: new THREE.CapsuleGeometry(0.007, 0.035, 4, 6),
    eyelash: new THREE.CapsuleGeometry(0.004, 0.018, 3, 5),

    // Ears
    ear: new THREE.SphereGeometry(0.05, 10, 8),
    earInner: new THREE.SphereGeometry(0.028, 8, 6),

    // Hair
    hairMain: new THREE.SphereGeometry(0.48, 24, 20),
    hairFringe: new THREE.SphereGeometry(0.16, 14, 12),
    hairTuft: new THREE.SphereGeometry(0.12, 12, 10),
    hairSide: new THREE.SphereGeometry(0.13, 12, 10),
    hairBack: new THREE.SphereGeometry(0.20, 14, 12),
    hairStrand: new THREE.CapsuleGeometry(0.025, 0.08, 4, 8),
    hairShine: new THREE.SphereGeometry(0.10, 10, 8),
    ahoge: new THREE.CapsuleGeometry(0.012, 0.10, 4, 6),

    // Collar & Tie
    collar: new THREE.TorusGeometry(0.20, 0.022, 8, 18),
    collarFlap: new THREE.BoxGeometry(0.06, 0.04, 0.02),
    tieKnot: new THREE.ConeGeometry(0.03, 0.04, 4), // Tie knot
    tieBody: new THREE.CylinderGeometry(0.035, 0.01, 0.18, 4), // Tie body

    // Rim light (oversized head shell)
    rimShell: new THREE.SphereGeometry(0.46, 20, 16),

    // Accessories
    crownBase: new THREE.CylinderGeometry(0.06, 0.07, 0.04, 5),
    crownPoint: new THREE.ConeGeometry(0.015, 0.035, 4),
    glassLens: new THREE.RingGeometry(0.028, 0.038, 12),
    glassRim: new THREE.TorusGeometry(0.052, 0.008, 8, 24), // Thick glasses
    glassBridge: new THREE.CapsuleGeometry(0.004, 0.02, 3, 5),
    glassArm: new THREE.CapsuleGeometry(0.003, 0.06, 3, 5),
    magnifier: new THREE.RingGeometry(0.025, 0.035, 12),
    magnifierHandle: new THREE.CapsuleGeometry(0.006, 0.04, 3, 5),
    shieldBadge: new THREE.ConeGeometry(0.028, 0.05, 6),
    pencil: new THREE.CapsuleGeometry(0.006, 0.08, 4, 6),
    pencilTip: new THREE.ConeGeometry(0.008, 0.018, 5),
    hairClip: new THREE.CapsuleGeometry(0.008, 0.04, 4, 6),
    starSmall: new THREE.SphereGeometry(0.012, 4, 3),

    // Effects
    shadow: new THREE.CircleGeometry(0.35, 24),
    statusRing: new THREE.RingGeometry(0.28, 0.42, 24),
};

/* ─── Shared materials (Physical for premium clay look) ──────────── */
const matWhite = new THREE.MeshPhysicalMaterial({
    color: "#ffffff", roughness: 0.10, metalness: 0.0,
    clearcoat: 0.4, clearcoatRoughness: 0.3,
});
const matBlack = new THREE.MeshPhysicalMaterial({ color: "#151515", roughness: 0.08 });
const matHighlight = new THREE.MeshPhysicalMaterial({
    color: "#fff", emissive: "#fff", emissiveIntensity: 1.0, roughness: 0.0,
    clearcoat: 1.0, clearcoatRoughness: 0.0,
});
const matBlush = new THREE.MeshPhysicalMaterial({
    color: "#fca0b5", transparent: true, opacity: 0.28, roughness: 0.95,
});
const matShadow = new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.12 });
const matMouth = new THREE.MeshPhysicalMaterial({
    color: "#d07060", roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.4,
});
const matLipGloss = new THREE.MeshPhysicalMaterial({
    color: "#e08878", roughness: 0.20, clearcoat: 0.8, clearcoatRoughness: 0.15,
    transparent: true, opacity: 0.6,
});
const matNose = new THREE.MeshPhysicalMaterial({
    color: "#e8b090", roughness: 0.55, transparent: true, opacity: 0.30,
});
const matEyelash = new THREE.MeshBasicMaterial({ color: "#1a1018" });
const matRimLight = new THREE.MeshBasicMaterial({
    color: "#c8d8f8", transparent: true, opacity: 0.08, side: THREE.BackSide,
});
const matHairShine = new THREE.MeshPhysicalMaterial({
    color: "#ffffff", transparent: true, opacity: 0.12, roughness: 0.0,
    clearcoat: 1.0, clearcoatRoughness: 0.0,
});

/* ─── Status ring colors ─────────────────────────────────────────── */
const STATUS_GLOW = {
    idle: "#818cf8", in_progress: "#34d399", review: "#c4b5fd",
    done: "#10b981", blocked: "#fbbf24", failed: "#f87171",
};

/* ─── 3D Emotion map (emoji + label for each status) ─────────────── */
/* ─── 3D Emotion map (geometry config) ─────────────── */
const EMOTION_MAP_3D = {
    idle: { type: "text", content: "...", color: "#818cf8", label: "relaxing" },
    in_progress: { type: "text", content: "</>", color: "#34d399", label: "coding" },
    review: { type: "text", content: "?", color: "#c4b5fd", label: "review" },
    done: { type: "star", color: "#fbbf24", label: "yay!" }, // Star geometry
    blocked: { type: "text", content: "zzz", color: "#fbbf24", label: "blocked" },
    failed: { type: "text", content: "!", color: "#f87171", label: "error" },
};

/* ─── Glass Bubble Material ──────────────────────────── */
const matGlass = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    transmission: 0.95, // Glass-like transparency
    opacity: 1,
    metalness: 0,
    roughness: 0.15, // Frosting
    ior: 1.5,
    thickness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
});

/* ─── 3D Emotion Bubble floating above character ─────────────────── */
function EmotionBubble3D({ status }) {
    const emotion = EMOTION_MAP_3D[status] || EMOTION_MAP_3D.idle;
    const bubbleRef = useRef();
    const iconRef = useRef();
    const dot1 = useRef();
    const dot2 = useRef();
    const dot3 = useRef();

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        // Float animation
        if (bubbleRef.current) {
            bubbleRef.current.position.y = 1.82 + Math.sin(t * 1.5) * 0.03;
            bubbleRef.current.position.x = 0.35 + Math.sin(t * 0.8) * 0.01;
        }
        // Icon bob/spin
        if (iconRef.current) {
            if (emotion.type === "star") {
                iconRef.current.rotation.y += 0.02;
                iconRef.current.rotation.z = Math.sin(t * 3) * 0.1;
            } else {
                iconRef.current.position.y = Math.sin(t * 3) * 0.01;
            }
        }
        // Trail dots pulse
        if (dot1.current) dot1.current.scale.setScalar(0.7 + Math.sin(t * 2.5) * 0.3);
        if (dot2.current) dot2.current.scale.setScalar(0.7 + Math.sin(t * 2.5 + 0.4) * 0.3);
        if (dot3.current) dot3.current.scale.setScalar(0.7 + Math.sin(t * 2.5 + 0.8) * 0.3);
    });

    return (
        <group>
            {/* Trail dots (Glassy) */}
            <mesh ref={dot1} position={[0.12, 1.52, 0.25]} geometry={geo.highlight3} material={matGlass} />
            <mesh ref={dot2} position={[0.22, 1.62, 0.18]} geometry={geo.highlight2} material={matGlass} />
            <mesh ref={dot3} position={[0.28, 1.72, 0.10]} geometry={geo.highlight2} material={matGlass} />

            {/* Bubble Billboard */}
            <Billboard ref={bubbleRef} position={[0.35, 1.82, 0]}>
                {/* Glass Bubble Background */}
                <RoundedBox args={[0.55, 0.22, 0.04]} radius={0.1}>
                    <primitive object={matGlass} attach="material" />
                </RoundedBox>

                {/* Inner Content */}
                <group position={[0, 0, 0.025]}>
                    <group ref={iconRef} position={[-0.14, 0, 0]}>
                        {emotion.type === "star" ? (
                            <mesh>
                                <icosahedronGeometry args={[0.06, 0]} />
                                <meshPhysicalMaterial
                                    color={emotion.color}
                                    emissive={emotion.color}
                                    emissiveIntensity={0.5}
                                    clearcoat={1}
                                />
                            </mesh>
                        ) : (
                            <Text
                                fontSize={0.10}
                                color={emotion.color}
                                anchorX="center"
                                anchorY="middle"
                                outlineWidth={0.005}
                                outlineColor="#ffffff"
                                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
                            >
                                {emotion.content}
                            </Text>
                        )}
                    </group>

                    {/* Label Text */}
                    <Text
                        fontSize={0.05}
                        color="#475569"
                        anchorX="left"
                        anchorY="middle"
                        position={[-0.04, 0, 0]}
                        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
                    >
                        {emotion.label}
                    </Text>
                </group>
            </Billboard>
        </group>
    );
}

/* ─── Hand component (5 fingers) ─────────────────────────────────── */
function ChibiHand({ material, side = "left" }) {
    const s = side === "left" ? 1 : -1;
    return (
        <group>
            {/* Palm */}
            <mesh geometry={geo.palm} material={material}
                scale={[1.1, 0.85, 0.75]} />

            {/* Thumb — angled outward */}
            <group position={[s * 0.035, 0.01, 0.02]} rotation={[0, 0, s * 0.6]}>
                <mesh geometry={geo.thumb} material={material} />
                <mesh geometry={geo.fingerTip} material={material}
                    position={[0, -0.028, 0]} />
            </group>

            {/* Index finger */}
            <group position={[s * 0.018, -0.04, 0.015]} rotation={[0.1, 0, s * 0.05]}>
                <mesh geometry={geo.finger} material={material} />
                <mesh geometry={geo.fingerTip} material={material}
                    position={[0, -0.022, 0]} />
            </group>

            {/* Middle finger (slightly longer) */}
            <group position={[s * 0.002, -0.044, 0.012]} rotation={[0.08, 0, 0]}>
                <mesh geometry={geo.finger} material={material}
                    scale={[1, 1.1, 1]} />
                <mesh geometry={geo.fingerTip} material={material}
                    position={[0, -0.025, 0]} />
            </group>

            {/* Ring finger */}
            <group position={[s * -0.014, -0.042, 0.008]} rotation={[0.1, 0, s * -0.05]}>
                <mesh geometry={geo.finger} material={material} />
                <mesh geometry={geo.fingerTip} material={material}
                    position={[0, -0.022, 0]} />
            </group>

            {/* Pinky (shorter) */}
            <group position={[s * -0.028, -0.036, 0.004]} rotation={[0.12, 0, s * -0.1]}>
                <mesh geometry={geo.finger} material={material}
                    scale={[0.85, 0.85, 0.85]} />
                <mesh geometry={geo.fingerTip} material={material}
                    position={[0, -0.018, 0]} scale={[0.85, 0.85, 0.85]} />
            </group>
        </group>
    );
}

/* ─── Sneaker shoe component ─────────────────────────────────────── */
function ChibiShoe({ mainMat, soleMat, accentMat }) {
    return (
        <group>
            {/* Main shoe body */}
            <mesh geometry={geo.shoeMain} material={mainMat}
                rotation={[Math.PI / 2, 0, 0]}
                position={[0, 0, 0.02]} scale={[1, 1.2, 0.9]} />
            {/* Toe cap */}
            <mesh geometry={geo.shoeToe} material={mainMat}
                position={[0, -0.01, 0.07]} scale={[1, 0.65, 1.1]} />
            {/* Sole */}
            <mesh geometry={geo.shoeSole} material={soleMat}
                position={[0, -0.04, 0.02]} />
            {/* Side stripe */}
            <mesh geometry={geo.shoeStripe} material={accentMat}
                position={[0.06, 0, 0.02]} />
            <mesh geometry={geo.shoeStripe} material={accentMat}
                position={[-0.06, 0, 0.02]} />
        </group>
    );
}

/* ─── BFS pathfinding on nav graph ─── */
function bfsPath(graph, startId, endId) {
    if (startId === endId) return [startId];
    const nodeMap = {};
    for (const n of graph) nodeMap[n.id] = n;
    const visited = new Set([startId]);
    const queue = [[startId]];
    while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];
        const node = nodeMap[current];
        if (!node) continue;
        for (const nbr of node.edges) {
            if (visited.has(nbr)) continue;
            const newPath = [...path, nbr];
            if (nbr === endId) return newPath;
            visited.add(nbr);
            queue.push(newPath);
        }
    }
    return null;
}

function nearestNode(graph, x, z) {
    let bestId = graph[0].id, bestDist = Infinity;
    for (const n of graph) {
        const d = Math.hypot(n.x - x, n.z - z);
        if (d < bestDist) { bestDist = d; bestId = n.id; }
    }
    return bestId;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*                      MAIN CHIBI COMPONENT                        */
/* ═══════════════════════════════════════════════════════════════════ */
export default function ChibiModel({ agent, status = "idle", position = [0, 0, 0], isGreeting = false, walkArea = null, serverPosition = null }) {
    const groupRef = useRef();
    const headRef = useRef();
    const leftArmRef = useRef();
    const rightArmRef = useRef();
    const leftHandRef = useRef();
    const rightHandRef = useRef();
    const leftLegRef = useRef();
    const rightLegRef = useRef();
    const eyeLeftRef = useRef();
    const eyeRightRef = useRef();
    const glowRef = useRef();
    const bodyRef = useRef();

    // Walk state refs (client-side BFS walk)
    const isWalking = useRef(false);
    const walkPath = useRef([]);      // [{x, z, nodeId}]
    const walkTimer = useRef(1 + Math.random() * 3);
    const lastNodeId = useRef(null);
    const walkInitialized = useRef(false);
    const syncAcc = useRef(0); // accumulator for position sync throttle

    // Initialize position from serverPosition (F5 resume) or fallback to prop
    const initX = serverPosition?.x ?? position[0];
    const initZ = serverPosition?.z ?? position[2];
    const currentPos = useRef(new THREE.Vector3(initX, position[1], initZ));
    const targetPos = useRef(new THREE.Vector3(initX, position[1], initZ));

    const colors = ROLE_COLORS[agent.role] || ROLE_COLORS.custom;

    /* ─── Role-based materials (Physical for premium feel) ─── */
    const mats = useMemo(() => ({
        skin: new THREE.MeshPhysicalMaterial({
            color: colors.skin, roughness: 0.45, metalness: 0.0,
            clearcoat: 0.2, clearcoatRoughness: 0.5,
            sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color(colors.skinLight),
        }),
        skinDark: new THREE.MeshPhysicalMaterial({
            color: colors.skinDark, roughness: 0.50,
            clearcoat: 0.15, clearcoatRoughness: 0.55,
        }),
        shirt: new THREE.MeshPhysicalMaterial({
            color: colors.shirt, roughness: 0.38, metalness: 0.02,
            sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color(colors.shirtLight),
            clearcoat: 0.1, clearcoatRoughness: 0.6,
        }),
        shirtDark: new THREE.MeshPhysicalMaterial({
            color: colors.shirtDark, roughness: 0.45,
            sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color(colors.shirtLight),
        }),
        shirtWrinkle: new THREE.MeshPhysicalMaterial({
            color: colors.shirtDark, roughness: 0.55, transparent: true, opacity: 0.35,
        }),
        pants: new THREE.MeshPhysicalMaterial({
            color: colors.pants, roughness: 0.50,
            sheen: 0.2, sheenRoughness: 0.7, sheenColor: new THREE.Color(colors.pantsShade),
        }),
        hair: new THREE.MeshPhysicalMaterial({
            color: colors.hair, roughness: 0.28, metalness: 0.05,
            clearcoat: 0.3, clearcoatRoughness: 0.4,
        }),
        hairDark: new THREE.MeshPhysicalMaterial({
            color: colors.hairDark, roughness: 0.30,
            clearcoat: 0.25, clearcoatRoughness: 0.45,
        }),
        hairHighlight: new THREE.MeshPhysicalMaterial({
            color: colors.hairHighlight, roughness: 0.22, metalness: 0.08,
            clearcoat: 0.4, clearcoatRoughness: 0.3,
        }),
        shoe: new THREE.MeshPhysicalMaterial({
            color: colors.shoeColor, roughness: 0.45,
            clearcoat: 0.2, clearcoatRoughness: 0.5,
        }),
        shoeSole: new THREE.MeshPhysicalMaterial({
            color: "#f5f0e8", roughness: 0.55,
        }),
        shoeAccent: new THREE.MeshPhysicalMaterial({
            color: colors.shoeAccent, roughness: 0.35,
            clearcoat: 0.3, clearcoatRoughness: 0.4,
        }),
        iris: new THREE.MeshPhysicalMaterial({
            color: colors.eye, roughness: 0.08, metalness: 0.12,
            clearcoat: 0.6, clearcoatRoughness: 0.15,
        }),
        irisLight: new THREE.MeshPhysicalMaterial({
            color: colors.eyeLight, roughness: 0.10, metalness: 0.08,
            clearcoat: 0.5, clearcoatRoughness: 0.2,
        }),
        irisRing: new THREE.MeshPhysicalMaterial({
            color: colors.accent, roughness: 0.10, metalness: 0.15,
            clearcoat: 0.8, clearcoatRoughness: 0.1,
            transparent: true, opacity: 0.5,
        }),
        collar: new THREE.MeshPhysicalMaterial({
            color: "#e8e4e0", roughness: 0.38,
            clearcoat: 0.15, clearcoatRoughness: 0.5,
        }),
        earInner: new THREE.MeshPhysicalMaterial({
            color: "#e8a88a", roughness: 0.60, transparent: true, opacity: 0.40,
        }),
        belt: new THREE.MeshPhysicalMaterial({
            color: "#3a3530", roughness: 0.45,
            clearcoat: 0.2, clearcoatRoughness: 0.5,
        }),
        buckle: new THREE.MeshPhysicalMaterial({
            color: "#c0b8a8", roughness: 0.20, metalness: 0.45,
            clearcoat: 0.5, clearcoatRoughness: 0.3,
        }),
        accessory: new THREE.MeshPhysicalMaterial({
            color: colors.accessory, roughness: 0.25, metalness: 0.3,
            clearcoat: 0.4, clearcoatRoughness: 0.3,
        }),
    }), [agent.role]);

    /* Status glow material */
    const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
        color: STATUS_GLOW[status] || "#818cf8",
        transparent: true, opacity: 0.10, side: THREE.DoubleSide,
    }), [status]);

    useMemo(() => {
        targetPos.current.set(position[0], position[1], position[2]);
    }, [position[0], position[1], position[2]]);

    // Initialize walk position from serverPosition on first mount only
    useMemo(() => {
        if (serverPosition && !walkInitialized.current && walkArea) {
            currentPos.current.x = serverPosition.x;
            currentPos.current.z = serverPosition.z;
            lastNodeId.current = nearestNode(walkArea.graph, serverPosition.x, serverPosition.z);
            walkInitialized.current = true;
        }
    }, [serverPosition?.x, serverPosition?.z]);

    /* ─── Animation ─── */
    useFrame((state, delta) => {
        if (!groupRef.current) return;
        const t = state.clock.elapsedTime;
        const seed = (agent.id?.charCodeAt?.(0) || 0) * 0.7;

        /* ── Client-side BFS walk logic (when walkArea is provided) ── */
        if (walkArea && walkArea.graph && (status === "idle" || status === "done")) {
            const graph = walkArea.graph;
            const nodeMap = {};
            for (const n of graph) nodeMap[n.id] = n;

            if (!isWalking.current && walkPath.current.length === 0) {
                // Countdown timer then pick new destination
                walkTimer.current -= delta;
                if (walkTimer.current <= 0) {
                    const nearest = nearestNode(graph, currentPos.current.x, currentPos.current.z);
                    // Pick random distant destination
                    const candidates = graph.filter(n => n.id !== nearest && n.id !== lastNodeId.current);
                    if (candidates.length > 0) {
                        const weights = candidates.map(n => Math.hypot(n.x - currentPos.current.x, n.z - currentPos.current.z));
                        const total = weights.reduce((a, b) => a + b, 0);
                        let roll = Math.random() * total;
                        let dest = candidates[0];
                        for (let i = 0; i < candidates.length; i++) {
                            roll -= weights[i];
                            if (roll <= 0) { dest = candidates[i]; break; }
                        }
                        const path = bfsPath(graph, nearest, dest.id);
                        if (path && path.length > 1) {
                            walkPath.current = path.slice(1).map(nid => ({ x: nodeMap[nid].x, z: nodeMap[nid].z, nodeId: nid }));
                            isWalking.current = true;
                            lastNodeId.current = dest.id;
                        } else {
                            walkTimer.current = 1;
                        }
                    } else {
                        walkTimer.current = 1;
                    }
                }
            }

            if (isWalking.current && walkPath.current.length > 0) {
                const target = walkPath.current[0];
                const dx = target.x - currentPos.current.x;
                const dz = target.z - currentPos.current.z;
                const dist = Math.hypot(dx, dz);

                if (dist > 0.15) {
                    // Variable speed: accelerate from stop, decelerate near target
                    const accelFactor = Math.min(1, dist / 0.5); // slow near target
                    const speed = 0.4 * (0.5 + 0.5 * accelFactor);

                    const step = Math.min(speed * delta, dist);
                    currentPos.current.x += (dx / dist) * step;
                    currentPos.current.z += (dz / dist) * step;
                    // Update facing angle
                    groupRef.current.rotation.y = Math.atan2(dx, dz);
                } else {
                    walkPath.current.shift();
                    if (walkPath.current.length === 0) {
                        isWalking.current = false;
                        walkTimer.current = 3 + Math.random() * 4;
                    }
                }

                // Enhanced walk animation with body lean & arm swing inertia
                const walkFreq = 8;
                const walkPhase = t * walkFreq + seed;
                const legSwing = Math.sin(walkPhase);
                const armSwing = Math.sin(walkPhase + Math.PI);

                // Legs — distinct foot-plant (sharper up, slower plant)
                if (leftLegRef.current) leftLegRef.current.rotation.x = legSwing * 0.48 + Math.sin(walkPhase * 2) * 0.08;
                if (rightLegRef.current) rightLegRef.current.rotation.x = -legSwing * 0.48 - Math.sin(walkPhase * 2) * 0.08;

                // Arms — overshoot with spring-like ease
                if (leftArmRef.current) {
                    leftArmRef.current.rotation.x = armSwing * 0.38 + Math.sin(walkPhase * 1.5) * 0.06;
                    leftArmRef.current.rotation.z = 0.15 + Math.sin(walkPhase) * 0.04;
                }
                if (rightArmRef.current) {
                    rightArmRef.current.rotation.x = -armSwing * 0.38 - Math.sin(walkPhase * 1.5) * 0.06;
                    rightArmRef.current.rotation.z = -0.15 - Math.sin(walkPhase) * 0.04;
                }

                // Body lean into movement (~8°) + subtle side sway
                if (bodyRef.current) {
                    bodyRef.current.rotation.x = -0.12; // lean forward
                    bodyRef.current.rotation.z = Math.sin(walkPhase) * 0.04; // side sway
                }

                // Head counterbalance — slight opposite tilt
                if (headRef.current) {
                    headRef.current.rotation.x = 0.06; // counterbalance lean
                    headRef.current.rotation.z = Math.sin(walkPhase) * -0.05;
                }

                // Vertical bob with foot-plant feel
                currentPos.current.y = position[1] + Math.abs(Math.sin(walkPhase)) * 0.03;
            }

            groupRef.current.position.copy(currentPos.current);

            // Report position to store (throttled — every 500ms)
            syncAcc.current += delta;
            if (syncAcc.current >= 0.5) {
                syncAcc.current = 0;
                useAgentStore.getState().updatePosition(agent.id, {
                    x: currentPos.current.x,
                    z: currentPos.current.z,
                    facing_angle: groupRef.current.rotation.y,
                    is_walking: isWalking.current,
                });
            }
        } else {
            // Static / desk agents: smooth lerp to target position
            currentPos.current.lerp(targetPos.current, delta * 2.5);
            groupRef.current.position.copy(currentPos.current);
        }

        /* Blinking */
        const blinkCycle = (t * 1.1 + seed) % 5;
        const isBlinking = blinkCycle > 4.8;
        const eyeScaleY = isBlinking ? 0.05 : 1;
        if (eyeLeftRef.current) eyeLeftRef.current.scale.y = eyeScaleY;
        if (eyeRightRef.current) eyeRightRef.current.scale.y = eyeScaleY;

        /* Status ring pulse */
        if (glowRef.current) {
            glowRef.current.material.opacity = 0.06 + Math.sin(t * 2.5) * 0.04;
            glowRef.current.rotation.z = t * 0.3;
        }

        const head = headRef.current;
        const body = bodyRef.current;
        const la = leftArmRef.current;
        const ra = rightArmRef.current;
        const lh = leftHandRef.current;
        const rh = rightHandRef.current;
        const ll = leftLegRef.current;
        const rl = rightLegRef.current;
        if (!head) return;

        /* Breathing (universal soft body movement) */
        const breathe = Math.sin(t * 2 + seed) * 0.008;
        if (body) body.scale.set(1 + breathe * 0.3, 1 + breathe, 1 + breathe * 0.3);

        /* Skip status animations when actively walking */
        if (isWalking.current) {
            // Reset body lean when transitioning from walk to idle
            return;
        }

        // Reset body lean when not walking
        if (body) {
            body.rotation.x *= 0.9; // smooth settle
            body.rotation.z *= 0.9;
        }

        /* Idle finger wiggle */
        if (lh) lh.rotation.x = Math.sin(t * 1.5 + seed) * 0.08;
        if (rh) rh.rotation.x = Math.sin(t * 1.5 + seed + 1) * 0.08;

        if (isGreeting) {
            if (ra) { ra.rotation.z = -Math.PI / 2 + Math.sin(t * 8) * 0.35; ra.rotation.x = 0; }
            if (rh) rh.rotation.z = Math.sin(t * 8) * 0.3;
            head.rotation.z = Math.sin(t * 4) * 0.08;
            groupRef.current.position.y = currentPos.current.y + Math.sin(t * 5) * 0.04;
            return;
        }

        switch (status) {
            case "idle": {
                groupRef.current.position.y = currentPos.current.y + Math.sin(t * 1.5 + seed) * 0.018;
                head.rotation.y = Math.sin(t * 0.5 + seed) * 0.15;
                head.rotation.z = Math.sin(t * 0.35 + seed) * 0.04;
                head.rotation.x = Math.sin(t * 0.3 + seed) * 0.02;
                if (la) { la.rotation.x = Math.sin(t * 0.7 + seed) * 0.1; la.rotation.z = 0.15; }
                if (ra) { ra.rotation.x = Math.sin(t * 0.7 + seed + 1) * 0.1; ra.rotation.z = -0.15; }
                if (ll) ll.rotation.x = Math.sin(t * 0.5 + seed) * 0.04;
                if (rl) rl.rotation.x = Math.sin(t * 0.5 + seed + 1) * 0.04;
                break;
            }
            case "in_progress": {
                if (la) { la.rotation.x = Math.sin(t * 10 + seed) * 0.28; la.rotation.z = 0.3; }
                if (ra) { ra.rotation.x = Math.sin(t * 10 + seed + Math.PI) * 0.28; ra.rotation.z = -0.3; }
                if (lh) lh.rotation.x = Math.sin(t * 12 + seed) * 0.15;
                if (rh) rh.rotation.x = Math.sin(t * 12 + seed + 1) * 0.15;
                head.rotation.x = -0.1;
                head.rotation.y = Math.sin(t * 2) * 0.05;
                head.rotation.z = 0;
                groupRef.current.position.y = currentPos.current.y + Math.sin(t * 3) * 0.005;
                break;
            }
            case "review": {
                head.rotation.y = Math.sin(t * 0.8) * 0.4;
                head.rotation.x = -0.06;
                head.rotation.z = Math.sin(t * 0.6) * 0.06;
                if (ra) { ra.rotation.x = -0.35; ra.rotation.z = -0.2; }
                if (la) { la.rotation.x = 0; la.rotation.z = 0.15; }
                groupRef.current.position.y = currentPos.current.y + Math.sin(t * 1.2) * 0.01;
                break;
            }
            case "done": {
                groupRef.current.position.y = currentPos.current.y + Math.abs(Math.sin(t * 4)) * 0.1;
                if (la) { la.rotation.z = -0.7 + Math.sin(t * 4) * 0.35; la.rotation.x = 0; }
                if (ra) { ra.rotation.z = 0.7 - Math.sin(t * 4) * 0.35; ra.rotation.x = 0; }
                head.rotation.y = 0;
                head.rotation.z = Math.sin(t * 4) * 0.12;
                head.rotation.x = 0;
                if (ll) ll.rotation.x = Math.sin(t * 4) * 0.2;
                if (rl) rl.rotation.x = Math.sin(t * 4 + Math.PI) * 0.2;
                break;
            }
            case "blocked": {
                // Slow drooping head nod
                if (la) { la.rotation.z = 0.45; la.rotation.x = -0.3; }
                if (ra) { ra.rotation.z = -0.45; ra.rotation.x = -0.3; }
                head.rotation.x = 0.08 + Math.sin(t * 0.6) * 0.04;
                head.rotation.y = Math.sin(t * 0.8) * 0.06;
                head.rotation.z = 0;
                // Body slight droop
                if (body) body.rotation.x = 0.04;
                groupRef.current.position.y = currentPos.current.y + Math.sin(t * 1.5) * 0.008;
                break;
            }
            case "failed": {
                // Frustration — head shake + arms drop
                head.rotation.x = 0.22;
                head.rotation.y = Math.sin(t * 6) * 0.08; // head shake
                head.rotation.z = 0;
                if (la) { la.rotation.z = 0.1; la.rotation.x = 0.15; }
                if (ra) { ra.rotation.z = -0.1; ra.rotation.x = 0.15; }
                groupRef.current.position.y = currentPos.current.y - 0.025;
                break;
            }
            default: {
                head.rotation.set(0, 0, 0);
                if (la) la.rotation.set(0, 0, 0.15);
                if (ra) ra.rotation.set(0, 0, -0.15);
            }
        }
    });

    return (
        <group ref={groupRef} position={position}>
            {/* ── Shadow ── */}
            <mesh geometry={geo.shadow} material={matShadow}
                rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} />
            <mesh ref={glowRef} geometry={geo.statusRing} material={glowMat}
                rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} />

            {/* ════════════ LEGS ════════════ */}
            <group ref={leftLegRef} position={[-0.10, 0.22, 0]}>
                <mesh geometry={geo.thigh} material={mats.pants} />
                <mesh geometry={geo.shin} material={mats.pants}
                    position={[0, -0.14, 0]} />
                <group position={[0, -0.27, 0.02]}>
                    <ChibiShoe mainMat={mats.shoe} soleMat={mats.shoeSole} accentMat={mats.shoeAccent} />
                </group>
            </group>
            <group ref={rightLegRef} position={[0.10, 0.22, 0]}>
                <mesh geometry={geo.thigh} material={mats.pants} />
                <mesh geometry={geo.shin} material={mats.pants}
                    position={[0, -0.14, 0]} />
                <group position={[0, -0.27, 0.02]}>
                    <ChibiShoe mainMat={mats.shoe} soleMat={mats.shoeSole} accentMat={mats.shoeAccent} />
                </group>
            </group>

            {/* ════════════ BODY ════════════ */}
            <group ref={bodyRef}>
                {/* Upper body */}
                <mesh geometry={geo.bodyUpper} material={mats.shirt}
                    position={[0, 0.52, 0]} />
                {/* Lower body */}
                <mesh geometry={geo.bodyLower} material={mats.shirt}
                    position={[0, 0.40, 0]} />
                {/* Shirt wrinkle lines */}
                <mesh geometry={geo.wrinkle} material={mats.shirtWrinkle}
                    position={[-0.08, 0.50, 0.18]} rotation={[0.2, 0, 0.3]} />
                <mesh geometry={geo.wrinkle} material={mats.shirtWrinkle}
                    position={[0.06, 0.48, 0.18]} rotation={[0.1, 0, -0.2]} />
                {/* Pocket */}
                <mesh geometry={geo.pocket} material={mats.shirtDark}
                    position={[0.10, 0.48, 0.20]} rotation={[0.15, 0, 0]} />
                {/* Belt */}
                <mesh geometry={geo.belt} material={mats.belt}
                    position={[0, 0.38, 0]} rotation={[Math.PI / 2, 0, 0]} />
                {/* Belt buckle */}
                <mesh geometry={geo.beltBuckle} material={mats.buckle}
                    position={[0, 0.38, 0.20]} />
            </group>

            {/* Collar */}
            <mesh geometry={geo.collar} material={mats.collar}
                position={[0, 0.63, 0]} rotation={[Math.PI / 2.2, 0, 0]} />
            {/* V-collar flaps */}
            <mesh geometry={geo.collarFlap} material={mats.collar}
                position={[-0.03, 0.61, 0.18]} rotation={[0.2, 0.3, -0.3]} />
            <mesh geometry={geo.collarFlap} material={mats.collar}
                position={[0.03, 0.61, 0.18]} rotation={[0.2, -0.3, 0.3]} />

            {/* ─── DIRECTOR TIE (Lead Role) ─── */}
            {agent.role === "lead" && (
                <group position={[0, 0.56, 0.21]} rotation={[0.1, 0, 0]}>
                    <mesh geometry={geo.tieKnot} material={mats.accent} /> {/* Red Tie Knot */}
                    <mesh geometry={geo.tieBody} material={mats.accent} position={[0, -0.10, 0.02]} rotation={[-0.1, 0, 0]} />
                </group>
            )}

            {/* ════════════ ARMS ════════════ */}
            <group ref={leftArmRef} position={[-0.27, 0.52, 0]}>
                {/* Sleeve */}
                <mesh geometry={geo.sleeve} material={mats.shirtDark}
                    position={[0, 0.02, 0]} />
                {/* Sleeve cuff ring */}
                <mesh geometry={geo.sleeveCuff} material={mats.shirt}
                    position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]} />
                {/* Upper arm */}
                <mesh geometry={geo.upperArm} material={mats.shirt}
                    rotation={[0, 0, 0.15]} />
                {/* Forearm (skin) */}
                <mesh geometry={geo.forearm} material={mats.skin}
                    position={[-0.01, -0.15, 0]} />
                {/* Hand with fingers */}
                <group ref={leftHandRef} position={[-0.01, -0.27, 0]}>
                    <ChibiHand material={mats.skin} side="left" />
                </group>
            </group>
            <group ref={rightArmRef} position={[0.27, 0.52, 0]}>
                <mesh geometry={geo.sleeve} material={mats.shirtDark}
                    position={[0, 0.02, 0]} />
                <mesh geometry={geo.sleeveCuff} material={mats.shirt}
                    position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]} />
                <mesh geometry={geo.upperArm} material={mats.shirt}
                    rotation={[0, 0, -0.15]} />
                <mesh geometry={geo.forearm} material={mats.skin}
                    position={[0.01, -0.15, 0]} />
                <group ref={rightHandRef} position={[0.01, -0.27, 0]}>
                    <ChibiHand material={mats.skin} side="right" />
                </group>
            </group>

            {/* ════════════ HEAD ════════════ */}
            <group ref={headRef} position={[0, 0.90, 0]}>
                <mesh geometry={geo.head} material={mats.skin} />
                {/* Rim light backlit shell */}
                <mesh geometry={geo.rimShell} material={matRimLight}
                    position={[0, 0, -0.02]} />

                {/* ── Ears ── */}
                <mesh geometry={geo.ear} material={mats.skin}
                    position={[-0.42, -0.02, 0]} scale={[0.6, 1, 0.65]} />
                <mesh geometry={geo.earInner} material={mats.earInner}
                    position={[-0.42, -0.02, 0.015]} scale={[0.45, 0.75, 0.5]} />
                <mesh geometry={geo.ear} material={mats.skin}
                    position={[0.42, -0.02, 0]} scale={[0.6, 1, 0.65]} />
                <mesh geometry={geo.earInner} material={mats.earInner}
                    position={[0.42, -0.02, 0.015]} scale={[0.45, 0.75, 0.5]} />

                {/* ── Hair ── */}
                {/* Main dome */}
                <mesh geometry={geo.hairMain} material={mats.hair}
                    position={[0, 0.10, -0.04]} scale={[1, 0.88, 0.92]} />
                {/* ── Hair Topology ── */}
                {agent.role === "lead" ? (
                    /* DIRECTOR HAIR: Side part, neat, sculpted */
                    <group>
                        {/* Top Side Swoop (Left to Right) */}
                        <mesh geometry={geo.hairTuft} material={mats.hair}
                            position={[-0.12, 0.32, 0.15]} rotation={[0, 0, 0.3]} scale={[1.6, 0.9, 0.9]} />
                        {/* Right side tucked */}
                        <mesh geometry={geo.hairSide} material={mats.hairDark}
                            position={[0.32, 0.10, 0.15]} scale={[0.7, 0.9, 0.6]} />
                        {/* Left side volume */}
                        <mesh geometry={geo.hairSide} material={mats.hair}
                            position={[-0.34, 0.10, 0.15]} scale={[0.8, 0.9, 0.7]} />
                        {/* Back volume (clean cut) */}
                        <mesh geometry={geo.hairBack} material={mats.hairDark}
                            position={[0, -0.02, -0.22]} scale={[1.1, 0.9, 0.8]} />
                        {/* Shine */}
                        <mesh geometry={geo.hairShine} material={matHairShine}
                            position={[-0.1, 0.35, 0.10]} scale={[1.2, 0.3, 0.4]} rotation={[0, 0, 0.2]} />
                    </group>
                ) : (
                    /* STANDARD HAIR (Messy/Casual) */
                    <group>
                        {/* Top highlight tuft */}
                        <mesh geometry={geo.hairTuft} material={mats.hairHighlight}
                            position={[0, 0.34, -0.02]} scale={[1.2, 0.85, 0.9]} />
                        {/* Secondary top */}
                        <mesh geometry={geo.hairTuft} material={mats.hair}
                            position={[-0.08, 0.30, 0.04]} scale={[1, 0.7, 0.8]} />
                        <mesh geometry={geo.hairTuft} material={mats.hair}
                            position={[0.08, 0.30, 0.04]} scale={[1, 0.7, 0.8]} />
                        {/* Left bangs */}
                        <mesh geometry={geo.hairFringe} material={mats.hair}
                            position={[-0.20, 0.18, 0.30]} scale={[1.05, 0.85, 0.60]} />
                        {/* Right bangs */}
                        <mesh geometry={geo.hairFringe} material={mats.hair}
                            position={[0.20, 0.18, 0.30]} scale={[1.05, 0.85, 0.60]} />
                        {/* Center fringe */}
                        <mesh geometry={geo.hairTuft} material={mats.hairDark}
                            position={[0, 0.22, 0.32]} scale={[0.8, 0.65, 0.50]} />
                        {/* Side hair */}
                        <mesh geometry={geo.hairSide} material={mats.hair}
                            position={[-0.36, 0.00, 0.08]} scale={[0.55, 1, 0.65]} />
                        <mesh geometry={geo.hairSide} material={mats.hair}
                            position={[0.36, 0.00, 0.08]} scale={[0.55, 1, 0.65]} />
                        {/* Back hair volume */}
                        <mesh geometry={geo.hairBack} material={mats.hairDark}
                            position={[0, -0.03, -0.25]} scale={[1.1, 1, 0.7]} />
                        {/* Extra back volume */}
                        <mesh geometry={geo.hairBack} material={mats.hair}
                            position={[-0.10, -0.06, -0.22]} scale={[0.7, 0.8, 0.6]} />
                        <mesh geometry={geo.hairBack} material={mats.hair}
                            position={[0.10, -0.06, -0.22]} scale={[0.7, 0.8, 0.6]} />
                        {/* Stray strands (personality) */}
                        <mesh geometry={geo.hairStrand} material={mats.hair}
                            position={[-0.05, 0.40, 0.10]} rotation={[0.3, 0, -0.2]}
                            scale={[0.7, 1, 0.7]} />
                        <mesh geometry={geo.hairStrand} material={mats.hairHighlight}
                            position={[0.06, 0.42, 0.06]} rotation={[-0.2, 0, 0.3]}
                            scale={[0.6, 0.8, 0.6]} />
                        <mesh geometry={geo.hairStrand} material={mats.hair}
                            position={[-0.12, 0.36, 0.15]} rotation={[0.2, 0.1, -0.3]}
                            scale={[0.5, 0.9, 0.5]} />
                        <mesh geometry={geo.hairStrand} material={mats.hairDark}
                            position={[0.10, 0.38, 0.12]} rotation={[-0.1, -0.1, 0.2]}
                            scale={[0.55, 0.85, 0.55]} />
                        <mesh geometry={geo.hairStrand} material={mats.hairHighlight}
                            position={[0, 0.38, 0.18]} rotation={[0.15, 0, 0]}
                            scale={[0.4, 0.7, 0.4]} />
                        {/* Hair shine streak */}
                        <mesh geometry={geo.hairShine} material={matHairShine}
                            position={[0.05, 0.28, 0.05]} scale={[1.5, 0.35, 0.4]}
                            rotation={[0, 0, -0.15]} />
                        {/* Ahoge cowlick */}
                        <mesh geometry={geo.ahoge} material={mats.hair}
                            position={[0.02, 0.46, 0.02]} rotation={[0.4, 0.1, 0.3]} />
                    </group>
                )}

                {/* ── Eyes ── */}
                <group ref={eyeLeftRef} position={[-0.14, -0.04, 0.36]}>
                    <mesh geometry={geo.eyeWhite} material={matWhite}
                        scale={[1, 1.2, 0.55]} />
                    <mesh geometry={geo.iris} material={mats.iris}
                        position={[0, -0.008, 0.02]} scale={[1, 1.12, 0.65]} />
                    {/* Iris accent ring */}
                    <mesh geometry={geo.irisRing} material={mats.irisRing}
                        position={[0, -0.005, 0.032]} rotation={[0, 0, 0]} />
                    {/* Iris inner lighter */}
                    <mesh geometry={geo.pupil} material={mats.irisLight}
                        position={[0, 0.006, 0.028]} scale={[0.9, 0.9, 0.6]} />
                    <mesh geometry={geo.pupil} material={matBlack}
                        position={[0, -0.01, 0.033]} />
                    {/* Triple highlight system */}
                    <mesh geometry={geo.highlight1} material={matHighlight}
                        position={[0.02, 0.022, 0.04]} />
                    <mesh geometry={geo.highlight2} material={matHighlight}
                        position={[-0.012, -0.015, 0.04]} />
                    <mesh geometry={geo.highlight3} material={matHighlight}
                        position={[0.008, 0.008, 0.042]} />
                    {/* Eyelashes */}
                    <mesh geometry={geo.eyelash} material={matEyelash}
                        position={[-0.02, 0.042, 0.025]} rotation={[0.2, 0, -0.4]}
                        scale={[1, 1.2, 1]} />
                    <mesh geometry={geo.eyelash} material={matEyelash}
                        position={[0, 0.044, 0.028]} rotation={[0.1, 0, -0.1]}
                        scale={[1, 1.3, 1]} />
                    <mesh geometry={geo.eyelash} material={matEyelash}
                        position={[0.02, 0.040, 0.024]} rotation={[0.2, 0, 0.2]}
                        scale={[1, 1.1, 1]} />
                </group>
                <group ref={eyeRightRef} position={[0.14, -0.04, 0.36]}>
                    <mesh geometry={geo.eyeWhite} material={matWhite}
                        scale={[1, 1.2, 0.55]} />
                    <mesh geometry={geo.iris} material={mats.iris}
                        position={[0, -0.008, 0.02]} scale={[1, 1.12, 0.65]} />
                    <mesh geometry={geo.irisRing} material={mats.irisRing}
                        position={[0, -0.005, 0.032]} rotation={[0, 0, 0]} />
                    <mesh geometry={geo.pupil} material={mats.irisLight}
                        position={[0, 0.006, 0.028]} scale={[0.9, 0.9, 0.6]} />
                    <mesh geometry={geo.pupil} material={matBlack}
                        position={[0, -0.01, 0.033]} />
                    <mesh geometry={geo.highlight1} material={matHighlight}
                        position={[-0.02, 0.022, 0.04]} />
                    <mesh geometry={geo.highlight2} material={matHighlight}
                        position={[0.012, -0.015, 0.04]} />
                    <mesh geometry={geo.highlight3} material={matHighlight}
                        position={[-0.008, 0.008, 0.042]} />
                    {/* Eyelashes */}
                    <mesh geometry={geo.eyelash} material={matEyelash}
                        position={[0.02, 0.042, 0.025]} rotation={[0.2, 0, 0.4]}
                        scale={[1, 1.2, 1]} />
                    <mesh geometry={geo.eyelash} material={matEyelash}
                        position={[0, 0.044, 0.028]} rotation={[0.1, 0, 0.1]}
                        scale={[1, 1.3, 1]} />
                    <mesh geometry={geo.eyelash} material={matEyelash}
                        position={[-0.02, 0.040, 0.024]} rotation={[0.2, 0, -0.2]}
                        scale={[1, 1.1, 1]} />
                </group>

                {/* ── Eyebrows ── */}
                <mesh geometry={geo.eyebrow} material={mats.hairDark}
                    position={[-0.14, 0.06, 0.38]} rotation={[0, 0, 0.15]}
                    scale={[0.8, 1, 0.8]} />
                <mesh geometry={geo.eyebrow} material={mats.hairDark}
                    position={[0.14, 0.06, 0.38]} rotation={[0, 0, -0.15]}
                    scale={[0.8, 1, 0.8]} />

                {/* ── Nose ── */}
                <mesh geometry={geo.nose} material={matNose}
                    position={[0, -0.10, 0.42]} scale={[0.9, 0.65, 0.55]} />

                {/* ── Blush ── */}
                <mesh geometry={geo.blush} material={matBlush}
                    position={[-0.24, -0.10, 0.30]} scale={[1.15, 0.55, 0.42]} />
                <mesh geometry={geo.blush} material={matBlush}
                    position={[0.24, -0.10, 0.30]} scale={[1.15, 0.55, 0.42]} />

                {/* ── Mouth (upper lip + lower lip + gloss) ── */}
                <mesh geometry={geo.mouth} material={matMouth}
                    position={[0, -0.17, 0.40]} rotation={[0, 0, Math.PI]}
                    scale={[0.55, 0.55, 0.35]} />
                <mesh geometry={geo.upperLip} material={matMouth}
                    position={[0, -0.155, 0.41]} scale={[1.2, 0.5, 0.45]} />
                <mesh geometry={geo.lowerLip} material={matLipGloss}
                    position={[0, -0.185, 0.405]} scale={[1.0, 0.5, 0.4]} />

                {/* ════════════ ROLE ACCESSORIES ════════════ */}
                {agent.role === "lead" && (
                    <group position={[0, -0.04, 0.40]}>
                        {/* Director Glasses (Thick Black) */}
                        <mesh geometry={geo.glassLens} material={mats.accessory}
                            position={[-0.14, 0, 0]} />
                        <mesh geometry={geo.glassLens} material={mats.accessory}
                            position={[0.14, 0, 0]} />
                        <mesh geometry={geo.glassRim} material={mats.accessory}
                            position={[-0.14, 0, 0]} />
                        <mesh geometry={geo.glassRim} material={mats.accessory}
                            position={[0.14, 0, 0]} />
                        <mesh geometry={geo.glassBridge} material={mats.accessory}
                            position={[0, 0.005, 0]} rotation={[0, 0, Math.PI / 2]} />
                        <mesh geometry={geo.glassArm} material={mats.accessory}
                            position={[-0.28, 0, -0.05]} rotation={[0, Math.PI / 2, 0]} scale={[1, 1, 1.5]} />
                        <mesh geometry={geo.glassArm} material={mats.accessory}
                            position={[0.28, 0, -0.05]} rotation={[0, Math.PI / 2, 0]} scale={[1, 1, 1.5]} />
                    </group>
                )}
                {agent.role === "backend" && (
                    <group position={[0, -0.04, 0.40]}>
                        {/* Glasses */}
                        <mesh geometry={geo.glassLens} material={mats.accessory}
                            position={[-0.14, 0, 0]} />
                        <mesh geometry={geo.glassLens} material={mats.accessory}
                            position={[0.14, 0, 0]} />
                        <mesh geometry={geo.glassBridge} material={mats.accessory}
                            position={[0, 0.005, 0]} rotation={[0, 0, Math.PI / 2]} />
                        <mesh geometry={geo.glassArm} material={mats.accessory}
                            position={[-0.28, 0, -0.02]} rotation={[0, Math.PI / 2, 0]} />
                        <mesh geometry={geo.glassArm} material={mats.accessory}
                            position={[0.28, 0, -0.02]} rotation={[0, Math.PI / 2, 0]} />
                    </group>
                )}
                {agent.role === "frontend" && (
                    <group position={[-0.30, 0.10, 0.10]}>
                        {/* Hair clip */}
                        <mesh geometry={geo.hairClip} material={mats.accessory}
                            rotation={[0, 0, 0.5]} />
                        <mesh geometry={geo.starSmall} material={matHighlight}
                            position={[0, 0.02, 0.01]} />
                    </group>
                )}
                {agent.role === "qa" && (
                    <group position={[0.34, -0.10, 0.20]} rotation={[0, 0, -0.3]}>
                        {/* Magnifying glass */}
                        <mesh geometry={geo.magnifier} material={mats.accessory} />
                        <mesh geometry={geo.magnifierHandle} material={mats.accessory}
                            position={[0, -0.05, 0]} />
                    </group>
                )}
                {agent.role === "docs" && (
                    <group position={[0.38, 0.08, 0.05]} rotation={[0.3, 0.2, 0.6]}>
                        {/* Pencil behind ear */}
                        <mesh geometry={geo.pencil} material={mats.accessory} />
                        <mesh geometry={geo.pencilTip} material={mats.buckle}
                            position={[0, -0.06, 0]} />
                    </group>
                )}
                {agent.role === "security" && (
                    <group position={[0, -0.05, 0.44]}>
                        {/* Shield badge on face/chest */}
                    </group>
                )}
            </group>

            {/* Security badge on chest */}
            {agent.role === "security" && (
                <group position={[-0.12, 0.55, 0.20]}>
                    <mesh geometry={geo.shieldBadge} material={mats.accessory}
                        rotation={[Math.PI, 0, 0]} scale={[0.8, 0.8, 0.5]} />
                    <mesh geometry={geo.starSmall} material={matHighlight}
                        position={[0, 0.01, 0.01]} />
                </group>
            )}

            {/* ════════════ 3D EMOTION BUBBLE ════════════ */}
            <EmotionBubble3D status={status} />

            {/* ════════════ NAME TAG (Premium Pill) ════════════ */}
            <Billboard position={[0, 1.58, 0]}>
                {/* Pill background with glow */}
                <mesh position={[0, 0, -0.02]}>
                    <planeGeometry args={[0.88, 0.26]} />
                    <meshBasicMaterial color={colors.accent} transparent opacity={0.06} />
                </mesh>
                <RoundedBox args={[0.82, 0.22, 0.02]} radius={0.08} position={[0, 0, -0.01]}>
                    <meshBasicMaterial color="#0f172a" transparent opacity={0.80} />
                </RoundedBox>
                <Text
                    fontSize={0.082}
                    color="#f1f5f9"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.004}
                    outlineColor="#0f172a"
                    font={undefined}
                >
                    {agent.name}
                </Text>
                <Text
                    fontSize={0.052}
                    color={colors.accent}
                    anchorX="center"
                    anchorY="middle"
                    position={[0, -0.10, 0]}
                    font={undefined}
                >
                    {agent.role}
                </Text>
            </Billboard>
        </group>
    );
}
