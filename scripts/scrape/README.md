# Daylily Catalog Scraper

Scripts to fetch cultivar data from daylilies.org and combine into a SQLite database.

## Overview

This scraper fetches cultivar data from the daylilies.org API and stores it in a SQLite database for easy querying.

**Total cultivars available:** 104,109

## Scripts

### `fetch-pages.sh`
Fetches cultivar pages from the API and saves them as individual JSON files in `temp_pages/`.

**Features:**
- Uses 3 concurrent requests for faster fetching (~12 minutes vs ~35 minutes)
- Automatic retry with 30-second timeout per request
- Resilient - continues even if individual requests fail
- Saves each page as `temp_pages/page_{N}.json`

**Configuration:**
Edit the constants at the top of the script:
- `PER_PAGE`: Number of cultivars per page (default: 100)
- `START_PAGE`: First page to fetch (default: 1)
- `END_PAGE`: Last page to fetch (default: 1045 for 100 per page)
- `DELAY`: Seconds between starting new requests (default: 1)
- `MAX_CONCURRENT`: Number of parallel requests (default: 3)

### `combine-pages-sqlite.sh`
Combines all page files from `temp_pages/` into a single SQLite database (`cultivars.db`).

**Features:**
- Efficient incremental inserts (no memory issues)
- Creates indexes on common query fields
- Handles duplicates automatically (PRIMARY KEY on `id`)
- Stores nested data (images, awards) as JSON

## Usage

### Step 1: Fetch Pages

Run from the project root:

```bash
cd scripts/scrape
./fetch-pages.sh
```

Or run in the background:
```bash
cd scripts/scrape
nohup ./fetch-pages.sh > fetch.log 2>&1 &
tail -f fetch.log  # Monitor progress
```

**Expected time:** ~12 minutes for all 1,045 pages (with 3 concurrent requests)

**Output:** Individual page files saved to `temp_pages/page_{N}.json` (in project root)

### Step 2: Combine into Database

```bash
cd scripts/scrape
./combine-pages-sqlite.sh
```

**Expected time:** ~5-10 minutes depending on system

**Output:** `cultivars.db` SQLite database (in project root) with all cultivars

## Resuming After Interruption

If the fetch script stops partway through:

1. Check which pages were fetched:
   ```bash
   ls ../../temp_pages/ | wc -l
   ls ../../temp_pages/ | sed 's/page_\([0-9]*\)\.json/\1/' | sort -n | tail -5
   ```

2. Update `START_PAGE` in `fetch-pages.sh` to the next page number

3. Re-run `fetch-pages.sh` - it will continue from where it left off

4. Re-run `combine-pages-sqlite.sh` - it will skip duplicates automatically

## Querying the Database

After combining, query the database (from project root):

```bash
# Count total cultivars
sqlite3 cultivars.db "SELECT COUNT(*) FROM cultivars;"

# Search by name
sqlite3 cultivars.db "SELECT post_title, primary_hybridizer_name FROM cultivars WHERE post_title LIKE '%Coffee%';"

# Filter by reblooming
sqlite3 cultivars.db "SELECT COUNT(*) FROM cultivars WHERE rebloom = 1;"

# Get recent registrations
sqlite3 cultivars.db "SELECT post_title, introduction_date FROM cultivars ORDER BY introduction_date DESC LIMIT 10;"

# Filter by hybridizer
sqlite3 cultivars.db "SELECT post_title, introduction_date FROM cultivars WHERE primary_hybridizer_name LIKE '%Cline%' LIMIT 10;"

# Filter by bloom season
sqlite3 cultivars.db "SELECT post_title, bloom_season_names FROM cultivars WHERE bloom_season_names LIKE '%Midseason%' LIMIT 10;"
```

## Database Schema

The `cultivars` table includes:

- **Identity:** `id`, `post_id`, `post_title`, `post_status`
- **Registration:** `introduction_date`, `last_updated`
- **Hybridizer:** `primary_hybridizer_name`, `hybridizer_code_legacy`
- **Physical:** `scape_height_in`, `bloom_size_in`, `bud_count`, `branches`
- **Taxonomy:** `bloom_season_names`, `bloom_habit_names`, `foliage_names`, `ploidy_names`, `flower_form_names`
- **Attributes:** `color`, `parentage`, `seedling_number`, `rebloom`, `double_percentage`
- **Media:** `first_image_json` (JSON), `awards_json` (JSON), `images_count`

**Indexes created on:**
- `post_title`
- `primary_hybridizer_name`
- `introduction_date`
- `bloom_season_names`
- `ploidy_names`
- `rebloom`

## Troubleshooting

### Script gets stuck on certain pages
- The script now has 30-second timeouts and automatic retries
- If a page fails after 3 retries, it saves an error file: `temp_pages/page_{N}.json.error`
- The script continues processing other pages

### Database has fewer records than expected
- Check for error files: `ls ../../temp_pages/*.error`
- Re-run `combine-pages-sqlite.sh` - it will skip already-processed pages

### Out of memory during combining
- SQLite handles large datasets efficiently with incremental inserts
- If you encounter issues, try processing pages in smaller batches

## Files

All output files are created in the project root:

- `temp_pages/` - Directory containing individual page JSON files (can be deleted after combining)
- `cultivars.db` - Final SQLite database with all cultivar data

## Notes

- The API endpoint requires a valid nonce which may change. Check the page source for `cultivar_search_ajax.nonce` if requests start failing.
- Rate limiting: 1-2 second delays between requests to avoid overwhelming the server
- The scraper respects the server's rate limits and includes error handling
