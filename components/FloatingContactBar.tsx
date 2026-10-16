const phoneNumber = "+917483312976";
const whatsappMessage =
  "Hi Malnad Nest! I'm interested in enquiring about a stay. Could you please share availability, pricing, and details? Thank you.";
const whatsappUrl = `https://wa.me/917483312976?text=${encodeURIComponent(whatsappMessage)}`;
const instagramUrl = "https://www.instagram.com/malnadnests/";

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="currentColor"
    >
      <path d="M20.52 3.48A11.8 11.8 0 0 0 12.13 0C5.57 0 .23 5.34.23 11.9c0 2.1.55 4.16 1.6 5.98L.12 24l6.28-1.65a11.9 11.9 0 0 0 5.72 1.46h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.51-8.43ZM12.13 21.8h-.01a9.88 9.88 0 0 1-5.03-1.38l-.36-.21-3.73.98.99-3.64-.24-.37a9.86 9.86 0 0 1-1.52-5.28c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.13 1.03 6.99 2.9a9.83 9.83 0 0 1 2.9 7c0 5.46-4.44 9.9-9.89 9.9Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.2 18.8a19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 3.18 2 2 0 0 1 4.09 1h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.63 2.62a2 2 0 0 1-.45 2.11L8 8.72a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.84.3 1.72.51 2.62.63A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

const linkClass =
  "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:h-14 sm:w-14";

export default function FloatingContactBar() {
  return (
    <nav
      aria-label="Contact Malnad Nest"
      className="fixed bottom-5 right-4 z-[100] flex flex-col gap-3 sm:bottom-7 sm:right-6"
    >
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Enquire with Malnad Nest on WhatsApp"
        title="WhatsApp us"
        className={`${linkClass} bg-[#25D366] focus-visible:ring-[#25D366]`}
      >
        <WhatsAppIcon />
      </a>
      <a
        href={instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit Malnad Nest on Instagram"
        title="Instagram @malnadnests"
        className={`${linkClass} bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#FCAF45] focus-visible:ring-[#E1306C]`}
      >
        <InstagramIcon />
      </a>
      <a
        href={`tel:${phoneNumber}`}
        aria-label="Call Malnad Nest"
        title="Call Malnad Nest"
        className={`${linkClass} bg-[#294735] focus-visible:ring-[#294735]`}
      >
        <PhoneIcon />
      </a>
    </nav>
  );
}
