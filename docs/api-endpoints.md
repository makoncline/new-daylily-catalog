# Daylilies.org API Endpoints

## Main Search Endpoint

**Endpoint:** `https://daylilies.org/wp-admin/admin-ajax.php`

**Method:** POST

**Action:** `cultivar_search`

### Parameters

#### Basic Search
- `action`: `cultivar_search`
- `nonce`: `053737e109` (may change, check page source for current nonce)
- `search_type`: `basic`
- `search_term`: Search query (e.g., "Coffee Frenzy")
- `page`: Page number (default: 1)
- `per_page`: Results per page (default: 20, max appears to be configurable)
- `has_images`: Optional, 1 or 0
- `rebloom`: Optional, 1 or 0

#### Advanced Search
- `action`: `cultivar_search`
- `nonce`: `053737e109` (may change)
- `search_type`: `advanced`
- `search_term`: Cultivar name search
- `search_term_position`: `beginning`, `end`, or `anywhere` (default: `anywhere`)
- `ads_hybridizer`: Hybridizer name search
- `ads_hybridizer_position`: `beginning`, `end`, or `anywhere` (default: `anywhere`)
- `parentage`: Parentage search
- `description_keywords`: Description keywords search
- `page`: Page number
- `per_page`: Results per page
- Additional filter parameters for bloom size, scape height, form, season, foliage, etc.

### Response Structure

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "91789",
        "post_id": "143481",
        "post_title": "'S Wonderful, 'S Marvelous",
        "post_status": "publish",
        "introduction_date": "2020-09-08",
        "primary_hybridizer_id": "3510",
        "primary_hybridizer_name": "Pete Harry",
        "additional_hybridizers_ids": null,
        "additional_hybridizers_names": null,
        "hybridizer_code_legacy": "Marlatt-J.",
        "seedling_number": "16-70",
        "bloom_season_ids": "142",
        "bloom_season_names": "Midseason",
        "fragrance_ids": "140",
        "fragrance_names": "Fragrant",
        "bloom_habit_ids": "130",
        "bloom_habit_names": "Diurnal",
        "foliage_ids": "133",
        "foliage_names": "Dormant",
        "ploidy_ids": "144",
        "ploidy_names": "Tetraploid",
        "scape_height_in": "48.00",
        "bloom_size_in": "6.00",
        "bud_count": "10",
        "branches": "3",
        "color": "Dark red wine with gold throat and yellow teeth with horns.",
        "rebloom": "1",
        "flower_form_ids": "132",
        "flower_form_names": "Single",
        "double_percentage": "100.00",
        "polymerous_percentage": null,
        "spider_ratio": null,
        "petal_length_in": null,
        "petal_width_in": null,
        "unusual_forms_ids": null,
        "unusual_forms_names": null,
        "parentage": "(sdlg × sdlg)",
        "images_count": "1",
        "last_updated": "2026-01-21 16:36:24",
        "first_image": {
          "thumbnail": "https://daylily-wordpress-dev.s3.us-east-2.amazonaws.com/wp-content/uploads/...",
          "full": "https://daylily-wordpress-dev.s3.us-east-2.amazonaws.com/wp-content/uploads/...",
          "alt": "",
          "title": "..."
        },
        "awards": [
          {
            "name": "AGI",
            "year": "2015",
            "award_id": 172077,
            "award_url": "https://daylilies.org/award/artistic-garden-image/"
          }
        ]
      }
    ],
    "total_count": 104109,
    "sql": "..."
  }
}
```

### Field Mapping

| Page Field | API Field | Notes |
|------------|-----------|-------|
| Name | `post_title` | |
| Registration Year | `introduction_date` | Format: YYYY-MM-DD |
| Hybridizer(s) | `primary_hybridizer_name` or `hybridizer_code_legacy` | Use `primary_hybridizer_name` if available, fallback to `hybridizer_code_legacy` |
| Scape Height (in) | `scape_height_in` | String, decimal format |
| Bloom Size (in) | `bloom_size_in` | String, decimal format |
| Bloom Season | `bloom_season_names` | |
| Reblooming | `rebloom` | "1" = Yes, "0" = No |
| Form | `flower_form_names` | May contain multiple values separated by `\|` |
| Double Percentage | `double_percentage` | String, decimal format, null if not applicable |
| Ploidy | `ploidy_names` | |
| Foliage Type | `foliage_names` | |
| Fragrance | `fragrance_names` | null if not fragrant |
| Bloom Habit | `bloom_habit_names` | |
| Flower Show | Not directly available | May be derived from `flower_form_names` |
| Bud Count | `bud_count` | String |
| Branches | `branches` | String |
| Seedling Number | `seedling_number` | |
| Color | `color` | Free text description |
| Parentage | `parentage` | |
| Notes | Not available in search endpoint | May need to fetch from individual cultivar page |
| Images | `first_image` | Contains `thumbnail` and `full` URLs |
| Image Count | `images_count` | String |

### Example Requests

#### Get all cultivars (paginated)
```bash
curl 'https://daylilies.org/wp-admin/admin-ajax.php' \
  -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'action=cultivar_search&nonce=053737e109&search_type=advanced&page=1&per_page=100'
```

#### Search by cultivar name
```bash
curl 'https://daylilies.org/wp-admin/admin-ajax.php' \
  -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'action=cultivar_search&nonce=053737e109&search_type=basic&search_term=Coffee+Frenzy&page=1&per_page=10'
```

#### Get total count
```bash
curl 'https://daylilies.org/wp-admin/admin-ajax.php' \
  -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'action=cultivar_search&nonce=053737e109&search_type=advanced&page=1&per_page=1' | jq '.data.total_count'
```

### Notes

1. **Nonce**: The nonce value may change. To get the current nonce, check the page source for `cultivar_search_ajax` variable:
   ```javascript
   var cultivar_search_ajax = {"ajax_url":"...","nonce":"053737e109",...};
   ```

2. **Total Count**: The API returns `total_count` in the response, which shows the total number of cultivars matching the search (currently 104,109 total cultivars).

3. **Pagination**: Use `page` and `per_page` parameters to paginate through results. The maximum `per_page` value may be limited server-side.

4. **Missing Fields**: Some fields shown on the individual cultivar page (like "Notes") are not available in the search endpoint response. You may need to:
   - Parse the HTML of the individual cultivar page
   - Check if there's a separate endpoint for individual cultivar details
   - Use the WordPress REST API endpoint (though it has limited fields)

5. **WordPress REST API Alternative**: There's also a WordPress REST API endpoint at `/wp-json/wp/v2/cultivar/{id}`, but it only returns taxonomy data and basic post information, not the detailed cultivar attributes.

6. **Image URLs**: Images are hosted on S3 at `daylily-wordpress-dev.s3.us-east-2.amazonaws.com`. The `first_image` object contains both thumbnail and full-size URLs.

### Getting Individual Cultivar Details

To get details for a specific cultivar (like "Coffee Frenzy" with post_id 114795), you can:

1. Search for it by name using the search endpoint
2. Use the WordPress REST API: `https://daylilies.org/wp-json/wp/v2/cultivar/114795` (limited fields)
3. Parse the HTML page: `https://daylilies.org/cultivar/coffee-frenzy/`

The search endpoint is the most comprehensive source for bulk data retrieval.
