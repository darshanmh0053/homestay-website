


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."create_booking_hold"("p_enquiry_id" "uuid", "p_room_id" "uuid", "p_check_in" "date", "p_check_out" "date", "p_guests" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_enquiry public.booking_enquiries%ROWTYPE;
  v_room public.homestay_rooms%ROWTYPE;
  v_hold_minutes integer;
  v_hold_id uuid;
  v_active_holds bigint;
  v_unheld_confirmed bigint;
BEGIN
  IF p_check_in IS NULL
     OR p_check_out IS NULL
     OR p_check_out <= p_check_in
     OR p_guests IS NULL
     OR p_guests < 1
     OR p_guests > 100
  THEN
    RAISE EXCEPTION 'Invalid booking dates or guest count'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize reservations for this room type.
  PERFORM pg_advisory_xact_lock(
    hashtext('homestay-room'),
    hashtext(p_room_id::text)
  );

  SELECT *
  INTO v_enquiry
  FROM public.booking_enquiries
  WHERE id = p_enquiry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking enquiry not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_enquiry.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Only pending enquiries can create holds'
      USING ERRCODE = '22023';
  END IF;

  IF v_enquiry.check_in <> p_check_in
     OR v_enquiry.check_out <> p_check_out
  THEN
    RAISE EXCEPTION 'Hold dates do not match the enquiry'
      USING ERRCODE = '22023';
  END IF;

  IF v_enquiry.guests::text <> p_guests::text THEN
    RAISE EXCEPTION 'Guest count does not match the enquiry'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_room
  FROM public.homestay_rooms
  WHERE id = p_room_id
  FOR SHARE;

  IF NOT FOUND
     OR NOT v_room.is_active
     OR v_room.stay_slug <> v_enquiry.stay_slug
  THEN
    RAISE EXCEPTION 'Room is not available for this homestay'
      USING ERRCODE = '22023';
  END IF;

  IF p_guests > v_room.max_guests THEN
    RAISE EXCEPTION 'Guest count exceeds room capacity'
      USING ERRCODE = '22023';
  END IF;

  SELECT default_hold_minutes
  INTO v_hold_minutes
  FROM public.homestay_settings
  WHERE stay_slug = v_room.stay_slug
    AND is_active = true;

  IF NOT FOUND OR v_hold_minutes IS NULL OR v_hold_minutes < 1 THEN
    RAISE EXCEPTION 'Homestay is inactive or hold duration is invalid'
      USING ERRCODE = '22023';
  END IF;

  -- An unassigned confirmed booking blocks the homestay,
  -- because its room allocation is not yet known.
  IF EXISTS (
    SELECT 1
    FROM public.booking_enquiries e
    WHERE e.stay_slug = v_room.stay_slug
      AND e.status = 'confirmed'
      AND e.id <> p_enquiry_id
      AND e.check_in < p_check_out
      AND p_check_in < e.check_out
      AND e.room_id IS NULL
  ) THEN
    RAISE EXCEPTION 'An unassigned confirmed booking overlaps these dates'
      USING ERRCODE = '23P01';
  END IF;

  -- Reuse this enquiry's existing valid hold, if any.
  SELECT h.id
  INTO v_hold_id
  FROM public.booking_holds h
  WHERE h.enquiry_uuid = p_enquiry_id
    AND h.room_id = p_room_id
    AND h.check_in = p_check_in
    AND h.check_out = p_check_out
    AND h.hold_status = 'pending'
    AND h.expires_at > now()
  ORDER BY h.expires_at DESC
  LIMIT 1
  FOR UPDATE;

  -- Count overlapping active holds belonging to other enquiries.
  SELECT COUNT(DISTINCT h.enquiry_uuid)
  INTO v_active_holds
  FROM public.booking_holds h
  WHERE h.room_id = p_room_id
    AND h.check_in < p_check_out
    AND p_check_in < h.check_out
    AND h.enquiry_uuid IS DISTINCT FROM p_enquiry_id
    AND (
      h.hold_status = 'confirmed'
      OR (
        h.hold_status = 'pending'
        AND h.expires_at > now()
      )
    );

  -- Also count confirmed enquiries that do not already have
  -- an active confirmed hold, to avoid double-counting bookings.
  SELECT COUNT(*)
  INTO v_unheld_confirmed
  FROM public.booking_enquiries e
  WHERE e.stay_slug = v_room.stay_slug
    AND e.room_id = p_room_id
    AND e.status = 'confirmed'
    AND e.id <> p_enquiry_id
    AND e.check_in < p_check_out
    AND p_check_in < e.check_out
    AND NOT EXISTS (
      SELECT 1
      FROM public.booking_holds h
      WHERE h.enquiry_uuid = e.id
        AND h.room_id = p_room_id
        AND h.hold_status = 'confirmed'
    );

  IF v_active_holds + v_unheld_confirmed >= v_room.room_count THEN
    -- An existing valid hold for this same enquiry can be reused.
    IF v_hold_id IS NULL THEN
      RAISE EXCEPTION 'All rooms of this type are held or booked for these dates'
        USING ERRCODE = '23P01';
    END IF;
  END IF;

  IF v_hold_id IS NULL THEN
    -- Release this enquiry's previous pending holds before creating
    -- a new one. Confirmed holds are never released here.
    UPDATE public.booking_holds
    SET hold_status = 'released',
        released_at = now()
    WHERE enquiry_uuid = p_enquiry_id
      AND hold_status = 'pending';

    INSERT INTO public.booking_holds (
      enquiry_id,
      enquiry_uuid,
      stay_slug,
      room_id,
      rooms_requested,
      check_in,
      check_out,
      guests,
      expires_at,
      hold_status
    )
    VALUES (
      p_enquiry_id::text,
      p_enquiry_id,
      v_room.stay_slug,
      p_room_id,
      1,
      p_check_in,
      p_check_out,
      p_guests,
      now() + make_interval(mins => v_hold_minutes),
      'pending'
    )
    RETURNING id INTO v_hold_id;
  END IF;

  UPDATE public.booking_enquiries
  SET room_id = p_room_id
  WHERE id = p_enquiry_id;

  RETURN jsonb_build_object(
    'success', true,
    'hold_id', v_hold_id,
    'room_id', p_room_id,
    'expires_in_minutes', v_hold_minutes
  );
END;
$$;


ALTER FUNCTION "public"."create_booking_hold"("p_enquiry_id" "uuid", "p_room_id" "uuid", "p_check_in" "date", "p_check_out" "date", "p_guests" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."booking_enquiries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guest_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "stay_slug" "text" NOT NULL,
    "check_in" "date" NOT NULL,
    "check_out" "date" NOT NULL,
    "guests" "text" NOT NULL,
    "estimated_amount" numeric(10,2),
    "special_request" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "room_id" "uuid",
    CONSTRAINT "booking_enquiries_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."booking_enquiries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_holds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enquiry_id" "text" NOT NULL,
    "stay_slug" "text" NOT NULL,
    "room_id" "uuid" NOT NULL,
    "rooms_requested" integer DEFAULT 1 NOT NULL,
    "check_in" "date" NOT NULL,
    "check_out" "date" NOT NULL,
    "guests" integer NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hold_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "released_at" timestamp with time zone,
    "enquiry_uuid" "uuid",
    CONSTRAINT "booking_holds_check" CHECK (("check_out" > "check_in")),
    CONSTRAINT "booking_holds_guests_check" CHECK (("guests" >= 1)),
    CONSTRAINT "booking_holds_hold_status_check" CHECK (("hold_status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'released'::"text"]))),
    CONSTRAINT "booking_holds_rooms_requested_check" CHECK (("rooms_requested" >= 1))
);


ALTER TABLE "public"."booking_holds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."homestay_amenities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stay_slug" "text" NOT NULL,
    "room_id" "uuid",
    "amenity_name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "pricing_unit" "text" DEFAULT 'per_booking'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "homestay_amenities_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "homestay_amenities_pricing_unit_check" CHECK (("pricing_unit" = ANY (ARRAY['included'::"text", 'per_guest'::"text", 'per_night'::"text", 'per_guest_night'::"text", 'per_booking'::"text"])))
);


ALTER TABLE "public"."homestay_amenities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."homestay_listings" (
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "location" "text" NOT NULL,
    "price_per_night" numeric(10,2) DEFAULT 0 NOT NULL,
    "cover_image" "text" NOT NULL,
    "tag" "text" DEFAULT ''::"text" NOT NULL,
    "gallery_images" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "amenities" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "food" "text" DEFAULT 'confirm'::"text" NOT NULL,
    "experiences" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "homestay_listings_food_check" CHECK (("food" = ANY (ARRAY['meals'::"text", 'breakfast'::"text", 'confirm'::"text"]))),
    CONSTRAINT "homestay_listings_price_nonnegative" CHECK (("price_per_night" >= (0)::numeric)),
    CONSTRAINT "homestay_listings_slug_format" CHECK (("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text"))
);


ALTER TABLE "public"."homestay_listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."homestay_meals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stay_slug" "text" NOT NULL,
    "meal_name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "price_per_guest" numeric(10,2) DEFAULT 0 NOT NULL,
    "pricing_unit" "text" DEFAULT 'per_night'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "homestay_meals_price_per_guest_check" CHECK (("price_per_guest" >= (0)::numeric)),
    CONSTRAINT "homestay_meals_pricing_unit_check" CHECK (("pricing_unit" = ANY (ARRAY['per_meal'::"text", 'per_day'::"text", 'per_night'::"text", 'per_stay'::"text"])))
);


