#!/usr/bin/env bash
set -e

SKILL_NAME="a11y"
removed=0

remove_from() {
  local agent="$1"
  local target="$2/$SKILL_NAME"

  if [ -d "$target" ]; then
    rm -rf "$target"
    echo "✓ $agent → removed from $target"
    removed=$((removed + 1))
  fi
}

remove_from "Claude Code" "$HOME/.claude/skills"
remove_from "Cursor"      "$HOME/.cursor/skills"
remove_from "Gemini CLI"  "$HOME/.gemini/skills"
remove_from "Codex"       "$HOME/.agents/skills"
remove_from "Windsurf"    "$HOME/.codeium/windsurf/skills"

if [ "$removed" -eq 0 ]; then
  echo "Skill not found in any agent directory."
  exit 0
fi

echo ""
echo "Restart your agent session to unload the skill."
