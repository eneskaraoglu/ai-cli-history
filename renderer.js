let conversations = [];
let codexSessions = [];
let backups = [];
let currentConversationId = null;
let currentMessages = [];
let currentFilter = 'all';
let currentSearchQuery = '';
let isBackupSelected = false;
let isCodexSelected = false;
let currentTab = 'sessions';

document.addEventListener('DOMContentLoaded', async () => {
  await loadHistoryPath();
  await loadConversations();
  await loadCodexSessions();
  await loadBackups();
  setupEventListeners();
});

async function loadHistoryPath() {
  try {
    const path = await window.api.getHistoryPath();
    document.getElementById('historyPath').textContent = `Path: ${path}`;
  } catch (error) {
    console.error('Failed to get history path:', error);
  }
}

async function loadConversations() {
  const listElement = document.getElementById('conversationsList');
  listElement.innerHTML = '<div class="loading">Loading conversations...</div>';

  try {
    conversations = await window.api.getConversations();
    renderConversationsList(conversations);
  } catch (error) {
    console.error('Failed to load conversations:', error);
    listElement.innerHTML = '<div class="no-conversations">Failed to load conversations</div>';
  }
}

async function loadCodexSessions() {
  const listElement = document.getElementById('codexList');
  if (listElement) {
    listElement.innerHTML = '<div class="loading">Loading Codex sessions...</div>';
  }

  try {
    codexSessions = await window.api.getCodexSessions();
    renderCodexList(codexSessions);
  } catch (error) {
    console.error('Failed to load Codex sessions:', error);
    if (listElement) {
      listElement.innerHTML = '<div class="no-conversations">Failed to load Codex sessions</div>';
    }
  }
}

function renderCodexList(items) {
  const listElement = document.getElementById('codexList');
  if (!listElement) return;

  if (items.length === 0) {
    listElement.innerHTML = '<div class="no-conversations">No Codex sessions found</div>';
    return;
  }

  listElement.innerHTML = items.map(session => `
    <div class="conversation-item codex-item ${session.id === currentConversationId ? 'active' : ''}"
         data-id="${escapeHtml(session.id)}">
      <div class="project-name codex">${escapeHtml(session.project)}</div>
      <div class="summary">${escapeHtml(session.summary)}</div>
      <div class="meta">
        <span class="timestamp">${formatDate(session.timestamp)}</span>
        <span class="message-badge codex">${session.userCount} / ${session.assistantCount}</span>
      </div>
    </div>
  `).join('');

  listElement.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', () => {
      selectCodexSession(item.dataset.id);
    });
  });
}

async function selectCodexSession(id) {
  currentConversationId = id;
  currentFilter = 'all';
  currentSearchQuery = '';
  isBackupSelected = false;
  isCodexSelected = true;

  // Reset filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === 'all');
  });

  // Clear search
  const messageSearchInput = document.getElementById('messageSearchInput');
  if (messageSearchInput) {
    messageSearchInput.value = '';
  }

  // Update active states
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === id);
  });
  document.querySelectorAll('.backup-item').forEach(item => {
    item.classList.remove('active');
  });

  document.getElementById('welcomeMessage').style.display = 'none';
  document.getElementById('conversationView').style.display = 'flex';

  const messagesContainer = document.getElementById('messagesContainer');
  messagesContainer.innerHTML = '<div class="loading">Loading Codex session...</div>';

  try {
    const messages = await window.api.getCodexSessionDetails(id);
    currentMessages = messages;
    renderCodexMessages(messages);

    const session = codexSessions.find(s => s.id === id);
    if (session) {
      document.getElementById('conversationTitle').textContent = `[Codex] ${session.project}`;
      updateMessageCount();
    }
  } catch (error) {
    console.error('Failed to load Codex session:', error);
    messagesContainer.innerHTML = '<div class="no-conversations">Failed to load session</div>';
  }
}

