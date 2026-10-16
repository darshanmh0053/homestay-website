type TrustSectionProps = {
  stayName?: string;
  location?: string;
  amenities?: string[];
  food?: "meals" | "breakfast" | "confirm";
  experiences?: string[];
};

export default function TrustSection({
  stayName,
  location,
  amenities = [],
  food = "confirm",
  experiences = [],
}: TrustSectionProps) {
  const isPropertyPage = Boolean(stayName);

  const foodDescription = {
    meals:
      "Meals are available. Please confirm the menu and timings before booking.",
    breakfast:
      "Breakfast is available. Please confirm the menu and timings before booking.",
    confirm: "Please contact us to confirm available meals and timings.",
  };

  const bookingSteps = [
    {
      number: "01",
      title: "Choose your stay",
      description:
        "Explore our homestays and select the one that suits your trip.",
    },
    {
      number: "02",
      title: "Send your request",
      description: "Share your dates, guest count and contact details with us.",
    },
    {
      number: "03",
      title: "Confirm with us",
      description: "We will help confirm availability and booking details.",
    },
  ];

  return (
    <section className="bg-[#f7f5ef] px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        {isPropertyPage ? (
          <>
            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#71805c]">
                Plan your stay
              </p>

              <h2 className="text-2xl font-semibold text-[#263b2b] sm:text-3xl">
                Everything you need to know
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                Here are the key details for {stayName}. Contact us if you need
                to confirm anything before booking.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[#e7e5db] bg-white p-5">
                <h3 className="mb-3 font-semibold text-[#263b2b]">Location</h3>
                <p className="text-sm leading-6 text-gray-600">
                  {location || "Contact us for location details."}
                </p>
              </div>

              <div className="rounded-2xl border border-[#e7e5db] bg-white p-5">
                <h3 className="mb-3 font-semibold text-[#263b2b]">
                  Facilities
                </h3>

                {amenities.length > 0 ? (
                  <ul className="space-y-2 text-sm text-gray-600">
                    {amenities.map((amenity) => (
                      <li key={amenity} className="flex gap-2">
                        <span className="text-[#71805c]" aria-hidden="true">
                          ✓
                        </span>
                        <span>{amenity}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-6 text-gray-600">
                    Contact us to confirm the available facilities.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-[#e7e5db] bg-white p-5">
                <h3 className="mb-3 font-semibold text-[#263b2b]">
                  Food arrangements
                </h3>
                <p className="text-sm leading-6 text-gray-600">
                  {foodDescription[food]}
                </p>
              </div>

              <div className="rounded-2xl border border-[#e7e5db] bg-white p-5">
                <h3 className="mb-3 font-semibold text-[#263b2b]">
                  Local experiences
                </h3>

                {experiences.length > 0 ? (
                  <ul className="space-y-2 text-sm text-gray-600">
                    {experiences.map((experience) => (
                      <li key={experience} className="flex gap-2">
                        <span className="text-[#71805c]" aria-hidden="true">
                          ✓
                        </span>
                        <span>{experience}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-6 text-gray-600">
                    Contact us to ask about experiences nearby.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-8 max-w-2xl text-center">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#71805c]">
                Simple and personal
              </p>

              <h2 className="text-2xl font-semibold text-[#263b2b] sm:text-3xl">
                Booking your stay is easy
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
                Find your preferred homestay, send us your request, and connect
                with us to confirm the details.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {bookingSteps.map((step) => (
                <div
                  key={step.number}
                  className="rounded-2xl border border-[#e7e5db] bg-white p-5 sm:p-6"
                >
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#e7eadf] text-sm font-semibold text-[#344b35]">
                    {step.number}
                  </span>

                  <h3 className="font-semibold text-[#263b2b]">{step.title}</h3>

                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
