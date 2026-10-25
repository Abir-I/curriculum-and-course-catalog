# Module 2 — Sprint 1 API / Service Notes

Status: Draft — implementation-based notes, pending review
Scope: US-02 (Academic Units) and US-03 (Academic Stages)

## 1. Scope and limitations

These notes document the service-layer functions currently present in:
- `src/structure/unit.service.js`
- `src/structure/stage.service.js`
- `src/core/errors.js`

HTTP routes, HTTP methods, request URLs, authentication behaviour, and
serialized HTTP response bodies are not documented because route/controller
implementations were not found in the reviewed source files.

## 2. Academic Unit — US-02

Function: `createUnit(input, actor)`

Implementation behaviour:
- Creates an `academicUnit` record through Prisma.
- `unitType`, `code`, and `nameEn` are passed to Prisma.
- `nameBn`, `parentId`, and `termPattern` default to `null` when omitted.
- `STREAM` requires `parentId`.
- `PROGRAM` requires `termPattern`.
- A non-`PROGRAM` unit must not provide `termPattern`.
- Supported term patterns are `SEMESTER`, `TRIMESTER`, and `ANNUAL`.
- A unit cannot refer to itself as its parent when `selfId` and `parentId`
  are equal.
- Database errors are passed through `mapDbError`.
- The `actor` argument is accepted but is not used in this function.

Input fields observed in code:
- `unitType`
- `code`
- `nameEn`
- `nameBn` (optional)
- `parentId` (optional)
- `termPattern` (conditional)
- `selfId` (used by the self-parent validation)

Known validation errors:
- `UNIT_LOOP` — status 422
- `PARENT_REQUIRED` — status 422
- `TERM_PATTERN_REQUIRED` — status 422
- `TERM_PATTERN_NOT_ALLOWED` — status 422
- `TERM_PATTERN_INVALID` — status 422

Database uniqueness errors may map to:
- `DUPLICATE_CODE` — status 409, when the unique target contains `code`
- `DUPLICATE` — status 409, for other unique violations

## 3. Academic Stage — US-03

### 3.1 Create stage

Function: `createStage(input, actor)`

Implementation behaviour:
- Creates an `academicStage` record through Prisma.
- Passes `programId`, `seqNo`, and `nameEn` from input.
- `nameBn` and `nextStageId` default to `null` when omitted.
- Database errors are passed through `mapDbError`.
- The `actor` argument is accepted but is not used in this function.

Input fields observed in code:
- `programId`
- `seqNo`
- `nameEn`
- `nameBn` (optional)
- `nextStageId` (optional)

### 3.2 Set next stage

Function: `setNextStage(stageId, nextStageId, actor)`

Implementation behaviour:
- Rejects a direct self-reference with `STAGE_SELF_REFERENCE` (422).
- Follows the proposed next-stage chain to detect a loop.
- Rejects a detected loop with `STAGE_LOOP` (422).
- Updates the stage's `nextStageId` through Prisma.
- Database errors are passed through `mapDbError`.
- The `actor` argument is accepted but is not used in this function.

### 3.3 Delete or deactivate stage (out of Sprint 1 scope)

Function: `deleteStage(stageId, actor, options = {})`

Implementation behaviour:
- When `options.inUse` is truthy, sets `isActive` to `false` and returns
  the updated stage with `deleted: false`.
- Otherwise, deletes the stage and returns
  `{ id: stageId, isActive: false, deleted: true }`.
- The `actor` argument is accepted but is not used in this function.
- This function does not explicitly call `mapDbError`.

## 4. Database error mapping

Function: `mapDbError(err)`

- Recognized database guard codes listed in `src/core/errors.js` are mapped
  to status 422.
- Prisma unique violation `P2002` maps to status 409:
  - target contains `seq_no` -> `DUPLICATE_ORDER`
  - target contains `code` -> `DUPLICATE_CODE`
  - other unique target -> `DUPLICATE`
- Unrecognized errors are returned unchanged.

## 5. Review notes / items to verify

- Confirm expected input validation and response contracts against the
  Sprint 1 requirements and tests.
- Confirm whether `actor` is intentionally unused or audit/authorization
  handling is expected elsewhere.
- Confirm deletion behaviour and database error handling against the
  acceptance criteria.
- Confirm route/controller definitions before publishing HTTP endpoint
  documentation.
- Checker review is pending.

## 6. Review status

Prepared from the service and error-mapping source files listed above.
This document is a draft and does not claim that the assigned checker review,
cross-team review, or Sprint 1 sign-off is complete.
