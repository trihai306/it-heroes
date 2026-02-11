#!/bin/bash
# Chibi Office AI — Initial Setup
set -e

echo "🏢 Setting up Chibi Office AI..."
echo ""

# 1. Python backend
echo "🐍 Setting up Python backend..."
cd apps/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
echo "✅ Backend dependencies installed"
cd ../..

# 2. Node packages (root + renderer + desktop)
echo ""
echo "📦 Installing Node packages..."
npm install
cd apps/renderer
npm install
cd ../desktop
npm install
cd ../..
echo "✅ Node packages installed"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start developing:"
echo "  1. Terminal 1: cd apps/backend && source .venv/bin/activate && python main.py"
echo "  2. Terminal 2: cd apps/renderer && npm run dev"
echo "  3. Terminal 3: cd apps/desktop && npm run dev"
echo ""
echo "Or use: npm run dev (starts backend + renderer)"