function renderCodexMessages(messages) {
  const container = document.getElementById('messagesContainer');

  const renderedMessages = messages.map((msg, index) => {
    const role = msg.payload?.role;
    const timestamp = msg.timestamp ? formatDateTime(msg.timestamp) : '';

    if (role === 'user') {
      return renderCodexUserMessage(msg, timestamp, index);
    } else if (role === 'assistant') {
      return renderCodexAssistantMessage(msg, timestamp, index);
    }
    return '';
  }).filter(Boolean).join('');

  container.innerHTML = renderedMessages || '<div class="no-conversations">No messages in this session</div>';
  container.scrollTop = 0;
}

function renderCodexUserMessage(msg, timestamp, index) {
  const content = extractCodexUserContent(msg);
  return `
    <div class="message user" data-index="${index}">
      <div class="message-header">
        <span class="message-role">User</span>
        ${timestamp ? `<span class="message-timestamp">${timestamp}</span>` : ''}
      </div>
      <div class="message-content">${formatTextContent(content)}</div>
    </div>
  `;
}

function renderCodexAssistantMessage(msg, timestamp, index) {
  const content = extractCodexAssistantContent(msg);
  return `
    <div class="message assistant codex" data-index="${index}">
      <div class="message-header">
        <span class="message-role">Codex</span>
        <span class="model-badge">GPT</span>
        ${timestamp ? `<span class="message-timestamp">${timestamp}</span>` : ''}
      </div>
      <div class="message-content">${formatTextContent(content)}</div>
    </div>
  `;
}

function extractCodexUserContent(msg) {
  const content = msg.payload?.content;
  if (!content) return '';

  if (Array.isArray(content)) {
    return content
      .filter(item => item.type === 'input_text')
      .map(item => item.text)
      .join('\n');
  }

  return String(content);
}

function extractCodexAssistantContent(msg) {
  const content = msg.payload?.content;
  if (!content) return '';

  if (Array.isArray(content)) {
    return content
      .filter(item => item.type === 'output_text' || item.type === 'text')
      .map(item => item.text)
      .join('\n');
  }

  return String(content);
}

async function loadBackups() {
  try {
    backups = await window.api.getBackups();
    renderBackupsList(backups);
  } catch (error) {
    console.error('Failed to load backups:', error);
  }
}

function renderBackupsList(items) {
  const listElement = document.getElementById('backupsList');
  const backupCountBadge = document.getElementById('backupCount');

  // Update badge count
  if (backupCountBadge) {
    backupCountBadge.textContent = items.length;
  }

  if (items.length === 0) {
    listElement.innerHTML = '<div class="no-conversations">No backups yet.<br>Use Backup or Export MD to create one.</div>';
    return;
  }

  listElement.innerHTML = items.map(backup => `
    <div class="backup-item ${backup.isMarkdownExport ? 'markdown-export' : ''} ${backup.id === currentConversationId ? 'active' : ''}"
         data-id="${escapeHtml(backup.id)}">
      <div class="backup-item-content">
        <div class="backup-project">${escapeHtml(backup.project)}</div>
        <div class="backup-date">${formatBackupDate(backup.timestamp)}</div>
        <div class="backup-meta">
          <span>${getBackupMetaText(backup)}</span>
          <span class="backup-badge ${backup.isMarkdownExport ? 'markdown' : ''}">${backup.isMarkdownExport ? 'MD Export' : 'Backup'}</span>
        </div>
      </div>
      <button class="delete-backup-btn" data-id="${escapeHtml(backup.id)}" title="Delete backup">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `).join('');

  listElement.querySelectorAll('.backup-item-content').forEach(item => {
    item.addEventListener('click', () => {
      const backupId = item.parentElement.dataset.id;
      selectBackup(backupId);
    });
  });

  listElement.querySelectorAll('.delete-backup-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteBackup(btn.dataset.id);
    });
  });
}

