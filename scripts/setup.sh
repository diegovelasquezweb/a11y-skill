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

echo ""
echo "✨ Setup complete! The skill is ready to use in this project."
echo "💡 To make it available globally across all projects, run: ./scripts/register.sh"
