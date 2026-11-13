-- Module 2 (Curriculum and Course Catalog) - complete schema, migrations 0001 to 0004
-- PostgreSQL 15 or later. Run once on an EMPTY database.
BEGIN;

-- ===== 0001_init =====
-- Module 2 (Curriculum and Course Catalog) - tables
-- PostgreSQL 15+. Primary keys are UUID (shared with Module 1 and Module 3).
-- Cross-module references (users, students) are UUID columns with NO foreign key.
-- Rules that need triggers are in 0002_rules/migration.sql.

CREATE TABLE academic_units (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id     UUID REFERENCES academic_units (id),
    unit_type     TEXT NOT NULL CHECK (unit_type IN ('FACULTY','DEPARTMENT','PROGRAM','STREAM','TRACK')),
    code          TEXT NOT NULL UNIQUE,
    name_en       TEXT NOT NULL,
    name_bn       TEXT,
    term_pattern  TEXT CHECK (term_pattern IN ('SEMESTER','TRIMESTER','ANNUAL')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT chk_unit_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id),
    CONSTRAINT chk_unit_term_pattern CHECK (
        (unit_type = 'PROGRAM' AND term_pattern IS NOT NULL)
        OR (unit_type <> 'PROGRAM' AND term_pattern IS NULL))
);

CREATE TABLE academic_stages (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id     UUID NOT NULL REFERENCES academic_units (id),
    seq_no         INT NOT NULL CHECK (seq_no > 0),
    name_en        TEXT NOT NULL,
    name_bn        TEXT,
    next_stage_id  UUID REFERENCES academic_stages (id),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_stage_order UNIQUE (program_id, seq_no),
    CONSTRAINT chk_stage_not_self CHECK (next_stage_id IS NULL OR next_stage_id <> id)
);

CREATE TABLE academic_terms (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_type      TEXT NOT NULL CHECK (term_type IN ('SEMESTER','TRIMESTER','ANNUAL')),
    session_label  TEXT NOT NULL,
    name_en        TEXT NOT NULL,
    name_bn        TEXT,
    starts_on      DATE,
    ends_on        DATE,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_term_session UNIQUE (term_type, session_label),
    CONSTRAINT chk_term_dates CHECK (starts_on IS NULL OR ends_on IS NULL OR starts_on < ends_on)
);

CREATE TABLE courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT NOT NULL UNIQUE,
    title_en        TEXT NOT NULL,
    title_bn        TEXT,
    theory_credit   NUMERIC(4,2) NOT NULL CHECK (theory_credit >= 0),
    lab_credit      NUMERIC(4,2) NOT NULL CHECK (lab_credit >= 0),
    written_marks   INT NOT NULL CHECK (written_marks >= 0),
    practical_marks INT NOT NULL CHECK (practical_marks >= 0),
    total_marks     INT NOT NULL CHECK (total_marks > 0),
    status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
    created_at      TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT chk_course_credit_total CHECK (theory_credit + lab_credit > 0),
    CONSTRAINT chk_course_marks_sum CHECK (written_marks + practical_marks = total_marks)
);
CREATE INDEX idx_courses_title ON courses (lower(title_en));

CREATE TABLE curricula (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id         UUID NOT NULL REFERENCES academic_units (id),
    version_no         INT NOT NULL CHECK (version_no > 0),
    cohort_start_year  INT NOT NULL CHECK (cohort_start_year BETWEEN 1900 AND 2200),
    cohort_end_year    INT CHECK (cohort_end_year BETWEEN 1900 AND 2200),
    status             TEXT NOT NULL DEFAULT 'DRAFT'
                       CHECK (status IN ('DRAFT','UNDER_REVIEW','APPROVED','PUBLISHED','ARCHIVED')),
    parent_version_id  UUID REFERENCES curricula (id),
    prepared_by        UUID NOT NULL,
    approved_by        UUID,
    published_at       TIMESTAMPTZ(3),
    created_at         TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT uq_curriculum_version UNIQUE (program_id, version_no),
    CONSTRAINT chk_cohort_range CHECK (cohort_end_year IS NULL OR cohort_end_year >= cohort_start_year),
    CONSTRAINT chk_approver_not_preparer CHECK (approved_by IS NULL OR approved_by <> prepared_by),
    CONSTRAINT chk_approved_has_approver CHECK (
        status NOT IN ('APPROVED','PUBLISHED','ARCHIVED') OR approved_by IS NOT NULL),
    CONSTRAINT chk_published_has_time CHECK (
        status NOT IN ('PUBLISHED','ARCHIVED') OR published_at IS NOT NULL)
);

