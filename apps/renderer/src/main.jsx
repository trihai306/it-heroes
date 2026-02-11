import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider, theme } from "antd";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import useThemeStore from "@/stores/useThemeStore";

/* ─── Shared brand tokens ─────────────────────────────────────────── */
const shared = {
    colorPrimary: "#6366f1",
    colorInfo: "#818cf8",
    colorSuccess: "#22c55e",
    colorWarning: "#eab308",
    colorError: "#ef4444",
    colorLink: "#6366f1",
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontFamilyCode: '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
    fontSize: 13,
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    controlHeight: 34,
    controlHeightSM: 28,
};

/* ─── Dark theme — inspired by Linear, Raycast, Vercel ────────────── */
const darkTheme = {
    algorithm: theme.darkAlgorithm,
    token: {
        ...shared,
        colorBgBase: "#0f1117",
        colorBgContainer: "#181a24",
        colorBgElevated: "#1e2030",
        colorBgLayout: "#0f1117",
        colorBgSpotlight: "#252840",
        colorText: "rgba(255, 255, 255, 0.92)",
        colorTextSecondary: "rgba(255, 255, 255, 0.55)",
        colorTextTertiary: "rgba(255, 255, 255, 0.35)",
        colorTextQuaternary: "rgba(255, 255, 255, 0.18)",
        colorBorder: "rgba(255, 255, 255, 0.08)",
        colorBorderSecondary: "rgba(255, 255, 255, 0.05)",
    },
    components: {
        Layout: { bodyBg: "#0f1117", headerBg: "transparent", siderBg: "#13151f", triggerBg: "#1e2030" },
        Menu: {
            darkItemBg: "transparent", darkItemSelectedBg: "rgba(99, 102, 241, 0.10)", darkItemSelectedColor: "#a5b4fc",
            darkItemHoverBg: "rgba(255, 255, 255, 0.04)", darkItemColor: "rgba(255,255,255,0.55)", itemBorderRadius: 6, itemMarginInline: 6,
        },
        Card: { colorBgContainer: "#181a24", actionsBg: "#13151f", headerBg: "transparent" },
        Button: { primaryShadow: "0 1px 2px rgba(0,0,0,0.3)", defaultBg: "#1e2030", defaultBorderColor: "rgba(255,255,255,0.08)" },
        Tabs: { inkBarColor: "#6366f1", itemSelectedColor: "#a5b4fc", itemHoverColor: "rgba(255,255,255,0.7)", itemColor: "rgba(255,255,255,0.45)" },
        Tag: { defaultBg: "rgba(99, 102, 241, 0.08)", defaultColor: "#a5b4fc" },
        Input: { activeBorderColor: "#6366f1", hoverBorderColor: "rgba(99,102,241,0.4)", colorBgContainer: "#13151f" },
        Select: { optionSelectedBg: "rgba(99,102,241,0.10)", colorBgContainer: "#13151f" },
        Modal: { contentBg: "#1e2030", headerBg: "#1e2030" },
        Segmented: { itemSelectedBg: "#6366f1", itemSelectedColor: "#fff", trackBg: "rgba(255,255,255,0.04)", itemColor: "rgba(255,255,255,0.5)", itemHoverColor: "rgba(255,255,255,0.8)" },
        Popconfirm: { colorWarning: "#ef4444" },
    },
};

/* ─── Light theme — clean, professional ───────────────────────────── */
const lightTheme = {
    algorithm: theme.defaultAlgorithm,
    token: {
        ...shared,
        colorBgBase: "#ffffff",
        colorBgContainer: "#ffffff",
        colorBgElevated: "#ffffff",
        colorBgLayout: "#f8f9fc",
        colorBgSpotlight: "#f0f1f5",
        colorText: "rgba(0, 0, 0, 0.88)",
        colorTextSecondary: "rgba(0, 0, 0, 0.55)",
        colorTextTertiary: "rgba(0, 0, 0, 0.35)",
        colorTextQuaternary: "rgba(0, 0, 0, 0.18)",
        colorBorder: "rgba(0, 0, 0, 0.08)",
        colorBorderSecondary: "rgba(0, 0, 0, 0.04)",
    },
    components: {
        Layout: { bodyBg: "#f8f9fc", headerBg: "transparent", siderBg: "#ffffff", triggerBg: "#f0f1f5" },
        Menu: {
            itemBg: "transparent", itemSelectedBg: "rgba(99, 102, 241, 0.06)", itemSelectedColor: "#6366f1",
            itemHoverBg: "rgba(0, 0, 0, 0.03)", itemColor: "rgba(0,0,0,0.55)", itemBorderRadius: 6, itemMarginInline: 6,
        },
        Card: { colorBgContainer: "#ffffff", actionsBg: "#f8f9fc", headerBg: "transparent" },
        Button: { primaryShadow: "0 1px 2px rgba(99,102,241,0.15)", defaultBg: "#ffffff", defaultBorderColor: "rgba(0,0,0,0.1)" },
        Tabs: { inkBarColor: "#6366f1", itemSelectedColor: "#6366f1", itemHoverColor: "rgba(0,0,0,0.7)", itemColor: "rgba(0,0,0,0.45)" },
        Tag: { defaultBg: "rgba(99, 102, 241, 0.06)", defaultColor: "#6366f1" },
        Input: { activeBorderColor: "#6366f1", hoverBorderColor: "rgba(99,102,241,0.4)", colorBgContainer: "#ffffff" },
        Select: { optionSelectedBg: "rgba(99,102,241,0.06)", colorBgContainer: "#ffffff" },
        Modal: { contentBg: "#ffffff", headerBg: "#ffffff" },
        Segmented: { itemSelectedBg: "#6366f1", itemSelectedColor: "#fff", trackBg: "rgba(0,0,0,0.04)", itemColor: "rgba(0,0,0,0.5)", itemHoverColor: "rgba(0,0,0,0.8)" },
        Popconfirm: { colorWarning: "#ef4444" },
    },
};

/* ─── Themed root ─────────────────────────────────────────────────── */
function ThemedApp() {
    const isDark = useThemeStore((s) => s.isDark);
    return (
        <ConfigProvider theme={isDark ? darkTheme : lightTheme}>
            <App />
        </ConfigProvider>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <BrowserRouter>
            <ThemedApp />
        </BrowserRouter>
    </React.StrictMode>
);
