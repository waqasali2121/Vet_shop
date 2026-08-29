import { checkActiveRegisterSession } from "@/lib/actions/sales"
import { getCustomers } from "@/lib/actions/customers"
import { createClient } from "@/lib/supabase/server"
import { POSTerminal } from "@/components/pos/pos-terminal"

interface SearchParams {
  customerId?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

export default async function POSPage({ searchParams }: PageProps) {
  const params = await searchParams
  const defaultCustomerId = params.customerId || ""
  const supabase = await createClient()

  // 1. Check Cashier Session
  const sessionRes = await checkActiveRegisterSession()
  const activeSession = sessionRes.data || null

  // 2. Fetch Active Customers
  const customersRes = await getCustomers()
  const customers = customersRes.data || []

  // 3. Fetch Active Products along with their active non-expired stock counts
  // We fetch products and active batches, then map them.
  const todayStr = new Date().toISOString().split("T")[0]

  const [productsRes, batchesRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, generic_name, sku, barcode, retail_price, minimum_sale_price, track_expiry, unit:units(abbreviation)")
      .eq("is_active", true),
    supabase
      .from("product_batches")
      .select("product_id, available_quantity, expiry_date")
      .gt("available_quantity", 0)
      .eq("status", "ACTIVE")
  ])

  const rawProducts = productsRes.data || []
  const rawBatches = batchesRes.data || []

  // Map product stock under FEFO non-expiry rules
  const posProducts = rawProducts.map((p: any) => {
    // Filter non-expired batches
    const productBatches = rawBatches.filter((b: any) => {
      if (b.product_id !== p.id) return false
      if (!p.track_expiry || !b.expiry_date) return true
      return b.expiry_date >= todayStr
    })

    const totalStock = productBatches.reduce((sum, b) => sum + b.available_quantity, 0)

    return {
      id: p.id,
      name: p.name,
      generic_name: p.generic_name,
      sku: p.sku,
      barcode: p.barcode,
      retail_price: Number(p.retail_price),
      minimum_sale_price: Number(p.minimum_sale_price),
      unit: p.unit,
      total_stock: totalStock
    }
  })

  // Map customers
  const mappedCustomers = customers.map((c: any) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    credit_limit: Number(c.credit_limit),
    current_balance: Number(c.current_balance)
  }))

  return (
    <div className="space-y-4">
      {/* Alert if register is closed */}
      {!activeSession && (
        <div className="rounded-md bg-destructive/10 p-3.5 text-sm text-destructive font-black border border-destructive/20 flex justify-between items-center">
          <span>⚠️ CASH REGISTER IS CLOSED. You must open a register session before checking out sales.</span>
          <a href="/cash-register" className="underline font-bold hover:text-destructive/80">
            Open Register Now &rarr;
          </a>
        </div>
      )}
      <POSTerminal
        initialProducts={posProducts}
        customers={mappedCustomers}
        activeSession={activeSession as any}
        defaultCustomerId={defaultCustomerId}
      />
    </div>
  )
}
