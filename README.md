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
- Store backups in `~/.claude/history-backups/`

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

| Data | Path |
|------|------|
| Claude Sessions | `~/.claude/projects/` |
| Codex Sessions | `~/.codex/sessions/` |
| Backups and MD exports | `~/.claude/history-backups/` |

## License

MIT

## Acknowledgments

Built with [Electron](https://www.electronjs.org/) for viewing CLI conversation history.