CREATE TABLE curriculum_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_id       UUID NOT NULL REFERENCES curricula (id),
    parent_item_id      UUID REFERENCES curriculum_items (id),
    item_type           TEXT NOT NULL CHECK (item_type IN ('GROUP','COURSE')),
    group_type          TEXT CHECK (group_type IN ('CORE','ELECTIVE','GENERAL_EDUCATION',
                                                   'CHOOSE_N','CHOOSE_ONE','CONDITIONAL','TRACK')),
    course_id           UUID REFERENCES courses (id),
    stage_id            UUID REFERENCES academic_stages (id),
    copied_theory_credit NUMERIC(4,2),
    copied_lab_credit    NUMERIC(4,2),
    copied_total_marks   INT,
    min_credits         NUMERIC(6,2) CHECK (min_credits IS NULL OR min_credits >= 0),
    min_courses         INT CHECK (min_courses IS NULL OR min_courses >= 0),
    condition_json      JSONB,
    pool_rule           JSONB,
    sort_order          INT NOT NULL DEFAULT 0,
    CONSTRAINT chk_item_shape CHECK (
        (item_type = 'COURSE' AND course_id IS NOT NULL AND group_type IS NULL)
        OR (item_type = 'GROUP' AND course_id IS NULL AND group_type IS NOT NULL)),
    CONSTRAINT chk_condition_only_conditional CHECK (
        condition_json IS NULL OR group_type = 'CONDITIONAL'),
    CONSTRAINT chk_pool_only_group CHECK (pool_rule IS NULL OR item_type = 'GROUP')
);
CREATE UNIQUE INDEX uq_course_once_per_version
    ON curriculum_items (curriculum_id, course_id) WHERE item_type = 'COURSE';

CREATE TABLE prerequisite_rules (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_item_id UUID NOT NULL REFERENCES curriculum_items (id),
    rule_kind          TEXT NOT NULL CHECK (rule_kind IN ('PREREQUISITE','COREQUISITE')),
    node_type          TEXT NOT NULL CHECK (node_type IN ('AND','OR','COURSE')),
    parent_node_id    UUID REFERENCES prerequisite_rules (id),
    course_id          UUID REFERENCES courses (id),
    min_grade          TEXT,
    is_waivable        BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order         INT NOT NULL DEFAULT 0,
    CONSTRAINT chk_rule_node_shape CHECK (
        (node_type = 'COURSE' AND course_id IS NOT NULL)
        OR (node_type IN ('AND','OR') AND course_id IS NULL AND min_grade IS NULL)),
    CONSTRAINT chk_rule_not_self_parent CHECK (parent_node_id IS NULL OR parent_node_id <> id)
);

CREATE TABLE course_relations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id         UUID NOT NULL REFERENCES courses (id),
    related_course_id UUID NOT NULL REFERENCES courses (id),
    relation_type     TEXT NOT NULL CHECK (relation_type IN ('EQUIVALENT','SUBSTITUTE','REPLACEMENT','CROSS_LISTED')),
    scope_unit_id     UUID REFERENCES academic_units (id),
    approved_by       UUID NOT NULL,
    effective_from    DATE NOT NULL,
    effective_to      DATE,
    created_at        TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT chk_relation_not_self CHECK (course_id <> related_course_id),
    CONSTRAINT chk_relation_dates CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE TABLE academic_policies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_key      TEXT NOT NULL CHECK (policy_key IN (
                       'INSTITUTION_TYPE','GRADE_SCALE','PASS_MARK','MIN_ATTENDANCE',
                       'IN_PROGRESS_ALLOWED','INCOMPLETE_GRACE_DAYS','TRANSFER_CREDIT_MAX',
                       'PROGRESSION_RULES')),
    scope_unit_id   UUID REFERENCES academic_units (id),
    value           JSONB NOT NULL,
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    created_by      UUID NOT NULL,
    created_at      TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT chk_policy_dates CHECK (effective_to IS NULL OR effective_to > effective_from),
    CONSTRAINT uq_policy_version UNIQUE NULLS NOT DISTINCT (policy_key, scope_unit_id, effective_from)
);

