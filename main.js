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

function getCodexHistoryPath() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.codex', 'sessions');
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
    if (/^[a-zA-Z]--/.test(parts[i])) {
      // Convert D--WORKSPACE-github to D:\WORKSPACE\github
      return parts[i].replace(/^([a-zA-Z])--/, '$1:\\').replace(/-/g, '\\');
    }
  }
  return 'Unknown Project';
}

function getClaudeProjectName(messages, filePath) {
  const messageWithCwd = messages.find(msg => msg.cwd);
  if (messageWithCwd?.cwd) {
    return messageWithCwd.cwd;
  }

  return getProjectName(filePath);
}

function extractClaudeUserMessageText(message) {
  const content = message.message?.content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content.map(item => {
      if (typeof item === 'string') return item;
      if (item.type === 'text' && item.text) return item.text;
      return '';
    }).filter(Boolean).join('\n').trim();
  }

  if (content && typeof content === 'object') {
    if (typeof content.text === 'string') {
      return content.text.trim();
    }
    return JSON.stringify(content, null, 2);
  }

  return '';
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
  return readBackupMessages(filePath).messages;
});

ipcMain.handle('get-history-path', async () => {
  return getClaudeHistoryPath();
});

// Codex functions
function findCodexJsonlFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      findCodexJsonlFiles(fullPath, files);
    } else if (item.name.startsWith('rollout-') && item.name.endsWith('.jsonl')) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseCodexJsonlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    const messages = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        // Include session_meta, and response_item messages
        if (parsed.type === 'session_meta' || parsed.type === 'response_item') {
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

function extractCodexMessageText(message) {
  const content = message.payload?.content;
  if (!content) return '';

  if (Array.isArray(content)) {
    return content
      .filter(item => {
        if (message.payload?.role === 'user') {
          return item.type === 'input_text';
        }
        return item.type === 'output_text' || item.type === 'text';
      })
      .map(item => item.text || '')
      .join('\n');
  }

  return String(content);
}

function normalizeCodexMessagesForBackup(messages) {
  return messages
    .filter(m =>
      m.type === 'response_item' &&
      (m.payload?.role === 'user' || m.payload?.role === 'assistant')
    )
    .map(m => ({
      type: m.payload.role,
      timestamp: m.timestamp,
      message: {
        content: extractCodexMessageText(m)
      }
    }));
}

function readBackupMessages(filePath) {
  if (filePath.endsWith('.md')) {
    return {
      type: 'markdown',
      messages: parseMarkdownExportFile(filePath)
    };
  }

  const claudeMessages = parseJsonlFile(filePath);
  if (claudeMessages.length > 0) {
    return {
      type: 'claude',
      messages: claudeMessages
    };
  }

  const codexMessages = parseCodexJsonlFile(filePath);
  const normalizedCodexMessages = normalizeCodexMessagesForBackup(codexMessages);
  if (normalizedCodexMessages.length > 0) {
    return {
      type: 'codex',
      messages: normalizedCodexMessages,
      meta: getCodexSessionMeta(codexMessages)
    };
  }

  return {
    type: 'unknown',
    messages: []
  };
}

function getBackupProjectName(filePath) {
  const claudeMessages = parseJsonlFile(filePath);
  if (claudeMessages.length > 0) {
    return getClaudeProjectName(claudeMessages, filePath);
  }

  const codexMessages = parseCodexJsonlFile(filePath);
  if (codexMessages.length > 0) {
    const meta = getCodexSessionMeta(codexMessages);
    if (meta.cwd) {
      return meta.cwd;
    }
  }

  return 'Unknown Project';
}

function createUserPromptsMarkdown(messages, projectName) {
  const userMessages = messages
    .filter(m => m.type === 'user')
    .map(message => ({
      timestamp: message.timestamp,
      content: extractClaudeUserMessageText(message)
    }))
    .filter(message => message.content);
  const sections = userMessages
    .map((message, index) => {
      const timestampLine = message.timestamp
        ? `_Timestamp: ${new Date(message.timestamp).toLocaleString()}_`
        : '';

      return [
        `## Prompt ${index + 1}`,
        timestampLine,
        '',
        message.content
      ].filter(Boolean).join('\n');
    })
    .filter(Boolean);

  return [
    `# User Prompts`,
    '',
    `Project: ${projectName}`,
    `Exported: ${new Date().toLocaleString()}`,
    '',
    ...sections
  ].join('\n');
}

function parseMarkdownExportFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sections = content.split(/^## Prompt \d+\r?\n/gm).slice(1);

    return sections.map(section => {
      const lines = section.split(/\r?\n/);
      let timestamp = null;

      if (lines[0]?.startsWith('_Timestamp: ') && lines[0].endsWith('_')) {
        const timestampText = lines.shift().slice(12, -1);
        const parsedDate = new Date(timestampText);
        if (!Number.isNaN(parsedDate.getTime())) {
          timestamp = parsedDate.toISOString();
        }
      }

      while (lines[0] === '') {
        lines.shift();
      }

      return {
        type: 'user',
        timestamp,
        message: {
          content: lines.join('\n').trim()
        }
      };
    }).filter(message => message.message.content);
  } catch (error) {
    return [];
  }
}

