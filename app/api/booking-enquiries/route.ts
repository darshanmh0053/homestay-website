import "server-only";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

const DAY_MS = 86_400_000;
const MAX_STAY_NIGHTS = 90;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function getSupabase() {
  return createServiceClient();
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function getGuestCount(value: unknown): number | null {
  if (typeof value !== "string") return null;
  if (/^[1-8]$/.test(value)) return Number(value);
  if (value === "9+") return 9;
  return null;
}

function getPrice(
  roomPrice: number | string | null | undefined,
  basePrice: number | string,
): number | null {
  const price = Number(roomPrice == null ? basePrice : roomPrice);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function isValidSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG_PATTERN.test(value);
}

export async function GET(request: Request) {
  try {
    const staySlug = new URL(request.url).searchParams.get("staySlug");
    if (!isValidSlug(staySlug)) {
      return NextResponse.json(
        { error: "Please select a valid homestay." },
        { status: 400 },
      );
    }

    const supabase = getSupabase();
    const { data: listing, error: listingError } = await supabase
      .from("homestay_listings")
      .select("slug")
      .eq("slug", staySlug)
      .eq("is_active", true)
      .maybeSingle();
    if (listingError) throw listingError;
    if (!listing) {
      return NextResponse.json(
        { error: "This homestay is unavailable or does not exist." },
        { status: 404 },
      );
    }

    const { data: settings, error: settingsError } = await supabase
      .from("homestay_settings")
      .select(
        "stay_slug, display_name, base_price_per_guest_night, included_guests, max_guests_per_booking, is_active",
      )
      .eq("stay_slug", staySlug)
      .maybeSingle();
    if (settingsError) throw settingsError;
    if (!settings || !settings.is_active) {
      return NextResponse.json(
        { error: "This homestay's booking settings are unavailable." },
        { status: 404 },
      );
    }

    const { data: rooms, error: roomsError } = await supabase
      .from("homestay_rooms")
      .select(
        "id, room_name, description, max_guests, room_count, price_per_guest_night, amenities",
      )
      .eq("stay_slug", staySlug)
      .eq("is_active", true)
      .order("room_name");
    if (roomsError) throw roomsError;

    return NextResponse.json(
      { settings, rooms: rooms ?? [] },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("Booking options lookup failed:", error);
    return NextResponse.json(
      { error: "We couldn't load the available rooms. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch {
    return NextResponse.json(
      { error: "Booking service is not configured." },
      { status: 500 },
    );
  }

  let enquiryId: string | null = null;

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const data = body as Record<string, unknown>;
    const guestName =
      typeof data.guestName === "string" ? data.guestName.trim() : "";
    const phone = typeof data.phone === "string" ? data.phone.trim() : "";
    const staySlug =
      typeof data.staySlug === "string" ? data.staySlug.trim() : "";
    const roomId = typeof data.roomId === "string" ? data.roomId.trim() : "";
    const checkIn = data.checkIn;
    const checkOut = data.checkOut;
    const guestCount = getGuestCount(data.guests);
    const specialRequest =
      typeof data.specialRequest === "string" ? data.specialRequest.trim() : "";

    if (
      guestName.length < 2 ||
      guestName.length > 100 ||
      !/^[0-9+()\s-]+$/.test(phone) ||
      phone.replace(/\D/g, "").length < 8 ||
      phone.replace(/\D/g, "").length > 15 ||
      !isValidSlug(staySlug) ||
      (data.roomId != null && typeof data.roomId !== "string") ||
      roomId.length > 100 ||
      !isValidDate(checkIn) ||
      !isValidDate(checkOut) ||
      checkOut <= checkIn ||
      guestCount === null ||
      specialRequest.length > 1000
    ) {
      return NextResponse.json(
        { error: "Please check your booking details and try again." },
        { status: 400 },
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    if (checkIn < today) {
      return NextResponse.json(
        { error: "Check-in cannot be in the past." },
        { status: 400 },
      );
    }

    const nights =
      (new Date(`${checkOut}T00:00:00.000Z`).getTime() -
        new Date(`${checkIn}T00:00:00.000Z`).getTime()) /
      DAY_MS;
    if (nights < 1 || nights > MAX_STAY_NIGHTS) {
      return NextResponse.json(
        { error: `Bookings must be between 1 and ${MAX_STAY_NIGHTS} nights.` },
        { status: 400 },
      );
    }

    const { data: listing, error: listingError } = await supabase
      .from("homestay_listings")
      .select("slug")
      .eq("slug", staySlug)
      .eq("is_active", true)
      .maybeSingle();
    if (listingError) throw listingError;
    if (!listing) {
      return NextResponse.json(
        { error: "This homestay is unavailable or does not exist." },
        { status: 400 },
      );
    }

    const { data: settings, error: settingsError } = await supabase
      .from("homestay_settings")
      .select(
        "stay_slug, base_price_per_guest_night, max_guests_per_booking, is_active",
      )
      .eq("stay_slug", staySlug)
      .maybeSingle();
    if (settingsError) throw settingsError;
    if (!settings || !settings.is_active) {
      return NextResponse.json(
        { error: "This homestay is currently unavailable." },
        { status: 400 },
      );
    }

    const homestayGuestLimit = Number(settings.max_guests_per_booking);
    if (!Number.isInteger(homestayGuestLimit) || homestayGuestLimit < 1) {
      return NextResponse.json(
        { error: "Please check the homestay guest-capacity settings." },
        { status: 500 },
      );
    }
    if (guestCount > homestayGuestLimit) {
      return NextResponse.json(
        {
          error: `This homestay allows up to ${homestayGuestLimit} guests per enquiry.`,
        },
        { status: 400 },
      );
    }

    // Room selection is optional. Without a room, estimate from the homestay base rate.
    let room: {
      id: string;
      room_name: string;
      max_guests: number;
      price_per_guest_night: number | string | null;
    } | null = null;

    if (roomId) {
      const { data: roomData, error: roomError } = await supabase
        .from("homestay_rooms")
        .select(
          "id, stay_slug, room_name, max_guests, room_count, price_per_guest_night, is_active",
        )
        .eq("id", roomId)
        .eq("stay_slug", staySlug)
        .eq("is_active", true)
        .maybeSingle();
      if (roomError) throw roomError;
      if (!roomData) {
        return NextResponse.json(
          {
            error:
              "This room is unavailable. Please choose another room or enquire without selecting one.",
          },
          { status: 400 },
        );
      }
      const roomGuestLimit = Number(roomData.max_guests);
      if (!Number.isInteger(roomGuestLimit) || roomGuestLimit < 1) {
        return NextResponse.json(
          { error: "Please check the room capacity settings." },
          { status: 500 },
        );
      }
      if (guestCount > Math.min(homestayGuestLimit, roomGuestLimit)) {
        return NextResponse.json(
          {
            error: `This room allows up to ${Math.min(homestayGuestLimit, roomGuestLimit)} guests. Choose another room or enquire without selecting one.`,
          },
          { status: 400 },
        );
      }
      room = roomData;
    }

    const pricePerGuestNight = getPrice(
      room?.price_per_guest_night,
      settings.base_price_per_guest_night,
    );
    if (pricePerGuestNight === null) {
      return NextResponse.json(
        { error: "The homestay's pricing settings need to be checked." },
        { status: 500 },
      );
    }
    const estimatedAmount =
      Math.round(pricePerGuestNight * guestCount * nights * 100) / 100;

    // Always save the enquiry. A room hold is attempted only when a room was selected.
    const { data: enquiry, error: insertError } = await supabase
      .from("booking_enquiries")
      .insert({
        guest_name: guestName,
        phone,
        stay_slug: staySlug,
        check_in: checkIn,
        check_out: checkOut,
        guests: String(data.guests),
        estimated_amount: estimatedAmount,
        special_request: specialRequest || null,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertError) throw insertError;
    enquiryId = enquiry.id;

    if (!room) {
      return NextResponse.json({
        success: true,
        enquirySaved: true,
        holdCreated: false,
        estimateType: "base_rate",
        estimatedAmount,
        nights,
        roomName: null,
        message:
          "Enquiry saved using the homestay base rate. No room was held because no room was selected.",
      });
    }

    const { data: holdResult, error: holdError } = await supabase.rpc(
      "create_booking_hold",
      {
        p_enquiry_id: enquiryId,
        p_room_id: room.id,
        p_check_in: checkIn,
        p_check_out: checkOut,
        p_guests: guestCount,
      },
    );

    if (holdError || !holdResult?.success) {
      console.error("Room hold creation failed; enquiry retained:", {
        code: holdError?.code,
        message: holdError?.message,
      });
      // Keep the enquiry as pending so the guest's request is not lost.
      const errorText = String(
        holdResult?.error ?? holdResult?.message ?? "",
      ).toLowerCase();
      const conflict =
        holdError?.code === "23P01" ||
        errorText.includes("already held") ||
        errorText.includes("already booked") ||
        errorText.includes("unavailable");

      return NextResponse.json({
        success: true,
        enquirySaved: true,
        holdCreated: false,
        estimatedAmount,
        nights,
        roomName: room.room_name,
        message: conflict
          ? "Enquiry saved, but the room could not be held for those dates. Please confirm availability."
          : "Enquiry saved, but a temporary room hold could not be created. Please confirm availability.",
      });
    }

    return NextResponse.json({
      success: true,
      enquirySaved: true,
      holdCreated: true,
      estimatedAmount,
      nights,
      roomName: room.room_name,
      holdExpiresInMinutes: holdResult.expires_in_minutes,
    });
  } catch (error) {
    console.error("Booking enquiry request failed:", error);
    // Do not automatically cancel a successfully inserted enquiry merely because
    // a later operation failed; preserve the guest request for follow-up.
    return NextResponse.json(
      {
        error:
          "We couldn't process your enquiry. Please try again or continue through WhatsApp.",
      },
      { status: 500 },
    );
  }
}
