#!/bin/bash
set -e

# Configuration
SKILL_NAME="ws-accessibility-audit"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SKILL_ROOT="$(dirname "$SCRIPT_DIR")"

echo "--- 🔗 Registering $SKILL_NAME ---"

# Potential agent skill paths (Standard locations)
# We only install to these if the parent configuration directory exists
POSSIBLE_PATHS=(
    "$HOME/.codex/skills"
    "$HOME/.gemini/antigravity/skills"
    "$HOME/.claude/skills"
    "$HOME/.cursor/skills"  # Cursor IDE skills
    "$HOME/.agent/skills"   # Legacy agent skills
    "$HOME/.agents/skills"  # Standard modern agent skills (Gemini CLI compatible)
)

INSTALLED_COUNT=0

for AGENT_PATH in "${POSSIBLE_PATHS[@]}"; do
    # Check if the parent agent directory exists (e.g., ~/.codex)
    # This prevents creating ~/.codex/skills if ~/.codex doesn't even exist
    PARENT_DIR="$(dirname "$AGENT_PATH")"
    
    if [ -d "$PARENT_DIR" ]; then
        # Create the skills subdir if needed (e.g. ~/.codex exists, make ~/.codex/skills)
        mkdir -p "$AGENT_PATH"
        
        TARGET_LINK="$AGENT_PATH/$SKILL_NAME"
        
        # Verify if it's already a correct symlink
        if [ -L "$TARGET_LINK" ]; then
            EXISTING_TARGET="$(readlink "$TARGET_LINK")"
            if [ "$EXISTING_TARGET" == "$SKILL_ROOT" ]; then
                echo "✅  Already registered in $AGENT_PATH"
                INSTALLED_COUNT=$((INSTALLED_COUNT+1))
                continue
            else
                echo "♻️  Updating symlink in $AGENT_PATH..."
                rm "$TARGET_LINK"
            fi
        elif [ -d "$TARGET_LINK" ]; then
             echo "⚠️  Directory exists at $TARGET_LINK (not a symlink). Skipping to avoid data loss."
             continue
        fi

        # Create Symlink
        ln -s "$SKILL_ROOT" "$TARGET_LINK"
        echo "🚀 Registered in $AGENT_PATH"
        INSTALLED_COUNT=$((INSTALLED_COUNT+1))
    else
        # Optional: Debug log
        # echo "Start-up skipped: $PARENT_DIR not found."
        true
    fi
done

echo ""
if [ $INSTALLED_COUNT -eq 0 ]; then
    echo "⚠️  No compatible agent directories found (checked ~/.codex, ~/.gemini, ~/.claude, ~/.agent)."
    echo "   Ensure you have an AI agent installed and initialized."
else
    echo "✨ Registration complete! ($INSTALLED_COUNT locations updated)"
fi
