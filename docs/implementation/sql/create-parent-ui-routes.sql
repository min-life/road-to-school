-- ROADTOSCHOOL V2 / POSTGRESQL 18 / LOCAL ONLY
-- Agent chi soan file, KHONG chay SQL nay.
-- Chay parent-ui-preflight.sql truoc, sua KHOI CAU HINH, sau do chay TOAN BO file.
-- Tao moi 1 RoutePlan DRAFT + 2 Route + RouteStop + ParentStudentLink.
-- KHONG tao/sua User, School, Student, Vehicle; KHONG sua/xoa du lieu cu.
-- KHONG gia mao phe duyet, tao Trip, GPS, diem danh, OTP hoac notification.
-- Polyline noi thang cac diem va ETA uoc luong CHI DE TEST UI, khong phai VRP/VietMap.
-- Neu loi, transaction bi huy; Query Tool bao aborted thi chay ROLLBACK; truoc khi thu lai.

BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL TIME ZONE 'UTC';
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $rts_ui$
DECLARE
  -- ========== KHOI CAU HINH: SUA CAC GIA TRI NAY ==========
  v_expected_database text := '<TEN_DATABASE_LOCAL>';
  v_parent_id text := '<PARENT_ID>';
  v_creator_id text := '<SYSTEM_ADMIN_ID>';
  v_school_id text := '<SCHOOL_ID>';
  v_vehicle_id text := '<VEHICLE_ID>';
  -- ID theo THU TU DON; chieu tra dung thu tu nguoc lai. Them/bot tuy nhu cau.
  v_student_ids text[] := ARRAY['<STUDENT_ID_1>', '<STUDENT_ID_2>'];
  v_tag text := 'parent-ui-01'; -- Giu nguyen tag de ngan chay lap tao trung.
  v_minutes integer := 45;     -- Thoi luong uoc luong moi chieu, chi test UI.
  v_sample_date date := NULL;  -- NULL: tu chon ngay hoc gan nhat tu ngay mai.
  -- ========== HET KHOI CAU HINH ==========

  v_school public.schools%ROWTYPE;
  v_parking jsonb;
  v_day jsonb;
  v_day_keys text[] := ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_capacity integer;
  v_n integer;
  v_distinct_n integer;
  v_plan_id text := gen_random_uuid()::text;
  v_plan_name text;
  v_route_id text;
  v_direction text;
  v_outbound boolean;
  v_start integer;
  v_end integer;
  v_school_start integer;
  v_school_end integer;
  v_duration integer;
  v_constraints jsonb;
  v_stops jsonb;
  v_point jsonb;
  v_geometry text;
  v_distance double precision;
  v_has_prev boolean;
  v_lat bigint;
  v_lng bigint;
  v_prev_lat bigint;
  v_prev_lng bigint;
  v_delta bigint;
  v_encoded bigint;
  v_order integer;
  v_eta integer;
  v_new_links integer;