async function selectBackup(id) {
  currentConversationId = id;
  currentFilter = 'all';
  currentSearchQuery = '';
  isBackupSelected = true;

  // Reset filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === 'all');
  });

  // Clear message search
  const messageSearchInput = document.getElementById('messageSearchInput');
  if (messageSearchInput) {
    messageSearchInput.value = '';
  }

  // Update active state in both lists
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelectorAll('.backup-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === id);
  });

  document.getElementById('welcomeMessage').style.display = 'none';
  document.getElementById('conversationView').style.display = 'flex';

  const messagesContainer = document.getElementById('messagesContainer');
  messagesContainer.innerHTML = '<div class="loading">Loading backup...</div>';

  try {
    currentMessages = await window.api.getConversationDetails(id);
    renderMessages(currentMessages);

    const backup = backups.find(b => b.id === id);
    if (backup) {
      document.getElementById('conversationTitle').textContent = backup.isMarkdownExport
        ? `[MD Export] ${backup.project}`
        : `[Backup] ${backup.project}`;
      updateMessageCount();
    }
  } catch (error) {
    console.error('Failed to load backup details:', error);
    messagesContainer.innerHTML = '<div class="no-conversations">Failed to load backup</div>';
  }
}

function formatBackupDate(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Unknown date';
  }
}

async function deleteBackup(backupId) {
  const backup = backups.find(b => b.id === backupId);
  if (!backup) return;

  const confirmDelete = confirm(`Delete this backup?\n\n${backup.project}\n${formatBackupDate(backup.timestamp)}\n\nThis cannot be undone.`);

  if (!confirmDelete) return;

  try {
    const result = await window.api.deleteBackup(backupId);

    if (result.success) {
      // If the deleted backup was selected, clear the view
      if (currentConversationId === backupId) {
        currentConversationId = null;
        document.getElementById('welcomeMessage').style.display = 'flex';
        document.getElementById('conversationView').style.display = 'none';
      }

      // Refresh backups list
      await loadBackups();
    } else {
      alert(`Failed to delete backup: ${result.error}`);
    }
  } catch (error) {
    console.error('Delete error:', error);
    alert(`Failed to delete backup: ${error.message}`);
  }
}

function switchTab(tab) {
  currentTab = tab;

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Update tab content
  document.getElementById('sessionsTab').classList.toggle('active', tab === 'sessions');
  document.getElementById('codexTab').classList.toggle('active', tab === 'codex');
  document.getElementById('backupsTab').classList.toggle('active', tab === 'backups');

  // Clear search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
    const placeholders = {
      sessions: 'Search Claude sessions...',
      codex: 'Search Codex sessions...',
      backups: 'Search backups...'
    };
    searchInput.placeholder = placeholders[tab] || 'Search...';
  }

  // Restore full lists
  if (tab === 'sessions') {
    renderConversationsList(conversations);
  } else if (tab === 'codex') {
    renderCodexList(codexSessions);
  } else {
    renderBackupsList(backups);
  }
}

function renderConversationsList(items) {
  const listElement = document.getElementById('conversationsList');

  if (items.length === 0) {
    listElement.innerHTML = '<div class="no-conversations">No conversations found</div>';
    return;
  }

  listElement.innerHTML = items.map(conv => `
    <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}"
         data-id="${escapeHtml(conv.id)}">
      <div class="project-name">${escapeHtml(conv.project)}</div>
      <div class="summary">${escapeHtml(conv.summary)}</div>
      <div class="meta">
        <span class="timestamp">${formatDate(conv.timestamp)}</span>
        <span class="message-badge">${conv.userCount} / ${conv.assistantCount}</span>
      </div>
    </div>
  `).join('');

  listElement.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', () => {
      selectConversation(item.dataset.id);
    });
  });
}

