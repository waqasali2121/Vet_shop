"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { saleSchema, type SaleFormValues } from "../validations/sale"

export async function checkActiveRegisterSession() {
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
    return { error: err.message || "Failed to check active cash session" }
  }
}

export async function createSale(values: SaleFormValues) {
  // Server-side Zod validation
  const result = saleSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // 1. Verify Active Open Cash Register Session (Bypassed)
    const { data: activeSession } = await supabase
      .from("cash_register_sessions")
      .select("id, expected_closing_cash")
      .eq("cashier_id", user.id)
      .eq("status", "OPEN")
      .maybeSingle()

    // 2. Fetch Customer Details
    const { data: customer, error: customerErr } = await supabase
      .from("customers")
      .select("name, credit_limit, current_balance")
      .eq("id", values.customer_id)
      .single()

    if (customerErr || !customer) throw new Error("Customer not found")

    // Check credit limit if buying on credit
    const isCredit = values.balance_amount > 0
    if (isCredit) {
      const prospectiveBalance = Number(customer.current_balance) + values.balance_amount
      if (prospectiveBalance > Number(customer.credit_limit) && values.customer_id !== '00000000-0000-0000-0000-000000000000') {
        return {
          error: `Credit limit exceeded. Customer credit limit is Rs. ${Number(customer.credit_limit).toLocaleString()}, prospective balance is Rs. ${prospectiveBalance.toLocaleString()}`
        }
      }
    }

    // 3. Generate Invoice Number: SFV-YYYY-MM-XXXXXX
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const invPrefix = `SFV-${year}-${month}`

    const { count, error: countError } = await supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .ilike("invoice_number", `${invPrefix}%`)

    if (countError) throw countError
    const suffix = String((count || 0) + 1).padStart(6, "0")
    const invoiceNumber = `${invPrefix}-${suffix}`

    // We will collect batch allocations for each sale item dynamically
    const allocationsToCreate: { product_id: string; batch_id: string; quantity: number; unit_cost: number }[] = []

    // 4. Perform FEFO (First Expired First Out) stock validation and allocation
    const todayStr = now.toISOString().split("T")[0]

    for (const item of values.items) {
      // Fetch product name for friendly error alerts
      const { data: product } = await supabase
        .from("products")
        .select("name, track_expiry")
        .eq("id", item.product_id)
        .single()

      const productName = product?.name || "Product"

      // Fetch non-expired batches with positive available stock
      // FEFO rules: order by expiry_date ASC, nulls last (no-expiry items prioritized last)
      let query = supabase
        .from("product_batches")
        .select("id, batch_number, available_quantity, expiry_date, unit_cost")
        .eq("product_id", item.product_id)
        .gt("available_quantity", 0)
        .eq("status", "ACTIVE")

      if (product?.track_expiry) {
        // Enforce: never sell expired stock (expiry_date >= current_date)
        query = query.or(`expiry_date.gte.${todayStr},expiry_date.is.null`)
      }

      const { data: batches, error: batchError } = await query
        .order("expiry_date", { ascending: true, nullsFirst: false })

      if (batchError) throw batchError

      const totalAvailable = (batches || []).reduce((sum, b) => sum + b.available_quantity, 0)

      // Section 14: Negative stock must be DISABLED. Reject transaction.
      if (totalAvailable < item.quantity) {
        return { error: `Only ${totalAvailable} units of ${productName} are available in active stock. (Requested: ${item.quantity})` }
      }

      // Allocate quantities using FEFO
      let remainingToAllocate = item.quantity
      for (const batch of (batches || [])) {
        if (remainingToAllocate <= 0) break

        const take = Math.min(batch.available_quantity, remainingToAllocate)
        allocationsToCreate.push({
          product_id: item.product_id,
          batch_id: batch.id,
          quantity: take,
          unit_cost: Number(batch.unit_cost)
        })
        remainingToAllocate -= take
      }

      if (remainingToAllocate > 0) {
        // Double-check fallback
        return { error: `Stock allocation failure for ${productName}` }
      }
    }

    // 5. Insert Sale row
    const paymentStatus = values.balance_amount === 0 ? "PAID" : values.paid_amount > 0 ? "PARTIAL" : "CREDIT"

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        invoice_number: invoiceNumber,
        customer_id: values.customer_id,
        cashier_id: user.id,
        register_session_id: activeSession?.id || null,
        subtotal: values.subtotal,
        discount_amount: values.discount_amount,
        tax_amount: values.tax_amount,
        grand_total: values.grand_total,
        paid_amount: values.paid_amount,
        balance_amount: values.balance_amount,
        payment_status: paymentStatus,
        sale_status: "COMPLETED",
        notes: values.notes
      })
      .select()
      .single()

    if (saleError) throw saleError

    // 6. Process each Sale Item & Batch allocation
    for (const item of values.items) {
      // Find allocations matching this product
      const itemAllocations = allocationsToCreate.filter(a => a.product_id === item.product_id)

      // Calculate total COGS (sum of quantity * unit_cost from batches)
      const totalCOGS = itemAllocations.reduce((sum, a) => sum + (a.quantity * a.unit_cost), 0)
      const avgUnitCost = itemAllocations.length > 0 ? (totalCOGS / item.quantity) : 0

      // a. Insert sale item carrying price & COGS at time of sale
      const { data: saleItem, error: itemError } = await supabase
        .from("sale_items")
        .insert({
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_cost: avgUnitCost,
          discount_amount: item.discount_amount,
          line_total: (item.quantity * item.unit_price) - item.discount_amount
        })
        .select()
        .single()

      if (itemError) throw itemError

      // b. Process batch allocations
      for (const alloc of itemAllocations) {
        // i. Insert batch allocation row
        await supabase.from("sale_batch_allocations").insert({
          sale_item_id: saleItem.id,
          batch_id: alloc.batch_id,
          quantity: alloc.quantity
        })

        // ii. Reduce batch available quantity in DB
        const { data: batchData } = await supabase
          .from("product_batches")
          .select("available_quantity")
          .eq("id", alloc.batch_id)
          .single()

        const newAvail = (batchData?.available_quantity || 0) - alloc.quantity
        await supabase
          .from("product_batches")
          .update({ available_quantity: newAvail })
          .eq("id", alloc.batch_id)

        // iii. Log inventory movement (negative stock out)
        await supabase.from("inventory_movements").insert({
          product_id: item.product_id,
          batch_id: alloc.batch_id,
          movement_type: "SALE",
          quantity: -alloc.quantity,
          unit_cost: alloc.unit_cost,
          reference_type: "SALE",
          reference_id: sale.id,
          notes: `POS Invoice #${invoiceNumber}`,
          created_by: user.id
        })
      }
    }

    // 7. Process Sale Payments
    for (const payment of values.payments) {
      if (payment.amount <= 0) continue

      await supabase.from("sale_payments").insert({
        sale_id: sale.id,
        payment_method: payment.payment_method,
        amount: payment.amount,
        transaction_reference: payment.transaction_reference || null
      })
    }

    // 8. Handle Customer Credit Udhaar & Ledger
    if (isCredit) {
      // Update customer balance (Debit increases receivables)
      const nextCustBalance = Number(customer.current_balance) + values.balance_amount
      await supabase
        .from("customers")
        .update({ current_balance: nextCustBalance })
        .eq("id", values.customer_id)

      // Create Customer Ledger Entry
      await supabase.from("customer_ledger").insert({
        customer_id: values.customer_id,
        transaction_type: "SALE",
        reference_id: sale.id,
        reference_number: invoiceNumber,
        debit: values.balance_amount, // debit increases receivable
        credit: 0.00,
        running_balance: nextCustBalance,
        description: `Credit Sale Invoice: ${invoiceNumber}`
      })
    }

    // 9. Update Cash Register Session for Cash Payments
    const cashPayment = values.payments.find(p => p.payment_method === "CASH")
    if (cashPayment && cashPayment.amount > 0 && activeSession) {
      const session = activeSession as any
      const nextExpectedCash = session.expected_closing_cash + cashPayment.amount

      // Record cash movement (inflow)
      await supabase.from("cash_register_movements").insert({
        session_id: session.id,
        movement_type: "CASH_SALE",
        amount: cashPayment.amount,
        reference_id: sale.id,
        notes: `Cash Sale Invoice: ${invoiceNumber}`
      })

      // Increase expected cash
      await supabase
        .from("cash_register_sessions")
        .update({ expected_closing_cash: nextExpectedCash })
        .eq("id", session.id)
    }

    // 10. Audit Log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "CREATE_SALE",
      module: "SALES",
      entity_type: "SALE",
      entity_id: sale.id,
      old_data: null,
      new_data: { invoice_number: invoiceNumber, grand_total: values.grand_total, paid_amount: values.paid_amount }
    })

    revalidatePath("/sales")
    revalidatePath("/inventory/stock")
    revalidatePath("/inventory/batches")
    revalidatePath("/cash-register")
    revalidatePath("/customers")
    revalidatePath(`/customers/${values.customer_id}`)

    return { success: true, data: { id: sale.id, invoice_number: invoiceNumber } }
  } catch (err: any) {
    return { error: err.message || "Failed to process POS sale" }
  }
}

