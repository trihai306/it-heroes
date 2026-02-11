/**
 * Chibi Office AI — Preload Script
 *
 * Exposes a safe API to the renderer via contextBridge.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chibiAPI", {
    /**
     * Open a native file dialog to select a git repo folder.
     * @returns {Promise<string|null>} The selected folder path or null if canceled.
     */
    selectRepo: () => ipcRenderer.invoke("select-repo"),

    /**
     * Get the backend REST API base URL.
     * @returns {Promise<string>} e.g. "http://127.0.0.1:8420"
     */
    getBackendUrl: () => ipcRenderer.invoke("get-backend-url"),

    /**
     * Get the WebSocket base URL.
     * @returns {Promise<string>} e.g. "ws://127.0.0.1:8420"
     */
    getWsUrl: () => ipcRenderer.invoke("get-ws-url"),

    /**
     * Platform info for UI adaptations.
     */
    platform: process.platform,
});
