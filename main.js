const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');
}

function getClaudeHistoryPath() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.claude', 'projects');
}

function findJsonlFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      findJsonlFiles(fullPath, files);
    } else if (item.name.endsWith('.jsonl')) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseJsonlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    const messages = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        // Only include user and assistant messages
        if (parsed.type === 'user' || parsed.type === 'assistant') {
          messages.push(parsed);
        }
      } catch (e) {
        // Skip invalid JSON lines
      }
    }

    return messages;
  } catch (e) {
    return [];
  }
}

function getConversationSummary(messages) {
  // Find the first user message for summary
  for (const msg of messages) {
    if (msg.type === 'user' && msg.message?.content) {
      const content = typeof msg.message.content === 'string'
        ? msg.message.content
        : JSON.stringify(msg.message.content);
      // Clean up the content - remove extra whitespace and newlines
      const cleaned = content.replace(/\s+/g, ' ').trim();
      return cleaned.substring(0, 100) + (cleaned.length > 100 ? '...' : '');
    }
  }
  return 'No summary available';
}

function getConversationTimestamp(messages, filePath) {
  // Try to get timestamp from first message or file stats
  for (const msg of messages) {
    if (msg.timestamp) {
      return new Date(msg.timestamp).toISOString();
    }
  }

  try {
    const stats = fs.statSync(filePath);
    return stats.mtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function getProjectName(filePath) {
  // Extract project name from path like C--JAVAKAYNAK-erp-git
  const parts = filePath.split(path.sep);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].startsWith('C--') || parts[i].startsWith('c--')) {
      // Convert C--WORKSPACE-github to C:\WORKSPACE\github
      return parts[i].replace(/^[Cc]--/, '').replace(/-/g, '\\');
    }
  }
  return 'Unknown Project';
}

ipcMain.handle('get-conversations', async () => {
  const historyPath = getClaudeHistoryPath();
  const jsonlFiles = findJsonlFiles(historyPath);

  const conversations = [];

  for (const filePath of jsonlFiles) {
    const messages = parseJsonlFile(filePath);
    if (messages.length > 0) {
      // Count only user and assistant messages
      const userCount = messages.filter(m => m.type === 'user').length;
      const assistantCount = messages.filter(m => m.type === 'assistant').length;

      conversations.push({
        id: filePath,
        path: filePath,
        project: getProjectName(filePath),
        summary: getConversationSummary(messages),
        timestamp: getConversationTimestamp(messages, filePath),
        messageCount: messages.length,
        userCount,
        assistantCount
      });
    }
  }

  // Sort by timestamp descending (newest first)
  conversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return conversations;
});

ipcMain.handle('get-conversation-details', async (event, filePath) => {
  const messages = parseJsonlFile(filePath);
  return messages;
});

ipcMain.handle('get-history-path', async () => {
  return getClaudeHistoryPath();
});

function getBackupPath() {
  const homeDir = os.homedir();
  const backupDir = path.join(homeDir, '.claude', 'history-backups');

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  return backupDir;
}

ipcMain.handle('backup-conversation', async (event, filePath) => {
  try {
    // Read the original file (complete content, not just parsed messages)
    const originalContent = fs.readFileSync(filePath, 'utf-8');

    // Get project name and session ID for backup filename
    const projectName = getProjectName(filePath);
    const sessionId = path.basename(filePath, '.jsonl');

    // Create timestamp for backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    // Create backup filename
    const safeProjectName = projectName.replace(/[\\/:*?"<>|]/g, '_');
    const backupFileName = `${safeProjectName}_${sessionId}_${timestamp}.jsonl`;

    // Get backup directory
    const backupDir = getBackupPath();
    const backupFilePath = path.join(backupDir, backupFileName);

    // Write backup file
    fs.writeFileSync(backupFilePath, originalContent, 'utf-8');

    return {
      success: true,
      backupPath: backupFilePath,
      backupDir: backupDir
    };
  } catch (error) {
    console.error('Backup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('open-backup-folder', async () => {
  const backupDir = getBackupPath();
  shell.openPath(backupDir);
  return backupDir;
});

ipcMain.handle('get-backups', async () => {
  const backupDir = getBackupPath();

  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.jsonl'));
  const backups = [];

  for (const file of files) {
    const filePath = path.join(backupDir, file);

    try {
      const stats = fs.statSync(filePath);
      const messages = parseJsonlFile(filePath);

      // Parse filename: ProjectName_SessionId_2026-04-10T12-30-45.jsonl
      const parts = file.replace('.jsonl', '').split('_');
      const timestampPart = parts.pop(); // Last part is timestamp
      const sessionId = parts.pop(); // Second to last is session ID
      const projectName = parts.join('_'); // Rest is project name

      // Parse timestamp
      const backupTime = timestampPart.replace(/-/g, (m, i) => i < 10 ? '-' : i === 10 ? 'T' : ':');

      backups.push({
        id: filePath,
        path: filePath,
        fileName: file,
        project: projectName.replace(/_/g, '\\'),
        sessionId: sessionId,
        backupTime: backupTime,
        timestamp: stats.mtime.toISOString(),
        messageCount: messages.length,
        userCount: messages.filter(m => m.type === 'user').length,
        assistantCount: messages.filter(m => m.type === 'assistant').length,
        isBackup: true
      });
    } catch (e) {
      console.error('Error reading backup file:', file, e);
    }
  }

  // Sort by backup time descending (newest first)
  backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return backups;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
