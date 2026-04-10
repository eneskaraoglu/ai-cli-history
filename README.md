# Claude Code CLI History Viewer

A desktop application to browse and backup your Claude Code CLI conversation history.

![Electron](https://img.shields.io/badge/Electron-41.x-47848F?logo=electron&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white)

## Features

### Session Browser
- Browse all Claude Code conversations from `~/.claude/projects/`
- View conversations organized by project
- Search sessions by project name or content
- Filter messages by type (All / User / Assistant)
- Search within conversation messages

### Message Display
- Clean, readable message formatting
- Collapsible thinking blocks
- Smart tool call display:
  - **Read**: Shows file path
  - **Bash**: Shows command and description
  - **Edit/Write**: Shows file and code snippets
  - **Grep/Glob**: Shows pattern and path
- Syntax highlighting for code blocks
- Error message highlighting

### Backup System
- Backup any session with one click
- Backups stored in `~/.claude/history-backups/`
- Browse backups in dedicated tab
- Preserves complete session data
- Perfect for saving sessions before using `/compact`

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm (comes with Node.js)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-cli-history.git
cd claude-cli-history

# Install dependencies
npm install

# Run the app
npm start
```

### Build Executable

```bash
# Build for Windows
npm run build:win
```

The installer will be created in the `dist/` folder.

## Usage

### Browsing Sessions
1. Launch the app
2. Sessions are listed in the sidebar (newest first)
3. Click a session to view its messages
4. Use the search box to filter sessions

### Filtering Messages
- **All**: Show all messages
- **User**: Show only your messages (non-empty)
- **Assistant**: Show only Claude's responses

### Searching Messages
- Use the search field below the filter buttons
- Searches in message content, thinking blocks, and tool calls

### Creating Backups
1. Select a session you want to backup
2. Click the green **Backup** button
3. The backup appears in the **Backups** tab
4. Click the folder icon to open backup directory

### Viewing Backups
1. Click the **Backups** tab
2. Browse your saved backups
3. Click a backup to view its contents

## File Structure

```
claude-cli-history/
├── main.js          # Electron main process
├── preload.js       # Secure IPC bridge
├── renderer.js      # Frontend logic
├── index.html       # App UI structure
├── styles.css       # Claude-themed styling
├── package.json     # Dependencies & scripts
└── README.md        # This file
```

## Data Locations

| Data | Path |
|------|------|
| Claude Sessions | `~/.claude/projects/` |
| Backups | `~/.claude/history-backups/` |

## Screenshots

The app features a warm, Claude-inspired color theme with:
- Dark background with warm brown tones
- Coral accent color for interactive elements
- Green accents for backups and success states
- Clear visual distinction between user and assistant messages

## License

MIT

## Acknowledgments

Built with [Electron](https://www.electronjs.org/) for viewing [Claude Code](https://claude.ai/claude-code) CLI history.
