/**
 * useTimeOfDay — Real-time day/night cycle for the 3D office
 *
 * Returns color presets based on the current hour:
 *   Dawn   (5–7)   → warm golden transition
 *   Day    (7–17)  → bright, light mode
 *   Dusk   (17–20) → warm orange/pink transition
 *   Night  (20–5)  → dark, city lights
 *
 * Updates every 60 seconds.
 */
import { useState, useEffect, useMemo } from "react";

/* ─── lerp helpers ───────────────────────────────────────────────── */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerpColor(hexA, hexB, t) {
    const a = parseInt(hexA.slice(1), 16);
    const b = parseInt(hexB.slice(1), 16);
    const rA = (a >> 16) & 0xff, gA = (a >> 8) & 0xff, bA = a & 0xff;
    const rB = (b >> 16) & 0xff, gB = (b >> 8) & 0xff, bB = b & 0xff;
    const r = Math.round(lerp(rA, rB, t));
    const g = Math.round(lerp(gA, gB, t));
    const bl = Math.round(lerp(bA, bB, t));
    return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

/* ─── Time period presets ────────────────────────────────────────── */
const PRESETS = {
    day: {
        clearColor: "#f5f0e8",
        fogColor: "#d0d8e8",
        fogNear: 20,
        fogFar: 45,
        ambientIntensity: 0.8,
        dirIntensity: 1.0,
        dirColor: "#ffffff",
        hemiSky: "#87ceeb",
        hemiGround: "#e8e0d4",
        hemiIntensity: 0.5,
        accentIntensity: 0.15,
        floor: "#c8ccd4",
        floorGrid: "#b0b4bc",
        floorGridSection: "#9ca0a8",
        wall: "#d4d4dc",
        wallBaseboard: "#9ca3af",
        wallCrown: "#c0c0cc",
        windowGlass: "#87ceeb",
        windowGlassOpacity: 0.35,
        windowEmissive: "#88bbee",
        windowEmissiveIntensity: 0.05,
        windowBg: "#aaccee",
        signBg: "#e8ecf4",
        signBgOpacity: 0.85,
        signText: "#1e293b",
        zoneSignBg: "#f0f2f8",
        particleColor: "#94a3b8",
        label: "Day",
        period: "day",
    },
    night: {
        clearColor: "#0f1117",
        fogColor: "#0f1117",
        fogNear: 15,
        fogFar: 35,
        ambientIntensity: 0.45,
        dirIntensity: 0.3,
        dirColor: "#8888cc",
        hemiSky: "#2a2a5e",
        hemiGround: "#1a1a2e",
        hemiIntensity: 0.3,
        accentIntensity: 0.25,
        floor: "#12121f",
        floorGrid: "#1e1e32",
        floorGridSection: "#2a2a42",
        wall: "#1e1e2e",
        wallBaseboard: "#374151",
        wallCrown: "#2d2d42",
        windowGlass: "#1a1a3e",
        windowGlassOpacity: 0.6,
        windowEmissive: "#4466aa",
        windowEmissiveIntensity: 0.15,
        windowBg: "#1a2744",
        signBg: "#0f172a",
        signBgOpacity: 0.7,
        signText: "#e2e8f0",
        zoneSignBg: "#0f172a",
        particleColor: "#818cf8",
        label: "Night",
        period: "night",
    },
    dawn: {
        clearColor: "#f5d5b8",
        fogColor: "#e8c8a8",
        fogNear: 18,
        fogFar: 40,
        ambientIntensity: 0.6,
        dirIntensity: 0.7,
        dirColor: "#ffcc88",
        hemiSky: "#f0a060",
        hemiGround: "#d4c0a8",
        hemiIntensity: 0.4,
        accentIntensity: 0.2,
        floor: "#a8a0a0",
        floorGrid: "#908888",
        floorGridSection: "#807878",
        wall: "#b8b0ac",
        wallBaseboard: "#8c8480",
        wallCrown: "#a09890",
        windowGlass: "#f0a868",
        windowGlassOpacity: 0.4,
        windowEmissive: "#ff9944",
        windowEmissiveIntensity: 0.1,
        windowBg: "#e8a050",
        signBg: "#e8dcd0",
        signBgOpacity: 0.8,
        signText: "#3d2e1e",
        zoneSignBg: "#e0d4c8",
        particleColor: "#d4a878",
        label: "Dawn",
        period: "dawn",
    },
    dusk: {
        clearColor: "#3d2850",
        fogColor: "#2d1e40",
        fogNear: 16,
        fogFar: 38,
        ambientIntensity: 0.5,
        dirIntensity: 0.5,
        dirColor: "#ff8866",
        hemiSky: "#6040a0",
        hemiGround: "#2a1a30",
        hemiIntensity: 0.35,
        accentIntensity: 0.22,
        floor: "#4a4058",
        floorGrid: "#3a3048",
        floorGridSection: "#2e2440",
        wall: "#5a4868",
        wallBaseboard: "#4a3858",
        wallCrown: "#504060",
        windowGlass: "#6040a0",
        windowGlassOpacity: 0.5,
        windowEmissive: "#cc6644",
        windowEmissiveIntensity: 0.12,
        windowBg: "#402838",
        signBg: "#2a1e3a",
        signBgOpacity: 0.75,
        signText: "#d8cce8",
        zoneSignBg: "#2a1e3a",
        particleColor: "#a878d4",
        label: "Dusk",
        period: "dusk",
    },
};

/* ─── Compute blended preset based on fractional hour ────────────── */
function getTimePreset(hour) {
    // hour is 0-24 float (e.g. 14.5 = 2:30pm)
    if (hour >= 7 && hour < 17) return { preset: PRESETS.day, t: 0 };
    if (hour >= 20 || hour < 5) return { preset: PRESETS.night, t: 0 };

    // Dawn: 5 → 7 (blend night → day)
    if (hour >= 5 && hour < 6) {
        const t = hour - 5; // 0 → 1
        return { a: PRESETS.night, b: PRESETS.dawn, t };
    }
    if (hour >= 6 && hour < 7) {
        const t = hour - 6; // 0 → 1
        return { a: PRESETS.dawn, b: PRESETS.day, t };
    }

    // Dusk: 17 → 20 (blend day → night)
    if (hour >= 17 && hour < 18.5) {
        const t = (hour - 17) / 1.5; // 0 → 1
        return { a: PRESETS.day, b: PRESETS.dusk, t };
    }
    if (hour >= 18.5 && hour < 20) {
        const t = (hour - 18.5) / 1.5; // 0 → 1
        return { a: PRESETS.dusk, b: PRESETS.night, t };
    }

    return { preset: PRESETS.day, t: 0 };
}

function blendPresets(result) {
    if (result.preset) return result.preset;
    const { a, b, t } = result;
    const blended = {};
    for (const key of Object.keys(a)) {
        const va = a[key];
        const vb = b[key];
        if (typeof va === "number") {
            blended[key] = lerp(va, vb, t);
        } else if (typeof va === "string" && va.startsWith("#")) {
            blended[key] = lerpColor(va, vb, t);
        } else {
            blended[key] = t < 0.5 ? va : vb;
        }
    }
    return blended;
}

/* ─── Hook ───────────────────────────────────────────────────────── */
export default function useTimeOfDay() {
    const [hour, setHour] = useState(() => {
        const now = new Date();
        return now.getHours() + now.getMinutes() / 60;
    });

    useEffect(() => {
        const update = () => {
            const now = new Date();
            setHour(now.getHours() + now.getMinutes() / 60);
        };
        const id = setInterval(update, 60_000); // update every minute
        return () => clearInterval(id);
    }, []);

    const timeColors = useMemo(() => blendPresets(getTimePreset(hour)), [hour]);

    return timeColors;
}
