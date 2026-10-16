import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/supabase-admin";
import { createServiceClient } from "@/lib/supabase-service";

type RouteContext = {
  params: Promise<{ slug: string }> | { slug: string };
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PHOTO_BUCKET = "homestay-photos";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Uploaded paths are stored under <slug>/cover/... and <slug>/gallery/...
async function listStorageFilesRecursively(
  supabase: ReturnType<typeof createServiceClient>,
  folder: string,
): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .list(folder, { limit: 1000, offset: 0 });

  if (error)
    throw new Error(`Could not inspect uploaded photos: ${error.message}`);

  const paths: string[] = [];
  for (const item of data ?? []) {
    const itemPath = `${folder}/${item.name}`;
    // Storage folders have no id; files have an id.
    if (item.id) {
      paths.push(itemPath);
    } else {
      paths.push(...(await listStorageFilesRecursively(supabase, itemPath)));
    }
  }
  return paths;
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    if (!(await getAdminUser())) {
      return errorResponse("Unauthorized. Please sign in as admin.", 401);
    }

    const { slug: rawSlug } = await context.params;
    let slug = "";
    try {
      slug = decodeURIComponent(rawSlug).trim();
    } catch {
      return errorResponse("Invalid homestay slug.", 400);
    }
    if (!SLUG_PATTERN.test(slug)) {
      return errorResponse("Invalid homestay slug.", 400);
    }

    const supabase = createServiceClient();
    const { data: listing, error: listingReadError } = await supabase
      .from("homestay_listings")
      .select("slug, name")
      .eq("slug", slug)
      .maybeSingle();

    if (listingReadError) {
      console.error("Homestay delete lookup failed:", listingReadError.message);
      return errorResponse(
        "Could not verify the homestay before deletion.",
        500,
      );
    }
    if (!listing) return errorResponse("Homestay listing not found.", 404);

    // Find rooms before deleting any dependent records.
    const { data: rooms, error: roomsReadError } = await supabase
      .from("homestay_rooms")
      .select("id")
      .eq("stay_slug", slug);
    if (roomsReadError) {
      console.error("Could not load homestay rooms:", roomsReadError.message);
      return errorResponse(
        "Could not inspect rooms. No deletion was started.",
        500,
      );
    }
    const roomIds = (rooms ?? []).map((room) => room.id).filter(Boolean);

    // Remove uploaded files first. If storage cannot be inspected, stop before DB cleanup.
    try {
      const storageFiles = await listStorageFilesRecursively(supabase, slug);
      for (let i = 0; i < storageFiles.length; i += 100) {
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .remove(storageFiles.slice(i, i + 100));
        if (error) throw new Error(error.message);
      }
    } catch (storageError) {
      console.error(
        "Could not delete homestay photos from storage:",
        storageError,
      );
      return errorResponse(
        "Could not remove uploaded photos from storage, so database deletion was stopped. Check the homestay-photos bucket and retry.",
        500,
      );
    }

    // booking_holds has NO ACTION foreign keys to both settings and rooms.
    const { error: holdsBySlugError } = await supabase
      .from("booking_holds")
      .delete()
      .eq("stay_slug", slug);
    if (holdsBySlugError) {
      console.error(
        "Could not delete booking holds:",
        holdsBySlugError.message,
      );
      return errorResponse(
        "Could not delete booking holds. Inspect the database before retrying.",
        500,
      );
    }

    // Defensive cleanup for holds that refer to one of this listing's rooms.
    if (roomIds.length > 0) {
      const { error } = await supabase
        .from("booking_holds")
        .delete()
        .in("room_id", roomIds);
      if (error) {
        console.error("Could not delete holds by room:", error.message);
        return errorResponse(
          "Could not delete all room booking holds. Inspect the database before retrying.",
          500,
        );
      }
    }

    // Enquiries may have room_id SET NULL, but deleting them here removes this listing's history too.
    const { error: enquiriesError } = await supabase
      .from("booking_enquiries")
      .delete()
      .eq("stay_slug", slug);
    if (enquiriesError) {
      console.error("Could not delete enquiries:", enquiriesError.message);
      return errorResponse(
        "Could not delete booking enquiries. Inspect the database before retrying.",
        500,
      );
    }

    // Remove children explicitly, then settings and the public listing.
    for (const table of ["homestay_amenities", "homestay_meals"] as const) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("stay_slug", slug);
      if (error) {
        console.error(`Could not delete ${table}:`, error.message);
        return errorResponse(
          `Could not delete related ${table} records. Inspect the database before retrying.`,
          500,
        );
      }
    }

    const { error: roomsDeleteError } = await supabase
      .from("homestay_rooms")
      .delete()
      .eq("stay_slug", slug);
    if (roomsDeleteError) {
      console.error("Could not delete rooms:", roomsDeleteError.message);
      return errorResponse(
        "Could not delete homestay rooms. Inspect the database before retrying.",
        500,
      );
    }

    const { error: settingsDeleteError } = await supabase
      .from("homestay_settings")
      .delete()
      .eq("stay_slug", slug);
    if (settingsDeleteError) {
      console.error("Could not delete settings:", settingsDeleteError.message);
      return errorResponse(
        "Could not delete homestay settings. Inspect the database before retrying.",
        500,
      );
    }

    const { data: deletedListings, error: listingDeleteError } = await supabase
      .from("homestay_listings")
      .delete()
      .eq("slug", slug)
      .select("slug");
    if (listingDeleteError) {
      console.error("Could not delete listing:", listingDeleteError.message);
      return errorResponse(
        "Related records were processed, but the listing could not be deleted. Inspect the database before retrying.",
        500,
      );
    }
    if (!deletedListings?.length) {
      return errorResponse(
        "The listing was not deleted. Refresh and inspect the database.",
        500,
      );
    }

    return NextResponse.json({
      success: true,
      slug,
      message: `${listing.name} and its related database records and uploaded photos were permanently deleted.`,
    });
  } catch (error) {
    console.error("Homestay DELETE failed:", error);
    return errorResponse(
      "An unexpected error occurred while deleting the homestay. Inspect the database before retrying.",
      500,
    );
  }
}
