import Link from "next/link";
import type { ReactNode } from "react";
import "./admin.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-theme min-h-screen">
      <div className="admin-photo-band" aria-hidden="true" />
      <header className="admin-topbar">
        <Link
          href="/admin"
          className="admin-brand"
          aria-label="Malnad Nest admin home"
        >
          <span className="admin-brand-mark">MN</span>
          <span>
            <strong>Malnad Nest</strong>
            <small>HOMESTAY MANAGEMENT</small>
          </span>
        </Link>
        <nav className="admin-nav" aria-label="Admin navigation">
          <Link href="/admin">Overview</Link>
          <Link href="/admin#booking-enquiries">Enquiries</Link>
          <Link href="/admin/homestays">Homestays</Link>
          <Link href="/admin/settings">Settings</Link>
        </nav>
      </header>
      <div className="admin-content">{children}</div>
      <footer className="admin-footer">
        Malnad Nest · Private management area
      </footer>
    </div>
  );
}
