SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict iqAYaxLTPqTritQkjnvuCwIkOsqgriXAQR46KJPusIZgdUpo6nNAgBUsqtAd4tV

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: homestay_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."homestay_settings" ("stay_slug", "display_name", "base_price_per_guest_night", "included_guests", "max_guests_per_booking", "default_hold_minutes", "is_active", "updated_at") VALUES
	('coffee-grove-retreat', 'The Coffee Grove Retreat', 3500.00, 1, 10, 30, true, '2026-10-11 05:33:51.336036+00'),
	('malnad-cottage', 'The Malnad Cottage', 2800.00, 1, 10, 30, true, '2026-10-11 05:33:51.336036+00'),
	('misty-hills-hideaway', 'Misty Hills Hideaway', 4200.00, 1, 10, 300, true, '2026-10-11 08:25:03.093+00'),
	('mithun-homestay', 'Mithiun Homestay', 0.00, 1, 10, 30, true, '2026-10-11 12:12:24.694613+00'),
	('manasvi-stay', 'Manasvi homestay', 0.00, 1, 10, 30, true, '2026-10-11 12:56:20.776+00');


--
-- Data for Name: homestay_rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."homestay_rooms" ("id", "stay_slug", "room_name", "description", "max_guests", "room_count", "price_per_guest_night", "amenities", "is_active", "created_at", "updated_at") VALUES
	('c41ad139-0a61-45be-9a4b-a4c5da0aa825', 'coffee-grove-retreat', 'Balcony View', '', 10, 1, 800.00, '{}', true, '2026-10-11 06:09:46.425486+00', '2026-10-11 06:09:46.425486+00'),
	('d775cee7-eb23-4552-818b-7e609f4c9189', 'coffee-grove-retreat', 'Garden View', '', 4, 1, 900.00, '{WIFI}', true, '2026-10-11 06:09:08.070271+00', '2026-10-11 07:08:36.623+00'),
	('cfa7fe7e-d872-496b-a2b2-bd07e6b1f5b4', 'misty-hills-hideaway', 'Garden View', 'Food included', 4, 2, 1200.00, '{Wifi,"attached bathroom"}', true, '2026-10-11 07:56:15.09259+00', '2026-10-11 07:59:29.172+00'),
	('24044d97-1dbc-46ad-92a2-466a2b9f2f02', 'misty-hills-hideaway', 'Nature', '', 2, 3, 500.00, '{}', true, '2026-10-11 08:05:40.4677+00', '2026-10-11 08:05:40.4677+00'),
	('c213f07c-f1eb-45c9-a8b5-26663743bcbd', 'malnad-cottage', 'Garden', '', 2, 1, 400.00, '{}', true, '2026-10-11 10:19:08.876289+00', '2026-10-11 10:19:08.876289+00'),
	('7c5adaed-5b99-4380-ad82-75df71a69199', 'manasvi-stay', 'Garden', '', 2, 1, 700.00, '{}', true, '2026-10-11 13:27:43.706024+00', '2026-10-11 13:27:43.706024+00');


