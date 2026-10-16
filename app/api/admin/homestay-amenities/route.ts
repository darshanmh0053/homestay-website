import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase-admin";
import { createServiceClient } from "@/lib/supabase-service";

const TABLE = "homestay_amenities";

const UNITS = [
  "included",
  "per_guest",
  "per_night",
  "per_guest_night",
  "per_booking",
] as const;

type AmenityUnit = (typeof UNITS)[number];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validText(value: unknown, max = 150): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= max
  );
}

function validDescription(value: unknown): boolean {
  return (
    value === undefined || (typeof value === "string" && value.length <= 1000)
  );
}

function validUnit(value: unknown): value is AmenityUnit {
  return typeof value === "string" && UNITS.includes(value as AmenityUnit);
}

function normalizePrice(value: unknown): number | null {
  // Blank, null, or omitted price means free.
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 10_000_000
  ) {
    return null;
  }

  return value;
}

function storedPrice(price: number, unit: AmenityUnit): number {
  return unit === "included" ? 0 : price;
}

async function parseBody(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    if (!isObject(body)) {
      return { body: null, error: "Invalid request body." };
    }

    return { body, error: null };
  } catch {
    return { body: null, error: "The request body must contain valid JSON." };
  }
}

export async function GET() {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const db = createServiceClient();

    const { data, error } = await db
      .from(TABLE)
      .select("*")
      .is("room_id", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ amenities: data ?? [] });
  } catch (error) {
    console.error("Admin amenities GET error:", error);

    return NextResponse.json(
      { error: "Could not load amenities." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const parsed = await parseBody(request);

    if (!parsed.body) {
      return NextResponse.json(
        { error: parsed.error ?? "Invalid request body." },
        { status: 400 },
      );
    }

    const item = parsed.body;
    const price = normalizePrice(item.price);

    if (!validText(item.stay_slug, 100)) {
      return NextResponse.json(
        { error: "Please select a valid homestay." },
        { status: 400 },
      );
    }

    if (!validText(item.amenity_name, 150)) {
      return NextResponse.json(
        { error: "Enter an amenity or activity name." },
        { status: 400 },
      );
    }

    if (price === null) {
      return NextResponse.json(
        { error: "Enter a valid price or leave it blank for free." },
        { status: 400 },
      );
    }

    if (!validUnit(item.pricing_unit)) {
      return NextResponse.json(
        { error: "Select a valid charging unit." },
        { status: 400 },
      );
    }

    if (!validDescription(item.description)) {
      return NextResponse.json(
        { error: "Description must be 1,000 characters or fewer." },
        { status: 400 },
      );
    }

    if (item.is_active !== undefined && typeof item.is_active !== "boolean") {
      return NextResponse.json(
        { error: "Invalid active status." },
        { status: 400 },
      );
    }

    const db = createServiceClient();

    const { data: stay, error: stayError } = await db
      .from("homestay_settings")
      .select("stay_slug")
      .eq("stay_slug", item.stay_slug.trim())
      .maybeSingle();

    if (stayError) throw stayError;

    if (!stay) {
      return NextResponse.json(
        { error: "Select a valid homestay configured in settings." },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from(TABLE)
      .insert({
        stay_slug: item.stay_slug.trim(),
        room_id: null,
        amenity_name: item.amenity_name.trim(),
        description:
          typeof item.description === "string" ? item.description.trim() : "",
        price: storedPrice(price, item.pricing_unit),
        pricing_unit: item.pricing_unit,
        is_active: item.is_active ?? true,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ amenity: data }, { status: 201 });
  } catch (error) {
    console.error("Admin amenities POST error:", error);

    return NextResponse.json(
      {
        error: "Could not save the amenity. Check the server logs for details.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const parsed = await parseBody(request);

    if (!parsed.body) {
      return NextResponse.json(
        { error: parsed.error ?? "Invalid request body." },
        { status: 400 },
      );
    }

    const item = parsed.body;
    const price = normalizePrice(item.price);

    if (!validText(item.id, 100)) {
      return NextResponse.json(
        { error: "The amenity ID is missing or invalid." },
        { status: 400 },
      );
    }

    if (!validText(item.stay_slug, 100)) {
      return NextResponse.json(
        { error: "Please select a valid homestay." },
        { status: 400 },
      );
    }

    if (!validText(item.amenity_name, 150)) {
      return NextResponse.json(
        { error: "Enter an amenity or activity name." },
        { status: 400 },
      );
    }

    if (price === null) {
      return NextResponse.json(
        { error: "Enter a valid price or leave it blank for free." },
        { status: 400 },
      );
    }

    if (!validUnit(item.pricing_unit)) {
      return NextResponse.json(
        { error: "Select a valid charging unit." },
        { status: 400 },
      );
    }

    if (typeof item.is_active !== "boolean") {
      return NextResponse.json(
        { error: "Invalid active status." },
        { status: 400 },
      );
    }

    if (!validDescription(item.description)) {
      return NextResponse.json(
        { error: "Description must be 1,000 characters or fewer." },
        { status: 400 },
      );
    }

    const db = createServiceClient();

    const { data, error } = await db
      .from(TABLE)
      .update({
        amenity_name: item.amenity_name.trim(),
        description:
          typeof item.description === "string" ? item.description.trim() : "",
        price: storedPrice(price, item.pricing_unit),
        pricing_unit: item.pricing_unit,
        is_active: item.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("stay_slug", item.stay_slug.trim())
      .is("room_id", null)
      .select("*")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: "Amenity not found for the selected homestay." },
        { status: 404 },
      );
    }

    return NextResponse.json({ amenity: data });
  } catch (error) {
    console.error("Admin amenities PATCH error:", error);

    return NextResponse.json(
      {
        error:
          "Could not update the amenity. Check the server logs for details.",
      },
      { status: 500 },
    );
  }
}