CREATE TABLE rooms (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code       TEXT NOT NULL UNIQUE,
    building   TEXT,
    campus     TEXT,
    room_type  TEXT NOT NULL CHECK (room_type IN ('LECTURE','LAB','SEMINAR','OTHER')),
    capacity   INT NOT NULL CHECK (capacity > 0),
    is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE course_offerings (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id      UUID NOT NULL REFERENCES courses (id),
    term_id        UUID NOT NULL REFERENCES academic_terms (id),
    curriculum_id  UUID REFERENCES curricula (id),
    status         TEXT NOT NULL DEFAULT 'DRAFT'
                   CHECK (status IN ('DRAFT','OPEN','CLOSED','CANCELLED')),
    created_at     TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT uq_offering_course_term UNIQUE (course_id, term_id)
);

CREATE TABLE course_sections (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offering_id              UUID NOT NULL REFERENCES course_offerings (id),
    section_code             TEXT NOT NULL,
    section_type             TEXT NOT NULL CHECK (section_type IN ('THEORY','LAB')),
    linked_theory_section_id UUID REFERENCES course_sections (id),
    instructor_user_id       UUID,
    capacity                 INT NOT NULL CHECK (capacity >= 0),
    is_active                BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_section_code UNIQUE (offering_id, section_code),
    CONSTRAINT chk_link_only_lab CHECK (section_type = 'LAB' OR linked_theory_section_id IS NULL),
    CONSTRAINT chk_link_not_self CHECK (linked_theory_section_id IS NULL OR linked_theory_section_id <> id)
);

CREATE TABLE section_meetings (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id         UUID NOT NULL REFERENCES course_sections (id),
    room_id            UUID NOT NULL REFERENCES rooms (id),
    term_id            UUID NOT NULL REFERENCES academic_terms (id),
    day_of_week        SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_minute       SMALLINT NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
    end_minute         SMALLINT NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
    CONSTRAINT chk_meeting_order CHECK (start_minute < end_minute)
);
CREATE INDEX idx_meetings_room_day ON section_meetings (room_id, term_id, day_of_week);

CREATE TABLE audit_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id     UUID,
    action       TEXT NOT NULL,
    entity_type  TEXT NOT NULL,
    entity_id    UUID NOT NULL,
    request_id   TEXT NOT NULL,
    details      JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at  TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, occurred_at);
CREATE INDEX idx_audit_actor ON audit_logs (actor_id, occurred_at);

-- ===== 0002_rules =====
-- Module 2 rules that Prisma cannot express: triggers, guards, advisory locks.
-- Every rule raises an exception whose message starts with the stable error code
-- used by the API (for example PUBLISHED_IMMUTABLE, ROOM_CLASH).
-- Depth limit for tree walks: 50 (FR-23, NFR depth limit).

