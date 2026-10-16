import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/supabase-admin";
import { createServiceClient } from "@/lib/supabase-service";

const LISTING_FIELDS =
  "slug, name, location, price_per_night, cover_image, tag, gallery_images, amenities, food, experiences, is_active, created_at, updated_at";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type FoodOption = "meals" | "breakfast" | "confirm";

type ListingInput = {
  slug: string;
  name: string;
  location: string;
  price_per_night: number;
  cover_image: string;
  tag: string;
  gallery_images: string[];
  amenities: string[];
  food: FoodOption;
  experiences: string[];
  is_active: boolean;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );
}

function isStringArray(value: unknown, maxItems: number): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0 &&
        item.trim().length <= 500,
    )
  );
}

function isValidImageUrl(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidListing(value: unknown): value is ListingInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const input = value as Record<string, unknown>;

  if (
    !isText(input.slug, 100) ||
    !SLUG_PATTERN.test(input.slug) ||
    !isText(input.name, 100) ||
    !isText(input.location, 200) ||
    typeof input.price_per_night !== "number" ||
    !Number.isFinite(input.price_per_night) ||
    input.price_per_night < 0 ||
    input.price_per_night > 10000000 ||
    typeof input.cover_image !== "string" ||
    input.cover_image.trim().length > 2000 ||
    (input.cover_image.trim() !== "" &&
      !isValidImageUrl(input.cover_image.trim())) ||
    typeof input.tag !== "string" ||
    input.tag.trim().length > 100 ||
    !isStringArray(input.gallery_images, 30) ||
    !isStringArray(input.amenities, 50) ||
    !isStringArray(input.experiences, 50) ||
    !["meals", "breakfast", "confirm"].includes(String(input.food)) ||
    typeof input.is_active !== "boolean"
  ) {
    return false;
  }

  return (input.gallery_images as string[]).every(isValidImageUrl);
}

function normalizeListing(input: ListingInput) {
  return {
    slug: input.slug.trim(),
    name: input.name.trim(),
    location: input.location.trim(),
    price_per_night: input.price_per_night,
    cover_image: input.cover_image.trim(),
    tag: input.tag.trim(),
    gallery_images: input.gallery_images.map((item) => item.trim()),
    amenities: input.amenities.map((item) => item.trim()),
    food: input.food,
    experiences: input.experiences.map((item) => item.trim()),
    is_active: input.is_active,
    updated_at: new Date().toISOString(),
  };
}

async function ensureAdmin() {
  const admin = await getAdminUser();

  if (!admin) {
    return false;
  }

  return true;
}

export async function GET() {
  try {
    if (!(await ensureAdmin())) {
      return errorResponse("Unauthorized. Please sign in as admin.", 401);
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("homestay_listings")
      .select(LISTING_FIELDS)
      .order("name");

    if (error) {
      console.error("Failed to load listings:", error.message);
      return errorResponse("Could not load homestay listings.", 500);
    }

    return NextResponse.json({ listings: data ?? [] });
  } catch (error) {
    console.error("Listings GET failed:", error);
    return errorResponse("An unexpected error occurred.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await ensureAdmin())) {
      return errorResponse("Unauthorized. Please sign in as admin.", 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON request body.", 400);
    }

    if (!isValidListing(body)) {
      return errorResponse(
        "Please check the homestay details and photo URLs.",
        400,
      );
    }

    const supabase = createServiceClient();
    const listing = normalizeListing(body);

    // Create the listing first.
    const { data: createdListing, error: listingError } = await supabase
      .from("homestay_listings")
      .insert(listing)
      .select(LISTING_FIELDS)
      .single();

    if (listingError) {
      if (listingError.code === "23505") {
        return errorResponse("A homestay with this slug already exists.", 409);
      }

      console.error("Listing insert failed:", listingError.message);
      return errorResponse("Could not create the homestay listing.", 500);
    }

    // Create the corresponding settings record.
    // Do not copy the listing display price into booking prices:
    // room/booking prices are managed separately.
    const { error: settingsError } = await supabase
      .from("homestay_settings")
      .insert({
        stay_slug: listing.slug,
        display_name: listing.name,
        base_price_per_guest_night: 0,
        included_guests: 1,
        max_guests_per_booking: 10,
        default_hold_minutes: 30,
        is_active: listing.is_active,
      });

    if (settingsError) {
      console.error("Settings insert failed:", settingsError.message);

      // Compensate by removing the listing if its settings could
      // not be created, so the database is not left half-configured.
      const { error: rollbackError } = await supabase
        .from("homestay_listings")
        .delete()
        .eq("slug", listing.slug);

      if (rollbackError) {
        console.error("Listing rollback failed:", rollbackError.message);
      }

      return errorResponse(
        "The listing could not be fully configured. No successful creation is confirmed; check homestay_settings and try again.",
        500,
      );
    }

    return NextResponse.json(
      {
        listing: createdListing,
        message:
          "Homestay listing and settings created. Configure rooms and booking prices before accepting bookings.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Listings POST failed:", error);
    return errorResponse("Could not create the homestay.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await ensureAdmin())) {
      return errorResponse("Unauthorized. Please sign in as admin.", 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON request body.", 400);
    }

    if (!isValidListing(body)) {
      return errorResponse(
        "Please check the homestay details and photo URLs.",
        400,
      );
    }

    const supabase = createServiceClient();
    const listing = normalizeListing(body);

    const { data, error } = await supabase
      .from("homestay_listings")
      .update(listing)
      .eq("slug", listing.slug)
      .select(LISTING_FIELDS)
      .maybeSingle();

    if (error) {
      console.error("Listing update failed:", error.message);
      return errorResponse("Could not update the homestay.", 500);
    }

    if (!data) {
      return errorResponse("Homestay listing not found.", 404);
    }

    // Keep the associated settings display name and active status
    // in sync when the listing is edited.
    const { error: settingsError } = await supabase
      .from("homestay_settings")
      .update({
        display_name: listing.name,
        is_active: listing.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("stay_slug", listing.slug);

    if (settingsError) {
      console.error("Settings update failed:", settingsError.message);

      return errorResponse(
        "The listing was updated, but its settings could not be synchronized. Check homestay_settings.",
        500,
      );
    }

    return NextResponse.json({ listing: data });
  } catch (error) {
    console.error("Listings PATCH failed:", error);
    return errorResponse("Could not update the homestay.", 500);
  }
}
