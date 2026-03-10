#!/bin/bash
# Combines individual page files from temp directory into an SQLite database
# Requires fetch-pages.sh to have been run first
# Much faster than JSON approach - incremental inserts, no file reading

TEMP_DIR="../../temp_pages"  # Relative to scripts/scrape directory
DB_FILE="../../cultivars.db"  # Relative to scripts/scrape directory

# Check if temp directory exists
if [ ! -d "$TEMP_DIR" ]; then
  echo "Error: $TEMP_DIR directory not found"
  echo "Please run fetch-pages.sh first"
  exit 1
fi

# Find all page files and sort them numerically
PAGE_FILES=$(ls "$TEMP_DIR"/page_*.json 2>/dev/null | sort -V)
PAGE_COUNT=$(echo "$PAGE_FILES" | wc -l | tr -d ' ')

if [ "$PAGE_COUNT" -eq 0 ]; then
  echo "Error: No page files found in $TEMP_DIR"
  echo "Please run fetch-pages.sh first"
  exit 1
fi

echo "Found $PAGE_COUNT page files in $TEMP_DIR"
echo "Creating SQLite database..."

# Remove existing database if it exists
rm -f "$DB_FILE"

# Create database and table schema
sqlite3 "$DB_FILE" <<EOF
CREATE TABLE cultivars (
    id TEXT PRIMARY KEY,
    post_id TEXT,
    post_title TEXT,
    post_status TEXT,
    introduction_date TEXT,
    primary_hybridizer_id TEXT,
    primary_hybridizer_name TEXT,
    additional_hybridizers_ids TEXT,
    additional_hybridizers_names TEXT,
    hybridizer_code_legacy TEXT,
    seedling_number TEXT,
    bloom_season_ids TEXT,
    bloom_season_names TEXT,
    fragrance_ids TEXT,
    fragrance_names TEXT,
    bloom_habit_ids TEXT,
    bloom_habit_names TEXT,
    foliage_ids TEXT,
    foliage_names TEXT,
    ploidy_ids TEXT,
    ploidy_names TEXT,
    scape_height_in REAL,
    bloom_size_in REAL,
    bud_count INTEGER,
    branches INTEGER,
    color TEXT,
    rebloom INTEGER,
    flower_form_ids TEXT,
    flower_form_names TEXT,
    double_percentage REAL,
    polymerous_percentage REAL,
    spider_ratio REAL,
    petal_length_in REAL,
    petal_width_in REAL,
    unusual_forms_ids TEXT,
    unusual_forms_names TEXT,
    parentage TEXT,
    images_count INTEGER,
    last_updated TEXT,
    first_image_json TEXT,
    awards_json TEXT
);

-- Create indexes for common queries
CREATE INDEX idx_post_title ON cultivars(post_title);
CREATE INDEX idx_primary_hybridizer_name ON cultivars(primary_hybridizer_name);
CREATE INDEX idx_introduction_date ON cultivars(introduction_date);
CREATE INDEX idx_bloom_season_names ON cultivars(bloom_season_names);
CREATE INDEX idx_ploidy_names ON cultivars(ploidy_names);
CREATE INDEX idx_rebloom ON cultivars(rebloom);
EOF

echo "Database schema created"
echo ""

# Get total count from first page
FIRST_FILE=$(echo "$PAGE_FILES" | head -1)
if [ -n "$FIRST_FILE" ] && [ -f "$FIRST_FILE" ]; then
  TOTAL_COUNT=$(jq -r '.data.total_count // 0' "$FIRST_FILE")
  if [ "$TOTAL_COUNT" != "0" ]; then
    echo "Total cultivars available: $TOTAL_COUNT"
    echo ""
  fi
fi

# Process each page file in order
PROCESSED=0
TOTAL_CULTIVARS=0