ALTER TABLE "public"."homestay_meals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."homestay_rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stay_slug" "text" NOT NULL,
    "room_name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "max_guests" integer DEFAULT 2 NOT NULL,
    "room_count" integer DEFAULT 1 NOT NULL,
    "price_per_guest_night" numeric(10,2),
    "amenities" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "homestay_rooms_max_guests_check" CHECK (("max_guests" >= 1)),
    CONSTRAINT "homestay_rooms_price_per_guest_night_check" CHECK ((("price_per_guest_night" IS NULL) OR ("price_per_guest_night" >= (0)::numeric))),
    CONSTRAINT "homestay_rooms_room_count_check" CHECK (("room_count" >= 1))
);


ALTER TABLE "public"."homestay_rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."homestay_settings" (
    "stay_slug" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "base_price_per_guest_night" numeric(10,2) DEFAULT 0 NOT NULL,
    "included_guests" integer DEFAULT 1 NOT NULL,
    "max_guests_per_booking" integer DEFAULT 10 NOT NULL,
    "default_hold_minutes" integer DEFAULT 30 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "homestay_settings_base_price_per_guest_night_check" CHECK (("base_price_per_guest_night" >= (0)::numeric)),
    CONSTRAINT "homestay_settings_default_hold_minutes_check" CHECK ((("default_hold_minutes" >= 5) AND ("default_hold_minutes" <= 1440))),
    CONSTRAINT "homestay_settings_included_guests_check" CHECK (("included_guests" >= 1)),
    CONSTRAINT "homestay_settings_max_guests_per_booking_check" CHECK (("max_guests_per_booking" >= 1))
);


