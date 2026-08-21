#!/bin/sh
# QMD wrapper - use openclaw home for cache to ensure persistence across restarts
# Memory stored at /root/.openclaw/memory/ — shared by all agents
export HOME=/root
export OPENCLAW_HOME=/root/.openclaw
exec qmd "$@"
