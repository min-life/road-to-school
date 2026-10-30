-- READ ONLY. Thay <PARENT_ID> bang ID tai khoan dang nhap mobile.
-- 1. Cac hoc sinh phai xuat hien o Theo doi / bo chon Doi diem.
SELECT l.parent_id, s.id AS student_id, s.code, s.full_name,
       s.status, sc.name AS school_name, l.linked_at
FROM public.parent_student_links l
JOIN public.students s ON s.id = l.student_id
JOIN public.schools sc ON sc.id = s.school_id
WHERE l.parent_id = '<PARENT_ID>' ORDER BY l.linked_at DESC;

-- 2. Phuong an test, phan cong va phe duyet.
SELECT p.id AS plan_id, p.name AS plan_name, p.status AS plan_status,
       p.approved_by_id, p.activated_at, r.id AS route_id, r.direction,
       r.proposed_vehicle_id, r.default_driver_id, r.default_bus_attendant_id,
       count(DISTINCT rs.student_id) AS students, count(DISTINCT t.id) AS trips
FROM public.route_plans p
JOIN public.routes r ON r.route_plan_id = p.id
LEFT JOIN public.route_stops rs ON rs.route_id = r.id
LEFT JOIN public.trips t ON t.route_id = r.id
WHERE p.name LIKE 'UI-TEST-ROUTE-%'
GROUP BY p.id, p.name, p.status, p.approved_by_id, p.activated_at,
         r.id, r.direction, r.proposed_vehicle_id, r.default_driver_id, r.default_bus_attendant_id
ORDER BY p.created_at DESC, r.direction;

-- 3. Dieu kien loc chuyen cho Home cards theo trips.service.ts.
-- Chi gan tuyen/link ma chua sinh Trip + TripAttendance thi ket qua nay rong la DUNG.
SELECT s.id AS student_id, s.full_name, t.id AS trip_id, t.service_date, t.status,
       t.direction, t.scheduled_start_time, t.scheduled_end_time,
       a.status AS attendance_status, r.name AS route_name
FROM public.parent_student_links l
JOIN public.students s ON s.id = l.student_id
JOIN public.trip_attendances a ON a.student_id = s.id AND a.excluded_at IS NULL
JOIN public.trips t ON t.id = a.trip_id
JOIN public.routes r ON r.id = t.route_id
WHERE l.parent_id = '<PARENT_ID>'
  AND t.status IN ('SCHEDULED', 'IN_PROGRESS')
  AND (t.scheduled_end_at IS NULL OR t.scheduled_end_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))
ORDER BY s.full_name, t.scheduled_start_at;