async function selectConversation(id) {
  currentConversationId = id;
  currentFilter = 'all';
  currentSearchQuery = '';
  isBackupSelected = false;

  // Reset filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === 'all');
  });

  // Clear message search
  const messageSearchInput = document.getElementById('messageSearchInput');
  if (messageSearchInput) {
    messageSearchInput.value = '';
  }

  // Update active state - clear backups selection
  document.querySelectorAll('.backup-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === id);
  });

  document.getElementById('welcomeMessage').style.display = 'none';
  document.getElementById('conversationView').style.display = 'flex';

  const messagesContainer = document.getElementById('messagesContainer');
  messagesContainer.innerHTML = '<div class="loading">Loading messages...</div>';

  try {
    currentMessages = await window.api.getConversationDetails(id);
    renderMessages(currentMessages);

    const conv = conversations.find(c => c.id === id);
    if (conv) {
      document.getElementById('conversationTitle').textContent = conv.project;
      updateMessageCount();
    }
  } catch (error) {
    console.error('Failed to load conversation details:', error);
    messagesContainer.innerHTML = '<div class="no-conversations">Failed to load messages</div>';
  }
}

function updateMessageCount() {
  const visibleCount = currentMessages.filter(msg => {
    // Apply type filter
    if (currentFilter !== 'all') {
      const role = getMessageRole(msg);
      if (currentFilter === 'user') {
        const content = getMessageTextContent(msg);
        if (role !== 'user' || !content || !content.trim()) return false;
      } else if (role !== currentFilter) {
        return false;
      }
    }

    // Apply search filter
    if (currentSearchQuery) {
      const messageText = getMessageSearchText(msg);
      if (!messageText.toLowerCase().includes(currentSearchQuery.toLowerCase())) {
        return false;
      }
    }

    return true;
  }).length;

  const totalCount = currentMessages.length;

  let countText = `${visibleCount} of ${totalCount}`;
  if (currentSearchQuery) {
    countText += ` (searching)`;
  }

  document.getElementById('messageCount').textContent = countText;
}

function applyFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  applyFiltersAndSearch();
  updateMessageCount();
}

function applyFiltersAndSearch() {
  document.querySelectorAll('.message').forEach((msgEl, index) => {
    const msg = currentMessages[index];
    if (!msg) return;

    let shouldShow = true;
    const role = getMessageRole(msg);

    // Apply type filter
    if (currentFilter !== 'all') {
      if (currentFilter === 'user') {
        // For user filter, only show non-empty messages
        const content = getMessageTextContent(msg);
        shouldShow = role === 'user' && content && content.trim().length > 0;
      } else {
        shouldShow = role === currentFilter;
      }
    }

    // Apply search filter
    if (shouldShow && currentSearchQuery) {
      const messageText = getMessageSearchText(msg);
      shouldShow = messageText.toLowerCase().includes(currentSearchQuery.toLowerCase());
    }

    msgEl.classList.toggle('hidden', !shouldShow);
    msgEl.classList.toggle('search-hidden', !shouldShow && currentSearchQuery);
  });
}

function getMessageSearchText(msg) {
  const role = getMessageRole(msg);

  if (role === 'user') {
    if (msg.type === 'response_item') {
      return extractCodexUserContent(msg);
    }
    return extractUserContent(msg);
  } else if (role === 'assistant') {
    if (msg.type === 'response_item') {
      return extractCodexAssistantContent(msg);
    }
    const blocks = extractAssistantContent(msg);
    return blocks.map(block => {
      if (block.type === 'text') return block.content;
      if (block.type === 'thinking') return block.content;
      if (block.type === 'tool_use') return `${block.name} ${JSON.stringify(block.input)}`;
      return '';
    }).join(' ');
  }
  return '';
}

function getBackupMetaText(backup) {
  if (backup.isMarkdownExport) {
    return `${backup.userCount} prompts`;
  }
  return `${backup.userCount} / ${backup.assistantCount} msgs`;
}

function getMessageRole(msg) {
  if (msg.type === 'response_item') {
    return msg.payload?.role || '';
  }
  return msg.type || '';
}

function getMessageTextContent(msg) {
  const role = getMessageRole(msg);

  if (msg.type === 'response_item') {
    if (role === 'user') return extractCodexUserContent(msg);
    if (role === 'assistant') return extractCodexAssistantContent(msg);
  }

  if (role === 'user') return extractUserContent(msg);
  if (role === 'assistant') {
    return extractAssistantContent(msg)
      .map(block => {
        if (block.type === 'text' || block.type === 'thinking') return block.content;
        if (block.type === 'tool_use') return `${block.name} ${JSON.stringify(block.input)}`;
        return '';
      })
      .join(' ');
  }

  return '';
}

