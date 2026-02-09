#!/bin/bash
set -e

# Configuration
WORKSPACE_DIR="experience/desktop/native-swift"
WORKSPACE_NAME="LoveSoul.xcworkspace"
PACKAGES_DIR="$WORKSPACE_DIR/Packages"

echo "💎 Initializing L.O.V.E. Native Swift Workspace..."

# 1. Ensure Directory Exists
mkdir -p "$PACKAGES_DIR"

# 2. Create Xcode Workspace
echo "📂 Creating $WORKSPACE_NAME..."
mkdir -p "$WORKSPACE_DIR/$WORKSPACE_NAME"
cat > "$WORKSPACE_DIR/$WORKSPACE_NAME/contents.xcworkspacedata" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<Workspace
   version = "1.0">
   <FileRef
      location = "group:Packages/SoulCore">
   </FileRef>
   <FileRef
      location = "group:Packages/SoulUI">
   </FileRef>
   <FileRef
      location = "group:Packages/SoulBrain">
   </FileRef>
   <FileRef
      location = "group:Packages/SoulBio">
   </FileRef>
   <FileRef
      location = "group:LoveApp.xcodeproj">
   </FileRef>
</Workspace>
EOF

# 3. Initialize Swift Packages
init_package() {
    PKG_NAME=$1
    PKG_PATH="$PACKAGES_DIR/$PKG_NAME"

    if [ -d "$PKG_PATH" ]; then
        echo "   ⚠️  Package $PKG_NAME already exists. Skipping."
    else
        echo "   📦 Initializing $PKG_NAME..."
        mkdir -p "$PKG_PATH"
        pushd "$PKG_PATH" > /dev/null
        swift package init --type library --name "$PKG_NAME"
        popd > /dev/null
    fi
}

init_package "SoulCore"
init_package "SoulUI"
init_package "SoulBrain"
init_package "SoulBio"

# 4. Create App Placeholder (Instructional)
APP_PATH="$WORKSPACE_DIR/LoveApp"
if [ ! -d "$APP_PATH" ]; then
    echo "📲 Creating placeholder for LoveApp..."
    mkdir -p "$APP_PATH"
    # Create the README instructions
    cat > "$APP_PATH/README.md" <<EOF
# LoveApp Target

This directory is reserved for the main macOS App target.

## Setup Instructions

1. Open Xcode.
2. File > New > Project.
3. Choose **macOS** > **App**.
4. Product Name: **LoveApp**.
5. Interface: **SwiftUI**.
6. Language: **Swift**.
7. Location: Select the \`experience/desktop/native-swift\` folder.
8. **IMPORTANT**: Ensure "Create Git repository on my Mac" is UNCHECKED (we are already in a repo).
9. Once created, close the project window.
10. Open \`LoveSoul.xcworkspace\`.
11. You should see \`LoveApp\` and the \`Packages\` folder in the sidebar.
12. Go to \`LoveApp\` target settings > General > Frameworks, Libraries, and Embedded Content.
13. Add \`SoulCore\`, \`SoulUI\`, \`SoulBrain\`, and \`SoulBio\` libraries.
EOF
fi

# 5. Final Instructions
echo ""
echo "✅ Workspace Initialized at: $WORKSPACE_DIR/$WORKSPACE_NAME"
echo ""
echo "🚀 NEXT STEPS:"
echo "1. Open the workspace:"
echo "   open $WORKSPACE_DIR/$WORKSPACE_NAME"
echo "2. Follow the instructions in $APP_PATH/README.md to generate the Main App Target."
echo "3. Link the packages in Xcode."
echo ""
