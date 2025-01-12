# Colors and emojis for prettier output
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m
BOLD := \033[1m

# Default target
.DEFAULT_GOAL := help

# Python virtual environment
VENV := .venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

# Node dependencies
NODE_MODULES := node_modules

# Help target
help:
	@echo "$(BOLD)🛠  Agenda Defender Makefile Help$(RESET)"
	@echo "$(BLUE)Available targets:$(RESET)"
	@echo "  $(YELLOW)make setup$(RESET)      💻 Install all dependencies (Python & Node.js)"
	@echo "  $(YELLOW)make web$(RESET)        🌐 Run web version using Flask"
	@echo "  $(YELLOW)make dev$(RESET)        🔧 Run Electron app in development mode"
	@echo "  $(YELLOW)make build$(RESET)      📦 Build Electron app for distribution"
	@echo "  $(YELLOW)make clean$(RESET)      🧹 Clean up build artifacts"
	@echo "  $(YELLOW)make help$(RESET)       📚 Show this help message"

# Setup virtual environment and install dependencies
$(VENV)/bin/activate: requirements.txt
	@echo "$(BLUE)🔧 Creating Python virtual environment...$(RESET)"
	@python3 -m venv $(VENV)
	@echo "$(BLUE)📦 Installing Python dependencies...$(RESET)"
	@$(PIP) install -r requirements.txt
	@touch $(VENV)/bin/activate

# Install node dependencies
$(NODE_MODULES): package.json
	@echo "$(BLUE)📦 Installing Node.js dependencies...$(RESET)"
	@npm install
	@touch $(NODE_MODULES)

# Setup target
.PHONY: setup
setup: $(VENV)/bin/activate $(NODE_MODULES)
	@echo "$(GREEN)✅ Setup completed successfully!$(RESET)"

# Web server target
.PHONY: web
web: $(VENV)/bin/activate
	@echo "$(GREEN)🚀 Starting web server...$(RESET)"
	@echo "$(BLUE)📝 Access the app at http://localhost:8080$(RESET)"
	@$(PYTHON) server.py

# Electron development target
.PHONY: dev
dev: $(NODE_MODULES)
	@echo "$(GREEN)🚀 Starting Electron app in development mode...$(RESET)"
	@npm start

# Build target
.PHONY: build
build: $(NODE_MODULES)
	@echo "$(BLUE)🔨 Building Electron app...$(RESET)"
	@npm run build
	@echo "$(GREEN)✅ Build completed! Check the $(BOLD)dist/$(RESET)$(GREEN) directory for the packaged app.$(RESET)"

# Clean target
.PHONY: clean
clean:
	@echo "$(YELLOW)🧹 Cleaning up...$(RESET)"
	@rm -rf $(VENV) $(NODE_MODULES) dist/ .electron-builder/ __pycache__/ .pytest_cache/ .coverage
	@echo "$(GREEN)✨ Cleanup complete!$(RESET)"

# Prevent errors if files exist with target names
.PHONY: help setup web dev build clean
