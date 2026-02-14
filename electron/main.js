const { app, BrowserWindow, ipcMain, Notification, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess = null;

const isDev = !app.isPackaged;
const SKIP_BACKEND = process.env.SKIP_BACKEND === '1';
const PYTHON_PORT = 8000;
const VITE_DEV_URL = 'http://localhost:5173';

// Paths — FE and Backend are sibling folders
const PROJECT_ROOT = path.join(__dirname, '..');
const FE_DIR = path.join(PROJECT_ROOT, 'FE');
const BACKEND_DIR = path.join(PROJECT_ROOT, 'backend');

// ── Python Backend Management ──────────────────────────────────

function startPythonBackend() {
    const backendDir = isDev
        ? BACKEND_DIR
        : path.join(process.resourcesPath, 'backend');

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    pythonProcess = spawn(pythonCmd, [
        '-m', 'uvicorn', 'main:app',
        '--host', '0.0.0.0',
        '--port', String(PYTHON_PORT),
        '--reload'
    ], {
        cwd: backendDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    pythonProcess.stdout.on('data', (data) => {
        console.log(`[Python] ${data.toString().trim()}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('python:log', data.toString());
        }
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`[Python] ${data.toString().trim()}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('python:log', data.toString());
        }
    });

    pythonProcess.on('close', (code) => {
        console.log(`[Python] Process exited with code ${code}`);
        pythonProcess = null;
    });

    pythonProcess.on('error', (err) => {
        console.error('[Python] Failed to start:', err.message);
        pythonProcess = null;
    });

    console.log(`[Electron] Python backend starting on port ${PYTHON_PORT}...`);
}

function stopPythonBackend() {
    if (pythonProcess) {
        pythonProcess.kill('SIGTERM');
        pythonProcess = null;
        console.log('[Electron] Python backend stopped.');
    }
}

// ── Window Creation ────────────────────────────────────────────

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'IT Heroes — Multi-Agent Platform',
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 15, y: 15 },
        backgroundColor: '#1a1c2e',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
        },
    });

    if (isDev) {
        mainWindow.loadURL(VITE_DEV_URL);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        mainWindow.loadFile(path.join(FE_DIR, 'dist', 'index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ── IPC Handlers ───────────────────────────────────────────────

function setupIpcHandlers() {
    ipcMain.handle('python:status', async () => {
        return { running: pythonProcess !== null, port: PYTHON_PORT };
    });

    ipcMain.handle('python:restart', async () => {
        if (SKIP_BACKEND) return { success: true, skipped: true };
        stopPythonBackend();
        startPythonBackend();
        return { success: true };
    });

    ipcMain.handle('app:info', async () => {
        return {
            version: app.getVersion(),
            platform: process.platform,
            arch: process.arch,
            electron: process.versions.electron,
            node: process.versions.node,
        };
    });

    // ── Native Notification ────────────────────────────────────
    ipcMain.handle('notification:show', async (_event, { title, body, icon }) => {
        if (!Notification.isSupported()) return { success: false };

        const notif = new Notification({
            title: title || 'IT Heroes',
            body: body || '',
            icon: icon || undefined,
            silent: false,
        });

        notif.on('click', () => {
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
            }
        });

        notif.show();
        return { success: true };
    });

    // ── CLI: find path helper ────────────────────────────────
    function findCliPath() {
        const { execSync } = require('child_process');
        const pathMod = require('path');
        const fs = require('fs');
        const os = require('os');
        const home = os.homedir();

        // 1) Try login shell which
        try {
            const shell = process.env.SHELL || '/bin/zsh';
            const p = execSync(`${shell} -ilc 'which claude' 2>/dev/null`, { encoding: 'utf8' }).trim();
            if (p && fs.existsSync(p)) return p;
        } catch { /* fallthrough */ }

        // 2) Common install paths
        const candidates = [
            pathMod.join(home, '.local', 'bin', 'claude'),
            pathMod.join(home, '.npm-global', 'bin', 'claude'),
            '/usr/local/bin/claude',
            '/opt/homebrew/bin/claude',
        ];
        const nvmDir = process.env.NVM_DIR || pathMod.join(home, '.nvm');
        try {
            const nodeVersions = pathMod.join(nvmDir, 'versions', 'node');
            if (fs.existsSync(nodeVersions)) {
                for (const v of fs.readdirSync(nodeVersions).reverse()) {
                    candidates.push(pathMod.join(nodeVersions, v, 'bin', 'claude'));
                }
            }
        } catch { /* ignore */ }

        for (const c of candidates) {
            if (fs.existsSync(c)) return c;
        }
        return null;
    }

    // ── CLI Check ─────────────────────────────────────────────
    ipcMain.handle('cli:check', async () => {
        const { execFileSync } = require('child_process');
        const cliPath = findCliPath();
        if (!cliPath) return { available: false, path: null, version: null };

        try {
            const version = execFileSync(cliPath, ['--version'], { encoding: 'utf8', timeout: 5000 }).trim();
            return { available: true, path: cliPath, version };
        } catch {
            return { available: true, path: cliPath, version: null };
        }
    });

    // ── CLI Auth Status ──────────────────────────────────────
    ipcMain.handle('cli:auth-status', async () => {
        const { execFileSync } = require('child_process');
        const cliPath = findCliPath();
        if (!cliPath) return { loggedIn: false, error: 'CLI not found' };

        try {
            const output = execFileSync(cliPath, ['auth', 'status'], { encoding: 'utf8', timeout: 10000 });
            return JSON.parse(output.trim());
        } catch (e) {
            return { loggedIn: false, error: e.message };
        }
    });

    // ── CLI Auth Login (opens browser) ───────────────────────
    ipcMain.handle('cli:auth-login', async () => {
        const cliPath = findCliPath();
        if (!cliPath) return { success: false, error: 'CLI not found' };

        return new Promise((resolve) => {
            const loginProcess = spawn(cliPath, ['auth', 'login'], {
                shell: false,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env },
            });

            loginProcess.stdout.on('data', (data) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('cli:auth-progress', {
                        type: 'stdout',
                        message: data.toString().trim(),
                    });
                }
            });

            loginProcess.stderr.on('data', (data) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('cli:auth-progress', {
                        type: 'stderr',
                        message: data.toString().trim(),
                    });
                }
            });

            loginProcess.on('close', (code) => {
                resolve({ success: code === 0, exitCode: code });
            });

            loginProcess.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });
        });
    });

    // ── CLI Auth Logout ──────────────────────────────────────
    ipcMain.handle('cli:auth-logout', async () => {
        const { execFileSync } = require('child_process');
        const cliPath = findCliPath();
        if (!cliPath) return { success: false, error: 'CLI not found' };

        try {
            execFileSync(cliPath, ['auth', 'logout'], { encoding: 'utf8', timeout: 10000 });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    // ── GitHub Auth ───────────────────────────────────────────
    function findGhPath() {
        const { execSync } = require('child_process');
        const fs = require('fs');

        // Try login shell
        try {
            const shell = process.env.SHELL || '/bin/zsh';
            const ghPath = execSync(`${shell} -ilc 'which gh' 2>/dev/null`, { encoding: 'utf8' }).trim();
            if (ghPath && fs.existsSync(ghPath)) return ghPath;
        } catch { /* fallthrough */ }

        // Common paths
        const candidates = [
            '/opt/homebrew/bin/gh',
            '/usr/local/bin/gh',
            `${process.env.HOME}/.local/bin/gh`,
        ];
        for (const p of candidates) {
            if (fs.existsSync(p)) return p;
        }
        return null;
    }

    ipcMain.handle('gh:auth-status', async () => {
        const ghPath = findGhPath();
        if (!ghPath) return { available: false, loggedIn: false, error: 'GitHub CLI (gh) not installed' };

        try {
            const { execFileSync } = require('child_process');
            const output = execFileSync(ghPath, ['auth', 'status'], {
                encoding: 'utf8',
                timeout: 10000,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            const combined = output;
            const loggedIn = combined.includes('Logged in') || combined.includes('✓');
            let account = null, protocol = null, scopes = null;

            for (const line of combined.split('\n')) {
                const trimmed = line.trim();
                if (trimmed.toLowerCase().includes('account')) {
                    const parts = trimmed.split('account');
                    if (parts.length > 1) account = parts[1].trim().split(' ')[0];
                }
                if (trimmed.includes('Git operations protocol')) protocol = trimmed.split(':').pop().trim();
                if (trimmed.includes('Token scopes')) scopes = trimmed.split(':').pop().trim().replace(/['"]/g, '');
            }

            return { available: true, loggedIn, account, protocol, scopes, raw: combined };
        } catch (e) {
            // gh auth status writes to stderr on success
            const stderr = e.stderr ? e.stderr.toString() : '';
            const stdout = e.stdout ? e.stdout.toString() : '';
            const combined = stdout + stderr;
            const loggedIn = combined.includes('Logged in') || combined.includes('✓');
            let account = null, protocol = null, scopes = null;

            for (const line of combined.split('\n')) {
                const trimmed = line.trim();
                if (trimmed.toLowerCase().includes('account')) {
                    const parts = trimmed.split('account');
                    if (parts.length > 1) account = parts[1].trim().split(' ')[0];
                }
                if (trimmed.includes('Git operations protocol')) protocol = trimmed.split(':').pop().trim();
                if (trimmed.includes('Token scopes')) scopes = trimmed.split(':').pop().trim().replace(/['"]/g, '');
            }

            if (loggedIn) return { available: true, loggedIn: true, account, protocol, scopes, raw: combined };
            return { available: true, loggedIn: false, error: e.message };
        }
    });

    ipcMain.handle('gh:auth-login', async () => {
        const ghPath = findGhPath();
        if (!ghPath) return { success: false, error: 'GitHub CLI (gh) not installed' };

        return new Promise((resolve) => {
            const loginProcess = spawn(ghPath, ['auth', 'login', '--web', '--git-protocol', 'https', '--scopes', 'repo,read:org,gist'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env },
            });

            loginProcess.stdout.on('data', (data) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('gh:auth-progress', {
                        type: 'stdout',
                        message: data.toString().trim(),
                    });
                }
            });

            loginProcess.stderr.on('data', (data) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('gh:auth-progress', {
                        type: 'stderr',
                        message: data.toString().trim(),
                    });
                }
            });

            loginProcess.on('close', (code) => {
                resolve({ success: code === 0, exitCode: code });
            });

            loginProcess.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });
        });
    });

    ipcMain.handle('gh:auth-logout', async () => {
        const ghPath = findGhPath();
        if (!ghPath) return { success: false, error: 'GitHub CLI not found' };

        try {
            const { execFileSync } = require('child_process');
            execFileSync(ghPath, ['auth', 'logout', '--hostname', 'github.com'], {
                encoding: 'utf8',
                timeout: 10000,
                input: 'Y\n',
            });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    // ── CLI Install ───────────────────────────────────────────
    ipcMain.handle('cli:install', async () => {
        return new Promise((resolve) => {
            const installProcess = spawn('npm', ['install', '-g', '@anthropic-ai/claude-code'], {
                shell: true,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env },
            });

            installProcess.stdout.on('data', (data) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('cli:install-progress', {
                        type: 'stdout',
                        message: data.toString().trim(),
                    });
                }
            });

            installProcess.stderr.on('data', (data) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('cli:install-progress', {
                        type: 'stderr',
                        message: data.toString().trim(),
                    });
                }
            });

            installProcess.on('close', (code) => {
                resolve({ success: code === 0, exitCode: code });
            });

            installProcess.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });
        });
    });

    // ── Directory Picker ─────────────────────────────────────────
    ipcMain.handle('dialog:openDirectory', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Select Project Folder',
        });
        if (result.canceled || !result.filePaths.length) return null;
        return result.filePaths[0];
    });
}

// ── App Lifecycle ──────────────────────────────────────────────

app.whenReady().then(() => {
    setupIpcHandlers();
    if (!SKIP_BACKEND) startPythonBackend();
    else console.log('[Electron] SKIP_BACKEND=1 — using Docker backend');
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    stopPythonBackend();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopPythonBackend();
});
