"""Module 2 schema tests (PostgreSQL). Each test resets the database, builds its fixture,
then runs one action. A test passes when the action succeeds (expect='ok') or fails with the
expected error text (expect='error', code=...). Run:  python3 schema_tests.py
Environment: M2_DSN (default postgresql://postgres:postgres@localhost:5432/ars_module2_test)"""
import os, sys, psycopg2

DSN = os.environ.get("M2_DSN", "postgresql://postgres:postgres@localhost:5432/ars_module2_test")
MIGRATIONS = os.path.join(os.path.dirname(__file__), "..", "prisma", "migrations")

def conn():
    c = psycopg2.connect(DSN); c.autocommit = True; return c

def reset(c):
    cur = c.cursor()
    cur.execute("""SELECT string_agg(quote_ident(tablename), ',') FROM pg_tables
                   WHERE schemaname='public' AND tablename NOT LIKE '\\_%'""")
    tables = cur.fetchone()[0]
    cur.execute("SET session_replication_role = replica")   # reset bypasses guards (test setup only)
    cur.execute(f"TRUNCATE {tables} CASCADE")
    cur.execute("SET session_replication_role = origin")
    cur.close()

def run(c, sql, params=None):
    cur = c.cursor()
    try:
        cur.execute(sql, params)
        return None
    except psycopg2.Error as e:
        return str(e).strip().splitlines()[0]
    finally:
        cur.close()

# Fixed IDs so tests are readable
UNI = "00000000-0000-4000-8000-000000000001"   # faculty
DEP = "00000000-0000-4000-8000-000000000002"   # department
PRG = "00000000-0000-4000-8000-000000000003"   # program
STR = "00000000-0000-4000-8000-000000000004"   # stream
CRS1 = "00000000-0000-4000-8000-000000000011"
CRS2 = "00000000-0000-4000-8000-000000000012"
CRS_LAB = "00000000-0000-4000-8000-000000000013"
TERM = "00000000-0000-4000-8000-000000000021"
TERM2 = "00000000-0000-4000-8000-000000000022"
CUR = "00000000-0000-4000-8000-000000000031"
PLAN = "00000000-0000-4000-8000-000000000033"
CUR2 = "00000000-0000-4000-8000-000000000032"
ITEM1 = "00000000-0000-4000-8000-000000000041"
ITEM2 = "00000000-0000-4000-8000-000000000042"
OFF1 = "00000000-0000-4000-8000-000000000051"
SEC_T = "00000000-0000-4000-8000-000000000061"
SEC_T2 = "00000000-0000-4000-8000-000000000062"
SEC_L = "00000000-0000-4000-8000-000000000063"
ROOM_A = "00000000-0000-4000-8000-000000000071"
ROOM_B = "00000000-0000-4000-8000-000000000072"
ROOM_SMALL = "00000000-0000-4000-8000-000000000073"
USER_PREP = "00000000-0000-4000-8000-000000000081"
USER_APPR = "00000000-0000-4000-8000-000000000082"
TEACHER = "00000000-0000-4000-8000-000000000091"