function searchMessages(query) {
  currentSearchQuery = query;
  applyFiltersAndSearch();
  updateMessageCount();
}

function renderMessages(messages) {
  const container = document.getElementById('messagesContainer');

  const renderedMessages = messages.map((msg, index) => {
    const type = msg.type || 'unknown';
    const timestamp = msg.timestamp ? formatDateTime(msg.timestamp) : '';

    if (type === 'user') {
      return renderUserMessage(msg, timestamp, index);
    } else if (type === 'assistant') {
      return renderAssistantMessage(msg, timestamp, index);
    }
    return '';
  }).filter(Boolean).join('');

  container.innerHTML = renderedMessages || '<div class="no-conversations">No messages in this conversation</div>';
  container.scrollTop = 0;

  // Add toggle listeners for thinking blocks
  container.querySelectorAll('.thinking-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const content = toggle.nextElementSibling;
      const isExpanded = content.classList.toggle('expanded');
      toggle.querySelector('.toggle-icon').textContent = isExpanded ? '▼' : '▶';
    });
  });
}

function renderUserMessage(msg, timestamp, index) {
  const content = extractUserContent(msg);
  return `
    <div class="message user" data-index="${index}">
      <div class="message-header">
        <span class="message-role">User</span>
        ${timestamp ? `<span class="message-timestamp">${timestamp}</span>` : ''}
      </div>
      <div class="message-content">${formatTextContent(content)}</div>
    </div>
  `;
}

function renderAssistantMessage(msg, timestamp, index) {
  const contentBlocks = extractAssistantContent(msg);

  let thinkingHtml = '';
  let mainContentHtml = '';
  let toolsHtml = '';

  for (const block of contentBlocks) {
    switch (block.type) {
      case 'thinking':
        thinkingHtml += renderThinkingBlock(block.content);
        break;
      case 'text':
        mainContentHtml += `<div class="text-block">${formatTextContent(block.content)}</div>`;
        break;
      case 'tool_use':
        toolsHtml += renderToolCall(block);
        break;
    }
  }

  // Check if this is an error message
  const isError = msg.isApiErrorMessage || msg.error;

  return `
    <div class="message assistant ${isError ? 'error' : ''}" data-index="${index}">
      <div class="message-header">
        <span class="message-role">${isError ? 'Error' : 'Claude'}</span>
        ${msg.message?.model ? `<span class="model-badge">${escapeHtml(msg.message.model)}</span>` : ''}
        ${timestamp ? `<span class="message-timestamp">${timestamp}</span>` : ''}
      </div>
      ${thinkingHtml}
      <div class="message-content">
        ${mainContentHtml || '<span class="empty-content">No text response</span>'}
      </div>
      ${toolsHtml}
    </div>
  `;
}

function renderThinkingBlock(content) {
  if (!content) return '';
  const preview = content.substring(0, 100).replace(/\n/g, ' ');
  return `
    <div class="thinking-block">
      <div class="thinking-toggle">
        <span class="toggle-icon">▶</span>
        <span class="thinking-label">Thinking</span>
        <span class="thinking-preview">${escapeHtml(preview)}...</span>
      </div>
      <div class="thinking-content">
        ${formatTextContent(content)}
      </div>
    </div>
  `;
}

