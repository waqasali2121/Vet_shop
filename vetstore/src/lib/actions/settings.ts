"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { storeSettingsSchema, type StoreSettingsFormValues } from "../validations/settings"

// --- USER PROFILES ---
export async function getProfiles() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch user profiles" }
  }
}

export async function updateUserProfile(id: string, role: "OWNER" | "MANAGER" | "CASHIER" | "INVENTORY", is_active: boolean) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Check if user is OWNER
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "OWNER") {
      return { error: "Permission Denied. Only Owners can manage employee credentials." }
    }

    // Update profile
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({ role, is_active })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    // Create Audit Log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "UPDATE_USER_PROFILE",
      module: "USERS",
      entity_type: "PROFILE",
      entity_id: id,
      old_data: null,
      new_data: { role, is_active }
    })

    revalidatePath("/users")
    return { success: true, data: updated }
  } catch (err: any) {
    return { error: err.message || "Failed to update employee profile" }
  }
}

// --- STORE SETTINGS ---
export async function getStoreSettings() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("store_settings")
      .select("*")
      .maybeSingle()

    if (error) throw error
    return { data }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch store settings" }
  }
}

export async function updateStoreSettings(values: StoreSettingsFormValues) {
  const result = storeSettingsSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Check if user is OWNER
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "OWNER") {
      return { error: "Permission Denied. Only Owners can configure store settings." }
    }

    // Get existing settings row
    const { data: existing } = await supabase
      .from("store_settings")
      .select("id")
      .maybeSingle()

    let error
    let data

    if (existing) {
      const res = await supabase
        .from("store_settings")
        .update(values)
        .eq("id", existing.id)
        .select()
        .single()
      error = res.error
      data = res.data
    } else {
      const res = await supabase
        .from("store_settings")
        .insert(values)
        .select()
        .single()
      error = res.error
      data = res.data
    }

    if (error) throw error

    // Create Audit Log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "UPDATE_STORE_SETTINGS",
      module: "SETTINGS",
      entity_type: "STORE_SETTINGS",
      entity_id: data.id,
      old_data: null,
      new_data: values
    })

    revalidatePath("/settings")
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || "Failed to save store settings" }
  }
}

// --- AUDIT LOGS ---
export async function getAuditLogs() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("audit_logs")
      .select(`
        *,
        user:profiles(email)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch audit logs" }
  }
}
