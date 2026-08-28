"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { supplierSchema, purchaseSchema, type SupplierFormValues, type PurchaseFormValues } from "../validations/purchase"

// --- SUPPLIERS CRUD ---
export async function getSuppliers() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name", { ascending: true })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch suppliers" }
  }
}

export async function getSupplierById(id: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error
    return { data }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch supplier details" }
  }
}

export async function createSupplier(values: SupplierFormValues) {
  const result = supplierSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()

    // current balance defaults to opening balance
    const supplierData = {
      ...values,
      current_balance: values.opening_balance,
    }

    const { data, error } = await supabase
      .from("suppliers")
      .insert(supplierData)
      .select()
      .single()

    if (error) throw error

    // Create supplier ledger entry for opening balance if not zero
    if (values.opening_balance !== 0) {
      await supabase.from("supplier_ledger").insert({
        supplier_id: data.id,
        transaction_type: "OPENING_BALANCE",
        reference_number: "OP-BAL",
        credit: values.opening_balance > 0 ? values.opening_balance : 0.00,
        debit: values.opening_balance < 0 ? Math.abs(values.opening_balance) : 0.00,
        running_balance: values.opening_balance,
        description: "Opening Balance setup"
      })
    }

    revalidatePath("/suppliers")
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || "Failed to create supplier" }
  }
}

export async function updateSupplier(id: string, values: SupplierFormValues) {
  const result = supplierSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()

    // Fetch current supplier details
    const { data: currentSupplier, error: fetchError } = await supabase
      .from("suppliers")
      .select("current_balance, opening_balance")
      .eq("id", id)
      .single()

    if (fetchError) throw fetchError

    // Adjust current balance if opening balance changes
    const balDiff = values.opening_balance - currentSupplier.opening_balance
    const newBalance = currentSupplier.current_balance + balDiff

    const { data, error } = await supabase
      .from("suppliers")
      .update({
        ...values,
        current_balance: newBalance,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    revalidatePath("/suppliers")
    revalidatePath(`/suppliers/${id}`)
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || "Failed to update supplier" }
  }
}

export async function getSupplierLedger(supplierId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("supplier_ledger")
      .select("*")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch supplier ledger" }
  }
}

// --- RECORD SUPPLIER PAYMENTS ---
export async function createSupplierPayment(
  supplierId: string,
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

    // Fetch supplier current balance
    const { data: supplier, error: fetchError } = await supabase
      .from("suppliers")
      .select("name, current_balance")
      .eq("id", supplierId)
      .single()

    if (fetchError || !supplier) throw new Error("Supplier not found")

    const newBalance = supplier.current_balance - amount

    // 1. Generate payment reference code: PAY-YYYY-MM-XXXX
    const now = new Date()
    const prefix = `PAY-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const { count } = await supabase
      .from("supplier_ledger")
      .select("id", { count: "exact", head: true })
      .ilike("reference_number", `${prefix}%`)

    const suffix = String((count || 0) + 1).padStart(4, "0")
    const payNumber = `${prefix}-${suffix}`

    // 2. Update Supplier Balance
    const { error: supplierUpdateError } = await supabase
      .from("suppliers")
      .update({ current_balance: newBalance })
      .eq("id", supplierId)

    if (supplierUpdateError) throw supplierUpdateError

    // 3. Log Supplier Ledger Entry (Debit decreases our payable)
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from("supplier_ledger")
      .insert({
        supplier_id: supplierId,
        transaction_type: "PAYMENT",
        reference_number: payNumber,
        debit: amount,
        credit: 0.00,
        running_balance: newBalance,
        description: notes || `Payment to supplier via ${paymentMethod} (Ref: ${reference || '—'})`
      })
      .select()
      .single()

    if (ledgerError) throw ledgerError

    // 4. Handle Active Cash Session for CASH payments
    if (paymentMethod === "CASH") {
      const { data: activeSession } = await supabase
        .from("cash_register_sessions")
        .select("id, expected_closing_cash")
        .eq("cashier_id", user.id)
        .eq("status", "OPEN")
        .maybeSingle()

      if (activeSession) {
        // Record cash movement (negative for payment/outflow)
        await supabase.from("cash_register_movements").insert({
          session_id: activeSession.id,
          movement_type: "SUPPLIER_PAYMENT",
          amount: -amount,
          reference_id: ledgerEntry.id,
          notes: `Supplier Payment: ${supplier.name}`
        })

        // Reduce expected closing cash
        await supabase
          .from("cash_register_sessions")
          .update({ expected_closing_cash: activeSession.expected_closing_cash - amount })
          .eq("id", activeSession.id)
      }
    }

    // 5. Audit Log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "SUPPLIER_PAYMENT",
      module: "PURCHASES",
      entity_type: "SUPPLIER_LEDGER",
      entity_id: ledgerEntry.id,
      old_data: { balance: supplier.current_balance },
      new_data: { balance: newBalance, paid_amount: amount }
    })

    revalidatePath("/suppliers")
    revalidatePath(`/suppliers/${supplierId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Failed to log supplier payment" }
  }
}

