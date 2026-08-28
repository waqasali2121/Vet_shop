import * as React from "react"
import { redirect } from "next/navigation"
import { getStoreSettings } from "@/lib/actions/settings"
import { createClient } from "@/lib/supabase/server"
import { SettingsForm } from "@/components/settings/settings-form"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Fetch current user role
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const currentUserRole = currentProfile?.role || "CASHIER"

  const res = await getStoreSettings()
  const settings = res.data || undefined

  return (
    <SettingsForm
      initialData={settings as any}
      currentUserRole={currentUserRole}
    />
  )
}