ALTER TABLE "public"."homestay_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."booking_enquiries"
    ADD CONSTRAINT "booking_enquiries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_holds"
    ADD CONSTRAINT "booking_holds_enquiry_id_key" UNIQUE ("enquiry_id");



ALTER TABLE ONLY "public"."booking_holds"
    ADD CONSTRAINT "booking_holds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."homestay_amenities"
    ADD CONSTRAINT "homestay_amenities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."homestay_listings"
    ADD CONSTRAINT "homestay_listings_pkey" PRIMARY KEY ("slug");



ALTER TABLE ONLY "public"."homestay_meals"
    ADD CONSTRAINT "homestay_meals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."homestay_rooms"
    ADD CONSTRAINT "homestay_rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."homestay_settings"
    ADD CONSTRAINT "homestay_settings_pkey" PRIMARY KEY ("stay_slug");



CREATE INDEX "idx_booking_holds_active_dates" ON "public"."booking_holds" USING "btree" ("room_id", "check_in", "check_out", "expires_at") WHERE ("hold_status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text"]));



CREATE INDEX "idx_booking_holds_dates" ON "public"."booking_holds" USING "btree" ("stay_slug", "check_in", "check_out", "expires_at");



CREATE INDEX "idx_booking_holds_enquiry_uuid" ON "public"."booking_holds" USING "btree" ("enquiry_uuid");