def base(c):
    """Common fixture: faculty, dept, program, stream, two courses, one lab-only course, two terms, rooms."""
    for s in [
        f"INSERT INTO academic_units (id, unit_type, code, name_en) VALUES ('{UNI}','FACULTY','FAC-SCI','Science')",
        f"INSERT INTO academic_units (id, parent_id, unit_type, code, name_en) VALUES ('{DEP}','{UNI}','DEPARTMENT','DEPT-CSE','CSE')",
        f"INSERT INTO academic_units (id, parent_id, unit_type, code, name_en, term_pattern) VALUES ('{PRG}','{DEP}','PROGRAM','PRG-BSC','BSc CSE','SEMESTER')",
        f"INSERT INTO courses (id, code, title_en, theory_credit, lab_credit) VALUES ('{CRS1}','CSE101','Intro',3,0)",
        f"INSERT INTO courses (id, code, title_en, theory_credit, lab_credit) VALUES ('{CRS2}','CSE102','Data',3,0)",
        f"INSERT INTO courses (id, code, title_en, theory_credit, lab_credit) VALUES ('{CRS_LAB}','CSE103L','Lab only',0,1)",
        f"INSERT INTO academic_terms (id, term_type, session_label, name_en) VALUES ('{TERM}','SEMESTER','2026-FALL','Fall 2026')",
        f"INSERT INTO academic_terms (id, term_type, session_label, name_en) VALUES ('{TERM2}','SEMESTER','2027-SPRING','Spring 2027')",
        f"INSERT INTO rooms (id, code, room_type, capacity) VALUES ('{ROOM_A}','R-101','LECTURE',60)",
        f"INSERT INTO rooms (id, code, room_type, capacity) VALUES ('{ROOM_B}','R-102','LECTURE',60)",
        f"INSERT INTO rooms (id, code, room_type, capacity) VALUES ('{ROOM_SMALL}','R-SMALL','LECTURE',20)",
        f"INSERT INTO degree_plans (id, plan_code, program_id, name_en) VALUES ('{PLAN}','1001','{PRG}','CSE')",
        f"INSERT INTO curricula (id, program_id, degree_plan_id, version_no, cohort_start_year, cohort_end_year, prepared_by) VALUES ('{CUR}','{PRG}','{PLAN}',1,2024,2027,'{USER_PREP}')",
        f"INSERT INTO curriculum_items (id, curriculum_id, item_type, course_id) VALUES ('{ITEM1}','{CUR}','COURSE','{CRS1}')",
        f"INSERT INTO curriculum_items (id, curriculum_id, item_type, course_id) VALUES ('{ITEM2}','{CUR}','COURSE','{CRS2}')",
        f"INSERT INTO course_offerings (id, course_id, term_id, status) VALUES ('{OFF1}','{CRS1}','{TERM}','OPEN')",
        f"INSERT INTO course_sections (id, offering_id, section_code, section_type, capacity, instructor_user_id) VALUES ('{SEC_T}','{OFF1}','A','THEORY',40,'{TEACHER}')",
        f"INSERT INTO course_sections (id, offering_id, section_code, section_type, capacity, instructor_user_id) VALUES ('{SEC_T2}','{OFF1}','B','THEORY',40,'{TEACHER}')",
    ]:
        err = run(c, s)
        assert err is None, f"fixture failed: {err} :: {s[:80]}"

def meeting(sec, room, day, start, end, term=TERM):
    return (f"INSERT INTO section_meetings (section_id, room_id, term_id, day_of_week, start_minute, end_minute) "
            f"VALUES ('{sec}','{room}','{term}',{day},{start},{end})")

T = []
def test(code, name, expect, fixture=None, action=None, error=None):
    T.append((code, name, expect, fixture, action, error))

# ---- A. Academic units (FR-02, FR-04, FR-05, FR-06)
test("M2TC-026", "Department can be created under a faculty", "ok", None,
     f"INSERT INTO academic_units (unit_type, code, name_en, parent_id) VALUES ('DEPARTMENT','DEPT-X','X','{UNI}')")
test("M2TC-027", "Stream without a program parent is refused (PARENT_REQUIRED)", "error", None,
     "INSERT INTO academic_units (unit_type, code, name_en) VALUES ('STREAM','STR-1','Stream')", "PARENT_REQUIRED")
test("M2TC-028", "Program without a term pattern is refused", "error", None,
     f"INSERT INTO academic_units (unit_type, code, name_en, parent_id) VALUES ('PROGRAM','PRG-2','P2','{DEP}')", "chk_unit_term_pattern")
test("M2TC-029", "A unit cannot be its own parent (refused with UNIT_LOOP)", "error", None,
     f"UPDATE academic_units SET parent_id = id WHERE id = '{UNI}'", "UNIT_LOOP")
test("M2TC-030", "A unit loop is refused (UNIT_LOOP)", "error", None,
     f"UPDATE academic_units SET parent_id = '{PRG}' WHERE id = '{UNI}'", "UNIT_LOOP")

# ---- B. Stages (FR-03, FR-06)
ST1 = "00000000-0000-4000-8000-000000000101"
ST2 = "00000000-0000-4000-8000-000000000102"
test("M2TC-031", "Duplicate stage order in one program is refused", "error",
     lambda c: run(c, f"INSERT INTO academic_stages (id, program_id, seq_no, name_en) VALUES ('{ST1}','{PRG}',1,'Y1')"),
     f"INSERT INTO academic_stages (program_id, seq_no, name_en) VALUES ('{PRG}',1,'Dup')", "uq_stage_order")
