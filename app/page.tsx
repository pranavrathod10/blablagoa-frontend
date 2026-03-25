"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export default function Home() {
  const { user, isLoaded } = useUser();
  const isSignedIn = isLoaded && !!user;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-gray-100 px-6 h-16 flex items-center justify-between max-w-6xl mx-auto w-full">
        <span className="text-lg font-bold text-blue-600">BlaBlaGoa</span>

        {/* Show different nav based on auth state */}
        {isLoaded &&
          (isSignedIn ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                  {user.fullName?.[0] || user.firstName?.[0] || "?"}
                </div>
                <span className="text-sm text-gray-700 font-medium">
                  {user.firstName || user.fullName}
                </span>
              </div>
              <Link
                href="/dashboard"
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to dashboard
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/sign-in"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get started
              </Link>
            </div>
          ))}
      </nav>

      {/* Split screen — fills remaining height */}
      <div className="flex flex-1">
        {/* Left — hero */}
        <div className="flex-1 flex flex-col justify-center px-12 py-12 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-medium px-3 py-1 rounded-full mb-8 w-fit">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
            People nearby are online right now
          </div>

          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-5">
            The right person
            <br />
            is nearby.
            <br />
            <span className="text-blue-600">Say hello.</span>
          </h1>

          <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-md">
            Find real people around you. Send them a message with your reason.
            Chat for 5 minutes. No history, no pressure.
          </p>

          {/* CTA buttons */}
          {isSignedIn ? (
            <div className="flex items-center gap-4">
              <Link
                href="/connect"
                className="bg-blue-600 text-white px-7 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm"
              >
                Find someone nearby
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-900 px-7 py-3 rounded-xl font-medium transition-colors text-sm border border-gray-200"
              >
                My dashboard
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/sign-up"
                className="bg-blue-600 text-white px-7 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm"
              >
                Get started free
              </Link>
              <Link
                href="/sign-in"
                className="text-gray-500 hover:text-gray-900 px-7 py-3 rounded-xl font-medium transition-colors text-sm border border-gray-200"
              >
                Sign in
              </Link>
            </div>
          )}

          {/* Use cases */}
          <div className="mt-12">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
              People use it for
            </p>
            <div className="flex gap-3">
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center">
                <div className="text-xl mb-1">✈️</div>
                <p className="text-xs text-gray-500 leading-snug">
                  Sharing a cab
                  <br />
                  at the airport
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center">
                <div className="text-xl mb-1">🏙️</div>
                <p className="text-xs text-gray-500 leading-snug">
                  Help in
                  <br />a new city
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center">
                <div className="text-xl mb-1">☕</div>
                <p className="text-xs text-gray-500 leading-snug">
                  Meeting someone
                  <br />
                  interesting
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-10">
            <div>
              <div className="text-xl font-bold text-gray-900">5 min</div>
              <div className="text-xs text-gray-400">per session</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">0</div>
              <div className="text-xs text-gray-400">history saved</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">100%</div>
              <div className="text-xs text-gray-400">consent based</div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-gray-100 my-8" />

        {/* Right — mock request card */}
        <div className="flex-1 flex flex-col justify-center items-center px-12 py-12 bg-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
            What it looks like
          </p>

          {/* Incoming request card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm shadow-sm mb-4">
            <p className="text-xs text-gray-400 font-medium mb-4 uppercase tracking-wide">
              Incoming request
            </p>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 shrink-0">
                A
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Aarav S.</p>
                <p className="text-xs text-gray-400">0.3 km away · Online</p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                "Just landed — heading to the city. Want to share a cab? Saves
                us both."
              </p>
            </div>

            <p className="text-xs text-gray-400 mb-4 px-1">
              22 · Software developer · Surat
            </p>

            <div className="flex gap-2">
              <button className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
                Accept
              </button>
              <button className="flex-1 bg-white text-gray-500 text-sm font-medium py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                Decline
              </button>
            </div>
          </div>

          {/* Timer card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 w-full max-w-sm shadow-sm">
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-blue-600 font-mono tabular-nums">
                04:59
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Session active
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Chat ends at 0:00 · no history saved
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-6 max-w-xs leading-relaxed">
            Everything disappears after 5 minutes. No records. No screenshots.
            Just a real conversation.
          </p>
        </div>
      </div>
    </div>
  );
}