CREATE INDEX "idx_homestay_amenities_stay" ON "public"."homestay_amenities" USING "btree" ("stay_slug");



CREATE INDEX "idx_homestay_meals_stay" ON "public"."homestay_meals" USING "btree" ("stay_slug");



CREATE INDEX "idx_homestay_rooms_stay" ON "public"."homestay_rooms" USING "btree" ("stay_slug");



CREATE INDEX "idx_homestay_rooms_stay_active" ON "public"."homestay_rooms" USING "btree" ("stay_slug", "is_active");



ALTER TABLE ONLY "public"."booking_enquiries"
    ADD CONSTRAINT "booking_enquiries_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."homestay_rooms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."booking_holds"
    ADD CONSTRAINT "booking_holds_enquiry_uuid_fkey" FOREIGN KEY ("enquiry_uuid") REFERENCES "public"."booking_enquiries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_holds"
    ADD CONSTRAINT "booking_holds_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."homestay_rooms"("id");



ALTER TABLE ONLY "public"."booking_holds"
    ADD CONSTRAINT "booking_holds_stay_slug_fkey" FOREIGN KEY ("stay_slug") REFERENCES "public"."homestay_settings"("stay_slug");



ALTER TABLE ONLY "public"."homestay_amenities"
    ADD CONSTRAINT "homestay_amenities_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."homestay_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."homestay_amenities"
    ADD CONSTRAINT "homestay_amenities_stay_slug_fkey" FOREIGN KEY ("stay_slug") REFERENCES "public"."homestay_settings"("stay_slug") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."homestay_meals"
    ADD CONSTRAINT "homestay_meals_stay_slug_fkey" FOREIGN KEY ("stay_slug") REFERENCES "public"."homestay_settings"("stay_slug") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."homestay_rooms"
    ADD CONSTRAINT "homestay_rooms_stay_slug_fkey" FOREIGN KEY ("stay_slug") REFERENCES "public"."homestay_settings"("stay_slug") ON DELETE CASCADE;



ALTER TABLE "public"."booking_enquiries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."booking_holds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."homestay_amenities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."homestay_listings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."homestay_meals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."homestay_rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."homestay_settings" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_booking_hold"("p_enquiry_id" "uuid", "p_room_id" "uuid", "p_check_in" "date", "p_check_out" "date", "p_guests" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_booking_hold"("p_enquiry_id" "uuid", "p_room_id" "uuid", "p_check_in" "date", "p_check_out" "date", "p_guests" integer) TO "service_role";



GRANT ALL ON TABLE "public"."booking_enquiries" TO "anon";
GRANT ALL ON TABLE "public"."booking_enquiries" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_enquiries" TO "service_role";



GRANT ALL ON TABLE "public"."booking_holds" TO "anon";
GRANT ALL ON TABLE "public"."booking_holds" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_holds" TO "service_role";



GRANT ALL ON TABLE "public"."homestay_amenities" TO "anon";
GRANT ALL ON TABLE "public"."homestay_amenities" TO "authenticated";
GRANT ALL ON TABLE "public"."homestay_amenities" TO "service_role";



GRANT ALL ON TABLE "public"."homestay_listings" TO "anon";
GRANT ALL ON TABLE "public"."homestay_listings" TO "authenticated";
GRANT ALL ON TABLE "public"."homestay_listings" TO "service_role";



GRANT ALL ON TABLE "public"."homestay_meals" TO "anon";
GRANT ALL ON TABLE "public"."homestay_meals" TO "authenticated";
GRANT ALL ON TABLE "public"."homestay_meals" TO "service_role";



GRANT ALL ON TABLE "public"."homestay_rooms" TO "anon";
GRANT ALL ON TABLE "public"."homestay_rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."homestay_rooms" TO "service_role";



GRANT ALL ON TABLE "public"."homestay_settings" TO "anon";
GRANT ALL ON TABLE "public"."homestay_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."homestay_settings" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