-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION m2_fail(code TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION '%', code USING ERRCODE = 'check_violation';
END $$;

-- ---------- 1. academic units: parent rules and loop guard (FR-02, FR-06) ----------
CREATE OR REPLACE FUNCTION m2_unit_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE cursor_id UUID; steps INT := 0; parent_type TEXT;
BEGIN
    IF NEW.unit_type IN ('STREAM','TRACK') THEN
        IF NEW.parent_id IS NULL THEN PERFORM m2_fail('PARENT_REQUIRED'); END IF;
        SELECT unit_type INTO parent_type FROM academic_units WHERE id = NEW.parent_id;
        IF parent_type IS DISTINCT FROM 'PROGRAM' THEN PERFORM m2_fail('PARENT_MUST_BE_PROGRAM'); END IF;
    END IF;
    cursor_id := NEW.parent_id;
    WHILE cursor_id IS NOT NULL LOOP
        IF cursor_id = NEW.id THEN PERFORM m2_fail('UNIT_LOOP'); END IF;
        steps := steps + 1;
        IF steps > 50 THEN PERFORM m2_fail('UNIT_TREE_TOO_DEEP'); END IF;
        SELECT parent_id INTO cursor_id FROM academic_units WHERE id = cursor_id;
    END LOOP;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_unit_guard BEFORE INSERT OR UPDATE OF parent_id, unit_type ON academic_units
    FOR EACH ROW EXECUTE FUNCTION m2_unit_guard();

-- ---------- 2. stages: same program, loop guard, unique order (FR-03, FR-06) ----------
CREATE OR REPLACE FUNCTION m2_stage_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE cursor_id UUID; steps INT := 0; nxt_program UUID;
BEGIN
    IF NEW.next_stage_id IS NULL THEN RETURN NEW; END IF;
    SELECT program_id INTO nxt_program FROM academic_stages WHERE id = NEW.next_stage_id;
    IF nxt_program IS DISTINCT FROM NEW.program_id THEN PERFORM m2_fail('STAGE_OTHER_PROGRAM'); END IF;
    cursor_id := NEW.next_stage_id;
    WHILE cursor_id IS NOT NULL LOOP
        IF cursor_id = NEW.id THEN PERFORM m2_fail('STAGE_LOOP'); END IF;
        steps := steps + 1;
        IF steps > 50 THEN PERFORM m2_fail('STAGE_CHAIN_TOO_LONG'); END IF;
        SELECT next_stage_id INTO cursor_id FROM academic_stages WHERE id = cursor_id;
    END LOOP;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_stage_guard BEFORE INSERT OR UPDATE OF next_stage_id, program_id ON academic_stages
    FOR EACH ROW EXECUTE FUNCTION m2_stage_guard();

-- ---------- 3. offerings need an ACTIVE course (FR-10) ----------
CREATE OR REPLACE FUNCTION m2_offering_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF (SELECT status FROM courses WHERE id = NEW.course_id) IS DISTINCT FROM 'ACTIVE' THEN
        PERFORM m2_fail('COURSE_INACTIVE');
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_offering_guard BEFORE INSERT OR UPDATE OF course_id ON course_offerings
    FOR EACH ROW EXECUTE FUNCTION m2_offering_guard();

-- ---------- 4. curriculum lifecycle and immutability (FR-13, FR-14, FR-15) ----------
CREATE OR REPLACE FUNCTION m2_curriculum_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE allowed BOOLEAN;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status <> 'DRAFT' THEN PERFORM m2_fail('CURRICULUM_NOT_DELETABLE'); END IF;
        RETURN OLD;
    END IF;
    IF OLD.status IN ('PUBLISHED','ARCHIVED') THEN
        IF OLD.status = 'PUBLISHED' AND NEW.status = 'ARCHIVED'
           AND (to_jsonb(NEW) - 'status' - 'updated_at') = (to_jsonb(OLD) - 'status' - 'updated_at') THEN
            RETURN NEW;
        END IF;
        PERFORM m2_fail('PUBLISHED_IMMUTABLE');
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        allowed := (OLD.status, NEW.status) IN (
            ('DRAFT','UNDER_REVIEW'), ('UNDER_REVIEW','DRAFT'), ('UNDER_REVIEW','APPROVED'),
            ('APPROVED','PUBLISHED'), ('PUBLISHED','ARCHIVED'));
        IF NOT allowed THEN PERFORM m2_fail('INVALID_TRANSITION'); END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_curriculum_guard BEFORE UPDATE OR DELETE ON curricula
    FOR EACH ROW EXECUTE FUNCTION m2_curriculum_guard();

-- ---------- 5. cohort ranges do not overlap within a program (FR-15, US-09) ----------
CREATE OR REPLACE FUNCTION m2_cohort_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'ARCHIVED' THEN RETURN NEW; END IF;
    PERFORM pg_advisory_xact_lock(hashtext('cohort:' || NEW.program_id::text));
    IF EXISTS (
        SELECT 1 FROM curricula c
        WHERE c.program_id = NEW.program_id AND c.id <> NEW.id AND c.status <> 'ARCHIVED'
          AND c.cohort_start_year <= COALESCE(NEW.cohort_end_year, 9999)
          AND NEW.cohort_start_year <= COALESCE(c.cohort_end_year, 9999)
    ) THEN
        PERFORM m2_fail('COHORT_OVERLAP');
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_cohort_guard BEFORE INSERT OR UPDATE OF cohort_start_year, cohort_end_year, status ON curricula
    FOR EACH ROW EXECUTE FUNCTION m2_cohort_guard();

-- ---------- 6. curriculum items: frozen parent, snapshot copy, shape (FR-16, FR-17, FR-18, US-06) ----------
CREATE OR REPLACE FUNCTION m2_item_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE cur_status TEXT; parent_type TEXT; parent_cur UUID; c_theory NUMERIC; c_lab NUMERIC; c_total INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT status INTO cur_status FROM curricula WHERE id = OLD.curriculum_id;
        IF cur_status IN ('PUBLISHED','ARCHIVED') THEN PERFORM m2_fail('CURRICULUM_FROZEN'); END IF;
        RETURN OLD;
    END IF;
    SELECT status INTO cur_status FROM curricula WHERE id = NEW.curriculum_id;
    IF cur_status IN ('PUBLISHED','ARCHIVED') THEN PERFORM m2_fail('CURRICULUM_FROZEN'); END IF;
    IF NEW.parent_item_id IS NOT NULL THEN
        SELECT item_type, curriculum_id INTO parent_type, parent_cur FROM curriculum_items WHERE id = NEW.parent_item_id;
        IF parent_type IS DISTINCT FROM 'GROUP' OR parent_cur <> NEW.curriculum_id THEN
            PERFORM m2_fail('PARENT_MUST_BE_GROUP_IN_SAME_VERSION');
        END IF;
    END IF;
    IF NEW.item_type = 'COURSE' THEN
        SELECT theory_credit, lab_credit, total_marks INTO c_theory, c_lab, c_total FROM courses WHERE id = NEW.course_id;
        NEW.copied_theory_credit := c_theory;
        NEW.copied_lab_credit := c_lab;
        NEW.copied_total_marks := c_total;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_item_guard BEFORE INSERT OR UPDATE OR DELETE ON curriculum_items
    FOR EACH ROW EXECUTE FUNCTION m2_item_guard();

-- ---------- 7. prerequisite rules: course items only, tree shape, self and loop guard (FR-23 to FR-26) ----------
CREATE OR REPLACE FUNCTION m2_rule_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE item_type_v TEXT; item_course UUID; cur_status TEXT; p_item UUID; p_type TEXT;
        cursor_id UUID; steps INT := 0;
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT c.status INTO cur_status FROM curricula c JOIN curriculum_items i ON i.curriculum_id = c.id WHERE i.id = OLD.curriculum_item_id;
        IF cur_status IN ('PUBLISHED','ARCHIVED') THEN PERFORM m2_fail('CURRICULUM_FROZEN'); END IF;
        RETURN OLD;
    END IF;
    SELECT i.item_type, i.course_id, c.status INTO item_type_v, item_course, cur_status
      FROM curriculum_items i JOIN curricula c ON c.id = i.curriculum_id WHERE i.id = NEW.curriculum_item_id;
    IF cur_status IN ('PUBLISHED','ARCHIVED') THEN PERFORM m2_fail('CURRICULUM_FROZEN'); END IF;
    IF item_type_v <> 'COURSE' THEN PERFORM m2_fail('RULE_ON_GROUP'); END IF;
    IF NEW.node_type = 'COURSE' AND NEW.course_id = item_course THEN PERFORM m2_fail('SELF_PREREQUISITE'); END IF;
    IF NEW.parent_node_id IS NOT NULL THEN
        SELECT node_type, curriculum_item_id INTO p_type, p_item FROM prerequisite_rules WHERE id = NEW.parent_node_id;
        IF p_type NOT IN ('AND','OR') OR p_item <> NEW.curriculum_item_id THEN PERFORM m2_fail('RULE_PARENT_INVALID'); END IF;
    END IF;
    cursor_id := NEW.parent_node_id;
    WHILE cursor_id IS NOT NULL LOOP
        IF cursor_id = NEW.id THEN PERFORM m2_fail('RULE_LOOP'); END IF;
        steps := steps + 1;
        IF steps > 50 THEN PERFORM m2_fail('RULE_TREE_TOO_DEEP'); END IF;
        SELECT parent_node_id INTO cursor_id FROM prerequisite_rules WHERE id = cursor_id;
    END LOOP;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_rule_guard BEFORE INSERT OR UPDATE OR DELETE ON prerequisite_rules
    FOR EACH ROW EXECUTE FUNCTION m2_rule_guard();

-- ---------- 8. policies: effective-dated history, never edited or deleted (FR-33 to FR-37) ----------
CREATE OR REPLACE FUNCTION m2_policy_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN PERFORM m2_fail('POLICY_NOT_DELETABLE'); END IF;
    IF (to_jsonb(NEW) - 'effective_to') <> (to_jsonb(OLD) - 'effective_to') THEN
        PERFORM m2_fail('POLICY_IMMUTABLE');
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_policy_guard BEFORE UPDATE OR DELETE ON academic_policies
    FOR EACH ROW EXECUTE FUNCTION m2_policy_guard();

-- ---------- 9. sections: lab link rules and capacity vs rooms (FR-39, FR-40, FR-43, FR-44) ----------
CREATE OR REPLACE FUNCTION m2_section_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE link_offering UUID; link_type TEXT; theory_credit_v NUMERIC; max_room INT;
BEGIN
    IF NEW.section_type = 'LAB' THEN
        IF NEW.linked_theory_section_id IS NULL THEN
            SELECT c.theory_credit INTO theory_credit_v FROM course_offerings o JOIN courses c ON c.id = o.course_id WHERE o.id = NEW.offering_id;
            IF theory_credit_v > 0 THEN PERFORM m2_fail('LAB_NEEDS_THEORY_LINK'); END IF;
        ELSE
            SELECT offering_id, section_type INTO link_offering, link_type FROM course_sections WHERE id = NEW.linked_theory_section_id;
            IF link_offering IS DISTINCT FROM NEW.offering_id THEN PERFORM m2_fail('LAB_LINK_OTHER_OFFERING'); END IF;
            IF link_type <> 'THEORY' THEN PERFORM m2_fail('LINK_MUST_BE_THEORY'); END IF;
        END IF;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.capacity IS DISTINCT FROM OLD.capacity THEN
        SELECT MAX(r.capacity) INTO max_room FROM section_meetings m JOIN rooms r ON r.id = m.room_id WHERE m.section_id = NEW.id;
        IF max_room IS NOT NULL AND NEW.capacity > max_room THEN PERFORM m2_fail('SECTION_EXCEEDS_ROOM'); END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_section_guard BEFORE INSERT OR UPDATE ON course_sections
    FOR EACH ROW EXECUTE FUNCTION m2_section_guard();

-- ---------- 10. meetings: room and teacher clash, term match, capacity (FR-41, FR-42) ----------
CREATE OR REPLACE FUNCTION m2_meeting_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE sec_offering UUID; sec_capacity INT; sec_instructor UUID; off_term UUID; room_cap INT;
BEGIN
    SELECT s.offering_id, s.capacity, s.instructor_user_id INTO sec_offering, sec_capacity, sec_instructor
      FROM course_sections s WHERE s.id = NEW.section_id;
    SELECT o.term_id INTO off_term FROM course_offerings o WHERE o.id = sec_offering;
    IF off_term IS DISTINCT FROM NEW.term_id THEN PERFORM m2_fail('MEETING_TERM_MISMATCH'); END IF;
    SELECT capacity INTO room_cap FROM rooms WHERE id = NEW.room_id;
    IF sec_capacity > room_cap THEN PERFORM m2_fail('SECTION_EXCEEDS_ROOM'); END IF;
    -- fixed lock order: room key first, then instructor key (prevents deadlock)
    PERFORM pg_advisory_xact_lock(hashtext('room:' || NEW.room_id::text || ':' || NEW.term_id::text || ':' || NEW.day_of_week::text));
    IF sec_instructor IS NOT NULL THEN
        PERFORM pg_advisory_xact_lock(hashtext('teacher:' || sec_instructor::text || ':' || NEW.term_id::text || ':' || NEW.day_of_week::text));
    END IF;
    IF EXISTS (
        SELECT 1 FROM section_meetings m
        WHERE m.room_id = NEW.room_id AND m.term_id = NEW.term_id AND m.day_of_week = NEW.day_of_week
          AND m.id <> NEW.id AND m.start_minute < NEW.end_minute AND NEW.start_minute < m.end_minute
    ) THEN PERFORM m2_fail('ROOM_CLASH'); END IF;
    IF sec_instructor IS NOT NULL AND EXISTS (
        SELECT 1 FROM section_meetings m JOIN course_sections s ON s.id = m.section_id
        WHERE s.instructor_user_id = sec_instructor AND m.term_id = NEW.term_id
          AND m.day_of_week = NEW.day_of_week AND m.id <> NEW.id
          AND m.start_minute < NEW.end_minute AND NEW.start_minute < m.end_minute
    ) THEN PERFORM m2_fail('INSTRUCTOR_CLASH'); END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_meeting_guard BEFORE INSERT OR UPDATE ON section_meetings
    FOR EACH ROW EXECUTE FUNCTION m2_meeting_guard();

-- ---------- 11. audit log is append-only (FR-48, NFR auditability) ----------
CREATE OR REPLACE FUNCTION m2_audit_append_only() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    PERFORM m2_fail('AUDIT_APPEND_ONLY');
    RETURN NULL;
END $$;
CREATE TRIGGER trg_audit_append_only BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION m2_audit_append_only();

-- ===== 0003_fixes =====
-- Module 2 fixes found by review (migration 0003). Applies after 0001 and 0002.

-- 1. Section capacity must fit the SMALLEST room it is booked in (was MAX).
-- 2. Changing a section's instructor re-checks teacher clashes for its meetings.
CREATE OR REPLACE FUNCTION m2_section_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE link_offering UUID; link_type TEXT; theory_credit_v NUMERIC; min_room INT;
BEGIN
    IF NEW.section_type = 'LAB' THEN
        IF NEW.linked_theory_section_id IS NULL THEN
            SELECT c.theory_credit INTO theory_credit_v FROM course_offerings o JOIN courses c ON c.id = o.course_id WHERE o.id = NEW.offering_id;
            IF theory_credit_v > 0 THEN PERFORM m2_fail('LAB_NEEDS_THEORY_LINK'); END IF;
        ELSE
            SELECT offering_id, section_type INTO link_offering, link_type FROM course_sections WHERE id = NEW.linked_theory_section_id;
            IF link_offering IS DISTINCT FROM NEW.offering_id THEN PERFORM m2_fail('LAB_LINK_OTHER_OFFERING'); END IF;
            IF link_type <> 'THEORY' THEN PERFORM m2_fail('LINK_MUST_BE_THEORY'); END IF;
        END IF;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.capacity IS DISTINCT FROM OLD.capacity THEN
        SELECT MIN(r.capacity) INTO min_room FROM section_meetings m JOIN rooms r ON r.id = m.room_id WHERE m.section_id = NEW.id;
        IF min_room IS NOT NULL AND NEW.capacity > min_room THEN PERFORM m2_fail('SECTION_EXCEEDS_ROOM'); END IF;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.instructor_user_id IS NOT NULL
       AND NEW.instructor_user_id IS DISTINCT FROM OLD.instructor_user_id THEN
        PERFORM pg_advisory_xact_lock(hashtext('teacher:' || NEW.instructor_user_id::text));
        IF EXISTS (
            SELECT 1
            FROM section_meetings m1
            JOIN section_meetings m2 ON m2.term_id = m1.term_id AND m2.day_of_week = m1.day_of_week AND m2.id <> m1.id
            JOIN course_sections s2 ON s2.id = m2.section_id
            WHERE m1.section_id = NEW.id
              AND s2.id <> NEW.id
              AND s2.instructor_user_id = NEW.instructor_user_id
              AND m1.start_minute < m2.end_minute AND m2.start_minute < m1.end_minute
        ) THEN PERFORM m2_fail('INSTRUCTOR_CLASH'); END IF;
    END IF;
    RETURN NEW;
END $$;

-- 3. Approved course relations cannot be deleted or changed; they can only be ended once.
CREATE OR REPLACE FUNCTION m2_relation_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN PERFORM m2_fail('RELATION_NOT_DELETABLE'); END IF;
    IF (to_jsonb(NEW) - 'effective_to') <> (to_jsonb(OLD) - 'effective_to') THEN
        PERFORM m2_fail('RELATION_IMMUTABLE');
    END IF;
    IF OLD.effective_to IS NOT NULL AND NEW.effective_to IS DISTINCT FROM OLD.effective_to THEN
        PERFORM m2_fail('RELATION_END_FIXED');
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_relation_guard BEFORE UPDATE OR DELETE ON course_relations
    FOR EACH ROW EXECUTE FUNCTION m2_relation_guard();

-- 4. Policies: an end date can be set once, then it is fixed.
CREATE OR REPLACE FUNCTION m2_policy_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN PERFORM m2_fail('POLICY_NOT_DELETABLE'); END IF;
    IF (to_jsonb(NEW) - 'effective_to') <> (to_jsonb(OLD) - 'effective_to') THEN
        PERFORM m2_fail('POLICY_IMMUTABLE');
    END IF;
    IF OLD.effective_to IS NOT NULL AND NEW.effective_to IS DISTINCT FROM OLD.effective_to THEN
        PERFORM m2_fail('POLICY_END_FIXED');
    END IF;
    RETURN NEW;
END $$;

-- 5. Audit log cannot be emptied with TRUNCATE either.
CREATE TRIGGER trg_audit_no_truncate BEFORE TRUNCATE ON audit_logs
    FOR EACH STATEMENT EXECUTE FUNCTION m2_audit_append_only();

-- ===== 0004_fixes_marks_policy_cycle_plan =====
-- Migration 0004 (decisions from review):
--  1. Grading marks are owned by Module 4. Remove marks from courses and curriculum_items.
--  2. Policies: PASS_MARK and GRADE_SCALE are Module 4's. Overlapping periods for the same key and scope are refused.
--  3. Prerequisite graph: no cycles across courses in one curriculum version; one root per prerequisite tree.
--  4. Degree plans: a stable plan_code (for example 1001) with versioned curricula (1001-v1, 1001-v2).

-- ---------- 1. Marks removed (credits stay in Module 2) ----------
ALTER TABLE courses DROP COLUMN written_marks, DROP COLUMN practical_marks, DROP COLUMN total_marks;
ALTER TABLE curriculum_items DROP COLUMN copied_total_marks;

CREATE OR REPLACE FUNCTION m2_item_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE cur_status TEXT; parent_type TEXT; parent_cur UUID; c_theory NUMERIC; c_lab NUMERIC;
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT status INTO cur_status FROM curricula WHERE id = OLD.curriculum_id;
        IF cur_status IN ('PUBLISHED','ARCHIVED') THEN PERFORM m2_fail('CURRICULUM_FROZEN'); END IF;
        RETURN OLD;
    END IF;
    SELECT status INTO cur_status FROM curricula WHERE id = NEW.curriculum_id;
    IF cur_status IN ('PUBLISHED','ARCHIVED') THEN PERFORM m2_fail('CURRICULUM_FROZEN'); END IF;
    IF NEW.parent_item_id IS NOT NULL THEN
        SELECT item_type, curriculum_id INTO parent_type, parent_cur FROM curriculum_items WHERE id = NEW.parent_item_id;
        IF parent_type IS DISTINCT FROM 'GROUP' OR parent_cur <> NEW.curriculum_id THEN
            PERFORM m2_fail('PARENT_MUST_BE_GROUP_IN_SAME_VERSION');
        END IF;
    END IF;
    IF NEW.item_type = 'COURSE' THEN
        SELECT theory_credit, lab_credit INTO c_theory, c_lab FROM courses WHERE id = NEW.course_id;
        NEW.copied_theory_credit := c_theory;
        NEW.copied_lab_credit := c_lab;
    END IF;
    RETURN NEW;
END $$;

-- ---------- 2. Policies: allowed keys and no overlapping periods in the same scope ----------
ALTER TABLE academic_policies DROP CONSTRAINT academic_policies_policy_key_check;
ALTER TABLE academic_policies ADD CONSTRAINT academic_policies_policy_key_check CHECK (policy_key IN (
    'INSTITUTION_TYPE','MIN_ATTENDANCE','IN_PROGRESS_ALLOWED','INCOMPLETE_GRACE_DAYS',
    'TRANSFER_CREDIT_MAX','PROGRESSION_RULES'));

CREATE OR REPLACE FUNCTION m2_policy_overlap() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('policy:' || NEW.policy_key || ':' || COALESCE(NEW.scope_unit_id::text, 'ALL')));
    IF EXISTS (
        SELECT 1 FROM academic_policies p
        WHERE p.policy_key = NEW.policy_key
          AND p.scope_unit_id IS NOT DISTINCT FROM NEW.scope_unit_id
          AND p.id <> NEW.id
          AND daterange(p.effective_from, p.effective_to, '[]')
              && daterange(NEW.effective_from, NEW.effective_to, '[]')
    ) THEN PERFORM m2_fail('POLICY_OVERLAP'); END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_policy_overlap BEFORE INSERT OR UPDATE OF effective_from, effective_to, scope_unit_id, policy_key
    ON academic_policies FOR EACH ROW EXECUTE FUNCTION m2_policy_overlap();

