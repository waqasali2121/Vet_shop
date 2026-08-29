import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder") || supabaseAnonKey.includes("placeholder")) {
    console.warn("Supabase credentials missing or set to placeholder. Skipping session update.")
    return { user: null, supabaseResponse }
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    // Refresh user session if expired
    const { data: { user } } = await supabase.auth.getUser()
    return { user, supabaseResponse }
  } catch (e) {
    return { user: null, supabaseResponse }
  }
}
export type UpdateSessionResult = {
  user: any;
  supabaseResponse: NextResponse;
}
