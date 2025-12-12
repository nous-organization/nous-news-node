#!/bin/zsh
# check_local_articles.zsh
# Script to fetch all local articles from the P2P node and display basic info

# Base URL of your node
NODE_URL="http://localhost:9001"

# Endpoint to fetch all local articles
ENDPOINT="$NODE_URL/articles/local"

echo "Fetching local articles from $ENDPOINT..."
response=$(curl -s $ENDPOINT)

if [[ -z "$response" ]]; then
  echo "No response received from node."
  exit 1
fi

# Count total articles
total=$(echo "$response" | jq '. | length')
echo "Total articles in local DB: $total"

# Optional: display a summary table (URL + title)
echo "Listing first 10 articles:"
echo "$response" | jq -r '.[:10] | .[] | "\(.url) -> \(.title)"'

# Optional: check for specific fields
missing=$(echo "$response" | jq '[.[] | select(.sourceMeta == null)] | length')
if [[ $missing -gt 0 ]]; then
  echo "Warning: $missing articles are missing sourceMeta!"
else
  echo "All articles have sourceMeta populated."
fi