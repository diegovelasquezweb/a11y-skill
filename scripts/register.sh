#!/bin/bash
set -e

# Get the absolute path of the skill root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SKILL_ROOT="$(dirname "$SCRIPT_DIR")"
SKILL_NAME="ws-accessibility-audit"

echo "--- 🔗 Registering $SKILL_NAME globally ---"

AGENT_PATHS=(
    "$HOME/.codex/skills"
    "$HOME/.gemini/antigravity/skills"
    "$HOME/.claude/skills"
)

for AGENT_PATH in "${AGENT_PATHS[@]}"; do
    mkdir -p "$AGENT_PATH"

    TARGET_LINK="$AGENT_PATH/$SKILL_NAME"

    if [ -L "$TARGET_LINK" ]; then
        echo "♻️  Updating symlink in $AGENT_PATH..."
        rm "$TARGET_LINK"
    elif [ -d "$TARGET_LINK" ]; then
        echo "⚠️  A directory already exists at $TARGET_LINK. Skipping."
        continue
    fi

    ln -s "$SKILL_ROOT" "$TARGET_LINK"
    echo "🚀 Skill registered in $AGENT_PATH"
done

echo ""
echo "✨ Global registration complete!"
echo "💡 You can now use \$ws-accessibility-audit in any project."
