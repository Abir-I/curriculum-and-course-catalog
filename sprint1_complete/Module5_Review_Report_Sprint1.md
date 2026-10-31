# Module 5 Review Report — Sprint 1

## 1. Review Information

- Project: Team 6 — Module 2: Curriculum and Course Catalog
- Team Lead: Abir
- Review scope: Team 5 Module 5 baseline
- Review period: Sprint 1
- Review status: Pending confirmation and sign-off

## 2. Review Scope

The Sprint 1 workbook identifies the following review areas:

- Functional requirements: M5-FR-01 to M5-FR-10
- Non-functional requirements: M5-NFR-01 to M5-NFR-08
- User stories: US-01 to US-10
- Acceptance criteria and measurability of SQAP targets

The workbook states that no Module 5 build exists for this review. Therefore, this report does not claim that Module 5 implementation, runtime behaviour, or code coverage has been tested.

## 3. Requirements Review — R-01

Owner: Abir  
Checker: Mysha

Review status: Pending evidence of completed review.

Items to verify against Team 5's baseline:
- [ ] M5-FR-01 to M5-FR-10
- [ ] M5-NFR-01 to M5-NFR-08
- [ ] US-01 to US-10
- [ ] Acceptance criteria
- [ ] Measurability of SQAP targets

The actual requirement texts and signed baseline must be available before these checks can be marked complete.

## 4. Acceptance Review — R-02

Owner: Fuad  
Checker: Mysha

Review status: Pending confirmation.

The review should assess whether the user stories and acceptance criteria are clear and testable. No acceptance review is claimed as complete in this report.

## 5. Metrics Review — R-03

Owner: Mysha  
Checker: Fuad

### Sprint 1 evidence currently available

- Database regression evidence: 61 passed, 0 failed.
- Database test IDs in the current evidence: M2TC-026 to M2TC-086.
- Workbook target: 51 database tests, M2TC-026 to M2TC-076.
- US-02 and US-03 service tests: 9 passed in total.
- Full Vitest run: 9 tests passed; 5 suites failed to load because service modules for out-of-scope stories are missing.

### Metrics discrepancy

The current database evidence contains 61 tests, while the workbook specifies a target of 51 tests. This difference requires reconciliation against the test register before the workbook metric is reported as met.

The workbook's service-test target is 8 of 25 tests green for M2TC-004 to M2TC-011. The current US-02 and US-03 run reports 9 passing tests because M2TC-012 is also present and passing in the current test file. The workbook lists M2TC-012 as Sprint 2 and expected to remain red during Sprint 1. This scope mismatch must be resolved without changing test files unless the project authority approves it.

No Module 5 build exists, so Module 5 pass rate and code coverage are not available.

## 6. Findings Log — R-04

Owner: Abir  
Checker: Fuad

### M5D-001 — Team 5 baseline confirmation

- Severity: Medium
- Priority: P1
- Status: Open
- Finding: Team 5 confirmation of the baseline in writing is outstanding.
- Required action: Obtain written confirmation from Team 5 and retain the evidence.

### M5D-002 — Team 5 roster

- Severity: Low
- Priority: P2
- Status: Open
- Finding: Team 5 roster completion is outstanding.
- Required action: Obtain and verify the complete roster.

These findings remain open until supporting evidence is received.

## 7. Coordination — R-05

Owner: Abir  
Checker: Fuad

Status: Pending evidence.


## 8. Team 1 Supervision

- S-01: Planned supervision check — pending evidence.
- S-02: Planned supervision check — pending evidence.

The workbook schedules two Team 1 supervision checks for Day 3 and Day 7. No completed supervision check is claimed here without a record.

## 9. Sprint Review — R-06

Status: Pending review and sign-off.

The sprint review record should capture actual results, unresolved findings, test-scope discrepancies, and team acknowledgements.

## 10. Conclusion

Sprint 1 has recorded implementation and test evidence for US-02 and US-03, along with database regression evidence. However, the database test count differs from the workbook target, M2TC-012 has a scope mismatch, and the full Vitest run still has five suites that fail to load due to missing service modules.

The Module 5 review, Team 5 written confirmation, Team 1 supervision records, and final sign-offs remain pending until supported by evidence.

## 11. Sign-off

- Abir (owner): ____________________  Date: __________
- Mysha (checker/reviewer): __________  Date: __________
- Fuad (reviewer): __________________  Date: __________
- Team 5 baseline confirmation: Pending
- Team 1 supervision evidence: Pending
The workbook states that the SQAP is not signed by both teams. Team 5 baseline confirmation and cross-team sign-off must be recorded when received.

