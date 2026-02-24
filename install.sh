#!/usr/bin/env bash
set -e

SKILL_NAME="a11y"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
installed=0

install_to() {
  local agent="$1"
  local detect_dir="$2"
  local skills_dir="$3"

  if [ -d "$detect_dir" ]; then
    local target="$skills_dir/$SKILL_NAME"
    mkdir -p "$skills_dir"
    rm -rf "$target"
    mkdir -p "$target"
    cp -r "$SCRIPT_DIR/." "$target/"
    rm -rf "$target/.git" 2>/dev/null || true
    echo "✓ $agent → $target"
    installed=$((installed + 1))
  fi
}

install_to "Claude Code" "$HOME/.claude"      "$HOME/.claude/skills"
install_to "Cursor"      "$HOME/.cursor"      "$HOME/.cursor/skills"
install_to "Gemini CLI"  "$HOME/.gemini"      "$HOME/.gemini/skills"
install_to "Codex"       "$HOME/.agents"      "$HOME/.agents/skills"
install_to "Windsurf"    "$HOME/.codeium"     "$HOME/.codeium/windsurf/skills"

if [ "$installed" -eq 0 ]; then
  echo "No supported AI agents detected. Copy this folder manually to your agent's skills directory."
  echo ""
  echo "  Claude Code  →  ~/.claude/skills/$SKILL_NAME/"
  echo "  Cursor       →  ~/.cursor/skills/$SKILL_NAME/"
  echo "  Gemini CLI   →  ~/.gemini/skills/$SKILL_NAME/"
  echo "  Codex        →  ~/.agents/skills/$SKILL_NAME/"
  echo "  Windsurf     →  ~/.codeium/windsurf/skills/$SKILL_NAME/"
  exit 1
fi

echo ""
echo "Restart your agent session to load the skill."
