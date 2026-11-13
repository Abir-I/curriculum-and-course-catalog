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
