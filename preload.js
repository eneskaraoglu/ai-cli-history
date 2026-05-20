const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConversations: () => ipcRenderer.invoke('get-conversations'),
  getConversationDetails: (filePath) => ipcRenderer.invoke('get-conversation-details', filePath),
  getHistoryPath: () => ipcRenderer.invoke('get-history-path'),
  backupConversation: (filePath) => ipcRenderer.invoke('backup-conversation', filePath),
  exportMarkdown: (filePath) => ipcRenderer.invoke('export-markdown', filePath),
  openBackupFolder: () => ipcRenderer.invoke('open-backup-folder'),
  getBackups: () => ipcRenderer.invoke('get-backups'),
  deleteBackup: (filePath) => ipcRenderer.invoke('delete-backup', filePath),
  // Codex
  getCodexSessions: () => ipcRenderer.invoke('get-codex-sessions'),
  getCodexSessionDetails: (filePath) => ipcRenderer.invoke('get-codex-session-details', filePath),
  // Backup settings
  getBackupSettings: () => ipcRenderer.invoke('get-backup-settings'),
  setBackupPath: (newPath) => ipcRenderer.invoke('set-backup-path', newPath),
  resetBackupPath: () => ipcRenderer.invoke('reset-backup-path'),
  browseBackupFolder: () => ipcRenderer.invoke('browse-backup-folder')
});
