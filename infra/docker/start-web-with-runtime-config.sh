#!/bin/sh
set -eu

DIST_DIR="/app/apps/web/dist"
RUNTIME_CONFIG_FILE="$DIST_DIR/runtime-config.js"
API_BASE_URL="${WEB_API_URL:-${VITE_API_URL:-}}"

if [ -n "$API_BASE_URL" ]; then
  escaped_api_base_url=$(printf '%s' "$API_BASE_URL" | sed 's/\\/\\\\/g; s/"/\\"/g')
  cat > "$RUNTIME_CONFIG_FILE" <<EOF
window.__FAKTURAI_CONFIG__ = {
  API_BASE_URL: "$escaped_api_base_url"
};
EOF
elif [ ! -f "$RUNTIME_CONFIG_FILE" ]; then
  cat > "$RUNTIME_CONFIG_FILE" <<'EOF'
window.__FAKTURAI_CONFIG__ = {};
EOF
fi

exec serve -s "$DIST_DIR" -l 3000
