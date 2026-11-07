# Module 2 database: import guide

Files in this folder
- module2_schema_full.sql: the complete schema (14 tables, triggers). Run once on an empty database.
- module2_seed_sample.sql: optional sample data for development. Do not run it on the test database.
- import_windows.ps1: Windows PowerShell script. Creates `ars_module2_dev`, imports schema and sample data.
- import_bash.sh: Linux or Git Bash script with the same steps.

## Option A: one command (Windows PowerShell)
```powershell
cd "E:\CSE_430(TESTING)\module2_database_v3\database"
.\import_windows.ps1 -Password "your_postgres_password"
```
If PowerShell blocks scripts, run once: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.

## Option B: pgAdmin 4 (no command line)
1. Create the database `ars_module2_dev` (owner postgres).
2. Right-click the database, choose Query Tool.
3. Open `module2_schema_full.sql`, press F5 (Execute).
4. Open `module2_seed_sample.sql`, press F5. Skip this step for an empty database.

## Option C: Git Bash
```bash
cd "/e/CSE_430(TESTING)/module2_database_v3/database"
PGPASSWORD=your_postgres_password ./import_bash.sh
```

## Test database
The automated tests use `ars_module2_test`. Import only `module2_schema_full.sql` there:
```
psql -U postgres -d ars_module2_test -f module2_schema_full.sql
python ../tests/schema_tests.py
```
The test script clears the tables before each test, so never put real data in the test database.

## Connection string for the application
`DATABASE_URL="postgresql://postgres:your_postgres_password@localhost:5432/ars_module2_dev"`

## Prisma users
The same schema is in `prisma/migrations/`. Use `npx prisma migrate deploy` to apply it through Prisma instead of this file. Do not apply both methods to the same database.

## Checks after import
- 14 tables in the public schema.
- 14 trigger functions attached to tables.
- Sample data: 4 units, 3 stages, 5 courses, 6 curriculum items, 2 prerequisite rules, 3 offerings, 4 sections, 3 meetings, 3 policies.