export async function getSaleReceiptData(id: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        customer:customers(id, name, phone, customer_type, current_balance),
        cashier:profiles!cashier_id(email, first_name, last_name),
        items:sale_items(
          *,
          product:products(name, sku, barcode, unit:units(abbreviation))
        ),
        payments:sale_payments(*)
      `)
      .eq("id", id)
      .single()

    if (error) throw error
    return { data }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch receipt data" }
  }
}

export async function getSales() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        customer:customers(name, phone)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch sales history" }
  }
}

export async function getSaleById(id: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        customer:customers(id, name, phone, customer_type, current_balance, credit_limit),
        cashier:profiles!cashier_id(email, first_name, last_name),
        items:sale_items(
          *,
          product:products(id, name, sku, unit:units(abbreviation)),
          allocations:sale_batch_allocations(
            id,
            quantity,
            batch:product_batches(id, batch_number, expiry_date)
          )
        ),
        payments:sale_payments(*)
      `)
      .eq("id", id)
      .single()

    if (error) throw error
    return { data }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch sale details" }
  }
}

export async function voidSale(saleId: string, reason: string) {
  if (!reason.trim()) return { error: "Please enter a void reason" }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Fetch user role to verify MANAGER or OWNER
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || !["OWNER", "MANAGER"].includes(profile.role)) {
      return { error: "Permission Denied. Only Owners or Managers can void historical sales." }
    }

    // Fetch original sale details
    const { data: sale, error: saleErr } = await supabase
      .from("sales")
      .select("*")
      .eq("id", saleId)
      .single()

    if (saleErr || !sale) throw new Error("Sale not found")
    if (sale.sale_status === "VOIDED") return { error: "This sale is already voided." }

    // Fetch sale items
    const { data: items, error: itemsErr } = await supabase
      .from("sale_items")
      .select(`
        id,
        product_id,
        quantity,
        allocations:sale_batch_allocations(batch_id, quantity)
      `)
      .eq("sale_id", saleId)

    if (itemsErr) throw itemsErr

    // 1. Restore inventory quantities from batch allocations & Log movements
    for (const item of (items || [])) {
      for (const alloc of (item.allocations || [])) {
        // Fetch current batch available stock
        const { data: batch } = await supabase
          .from("product_batches")
          .select("available_quantity, unit_cost")
          .eq("id", alloc.batch_id)
          .single()

        if (batch) {
          const nextStock = batch.available_quantity + alloc.quantity
          await supabase
            .from("product_batches")
            .update({ available_quantity: nextStock })
            .eq("id", alloc.batch_id)

          // Log positive movement (stock restoration)
          await supabase.from("inventory_movements").insert({
            product_id: item.product_id,
            batch_id: alloc.batch_id,
            movement_type: "SALE_RETURN", // or ADJUSTMENT_IN indicating void
            quantity: alloc.quantity,
            unit_cost: batch.unit_cost,
            reference_type: "SALE_RETURN",
            reference_id: saleId,
            notes: `Restored: Voided Sale Invoice #${sale.invoice_number}`,
            created_by: user.id
          })
        }
      }
    }

    // 2. Update Sale Status to VOIDED
    await supabase
      .from("sales")
      .update({
        sale_status: "VOIDED",
        voided_at: new Date().toISOString(),
        voided_by: user.id,
        void_reason: reason
      })
      .eq("id", saleId)

    // 3. Revert Customer Ledger & Receivable Balances if credit was used
    const isCredit = Number(sale.balance_amount) > 0
    if (isCredit) {
      const { data: customer } = await supabase
        .from("customers")
        .select("current_balance")
        .eq("id", sale.customer_id)
        .single()

      if (customer) {
        // Reduce customer balance by original credit amount (Credit decreases receivable)
        const nextBal = Number(customer.current_balance) - Number(sale.balance_amount)
        await supabase
          .from("customers")
          .update({ current_balance: nextBal })
          .eq("id", sale.customer_id)

        // Log ledger reversal
        await supabase.from("customer_ledger").insert({
          customer_id: sale.customer_id,
          transaction_type: "ADJUSTMENT",
          reference_id: saleId,
          reference_number: sale.invoice_number,
          debit: 0.00,
          credit: sale.balance_amount, // credit reduces receivable balance
          running_balance: nextBal,
          description: `Reversal: Voided Credit Sale Invoice #${sale.invoice_number}`
        })
      }
    }

    // 4. Update Cash Register Session (reverse cash sale if paid in cash and session is open)
    const cashPayment = await supabase
      .from("sale_payments")
      .select("amount")
      .eq("sale_id", saleId)
      .eq("payment_method", "CASH")
      .maybeSingle()

    if (cashPayment?.data?.amount && cashPayment.data.amount > 0) {
      // Find open session
      const { data: activeSession } = await supabase
        .from("cash_register_sessions")
        .select("id, expected_closing_cash")
        .eq("cashier_id", user.id)
        .eq("status", "OPEN")
        .maybeSingle()

      if (activeSession) {
        const cashAmt = cashPayment.data.amount
        // Record negative cash movement
        await supabase.from("cash_register_movements").insert({
          session_id: activeSession.id,
          movement_type: "CASH_REFUND",
          amount: -cashAmt,
          reference_id: saleId,
          notes: `Reversal: Voided Cash Sale #${sale.invoice_number}`
        })

        // Reduce expected closing cash
        await supabase
          .from("cash_register_sessions")
          .update({ expected_closing_cash: activeSession.expected_closing_cash - cashAmt })
          .eq("id", activeSession.id)
      }
    }

    // 5. Create Audit Log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "VOID_SALE",
      module: "SALES",
      entity_type: "SALE",
      entity_id: saleId,
      old_data: { invoice_number: sale.invoice_number, grand_total: sale.grand_total },
      new_data: { status: "VOIDED", void_reason: reason }
    })

    revalidatePath("/sales")
    revalidatePath("/inventory/stock")
    revalidatePath("/inventory/batches")
    revalidatePath("/cash-register")
    revalidatePath("/customers")
    revalidatePath(`/customers/${sale.customer_id}`)

    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Failed to void sale invoice" }
  }
}

export async function getCustomerPurchaseHistory(customerId: string) {
  try {
    const supabase = await createClient()

    const { data: sales, error } = await supabase
      .from("sales")
      .select(`
        id,
        invoice_number,
        created_at,
        grand_total,
        items:sale_items(
          id,
          quantity,
          unit_price,
          product:products(name)
        )
      `)
      .eq("customer_id", customerId)
      .eq("sale_status", "COMPLETED")
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) throw error
    return { data: sales || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch customer purchase history" }
  }
}


