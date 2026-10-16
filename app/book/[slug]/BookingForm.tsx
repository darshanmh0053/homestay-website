"use client";

import { useEffect, useMemo, useState } from "react";

const WHATSAPP_NUMBER = "918073053664";
const SAVE_TIMEOUT_MS = 10_000;

type BookingFormProps = {
  staySlug: string;
  stayName: string;
  pricePerNight: number;
  initialCheckIn: string;
  initialCheckOut: string;
};

type Room = {
  id: string;
  room_name: string;
  description: string | null;
  max_guests: number;
  price_per_guest_night: number | string | null;
  amenities: string[] | null;
};

type BookingOptions = {
  settings: {
    stay_slug: string;
    display_name: string;
    base_price_per_guest_night: number | string;
    included_guests: number;
    max_guests_per_booking: number;
    is_active: boolean;
  };
  rooms: Room[];
};

type FormErrors = {
  name?: string;
  phone?: string;
  checkIn?: string;
  checkOut?: string;
  form?: string;
};

type MessageStatus = "idle" | "whatsapp-only" | "saved";

function formatRupees(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "To be confirmed";
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(value: string): string {
  if (!value) return "Not provided";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function todayLocalString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export default function BookingForm({
  staySlug,
  stayName,
  pricePerNight,
  initialCheckIn,
  initialCheckOut,
}: BookingFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState("2");
  const [requests, setRequests] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");

  const [bookingOptions, setBookingOptions] = useState<BookingOptions | null>(
    null,
  );
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [messageStatus, setMessageStatus] = useState<MessageStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadBookingOptions() {
      try {
        const response = await fetch(
          `/api/booking-enquiries?staySlug=${encodeURIComponent(staySlug)}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) throw new Error("Could not load room options.");
        const result = (await response.json()) as BookingOptions;
        if (!result || !Array.isArray(result.rooms) || !result.settings) {
          throw new Error("Invalid room options response.");
        }
        setBookingOptions(result);
        setSelectedRoomId((current) =>
          result.rooms.some((room) => room.id === current) ? current : "",
        );
        if (result.rooms.length === 0) {
          setOptionsError(
            "Room details are not available yet. You can still enquire via WhatsApp.",
          );
        } else {
          setOptionsError("");
        }
      } catch {
        if (!controller.signal.aborted) {
          setOptionsError(
            "Room details could not be loaded. You can still enquire via WhatsApp.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setOptionsLoading(false);
      }
    }

    void loadBookingOptions();
    return () => controller.abort();
  }, [staySlug]);

  const selectedRoom =
    bookingOptions?.rooms.find((room) => room.id === selectedRoomId) ?? null;
  // Use the selected room's per-guest nightly rate when a room is chosen.
  // Without a room, use the stay's displayed guest price (pricePerNight), not the settings base rate.
  const configuredRoomPrice =
    selectedRoom?.price_per_guest_night == null
      ? Number(pricePerNight)
      : Number(selectedRoom.price_per_guest_night);
  const guestCount = guests === "9+" ? 9 : Number(guests);

  const nights = useMemo(() => {
    if (!isValidDate(checkIn) || !isValidDate(checkOut) || checkOut <= checkIn)
      return 0;
    return Math.round(
      (new Date(`${checkOut}T00:00:00Z`).getTime() -
        new Date(`${checkIn}T00:00:00Z`).getTime()) /
        86_400_000,
    );
  }, [checkIn, checkOut]);

  const estimatedTotal =
    nights > 0 &&
    Number.isFinite(configuredRoomPrice) &&
    configuredRoomPrice >= 0
      ? Math.round(configuredRoomPrice * guestCount * nights * 100) / 100
      : 0;

  const maximumGuests = Math.min(
    Number(bookingOptions?.settings.max_guests_per_booking ?? 10),
    Number(selectedRoom?.max_guests ?? 10),
  );
  const roomCanAccommodateGuests =
    selectedRoom !== null && guestCount <= maximumGuests;
  const todayString = todayLocalString();

  const inputClass =
    "mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-[15px] text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10";
  const errorClass = "mt-1.5 text-sm text-red-600";

  function validateRequiredFields(): boolean {
    const nextErrors: FormErrors = {};
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const digits = trimmedPhone.replace(/\D/g, "");

    if (!trimmedName) nextErrors.name = "Please enter your full name.";
    else if (trimmedName.length < 2 || trimmedName.length > 100) {
      nextErrors.name = "Your name must contain 2–100 characters.";
    }

    if (!trimmedPhone) nextErrors.phone = "Please enter your contact number.";
    else if (
      !/^[0-9+()\s-]+$/.test(trimmedPhone) ||
      digits.length < 8 ||
      digits.length > 15
    ) {
      nextErrors.phone = "Enter a valid phone number with 8–15 digits.";
    }

    if (!checkIn) nextErrors.checkIn = "Please select your check-in date.";
    else if (!isValidDate(checkIn))
      nextErrors.checkIn = "Please enter a valid check-in date.";
    else if (checkIn < todayString)
      nextErrors.checkIn = "Check-in cannot be in the past.";

    if (!checkOut) nextErrors.checkOut = "Please select your check-out date.";
    else if (!isValidDate(checkOut))
      nextErrors.checkOut = "Please enter a valid check-out date.";
    else if (isValidDate(checkIn) && checkOut <= checkIn) {
      nextErrors.checkOut = "Check-out must be after check-in.";
    } else if (checkOut < todayString) {
      nextErrors.checkOut = "Check-out cannot be in the past.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function buildWhatsAppMessage(databaseSaved: boolean): string {
    const lines = [
      "Hello Malnad Nest Homestay!",
      "",
      "I would like to enquire about a stay.",
      "",
      `Homestay: ${stayName}`,
      `Name: ${name.trim()}`,
      `Contact number: ${phone.trim()}`,
      `Room: ${selectedRoom?.room_name ?? "Not selected - please help me choose"}`,
      `Check-in: ${formatDate(checkIn)}`,
      `Check-out: ${formatDate(checkOut)}`,
      `Number of nights: ${nights > 0 ? nights : "To be confirmed"}`,
      `Number of guests: ${guests}`,
    ];

    if (
      Number.isFinite(configuredRoomPrice) &&
      configuredRoomPrice >= 0 &&
      nights > 0
    ) {
      lines.push(
        `Estimated rate per guest per night: ${formatRupees(configuredRoomPrice)}`,
      );
      lines.push(`Estimated total: ${formatRupees(estimatedTotal)}`);
      if (!selectedRoom) {
        lines.push(
          "Estimate uses the homestay base rate because I have not selected a room.",
        );
      }
    } else {
      lines.push("Price: Please confirm the applicable rate.");
    }

    lines.push("", `Special requests: ${requests.trim() || "None"}`, "");
    if (databaseSaved) {
      lines.push(
        "My enquiry was saved online. Please confirm availability and final pricing.",
        "I understand this is an enquiry and the reservation is not confirmed yet.",
      );
    } else {
      lines.push(
        "Please check availability and confirm the price and reservation.",
        "The online save could not be confirmed, so please use this WhatsApp enquiry.",
        "No room is confirmed or held by this WhatsApp message.",
      );
    }
    return lines.join("\n");
  }

  function openWhatsApp(whatsappWindow: Window | null, databaseSaved: boolean) {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsAppMessage(databaseSaved))}`;
    setMessageStatus(databaseSaved ? "saved" : "whatsapp-only");
    if (whatsappWindow && !whatsappWindow.closed) {
      whatsappWindow.location.replace(url);
    } else {
      window.location.assign(url);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setMessageStatus("idle");
    setStatusMessage("");
    if (!validateRequiredFields()) {
      setErrors((current) => ({
        ...current,
        form: "Please complete the required fields highlighted below.",
      }));
      return;
    }

    // Open synchronously from the click so popup blockers are less likely to block WhatsApp.
    const whatsappWindow = window.open("about:blank", "_blank");
    const selectedRoomIsValid =
      !selectedRoomId ||
      (Boolean(selectedRoom) &&
        roomCanAccommodateGuests &&
        bookingOptions?.rooms.some((room) => room.id === selectedRoomId) ===
          true);

    const completeForDatabase =
      Boolean(bookingOptions?.settings.is_active) &&
      nights >= 1 &&
      nights <= 90 &&
      selectedRoomIsValid;

    // Room selection is optional. If booking settings are unavailable, keep WhatsApp available.
    if (
      !completeForDatabase ||
      optionsLoading ||
      !bookingOptions ||
      optionsError
    ) {
      openWhatsApp(whatsappWindow, false);
      return;
    }

    setSaving(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      SAVE_TIMEOUT_MS,
    );

    try {
      const response = await fetch("/api/booking-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          guestName: name.trim(),
          phone: phone.trim(),
          staySlug,
          roomId: selectedRoomId || null,
          checkIn,
          checkOut,
          guests,
          specialRequest: requests.trim(),
        }),
      });

      let result: { error?: string; success?: boolean } = {};
      try {
        result = await response.json();
      } catch {
        // Continue to WhatsApp if the API didn't return JSON.
      }

      if (response.ok && result.success) {
        setStatusMessage(
          selectedRoom
            ? "Your enquiry was saved. Please review and send the WhatsApp message. Any room hold is temporary and your stay still needs confirmation."
            : "Your enquiry and base-rate estimate were saved. No room was held because you have not selected one. Please review and send the WhatsApp message.",
        );
        openWhatsApp(whatsappWindow, true);
      } else {
        setStatusMessage(
          "The enquiry could not be saved online. You can still send it through WhatsApp.",
        );
        openWhatsApp(whatsappWindow, false);
      }
    } catch {
      setStatusMessage(
        "The online save timed out or failed. Your WhatsApp enquiry can still continue.",
      );
      openWhatsApp(whatsappWindow, false);
    } finally {
      window.clearTimeout(timeoutId);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div>
          <label
            htmlFor="booking-name"
            className="block text-sm font-semibold tracking-wide text-stone-800"
          >
            Full name <span className="text-red-600">*</span>
          </label>
          <input
            id="booking-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({
                ...current,
                name: undefined,
                form: undefined,
              }));
              setMessageStatus("idle");
            }}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "booking-name-error" : undefined}
            placeholder="Enter your full name"
            className={`${inputClass} ${errors.name ? "border-red-500" : ""}`}
            required
          />
          {errors.name && (
            <p id="booking-name-error" className={errorClass}>
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="booking-phone"
            className="block text-sm font-semibold tracking-wide text-stone-800"
          >
            Contact number <span className="text-red-600">*</span>
          </label>
          <input
            id="booking-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              setErrors((current) => ({
                ...current,
                phone: undefined,
                form: undefined,
              }));
              setMessageStatus("idle");
            }}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "booking-phone-error" : undefined}
            placeholder="Enter your phone number"
            className={`${inputClass} ${errors.phone ? "border-red-500" : ""}`}
            required
          />
          {errors.phone && (
            <p id="booking-phone-error" className={errorClass}>
              {errors.phone}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="booking-room"
            className="block text-sm font-semibold tracking-wide text-stone-800"
          >
            Choose a room{" "}
            <span className="font-normal text-stone-500">(optional)</span>
          </label>
          {optionsLoading ? (
            <p className="mt-2 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
              Loading room options… You can still enquire via WhatsApp.
            </p>
          ) : (
            <select
              id="booking-room"
              value={selectedRoomId}
              onChange={(event) => {
                setSelectedRoomId(event.target.value);
                setErrors((current) => ({ ...current, form: undefined }));
                setMessageStatus("idle");
              }}
              className={inputClass}
            >
              <option value="">No room selected / Help me choose</option>
              {(bookingOptions?.rooms ?? []).map((room) => (
                <option key={room.id} value={room.id}>
                  {room.room_name} · up to {room.max_guests} guests
                </option>
              ))}
            </select>
          )}
          {optionsError && (
            <p className="mt-2 text-sm text-amber-800" role="status">
              {optionsError}
            </p>
          )}
          {selectedRoom && (
            <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-5">
              <p className="font-semibold text-stone-900">
                {selectedRoom.room_name}
              </p>
              {selectedRoom.description && (
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  {selectedRoom.description}
                </p>
              )}
              <p className="mt-2 text-sm text-stone-600">
                Capacity: up to {selectedRoom.max_guests} guests
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-900">
                {formatRupees(configuredRoomPrice)} per guest per night
              </p>
              {(selectedRoom.amenities ?? []).length > 0 && (
                <p className="mt-2 text-sm text-stone-600">
                  Amenities: {(selectedRoom.amenities ?? []).join(", ")}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="booking-checkin"
              className="block text-sm font-semibold tracking-wide text-stone-800"
            >
              Check-in <span className="text-red-600">*</span>
            </label>
            <input
              id="booking-checkin"
              type="date"
              min={todayString}
              value={checkIn}
              onChange={(event) => {
                setCheckIn(event.target.value);
                setErrors((current) => ({
                  ...current,
                  checkIn: undefined,
                  checkOut: undefined,
                  form: undefined,
                }));
                setMessageStatus("idle");
              }}
              aria-invalid={Boolean(errors.checkIn)}
              aria-describedby={
                errors.checkIn ? "booking-checkin-error" : undefined
              }
              className={`${inputClass} ${errors.checkIn ? "border-red-500" : ""}`}
              required
            />
            {errors.checkIn && (
              <p id="booking-checkin-error" className={errorClass}>
                {errors.checkIn}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="booking-checkout"
              className="block text-sm font-semibold tracking-wide text-stone-800"
            >
              Check-out <span className="text-red-600">*</span>
            </label>
            <input
              id="booking-checkout"
              type="date"
              min={checkIn || todayString}
              value={checkOut}
              onChange={(event) => {
                setCheckOut(event.target.value);
                setErrors((current) => ({
                  ...current,
                  checkOut: undefined,
                  form: undefined,
                }));
                setMessageStatus("idle");
              }}
              aria-invalid={Boolean(errors.checkOut)}
              aria-describedby={
                errors.checkOut ? "booking-checkout-error" : undefined
              }
              className={`${inputClass} ${errors.checkOut ? "border-red-500" : ""}`}
              required
            />
            {errors.checkOut && (
              <p id="booking-checkout-error" className={errorClass}>
                {errors.checkOut}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="booking-guests"
            className="block text-sm font-semibold tracking-wide text-stone-800"
          >
            Number of guests
          </label>
          <select
            id="booking-guests"
            value={guests}
            onChange={(event) => {
              setGuests(event.target.value);
              setMessageStatus("idle");
              setErrors({});
            }}
            className={inputClass}
          >
            <option value="1">1 guest</option>
            <option value="2">2 guests</option>
            <option value="3">3 guests</option>
            <option value="4">4 guests</option>
            <option value="5">5 guests</option>
            <option value="6">6 guests</option>
            <option value="7">7 guests</option>
            <option value="8">8 guests</option>
            <option value="9+">9+ guests</option>
          </select>
          {selectedRoom && !roomCanAccommodateGuests && (
            <p className={errorClass}>
              This room accommodates up to {maximumGuests} guests. You can still
              enquire via WhatsApp, but a room hold cannot be created for this
              guest count.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="booking-requests"
            className="block text-sm font-semibold tracking-wide text-stone-800"
          >
            Special requests{" "}
            <span className="font-normal text-stone-500">(optional)</span>
          </label>
          <textarea
            id="booking-requests"
            value={requests}
            onChange={(event) => {
              setRequests(event.target.value);
              setMessageStatus("idle");
            }}
            rows={4}
            maxLength={1000}
            placeholder="Meal preferences, arrival time, or other requests"
            className={inputClass}
          />
        </div>

        {nights > 0 && (
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-stone-50 p-5 sm:p-6">
            <h3 className="font-serif text-xl font-semibold text-emerald-950">
              Your booking summary
            </h3>
            {selectedRoom && (
              <p className="mt-1 text-sm text-stone-600">
                Room: {selectedRoom.room_name}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between gap-4 text-sm text-stone-600">
              <span>Duration</span>
              <span>
                {nights} {nights === 1 ? "night" : "nights"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 text-sm text-stone-600">
              <span>Guests</span>
              <span>{guests === "1" ? "1 guest" : `${guests} guests`}</span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-emerald-100 pt-4 font-semibold text-stone-900">
              <span>Estimated total</span>
              <span className="text-xl text-emerald-900">
                {nights > 0 &&
                Number.isFinite(configuredRoomPrice) &&
                configuredRoomPrice >= 0
                  ? formatRupees(estimatedTotal)
                  : "Enter valid dates"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              {selectedRoom
                ? "Estimate based on the selected room rate, guest count, and nights."
                : "Estimate based on the displayed guest price × guests × nights. Final price and availability will be confirmed by the homestay."}{" "}
              This is an estimate only.
            </p>
          </div>
        )}

        {errors.form && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {errors.form}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="group flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#294532] to-[#426b50] px-6 py-4 text-base font-bold tracking-wide text-white shadow-lg shadow-emerald-950/15 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-700/20 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70"
        >
          {saving ? (
            <>
              <span
                className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
              Saving enquiry (up to 10 seconds)…
            </>
          ) : (
            <>
              Enquire via WhatsApp{" "}
              <span
                aria-hidden="true"
                className="text-xl transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </>
          )}
        </button>

        <p className="text-center text-xs leading-6 text-stone-500">
          Fields marked * are required. We try to save your enquiry first, but
          WhatsApp will still open if the online save fails or takes more than
          10 seconds. Your reservation is not confirmed until we confirm it.
        </p>
      </form>

      {messageStatus !== "idle" && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl border p-5 text-sm ${messageStatus === "saved" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}
        >
          <h3 className="font-semibold">
            {messageStatus === "saved"
              ? "Enquiry saved"
              : "Continue with WhatsApp"}
          </h3>
          <p className="mt-2 leading-6">
            {statusMessage ||
              (messageStatus === "saved"
                ? "The enquiry was saved. Please review and send the WhatsApp message; the stay still needs confirmation."
                : "The online save could not be confirmed. Please send the WhatsApp message so the homestay can check availability and pricing.")}
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsAppMessage(messageStatus === "saved"))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-900 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800"
          >
            Open WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
