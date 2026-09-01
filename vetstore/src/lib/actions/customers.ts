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
      current_balance: 0,
    }

    const { data, error } = await supabase
      .from("customers")
      .insert(customerData)
      .select()
      .single()

    if (error) throw error

    // No opening balance ledger logic needed since balance starts at 0

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

    // 2. Update Unpaid Sales
    let remainingAmountToDistribute = amount;
    const updatedSaleIds: string[] = [];
    const { data: unpaidSales } = await supabase
      .from("sales")
      .select("id, grand_total, paid_amount, balance_amount, payment_status")
      .eq("customer_id", customerId)
      .gt("balance_amount", 0)
      .neq("sale_status", "VOIDED")
      .order("created_at", { ascending: true });

    if (unpaidSales && unpaidSales.length > 0) {
      for (const sale of unpaidSales) {
        if (remainingAmountToDistribute <= 0) break;

        const payable = Math.min(Number(sale.balance_amount), remainingAmountToDistribute);
        remainingAmountToDistribute -= payable;

        const newPaidAmount = Number(sale.paid_amount) + payable;
        const newBalanceAmount = Number(sale.balance_amount) - payable;
        const newStatus = newBalanceAmount <= 0 ? "PAID" : "PARTIAL";

        await supabase
          .from("sales")
          .update({
            paid_amount: newPaidAmount,
            balance_amount: newBalanceAmount,
            payment_status: newStatus
          })
          .eq("id", sale.id);

        updatedSaleIds.push(sale.id);
      }
    }

    // 3. Log to customer_payments table
    const { data: newPayment, error: paymentError } = await supabase
      .from("customer_payments")
      .insert({
        customer_id: customerId,
        amount: amount,
        payment_method: paymentMethod,
        previous_balance: customer.current_balance,
        new_balance: newBalance,
        reference_number: receiptNumber,
        notes: notes,
        received_by: user.id
      })
      .select()
      .single();

    if (paymentError) throw paymentError

    // 4. Update Customer Balance
    const { error: customerUpdateError } = await supabase
      .from("customers")
      .update({ current_balance: newBalance })
      .eq("id", customerId)

    if (customerUpdateError) throw customerUpdateError

    // 5. Log Customer Ledger Entry (Credit decreases receivable)
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

    // 6. Handle Active Cash Session for CASH collections (inflow)
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

    // 7. Audit Log
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
    revalidatePath("/sales")
    for (const saleId of updatedSaleIds) {
      revalidatePath(`/sales/${saleId}`)
    }
    return { success: true, data: { paymentId: newPayment.id } }
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

export async function deleteCustomer(id: string) {
  try {
    const supabase = await createClient()

    // Prevent deleting the Walk-in Customer
    if (id === "00000000-0000-0000-0000-000000000000") {
      return { error: "The Walk-in Customer account cannot be deleted." }
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)

    if (error) {
      // FK constraint — customer has sales/ledger history
      if (error.code === "23503") {
        const { error: deactivateError } = await supabase
          .from("customers")
          .update({ is_active: false })
          .eq("id", id)

        if (deactivateError) throw deactivateError

        revalidatePath("/customers")
        revalidatePath(`/customers/${id}`)
        return {
          success: true,
          message: "This customer has transaction history and cannot be deleted permanently. We have deactivated the account instead."
        }
      }
      throw error
    }

    revalidatePath("/customers")
    revalidatePath("/pos")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Failed to delete customer" }
  }
}

export async function getCustomerPaymentHistory(customerId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("customer_payments")
      .select(`
        *,
        receiver:profiles!customer_payments_received_by_fkey(id, first_name, last_name, email)
      `)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch customer payment history" }
  }
}


