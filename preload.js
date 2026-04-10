const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConversations: () => ipcRenderer.invoke('get-conversations'),
  getConversationDetails: (filePath) => ipcRenderer.invoke('get-conversation-details', filePath),
  getHistoryPath: () => ipcRenderer.invoke('get-history-path'),
  backupConversation: (filePath) => ipcRenderer.invoke('backup-conversation', filePath),
  openBackupFolder: () => ipcRenderer.invoke('open-backup-folder'),
  getBackups: () => ipcRenderer.invoke('get-backups'),
  deleteBackup: (filePath) => ipcRenderer.invoke('delete-backup', filePath)
});
