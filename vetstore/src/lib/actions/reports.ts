"use server"

import { createClient } from "@/lib/supabase/server"

export interface ReportDateRange {
  startDate: string
  endDate: string
}

// Helper to format date boundaries (start: 00:00:00, end: 23:59:59)
function getDateFilters(startDate: string, endDate: string) {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString()
  }
}

// --- SALES REPORTS ---
export async function getSalesReport({ startDate, endDate }: ReportDateRange) {
  try {
    const supabase = await createClient()
    const { startISO, endISO } = getDateFilters(startDate, endDate)

    // 1. Fetch COMPLETED and returned sales within date range
    const { data: sales, error: salesErr } = await supabase
      .from("sales")
      .select(`
        *,
        customer:customers(name)
      `)
      .gte("created_at", startISO)
      .lte("created_at", endISO)
      .order("created_at", { ascending: false })

    if (salesErr) throw salesErr

    // Filter out VOIDED sales for calculations, but keep COMPLETED / RETURNED
    const activeSales = (sales || []).filter(s => s.sale_status !== "VOIDED")

    const totals = {
      subtotal: activeSales.reduce((sum, s) => sum + Number(s.subtotal), 0),
      discount: activeSales.reduce((sum, s) => sum + Number(s.discount_amount), 0),
      grandTotal: activeSales.reduce((sum, s) => sum + Number(s.grand_total), 0),
      paidAmount: activeSales.reduce((sum, s) => sum + Number(s.paid_amount), 0),
      balanceAmount: activeSales.reduce((sum, s) => sum + Number(s.balance_amount), 0),
      invoicesCount: activeSales.length
    }

    // 2. Fetch sale items to calculate COGS
    const saleIds = activeSales.map(s => s.id)
    let cogs = 0

    if (saleIds.length > 0) {
      const { data: items, error: itemsErr } = await supabase
        .from("sale_items")
        .select("quantity, unit_cost")
        .in("sale_id", saleIds)

      if (itemsErr) throw itemsErr
      cogs = (items || []).reduce((sum, item) => sum + (item.quantity * Number(item.unit_cost)), 0)
    }

    // Profit
    const grossProfit = totals.grandTotal - cogs

    // 3. Fetch payment method breakdown
    let paymentBreakdown = {
      CASH: 0,
      CREDIT: 0,
      EASYPAISA: 0,
      JAZZCASH: 0,
      BANK_TRANSFER: 0,
      CARD: 0,
      OTHER: 0
    }

    if (saleIds.length > 0) {
      const { data: payments, error: payErr } = await supabase
        .from("sale_payments")
        .select("payment_method, amount")
        .in("sale_id", saleIds)

      if (payErr) throw payErr
      payments?.forEach(p => {
        const method = p.payment_method as keyof typeof paymentBreakdown
        if (paymentBreakdown[method] !== undefined) {
          paymentBreakdown[method] += Number(p.amount)
        }
      })
    }

    return {
      success: true,
      data: {
        sales: sales || [], // keep voided for table display
        totals,
        cogs,
        grossProfit,
        paymentBreakdown
      }
    }
  } catch (err: any) {
    return { error: err.message || "Failed to generate sales report" }
  }
}

// --- INVENTORY VALUATION REPORTS ---
export async function getInventoryReportData() {
  try {
    const supabase = await createClient()

    // 1. Fetch active products
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select(`
        id,
        name,
        sku,
        barcode,
        retail_price,
        minimum_stock,
        category:categories(name),
        brand:brands(name),
        unit:units(abbreviation)
      `)
      .eq("is_active", true)

    if (prodErr) throw prodErr

    // 2. Fetch all active product batches
    const { data: batches, error: batchErr } = await supabase
      .from("product_batches")
      .select("product_id, available_quantity, unit_cost, expiry_date, status")
      .gt("available_quantity", 0)

    if (batchErr) throw batchErr

    const todayStr = new Date().toISOString().split("T")[0]

    let totalCostValuation = 0
    let totalRetailValuation = 0
    let lowStockCount = 0
    let expiredCount = 0

    const items = (products || []).map(product => {
      const prodBatches = (batches || []).filter(b => b.product_id === product.id)
      const stock = prodBatches.reduce((sum, b) => sum + b.available_quantity, 0)

      const costVal = prodBatches.reduce((sum, b) => sum + (b.available_quantity * Number(b.unit_cost)), 0)
      const retailVal = stock * Number(product.retail_price)

      totalCostValuation += costVal
      totalRetailValuation += retailVal

      if (stock <= product.minimum_stock) lowStockCount++

      // check if any batch is expired
      const hasExpired = prodBatches.some(b => b.expiry_date && b.expiry_date < todayStr)
      if (hasExpired) expiredCount++

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: (product.category as any)?.name || "—",
        brand: (product.brand as any)?.name || "—",
        stock,
        unit: (product.unit as any)?.abbreviation || "units",
        costValuation: costVal,
        retailValuation: retailVal,
      }
    })

    return {
      success: true,
      data: {
        items,
        summary: {
          totalCostValuation,
          totalRetailValuation,
          lowStockCount,
          expiredCount,
          totalSKUs: products?.length || 0
        }
      }
    }
  } catch (err: any) {
    return { error: err.message || "Failed to generate inventory valuation report" }
  }
}

// --- FINANCIAL SUMMARY REPORT ---
export async function getFinancialReport({ startDate, endDate }: ReportDateRange) {
  try {
    const supabase = await createClient()
    const { startISO, endISO } = getDateFilters(startDate, endDate)

    // 1. Fetch total receivables (Udhaar balance from customers)
    const { data: customers, error: custErr } = await supabase
      .from("customers")
      .select("current_balance")

    if (custErr) throw custErr
    const totalReceivables = (customers || []).reduce((sum, c) => sum + Number(c.current_balance), 0)

    // 2. Fetch total payables (Balance to suppliers)
    const { data: suppliers, error: supErr } = await supabase
      .from("suppliers")
      .select("current_balance")

    if (supErr) throw supErr
    const totalPayables = (suppliers || []).reduce((sum, s) => sum + Number(s.current_balance), 0)

    // 3. Fetch expenses grouped by category in date range
    const { data: expenses, error: expErr } = await supabase
      .from("expenses")
      .select(`
        amount,
        category:expense_categories(name)
      `)
      .gte("expense_date", startDate)
      .lte("expense_date", endDate)

    if (expErr) throw expErr

    const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0)

    const expensesByCategory: Record<string, number> = {}
    expenses?.forEach(e => {
      const catName = (e.category as any)?.name || "Uncategorized"
      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + Number(e.amount)
    })

    const mappedExpenses = Object.entries(expensesByCategory).map(([category, amount]) => ({
      category,
      amount
    }))

    return {
      success: true,
      data: {
        totalReceivables,
        totalPayables,
        totalExpenses,
        expensesByCategory: mappedExpenses
      }
    }
  } catch (err: any) {
    return { error: err.message || "Failed to generate financial report" }
  }
}
