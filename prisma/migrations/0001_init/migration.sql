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