--
-- Data for Name: booking_enquiries; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."booking_enquiries" ("id", "guest_name", "phone", "stay_slug", "check_in", "check_out", "guests", "estimated_amount", "special_request", "status", "created_at", "room_id") VALUES
	('1047c84f-9bd2-44c0-9fa7-906ae3e44583', 'Darshan M H', '+919380583664', 'misty-hills-hideaway', '2026-10-10', '2026-10-11', '2', 4200.00, NULL, 'pending', '2026-10-10 13:38:50.516507+00', NULL),
	('70a3684a-e2bf-4cd0-ac59-5b8fd49da86b', 'Harush', '+919380583664', 'coffee-grove-retreat', '2026-10-13', '2026-10-14', '2', 3500.00, NULL, 'pending', '2026-10-11 05:19:25.208109+00', NULL),
	('e84d3280-b893-4455-8dc5-2e5b5fc8a06f', 'Kaushij', '+919380583664', 'coffee-grove-retreat', '2026-10-15', '2026-10-18', '3', 31500.00, NULL, 'pending', '2026-10-11 06:28:31.110933+00', NULL),
	('6741627f-38cd-4312-b244-66744bf04e05', 'Darshan M H', '+919380583664', 'coffee-grove-retreat', '2026-10-13', '2026-10-15', '2', 7000.00, NULL, 'confirmed', '2026-10-11 02:27:02.60952+00', 'd775cee7-eb23-4552-818b-7e609f4c9189'),
	('99c09d92-bf44-4ab9-ae54-4cb14bf5ee8c', 'Hemant', '+919380583664', 'coffee-grove-retreat', '2026-10-11', '2026-10-12', '4', 40000.00, NULL, 'pending', '2026-10-11 07:02:06.060759+00', 'd775cee7-eb23-4552-818b-7e609f4c9189'),
	('dfd796f3-4722-438a-b04f-e29508f5b660', 'Manish', '+919380583664', 'coffee-grove-retreat', '2026-10-19', '2026-10-20', '2', 1800.00, NULL, 'pending', '2026-10-11 07:18:00.065557+00', 'd775cee7-eb23-4552-818b-7e609f4c9189'),
	('488a177f-623f-444e-99d8-1dea71a9aebf', 'Balu', '+919380583664', 'coffee-grove-retreat', '2026-10-25', '2026-10-27', '2', 3600.00, NULL, 'pending', '2026-10-11 07:21:16.37665+00', 'd775cee7-eb23-4552-818b-7e609f4c9189'),
	('e6f63396-2aa0-468d-8863-29f2bc5573a8', 'Balu', '+919380583664', 'coffee-grove-retreat', '2026-10-29', '2026-10-30', '2', 1800.00, 'Testing temporary room hold in Special requests.', 'pending', '2026-10-11 07:21:49.935404+00', 'd775cee7-eb23-4552-818b-7e609f4c9189'),
	('7cff19bb-8c53-47fa-a0ad-164ac3ca087e', 'Test', '+919380583664', 'coffee-grove-retreat', '2026-10-12', '2026-10-14', '2', 3600.00, 'Test', 'cancelled', '2026-10-11 07:32:46.691019+00', NULL),
	('f6954329-c406-400d-976c-e650a245236a', 'Test user', '+919380583664', 'coffee-grove-retreat', '2026-10-27', '2026-10-28', '2', 1800.00, 'Test', 'pending', '2026-10-11 07:33:33.936409+00', 'd775cee7-eb23-4552-818b-7e609f4c9189'),
	('294f9154-8326-4701-866b-1ce2e010695a', 'Darshan M H', '+919380583664', 'misty-hills-hideaway', '2026-10-11', '2026-10-12', '4', 4800.00, NULL, 'pending', '2026-10-11 08:28:21.987608+00', 'cfa7fe7e-d872-496b-a2b2-bd07e6b1f5b4'),
	('25a750af-d2d8-46d2-aead-b6897aa69504', 'Darshan M H', '+919380583664', 'misty-hills-hideaway', '2026-10-11', '2026-10-12', '4', 4800.00, NULL, 'pending', '2026-10-11 08:28:38.387336+00', 'cfa7fe7e-d872-496b-a2b2-bd07e6b1f5b4'),
	('1d26ecdb-5f3c-4160-836c-92a572375809', 'Darshan M H', '+919380583664', 'misty-hills-hideaway', '2026-10-11', '2026-10-12', '4', 4800.00, NULL, 'cancelled', '2026-10-11 08:28:44.706084+00', NULL);