test("M2TC-032", "Stage chain that loops back is refused (STAGE_LOOP)", "error",
     lambda c: (run(c, f"INSERT INTO academic_stages (id, program_id, seq_no, name_en) VALUES ('{ST1}','{PRG}',1,'Y1')"),
                run(c, f"INSERT INTO academic_stages (id, program_id, seq_no, name_en, next_stage_id) VALUES ('{ST2}','{PRG}',2,'Y2','{ST1}')")),
     f"UPDATE academic_stages SET next_stage_id = '{ST2}' WHERE id = '{ST1}'", "STAGE_LOOP")

# ---- C. Courses (FR-07, FR-08)
test("M2TC-033", "Valid course is saved", "ok", None,
     "INSERT INTO courses (code, title_en, theory_credit, lab_credit) VALUES ('CSE200','New',3,0)")
test("M2TC-034", "Duplicate course code is refused", "error", None,
     "INSERT INTO courses (code, title_en, theory_credit, lab_credit) VALUES ('CSE101','Dup',3,0)", "courses_code_key")
test("M2TC-035", "Courses refuse grading marks (Module 4 owns marks): column does not exist", "error", None,
     "INSERT INTO courses (code, title_en, theory_credit, lab_credit, written_marks) VALUES ('CSE201','Bad',3,0,60)", "written_marks")
test("M2TC-036", "Negative credit is refused", "error", None,
     "INSERT INTO courses (code, title_en, theory_credit, lab_credit) VALUES ('CSE202','Neg',-3,0)", "check constraint")
test("M2TC-037", "Course with zero theory and zero lab credit is refused", "error", None,
     "INSERT INTO courses (code, title_en, theory_credit, lab_credit) VALUES ('CSE203','Zero',0,0)", "chk_course_credit_total")

# ---- D. Offerings (FR-10)
test("M2TC-038", "Offering of an inactive course is refused (COURSE_INACTIVE)", "error",
     lambda c: run(c, f"UPDATE courses SET status='INACTIVE' WHERE id='{CRS2}'"),
     f"INSERT INTO course_offerings (course_id, term_id) VALUES ('{CRS2}','{TERM2}')", "COURSE_INACTIVE")
test("M2TC-039", "Offering with no registration window columns: window is owned by Module 3", "ok", None,
     f"INSERT INTO course_offerings (course_id, term_id, status) VALUES ('{CRS2}','{TERM2}','OPEN')")

# ---- E. Curriculum lifecycle and cohorts (FR-12 to FR-15, US-09, US-11)
test("M2TC-040", "Overlapping cohort years in the same program are refused (COHORT_OVERLAP)", "error", base,
     f"INSERT INTO curricula (program_id, degree_plan_id, version_no, cohort_start_year, cohort_end_year, prepared_by) VALUES ('{PRG}','{PLAN}',2,2026,2030,'{USER_PREP}')", "COHORT_OVERLAP")
test("M2TC-041", "Next non-overlapping cohort is accepted", "ok", base,
     f"INSERT INTO curricula (program_id, degree_plan_id, version_no, cohort_start_year, cohort_end_year, prepared_by) VALUES ('{PRG}','{PLAN}',2,2028,2030,'{USER_PREP}')")
test("M2TC-042", "Preparer cannot approve the same version", "error", base,
     f"UPDATE curricula SET status='UNDER_REVIEW' WHERE id='{CUR}'; UPDATE curricula SET status='APPROVED', approved_by='{USER_PREP}' WHERE id='{CUR}'",
     "chk_approver_not_preparer")
test("M2TC-043", "Skipping review (DRAFT to PUBLISHED) is refused (INVALID_TRANSITION)", "error", base,
     f"UPDATE curricula SET status='PUBLISHED', published_at=now() WHERE id='{CUR}'", "INVALID_TRANSITION")
test("M2TC-044", "Full approval path DRAFT, REVIEW, APPROVED, PUBLISHED is accepted", "ok", base,
     f"UPDATE curricula SET status='UNDER_REVIEW' WHERE id='{CUR}'; UPDATE curricula SET status='APPROVED', approved_by='{USER_APPR}' WHERE id='{CUR}'; UPDATE curricula SET status='PUBLISHED', published_at=now() WHERE id='{CUR}'")
