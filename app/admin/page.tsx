import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/supabase-admin";
import { createServiceClient } from "@/lib/supabase-service";
import BookingEnquiriesTable from "./booking-enquiries-table";
import BookingCalendar from "./booking-calendar";
export const instant = false;

export const metadata = {
  title: "Admin Dashboard | Malnad Nest Homestay",
};

export default async function AdminDashboardPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const { user } = admin;
  const serviceClient = createServiceClient();

  const { data: enquiries, error } = await serviceClient
    .from("booking_enquiries")
    .select(
      "id, guest_name, phone, stay_slug, check_in, check_out, guests, estimated_amount, special_request, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const bookings = enquiries ?? [];

  const pendingCount = bookings.filter(
    (booking) => (booking.status || "pending").toLowerCase() === "pending",
  ).length;

  const confirmedCount = bookings.filter(
    (booking) => (booking.status || "pending").toLowerCase() === "confirmed",
  ).length;

  const cancelledCount = bookings.filter(
    (booking) => (booking.status || "pending").toLowerCase() === "cancelled",
  ).length;

  const summaryCards = [
    {
      title: "Total enquiries",
      count: bookings.length,
      description: "Latest enquiries loaded",
      style: "border-stone-200 bg-white",
    },
    {
      title: "Pending",
      count: pendingCount,
      description: "Awaiting a decision",
      style: "border-amber-200 bg-amber-50",
    },
    {
      title: "Confirmed",
      count: confirmedCount,
      description: "Bookings confirmed",
      style: "border-emerald-200 bg-emerald-50",
    },
    {
      title: "Cancelled",
      count: cancelledCount,
      description: "Cancelled enquiries",
      style: "border-rose-200 bg-rose-50",
    },
  ];

  const calendarBookings = bookings.map((booking) => ({
    id: String(booking.id),
    guest_name: booking.guest_name ?? "",
    phone: booking.phone ?? "",
    stay_slug: booking.stay_slug ?? "",
    check_in: booking.check_in ?? "",
    check_out: booking.check_out ?? "",
    guests: Number(booking.guests ?? 0),
    estimated_amount: booking.estimated_amount ?? null,
    status: booking.status ?? "pending",
    special_request: booking.special_request ?? "",
  }));

  const navigationCards = [
    {
      title: "Homestay Listings",
      description: "Add, edit, and manage your homestay properties.",
      action: "Manage properties",
      href: "/admin/homestays",
      icon: "⌂",
    },
    {
      title: "Rooms & Pricing",
      description: "Configure rooms, capacity, room counts, and rates.",
      action: "Manage rooms",
      href: "/admin/settings#rooms",
      icon: "▤",
    },
    {
      title: "Booking Settings",
      description: "Manage guest limits, booking prices, and hold duration.",
      action: "Configure bookings",
      href: "/admin/settings#booking-settings",
      icon: "⚙",
    },
  ];

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-stone-900 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-800">
              Malnad Nest Homestay
            </p>

            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Admin Dashboard
            </h1>

            <p className="mt-2 break-all text-sm text-stone-600">
              Signed in as {user.email}
            </p>
          </div>

          <form action="/admin/logout" method="post">
            <button
              type="submit"
              className="w-full rounded-lg border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 sm:w-auto"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Quick Navigation</h2>
            <p className="mt-1 text-sm text-stone-600">
              Manage your properties and booking configuration.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {navigationCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group flex min-h-52 flex-col rounded-2xl border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl text-emerald-800">
                    {card.icon}
                  </span>

                  <span
                    aria-hidden="true"
                    className="text-xl text-stone-400 transition group-hover:translate-x-1 group-hover:text-emerald-800"
                  >
                    →
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-semibold">{card.title}</h3>

                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {card.description}
                </p>

                <span className="mt-auto pt-5 text-sm font-semibold text-emerald-800">
                  {card.action} →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {error ? (
          <p className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load booking enquiries. Please check the database
            configuration.
          </p>
        ) : (
          <section
            aria-label="Booking summary"
            className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4"
          >
            {summaryCards.map((card) => (
              <article
                key={card.title}
                className={`rounded-2xl border p-4 sm:p-5 ${card.style}`}
              >
                <p className="text-sm font-medium text-stone-600">
                  {card.title}
                </p>

                <p className="mt-3 text-2xl font-semibold sm:text-3xl">
                  {card.count}
                </p>

                <p className="mt-2 text-xs text-stone-500">
                  {card.description}
                </p>
              </article>
            ))}
          </section>
        )}

        {!error && <BookingCalendar bookings={calendarBookings} />}

        <section
          id="booking-enquiries"
          className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Booking Enquiries</h2>

            <p className="mt-1 text-sm text-stone-600">
              Search, filter, contact guests, and manage booking requests.
            </p>
          </div>

          {error ? (
            <p className="rounded-lg bg-stone-50 p-6 text-sm text-stone-600">
              Booking enquiries could not be displayed.
            </p>
          ) : (
            <BookingEnquiriesTable bookings={calendarBookings} />
          )}
        </section>

        <p className="mt-5 text-center text-xs text-stone-500">
          Admin access is restricted to the authorized email address.
        </p>
      </div>
    </main>
  );
}
