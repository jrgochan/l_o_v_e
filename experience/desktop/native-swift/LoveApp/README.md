# LoveApp Target

This directory is reserved for the main macOS App target.

## Setup Instructions

1. Open Xcode.
2. File > New > Project.
3. Choose **macOS** > **App**.
4. Product Name: **LoveApp**.
5. Interface: **SwiftUI**.
6. Language: **Swift**.
7. Location: Select the `experience/desktop/native-swift` folder.
8. **IMPORTANT**: Ensure "Create Git repository on my Mac" is UNCHECKED (we are already in a repo).
9. Once created, close the project window.
10. Open `LoveSoul.xcworkspace`.
11. You should see `LoveApp` and the `Packages` folder in the sidebar.
12. Go to `LoveApp` target settings > General > Frameworks, Libraries, and Embedded Content.
13. Add `SoulCore`, `SoulUI`, `SoulBrain`, and `SoulBio` libraries.
