#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SKILL_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Setting up wondersauce-accessibility-audit skill..."
cd "$SKILL_ROOT"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
else
    echo "Dependencies already installed."
fi

echo "Verifying Playwright browsers..."
npx playwright install

echo "Setup complete! You can now use the skill."
