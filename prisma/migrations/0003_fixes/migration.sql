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
