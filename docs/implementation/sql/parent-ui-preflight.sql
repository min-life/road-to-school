-- READ ONLY. Chay trong Query Tool cua DATABASE LOCAL dung cho RoadToSchool v2.
-- Khong chon nham database mac dinh "postgres".
SELECT current_database() AS database_name, current_user AS database_role,
       (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS vietnam_today;

-- 1. Chon parent_id va creator_id (SYSTEM_ADMIN). Khong lay password/session/token.
SELECT id, full_name, role, email, phone, school_id, is_active, is_verified
FROM public.users
WHERE role IN ('PARENT', 'SYSTEM_ADMIN', 'SCHOOL_ADMIN', 'DRIVER', 'BUS_ATTENDANT')
ORDER BY role, full_name;

-- 2. Chon school_id; hop dong con han va weekly_schedule co start/end.
SELECT id, name, is_active, contract_start_date, contract_end_date,
       latitude, longitude, weekly_schedule
FROM public.schools ORDER BY name;

-- 3. Chon vehicle_id. Danh sach giu cho de tham khao;
-- script tao tuyen se kiem tra lai theo thoi han hop dong truong da chon.
SELECT v.id, v.license_plate, v.seat_count,
       array_remove(array_agg(DISTINCT p.name), NULL) AS draft_or_active_reservations
FROM public.vehicles v
LEFT JOIN public.routes r ON r.proposed_vehicle_id = v.id
LEFT JOIN public.route_plans p ON p.id = r.route_plan_id AND p.status IN ('DRAFT', 'ACTIVE')
GROUP BY v.id, v.license_plate, v.seat_count ORDER BY v.license_plate;

-- 4. Chon cac student_id CUNG TRUONG, AVAILABLE, co dia chi/toa do,
-- chua nam trong bat ky phuong an DRAFT/ACTIVE nao.
SELECT s.id, s.code, s.full_name, s.school_id, sc.name AS school_name,
       s.status, s.address_text, s.latitude, s.longitude,
       ARRAY(SELECT DISTINCT p.name
             FROM public.route_stops rs
             JOIN public.routes r ON r.id = rs.route_id
             JOIN public.route_plans p ON p.id = r.route_plan_id
             WHERE rs.student_id = s.id AND p.status IN ('DRAFT', 'ACTIVE')) AS reserved_by,
       ARRAY(SELECT l.parent_id FROM public.parent_student_links l
             WHERE l.student_id = s.id) AS linked_parent_ids
FROM public.students s JOIN public.schools sc ON sc.id = s.school_id
ORDER BY sc.name, s.full_name;

-- 5. Key that su duoc source hien tai su dung la PARKING_LOT.
-- Khong tu dung toa do fallback neu chua co cau hinh nay.
SELECT key, value FROM public.system_settings WHERE key IN ('PARKING_LOT', 'parking_lot');
