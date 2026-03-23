import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Define which routes are public — no login needed
const isPublicRoute = createRouteMatcher([
    "/",              // homepage
    "/sign-in(.*)",   // sign in page
    "/sign-up(.*)",   // sign up page
])

export default clerkMiddleware((auth, request) => {
    // If the route is NOT public, require login
    if (!isPublicRoute(request)) {
        auth.protect()
    }
})

export const config = {
    matcher: [
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        "/(api|trpc)(.*)",
    ],
}