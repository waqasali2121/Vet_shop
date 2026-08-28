import * as React from "react"
import { redirect } from "next/navigation"
import { getProfiles } from "@/lib/actions/settings"
import { createClient } from "@/lib/supabase/server"
import { UsersClient } from "@/components/users/users-client"

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Fetch current user's profile to check their role
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const currentUserRole = currentProfile?.role || "CASHIER"

  const res = await getProfiles()
  const profiles = res.data || []

  return (
    <UsersClient
      profiles={profiles as any}
      currentUserRole={currentUserRole}
    />
  )
}
