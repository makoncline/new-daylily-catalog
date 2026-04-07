#!/bin/bash
# Fetches cultivar pages and saves them to temp directory
# Uses 3 concurrent requests for faster fetching
# Does NOT combine results - use combine-pages.sh for that

SEARCH_PAGE_URL="https://daylilies.org/search/"
BASE_URL="https://daylilies.org/wp-admin/admin-ajax.php"
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
PER_PAGE="${PER_PAGE:-100}"
DELAY="${DELAY:-1}"  # seconds between starting new requests (reduced since we're parallelizing)
START_PAGE="${START_PAGE:-1}"
END_PAGE="${END_PAGE:-1045}"  # for 100 per page: 104109/100 = 1042
TEMP_DIR="${TEMP_DIR:-../../temp_pages}"  # Relative to scripts/scrape directory
MAX_CONCURRENT="${MAX_CONCURRENT:-3}"  # Number of concurrent requests

fetch_nonce() {
  curl -L --max-time 30 -A "$USER_AGENT" -s "$SEARCH_PAGE_URL" \
    | grep -o 'var cultivar_search_ajax = {[^}]*"nonce":"[^"]*"' \
    | sed -E 's/.*"nonce":"([^"]*)".*/\1/' \
    | head -n 1
}

fetch_api_page() {
  local page=$1
  local nonce=$2

  curl -L --max-time 30 --retry 3 --retry-delay 2 -s "$BASE_URL" \
    -A "$USER_AGENT" \
    -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' \
    -H 'X-Requested-With: XMLHttpRequest' \
    -H 'Accept: application/json, text/javascript, */*; q=0.01' \
    -H 'Origin: https://daylilies.org' \
    -H "Referer: $SEARCH_PAGE_URL" \
    --data-urlencode 'action=cultivar_search' \
    --data-urlencode "nonce=$nonce" \
    --data-urlencode 'search_type=advanced' \
    --data-urlencode "page=$page" \
    --data-urlencode "per_page=$PER_PAGE"
}

NONCE=$(fetch_nonce)

if [ -z "$NONCE" ]; then
  echo "Failed to fetch cultivar search nonce from $SEARCH_PAGE_URL"
  exit 1
fi

# Create temp directory for individual page files
mkdir -p "$TEMP_DIR"

# Function to fetch a single page
fetch_page() {
  local page=$1
  local response
  local count
  
  response=$(fetch_api_page "$page" "$NONCE")
  
  # Save individual page file
  echo "$response" > "$TEMP_DIR/page_${page}.json"
  
  # Check if we got valid data
  if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
    count=$(echo "$response" | jq '.data.results | length')
    echo "✓ Page $page: $count cultivars saved"
    return 0
  else
    echo "✗ Page $page: Error - invalid response"
    return 1
  fi
}

# Get total count from first page to show progress
echo "Fetching page 1 to get total count..."
echo "Using nonce: $NONCE"
FIRST_RESPONSE=$(fetch_api_page 1 "$NONCE")

TOTAL_COUNT=$(echo "$FIRST_RESPONSE" | jq -r '.data.total_count // 0')
echo "Total cultivars available: $TOTAL_COUNT"
echo ""

# Save first page
echo "$FIRST_RESPONSE" > "$TEMP_DIR/page_1.json"
if echo "$FIRST_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  COUNT=$(echo "$FIRST_RESPONSE" | jq '.data.results | length')
  echo "✓ Page 1: $COUNT cultivars saved to $TEMP_DIR/page_1.json"
else
  echo "Error on page 1 - stopping"
  exit 1
fi

# Track running jobs using an array
next_page=$START_PAGE
if [ $next_page -le 1 ]; then
  next_page=2  # Page 1 is already fetched above
fi
completed=1
failed=0
jobs=()

echo "Starting parallel fetching with $MAX_CONCURRENT concurrent requests..."
echo ""

# Function to start a new page fetch if available
start_next_page() {
  if [ $next_page -le $END_PAGE ]; then
    fetch_page $next_page &
    local pid=$!
    jobs+=($pid)
    echo "→ Started page $next_page (PID: $pid)"
    next_page=$((next_page + 1))
    sleep $DELAY
    return 0
  fi
  return 1
}

# Start initial batch of concurrent requests
for ((i=0; i<$MAX_CONCURRENT && $next_page<=$END_PAGE; i++)); do
  start_next_page
done

# Process remaining pages - keep 3 running at all times
while [ ${#jobs[@]} -gt 0 ]; do
  # Wait for any job to complete
  for i in "${!jobs[@]}"; do
    pid=${jobs[$i]}
    if ! kill -0 $pid 2>/dev/null; then
      # Job completed
      wait $pid
      exit_code=$?
      if [ $exit_code -eq 0 ]; then
        completed=$((completed + 1))
      else
        failed=$((failed + 1))
      fi
      # Remove completed job from array
      unset jobs[$i]
      # Rebuild array to remove gaps
      jobs=("${jobs[@]}")
      
      # Start next page if available
      start_next_page
      
      # Break to check all jobs again
      break
    fi
  done
  
  # Small sleep to avoid busy waiting
  sleep 0.2
done

# Wait for any remaining jobs
for pid in "${jobs[@]}"; do
  wait $pid
  exit_code=$?
  if [ $exit_code -eq 0 ]; then
    completed=$((completed + 1))
  else
    failed=$((failed + 1))
  fi
done

echo ""
echo "✓ Fetching complete!"
echo "  Completed: $completed pages"
if [ $failed -gt 0 ]; then
  echo "  Failed: $failed pages"
fi
echo "  Page files saved in: $TEMP_DIR/"
echo "Run combine-pages-sqlite.sh to combine them into a single file"
