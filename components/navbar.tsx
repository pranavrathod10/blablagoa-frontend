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

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-bold text-blue-600">
          BlaBlaGoa
        </Link>

        <div className="flex items-center gap-8">
          <Link
            href="/connect"
            className={`text-sm font-medium transition-colors ${
              pathname === "/connect"
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Connect
          </Link>
          <Link
            href="/profile"
            className={`text-sm font-medium transition-colors ${
              pathname === "/profile"
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            My Profile
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
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