-- ---------- 3. Prerequisites: one root per tree, no cycles between courses ----------
CREATE UNIQUE INDEX uq_one_root_per_tree
    ON prerequisite_rules (curriculum_item_id, rule_kind) WHERE parent_node_id IS NULL;

CREATE OR REPLACE FUNCTION m2_prereq_cycle() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE src_course UUID; cur_id UUID; hit BOOLEAN;
BEGIN
    IF NEW.node_type <> 'COURSE' OR NEW.rule_kind <> 'PREREQUISITE' THEN RETURN NEW; END IF;
    SELECT i.course_id, i.curriculum_id INTO src_course, cur_id FROM curriculum_items i WHERE i.id = NEW.curriculum_item_id;
    PERFORM pg_advisory_xact_lock(hashtext('prereq:' || cur_id::text));
    -- Can NEW.course_id (the required course) reach src_course by following prerequisite edges in this version?
    WITH RECURSIVE edges AS (
        SELECT i.course_id AS from_course, r.course_id AS to_course
        FROM prerequisite_rules r
        JOIN curriculum_items i ON i.id = r.curriculum_item_id
        WHERE i.curriculum_id = cur_id AND r.node_type = 'COURSE' AND r.rule_kind = 'PREREQUISITE'
          AND r.id <> NEW.id
    ),
    walk(course, depth) AS (
        SELECT NEW.course_id, 1
        UNION
        SELECT e.to_course, w.depth + 1 FROM walk w JOIN edges e ON e.from_course = w.course
        WHERE w.depth < 50
    )
    SELECT EXISTS (SELECT 1 FROM walk WHERE course = src_course) INTO hit;
    IF NEW.course_id = src_course THEN PERFORM m2_fail('SELF_PREREQUISITE'); END IF;
    IF hit THEN PERFORM m2_fail('PREREQ_CYCLE'); END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_prereq_cycle BEFORE INSERT OR UPDATE OF course_id, node_type, rule_kind ON prerequisite_rules
    FOR EACH ROW EXECUTE FUNCTION m2_prereq_cycle();

