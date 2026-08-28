"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { saleReturnSchema, type SaleReturnFormValues } from "../validations/return"

export async function lookupSaleByInvoice(invoiceNumber: string) {
  if (!invoiceNumber.trim()) return { error: "Please enter an invoice number" }

  try {
    const supabase = await createClient()

    // 1. Fetch Sale details
    const { data: sale, error: saleErr } = await supabase
      .from("sales")
      .select(`
        *,
        customer:customers(id, name, phone, current_balance, credit_limit),
        cashier:profiles(email, first_name)
      `)
      .ilike("invoice_number", invoiceNumber.trim())
      .maybeSingle()

    if (saleErr) throw saleErr
    if (!sale) return { error: "Invoice not found" }
    if (sale.sale_status === "VOIDED") return { error: "This invoice is voided and cannot accept returns." }

    // 2. Fetch Sale Items along with their product and batch allocations
    const { data: items, error: itemsErr } = await supabase
      .from("sale_items")
      .select(`
        *,
        product:products(id, name, sku, unit:units(abbreviation)),
        allocations:sale_batch_allocations(
          batch_id,
          quantity,
          batch:product_batches(batch_number, expiry_date)
        )
      `)
      .eq("sale_id", sale.id)

    if (itemsErr) throw itemsErr

    // 3. For each item, query previously returned quantities from sale_return_items
    const mappedItems = await Promise.all(
      (items || []).map(async (item) => {
        const { data: returns, error: returnErr } = await supabase
          .from("sale_return_items")
          .select("quantity")
          .eq("sale_item_id", item.id)

        if (returnErr) throw returnErr

        const prevReturnedQty = (returns || []).reduce((sum, r) => sum + r.quantity, 0)
        const remainingQty = item.quantity - prevReturnedQty

        return {
          ...item,
          prev_returned_quantity: prevReturnedQty,
          remaining_quantity: remainingQty
        }
      })
    )

    return { data: { ...sale, items: mappedItems } }
  } catch (err: any) {
    return { error: err.message || "Failed to lookup invoice details" }
  }
}