test("M2TC-045", "Editing a published version is refused (PUBLISHED_IMMUTABLE)", "error",
     lambda c: (run(c, f"UPDATE curricula SET status='UNDER_REVIEW' WHERE id='{CUR}'"),
                run(c, f"UPDATE curricula SET status='APPROVED', approved_by='{USER_APPR}' WHERE id='{CUR}'"),
                run(c, f"UPDATE curricula SET status='PUBLISHED', published_at=now() WHERE id='{CUR}'")),
     f"UPDATE curricula SET cohort_end_year = 2031 WHERE id='{CUR}'", "PUBLISHED_IMMUTABLE")
test("M2TC-046", "Deleting a published version is refused", "error",
     lambda c: (run(c, f"UPDATE curricula SET status='UNDER_REVIEW' WHERE id='{CUR}'"),
                run(c, f"UPDATE curricula SET status='APPROVED', approved_by='{USER_APPR}' WHERE id='{CUR}'"),
                run(c, f"UPDATE curricula SET status='PUBLISHED', published_at=now() WHERE id='{CUR}'")),
     f"DELETE FROM curricula WHERE id='{CUR}'", "CURRICULUM_NOT_DELETABLE")

# ---- F. Curriculum items and copied credits (FR-16, FR-17, US-06)
test("M2TC-047", "Course placement copies the course's credits", "ok", base,
     f"SELECT 1 FROM curriculum_items WHERE id='{ITEM1}' AND copied_theory_credit=3")
test("M2TC-048", "Placing a course twice in one version is refused", "error", base,
     f"INSERT INTO curriculum_items (curriculum_id, item_type, course_id) VALUES ('{CUR}','COURSE','{CRS1}')", "uq_course_once_per_version")
test("M2TC-049", "Changing a course after placement keeps the copied credits (US-06)", "ok", base,
     f"UPDATE courses SET theory_credit = 4 WHERE id='{CRS1}'; SELECT 1 FROM curriculum_items WHERE id='{ITEM1}' AND copied_theory_credit=3")
test("M2TC-050", "Adding an item to a frozen version is refused (CURRICULUM_FROZEN)", "error",
     lambda c: (run(c, f"UPDATE curricula SET status='UNDER_REVIEW' WHERE id='{CUR}'"),
                run(c, f"UPDATE curricula SET status='APPROVED', approved_by='{USER_APPR}' WHERE id='{CUR}'"),
                run(c, f"UPDATE curricula SET status='PUBLISHED', published_at=now() WHERE id='{CUR}'")),
     f"INSERT INTO curriculum_items (curriculum_id, item_type, course_id) VALUES ('{CUR}','COURSE','{CRS_LAB}')", "CURRICULUM_FROZEN")

# ---- G. Prerequisite rules (FR-23 to FR-26, US-10)
test("M2TC-051", "A prerequisite placed on a group item is refused (RULE_ON_GROUP)", "error", base,
     f"INSERT INTO curriculum_items (id, curriculum_id, item_type, group_type) VALUES ('00000000-0000-4000-8000-000000000201','{CUR}','GROUP','CORE'); "
     f"INSERT INTO prerequisite_rules (curriculum_item_id, rule_kind, node_type, course_id) VALUES ('00000000-0000-4000-8000-000000000201','PREREQUISITE','COURSE','{CRS2}')",
     "RULE_ON_GROUP")
test("M2TC-052", "A course cannot be its own prerequisite (SELF_PREREQUISITE)", "error", base,
     f"INSERT INTO prerequisite_rules (curriculum_item_id, rule_kind, node_type, course_id) VALUES ('{ITEM1}','PREREQUISITE','COURSE','{CRS1}')",
     "SELF_PREREQUISITE")
test("M2TC-053", "An AND/OR tree with a minimum grade is accepted", "ok", base,
     f"INSERT INTO prerequisite_rules (id, curriculum_item_id, rule_kind, node_type) VALUES ('00000000-0000-4000-8000-000000000301','{ITEM2}','PREREQUISITE','AND'); "
     f"INSERT INTO prerequisite_rules (curriculum_item_id, rule_kind, node_type, parent_node_id, course_id, min_grade) VALUES ('{ITEM2}','PREREQUISITE','COURSE','00000000-0000-4000-8000-000000000301','{CRS1}','C')")
