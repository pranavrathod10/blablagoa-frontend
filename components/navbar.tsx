"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useUser } from "@clerk/nextjs";

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useUser();

  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?";

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/connect", label: "Connect" },
    { href: "/activity", label: "Activity" },
    { href: "/causerie", label: "Causerie" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-blue-600 shrink-0">
          BlaBlaGoa
        </Link>

        <div className="flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
            {initials}
          </div>
          <SignOutButton>
            <button className="text-sm text-gray-500 hover:text-red-500 transition-colors">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    </nav>
  );
}