export async function createSaleReturn(values: SaleReturnFormValues) {
  const result = saleReturnSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // 1. Verify cashier active session
    const { data: activeSession } = await supabase
      .from("cash_register_sessions")
      .select("id, expected_closing_cash")
      .eq("cashier_id", user.id)
      .eq("status", "OPEN")
      .maybeSingle()

    if (!activeSession && values.refund_method === "CASH") {
      return { error: "No active cash register session. Open register to issue cash refunds." }
    }

    // 2. Fetch original sale details
    const { data: sale } = await supabase
      .from("sales")
      .select("invoice_number, customer_id, paid_amount, grand_total")
      .eq("id", values.sale_id)
      .single()

    if (!sale) throw new Error("Original sale not found")

    // 3. Generate Return Number: SR-YYYY-MM-XXXX
    const now = new Date()
    const prefix = `SR-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const { count } = await supabase
      .from("sale_returns")
      .select("id", { count: "exact", head: true })
      .ilike("return_number", `${prefix}%`)

    const suffix = String((count || 0) + 1).padStart(4, "0")
    const returnNumber = `${prefix}-${suffix}`

    // 4. Create Sale Return Entry
    const { data: saleReturn, error: returnError } = await supabase
      .from("sale_returns")
      .insert({
        return_number: returnNumber,
        sale_id: values.sale_id,
        cashier_id: user.id,
        register_session_id: activeSession?.id || null,
        refund_amount: values.refund_amount,
        refund_method: values.refund_method,
        return_reason: values.return_reason
      })
      .select()
      .single()

    if (returnError) throw returnError

    // 5. Process Return Items
    let allItemsFullyReturned = true

    for (const item of values.items) {
      // Validate quantities: fetch original sold and previously returned to check limits
      const { data: saleItem } = await supabase
        .from("sale_items")
        .select("quantity, unit_cost")
        .eq("id", item.sale_item_id)
        .single()

      if (!saleItem) throw new Error("Sale item details not found")

      const { data: prevReturns } = await supabase
        .from("sale_return_items")
        .select("quantity")
        .eq("sale_item_id", item.sale_item_id)

      const prevQty = (prevReturns || []).reduce((sum, r) => sum + r.quantity, 0)
      const allowedReturnQty = saleItem.quantity - prevQty

      if (item.quantity > allowedReturnQty) {
        throw new Error(`Return quantity (${item.quantity}) exceeds allowed returnable quantity (${allowedReturnQty}) for item.`)
      }

      // Check if this item is fully returned now
      if (item.quantity + prevQty < saleItem.quantity) {
        allItemsFullyReturned = false
      }

      const refundTotal = item.quantity * item.unit_price

      // a. Insert Sale Return Item row
      const { error: returnItemErr } = await supabase
        .from("sale_return_items")
        .insert({
          return_id: saleReturn.id,
          sale_item_id: item.sale_item_id,
          product_id: item.product_id,
          batch_id: item.batch_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          refund_total: refundTotal,
          restocked: item.restocked
        })

      if (returnItemErr) throw returnItemErr

      // b. If Restocked is checked: increase available batch stock & log movement
      if (item.restocked) {
        // Fetch current batch stock
        const { data: batch } = await supabase
          .from("product_batches")
          .select("available_quantity")
          .eq("id", item.batch_id)
          .single()

        const newStock = (batch?.available_quantity || 0) + item.quantity
        await supabase
          .from("product_batches")
          .update({ available_quantity: newStock })
          .eq("id", item.batch_id)

        // Log positive inventory movement
        await supabase.from("inventory_movements").insert({
          product_id: item.product_id,
          batch_id: item.batch_id,
          movement_type: "SALE_RETURN",
          quantity: item.quantity,
          unit_cost: saleItem.unit_cost,
          reference_type: "SALE_RETURN",
          reference_id: saleReturn.id,
          notes: `Restocked via Sales Return #${returnNumber}`,
          created_by: user.id
        })
      }
    }

    // 6. Update Original Sale Status
    const nextStatus = allItemsFullyReturned ? "RETURNED" : "PARTIALLY_RETURNED"
    await supabase
      .from("sales")
      .update({ sale_status: nextStatus })
      .eq("id", values.sale_id)

    // 7. Handle Refund Payout
    if (values.refund_amount > 0) {
      if (values.refund_method === "CASH" && activeSession) {
        // Log cash outflow movement in active register session
        await supabase.from("cash_register_movements").insert({
          session_id: activeSession.id,
          movement_type: "CASH_REFUND",
          amount: -values.refund_amount,
          reference_id: saleReturn.id,
          notes: `Refund cash for Return #${returnNumber}`
        })

        // Reduce expected closing cash
        await supabase
          .from("cash_register_sessions")
          .update({ expected_closing_cash: activeSession.expected_closing_cash - values.refund_amount })
          .eq("id", activeSession.id)
      } else if (values.refund_method === "CREDIT_OFFSET") {
        // Fetch customer current balance
        const { data: customer } = await supabase
          .from("customers")
          .select("current_balance, name")
          .eq("id", sale.customer_id)
          .single()

        if (customer) {
          // Reduce customer receivable balance (Credit decreases receivable)
          const nextBal = Number(customer.current_balance) - values.refund_amount
          await supabase
            .from("customers")
            .update({ current_balance: nextBal })
            .eq("id", sale.customer_id)

          // Log customer ledger credit entry
          await supabase.from("customer_ledger").insert({
            customer_id: sale.customer_id,
            transaction_type: "RETURN",
            reference_id: saleReturn.id,
            reference_number: returnNumber,
            debit: 0.00,
            credit: values.refund_amount,
            running_balance: nextBal,
            description: `Balance offset for Sales Return: ${returnNumber}`
          })
        }
      }
    }

    // 8. Create Audit Log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "CREATE_RETURN",
      module: "SALES",
      entity_type: "SALE_RETURN",
      entity_id: saleReturn.id,
      old_data: { original_invoice: sale.invoice_number },
      new_data: { return_number: returnNumber, refund_amount: values.refund_amount, status: nextStatus }
    })

    revalidatePath("/sales")
    revalidatePath("/sales/returns")
    revalidatePath("/inventory/stock")
    revalidatePath("/inventory/batches")
    revalidatePath("/cash-register")
    revalidatePath("/customers")
    revalidatePath(`/customers/${sale.customer_id}`)

    return { success: true, data: saleReturn }
  } catch (err: any) {
    return { error: err.message || "Failed to process sales return" }
  }
}

export async function getSaleReturns() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("sale_returns")
      .select(`
        *,
        sale:sales(invoice_number),
        cashier:profiles(email)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch sales returns" }
  }
}
