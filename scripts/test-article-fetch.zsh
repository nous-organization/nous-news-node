#!/bin/zsh
# scripts/fetch-first-source.zsh
# Trigger background fetch of the first source with parser/normalizer info

API_URL="http://localhost:9001/articles/local/fetch"

# Request body including parser/normalizer keys
read -r -d '' PAYLOAD <<'EOF'
{
  "sources": [
    {
      "name": "GDELT",
      "endpoint": "https://api.gdeltproject.org/api/v2/doc/doc?query=world&mode=artlist&format=json",
      "enabled": true,
      "parser": "gdelt",
      "normalizer": "gdelt"
    }
  ]
}
EOF

echo "🚀 Triggering fetch for GDELT source..."
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  -w "\nHTTP Status: %{http_code}\n"

echo "✅ Fetch request sent."