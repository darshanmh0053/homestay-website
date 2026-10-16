import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase-admin";
import { createServiceClient } from "@/lib/supabase-service";

const TABLE = "homestay_meals";

const UNITS = ["per_meal", "per_day", "per_night", "per_stay"] as const;

function validText(value: unknown, max = 150): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= max
  );
}

function validPrice(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 10000000
  );
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
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ meals: data ?? [] });
  } catch (error) {
    console.error("Admin meals GET error:", error);
    return NextResponse.json(
      { error: "Could not load meals." },
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

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const item = body as Record<string, unknown>;

    if (
      !validText(item.stay_slug, 100) ||
      !validText(item.meal_name) ||
      typeof item.price_per_guest !== "number" ||
      !validPrice(item.price_per_guest) ||
      !UNITS.includes(item.pricing_unit as (typeof UNITS)[number]) ||
      (item.description !== undefined &&
        typeof item.description !== "string") ||
      (item.is_active !== undefined && typeof item.is_active !== "boolean")
    ) {
      return NextResponse.json(
        { error: "Please check the meal details and price." },
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
        { error: "Select a valid homestay." },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from(TABLE)
      .insert({
        stay_slug: item.stay_slug.trim(),
        meal_name: item.meal_name.trim(),
        description:
          typeof item.description === "string" ? item.description.trim() : "",
        price_per_guest: item.price_per_guest,
        pricing_unit: item.pricing_unit,
        is_active: item.is_active ?? true,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ meal: data }, { status: 201 });
  } catch (error) {
    console.error("Admin meals POST error:", error);
    return NextResponse.json(
      { error: "Could not save the meal." },
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

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const item = body as Record<string, unknown>;

    if (
      !validText(item.id, 100) ||
      !validText(item.stay_slug, 100) ||
      !validText(item.meal_name) ||
      typeof item.price_per_guest !== "number" ||
      !validPrice(item.price_per_guest) ||
      !UNITS.includes(item.pricing_unit as (typeof UNITS)[number]) ||
      typeof item.is_active !== "boolean" ||
      (item.description !== undefined && typeof item.description !== "string")
    ) {
      return NextResponse.json(
        { error: "Please check the meal details and price." },
        { status: 400 },
      );
    }

    const db = createServiceClient();

    const { data, error } = await db
      .from(TABLE)
      .update({
        meal_name: item.meal_name.trim(),
        description:
          typeof item.description === "string" ? item.description.trim() : "",
        price_per_guest: item.price_per_guest,
        pricing_unit: item.pricing_unit,
        is_active: item.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("stay_slug", item.stay_slug.trim())
      .select("*")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Meal not found." }, { status: 404 });
    }

    return NextResponse.json({ meal: data });
  } catch (error) {
    console.error("Admin meals PATCH error:", error);
    return NextResponse.json(
      { error: "Could not update the meal." },
      { status: 500 },
    );
  }
}
