/**
 * Shared geometries and materials for all furniture models
 * Created once at module scope — zero GC overhead
 */
import * as THREE from "three";

/* ─── Shared geometries ──────────────────────────────────────────── */
export const geo = {
    box: new THREE.BoxGeometry(1, 1, 1),
    plane: new THREE.PlaneGeometry(1, 1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
    cylinderSmooth: new THREE.CylinderGeometry(1, 1, 1, 24),
    sphere: new THREE.SphereGeometry(1, 14, 12),
    cone: new THREE.ConeGeometry(1, 1, 14),
    torus: new THREE.TorusGeometry(1, 0.3, 8, 16),
    capsule: new THREE.CapsuleGeometry(1, 1, 8, 12),
};

/* ─── PBR materials ──────────────────────────────────────────────── */
export const mat = {
    /* Wood tones */
    wood: new THREE.MeshStandardMaterial({ color: "#c4956a", roughness: 0.55, metalness: 0.05 }),
    woodDark: new THREE.MeshStandardMaterial({ color: "#8b6f47", roughness: 0.6, metalness: 0.05 }),
    woodLight: new THREE.MeshStandardMaterial({ color: "#deb887", roughness: 0.5, metalness: 0.02 }),
    woodWalnut: new THREE.MeshStandardMaterial({ color: "#5c3d2e", roughness: 0.5, metalness: 0.04 }),
    woodMaple: new THREE.MeshStandardMaterial({ color: "#e8c899", roughness: 0.45, metalness: 0.03 }),

    /* Metal */
    metal: new THREE.MeshStandardMaterial({ color: "#b0b8c4", metalness: 0.7, roughness: 0.25 }),
    metalDark: new THREE.MeshStandardMaterial({ color: "#64748b", metalness: 0.6, roughness: 0.3 }),
    chrome: new THREE.MeshStandardMaterial({ color: "#d4d8dd", metalness: 0.9, roughness: 0.1 }),
    brushedSteel: new THREE.MeshStandardMaterial({ color: "#a8b0bc", metalness: 0.75, roughness: 0.35 }),
    brass: new THREE.MeshStandardMaterial({ color: "#d4af37", metalness: 0.8, roughness: 0.2 }),

    /* Screens & peripherals */
    screenOff: new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.9, metalness: 0.1 }),
    screenBezel: new THREE.MeshStandardMaterial({ color: "#1a1a2e", roughness: 0.4, metalness: 0.2 }),
    peripheral: new THREE.MeshStandardMaterial({ color: "#374151", roughness: 0.5, metalness: 0.15 }),
    keycap: new THREE.MeshStandardMaterial({ color: "#2d3748", roughness: 0.6, metalness: 0.08 }),

    /* Fabrics */
    fabricGray: new THREE.MeshStandardMaterial({ color: "#6b7280", roughness: 0.8 }),
    fabricBlue: new THREE.MeshStandardMaterial({ color: "#3b82f6", roughness: 0.75 }),
    meshFabric: new THREE.MeshStandardMaterial({ color: "#4a5568", roughness: 0.85, metalness: 0.02 }),
    leather: new THREE.MeshStandardMaterial({ color: "#2c1810", roughness: 0.65, metalness: 0.05 }),
    leatherBlack: new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.6, metalness: 0.08 }),
    cushion: new THREE.MeshStandardMaterial({ color: "#4b5563", roughness: 0.85 }),

    /* Neutral */
    white: new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.4 }),
    cream: new THREE.MeshStandardMaterial({ color: "#fef3c7", roughness: 0.5 }),
    offWhite: new THREE.MeshStandardMaterial({ color: "#f1f5f9", roughness: 0.45 }),

    /* Nature */
    green: new THREE.MeshStandardMaterial({ color: "#4ade80", roughness: 0.55 }),
    darkGreen: new THREE.MeshStandardMaterial({ color: "#16a34a", roughness: 0.5 }),
    leafGreen: new THREE.MeshStandardMaterial({ color: "#22c55e", roughness: 0.6 }),
    leafDark: new THREE.MeshStandardMaterial({ color: "#15803d", roughness: 0.55 }),
    trunk: new THREE.MeshStandardMaterial({ color: "#92400e", roughness: 0.8 }),
    potTerra: new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.7 }),
    potCeramic: new THREE.MeshStandardMaterial({ color: "#e8e0d8", roughness: 0.35, metalness: 0.05 }),
    soil: new THREE.MeshStandardMaterial({ color: "#451a03", roughness: 0.9 }),
    pebble: new THREE.MeshStandardMaterial({ color: "#9ca3af", roughness: 0.7, metalness: 0.05 }),

    /* Kitchen / café */
    ceramic: new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.45 }),
    coffee: new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.6 }),
    porcelain: new THREE.MeshStandardMaterial({ color: "#fafaf9", roughness: 0.3, metalness: 0.05 }),

    /* Game room */
    felt: new THREE.MeshStandardMaterial({ color: "#15803d", roughness: 0.9 }),
    mahogany: new THREE.MeshStandardMaterial({ color: "#7f1d1d", roughness: 0.5, metalness: 0.05 }),
    cue: new THREE.MeshStandardMaterial({ color: "#d4a574", roughness: 0.4 }),
    ballWhite: new THREE.MeshStandardMaterial({ color: "#fefce8", roughness: 0.2, metalness: 0.1 }),

    /* Office */
    frame: new THREE.MeshStandardMaterial({ color: "#9ca3af", metalness: 0.5, roughness: 0.3 }),
    whiteboard: new THREE.MeshStandardMaterial({ color: "#fefefe", roughness: 0.25, metalness: 0.05 }),
    stickyYellow: new THREE.MeshStandardMaterial({ color: "#fef08a", roughness: 0.7 }),
    stickyPink: new THREE.MeshStandardMaterial({ color: "#fda4af", roughness: 0.7 }),
    stickyBlue: new THREE.MeshStandardMaterial({ color: "#93c5fd", roughness: 0.7 }),

    /* Glass */
    glass: new THREE.MeshStandardMaterial({
        color: "#e0f2fe", transparent: true, opacity: 0.15,
        roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide,
    }),
    waterGlass: new THREE.MeshStandardMaterial({
        color: "#93c5fd", transparent: true, opacity: 0.35,
        roughness: 0.05, metalness: 0.05,
    }),

    /* Book colors */
    bookColors: [
        new THREE.MeshStandardMaterial({ color: "#818cf8", roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: "#34d399", roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: "#fbbf24", roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: "#fb7185", roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: "#a78bfa", roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: "#38bdf8", roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: "#f472b6", roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: "#84cc16", roughness: 0.7 }),
    ],

    /* Server rack */
    rackBody: new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.5, roughness: 0.3 }),
    rackUnit: new THREE.MeshStandardMaterial({ color: "#475569", metalness: 0.4, roughness: 0.4 }),
    rackVent: new THREE.MeshStandardMaterial({ color: "#1e293b", metalness: 0.3, roughness: 0.5 }),
};
