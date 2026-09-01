"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function login(prevState: any, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const result = loginSchema.safeParse({ email, password })
  if (!result.success) {
    return {
      error: result.error.issues[0].message,
    }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        error: error.message,
      }
    }
  } catch (err: any) {
    return {
      error: err.message || "An unexpected error occurred",
    }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function logout() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (err) {
    // Ignore error on signout
  }
  revalidatePath("/", "layout")
  redirect("/login")
}

export async function forgotPassword(prevState: any, formData: FormData) {
  const email = formData.get("email") as string
  if (!email || !email.includes("@")) {
    return {
      error: "Please enter a valid email address",
    }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })

    if (error) {
      return {
        error: error.message,
      }
    }

    return {
      success: true,
      message: "Password reset link sent to your email",
    }
  } catch (err: any) {
    return {
      error: err.message || "An unexpected error occurred",
    }
  }
}

export async function resetPassword(prevState: any, formData: FormData) {
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!password || password.length < 6) {
    return {
      error: "Password must be at least 6 characters long",
    }
  }

  if (password !== confirmPassword) {
    return {
      error: "Passwords do not match",
    }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      return {
        error: error.message,
      }
    }

    return {
      success: true,
      message: "Password updated successfully. You can now login.",
    }
  } catch (err: any) {
    return {
      error: err.message || "An unexpected error occurred",
    }
  }
}

export async function changePassword(password: string, confirmPassword: string) {
  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters long" }
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match" }
  }
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Failed to update password" }
  }
}

export async function updateProfileAvatar(avatarDataUrl: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({
      data: { avatar_url: avatarDataUrl }
    })
    if (error) throw error
    revalidatePath("/", "layout")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Failed to update profile picture" }
  }
}

