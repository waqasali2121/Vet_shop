"use server"

import { createClient } from "@/lib/supabase/server"

export async function getDashboardData() {
  try {
    const supabase = await createClient()

    // 1. Setup today's date boundaries (in UTC or local timezone boundary)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayStartISO = todayStart.toISOString()

    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    const todayEndISO = todayEnd.toISOString()

    // 2. Fetch Today's Sales
    const { data: todaySales, error: salesErr } = await supabase
      .from("sales")
      .select("grand_total, paid_amount, balance_amount, subtotal, id")
      .gte("created_at", todayStartISO)
      .lte("created_at", todayEndISO)
      .neq("sale_status", "VOIDED")

    if (salesErr) throw salesErr

    const salesTotal = (todaySales || []).reduce((sum, s) => sum + Number(s.grand_total), 0)
    const paidTotal = (todaySales || []).reduce((sum, s) => sum + Number(s.paid_amount), 0)
    const creditTotal = (todaySales || []).reduce((sum, s) => sum + Number(s.balance_amount), 0)

    // 3. Fetch today's sale items to calculate Gross Profit
    const todaySaleIds = (todaySales || []).map(s => s.id)
    let todayCOGS = 0

    if (todaySaleIds.length > 0) {
      const { data: items, error: itemsErr } = await supabase
        .from("sale_items")
        .select("quantity, unit_cost")
        .in("sale_id", todaySaleIds)

      if (itemsErr) throw itemsErr
      todayCOGS = (items || []).reduce((sum, item) => sum + (item.quantity * Number(item.unit_cost)), 0)
    }

    const todayGrossProfit = salesTotal - todayCOGS

    // 4. Fetch Active Cash Session Expected Cash
    const { data: { user } } = await supabase.auth.getUser()
    let activeCash = 0
    if (user) {
      const { data: activeSession } = await supabase
        .from("cash_register_sessions")
        .select("expected_closing_cash")
        .eq("cashier_id", user.id)
        .eq("status", "OPEN")
        .maybeSingle()

      if (activeSession) {
        activeCash = Number(activeSession.expected_closing_cash)
      }
    }

    // 5. Count Low Stock and Expired Items
    // Fetch products
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, minimum_stock")
      .eq("is_active", true)

    if (prodErr) throw prodErr

    // Fetch active batches
    const { data: batches, error: batchErr } = await supabase
      .from("product_batches")
      .select("product_id, available_quantity, expiry_date")
      .gt("available_quantity", 0)
      .eq("status", "ACTIVE")

    if (batchErr) throw batchErr

    const todayStr = new Date().toISOString().split("T")[0]
    let lowStockCount = 0
    let expiredCount = 0
    let expiringSoonCount = 0

    const ninetyDaysLater = new Date()
    ninetyDaysLater.setDate(ninetyDaysLater.getDate() + 90)
    const ninetyDaysLaterStr = ninetyDaysLater.toISOString().split("T")[0]

    products?.forEach(p => {
      const pBatches = (batches || []).filter(b => b.product_id === p.id)
      const stock = pBatches.reduce((sum, b) => sum + b.available_quantity, 0)
      if (stock <= p.minimum_stock) {
        lowStockCount++
      }
    })

    batches?.forEach(b => {
      if (b.expiry_date) {
        if (b.expiry_date < todayStr) {
          expiredCount++
        } else if (b.expiry_date >= todayStr && b.expiry_date <= ninetyDaysLaterStr) {
          expiringSoonCount++
        }
      }
    })

    // 6. Fetch Expiry Alerts (Expiring in the next 90 days)
    const { data: expiryAlerts, error: expAlertErr } = await supabase
      .from("product_batches")
      .select(`
        *,
        product:products(id, name, sku),
        supplier:suppliers(name)
      `)
      .gt("available_quantity", 0)
      .eq("status", "ACTIVE")
      .gte("expiry_date", todayStr)
      .lte("expiry_date", ninetyDaysLaterStr)
      .order("expiry_date", { ascending: true })
      .limit(5)

    if (expAlertErr) throw expAlertErr

    // 7. Fetch 5 Most Recent Sales Transactions
    const { data: recentSales, error: recErr } = await supabase
      .from("sales")
      .select(`
        *,
        customer:customers(name)
      `)
      .order("created_at", { ascending: false })
      .limit(5)

    if (recErr) throw recErr

    // 8. Fetch total products, customers, suppliers count
    const { count: totalProductsCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)

    const { count: totalCustomersCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)

    const { count: totalSuppliersCount } = await supabase
      .from("suppliers")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)

    // 9. Fetch monthly revenue (current calendar month)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const startOfMonthISO = startOfMonth.toISOString()

    const { data: monthSales } = await supabase
      .from("sales")
      .select("grand_total")
      .gte("created_at", startOfMonthISO)
      .neq("sale_status", "VOIDED")

    const monthlyRevenue = (monthSales || []).reduce((sum, s) => sum + Number(s.grand_total), 0)

    // 10. Fetch Most Bought Medicines (top 5 by quantity)
    const { data: allSaleItems } = await supabase
      .from("sale_items")
      .select("product_id, quantity, product:products(name)")

    const itemSalesMap: Record<string, { name: string; quantity: number }> = {}
    allSaleItems?.forEach(item => {
      const prodId = item.product_id
      const prodName = (item.product as any)?.name || "Unknown Product"
      if (!itemSalesMap[prodId]) {
        itemSalesMap[prodId] = { name: prodName, quantity: 0 }
      }
      itemSalesMap[prodId].quantity += item.quantity
    })

    const mostBought = Object.values(itemSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    return {
      success: true,
      data: {
        kpis: {
          todaySales: salesTotal,
          todayBillsCount: todaySales?.length || 0,
          todayRevenue: paidTotal,
          monthlyRevenue,
          totalProducts: totalProductsCount || 0,
          totalCustomers: totalCustomersCount || 0,
          totalSuppliers: totalSuppliersCount || 0,
          lowStockCount,
          expiredCount,
          expiringSoonCount,
          todayGrossProfit,
          activeCashSession: activeCash,
          creditSales: creditTotal,
          cashSales: paidTotal,
        },
        expiryAlerts: expiryAlerts || [],
        recentSales: recentSales || [],
        mostBought: mostBought || []
      }
    }
  } catch (err: any) {
    return { error: err.message || "Failed to generate dashboard overview metrics" }
  }
}