--
-- Data for Name: booking_holds; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."booking_holds" ("id", "enquiry_id", "stay_slug", "room_id", "rooms_requested", "check_in", "check_out", "guests", "expires_at", "created_at", "hold_status", "released_at", "enquiry_uuid") VALUES
	('2d569267-ed38-4dc8-a66f-9d8b1bfefe14', '99c09d92-bf44-4ab9-ae54-4cb14bf5ee8c', 'coffee-grove-retreat', 'd775cee7-eb23-4552-818b-7e609f4c9189', 1, '2026-10-11', '2026-10-12', 4, '2026-10-11 07:32:06.626531+00', '2026-10-11 07:02:06.626531+00', 'pending', NULL, '99c09d92-bf44-4ab9-ae54-4cb14bf5ee8c'),
	('c26d78b4-9557-49f6-8f0d-8010c3014e27', 'dfd796f3-4722-438a-b04f-e29508f5b660', 'coffee-grove-retreat', 'd775cee7-eb23-4552-818b-7e609f4c9189', 1, '2026-10-19', '2026-10-20', 2, '2026-10-11 07:48:01.626074+00', '2026-10-11 07:18:01.626074+00', 'pending', NULL, 'dfd796f3-4722-438a-b04f-e29508f5b660'),
	('2fa64c77-13be-4146-948b-0c9bb51a859b', '488a177f-623f-444e-99d8-1dea71a9aebf', 'coffee-grove-retreat', 'd775cee7-eb23-4552-818b-7e609f4c9189', 1, '2026-10-25', '2026-10-27', 2, '2026-10-11 07:51:16.96199+00', '2026-10-11 07:21:16.96199+00', 'pending', NULL, '488a177f-623f-444e-99d8-1dea71a9aebf'),
	('ba936cc9-eeb0-40bf-83e5-fad526f50f34', 'e6f63396-2aa0-468d-8863-29f2bc5573a8', 'coffee-grove-retreat', 'd775cee7-eb23-4552-818b-7e609f4c9189', 1, '2026-10-29', '2026-10-30', 2, '2026-10-11 07:51:50.547885+00', '2026-10-11 07:21:50.547885+00', 'released', '2026-10-11 07:33:34.844+00', 'e6f63396-2aa0-468d-8863-29f2bc5573a8'),
	('f4ab11c0-075d-42a7-b175-74aba2378220', 'f6954329-c406-400d-976c-e650a245236a', 'coffee-grove-retreat', 'd775cee7-eb23-4552-818b-7e609f4c9189', 1, '2026-10-27', '2026-10-28', 2, '2026-10-11 08:03:34.518651+00', '2026-10-11 07:33:34.518651+00', 'released', '2026-10-11 07:36:51.811+00', 'f6954329-c406-400d-976c-e650a245236a'),
	('b17ecbda-2c2b-411e-9c59-85f22d822151', '294f9154-8326-4701-866b-1ce2e010695a', 'misty-hills-hideaway', 'cfa7fe7e-d872-496b-a2b2-bd07e6b1f5b4', 1, '2026-10-11', '2026-10-12', 4, '2026-10-11 13:28:22.651259+00', '2026-10-11 08:28:22.651259+00', 'pending', NULL, '294f9154-8326-4701-866b-1ce2e010695a'),
	('b1effac4-7b0f-4f2e-9ec2-185d5b23e79d', '25a750af-d2d8-46d2-aead-b6897aa69504', 'misty-hills-hideaway', 'cfa7fe7e-d872-496b-a2b2-bd07e6b1f5b4', 1, '2026-10-11', '2026-10-12', 4, '2026-10-11 13:28:38.936756+00', '2026-10-11 08:28:38.936756+00', 'pending', NULL, '25a750af-d2d8-46d2-aead-b6897aa69504');


--
-- Data for Name: homestay_amenities; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."homestay_amenities" ("id", "stay_slug", "room_id", "amenity_name", "description", "price", "pricing_unit", "is_active", "created_at", "updated_at") VALUES
	('e622305e-e589-489b-8145-f9b52027a934', 'malnad-cottage', NULL, 'cacsac', '', 0.00, 'included', true, '2026-10-11 08:47:28.522867+00', '2026-10-11 08:47:28.522867+00'),
	('5ead81fa-81b0-4b53-b934-16c012952e77', 'malnad-cottage', NULL, 'asd', '', 1.00, 'per_guest', true, '2026-10-11 08:47:43.863505+00', '2026-10-11 08:47:43.863505+00');


