"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { expenseSchema, openRegisterSchema, closeRegisterSchema, type ExpenseFormValues, type OpenRegisterFormValues, type CloseRegisterFormValues } from "../validations/expense"

// --- EXPENSE CATEGORIES ---
export async function getExpenseCategories() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("expense_categories")
      .select("*")
      .order("name", { ascending: true })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch expense categories" }
  }
}

export async function createExpenseCategory(name: string, description?: string) {
  if (!name.trim()) return { error: "Category name is required" }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("expense_categories")
      .insert({ name, description })
      .select()
      .single()

    if (error) throw error
    revalidatePath("/expenses")
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || "Failed to create expense category" }
  }
}

// --- EXPENSES CRUD ---
export async function getExpenses() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        *,
        category:expense_categories(name)
      `)
      .order("expense_date", { ascending: false })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch expenses" }
  }
}

export async function createExpense(values: ExpenseFormValues) {
  const result = expenseSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Check if cashier has active open register session
    const { data: activeSession } = await supabase
      .from("cash_register_sessions")
      .select("id, expected_closing_cash")
      .eq("cashier_id", user.id)
      .eq("status", "OPEN")
      .maybeSingle()

    // 1. Insert Expense Row
    const expenseData = {
      ...values,
      register_session_id: values.payment_method === "CASH" ? (activeSession?.id || null) : null,
      created_by: user.id
    }

    const { data: expense, error: expError } = await supabase
      .from("expenses")
      .insert(expenseData)
      .select()
      .single()

    if (expError) throw expError

    // 2. Adjust Cash session if paid in Cash
    if (values.payment_method === "CASH" && activeSession) {
      // Record Cash Movement (negative amount for outflow)
      await supabase.from("cash_register_movements").insert({
        session_id: activeSession.id,
        movement_type: "CASH_EXPENSE",
        amount: -values.amount,
        reference_id: expense.id,
        notes: `Paid Expense: ${values.description || 'unspecified'}`
      })

      // Deduct expected cash
      await supabase
        .from("cash_register_sessions")
        .update({ expected_closing_cash: activeSession.expected_closing_cash - values.amount })
        .eq("id", activeSession.id)
    }

    // 3. Write Audit Log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "CREATE_EXPENSE",
      module: "EXPENSES",
      entity_type: "EXPENSE",
      entity_id: expense.id,
      old_data: null,
      new_data: { amount: values.amount, payment_method: values.payment_method }
    })

    revalidatePath("/expenses")
    revalidatePath("/cash-register")
    return { success: true, data: expense }
  } catch (err: any) {
    return { error: err.message || "Failed to log expense record" }
  }
}

// --- CASH SESSIONS MANAGEMENT ---
export async function getActiveCashSession() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null }

    const { data, error } = await supabase
      .from("cash_register_sessions")
      .select("*")
      .eq("cashier_id", user.id)
      .eq("status", "OPEN")
      .maybeSingle()

    if (error) throw error
    return { data }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch cash session" }
  }
}

export async function getCashMovements(sessionId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("cash_register_movements")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch register movements" }
  }
}

export async function openRegisterSession(values: OpenRegisterFormValues) {
  const result = openRegisterSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Check if cashier already has an open session
    const { data: activeSession } = await supabase
      .from("cash_register_sessions")
      .select("id")
      .eq("cashier_id", user.id)
      .eq("status", "OPEN")
      .maybeSingle()

    if (activeSession) {
      return { error: "You already have an open cash register session. Close it before opening a new one." }
    }

    // Insert session
    const { data: session, error } = await supabase
      .from("cash_register_sessions")
      .insert({
        cashier_id: user.id,
        opening_cash: values.opening_cash,
        expected_closing_cash: values.opening_cash,
        status: "OPEN",
        notes: values.notes
      })
      .select()
      .single()

    if (error) throw error

    // Create Audit Log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "OPEN_REGISTER",
      module: "CASH_REGISTER",
      entity_type: "CASH_REGISTER_SESSION",
      entity_id: session.id,
      old_data: null,
      new_data: { opening_cash: values.opening_cash }
    })

    revalidatePath("/cash-register")
    revalidatePath("/pos")
    return { success: true, data: session }
  } catch (err: any) {
    return { error: err.message || "Failed to open register session" }
  }
}

export async function closeRegisterSession(values: CloseRegisterFormValues) {
  const result = closeRegisterSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Fetch active session
    const { data: session, error: fetchErr } = await supabase
      .from("cash_register_sessions")
      .select("*")
      .eq("cashier_id", user.id)
      .eq("status", "OPEN")
      .single()

    if (fetchErr || !session) {
      return { error: "No active cash register session found to close." }
    }

    const difference = values.actual_closing_cash - session.expected_closing_cash

    // Update session
    const { data: closedSession, error: updateErr } = await supabase
      .from("cash_register_sessions")
      .update({
        closed_at: new Date().toISOString(),
        actual_closing_cash: values.actual_closing_cash,
        difference,
        status: "CLOSED",
        notes: values.notes
      })
      .eq("id", session.id)
      .select()
      .single()

    if (updateErr) throw updateErr

    // Create Audit Log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "CLOSE_REGISTER",
      module: "CASH_REGISTER",
      entity_type: "CASH_REGISTER_SESSION",
      entity_id: session.id,
      old_data: { expected: session.expected_closing_cash },
      new_data: { actual: values.actual_closing_cash, difference }
    })

    revalidatePath("/cash-register")
    revalidatePath("/pos")
    return { success: true, data: closedSession }
  } catch (err: any) {
    return { error: err.message || "Failed to close register session" }
  }
}

export async function getAllRegisterSessions() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("cash_register_sessions")
      .select(`
        *,
        cashier:profiles(email, first_name)
      `)
      .order("opened_at", { ascending: false })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch all register sessions" }
  }
}