test("M2TC-054", "A rule tree that loops back is refused (RULE_LOOP)", "error", base,
     f"INSERT INTO prerequisite_rules (id, curriculum_item_id, rule_kind, node_type) VALUES ('00000000-0000-4000-8000-000000000401','{ITEM2}','PREREQUISITE','AND'); "
     f"INSERT INTO prerequisite_rules (id, curriculum_item_id, rule_kind, node_type, parent_node_id) VALUES ('00000000-0000-4000-8000-000000000402','{ITEM2}','PREREQUISITE','OR','00000000-0000-4000-8000-000000000401'); "
     f"UPDATE prerequisite_rules SET parent_node_id='00000000-0000-4000-8000-000000000402' WHERE id='00000000-0000-4000-8000-000000000401'",
     "RULE_LOOP")

# ---- H. Policies (FR-33 to FR-37)
test("M2TC-055", "Changing a saved policy value is refused (POLICY_IMMUTABLE)", "error",
     lambda c: run(c, "INSERT INTO academic_policies (policy_key, value, effective_from, created_by) VALUES ('MIN_ATTENDANCE','{\"pct\":70}','2026-01-01','00000000-0000-4000-8000-000000000081')"),
     "UPDATE academic_policies SET value='{\"pct\":80}' WHERE policy_key='MIN_ATTENDANCE'", "POLICY_IMMUTABLE")
test("M2TC-056", "Deleting a saved policy is refused (POLICY_NOT_DELETABLE)", "error",
     lambda c: run(c, "INSERT INTO academic_policies (policy_key, value, effective_from, created_by) VALUES ('MIN_ATTENDANCE','{\"pct\":70}','2026-01-01','00000000-0000-4000-8000-000000000081')"),
     "DELETE FROM academic_policies WHERE policy_key='MIN_ATTENDANCE'", "POLICY_NOT_DELETABLE")
test("M2TC-057", "Setting an end date on a policy is accepted", "ok",
     lambda c: run(c, "INSERT INTO academic_policies (policy_key, value, effective_from, created_by) VALUES ('MIN_ATTENDANCE','{\"pct\":70}','2026-01-01','00000000-0000-4000-8000-000000000081')"),
     "UPDATE academic_policies SET effective_to='2026-12-31' WHERE policy_key='MIN_ATTENDANCE'")

# ---- I. Sections and lab links (FR-39, FR-40)
test("M2TC-058", "Lab of a course with theory credit needs a theory link (LAB_NEEDS_THEORY_LINK)", "error", base,
     f"INSERT INTO course_sections (offering_id, section_code, section_type, capacity) VALUES ('{OFF1}','L1','LAB',30)", "LAB_NEEDS_THEORY_LINK")
test("M2TC-059", "Lab-only course lab section needs no theory link", "ok", base,
     f"INSERT INTO course_offerings (id, course_id, term_id, status) VALUES ('00000000-0000-4000-8000-000000000501','{CRS_LAB}','{TERM}','OPEN'); "
     f"INSERT INTO course_sections (offering_id, section_code, section_type, capacity) VALUES ('00000000-0000-4000-8000-000000000501','L1','LAB',30)")
test("M2TC-060", "A lab cannot link to another lab section (LINK_MUST_BE_THEORY)", "error",
     lambda c: (run(c, f"INSERT INTO course_offerings (id, course_id, term_id, status) VALUES ('00000000-0000-4000-8000-000000000601','{CRS_LAB}','{TERM}','OPEN')"),
                run(c, f"INSERT INTO course_sections (id, offering_id, section_code, section_type, capacity) VALUES ('{SEC_L}','00000000-0000-4000-8000-000000000601','L1','LAB',30)")),
     f"INSERT INTO course_sections (offering_id, section_code, section_type, linked_theory_section_id, capacity) VALUES ('00000000-0000-4000-8000-000000000601','L2','LAB','{SEC_L}',30)", "LINK_MUST_BE_THEORY")
test("M2TC-061", "Section capacity of zero is accepted (Module 3 waitlist case)", "ok", base,
     f"UPDATE course_sections SET capacity = 0 WHERE id='{SEC_T2}'")

# ---- J. Meetings: room and teacher clashes, term, capacity (FR-41, FR-42, US-12)
test("M2TC-062", "Overlapping meetings in the same room are refused (ROOM_CLASH)", "error",
     lambda c: run(c, meeting(SEC_T, ROOM_A, 1, 540, 630)),
     meeting(SEC_T2, ROOM_A, 1, 600, 660), "ROOM_CLASH")
