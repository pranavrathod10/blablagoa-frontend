import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isPublicRoute = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
])

export default clerkMiddleware(async (auth, request) => {
    const { userId } = await auth()

    // If signed in and trying to access sign-in/sign-up → redirect to dashboard
    if (userId && (
        request.nextUrl.pathname.startsWith("/sign-in") ||
        request.nextUrl.pathname.startsWith("/sign-up")
    )) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // If not signed in and trying to access protected route → redirect to sign-in
    if (!isPublicRoute(request)) {
        await auth.protect()
    }
})

export const config = {
    matcher: [
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        "/(api|trpc)(.*)",
    ],
}