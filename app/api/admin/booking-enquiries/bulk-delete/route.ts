import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase-admin";
import { createServiceClient } from "@/lib/supabase-service";

type DateRange = {
  startDate: string;
  endDate: string;
  startIso: string;
  endExclusiveIso: string;
};

function isValidCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function makeDateRange(from: unknown, to: unknown): DateRange | null {
  if (!isValidCalendarDate(from) || !isValidCalendarDate(to) || from > to)
    return null;

  // Use India-local calendar dates; convert midnight boundaries to UTC for timestamptz.
  const [endYear, endMonth, endDay] = to.split("-").map(Number);
  const nextDayUtc = new Date(Date.UTC(endYear, endMonth - 1, endDay + 1));
  const nextDate = [
    nextDayUtc.getUTCFullYear(),
    String(nextDayUtc.getUTCMonth() + 1).padStart(2, "0"),
    String(nextDayUtc.getUTCDate()).padStart(2, "0"),
  ].join("-");

  return {
    startDate: from,
    endDate: to,
    startIso: new Date(`${from}T00:00:00+05:30`).toISOString(),
    endExclusiveIso: new Date(`${nextDate}T00:00:00+05:30`).toISOString(),
  };
}

function invalidRangeResponse() {
  return NextResponse.json(
    {
      error:
        "Provide valid from and to dates (YYYY-MM-DD), with from on or before to.",
    },
    { status: 400 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin)
      return NextResponse.json(
        { error: "Unauthorized. Please sign in again." },
        { status: 401 },
      );

    const range = makeDateRange(
      request.nextUrl.searchParams.get("from"),
      request.nextUrl.searchParams.get("to"),
    );
    if (!range) return invalidRangeResponse();

    const db = createServiceClient();
    const { count, error } = await db
      .from("booking_enquiries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", range.startIso)
      .lt("created_at", range.endExclusiveIso);

    if (error) {
      console.error("Bulk delete preview failed:", error.message);
      return NextResponse.json(
        { error: "Could not count enquiries for the selected date range." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      count: count ?? 0,
      startDate: range.startDate,
      endDate: range.endDate,
    });
  } catch (error) {
    console.error("Bulk delete preview error:", error);
    return NextResponse.json(
      { error: "Could not prepare the bulk-delete preview." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin)
      return NextResponse.json(
        { error: "Unauthorized. Please sign in again." },
        { status: 401 },
      );

    let body: { from?: unknown; to?: unknown };
    try {
      body = await request.json();
    } catch {
      return invalidRangeResponse();
    }

    const range = makeDateRange(body.from, body.to);
    if (!range) return invalidRangeResponse();

    const db = createServiceClient();
    const { data: enquiries, error: listError } = await db
      .from("booking_enquiries")
      .select("id")
      .gte("created_at", range.startIso)
      .lt("created_at", range.endExclusiveIso);

    if (listError) {
      console.error("Bulk delete query failed:", listError.message);
      return NextResponse.json(
        {
          error: "Could not load enquiries for deletion. Nothing was deleted.",
        },
        { status: 500 },
      );
    }

    const ids = (enquiries ?? []).map((item) => String(item.id));
    if (!ids.length) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        startDate: range.startDate,
        endDate: range.endDate,
      });
    }

    // Release associated active holds before deleting the enquiries.
    for (const id of ids) {
      const { data: holds, error: holdReadError } = await db
        .from("booking_holds")
        .select("id, hold_status")
        .or(`enquiry_uuid.eq.${id},enquiry_id.eq.${id}`);

      if (holdReadError) {
        console.error("Bulk delete hold lookup failed:", holdReadError.message);
        return NextResponse.json(
          {
            error:
              "Could not verify associated room holds. No enquiries were deleted; review any holds already released.",
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
            "Bulk delete hold release failed:",
            releaseError.message,
          );
          return NextResponse.json(
            {
              error:
                "Could not release all associated room holds. Enquiries were not deleted; review any holds already released.",
            },
            { status: 500 },
          );
        }
      }
    }

    const { data: deleted, error: deleteError } = await db
      .from("booking_enquiries")
      .delete()
      .in("id", ids)
      .select("id");

    if (deleteError) {
      console.error("Bulk enquiry deletion failed:", deleteError.message);
      return NextResponse.json(
        {
          error:
            "Could not delete the enquiries. Some associated holds may already have been released.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: deleted?.length ?? ids.length,
      startDate: range.startDate,
      endDate: range.endDate,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { error: "Server error while deleting enquiries." },
      { status: 500 },
    );
  }
}
