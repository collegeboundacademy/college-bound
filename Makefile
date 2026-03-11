# Makefile with Jekyll support and fallback to python http.server
.PHONY: all serve setup serve-jekyll serve-py

all: serve

serve:
	@if [ -f Gemfile ]; then \
		bundle exec jekyll serve --livereload --port 4000; \
	else \
		python3 -m http.server 8000; \
	fi

setup:
	@if [ -f Gemfile ]; then \
		bundle install; \
	else \
		@echo "No Gemfile present; nothing to setup."; \
	fi

serve-jekyll:
	bundle exec jekyll serve --livereload --port 4000

serve-py:
	python3 -m http.server 8000