function renderToolCall(block) {
  const params = block.input || {};
  const paramEntries = Object.entries(params);

  // Special handling for common tools
  let paramsHtml = '';

  if (block.name === 'Read' && params.file_path) {
    paramsHtml = `
      <div class="tool-param">
        <div class="tool-param-name">File</div>
        <div class="tool-param-value file-path">${escapeHtml(params.file_path)}</div>
      </div>
    `;
  } else if (block.name === 'Bash' && params.command) {
    paramsHtml = `
      <div class="tool-param">
        <div class="tool-param-name">Command</div>
        <div class="tool-param-value command">${escapeHtml(params.command)}</div>
      </div>
      ${params.description ? `
        <div class="tool-param">
          <div class="tool-param-name">Description</div>
          <div class="tool-param-value">${escapeHtml(params.description)}</div>
        </div>
      ` : ''}
    `;
  } else if (block.name === 'Edit' || block.name === 'Write') {
    paramsHtml = `
      <div class="tool-param">
        <div class="tool-param-name">File</div>
        <div class="tool-param-value file-path">${escapeHtml(params.file_path || '')}</div>
      </div>
      ${params.old_string ? `
        <div class="tool-param">
          <div class="tool-param-name">Find</div>
          <div class="tool-param-value code">${escapeHtml(truncate(params.old_string, 200))}</div>
        </div>
      ` : ''}
      ${params.new_string ? `
        <div class="tool-param">
          <div class="tool-param-name">Replace</div>
          <div class="tool-param-value code">${escapeHtml(truncate(params.new_string, 200))}</div>
        </div>
      ` : ''}
    `;
  } else if (block.name === 'Grep' || block.name === 'Glob') {
    paramsHtml = `
      <div class="tool-param">
        <div class="tool-param-name">Pattern</div>
        <div class="tool-param-value">${escapeHtml(params.pattern || params.glob || '')}</div>
      </div>
      ${params.path ? `
        <div class="tool-param">
          <div class="tool-param-name">Path</div>
          <div class="tool-param-value file-path">${escapeHtml(params.path)}</div>
        </div>
      ` : ''}
    `;
  } else {
    // Generic parameter display
    paramsHtml = paramEntries.slice(0, 5).map(([key, value]) => {
      const displayValue = typeof value === 'object'
        ? JSON.stringify(value, null, 2)
        : String(value);
      return `
        <div class="tool-param">
          <div class="tool-param-name">${escapeHtml(key)}</div>
          <div class="tool-param-value">${escapeHtml(truncate(displayValue, 300))}</div>
        </div>
      `;
    }).join('');

    if (paramEntries.length > 5) {
      paramsHtml += `<div class="tool-param-more">+${paramEntries.length - 5} more parameters</div>`;
    }
  }

  return `
    <div class="tool-call">
      <div class="tool-call-header">
        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
        </svg>
        <span class="tool-name">${escapeHtml(block.name)}</span>
      </div>
      <div class="tool-call-body">
        ${paramsHtml || '<span class="empty-content">No parameters</span>'}
      </div>
    </div>
  `;
}

function extractUserContent(msg) {
  if (!msg.message) return '';
  const content = msg.message.content;

  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content.map(item => {
      if (typeof item === 'string') return item;
      if (item.type === 'text') return item.text;
      return '';
    }).filter(Boolean).join('\n');
  }

  return JSON.stringify(content, null, 2);
}

function extractAssistantContent(msg) {
  if (!msg.message) return [{ type: 'text', content: '' }];

  const content = msg.message.content;

  if (typeof content === 'string') {
    return [{ type: 'text', content }];
  }

  if (Array.isArray(content)) {
    return content.map(item => {
      if (typeof item === 'string') {
        return { type: 'text', content: item };
      }
      if (item.type === 'text') {
        return { type: 'text', content: item.text };
      }
      if (item.type === 'thinking') {
        return { type: 'thinking', content: item.thinking };
      }
      if (item.type === 'tool_use') {
        return {
          type: 'tool_use',
          name: item.name,
          input: item.input,
          id: item.id
        };
      }
      return null;
    }).filter(Boolean);
  }

  return [{ type: 'text', content: JSON.stringify(content, null, 2) }];
}