test("M2TC-063", "Back-to-back meetings in the same room are accepted", "ok",
     lambda c: run(c, meeting(SEC_T, ROOM_A, 1, 540, 630)),
     meeting(SEC_T2, ROOM_A, 1, 630, 690))
test("M2TC-064", "The same teacher in two rooms at the same time is refused (INSTRUCTOR_CLASH)", "error",
     lambda c: run(c, meeting(SEC_T, ROOM_A, 2, 540, 630)),
     meeting(SEC_T2, ROOM_B, 2, 600, 660), "INSTRUCTOR_CLASH")
test("M2TC-065", "A section larger than its room is refused (SECTION_EXCEEDS_ROOM)", "error", base,
     meeting(SEC_T, ROOM_SMALL, 3, 540, 630), "SECTION_EXCEEDS_ROOM")
test("M2TC-066", "A meeting whose term differs from the offering term is refused (MEETING_TERM_MISMATCH)", "error", base,
     meeting(SEC_T, ROOM_A, 4, 540, 630, term=TERM2), "MEETING_TERM_MISMATCH")
test("M2TC-067", "A meeting that ends before it starts is refused", "error", base,
     meeting(SEC_T, ROOM_A, 4, 630, 540), "chk_meeting_order")

# ---- K. Audit (FR-48, auditability)
test("M2TC-068", "Audit rows cannot be updated (AUDIT_APPEND_ONLY)", "error",
     lambda c: run(c, "INSERT INTO audit_logs (action, entity_type, entity_id, request_id) VALUES ('CREATE','course','00000000-0000-4000-8000-000000000011','req-1')"),
     "UPDATE audit_logs SET action='EDIT'", "AUDIT_APPEND_ONLY")
test("M2TC-069", "Audit rows cannot be deleted (AUDIT_APPEND_ONLY)", "error",
     lambda c: run(c, "INSERT INTO audit_logs (action, entity_type, entity_id, request_id) VALUES ('CREATE','course','00000000-0000-4000-8000-000000000011','req-1')"),
     "DELETE FROM audit_logs", "AUDIT_APPEND_ONLY")


# ---- L. Review fixes (migration 0003)
REL = "00000000-0000-4000-8000-000000000701"
SEC_X = "00000000-0000-4000-8000-000000000702"
test("M2TC-070", "An approved course relation cannot be deleted (RELATION_NOT_DELETABLE)", "error",
     f"INSERT INTO course_relations (id, course_id, related_course_id, relation_type, approved_by, effective_from) VALUES ('{REL}','{CRS1}','{CRS2}','EQUIVALENT','{USER_APPR}','2026-01-01')",
     f"DELETE FROM course_relations WHERE id='{REL}'", "RELATION_NOT_DELETABLE")
test("M2TC-071", "An approved course relation cannot be changed (RELATION_IMMUTABLE)", "error",
     f"INSERT INTO course_relations (id, course_id, related_course_id, relation_type, approved_by, effective_from) VALUES ('{REL}','{CRS1}','{CRS2}','EQUIVALENT','{USER_APPR}','2026-01-01')",
     f"UPDATE course_relations SET effective_from='2025-01-01' WHERE id='{REL}'", "RELATION_IMMUTABLE")
test("M2TC-072", "A course relation can be ended once", "ok",
     f"INSERT INTO course_relations (id, course_id, related_course_id, relation_type, approved_by, effective_from) VALUES ('{REL}','{CRS1}','{CRS2}','EQUIVALENT','{USER_APPR}','2026-01-01')",
     f"UPDATE course_relations SET effective_to='2026-12-31' WHERE id='{REL}'")
test("M2TC-073", "A policy end date, once set, cannot be changed again (POLICY_END_FIXED)", "error",
     "INSERT INTO academic_policies (policy_key, value, effective_from, created_by) VALUES ('MIN_ATTENDANCE','{\"pct\":70}','2026-01-01','00000000-0000-4000-8000-000000000082'); UPDATE academic_policies SET effective_to='2026-12-31' WHERE policy_key='MIN_ATTENDANCE'",
     "UPDATE academic_policies SET effective_to='2027-06-30' WHERE policy_key='MIN_ATTENDANCE'", "POLICY_END_FIXED")
