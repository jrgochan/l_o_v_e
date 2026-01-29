# Love: Native "Liquid Metal" Workspace (Makefile)

# Variables
APP_NAME = LoveApp
SCHEME = LoveApp
PLATFORM = "macOS"
DESTINATION = "platform=macOS,arch=arm64"
XCODEBUILD = xcodebuild
SWIFT = swift

# Default Target
.PHONY: all
all: build

# ------------------------------
# 🛠️ Setup & Config
# ------------------------------

.PHONY: setup
setup:
	@echo "🔧 Setting up workspace..."
	@bash scripts/setup.sh
	@echo "✅ Setup complete."

# ------------------------------
# 🏗️ Build & Run
# ------------------------------

.PHONY: build
build:
	@echo "🏗️ Building $(APP_NAME)..."
	@$(SWIFT) build --package-path LoveApp

.PHONY: run
run:
	@echo "🚀 Running $(APP_NAME)..."
	@$(SWIFT) run --package-path LoveApp $(APP_NAME)

.PHONY: clean
clean:
	@echo "🧹 Cleaning build artifacts..."
	@$(SWIFT) package --package-path LoveApp clean
	@rm -rf LoveApp/.build

.PHONY: xcode
xcode:
	@echo "🛠️ Generating Xcode Project..."
	@$(SWIFT) package --package-path LoveApp generate-xcodeproj
	@open LoveApp/LoveApp.xcodeproj

# ------------------------------
# 🧪 Testing
# ------------------------------

.PHONY: test
test:
	@echo "🧪 Running Tests..."
	@echo "  • SoulCore..."
	@$(SWIFT) test --package-path Packages/SoulCore
	@echo "  • SoulBrain..."
	@$(SWIFT) test --package-path Packages/SoulBrain
	@echo "  • SoulBio..."
	@$(SWIFT) test --package-path Packages/SoulBio
	@echo "  • SoulVoice..."
	@$(SWIFT) test --package-path Packages/SoulVoice
	@echo "  • SoulChat..."
	@$(SWIFT) test --package-path Packages/SoulChat
	@echo "  • SoulUI..."
	@$(SWIFT) test --package-path Packages/SoulUI
	@echo "  • LoveApp..."
	@$(SWIFT) test --package-path LoveApp

# ------------------------------
# 🧹 Linting & Formatting
# ------------------------------

.PHONY: lint
lint:
	@if which swiftlint >/dev/null; then \
		swiftlint LoveApp; \
	else \
		echo "⚠️ SwiftLint not found. Run 'brew install swiftlint'"; \
	fi

.PHONY: format
format:
	@echo "🎨 Formatting code..."
	@swift format LoveApp --recursive --in-place
