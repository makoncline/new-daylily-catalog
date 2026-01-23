#!/bin/bash
# Fetches cultivar pages and saves them to temp directory
# Uses 3 concurrent requests for faster fetching
# Does NOT combine results - use combine-pages.sh for that

BASE_URL="https://daylilies.org/wp-admin/admin-ajax.php"
NONCE="053737e109"
PER_PAGE=100
DELAY=1  # seconds between starting new requests (reduced since we're parallelizing)
START_PAGE=1
END_PAGE=1045  # for 100 per page: 104109/100 = 1042
TEMP_DIR="../../temp_pages"  # Relative to scripts/scrape directory
MAX_CONCURRENT=3  # Number of concurrent requests

# Create temp directory for individual page files
mkdir -p "$TEMP_DIR"

# Function to fetch a single page
fetch_page() {
  local page=$1
  local response
  local count
  
  response=$(curl -s "$BASE_URL" \
    -X POST \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -d "action=cultivar_search&nonce=$NONCE&search_type=advanced&page=$page&per_page=$PER_PAGE")
  
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
FIRST_RESPONSE=$(curl -s "$BASE_URL" \
  -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "action=cultivar_search&nonce=$NONCE&search_type=advanced&page=1&per_page=$PER_PAGE")

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
completed=0
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