function formatTextContent(content) {
  if (!content) return '';
  let formatted = escapeHtml(content);

  // Format code blocks
  formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="language-${lang}">${code}</code></pre>`;
  });

  // Format inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Format bold
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Format line breaks
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

function truncate(str, maxLength) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Search (works for all tabs)
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();

    if (currentTab === 'sessions') {
      const filtered = conversations.filter(conv =>
        conv.summary.toLowerCase().includes(query) ||
        conv.project.toLowerCase().includes(query)
      );
      renderConversationsList(filtered);
    } else if (currentTab === 'codex') {
      const filtered = codexSessions.filter(session =>
        session.summary.toLowerCase().includes(query) ||
        session.project.toLowerCase().includes(query)
      );
      renderCodexList(filtered);
    } else {
      const filtered = backups.filter(backup =>
        backup.project.toLowerCase().includes(query) ||
        backup.fileName.toLowerCase().includes(query)
      );
      renderBackupsList(filtered);
    }
  });

  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    if (currentTab === 'sessions') {
      await loadConversations();
    } else if (currentTab === 'codex') {
      await loadCodexSessions();
    } else {
      await loadBackups();
    }
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyFilter(btn.dataset.filter);
    });
  });

  // Message search
  const messageSearchInput = document.getElementById('messageSearchInput');
  if (messageSearchInput) {
    messageSearchInput.addEventListener('input', (e) => {
      searchMessages(e.target.value);
    });
  }

  // Backup button
  const backupBtn = document.getElementById('backupBtn');
  if (backupBtn) {
    backupBtn.addEventListener('click', async () => {
      await backupCurrentConversation();
    });
  }

  const exportMdBtn = document.getElementById('exportMdBtn');
  if (exportMdBtn) {
    exportMdBtn.addEventListener('click', async () => {
      await exportCurrentConversationMarkdown();
    });
  }

  // Open backup folder button
  const openBackupFolderBtn = document.getElementById('openBackupFolderBtn');
  if (openBackupFolderBtn) {
    openBackupFolderBtn.addEventListener('click', async () => {
      await window.api.openBackupFolder();
    });
  }
}

async function backupCurrentConversation() {
  if (!currentConversationId) {
    alert('No conversation selected');
    return;
  }

  const backupBtn = document.getElementById('backupBtn');
  const originalText = backupBtn.innerHTML;

  try {
    // Show loading state
    backupBtn.disabled = true;
    backupBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v6l4 2"></path>
      </svg>
      Saving...
    `;

    const result = await window.api.backupConversation(currentConversationId);

    if (result.success) {
      // Refresh backups list
      await loadBackups();

      // Show success state
      backupBtn.classList.add('success');
      backupBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Saved!
      `;

      // Reset after 2 seconds
      setTimeout(() => {
        backupBtn.classList.remove('success');
        backupBtn.innerHTML = originalText;
        backupBtn.disabled = false;
      }, 2000);
    } else {
      throw new Error(result.error || 'Backup failed');
    }
  } catch (error) {
    console.error('Backup error:', error);
    alert(`Backup failed: ${error.message}`);
    backupBtn.innerHTML = originalText;
    backupBtn.disabled = false;
  }
}

async function exportCurrentConversationMarkdown() {
  if (!currentConversationId) {
    alert('No conversation selected');
    return;
  }

  const exportBtn = document.getElementById('exportMdBtn');
  const originalText = exportBtn.innerHTML;

  try {
    exportBtn.disabled = true;
    exportBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v6l4 2"></path>
      </svg>
      Exporting...
    `;

    const result = await window.api.exportMarkdown(currentConversationId);

    if (result.success) {
      exportBtn.classList.add('success');
      exportBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Exported
      `;

      setTimeout(() => {
        exportBtn.classList.remove('success');
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
      }, 2000);
    } else {
      throw new Error(result.error || 'Markdown export failed');
    }
  } catch (error) {
    console.error('Markdown export error:', error);
    alert(`Markdown export failed: ${error.message}`);
    exportBtn.innerHTML = originalText;
    exportBtn.disabled = false;
  }
}

function formatDate(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;

    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (diff < 604800000) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Unknown date';
  }
}

function formatDateTime(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleString();
  } catch {
    return '';
  }
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
