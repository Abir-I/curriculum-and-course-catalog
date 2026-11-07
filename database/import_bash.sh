#!/usr/bin/env bash
# Creates the Module 2 development database and imports the schema and sample data.
# Usage: PGPASSWORD=your_password ./import_bash.sh [dbname]
set -euo pipefail
DB="${1:-ars_module2_dev}"
HERE="$(cd "$(dirname "$0")" && pwd)"
psql -U postgres -h localhost -q -c "DROP DATABASE IF EXISTS $DB;"
psql -U postgres -h localhost -q -c "CREATE DATABASE $DB;"
psql -U postgres -h localhost -d "$DB" -v ON_ERROR_STOP=1 -q -f "$HERE/module2_schema_full.sql"
psql -U postgres -h localhost -d "$DB" -v ON_ERROR_STOP=1 -q -f "$HERE/module2_seed_sample.sql"
echo "Done. Database $DB is ready."