test("M2TC-074", "The audit log cannot be emptied with TRUNCATE (AUDIT_APPEND_ONLY)", "error", None,
     "TRUNCATE audit_logs", "AUDIT_APPEND_ONLY")
test("M2TC-075", "A section cannot grow beyond the smallest room it is booked in (SECTION_EXCEEDS_ROOM)", "error",
     f"UPDATE course_sections SET capacity = 10 WHERE id='{SEC_T}'; "
     f"INSERT INTO section_meetings (section_id, room_id, term_id, day_of_week, start_minute, end_minute) VALUES ('{SEC_T}','{ROOM_A}','{TERM}',1,540,600); "
     f"INSERT INTO section_meetings (section_id, room_id, term_id, day_of_week, start_minute, end_minute) VALUES ('{SEC_T}','{ROOM_SMALL}','{TERM}',2,540,600)",
     f"UPDATE course_sections SET capacity = 40 WHERE id='{SEC_T}'", "SECTION_EXCEEDS_ROOM")
test("M2TC-076", "Changing a section's teacher to one who is busy at that time is refused (INSTRUCTOR_CLASH)", "error",
     f"INSERT INTO section_meetings (section_id, room_id, term_id, day_of_week, start_minute, end_minute) VALUES ('{SEC_T}','{ROOM_A}','{TERM}',3,540,630); "
     f"INSERT INTO course_sections (id, offering_id, section_code, section_type, capacity, instructor_user_id) VALUES ('{SEC_X}','{OFF1}','X','THEORY',10,'{USER_APPR}'); "
     f"INSERT INTO section_meetings (section_id, room_id, term_id, day_of_week, start_minute, end_minute) VALUES ('{SEC_X}','{ROOM_B}','{TERM}',3,600,660)",
     f"UPDATE course_sections SET instructor_user_id='{TEACHER}' WHERE id='{SEC_X}'", "INSTRUCTOR_CLASH")


# ---- M. Migration 0004 rules (marks, policy overlap, prerequisite cycles, one root, degree plans)
ITEM3 = "00000000-0000-4000-8000-000000000091x"
UNIT_P2 = "00000000-0000-4000-8000-0000000000a9"
test("M2TC-077", "Overlapping policy periods in the same scope are refused (POLICY_OVERLAP)", "error",
     f"INSERT INTO academic_policies (policy_key, scope_unit_id, value, effective_from, effective_to, created_by) VALUES ('MIN_ATTENDANCE','{PRG}','{{\"pct\":70}}','2023-01-01','2025-12-31','{USER_APPR}')",
     f"INSERT INTO academic_policies (policy_key, scope_unit_id, value, effective_from, effective_to, created_by) VALUES ('MIN_ATTENDANCE','{PRG}','{{\"pct\":80}}','2024-01-01','2025-12-31','{USER_APPR}')",
     "POLICY_OVERLAP")
test("M2TC-078", "An institution-wide policy and a program policy for the same period are both allowed (program overrides)", "ok",
     f"INSERT INTO academic_policies (policy_key, scope_unit_id, value, effective_from, effective_to, created_by) VALUES ('MIN_ATTENDANCE',NULL,'{{\"pct\":60}}','2023-01-01','2025-12-31','{USER_APPR}')",
     f"INSERT INTO academic_policies (policy_key, scope_unit_id, value, effective_from, effective_to, created_by) VALUES ('MIN_ATTENDANCE','{PRG}','{{\"pct\":80}}','2024-01-01','2025-12-31','{USER_APPR}')")
test("M2TC-079", "PASS_MARK is refused as a policy key (it belongs to Module 4)", "error", None,
     f"INSERT INTO academic_policies (policy_key, value, effective_from, created_by) VALUES ('PASS_MARK','{{}}','2024-01-01','{USER_APPR}')",
     "academic_policies_policy_key_check")
test("M2TC-080", "A prerequisite cycle across two courses is refused (PREREQ_CYCLE)", "error",
     f"INSERT INTO prerequisite_rules (curriculum_item_id, rule_kind, node_type, course_id) VALUES ('{ITEM1}','PREREQUISITE','COURSE','{CRS2}')",
     f"INSERT INTO prerequisite_rules (curriculum_item_id, rule_kind, node_type, course_id) VALUES ('{ITEM2}','PREREQUISITE','COURSE','{CRS1}')",
     "PREREQ_CYCLE")
