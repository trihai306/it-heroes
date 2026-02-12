/**
 * Chibi Office AI — Electron Main Process
 *
 * Responsibilities:
 * 1. Create the main BrowserWindow
 * 2. Spawn the Python FastAPI backend
 * 3. Bridge IPC between renderer and system
 */

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

/* ─── GPU & WebGPU acceleration flags ───────────────────────────────
 * Must be set BEFORE app.whenReady().
 * Electron 35 (Chromium 134) supports WebGPU natively.
 */
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("enable-features", "WebGPU,Vulkan,CanvasOopRasterization");
app.commandLine.appendSwitch("enable-unsafe-webgpu");   // allow WebGPU without origin trial
app.commandLine.appendSwitch("use-angle", "metal");      // macOS: Metal backend for WebGL (faster)

let mainWindow = null;
let backendProcess = null;

const BACKEND_PORT = 8420;
const DEV_SERVER_URL = "http://localhost:5173";
const isDev = process.env.NODE_ENV === "development";

// ─── Backend Management ──────────────────────────────────────────────

function getBackendPath() {
    if (isDev) {
        return path.join(__dirname, "..", "backend");
    }
    return path.join(process.resourcesPath, "backend");
}

function spawnBackend() {
    const backendDir = getBackendPath();
    const pythonCmd = process.platform === "win32" ? "python" : "python3";

    console.log(`🐍 Starting backend at ${backendDir}...`);

    backendProcess = spawn(
        pythonCmd,
        ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", String(BACKEND_PORT)],
        {
            cwd: backendDir,
            env: {
                ...process.env,
                CHIBI_PORT: String(BACKEND_PORT),
                CHIBI_DEBUG: isDev ? "true" : "false",
            },
            stdio: ["pipe", "pipe", "pipe"],
        }
    );

    backendProcess.stdout.on("data", (data) => {
        console.log(`[backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on("data", (data) => {
        console.error(`[backend] ${data.toString().trim()}`);
    });

    backendProcess.on("error", (err) => {
        console.error("Failed to start backend:", err);
    });

    backendProcess.on("exit", (code) => {
        console.log(`Backend exited with code ${code}`);
        backendProcess = null;
    });
}

async function waitForBackend(maxRetries = 30) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(`http://127.0.0.1:${BACKEND_PORT}/health`);
            if (response.ok) {
                console.log("✅ Backend is ready");
                return true;
            }
        } catch {
            // Not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    console.error("❌ Backend failed to start");
    return false;
}

function killBackend() {
    if (backendProcess) {
        console.log("🛑 Stopping backend...");
        backendProcess.kill("SIGTERM");
        backendProcess = null;
    }
}

// ─── Window ──────────────────────────────────────────────────────────

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: "Chibi Office AI",
        backgroundColor: "#0a0a1a",
        titleBarStyle: "hiddenInset",
        trafficLightPosition: { x: 16, y: 16 },
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    if (isDev) {
        mainWindow.loadURL(DEV_SERVER_URL);
        mainWindow.webContents.openDevTools({ mode: "detach" });
    } else {
        mainWindow.loadFile(path.join(__dirname, "..", "renderer", "dist", "index.html"));
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

// ─── IPC Handlers ────────────────────────────────────────────────────

ipcMain.handle("select-repo", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: "Select a Git Repository",
        properties: ["openDirectory"],
        message: "Choose a folder that contains a .git directory",
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    return result.filePaths[0];
});

ipcMain.handle("get-backend-url", () => {
    return `http://127.0.0.1:${BACKEND_PORT}`;
});

ipcMain.handle("get-ws-url", () => {
    return `ws://127.0.0.1:${BACKEND_PORT}`;
});

// ─── App Lifecycle ───────────────────────────────────────────────────

app.whenReady().then(async () => {
    spawnBackend();
    const backendReady = await waitForBackend();

    if (!backendReady) {
        dialog.showErrorBox(
            "Backend Error",
            "Failed to start the Python backend. Make sure Python 3.11+ and dependencies are installed."
        );
    }

    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    killBackend();
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("before-quit", () => {
    killBackend();
});
