#!/bin/bash
set -e

# Configuration
SKILL_NAME="ws-accessibility-audit"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SKILL_ROOT="$(dirname "$SCRIPT_DIR")"

echo "--- 🗑️  Uninstalling $SKILL_NAME ---"

# 1. Global Registration (Symlinks)
AGENT_PATHS=(
    "$HOME/.codex/skills"
    "$HOME/.gemini/antigravity/skills"
    "$HOME/.claude/skills"
    "$HOME/.cursor/skills"
    "$HOME/.agent/skills"
    "$HOME/.agents/skills"
)

for AGENT_PATH in "${AGENT_PATHS[@]}"; do
    TARGET_LINK="$AGENT_PATH/$SKILL_NAME"
    
    # Remove current symlink
    if [ -L "$TARGET_LINK" ]; then
        rm "$TARGET_LINK"
        echo "🗑️  Removed symlink from $AGENT_PATH"
    fi
done

# 2. Local Cleanup
echo "🧹 Cleaning up local files..."
cd "$SKILL_ROOT"
rm -rf node_modules package-lock.json audit/internal/ audit/index.html

echo ""
echo "✨ Uninstallation complete! All symlinks and local build files have been removed."
echo "💡 You can run ./scripts/setup.sh anytime to reinstall."