test("M2TC-081", "A second root in the same prerequisite tree is refused (one root per tree)", "error",
     f"INSERT INTO prerequisite_rules (curriculum_item_id, rule_kind, node_type, course_id) VALUES ('{ITEM2}','PREREQUISITE','COURSE','{CRS1}')",
     f"INSERT INTO prerequisite_rules (curriculum_item_id, rule_kind, node_type) VALUES ('{ITEM2}','PREREQUISITE','AND')",
     "uq_one_root_per_tree")
test("M2TC-082", "The degree plan code cannot be changed (PLAN_CODE_FIXED)", "error", None,
     f"UPDATE degree_plans SET plan_code='1002' WHERE id='{PLAN}'", "PLAN_CODE_FIXED")
test("M2TC-083", "A curriculum version gets a version code from its plan (1001-v1)", "ok", None,
     f"SELECT 1 FROM curricula WHERE id='{CUR}' AND version_code='1001-v1'")
test("M2TC-084", "A curriculum version without a degree plan is refused (DEGREE_PLAN_REQUIRED)", "error", None,
     f"INSERT INTO curricula (program_id, version_no, cohort_start_year, prepared_by) VALUES ('{PRG}',9,2030,'{USER_PREP}')",
     "DEGREE_PLAN_REQUIRED")
test("M2TC-085", "A degree plan cannot hold a curriculum of another program (PLAN_OTHER_PROGRAM)", "error",
     f"INSERT INTO academic_units (id, parent_id, unit_type, code, name_en, term_pattern) VALUES ('{UNIT_P2}','{DEP}','PROGRAM','PRG-2','Other','SEMESTER')",
     f"INSERT INTO curricula (program_id, degree_plan_id, version_no, cohort_start_year, prepared_by) VALUES ('{UNIT_P2}','{PLAN}',1,2030,'{USER_PREP}')",
     "PLAN_OTHER_PROGRAM")



import threading
def concurrent_room_test(iterations=50):
    """M2TC-086: two sessions book the same room and time at the same moment; exactly one may succeed."""
    failures = []
    for it in range(iterations):
        c0 = conn(); reset(c0); base(c0); c0.close()
        barrier = threading.Barrier(2)
        results = [None, None]
        def worker(idx, sec):
            c = conn()
            try:
                cur = c.cursor()
                barrier.wait()
                cur.execute(f"INSERT INTO section_meetings (section_id, room_id, term_id, day_of_week, start_minute, end_minute) VALUES ('{sec}','{ROOM_A}','{TERM}',4,540,600)")
                results[idx] = "OK"
            except psycopg2.Error as e:
                results[idx] = str(e).strip().splitlines()[0]
            finally:
                c.close()
        t1 = threading.Thread(target=worker, args=(0, SEC_T)); t2 = threading.Thread(target=worker, args=(1, SEC_T2))
        t1.start(); t2.start(); t1.join(); t2.join()
        oks = results.count("OK"); clash = sum(1 for r in results if r and "ROOM_CLASH" in r)
        if not (oks == 1 and clash == 1):
            failures.append((it, results))
    return failures

def main():
    c = conn(); passed = failed = 0; rows = []
    for code, name, expect, fixture, action, error in T:
        reset(c)
        base(c)                                  # every test starts from the same base fixture
        if fixture is not None and fixture is not base:
            if callable(fixture):
                r = fixture(c)
                if isinstance(r, str) and r: print("fixture error", code, r)
            else:
                err = run(c, fixture)
                if err: print("fixture error", code, err)
        err = run(c, action)
        if expect == "ok":
            ok = err is None
            detail = "accepted" if ok else err
        else:
            ok = err is not None and (error in err if error else True)
            detail = err or "accepted (unexpected)"
        status = "PASS" if ok else "FAIL"
        passed += ok; failed += (not ok)
        rows.append((code, status, name, detail))
    c.close()
    fails = concurrent_room_test(50)
    status = 'PASS' if not fails else 'FAIL'
    rows.append(('M2TC-086', status, 'Two simultaneous bookings of one room slot: exactly one succeeds (50 runs)', 'no failures' if not fails else str(fails[:2])))
    passed += (status == 'PASS'); failed += (status == 'FAIL')
    for r in rows: print(f"{r[0]}  {r[1]}  {r[2]}  -> {r[3]}")
    print(f"\nTotal {len(rows)}  passed {passed}  failed {failed}")
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
