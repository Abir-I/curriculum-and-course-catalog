# Creates the Module 2 development database and imports the schema and sample data.
# Usage: .\import_windows.ps1 -Password "your_postgres_password"
param([string]$Password = "postgres", [string]$DbName = "ars_module2_dev", [switch]$SkipSample)
$env:PGPASSWORD = $Password
$psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
& $psql -U postgres -h localhost -q -c "DROP DATABASE IF EXISTS $DbName;"
& $psql -U postgres -h localhost -q -c "CREATE DATABASE $DbName;"
& $psql -U postgres -h localhost -d $DbName -v ON_ERROR_STOP=1 -q -f "$PSScriptRoot\module2_schema_full.sql"
if (-not $SkipSample) { & $psql -U postgres -h localhost -d $DbName -v ON_ERROR_STOP=1 -q -f "$PSScriptRoot\module2_seed_sample.sql" }
Write-Host "Done. Database $DbName is ready."
