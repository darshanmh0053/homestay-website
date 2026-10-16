import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getAdminUser } from "@/lib/supabase-admin";
import { createServiceClient } from "@/lib/supabase-service";

function escapeCsv(value: unknown): string {
  let text = value == null ? "" : String(value);

  // Protect against spreadsheet formula injection.
  if (/^[\t\r ]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  // This route depends on the current user's cookies and session.
  // Defer request-dependent work until an actual request arrives.
  await connection();

  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in as an administrator." },
        { status: 401 },
      );
    }

    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient
      .from("booking_enquiries")
      .select(
        "id, guest_name, phone, stay_slug, check_in, check_out, guests, estimated_amount, special_request, status, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Booking CSV export failed:", error.message);

      return NextResponse.json(
        { error: "Could not export booking enquiries." },
        { status: 500 },
      );
    }

    const headers = [
      "Enquiry ID",
      "Guest Name",
      "Phone",
      "Homestay",
      "Check-in",
      "Check-out",
      "Guests",
      "Estimated Amount",
      "Special Request",
      "Status",
      "Enquiry Created At",
    ];

    const rows = (data ?? []).map((booking) =>
      [
        booking.id,
        booking.guest_name,
        booking.phone,
        booking.stay_slug,
        booking.check_in,
        booking.check_out,
        booking.guests,
        booking.estimated_amount,
        booking.special_request,
        booking.status || "pending",
        booking.created_at,
      ]
        .map(escapeCsv)
        .join(","),
    );

    const csv = [headers.map(escapeCsv).join(","), ...rows].join("\r\n");

    return new Response("\uFEFF" + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="malnad-nest-booking-enquiries.csv"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Booking CSV export request failed:", error);

    return NextResponse.json(
      { error: "Server error while exporting enquiries." },
      { status: 500 },
    );
  }
}
