import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request)

  const isAuthPage = request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/reset-password")

  // For our routing, we treat all pages other than auth pages and public files as protected
  const isProtectedPage = !isAuthPage &&
    !request.nextUrl.pathname.startsWith("/_next") &&
    !request.nextUrl.pathname.startsWith("/api/auth/callback") &&
    request.nextUrl.pathname !== "/favicon.ico"

  if (isProtectedPage && !user) {
    // Redirect to login if trying to access protected page while not logged in
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirectedFrom", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthPage && user) {
    // Redirect to dashboard if logged in and trying to access login/forgot-password pages
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  // If visiting the root "/", redirect to "/dashboard" (which will redirect to "/login" if not authenticated)
  if (request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