-- ---------- 4. Degree plans and versioned curricula ----------
CREATE TABLE degree_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code   TEXT NOT NULL UNIQUE CHECK (plan_code ~ '^[0-9]{4}$'),
    program_id  UUID NOT NULL REFERENCES academic_units (id),
    name_en     TEXT NOT NULL,
    name_bn     TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);

ALTER TABLE curricula ADD COLUMN degree_plan_id UUID REFERENCES degree_plans (id);
ALTER TABLE curricula ADD COLUMN version_code TEXT UNIQUE;

CREATE OR REPLACE FUNCTION m2_plan_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE plan_prog UUID; plan_code_v TEXT;
BEGIN
    IF NEW.degree_plan_id IS NULL THEN PERFORM m2_fail('DEGREE_PLAN_REQUIRED'); END IF;
    SELECT program_id, plan_code INTO plan_prog, plan_code_v FROM degree_plans WHERE id = NEW.degree_plan_id;
    IF plan_prog IS DISTINCT FROM NEW.program_id THEN PERFORM m2_fail('PLAN_OTHER_PROGRAM'); END IF;
    NEW.version_code := plan_code_v || '-v' || NEW.version_no;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_plan_guard BEFORE INSERT OR UPDATE OF degree_plan_id, version_no, program_id ON curricula
    FOR EACH ROW EXECUTE FUNCTION m2_plan_guard();

CREATE OR REPLACE FUNCTION m2_plan_code_fixed() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.plan_code <> OLD.plan_code THEN PERFORM m2_fail('PLAN_CODE_FIXED'); END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_degree_plan_immutable BEFORE UPDATE OF plan_code ON degree_plans
    FOR EACH ROW EXECUTE FUNCTION m2_plan_code_fixed();

COMMIT;