for PAGE_FILE in $PAGE_FILES; do
  # Extract page number from filename (e.g., page_142.json -> 142)
  PAGE_NUM=$(basename "$PAGE_FILE" | sed 's/page_\([0-9]*\)\.json/\1/')
  
  # Check if we got valid data
  if ! jq -e '.success == true' "$PAGE_FILE" > /dev/null 2>&1; then
    echo "⚠ Page $PAGE_NUM: Invalid response, skipping"
    continue
  fi
  
  # Extract results count from the actual file
  COUNT=$(jq '.data.results | length' "$PAGE_FILE")
  
  if [ "$COUNT" -gt 0 ]; then
    # Process each cultivar in the page and insert into database
    # Use a temporary SQL file for batch inserts (much faster)
    TEMP_SQL=$(mktemp)
    
    # Begin transaction
    echo "BEGIN TRANSACTION;" > "$TEMP_SQL"
    
    # Generate INSERT statements for each cultivar
    jq -r '.data.results[] | 
      "INSERT INTO cultivars VALUES (" +
      (if .id == null then "NULL" else "\"" + (.id | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .post_id == null then "NULL" else "\"" + (.post_id | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .post_title == null then "NULL" else "\"" + (.post_title | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .post_status == null then "NULL" else "\"" + (.post_status | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .introduction_date == null then "NULL" else "\"" + (.introduction_date | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .primary_hybridizer_id == null then "NULL" else "\"" + (.primary_hybridizer_id | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .primary_hybridizer_name == null then "NULL" else "\"" + (.primary_hybridizer_name | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .additional_hybridizers_ids == null then "NULL" else "\"" + (.additional_hybridizers_ids | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .additional_hybridizers_names == null then "NULL" else "\"" + (.additional_hybridizers_names | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .hybridizer_code_legacy == null then "NULL" else "\"" + (.hybridizer_code_legacy | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .seedling_number == null then "NULL" else "\"" + (.seedling_number | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .bloom_season_ids == null then "NULL" else "\"" + (.bloom_season_ids | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .bloom_season_names == null then "NULL" else "\"" + (.bloom_season_names | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .fragrance_ids == null then "NULL" else "\"" + (.fragrance_ids | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .fragrance_names == null then "NULL" else "\"" + (.fragrance_names | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .bloom_habit_ids == null then "NULL" else "\"" + (.bloom_habit_ids | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .bloom_habit_names == null then "NULL" else "\"" + (.bloom_habit_names | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .foliage_ids == null then "NULL" else "\"" + (.foliage_ids | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .foliage_names == null then "NULL" else "\"" + (.foliage_names | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .ploidy_ids == null then "NULL" else "\"" + (.ploidy_ids | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .ploidy_names == null then "NULL" else "\"" + (.ploidy_names | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .scape_height_in == null then "NULL" else .scape_height_in end) + "," +
      (if .bloom_size_in == null then "NULL" else .bloom_size_in end) + "," +
      (if .bud_count == null then "NULL" else .bud_count end) + "," +
      (if .branches == null then "NULL" else .branches end) + "," +
      (if .color == null then "NULL" else "\"" + (.color | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .rebloom == null then "NULL" else .rebloom end) + "," +
      (if .flower_form_ids == null then "NULL" else "\"" + (.flower_form_ids | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .flower_form_names == null then "NULL" else "\"" + (.flower_form_names | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .double_percentage == null then "NULL" else .double_percentage end) + "," +
      (if .polymerous_percentage == null then "NULL" else .polymerous_percentage end) + "," +
      (if .spider_ratio == null then "NULL" else .spider_ratio end) + "," +
      (if .petal_length_in == null then "NULL" else .petal_length_in end) + "," +
      (if .petal_width_in == null then "NULL" else .petal_width_in end) + "," +
      (if .unusual_forms_ids == null then "NULL" else "\"" + (.unusual_forms_ids | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .unusual_forms_names == null then "NULL" else "\"" + (.unusual_forms_names | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .parentage == null then "NULL" else "\"" + (.parentage | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .images_count == null then "NULL" else .images_count end) + "," +
      (if .last_updated == null then "NULL" else "\"" + (.last_updated | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .first_image == null then "NULL" else "\"" + (.first_image | tojson | gsub("\""; "\"\"")) + "\"" end) + "," +
      (if .awards == null then "NULL" else "\"" + (.awards | tojson | gsub("\""; "\"\"")) + "\"" end) +
      ");"' "$PAGE_FILE" >> "$TEMP_SQL"
    
    # Commit transaction
    echo "COMMIT;" >> "$TEMP_SQL"
    
    # Execute SQL file
    sqlite3 "$DB_FILE" < "$TEMP_SQL"
    rm -f "$TEMP_SQL"
    
    PROCESSED=$((PROCESSED + 1))
    TOTAL_CULTIVARS=$((TOTAL_CULTIVARS + COUNT))
    
    echo "✓ Page $PAGE_NUM: $COUNT cultivars (Total so far: $TOTAL_CULTIVARS)"
  else
    echo "⚠ Page $PAGE_NUM: No results"
  fi
done

# Get final count from database
FINAL_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM cultivars;")
FIRST_PAGE_NUM=$(echo "$PAGE_FILES" | head -1 | sed 's/.*page_\([0-9]*\)\.json/\1/')
LAST_PAGE_NUM=$(echo "$PAGE_FILES" | tail -1 | sed 's/.*page_\([0-9]*\)\.json/\1/')

echo ""
echo "✓ Complete! Processed $PROCESSED pages"
echo "✓ Inserted $FINAL_COUNT cultivars into database"
echo "✓ Database saved to: $DB_FILE"
echo ""
echo "Sample queries:"
echo "  sqlite3 $DB_FILE \"SELECT post_title, primary_hybridizer_name, introduction_date FROM cultivars LIMIT 5;\""
echo "  sqlite3 $DB_FILE \"SELECT COUNT(*) FROM cultivars WHERE rebloom = 1;\""
echo "  sqlite3 $DB_FILE \"SELECT post_title FROM cultivars WHERE post_title LIKE '%Coffee%';\""
echo ""
echo "To clean up temp files: rm -rf $TEMP_DIR"
