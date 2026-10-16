import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/supabase-admin";
import { createServiceClient } from "@/lib/supabase-service";

const ROOM_FIELDS =
  "id, stay_slug, room_name, description, max_guests, room_count, price_per_guest_night, amenities, is_active, created_at, updated_at";

type RoomInput = {
  stay_slug: string;
  room_name: string;
  description: string;
  max_guests: number;
  room_count: number;
  price_per_guest_night: number | null;
  amenities: string[];
  is_active: boolean;
};

function isPositiveInteger(value: unknown, max = 100): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= max
  );
}

function isValidRoomInput(
  value: Record<string, unknown>,
): value is Record<string, unknown> & RoomInput {
  return (
    typeof value.stay_slug === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.stay_slug) &&
    typeof value.room_name === "string" &&
    value.room_name.trim().length >= 1 &&
    value.room_name.trim().length <= 100 &&
    typeof value.description === "string" &&
    value.description.length <= 2000 &&
    isPositiveInteger(value.max_guests) &&
    isPositiveInteger(value.room_count) &&
    (value.price_per_guest_night === null ||
      (typeof value.price_per_guest_night === "number" &&
        Number.isFinite(value.price_per_guest_night) &&
        value.price_per_guest_night >= 0 &&
        value.price_per_guest_night <= 10000000)) &&
    Array.isArray(value.amenities) &&
    value.amenities.length <= 50 &&
    value.amenities.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0 &&
        item.trim().length <= 100,
    ) &&
    typeof value.is_active === "boolean"
  );
}

async function requireAdmin() {
  const admin = await getAdminUser();

  if (!admin) {
    return null;
  }

  return createServiceClient();
}

function unauthorized() {
  return NextResponse.json(
    { error: "Unauthorized. Please sign in as the admin." },
    { status: 401 },
  );
}

async function readJson(request: NextRequest): Promise<unknown> {
  return request.json();
}

// List rooms. Optionally filter with ?stay_slug=coffee-grove-retreat
export async function GET(request: NextRequest) {
  try {
    const serviceClient = await requireAdmin();

    if (!serviceClient) {
      return unauthorized();
    }

    const staySlug = request.nextUrl.searchParams.get("stay_slug");

    let query = serviceClient
      .from("homestay_rooms")
      .select(ROOM_FIELDS)
      .order("room_name");

    if (staySlug) {
      query = query.eq("stay_slug", staySlug);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to load rooms:", error.message);

      return NextResponse.json(
        { error: "Could not load rooms." },
        { status: 500 },
      );
    }

    return NextResponse.json({ rooms: data ?? [] });
  } catch (error) {
    console.error("Room GET failed:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}

// Add a room type with a configurable number of bookable units.
export async function POST(request: NextRequest) {
  try {
    const serviceClient = await requireAdmin();

    if (!serviceClient) {
      return unauthorized();
    }

    let body: unknown;

    try {
      body = await readJson(request);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid room data." },
        { status: 400 },
      );
    }

    const input = body as Record<string, unknown>;

    const allowedKeys = [
      "stay_slug",
      "room_name",
      "description",
      "max_guests",
      "room_count",
      "price_per_guest_night",
      "amenities",
      "is_active",
    ];

    if (
      Object.keys(input).some((key) => !allowedKeys.includes(key)) ||
      !isValidRoomInput(input)
    ) {
      return NextResponse.json(
        {
          error:
            "Please check all room details. Room count and guest capacity must be whole numbers from 1 to 100.",
        },
        { status: 400 },
      );
    }

    const { data: setting, error: settingError } = await serviceClient
      .from("homestay_settings")
      .select("stay_slug")
      .eq("stay_slug", input.stay_slug)
      .maybeSingle();

    if (settingError) {
      console.error("Failed to validate homestay:", settingError.message);

      return NextResponse.json(
        { error: "Could not validate the selected homestay." },
        { status: 500 },
      );
    }

    if (!setting) {
      return NextResponse.json(
        { error: "The selected homestay does not exist." },
        { status: 400 },
      );
    }

    const { data, error } = await serviceClient
      .from("homestay_rooms")
      .insert({
        stay_slug: input.stay_slug,
        room_name: input.room_name.trim(),
        description: input.description.trim(),
        max_guests: input.max_guests,
        room_count: input.room_count,
        price_per_guest_night: input.price_per_guest_night,
        amenities: input.amenities.map((item) => item.trim()),
        is_active: input.is_active,
      })
      .select(ROOM_FIELDS)
      .single();

    if (error) {
      console.error("Failed to create room:", error.message);

      return NextResponse.json(
        { error: "Could not create the room." },
        { status: 500 },
      );
    }

    return NextResponse.json({ room: data }, { status: 201 });
  } catch (error) {
    console.error("Room POST failed:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}

// Update an existing room type or change its active status.
export async function PATCH(request: NextRequest) {
  try {
    const serviceClient = await requireAdmin();

    if (!serviceClient) {
      return unauthorized();
    }

    let body: unknown;

    try {
      body = await readJson(request);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid room data." },
        { status: 400 },
      );
    }

    const input = body as Record<string, unknown>;
    const { id, ...roomFields } = input;

    if (
      typeof id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      return NextResponse.json(
        { error: "A valid room ID is required." },
        { status: 400 },
      );
    }

    const allowedKeys = [
      "stay_slug",
      "room_name",
      "description",
      "max_guests",
      "room_count",
      "price_per_guest_night",
      "amenities",
      "is_active",
    ];

    if (
      Object.keys(roomFields).length === 0 ||
      Object.keys(roomFields).some((key) => !allowedKeys.includes(key)) ||
      !isValidRoomInput(roomFields)
    ) {
      return NextResponse.json(
        {
          error:
            "Please provide all room fields with valid values, including a room count from 1 to 100.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await serviceClient
      .from("homestay_rooms")
      .update({
        stay_slug: roomFields.stay_slug,
        room_name: roomFields.room_name.trim(),
        description: roomFields.description.trim(),
        max_guests: roomFields.max_guests,
        room_count: roomFields.room_count,
        price_per_guest_night: roomFields.price_per_guest_night,
        amenities: roomFields.amenities.map((item) => item.trim()),
        is_active: roomFields.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(ROOM_FIELDS)
      .maybeSingle();

    if (error) {
      console.error("Failed to update room:", error.message);

      return NextResponse.json(
        { error: "Could not update the room." },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    return NextResponse.json({ room: data });
  } catch (error) {
    console.error("Room PATCH failed:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
