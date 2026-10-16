import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("homestay_listings")
      .select("slug, name, location, price_per_night, cover_image, tag")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Public homestay query failed:", error.message);

      return NextResponse.json(
        { error: "Could not load homestays." },
        { status: 500 },
      );
    }

    // Do not use route-segment `revalidate` here: the project has
    // `cacheComponents` enabled. Keep this response dynamic and avoid
    // caching potentially stale public listing data at the HTTP layer.
    return NextResponse.json(
      { listings: data ?? [] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Public homestay API failed:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
