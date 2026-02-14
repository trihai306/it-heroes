const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Python backend management
    getPythonStatus: () => ipcRenderer.invoke('python:status'),
    restartPython: () => ipcRenderer.invoke('python:restart'),

    // App information
    getAppInfo: () => ipcRenderer.invoke('app:info'),

    // Python log stream (one-way from main → renderer)
    onPythonLog: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('python:log', handler);
        return () => ipcRenderer.removeListener('python:log', handler);
    },

    // Native Notification
    showNotification: ({ title, body }) =>
        ipcRenderer.invoke('notification:show', { title, body }),

    // CLI Management
    checkCLI: () => ipcRenderer.invoke('cli:check'),
    installCLI: () => ipcRenderer.invoke('cli:install'),
    onInstallProgress: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('cli:install-progress', handler);
        return () => ipcRenderer.removeListener('cli:install-progress', handler);
    },

    // CLI Authentication
    authStatus: () => ipcRenderer.invoke('cli:auth-status'),
    authLogin: () => ipcRenderer.invoke('cli:auth-login'),
    authLogout: () => ipcRenderer.invoke('cli:auth-logout'),
    onAuthProgress: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('cli:auth-progress', handler);
        return () => ipcRenderer.removeListener('cli:auth-progress', handler);
    },

    // GitHub Authentication
    ghAuthStatus: () => ipcRenderer.invoke('gh:auth-status'),
    ghAuthLogin: () => ipcRenderer.invoke('gh:auth-login'),
    ghAuthLogout: () => ipcRenderer.invoke('gh:auth-logout'),
    onGhAuthProgress: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('gh:auth-progress', handler);
        return () => ipcRenderer.removeListener('gh:auth-progress', handler);
    },
});

