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
