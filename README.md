# Ai Cli History

A desktop application to browse, back up, and export AI CLI conversation history.

![Electron](https://img.shields.io/badge/Electron-41.x-47848F?logo=electron&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white)

## Features

### Session Browser
- Browse Claude conversations from `~/.claude/projects/`
- Browse Codex sessions from `~/.codex/sessions/`
- View conversations organized by project
- Search sessions by project name or content
- Filter messages by type (All / User / Assistant)
- Search within conversation messages

### Message Display
- Clean, readable message formatting
- Collapsible thinking blocks
- Smart tool call display
- Syntax highlighting for code blocks
- Error message highlighting

### Backup and Export
- Back up any session with one click
- Export user prompts to Markdown
- Browse backups and Markdown exports in the Backups tab
- Default backup location: `~/.claude/history-backups/`

### Cloud Backup
- Configure a custom backup directory via the ⚙ settings button
- Auto-detects installed cloud sync folders (Dropbox, OneDrive, Google Drive, Box)
- Quick-select buttons save backups to an `AI-CLI-History-Backups` subfolder inside the chosen cloud folder
- Browse to any directory for a fully custom path
- Reset to the default local path at any time

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm

### Setup

```bash
git clone https://github.com/yourusername/ai-cli-history.git
cd ai-cli-history
npm install
npm start
```

### Build Executable

```bash
npm run build:win
```

The Windows installer is created in `dist/`.

## Usage

1. Launch the app.
2. Select a Claude session, Codex session, backup, or Markdown export from the sidebar.
3. Use filters and search to narrow visible messages.
4. Use `Backup` to save the full session or `Export MD` to save only user prompts.
5. Click the ⚙ gear icon (bottom of sidebar) to configure the backup directory — point it at your Dropbox, OneDrive, or Google Drive folder to sync backups automatically.

## File Structure

```text
ai-cli-history/
|-- main.js
|-- preload.js
|-- renderer.js
|-- index.html
|-- styles.css
|-- package.json
`-- README.md
```

## Data Locations

| Data | Default Path |
|------|------|
| Claude Sessions | `~/.claude/projects/` |
| Codex Sessions | `~/.codex/sessions/` |
| Backups and MD exports | `~/.claude/history-backups/` |
| App config | `%APPDATA%\ai-cli-history\config.json` |

The backup path is configurable. When a cloud folder is selected, backups go to `<cloud-folder>/AI-CLI-History-Backups/` and are synced by your cloud client automatically.

## License

MIT

## Acknowledgments

Built with [Electron](https://www.electronjs.org/) for viewing CLI conversation history.