function parseBackupFilename(fileName) {
  const isMarkdown = fileName.endsWith('_prompts.md');
  const normalizedName = isMarkdown
    ? fileName.replace('_prompts.md', '')
    : fileName.replace('.jsonl', '');
  const parts = normalizedName.split('_');
  const timestampPart = parts.pop() || '';
  const sessionId = parts.pop() || '';
  const projectName = parts.join('_');

  return {
    isMarkdown,
    timestampPart,
    sessionId,
    projectName
  };
}

function getCodexSessionSummary(messages) {
  // Find first user message
  for (const msg of messages) {
    if (msg.type === 'response_item' && msg.payload?.role === 'user') {
      const content = msg.payload.content;
      if (Array.isArray(content)) {
        for (const item of content) {
          if (item.type === 'input_text' && item.text) {
            const cleaned = item.text.replace(/\s+/g, ' ').trim();
            return cleaned.substring(0, 100) + (cleaned.length > 100 ? '...' : '');
          }
        }
      }
    }
  }
  return 'No summary available';
}

function getCodexSessionMeta(messages) {
  for (const msg of messages) {
    if (msg.type === 'session_meta') {
      return msg.payload || {};
    }
  }
  return {};
}

ipcMain.handle('get-codex-sessions', async () => {
  const historyPath = getCodexHistoryPath();
  const jsonlFiles = findCodexJsonlFiles(historyPath);

  const sessions = [];

  for (const filePath of jsonlFiles) {
    const messages = parseCodexJsonlFile(filePath);
    if (messages.length > 0) {
      const meta = getCodexSessionMeta(messages);
      const userMessages = messages.filter(m => m.type === 'response_item' && m.payload?.role === 'user').length;
      const assistantMessages = messages.filter(m => m.type === 'response_item' && m.payload?.role === 'assistant').length;

      // Extract timestamp from filename: rollout-2026-04-09T10-01-44-...
      const fileName = path.basename(filePath);
      const timeMatch = fileName.match(/rollout-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
      const timestamp = timeMatch ? timeMatch[1].replace(/-/g, (m, i) => i > 9 ? ':' : '-').replace('T', 'T') : null;

      sessions.push({
        id: filePath,
        path: filePath,
        project: meta.cwd || 'Unknown Project',
        model: meta.model_provider || 'openai',
        cliVersion: meta.cli_version || '',
        summary: getCodexSessionSummary(messages),
        timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
        messageCount: messages.length,
        userCount: userMessages,
        assistantCount: assistantMessages,
        isCodex: true
      });
    }
  }

  // Sort by timestamp descending
  sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return sessions;
});

ipcMain.handle('get-codex-session-details', async (event, filePath) => {
  const messages = parseCodexJsonlFile(filePath);
  // Filter to only user and assistant messages for display
  return messages.filter(m =>
    m.type === 'response_item' &&
    (m.payload?.role === 'user' || m.payload?.role === 'assistant')
  );
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
    const projectName = getBackupProjectName(filePath);
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

ipcMain.handle('export-markdown', async (event, filePath) => {
  try {
    const { messages } = readBackupMessages(filePath);
    const userMessages = messages.filter(m => m.type === 'user');

    if (userMessages.length === 0) {
      return {
        success: false,
        error: 'No user prompts found'
      };
    }

    const projectName = getBackupProjectName(filePath);
    const sessionId = path.basename(filePath, '.jsonl');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeProjectName = projectName.replace(/[\\/:*?"<>|]/g, '_');
    const exportFileName = `${safeProjectName}_${sessionId}_${timestamp}_prompts.md`;
    const exportDir = getBackupPath();
    const exportFilePath = path.join(exportDir, exportFileName);
    const markdown = createUserPromptsMarkdown(messages, projectName);

    fs.writeFileSync(exportFilePath, markdown, 'utf-8');

    return {
      success: true,
      exportPath: exportFilePath,
      exportDir
    };
  } catch (error) {
    console.error('Markdown export failed:', error);
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

ipcMain.handle('delete-backup', async (event, filePath) => {
  try {
    // Verify it's in the backup directory for safety
    const backupDir = getBackupPath();
    if (!filePath.startsWith(backupDir)) {
      return { success: false, error: 'Invalid backup path' };
    }

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }

    fs.unlinkSync(filePath);
    return { success: true };
  } catch (error) {
    console.error('Delete failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-backups', async () => {
  const backupDir = getBackupPath();

  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.jsonl') || f.endsWith('.md'));
  const backups = [];

  for (const file of files) {
    const filePath = path.join(backupDir, file);

    try {
      const stats = fs.statSync(filePath);
      const backupData = readBackupMessages(filePath);
      const messages = backupData.messages;

      const { isMarkdown, timestampPart, sessionId, projectName } = parseBackupFilename(file);

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
        isBackup: true,
        sourceType: backupData.type,
        isMarkdownExport: isMarkdown
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
