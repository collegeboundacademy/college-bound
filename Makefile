# Makefile with Jekyll support and fallback to python http.server
.PHONY: all serve setup serve-jekyll serve-no-livereload serve-py

# Configurable ports (can be overridden: `make PORT=4001 LR_PORT=35730`)
PORT ?= 4000
LR_PORT ?= 35729

all: serve

serve:
	@if [ -f Gemfile ]; then \
		bundle exec jekyll serve --livereload --port $(PORT) --livereload-port $(LR_PORT); \
	else \
		python3 -m http.server 8000; \
	fi

setup:
	@if [ -f Gemfile ]; then \
		bundle install; \
	else \
		@echo "No Gemfile present; nothing to setup."; \
	fi

# Serve with livereload disabled (avoids EventMachine binding the livereload port)
serve-no-livereload:
	@if [ -f Gemfile ]; then \
		bundle exec jekyll serve --no-livereload --port $(PORT); \
	else \
		python3 -m http.server 8000; \
	fi

serve-jekyll:
	bundle exec jekyll serve --livereload --port $(PORT) --livereload-port $(LR_PORT)

serve-py:
	python3 -m http.server 8000