BEGIN
  IF current_database() <> v_expected_database THEN
    RAISE EXCEPTION 'Database hien tai (%) khac cau hinh (%). Kiem tra database local.',
      current_database(), v_expected_database;
  END IF;
  IF v_tag !~ '^[a-z0-9][a-z0-9_-]{0,39}$' THEN
    RAISE EXCEPTION 'Tag chi dung a-z, 0-9, _ va -, toi da 40 ky tu.';
  END IF;
  v_plan_name := 'UI-TEST-ROUTE-' || v_tag;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_plan_name, 0));
  IF EXISTS (SELECT 1 FROM public.route_plans WHERE name = v_plan_name) THEN
    RAISE EXCEPTION 'Phuong an % da ton tai. Dung lai ban ghi cu; script khong ghi de.', v_plan_name;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_parent_id
                 AND role = 'PARENT' AND is_active AND is_verified) THEN
    RAISE EXCEPTION 'parent_id phai la PARENT dang hoat dong/da xac minh.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_creator_id
                 AND role = 'SYSTEM_ADMIN' AND is_active AND is_verified) THEN
    RAISE EXCEPTION 'creator_id phai la SYSTEM_ADMIN dang hoat dong/da xac minh.';
  END IF;
  SELECT * INTO v_school FROM public.schools WHERE id = v_school_id FOR SHARE;
  IF NOT FOUND OR NOT v_school.is_active THEN
    RAISE EXCEPTION 'Truong khong ton tai hoac khong hoat dong.';
  END IF;
  IF v_school.latitude IS NULL OR v_school.longitude IS NULL
     OR v_school.latitude NOT BETWEEN -90 AND 90 OR v_school.longitude NOT BETWEEN -180 AND 180
     OR coalesce(btrim(v_school.address_text), '') = '' THEN
    RAISE EXCEPTION 'Truong phai co dia chi va toa do hop le.';
  END IF;
  v_n := cardinality(v_student_ids);
  SELECT count(DISTINCT sid)::integer INTO v_distinct_n FROM unnest(v_student_ids) AS ids(sid);
  IF coalesce(v_n, 0) = 0 OR v_n <> v_distinct_n OR array_position(v_student_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Danh sach hoc sinh khong duoc rong, NULL hoac trung ID.';
  END IF;
  PERFORM s.id FROM public.students s WHERE s.id = ANY(v_student_ids) FOR UPDATE;
  IF (SELECT count(*) FROM public.students s
      WHERE s.id = ANY(v_student_ids) AND s.school_id = v_school_id AND s.status = 'AVAILABLE'
        AND coalesce(btrim(s.address_text), '') <> ''
        AND s.latitude BETWEEN -90 AND 90 AND s.longitude BETWEEN -180 AND 180) <> v_n THEN
    RAISE EXCEPTION 'Hoc sinh phai ton tai, AVAILABLE, cung truong va co dia chi/toa do hop le.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.route_stops rs
             JOIN public.routes r ON r.id = rs.route_id
             JOIN public.route_plans p ON p.id = r.route_plan_id
             WHERE rs.student_id = ANY(v_student_ids) AND p.status IN ('DRAFT', 'ACTIVE')) THEN
    RAISE EXCEPTION 'Co hoc sinh da duoc gan vao phuong an DRAFT/ACTIVE. Khong tu go phan cong cu.';
  END IF;
  SELECT seat_count INTO v_capacity FROM public.vehicles WHERE id = v_vehicle_id FOR UPDATE;
  IF NOT FOUND OR v_capacity < v_n THEN
    RAISE EXCEPTION 'Xe khong ton tai hoac khong du cho cho % hoc sinh.', v_n;
  END IF;
  IF EXISTS (SELECT 1 FROM public.routes r
             JOIN public.route_plans p ON p.id = r.route_plan_id
             JOIN public.schools sc ON sc.id = p.school_id
             WHERE r.proposed_vehicle_id = v_vehicle_id AND p.status IN ('DRAFT', 'ACTIVE')
               AND sc.contract_start_date <= v_school.contract_end_date
               AND v_school.contract_start_date <= sc.contract_end_date) THEN
    RAISE EXCEPTION 'Xe da duoc giu cho boi phuong an DRAFT/ACTIVE co hop dong chong lan.';
  END IF;
  SELECT value INTO v_parking FROM public.system_settings WHERE key = 'PARKING_LOT';
  IF v_parking IS NULL OR coalesce(v_parking->>'addressText', v_parking->>'address', '') = ''
     OR (v_parking->>'latitude') IS NULL OR (v_parking->>'longitude') IS NULL
     OR NOT ((v_parking->>'latitude')::double precision BETWEEN -90 AND 90)
     OR NOT ((v_parking->>'longitude')::double precision BETWEEN -180 AND 180)
     OR (v_parking->>'latitude')::double precision = 0
     OR (v_parking->>'longitude')::double precision = 0 THEN
    RAISE EXCEPTION 'Can cau hinh PARKING_LOT hop le; script khong tu dung toa do gia/fallback.';
  END IF;
  IF v_sample_date IS NULL THEN
    SELECT d::date INTO v_sample_date
    FROM generate_series(greatest(v_today + 1, v_school.contract_start_date)::timestamp,
                         least(v_school.contract_end_date,
                               greatest(v_today + 1, v_school.contract_start_date) + 14)::timestamp,
                         interval '1 day') AS dates(d)
    WHERE coalesce(v_school.weekly_schedule -> (v_day_keys[extract(isodow FROM d)::integer]) ->> 'start', '') <> ''
      AND coalesce(v_school.weekly_schedule -> (v_day_keys[extract(isodow FROM d)::integer]) ->> 'end', '') <> ''
    ORDER BY d LIMIT 1;
  END IF;
  IF v_sample_date IS NULL OR v_sample_date <= v_today
     OR v_sample_date NOT BETWEEN v_school.contract_start_date AND v_school.contract_end_date THEN
    RAISE EXCEPTION 'Can ngay hoc tu ngay mai, nam trong hop dong. Kiem tra weekly_schedule/sample_date.';
  END IF;
  v_day := v_school.weekly_schedule -> (v_day_keys[extract(isodow FROM v_sample_date)::integer]);
  IF coalesce(v_day->>'start', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
     OR coalesce(v_day->>'end', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
    RAISE EXCEPTION 'Ngay chon khong co lich hoc start/end hop le HH:mm.';
  END IF;
  v_school_start := extract(epoch FROM (v_day->>'start')::time)::integer;
  v_school_end := extract(epoch FROM (v_day->>'end')::time)::integer;
  v_duration := v_minutes * 60;
  IF v_minutes NOT BETWEEN 10 AND 180 OR v_school_end <= v_school_start
     OR v_school_start < v_duration OR v_school_end + v_duration >= 86400
     OR v_duration < v_n * 60 THEN
    RAISE EXCEPTION 'Thoi luong/lich hoc khong hop le, vuot ngay hoac khong du thoi gian dung.';
  END IF;
  v_constraints := jsonb_build_object('maxRouteDurationMinutes', v_minutes,
    'defaultStopServiceSeconds', 60, 'stopServiceOverrides', '[]'::jsonb,
    'latestSchoolArrival', v_day->>'start', 'returnDepartureTime', v_day->>'end');

  INSERT INTO public.route_plans
    (id, school_id, name, status, schedule_scope, routing_constraints,
     total_students, total_outbound_routes, total_return_routes, created_by_id, created_at, updated_at)
  VALUES (v_plan_id, v_school_id, v_plan_name, 'DRAFT',
    jsonb_build_object('createdAt', CURRENT_TIMESTAMP, 'constraints', v_constraints,
      'summary', jsonb_build_object('assignedBothWaysCount', v_n, 'totalSelectedStudents', v_n,
        'unassignedCount', 0, 'coverageRate', 1, 'unassignedStudents', '[]'::jsonb,
        'excludedByAdminCount', 0, 'outboundVehiclesUsed', 1, 'returnVehiclesUsed', 1)),
    v_constraints, v_n, 1, 1, v_creator_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

  FOREACH v_direction IN ARRAY ARRAY['TO_SCHOOL', 'TO_PARKING'] LOOP
    v_outbound := v_direction = 'TO_SCHOOL';
    v_route_id := gen_random_uuid()::text;
    v_start := CASE WHEN v_outbound THEN v_school_start - v_duration ELSE v_school_end END;
    v_end := v_start + v_duration;
    SELECT jsonb_agg(point ORDER BY idx) INTO v_stops FROM (
      SELECT 0 AS idx, jsonb_build_object('studentId', NULL,
        'stopType', CASE WHEN v_outbound THEN 'PARKING_START' ELSE 'SCHOOL_DEPARTURE' END,
        'addressText', CASE WHEN v_outbound THEN coalesce(v_parking->>'addressText', v_parking->>'address') ELSE v_school.address_text END,
        'latitude', CASE WHEN v_outbound THEN (v_parking->>'latitude')::double precision ELSE v_school.latitude END,
        'longitude', CASE WHEN v_outbound THEN (v_parking->>'longitude')::double precision ELSE v_school.longitude END) AS point
      UNION ALL
      SELECT CASE WHEN v_outbound THEN supplied.ord::integer ELSE v_n + 1 - supplied.ord::integer END,
        jsonb_build_object('studentId', s.id, 'stopType', CASE WHEN v_outbound THEN 'PICKUP' ELSE 'DROPOFF' END,
          'addressText', s.address_text, 'latitude', s.latitude, 'longitude', s.longitude)
      FROM unnest(v_student_ids) WITH ORDINALITY AS supplied(id, ord)
      JOIN public.students s ON s.id = supplied.id
      UNION ALL
      SELECT v_n + 1, jsonb_build_object('studentId', NULL,
        'stopType', CASE WHEN v_outbound THEN 'SCHOOL_ARRIVAL' ELSE 'PARKING_END' END,
        'addressText', CASE WHEN v_outbound THEN v_school.address_text ELSE coalesce(v_parking->>'addressText', v_parking->>'address') END,
        'latitude', CASE WHEN v_outbound THEN v_school.latitude ELSE (v_parking->>'latitude')::double precision END,
        'longitude', CASE WHEN v_outbound THEN v_school.longitude ELSE (v_parking->>'longitude')::double precision END)
    ) AS points;

    -- Google/VietMap encoded polyline precision5, thu tu [latitude, longitude].
    v_geometry := ''; v_distance := 0; v_has_prev := false;
    v_prev_lat := 0; v_prev_lng := 0;
    FOR v_point IN SELECT value FROM jsonb_array_elements(v_stops) LOOP
      v_lat := round((v_point->>'latitude')::numeric * 100000)::bigint;
      v_lng := round((v_point->>'longitude')::numeric * 100000)::bigint;
      IF v_has_prev THEN
        v_distance := v_distance + 12742000 * asin(sqrt(least(1.0, greatest(0.0,
          power(sin(radians((v_lat - v_prev_lat) / 100000.0) / 2), 2) +
          cos(radians(v_prev_lat / 100000.0)) * cos(radians(v_lat / 100000.0)) *
          power(sin(radians((v_lng - v_prev_lng) / 100000.0) / 2), 2)))));
      END IF;
      FOREACH v_delta IN ARRAY ARRAY[v_lat - v_prev_lat, v_lng - v_prev_lng] LOOP
        v_encoded := CASE WHEN v_delta < 0 THEN ~(v_delta << 1) ELSE v_delta << 1 END;
        WHILE v_encoded >= 32 LOOP
          v_geometry := v_geometry || chr((((v_encoded & 31) | 32) + 63)::integer);
          v_encoded := v_encoded >> 5;
        END LOOP;
        v_geometry := v_geometry || chr((v_encoded + 63)::integer);
      END LOOP;
      v_prev_lat := v_lat; v_prev_lng := v_lng; v_has_prev := true;
    END LOOP;

    INSERT INTO public.routes
      (id, route_plan_id, school_id, name, direction, proposed_vehicle_id,
       total_distance_meters, estimated_duration_seconds, departure_time, arrival_time,
       polyline_geometry, routing_constraints, created_at, updated_at)
    VALUES (v_route_id, v_plan_id, v_school_id,
      v_plan_name || CASE WHEN v_outbound THEN ' - Don' ELSE ' - Tra' END,
      v_direction::public."RouteDirection", v_vehicle_id, round(v_distance)::integer, v_duration,
      to_char(make_interval(secs => v_start), 'HH24:MI'), to_char(make_interval(secs => v_end), 'HH24:MI'),
      v_geometry, v_constraints, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    v_order := 0;
    FOR v_point IN SELECT value FROM jsonb_array_elements(v_stops) LOOP
      v_eta := v_start + (v_duration * v_order / (v_n + 1));
      INSERT INTO public.route_stops
        (id, route_id, stop_order, stop_type, student_id, address_text, latitude, longitude,
         planned_arrival_seconds, planned_arrival_time, created_at)
      VALUES (gen_random_uuid()::text, v_route_id, v_order,
        (v_point->>'stopType')::public."RouteStopType", v_point->>'studentId',
        v_point->>'addressText', (v_point->>'latitude')::double precision,
        (v_point->>'longitude')::double precision, v_eta,
        to_char(make_interval(secs => v_eta), 'HH24:MI'), CURRENT_TIMESTAMP);
      v_order := v_order + 1;
    END LOOP;
  END LOOP;

  INSERT INTO public.parent_student_links (id, parent_id, student_id, linked_at)
  SELECT gen_random_uuid()::text, v_parent_id, sid, CURRENT_TIMESTAMP
  FROM unnest(v_student_ids) AS selected(sid)
  ON CONFLICT (parent_id, student_id) DO NOTHING;
  GET DIAGNOSTICS v_new_links = ROW_COUNT;

  RAISE NOTICE 'Plan: % / %. Routes: 2; students: %; stops: %; new parent links: %.',
    v_plan_id, v_plan_name, v_n, 2 * (v_n + 2), v_new_links;
  RAISE NOTICE 'DRAFT, KHONG co Trip. Ngay hoc tham khao: %. Can gan nhan su, SCHOOL_ADMIN duyet, roi sinh chuyen.', v_sample_date;
END;
$rts_ui$;

COMMIT;

-- Kiem tra sau khi COMMIT. Chi doc, khong thay du lieu.
SELECT p.id AS route_plan_id, p.name, p.status,
       count(DISTINCT r.id) AS routes, count(DISTINCT rs.id) AS stops,
       count(DISTINCT rs.student_id) AS students,
       array_remove(array_agg(DISTINCT l.parent_id), NULL) AS linked_parent_ids
FROM public.route_plans p
LEFT JOIN public.routes r ON r.route_plan_id = p.id
LEFT JOIN public.route_stops rs ON rs.route_id = r.id
LEFT JOIN public.parent_student_links l ON l.student_id = rs.student_id
WHERE p.name LIKE 'UI-TEST-ROUTE-%'
GROUP BY p.id, p.name, p.status, p.created_at ORDER BY p.created_at DESC;
