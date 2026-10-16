import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/supabase-admin";
import { createServiceClient } from "@/lib/supabase-service";

const SETTINGS_FIELDS =
  "stay_slug, display_name, base_price_per_guest_night, included_guests, max_guests_per_booking, default_hold_minutes, is_active";

type HomestaySettingsInput = {
  stay_slug: string;
  display_name: string;
  base_price_per_guest_night: number;
  included_guests: number;
  max_guests_per_booking: number;
  default_hold_minutes: number;
  is_active: boolean;
};

function isValidInteger(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function isValidSettings(
  input: Record<string, unknown>,
): input is Record<string, unknown> & HomestaySettingsInput {
  const {
    stay_slug,
    display_name,
    base_price_per_guest_night,
    included_guests,
    max_guests_per_booking,
    default_hold_minutes,
    is_active,
  } = input;

  if (
    typeof stay_slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stay_slug) ||
    typeof display_name !== "string" ||
    display_name.trim().length < 1 ||
    display_name.trim().length > 100 ||
    typeof base_price_per_guest_night !== "number" ||
    !Number.isFinite(base_price_per_guest_night) ||
    base_price_per_guest_night < 0 ||
    base_price_per_guest_night > 10000000 ||
    !isValidInteger(included_guests, 1, 100) ||
    !isValidInteger(max_guests_per_booking, 1, 100) ||
    !isValidInteger(default_hold_minutes, 5, 1440) ||
    typeof is_active !== "boolean"
  ) {
    return false;
  }

  if (included_guests > max_guests_per_booking) {
    return false;
  }

  return true;
}

export async function GET() {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in as the admin." },
        { status: 401 },
      );
    }

    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient
      .from("homestay_settings")
      .select(SETTINGS_FIELDS)
      .order("display_name");

    if (error) {
      console.error("Failed to load homestay settings:", error.message);

      return NextResponse.json(
        { error: "Could not load homestay settings." },
        { status: 500 },
      );
    }

    return NextResponse.json({ settings: data ?? [] });
  } catch (error) {
    console.error("Homestay settings GET failed:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in as the admin." },
        { status: 401 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid settings data." },
        { status: 400 },
      );
    }

    const input = body as Record<string, unknown>;

    const allowedKeys = [
      "stay_slug",
      "display_name",
      "base_price_per_guest_night",
      "included_guests",
      "max_guests_per_booking",
      "default_hold_minutes",
      "is_active",
    ];

    if (Object.keys(input).some((key) => !allowedKeys.includes(key))) {
      return NextResponse.json(
        { error: "Unexpected settings field." },
        { status: 400 },
      );
    }

    if (!isValidSettings(input)) {
      return NextResponse.json(
        {
          error:
            "Please check your settings. Prices must be non-negative, guest counts must be valid, included guests cannot exceed maximum guests, and hold duration must be between 5 and 1440 minutes.",
        },
        { status: 400 },
      );
    }

    const setting: HomestaySettingsInput = input;

    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient
      .from("homestay_settings")
      .update({
        display_name: setting.display_name.trim(),
        base_price_per_guest_night: setting.base_price_per_guest_night,
        included_guests: setting.included_guests,
        max_guests_per_booking: setting.max_guests_per_booking,
        default_hold_minutes: setting.default_hold_minutes,
        is_active: setting.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("stay_slug", setting.stay_slug)
      .select(SETTINGS_FIELDS)
      .maybeSingle();

    if (error) {
      console.error("Failed to save homestay settings:", error.message);

      return NextResponse.json(
        { error: "Could not save homestay settings." },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Homestay settings were not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ setting: data });
  } catch (error) {
    console.error("Homestay settings PATCH failed:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