// --- PURCHASES CRUD ---
export async function getPurchases() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("purchases")
      .select(`
        *,
        supplier:suppliers(name)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch purchases" }
  }
}

export async function getPurchaseById(id: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("purchases")
      .select(`
        *,
        supplier:suppliers(id, name, phone, address),
        items:purchase_items(
          *,
          product:products(id, name, sku, unit:units(abbreviation))
        ),
        payments:purchase_payments(*)
      `)
      .eq("id", id)
      .single()

    if (error) throw error
    return { data }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch purchase details" }
  }
}

export async function createPurchase(values: PurchaseFormValues) {
  // Server-side Zod validation
  const result = purchaseSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Fetch supplier current balance
    const { data: supplier, error: fetchSupplierError } = await supabase
      .from("suppliers")
      .select("current_balance, name")
      .eq("id", values.supplier_id)
      .single()

    if (fetchSupplierError || !supplier) {
      throw new Error("Supplier not found")
    }

    // 1. Generate Purchase Number: PUR-YYYY-MM-XXXX
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const purPrefix = `PUR-${year}-${month}`

    const { count, error: countError } = await supabase
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .ilike("purchase_number", `${purPrefix}%`)

    if (countError) throw countError
    const suffix = String((count || 0) + 1).padStart(4, "0")
    const purchaseNumber = `${purPrefix}-${suffix}`

    // 2. Insert into purchases table
    const balanceAmount = values.grand_total - values.paid_amount
    const paymentStatus = balanceAmount === 0 ? "PAID" : values.paid_amount > 0 ? "PARTIAL" : "UNPAID"

    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        purchase_number: purchaseNumber,
        supplier_id: values.supplier_id,
        supplier_invoice_number: values.supplier_invoice_number,
        purchase_date: values.purchase_date,
        subtotal: values.subtotal,
        discount_total: values.discount_total,
        grand_total: values.grand_total,
        paid_amount: values.paid_amount,
        balance_amount: balanceAmount,
        payment_status: paymentStatus,
        notes: values.notes,
        created_by: user.id
      })
      .select()
      .single()

    if (purchaseError) throw purchaseError

    // 3. Process each purchase item (Dynamic batch creation & movement entries)
    for (const item of values.items) {
      // Calculate total quantity received including pharmaceutical free bonus quantities
      const receivedQty = item.quantity + item.bonus_quantity

      // Calculate effective unit cost: (Qty * cost - Discount) / Received Qty
      const effectiveUnitCost = receivedQty > 0
        ? (item.quantity * item.unit_cost - item.discount_amount) / receivedQty
        : item.unit_cost

      // a. Insert purchase item
      const { data: insertedItem, error: itemError } = await supabase
        .from("purchase_items")
        .insert({
          purchase_id: purchase.id,
          product_id: item.product_id,
          quantity: item.quantity,
          bonus_quantity: item.bonus_quantity,
          unit_cost: item.unit_cost,
          discount_amount: item.discount_amount,
          line_total: (item.quantity * item.unit_cost) - item.discount_amount,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date || null
        })
        .select()
        .single()

      if (itemError) throw itemError

      // b. Create new product batch in product_batches (or update quantity if product-batch already exists)
      // Section 11: medicine contains multiple batches, do not combine them into one record.
      // We check if (product_id, batch_number) already exists
      const { data: existingBatch } = await supabase
        .from("product_batches")
        .select("id, available_quantity, initial_quantity")
        .eq("product_id", item.product_id)
        .eq("batch_number", item.batch_number)
        .maybeSingle()

      let batchId: string

      if (existingBatch) {
        // Increment quantity in existing batch
        const nextAvail = existingBatch.available_quantity + receivedQty
        const nextInit = existingBatch.initial_quantity + receivedQty
        const { error: updateBatchErr } = await supabase
          .from("product_batches")
          .update({
            available_quantity: nextAvail,
            initial_quantity: nextInit,
            status: "ACTIVE", // Reset status if it was expired/quarantined
            unit_cost: effectiveUnitCost, // Update to latest effective cost
            supplier_id: values.supplier_id
          })
          .eq("id", existingBatch.id)

        if (updateBatchErr) throw updateBatchErr
        batchId = existingBatch.id
      } else {
        // Insert new product batch
        const { data: newBatch, error: createBatchErr } = await supabase
          .from("product_batches")
          .insert({
            product_id: item.product_id,
            batch_number: item.batch_number,
            manufacturing_date: item.manufacturing_date || null,
            expiry_date: item.expiry_date || null,
            purchase_item_id: insertedItem.id,
            initial_quantity: receivedQty,
            available_quantity: receivedQty,
            unit_cost: effectiveUnitCost,
            supplier_id: values.supplier_id,
            status: "ACTIVE"
          })
          .select()
          .single()

        if (createBatchErr) throw createBatchErr
        batchId = newBatch.id
      }

      // c. Log inventory movement (positive stock in)
      const { error: moveError } = await supabase
        .from("inventory_movements")
        .insert({
          product_id: item.product_id,
          batch_id: batchId,
          movement_type: "PURCHASE",
          quantity: receivedQty,
          unit_cost: effectiveUnitCost,
          reference_type: "PURCHASE",
          reference_id: purchase.id,
          notes: `Purchase invoice #${purchaseNumber}`,
          created_by: user.id
        })

      if (moveError) throw moveError

      // d. Update product's reference purchase price to latest
      await supabase
        .from("products")
        .update({ purchase_price_reference: effectiveUnitCost })
        .eq("id", item.product_id)
    }

    // 4. Update Supplier Balance (credit increases payables)
    // Running balance increases by grand_total
    const newSupplierBalance = supplier.current_balance + values.grand_total
    const { error: supplierUpdateError } = await supabase
      .from("suppliers")
      .update({ current_balance: newSupplierBalance })
      .eq("id", values.supplier_id)

    if (supplierUpdateError) throw supplierUpdateError

    // 5. Log Supplier Ledger Entry for Purchase
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from("supplier_ledger")
      .insert({
        supplier_id: values.supplier_id,
        transaction_type: "PURCHASE",
        reference_id: purchase.id,
        reference_number: purchaseNumber,
        debit: 0.00,
        credit: values.grand_total,
        running_balance: newSupplierBalance,
        description: `Purchased inventory under Invoice: ${purchaseNumber}`
      })
      .select()
      .single()

    if (ledgerError) throw ledgerError

    // 6. Handle payment if paid_amount > 0
    if (values.paid_amount > 0) {
      // a. Insert purchase payments record
      const { error: paymentError } = await supabase
        .from("purchase_payments")
        .insert({
          purchase_id: purchase.id,
          payment_method: values.payment_method,
          amount: values.paid_amount,
          transaction_reference: values.supplier_invoice_number || null
        })

      if (paymentError) throw paymentError

      // b. Update Supplier Balance (debit decreases payables)
      const afterPaymentBalance = newSupplierBalance - values.paid_amount
      const { error: supplierUpdateError2 } = await supabase
        .from("suppliers")
        .update({ current_balance: afterPaymentBalance })
        .eq("id", values.supplier_id)

      if (supplierUpdateError2) throw supplierUpdateError2

      // c. Log Supplier Ledger Entry for Payment
      const { data: paymentLedgerEntry, error: payLedgerError } = await supabase
        .from("supplier_ledger")
        .insert({
          supplier_id: values.supplier_id,
          transaction_type: "PAYMENT",
          reference_id: purchase.id,
          reference_number: purchaseNumber,
          debit: values.paid_amount,
          credit: 0.00,
          running_balance: afterPaymentBalance,
          description: `Payment for Purchase Invoice: ${purchaseNumber} via ${values.payment_method}`
        })
        .select()
        .single()

      if (payLedgerError) throw payLedgerError

      // d. Handle Active Cash Session for CASH payments
      if (values.payment_method === "CASH") {
        const { data: activeSession } = await supabase
          .from("cash_register_sessions")
          .select("id, expected_closing_cash")
          .eq("cashier_id", user.id)
          .eq("status", "OPEN")
          .maybeSingle()

        if (activeSession) {
          // Record cash outflow movement
          await supabase.from("cash_register_movements").insert({
            session_id: activeSession.id,
            movement_type: "SUPPLIER_PAYMENT",
            amount: -values.paid_amount,
            reference_id: paymentLedgerEntry.id,
            notes: `Purchase Payment: ${supplier.name}`
          })

          // Reduce expected closing cash
          await supabase
            .from("cash_register_sessions")
            .update({ expected_closing_cash: activeSession.expected_closing_cash - values.paid_amount })
            .eq("id", activeSession.id)
        }
      }
    }

    // 7. Write Audit Log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "CREATE_PURCHASE",
      module: "PURCHASES",
      entity_type: "PURCHASE",
      entity_id: purchase.id,
      old_data: null,
      new_data: { purchase_number: purchaseNumber, grand_total: values.grand_total, paid_amount: values.paid_amount }
    })

    revalidatePath("/purchases")
    revalidatePath("/inventory/stock")
    revalidatePath("/inventory/batches")
    revalidatePath("/suppliers")
    revalidatePath(`/suppliers/${values.supplier_id}`)

    return { success: true, data: purchase }
  } catch (err: any) {
    return { error: err.message || "Failed to record purchase invoice" }
  }
}
