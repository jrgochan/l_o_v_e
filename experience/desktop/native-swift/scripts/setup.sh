#!/bin/bash

# setup.sh
# Verifies the development environment for L.O.V.E.

set -e

echo "🔮 Checking L.O.V.E. Development Environment..."
echo "---------------------------------------------"

# 1. Check Xcode
echo "🔍 Checking Xcode..."
if ! xcode-select -p &> /dev/null; then
    echo "❌ Xcode CLI tools not found. Please install Xcode."
    exit 1
else
    echo "✅ Xcode tools found at $(xcode-select -p)"
fi

# 2. Check Swift Version
echo "🔍 Checking Swift..."
if ! command -v swift &> /dev/null; then
    echo "❌ Swift not found."
    exit 1
fi

SWIFT_VERSION=$(swift --version | head -n 1)
echo "✅ $SWIFT_VERSION"

# 3. Check Homebrew Dependencies
echo "🔍 Checking Homebrew Packages..."
if command -v brew &> /dev/null; then
    if ! command -v swiftlint &> /dev/null; then
        echo "⚠️ SwiftLint not found. Installing..."
        brew install swiftlint
    else
        echo "✅ SwiftLint installed."
    fi
    
    if ! command -v swift-format &> /dev/null; then
        echo "⚠️ swift-format not found. Installing..."
        brew install swift-format
    else
        echo "✅ swift-format installed."
    fi
else
    echo "⚠️ Homebrew not found. Skipping package checks."
fi

# 4. Check Directory Structure
echo "🔍 Verifying Workspace..."
if [ -d "LoveApp" ] && [ -d "Packages" ]; then
    echo "✅ Workspace structure looks correct."
else
    echo "❌ Missing core directories (LoveApp or Packages)."
    exit 1
fi

echo "---------------------------------------------"
echo "✨ You are ready to build! Run 'make build' to start."
