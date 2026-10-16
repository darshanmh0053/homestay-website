import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/supabase-admin";
import { createServiceClient } from "@/lib/supabase-service";

const ALLOWED_STATUSES = ["pending", "confirmed", "cancelled"] as const;

type BookingStatus = (typeof ALLOWED_STATUSES)[number];

type BookingDates = {
  id: string | number;
  stay_slug: string;
  check_in: string;
  check_out: string;
  status: string | null;
};

function isValidDateRange(checkIn: string, checkOut: string): boolean {
  const start = new Date(`${checkIn}T00:00:00.000Z`);
  const end = new Date(`${checkOut}T00:00:00.000Z`);

  return (
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    /^\d{4}-\d{2}-\d{2}$/.test(checkIn) &&
    /^\d{4}-\d{2}-\d{2}$/.test(checkOut) &&
    start.toISOString().slice(0, 10) === checkIn &&
    end.toISOString().slice(0, 10) === checkOut &&
    end > start
  );
}

function datesOverlap(
  firstCheckIn: string,
  firstCheckOut: string,
  secondCheckIn: string,
  secondCheckOut: string,
): boolean {
  return firstCheckIn < secondCheckOut && secondCheckIn < firstCheckOut;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in again." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    if (!id || id.length > 100) {
      return NextResponse.json(
        { error: "Invalid enquiry ID." },
        { status: 400 },
      );
    }

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      !("status" in body) ||
      typeof body.status !== "string" ||
      !ALLOWED_STATUSES.includes(body.status as BookingStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid booking status." },
        { status: 400 },
      );
    }

    const newStatus = body.status as BookingStatus;
    const serviceClient = createServiceClient();

    const { data: currentBooking, error: currentBookingError } =
      await serviceClient
        .from("booking_enquiries")
        .select("id, stay_slug, check_in, check_out, status")
        .eq("id", id)
        .maybeSingle();

    if (currentBookingError) {
      console.error("Could not load booking:", currentBookingError.message);

      return NextResponse.json(
        { error: "Could not verify this booking. Please try again." },
        { status: 500 },
      );
    }

    if (!currentBooking) {
      return NextResponse.json(
        { error: "Booking enquiry not found." },
        { status: 404 },
      );
    }

    if (
      newStatus === "confirmed" &&
      (!currentBooking.stay_slug ||
        !isValidDateRange(currentBooking.check_in, currentBooking.check_out))
    ) {
      return NextResponse.json(
        { error: "This enquiry has invalid stay or date details." },
        { status: 400 },
      );
    }

    // Preserve the existing confirmed-booking conflict check.
    if (newStatus === "confirmed") {
      const { data: confirmedBookings, error } = await serviceClient
        .from("booking_enquiries")
        .select("id, stay_slug, check_in, check_out, status")
        .eq("stay_slug", currentBooking.stay_slug)
        .eq("status", "confirmed")
        .neq("id", id);

      if (error) {
        console.error("Conflict check failed:", error.message);

        return NextResponse.json(
          { error: "Could not verify availability. No changes were made." },
          { status: 500 },
        );
      }

      const conflict = (confirmedBookings ?? []).find(
        (booking: BookingDates) =>
          isValidDateRange(booking.check_in, booking.check_out) &&
          datesOverlap(
            currentBooking.check_in,
            currentBooking.check_out,
            booking.check_in,
            booking.check_out,
          ),
      );

      if (conflict) {
        return NextResponse.json(
          {
            error:
              "These dates overlap another confirmed booking for this homestay. Review the existing reservations first.",
            conflict: {
              id: String(conflict.id),
              check_in: conflict.check_in,
              check_out: conflict.check_out,
            },
          },
          { status: 409 },
        );
      }
    }

    // Load the holds associated with this enquiry.
    const { data: holds, error: holdsError } = await serviceClient
      .from("booking_holds")
      .select("id, hold_status, expires_at")
      .or(`enquiry_uuid.eq.${id},enquiry_id.eq.${id}`);

    if (holdsError) {
      console.error("Could not load booking holds:", holdsError.message);

      return NextResponse.json(
        { error: "Could not verify the room hold. No changes were made." },
        { status: 500 },
      );
    }

    if (newStatus === "confirmed") {
      const now = Date.now();

      const validHold = (holds ?? []).find(
        (hold) =>
          hold.hold_status === "confirmed" ||
          (hold.hold_status === "pending" &&
            new Date(hold.expires_at).getTime() > now),
      );

      if (!validHold) {
        return NextResponse.json(
          {
            error:
              "This enquiry has no active room hold. Please create a new valid hold before confirming it.",
          },
          { status: 409 },
        );
      }

      if (validHold.hold_status === "pending") {
        const { error } = await serviceClient
          .from("booking_holds")
          .update({ hold_status: "confirmed" })
          .eq("id", validHold.id)
          .eq("hold_status", "pending")
          .gt("expires_at", new Date().toISOString());

        if (error) {
          console.error("Could not confirm room hold:", error.message);

          return NextResponse.json(
            { error: "Could not confirm the room hold. Please try again." },
            { status: 500 },
          );
        }
      }
    } else {
      // Cancelled or returned to pending: release all holds that
      // are currently pending or confirmed for this enquiry.
      const activeHoldIds = (holds ?? [])
        .filter(
          (hold) =>
            hold.hold_status === "pending" || hold.hold_status === "confirmed",
        )
        .map((hold) => hold.id);

      if (activeHoldIds.length > 0) {
        const { error } = await serviceClient
          .from("booking_holds")
          .update({
            hold_status: "released",
            released_at: new Date().toISOString(),
          })
          .in("id", activeHoldIds);

        if (error) {
          console.error("Could not release room hold:", error.message);

          return NextResponse.json(
            {
              error:
                "Could not release the room hold. The enquiry status was not changed.",
            },
            { status: 500 },
          );
        }
      }
    }

    const { data, error } = await serviceClient
      .from("booking_enquiries")
      .update({ status: newStatus })
      .eq("id", id)
      .select("id, status")
      .maybeSingle();

    if (error || !data) {
      console.error(
        "Booking status update failed:",
        error?.message ?? "Enquiry not found",
      );

      return NextResponse.json(
        {
          error:
            "The enquiry status could not be updated. Please verify the hold and enquiry records.",
        },
        { status: error ? 500 : 404 },
      );
    }

    return NextResponse.json({ enquiry: data });
  } catch (error) {
    console.error("Admin status API request failed:", error);

    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in again." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    if (!id || id.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid enquiry ID." },
        { status: 400 },
      );
    }

    const db = createServiceClient();
    const { data: enquiry, error: enquiryError } = await db
      .from("booking_enquiries")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (enquiryError) {
      console.error(
        "Could not verify enquiry before deletion:",
        enquiryError.message,
      );
      return NextResponse.json(
        { error: "Could not verify this enquiry." },
        { status: 500 },
      );
    }
    if (!enquiry)
      return NextResponse.json(
        { error: "Enquiry not found." },
        { status: 404 },
      );

    const { data: holds, error: holdsError } = await db
      .from("booking_holds")
      .select("id, hold_status")
      .or(`enquiry_uuid.eq.${id},enquiry_id.eq.${id}`);
    if (holdsError) {
      console.error(
        "Could not load holds before deletion:",
        holdsError.message,
      );
      return NextResponse.json(
        {
          error: "Could not verify associated room holds. Nothing was deleted.",
        },
        { status: 500 },
      );
    }

    const activeIds = (holds ?? [])
      .filter(
        (hold) =>
          hold.hold_status === "pending" || hold.hold_status === "confirmed",
      )
      .map((hold) => hold.id);
    if (activeIds.length) {
      const { error: releaseError } = await db
        .from("booking_holds")
        .update({
          hold_status: "released",
          released_at: new Date().toISOString(),
        })
        .in("id", activeIds);
      if (releaseError) {
        console.error(
          "Could not release holds before deletion:",
          releaseError.message,
        );
        return NextResponse.json(
          {
            error:
              "Could not release associated room holds. Nothing was deleted.",
          },
          { status: 500 },
        );
      }
    }

    const { error: deleteError } = await db
      .from("booking_enquiries")
      .delete()
      .eq("id", id);
    if (deleteError) {
      console.error("Enquiry deletion failed:", deleteError.message);
      return NextResponse.json(
        {
          error:
            "Could not delete this enquiry. Its room holds were released if active.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("Admin enquiry deletion failed:", error);
    return NextResponse.json(
      { error: "Server error while deleting enquiry." },
      { status: 500 },
    );
  }
}
