#!/bin/bash
set -e

# Get the absolute path of the skill root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SKILL_ROOT="$(dirname "$SCRIPT_DIR")"
SKILL_NAME="ws-accessibility-audit"

echo "--- 🛠️  Setting up $SKILL_NAME ---"

# 1. Local Dependencies
cd "$SKILL_ROOT"
if [ ! -d "node_modules" ]; then
    echo "📦 Installing local dependencies..."
    npm install
else
    echo "✅ Dependencies already installed."
fi

# 2. Playwright Browsers
echo "🌐 Verifying Playwright browsers..."
npx playwright install chromium

# 3. Global Registration (Symlinks)
echo "🔗 Registering skill for agents..."

AGENT_PATHS=(
    "$HOME/.codex/skills"
    "$HOME/.gemini/antigravity/skills"
    "$HOME/.claude/skills"
)

for AGENT_PATH in "${AGENT_PATHS[@]}"; do
    # Create the skills directory if it doesn't exist
    mkdir -p "$AGENT_PATH"
    
    TARGET_LINK="$AGENT_PATH/$SKILL_NAME"
    
    # Create or update symbolic link
    if [ -L "$TARGET_LINK" ]; then
        echo "♻️  Updating symlink in $AGENT_PATH..."
        rm "$TARGET_LINK"
    elif [ -d "$TARGET_LINK" ]; then
        echo "⚠️  A directory already exists at $TARGET_LINK. Skipping registration for this agent."
        continue
    fi
    
    ln -s "$SKILL_ROOT" "$TARGET_LINK"
    echo "🚀 Skill registered in $AGENT_PATH"
done

echo ""
echo "✨ Setup complete! The skill is now available locally and registered for your agents."
echo "💡 You can now use \$ws-accessibility-audit in any project."
