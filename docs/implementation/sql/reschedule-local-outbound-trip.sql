-- LOCAL ONLY: RoadToSchool database roadtoschool.
-- Open this file in pgAdmin Query Tool for the local backend database.
-- Run the whole file once. This file DOES update the existing local trip.
-- Default: departure 5 minutes after execution, original duration preserved.
-- Does not start the trip, mark attendance, modify shared routes, or change direction.
-- Home still prioritizes an eligible IN_PROGRESS return trip over this SCHEDULED trip.
-- Not executed by the agent. Never run on an operational/production database.

DO $local_schedule$
DECLARE
  v_trip_id text := 'a3e8934d-aceb-40b8-b968-f25d02334491';
  v_new_start_vn timestamp := date_trunc('minute', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '5 minutes';
  v_trip public.trips%ROWTYPE;
  v_old_start_vn timestamp;
  v_new_end_vn timestamp;
  v_duration interval;
  v_shift_seconds integer;
  v_stop jsonb;
  v_stops jsonb := '[]'::jsonb;
  v_seconds integer;
  v_shifted_seconds integer;
  v_snapshot jsonb;
BEGIN
  IF current_database() <> 'roadtoschool' THEN
    RAISE EXCEPTION 'Sai database. Can database local roadtoschool.';
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = v_trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay chuyen %.', v_trip_id;
  END IF;
  IF v_trip.direction <> 'TO_SCHOOL' OR v_trip.status <> 'SCHEDULED'
     OR v_trip.actual_start_time IS NOT NULL OR v_trip.actual_end_time IS NOT NULL
     OR v_trip.arrived_at_school_at IS NOT NULL THEN
    RAISE EXCEPTION 'Chi doi lich chuyen chieu di SCHEDULED chua khoi hanh.';
  END IF;
  IF v_trip.service_date <> v_new_start_vn::date THEN
    RAISE EXCEPTION 'Ngay chuyen (%) khac ngay bat dau moi (%). Khong tu doi service_date.', v_trip.service_date, v_new_start_vn::date;
  END IF;
  IF v_trip.scheduled_start_at IS NULL OR v_trip.scheduled_end_at IS NULL
     OR v_trip.scheduled_end_at <= v_trip.scheduled_start_at THEN
    RAISE EXCEPTION 'Thieu hoac sai khoang thoi gian cu.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.trip_attendances
    WHERE trip_id = v_trip_id AND (marked_at IS NOT NULL OR alighted_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Chuyen da co moc diem danh/xuong xe. Khong doi lich bang script nay.';
  END IF;

  v_snapshot := v_trip.route_snapshot;
  IF v_snapshot IS NULL OR jsonb_typeof(v_snapshot) IS DISTINCT FROM 'object'
     OR v_snapshot->>'version' IS DISTINCT FROM '1'
     OR v_snapshot->>'routeId' IS DISTINCT FROM v_trip.route_id
     OR v_snapshot->>'direction' IS DISTINCT FROM 'TO_SCHOOL'
     OR COALESCE(v_snapshot->>'routeName', '') NOT LIKE 'UI-TEST-%' THEN
    RAISE EXCEPTION 'Snapshot khong phai chuyen UI-TEST chieu di hop le.';
  END IF;
  IF jsonb_typeof(v_snapshot->'stops') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Snapshot thieu mang stops.';
  END IF;
  IF jsonb_array_length(v_snapshot->'stops') = 0 THEN
    RAISE EXCEPTION 'Snapshot khong co diem dung.';
  END IF;

  v_old_start_vn := (v_trip.scheduled_start_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ho_Chi_Minh';
  v_duration := v_trip.scheduled_end_at - v_trip.scheduled_start_at;
  v_new_end_vn := v_new_start_vn + v_duration;
  IF v_old_start_vn::date <> v_trip.service_date OR v_new_end_vn::date <> v_trip.service_date THEN
    RAISE EXCEPTION 'Lich vuot ngay. Script nay chi ho tro chuyen trong cung ngay.';
  END IF;
  IF v_new_end_vn <= CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh' THEN
    RAISE EXCEPTION 'Gio ket thuc moi da qua.';
  END IF;
  v_shift_seconds := extract(epoch FROM (v_new_start_vn - v_old_start_vn))::integer;

  FOR v_stop IN
    SELECT value FROM jsonb_array_elements(v_snapshot->'stops') WITH ORDINALITY AS s(value, ord) ORDER BY ord
  LOOP
    IF jsonb_typeof(v_stop) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Diem dung trong snapshot khong hop le.';
    END IF;
    v_seconds := NULL;
    IF v_stop->>'plannedArrivalSeconds' IS NOT NULL THEN
      v_seconds := (v_stop->>'plannedArrivalSeconds')::integer;
    ELSIF v_stop->>'plannedArrivalTime' IS NOT NULL THEN
      v_seconds := extract(epoch FROM (v_stop->>'plannedArrivalTime')::time)::integer;
    END IF;
    IF v_seconds IS NOT NULL THEN
      v_shifted_seconds := v_seconds + v_shift_seconds;
      IF v_seconds < 0 OR v_seconds >= 86400 OR v_shifted_seconds < 0 OR v_shifted_seconds >= 86400 THEN
        RAISE EXCEPTION 'Gio diem dung vuot ngay. Khong cap nhat.';
      END IF;
      IF v_trip.service_date + make_interval(secs => v_shifted_seconds) < v_new_start_vn
         OR v_trip.service_date + make_interval(secs => v_shifted_seconds) > v_new_end_vn THEN
        RAISE EXCEPTION 'Gio diem dung nam ngoai khoang chuyen.';
      END IF;
      v_stop := v_stop || jsonb_build_object(
        'plannedArrivalSeconds', v_shifted_seconds,
        'plannedArrivalTime', to_char(v_trip.service_date + make_interval(secs => v_shifted_seconds), 'HH24:MI')
      );
    END IF;
    v_stops := v_stops || jsonb_build_array(v_stop);
  END LOOP;

  UPDATE public.trips
  SET scheduled_start_at = (v_new_start_vn AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'UTC',
      scheduled_end_at = (v_new_end_vn AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'UTC',
      scheduled_start_time = to_char(v_new_start_vn, 'HH24:MI'),
      scheduled_end_time = to_char(v_new_end_vn, 'HH24:MI'),
      route_snapshot = v_snapshot || jsonb_build_object(
        'departureTime', to_char(v_new_start_vn, 'HH24:MI'),
        'arrivalTime', to_char(v_new_end_vn, 'HH24:MI'),
        'stops', v_stops,
        'capturedAt', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'snapshotReason', 'MANUAL'
      ),
      updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
  WHERE id = v_trip_id;

  RAISE NOTICE 'Da doi lich chuyen %: % -> % (gio Viet Nam), giu nguyen status %.',
    v_trip_id, v_new_start_vn, v_new_end_vn, v_trip.status;
END;
$local_schedule$;

-- Result: Vietnam wall-clock values for the updated trip and each stop.
SELECT id, service_date, direction, status, scheduled_start_time, scheduled_end_time,
       scheduled_start_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh' AS khoi_hanh_vn,
       scheduled_end_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh' AS ket_thuc_vn
FROM public.trips WHERE id = 'a3e8934d-aceb-40b8-b968-f25d02334491';

SELECT s.value->>'stopOrder' AS thu_tu, s.value->>'stopType' AS loai_diem,
       s.value->>'plannedArrivalTime' AS gio_du_kien
FROM public.trips t
CROSS JOIN LATERAL jsonb_array_elements(t.route_snapshot->'stops') WITH ORDINALITY AS s(value, ord)
WHERE t.id = 'a3e8934d-aceb-40b8-b968-f25d02334491'
ORDER BY s.ord;
