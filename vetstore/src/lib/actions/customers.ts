"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { customerSchema, type CustomerFormValues } from "../validations/customer"

export async function getCustomers() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("name", { ascending: true })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch customers" }
  }
}

export async function getCustomerById(id: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error
    return { data }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch customer details" }
  }
}

export async function createCustomer(values: CustomerFormValues) {
  const result = customerSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()

    // Build payload without opening_balance column
    const customerData = {
      name: values.name,
      phone: values.phone,
      customer_type: values.customer_type,
      credit_limit: values.credit_limit,
      address: values.address || "",
      is_active: values.is_active,
      current_balance: values.opening_balance || 0,
    }

    const { data, error } = await supabase
      .from("customers")
      .insert(customerData)
      .select()
      .single()

    if (error) throw error

    // Create customer ledger entry for opening balance if not zero
    if (values.opening_balance !== 0) {
      await supabase.from("customer_ledger").insert({
        customer_id: data.id,
        transaction_type: "OPENING_BALANCE",
        reference_number: "OP-BAL",
        debit: values.opening_balance > 0 ? values.opening_balance : 0.00,
        credit: values.opening_balance < 0 ? Math.abs(values.opening_balance) : 0.00,
        running_balance: values.opening_balance,
        description: "Opening Balance setup"
      })
    }

    revalidatePath("/customers")
    revalidatePath("/pos")
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || "Failed to create customer" }
  }
}

export async function updateCustomer(id: string, values: CustomerFormValues) {
  const result = customerSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("customers")
      .update({
        name: values.name,
        phone: values.phone,
        customer_type: values.customer_type,
        address: values.address || "",
        is_active: values.is_active,
        credit_limit: values.credit_limit,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    revalidatePath("/customers")
    revalidatePath(`/customers/${id}`)
    revalidatePath("/pos")
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || "Failed to update customer" }
  }
}

export async function getCustomerLedger(customerId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("customer_ledger")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch customer ledger" }
  }
}

export async function createCustomerPayment(
  customerId: string,
  amount: number,
  paymentMethod: "CASH" | "EASYPAISA" | "JAZZCASH" | "BANK_TRANSFER" | "CARD" | "OTHER",
  reference?: string,
  notes?: string
) {
  if (amount <= 0) return { error: "Payment amount must be greater than zero" }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Fetch customer details to get current balance
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("name, current_balance")
      .eq("id", customerId)
      .single()

    if (fetchError || !customer) throw new Error("Customer not found")

    const newBalance = Number(customer.current_balance) - amount

    // 1. Generate Receipt Number: REC-YYYY-MM-XXXX
    const now = new Date()
    const prefix = `REC-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const { count } = await supabase
      .from("customer_ledger")
      .select("id", { count: "exact", head: true })
      .ilike("reference_number", `${prefix}%`)

    const suffix = String((count || 0) + 1).padStart(4, "0")
    const receiptNumber = `${prefix}-${suffix}`

    // 2. Update Customer Balance
    const { error: customerUpdateError } = await supabase
      .from("customers")
      .update({ current_balance: newBalance })
      .eq("id", customerId)

    if (customerUpdateError) throw customerUpdateError

    // 3. Log Customer Ledger Entry (Credit decreases receivable)
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from("customer_ledger")
      .insert({
        customer_id: customerId,
        transaction_type: "PAYMENT",
        reference_number: receiptNumber,
        debit: 0.00,
        credit: amount,
        running_balance: newBalance,
        description: notes || `Payment received via ${paymentMethod} (Ref: ${reference || '—'})`
      })
      .select()
      .single()

    if (ledgerError) throw ledgerError

    // 4. Handle Active Cash Session for CASH collections (inflow)
    if (paymentMethod === "CASH") {
      const { data: activeSession } = await supabase
        .from("cash_register_sessions")
        .select("id, expected_closing_cash")
        .eq("cashier_id", user.id)
        .eq("status", "OPEN")
        .maybeSingle()

      if (activeSession) {
        // Record cash inflow movement (positive)
        await supabase.from("cash_register_movements").insert({
          session_id: activeSession.id,
          movement_type: "CUSTOMER_COLLECTION",
          amount: amount,
          reference_id: ledgerEntry.id,
          notes: `Customer Collection: ${customer.name}`
        })

        // Increase expected closing cash
        await supabase
          .from("cash_register_sessions")
          .update({ expected_closing_cash: activeSession.expected_closing_cash + amount })
          .eq("id", activeSession.id)
      }
    }

    // 5. Audit Log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "CUSTOMER_PAYMENT",
      module: "CUSTOMERS",
      entity_type: "CUSTOMER_LEDGER",
      entity_id: ledgerEntry.id,
      old_data: { balance: customer.current_balance },
      new_data: { balance: newBalance, received_amount: amount }
    })

    revalidatePath("/customers")
    revalidatePath(`/customers/${customerId}`)
    revalidatePath("/pos")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Failed to log customer payment" }
  }
}

export async function getCustomerPayments() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("customer_ledger")
      .select(`
        *,
        customer:customers(id, name, phone)
      `)
      .eq("transaction_type", "PAYMENT")
      .order("created_at", { ascending: false })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch customer payments" }
  }
}