--
-- Data for Name: homestay_listings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."homestay_listings" ("slug", "name", "location", "price_per_night", "cover_image", "tag", "gallery_images", "amenities", "food", "experiences", "is_active", "created_at", "updated_at") VALUES
	('coffee-grove-retreat', 'The Coffee Grove Retreat', 'Chikkamagaluru, Karnataka', 3500.00, '/images/coffee-grove/cover.jpeg', 'GUEST FAVOURITE', '{/images/coffee-grove/cover.jpeg,/images/coffee-grove/room.jpeg,/images/coffee-grove/interior.jpeg,/images/coffee-grove/view.jpeg,/images/coffee-grove/bathroom.jpeg,/images/coffee-grove/exterior.jpeg,/images/coffee-grove/exterior.jpeg}', '{Wi-Fi,Parking,"Hot water","Attached bathroom","Power backup"}', 'meals', '{"Nature walks","Coffee plantation walks",Campfire,"Local sightseeing assistance"}', true, '2026-10-11 10:11:54.396773+00', '2026-10-11 10:11:54.396773+00'),
	('misty-hills-hideaway', 'Misty Hills Hideaway', 'Sakleshpur, Karnataka', 4200.00, '/images/misty-hills/cover.jpeg', 'NATURE ESCAPE', '{/images/misty-hills/cover.jpeg,/images/misty-hills/room.jpeg,/images/misty-hills/interior.jpeg,/images/misty-hills/view.jpeg,/images/misty-hills/bathroom.jpeg}', '{Wi-Fi,Parking,"Hot water","Attached bathroom","Power backup"}', 'confirm', '{"Nature walks","Coffee plantation walks",Campfire,"Local sightseeing assistance"}', true, '2026-10-11 10:11:54.396773+00', '2026-10-11 10:11:54.396773+00'),
	('malnad-cottage', 'The Malnad Cottage', 'Western Ghats, Karnataka', 2800.00, '/images/malnad-cottage/cover.jpeg', 'PEACEFUL STAY', '{/images/malnad-cottage/cover.jpeg,/images/malnad-cottage/room.jpeg,/images/malnad-cottage/interior.jpeg,/images/malnad-cottage/view.jpeg,/images/malnad-cottage/bathroom.jpeg}', '{Wi-Fi,Parking,"Hot water","Attached bathroom","Power backup"}', 'breakfast', '{"Local sightseeing assistance"}', true, '2026-10-11 10:11:54.396773+00', '2026-10-11 10:11:54.396773+00'),
	('mithun-homestay', 'Mithiun Homestay', 'Mudigere', 0.00, 'https://xwrxfmbscuhdfgkjchmq.supabase.co/storage/v1/object/public/homestay-photos/mithun-homestay/cover/e8addeb6-e1e5-435d-b80c-17881ae49f61.jpg', 'Nature', '{https://xwrxfmbscuhdfgkjchmq.supabase.co/storage/v1/object/public/homestay-photos/mithun-homestay/gallery/a64b3845-5598-4b50-8056-748efb56e397.jpg}', '{}', 'confirm', '{}', true, '2026-10-11 12:12:24.15399+00', '2026-10-11 12:14:32.59+00'),
	('manasvi-stay', 'Manasvi homestay', 'Mudigere', 199.98, 'https://xwrxfmbscuhdfgkjchmq.supabase.co/storage/v1/object/public/homestay-photos/manasvi-stay/cover/de8fc5e2-6d56-47a9-ac22-a34b55732f48.jpg', 'Nature', '{https://xwrxfmbscuhdfgkjchmq.supabase.co/storage/v1/object/public/homestay-photos/manasvi-stay/gallery/ae879239-5e17-4093-9699-a5fe0caa3086.jpg,https://xwrxfmbscuhdfgkjchmq.supabase.co/storage/v1/object/public/homestay-photos/manasvi-stay/gallery/f3e9265d-9680-435c-a75f-989080b944aa.jpg}', '{Wi-Fi,"Parking 2 Wheeler"}', 'confirm', '{CampFire}', true, '2026-10-11 11:30:15.355041+00', '2026-10-11 12:56:20.311+00');


--
-- Data for Name: homestay_meals; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."homestay_meals" ("id", "stay_slug", "meal_name", "description", "price_per_guest", "pricing_unit", "is_active", "created_at", "updated_at") VALUES
	('55d9eef6-eeae-4286-b138-45997ee82286', 'misty-hills-hideaway', 'BreakFast', '', 100.00, 'per_meal', true, '2026-10-11 06:18:54.535466+00', '2026-10-11 06:18:54.535466+00'),
	('ff9c42f7-986c-4c5d-8e47-a396591e4760', 'coffee-grove-retreat', 'Dinner', '', 1000.00, 'per_meal', true, '2026-10-11 06:24:14.518785+00', '2026-10-11 06:24:14.518785+00'),
	('1467992d-e6ce-4659-b4f8-7129c0a64fbd', 'malnad-cottage', 'BreakFast', '', 0.00, 'per_meal', true, '2026-10-11 08:31:45.284048+00', '2026-10-11 08:31:45.284048+00');


--
-- PostgreSQL database dump complete
--

-- \unrestrict iqAYaxLTPqTritQkjnvuCwIkOsqgriXAQR46KJPusIZgdUpo6nNAgBUsqtAd4tV

RESET ALL;
