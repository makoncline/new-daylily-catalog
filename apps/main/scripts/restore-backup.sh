#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

usage() {
  echo "Usage: $0 -z <zip_file_path> -o <output_db_path>"
  exit 1
}

# Parse command-line arguments
while getopts ":z:o:" opt; do
  case ${opt} in
    z )
      ZIP_FILE_PATH=$OPTARG
      ;;
    o )
      OUTPUT_DB_PATH=$OPTARG
      ;;
    * )
      usage
      ;;
  esac
done

# Verify that both arguments are provided
if [ -z "${ZIP_FILE_PATH}" ] || [ -z "${OUTPUT_DB_PATH}" ]; then
  usage
fi

# Verify the ZIP file exists
if [ ! -f "${ZIP_FILE_PATH}" ]; then
  echo "Error: ZIP file '${ZIP_FILE_PATH}' not found."
  exit 1
fi

# Create a temporary directory for extraction
TEMP_DIR=$(mktemp -d)
# Ensure cleanup on exit
trap "rm -rf ${TEMP_DIR}" EXIT

# Extract the ZIP file quietly into the temporary directory
echo "Extracting '${ZIP_FILE_PATH}'..."
unzip -q "${ZIP_FILE_PATH}" -d "${TEMP_DIR}"

# Locate the first SQL file in the extracted contents
SQL_FILE=$(find "${TEMP_DIR}" -type f -name "*.sql" | head -n 1)
if [ -z "${SQL_FILE}" ]; then
  echo "Error: No SQL file found in the ZIP archive."
  exit 1
fi

# Import the SQL dump into the specified SQLite database
echo "Importing '${SQL_FILE}' into '${OUTPUT_DB_PATH}'..."
sqlite3 "${OUTPUT_DB_PATH}" < "${SQL_FILE}"

echo "Database restore completed successfully."