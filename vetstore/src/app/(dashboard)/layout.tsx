import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayoutClient } from "@/components/layout/dashboard-layout-client"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch the user's role from public.profiles table
  // Fallback to "CASHIER" if not found or during initial setup
  let userRole = "CASHIER"

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role) {
      userRole = profile.role
    }
  } catch (err) {
    // Suppress error and use fallback during setup/seeding
  }

  return (
    <DashboardLayoutClient
      userEmail={user.email || "staff@salmanfarsy.com"}
      userRole={userRole}
    >
      {children}
    </DashboardLayoutClient>
  )
}
