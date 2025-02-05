# Force color output
FORCE_COLOR = true

# ANSI Colors with printf for better compatibility
CYAN = $(shell printf "\033[36m")
GREEN = $(shell printf "\033[32m")
YELLOW = $(shell printf "\033[33m")
RESET = $(shell printf "\033[0m")

# Emojis
ROCKET := 🚀
WRENCH := 🔧
PACKAGE := 📦
SPARKLES := ✨
GLOBE := 🌍
TEST := 🧪

# Default test URL
TEST_URL := https://example.com/very/long/url
LOCAL_WORKER := http://localhost:8787
PROD_WORKER := https://url-shortener.viktor-gamov.workers.dev # Replace with your worker URL

.PHONY: install dev deploy help test test-local test-prod

help: ## Show this help message
	@printf "$(CYAN)Available commands:$(RESET)\n"
	@printf "$(GREEN)make install$(RESET)    $(PACKAGE) Install dependencies\n"
	@printf "$(GREEN)make dev$(RESET)        $(WRENCH) Start development server\n"
	@printf "$(GREEN)make deploy$(RESET)     $(ROCKET) Deploy worker to Cloudflare\n"
	@printf "$(GREEN)make test-local$(RESET) $(TEST) Test local worker with HTTPie\n"
	@printf "$(GREEN)make test-prod$(RESET)  $(TEST) Test production worker with HTTPie\n"
	@printf "$(GREEN)make help$(RESET)       $(SPARKLES) Show this help message\n"

install: ## Install dependencies
	@printf "$(CYAN)$(PACKAGE) Installing dependencies...$(RESET)\n"
	@npm install

dev: ## Start development server
	@printf "$(CYAN)$(WRENCH) Starting development server...$(RESET)\n"
	@npm run dev

deploy: ## Deploy worker to Cloudflare
	@printf "$(CYAN)$(ROCKET) Deploying worker...$(RESET)\n"
	@npm run deploy

test-local: ## Test local worker with HTTPie
	@printf "$(CYAN)$(TEST) Testing local worker...$(RESET)\n"
	@printf "$(YELLOW)Sending request to $(LOCAL_WORKER)$(RESET)\n"
	@echo '{"url": "$(TEST_URL)"}' | http POST $(LOCAL_WORKER) Content-Type:application/json

test-prod: ## Test production worker with HTTPie
	@printf "$(CYAN)$(TEST) Testing production worker...$(RESET)\n"
	@printf "$(YELLOW)Sending request to $(PROD_WORKER)$(RESET)\n"
	@echo '{"url": "$(TEST_URL)"}' | http POST $(PROD_WORKER) Content-Type:application/json

# Test with custom URL
# Usage: make test-local URL=https://your-url.com
# or: make test-prod URL=https://your-url.com
test-%: ## Test worker with custom URL
	@if [ "$(URL)" = "" ]; then \
		$(MAKE) $(@:test-%=%); \
	else \
		printf "$(CYAN)$(TEST) Testing with custom URL...$(RESET)\n"; \
		if [ "$(@:test-%=%)" = "local" ]; then \
			echo '{"url": "$(URL)"}' | http POST $(LOCAL_WORKER) Content-Type:application/json; \
		else \
			echo '{"url": "$(URL)"}' | http POST $(PROD_WORKER) Content-Type:application/json; \
		fi \
	fi

.DEFAULT_GOAL := help
