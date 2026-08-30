"use client"

import * as React from "react"
import { useState, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createSale } from "@/lib/actions/sales"
import { createCustomer } from "@/lib/actions/customers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  Loader2,
  Printer,
  Barcode
} from "lucide-react"

type POSProduct = {
  id: string
  name: string
  generic_name: string | null
  sku: string | null
  barcode: string | null
  retail_price: number
  minimum_sale_price: number
  unit: { abbreviation: string } | null
  total_stock: number
}

type POSCustomer = {
  id: string
  name: string
  phone: string
  credit_limit: number
  current_balance: number
}

interface POSTerminalProps {
  initialProducts: POSProduct[]
  customers: POSCustomer[]
  activeSession: { id: string } | null
  defaultCustomerId?: string
}

type CartItem = {
  product: POSProduct
  quantity: number
  unit_price: number
  discount_amount: number
}

export function POSTerminal({ initialProducts, customers, activeSession, defaultCustomerId = "" }: POSTerminalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // State Management
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustomerId || "00000000-0000-0000-0000-000000000000") // Walk-in or default

  // Discount & History Management
  const [discountPercent, setDiscountPercent] = useState("")
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Fetch customer purchase history dynamically when selection changes
  React.useEffect(() => {
    if (selectedCustomerId && selectedCustomerId !== "00000000-0000-0000-0000-000000000000") {
      setLoadingHistory(true)
      import("@/lib/actions/sales").then(async ({ getCustomerPurchaseHistory }) => {
        const res = await getCustomerPurchaseHistory(selectedCustomerId)
        if (res.data) {
          setPurchaseHistory(res.data)
        }
        setLoadingHistory(false)
      })
    } else {
      setPurchaseHistory([])
    }
  }, [selectedCustomerId])

  // Payment Breakdown
  const [paidCash, setPaidCash] = useState("")
  const [paidEasypaisa, setPaidEasypaisa] = useState("")
  const [paidJazzcash, setPaidJazzcash] = useState("")
  const [paidBank, setPaidBank] = useState("")
  const [notes, setNotes] = useState("")

  // Modals
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Customer Form State
  const [custName, setCustName] = useState("")
  const [custPhone, setCustPhone] = useState("")
  const [custType, setCustType] = useState<any>("WALK_IN")
  const [custLimit, setCustLimit] = useState("50000")
  const [creatingCust, setCreatingCust] = useState(false)

  // Focus ref for barcode scanner input autofocus
  const searchInputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    // Autofocus search on mount
    searchInputRef.current?.focus()
  }, [])

  // Filter products based on search
  const filteredProducts = searchQuery.trim() === ""
    ? []
    : initialProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.generic_name && p.generic_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.barcode && p.barcode.includes(searchQuery))
      )

  // Auto-add product if barcode exact match
  React.useEffect(() => {
    if (searchQuery.trim() === "") return

    const exactMatch = initialProducts.find(p => p.barcode === searchQuery.trim())
    if (exactMatch) {
      handleAddToCart(exactMatch)
      setSearchQuery("") // Clear search
    }
  }, [searchQuery, initialProducts])

  // Cart operations
  const handleAddToCart = (product: POSProduct) => {
    setError(null)
    if (product.total_stock <= 0) {
      setError(`Product ${product.name} is out of stock.`)
      return
    }

    const existingIdx = cart.findIndex(item => item.product.id === product.id)
    if (existingIdx > -1) {
      const nextQty = cart[existingIdx].quantity + 1
      if (nextQty > product.total_stock) {
        setError(`Insufficient stock. Only ${product.total_stock} units are available.`)
        return
      }
      const newCart = [...cart]
      newCart[existingIdx].quantity = nextQty
      setCart(newCart)
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unit_price: product.retail_price,
          discount_amount: 0
        }
      ])
    }
    searchInputRef.current?.focus()
  }

  const handleUpdateQty = (index: number, delta: number) => {
    setError(null)
    const newCart = [...cart]
    const nextQty = newCart[index].quantity + delta
    if (nextQty <= 0) {
      handleRemoveItem(index)
      return
    }

    if (nextQty > newCart[index].product.total_stock) {
      setError(`Only ${newCart[index].product.total_stock} units are available in stock.`)
      return
    }

    newCart[index].quantity = nextQty
    setCart(newCart)
  }

  const handleUpdatePrice = (index: number, price: number) => {
    setError(null)
    const item = cart[index]
    const minPrice = item.product.minimum_sale_price
    if (price - item.discount_amount < minPrice) {
      setError(`Net price cannot drop below minimum price of Rs. ${minPrice}. Reduce discount or increase price.`)
      return
    }
    const newCart = [...cart]
    newCart[index].unit_price = price
    setCart(newCart)
  }

  const handleUpdateDiscount = (index: number, discount: number) => {
    setError(null)
    if (discount < 0) return
    const item = cart[index]
    const minPrice = item.product.minimum_sale_price
    if (item.unit_price - discount < minPrice) {
      setError(`Cannot discount below minimum price of Rs. ${minPrice}. Max discount allowed: Rs. ${item.unit_price - minPrice}`)
      return
    }
    const newCart = [...cart]
    newCart[index].discount_amount = discount
    setCart(newCart)
  }

  const handleRemoveItem = (index: number) => {
    const newCart = [...cart]
    newCart.splice(index, 1)
    setCart(newCart)
  }

  // Totals calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const itemDiscountTotal = cart.reduce((sum, item) => sum + Number(item.discount_amount), 0)
  const percentDiscountAmount = subtotal * (Number(discountPercent) / 100 || 0)
  const discountTotal = itemDiscountTotal + percentDiscountAmount
  const grandTotal = Math.max(0, subtotal - discountTotal)

  const numCash = Number(paidCash) || 0
  const numEasypaisa = Number(paidEasypaisa) || 0
  const numJazzcash = Number(paidJazzcash) || 0
  const numBank = Number(paidBank) || 0
  const totalPaid = numCash + numEasypaisa + numJazzcash + numBank

  const balanceDue = Math.max(0, grandTotal - totalPaid)
  const changeAmount = totalPaid > grandTotal ? totalPaid - grandTotal : 0

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)

  const handleFullCashPayment = () => {
    setPaidCash(String(grandTotal))
    setPaidEasypaisa("")
    setPaidJazzcash("")
    setPaidBank("")
  }

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!custName.trim() || !custPhone.trim()) return

    setCreatingCust(true)
    startTransition(async () => {
      const res = await createCustomer({
        name: custName,
        phone: custPhone,
        customer_type: custType,
        credit_limit: Number(custLimit),
        opening_balance: 0,
        address: "",
        is_active: true
      })

      if (res.error) {
        setError(res.error)
      } else if (res.data) {
        setSelectedCustomerId(res.data.id)
        setCustomerModalOpen(false)
        // Reset customer form
        setCustName("")
        setCustPhone("")
      }
      setCreatingCust(false)
    })
  }

  const handleCheckout = () => {
    setError(null)
    if (!activeSession) {
      setError("Please open a cash register session before checking out.")
      return
    }
    if (cart.length === 0) {
      setError("Cart is empty.")
      return
    }

    // Walk-in credit check
    const isWalkIn = selectedCustomerId === "00000000-0000-0000-0000-000000000000"
    if (isWalkIn && balanceDue > 0) {
      setError("Walk-in customers cannot purchase on credit. Cash or digital payment must match Grand Total.")
      return
    }

    // Customer credit limit check
    if (!isWalkIn && balanceDue > 0 && selectedCustomer) {
      const currentCredit = selectedCustomer.current_balance
      const projectedCredit = currentCredit + balanceDue
      if (projectedCredit > selectedCustomer.credit_limit) {
        setError(`Credit limit exceeded. Customer credit limit is Rs. ${selectedCustomer.credit_limit.toLocaleString()}, current balance is Rs. ${currentCredit.toLocaleString()}`)
        return
      }
    }

    // Bypass browser pop-up blocker by opening the window synchronously first
    const printWindow = typeof window !== "undefined" ? window.open("about:blank", "_blank", "width=400,height=600") : null

    startTransition(async () => {
      // Build payments array
      const payments = []
      if (numCash > 0) payments.push({ payment_method: "CASH" as const, amount: numCash })
      if (numEasypaisa > 0) payments.push({ payment_method: "EASYPAISA" as const, amount: numEasypaisa })
      if (numJazzcash > 0) payments.push({ payment_method: "JAZZCASH" as const, amount: numJazzcash })
      if (numBank > 0) payments.push({ payment_method: "BANK_TRANSFER" as const, amount: numBank })

      // If there is still a balance due, and customer is not walk-in, the remaining balance goes to credit
      if (balanceDue > 0 && !isWalkIn) {
        payments.push({ payment_method: "CREDIT" as const, amount: balanceDue })
      }

      const payload = {
        customer_id: selectedCustomerId,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount
        })),
        payments,
        subtotal,
        discount_amount: discountTotal,
        tax_amount: 0,
        grand_total: grandTotal,
        paid_amount: Math.min(grandTotal, totalPaid),
        balance_amount: balanceDue,
        notes
      }

      const res = await createSale(payload)
      if (res.error) {
        setError(res.error)
        printWindow?.close() // Close the blank window on error
      } else if (res.data) {
        setCompletedSaleId(res.data.id)
        setReceiptModalOpen(true)
        // Redirect the blank window to the real print receipt URL
        if (printWindow) {
          printWindow.location.href = `/api/receipt?id=${res.data.id}`
        }
        // Clear terminal cart
        setCart([])
        setPaidCash("")
        setPaidEasypaisa("")
        setPaidJazzcash("")
        setPaidBank("")
        setNotes("")
      }
    })
  }

  const handlePrintReceipt = () => {
    if (!completedSaleId) return
    window.open(`/api/receipt?id=${completedSaleId}`, "_blank", "width=400,height=600")
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-5 flex-1 min-h-0 md:h-full md:overflow-hidden pr-1">
      {/* LEFT COLUMN: Product Catalog & Search (3/5 width) */}
      <div className="col-span-1 md:col-span-3 flex flex-col h-auto md:h-full space-y-4">
        {/* Search Header */}
        <Card className="border-slate-200/80 shadow-sm shrink-0">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                ref={searchInputRef}
                placeholder="Scan Barcode or Search by Name, Generic Formula, SKU..."
                className="pl-9 border-slate-200 focus-visible:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold flex items-center gap-1 bg-slate-100 rounded px-1.5 py-0.5">
                <Barcode className="h-3.5 w-3.5 text-slate-500" />
                <span>Scanner Active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Results / Catalog */}
        <Card className="border-slate-200/80 shadow-sm flex-1 min-h-[350px] md:min-h-0 overflow-hidden flex flex-col">
          <CardHeader className="pb-2 border-b border-slate-100 shrink-0">
            <CardTitle className="text-sm font-bold text-slate-900">Product List</CardTitle>
            <CardDescription className="text-xs">
              {searchQuery.trim() === "" ? "Type in search box or scan barcode to load items." : `${filteredProducts.length} items found.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin">
            {searchQuery.trim() === "" ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 p-6">
                <ShoppingCart className="h-12 w-12 text-slate-200" />
                <p className="text-xs font-bold text-slate-400">POS Terminal Ready</p>
                <p className="text-[11px] text-slate-400">Autofocus scanner. Scan a product barcode or enter a search query.</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-1 p-6">
                <p className="text-xs font-bold">No matching products found</p>
                <p className="text-[11px]">Verify if product is active and has registered barcode.</p>
              </div>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => {
                  const outOfStock = product.total_stock <= 0
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleAddToCart(product)}
                      disabled={outOfStock}
                      className={`flex flex-col text-left p-3 border rounded-lg hover:border-primary hover:bg-slate-50/50 transition-all cursor-pointer relative w-full ${
                        outOfStock ? "opacity-60 bg-slate-50 border-slate-200" : "border-slate-200"
                      }`}
                    >
                      <div className="font-bold text-slate-800 text-xs line-clamp-2 min-h-[2rem]">
                        {product.name}
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold italic mt-0.5">
                        {product.generic_name || "—"}
                      </span>
                      <div className="flex items-baseline justify-between mt-3 w-full border-t border-slate-100 pt-2">
                        <span className="font-black text-sm text-slate-900">
                          Rs. {product.retail_price.toLocaleString()}
                        </span>
                        <span className={`text-[10px] font-bold ${
                          outOfStock
                            ? "text-red-600 line-through"
                            : product.total_stock < 10
                              ? "text-amber-600"
                              : "text-slate-500"
                        }`}>
                          {outOfStock ? "Out of Stock" : `Stock: ${product.total_stock} ${product.unit?.abbreviation || "vials"}`}
                          {product.total_stock > 0 && product.total_stock < 10 && " (Low)"}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: POS Cart & Checkout Panel (2/5 width) */}
      <div className="col-span-1 md:col-span-2 flex flex-col h-auto md:h-full">
        {/* Unified Cart & Checkout Card */}
        <Card className="border-slate-200/80 shadow-sm h-full flex flex-col overflow-hidden">
          {/* Card Header (Sticky) */}
          <CardHeader className="pb-2.5 border-b border-slate-100 shrink-0 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <CardTitle className="font-bold text-slate-900 text-sm">POS Cart & Checkout</CardTitle>
            </div>
            <Badge variant="outline" className="font-bold text-xs bg-slate-100">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
            </Badge>
          </CardHeader>

          {/* Scrollable Middle Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-slate-100 p-0">

            {/* Cart Items List */}
            <div className="divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-1.5 p-6">
                  <ShoppingCart className="h-10 w-10 text-slate-200" />
                  <p className="text-xs font-semibold">Your cart is empty</p>
                  <p className="text-[10px]">Add products to proceed to checkout.</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={item.product.id} className="p-3.5 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col max-w-[200px]">
                        <span className="font-bold text-xs text-slate-800 line-clamp-1">{item.product.name}</span>
                        <span className="text-[9px] text-slate-400 font-semibold font-mono">SKU: {item.product.sku}</span>
                      </div>
                      <span className="font-bold text-xs text-slate-900">
                        Rs. {((item.quantity * item.unit_price) - item.discount_amount).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      {/* Qty Modifiers */}
                      <div className="flex items-center border border-slate-200 rounded overflow-hidden">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-none hover:bg-slate-100 shrink-0"
                          onClick={() => handleUpdateQty(idx, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          max={item.product.total_stock}
                          value={item.quantity === 0 ? "" : item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10)
                            if (isNaN(val) || val <= 0) {
                              const newCart = [...cart]
                              newCart[idx].quantity = 0 // temp empty value while typing
                              setCart(newCart)
                              return
                            }
                            if (val > item.product.total_stock) {
                              setError(`Insufficient stock. Only ${item.product.total_stock} units available.`)
                              const newCart = [...cart]
                              newCart[idx].quantity = item.product.total_stock
                              setCart(newCart)
                              return
                            }
                            setError(null)
                            const newCart = [...cart]
                            newCart[idx].quantity = val
                            setCart(newCart)
                          }}
                          onBlur={() => {
                            if (item.quantity <= 0) {
                              const newCart = [...cart]
                              newCart[idx].quantity = 1
                              setCart(newCart)
                            }
                          }}
                          className="h-7 w-10 text-center text-xs font-bold border-0 border-x border-slate-200 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shrink-0"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-none hover:bg-slate-100 shrink-0"
                          onClick={() => handleUpdateQty(idx, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Cost/Discount modifier inputs */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Label className="text-[9px] text-slate-400 font-bold uppercase">Price</Label>
                          <Input
                            type="number"
                            className="h-7 w-16 text-[10px] px-1 text-center border-slate-200"
                            value={item.unit_price}
                            onChange={(e) => handleUpdatePrice(idx, Number(e.target.value))}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Label className="text-[9px] text-slate-400 font-bold uppercase">Disc</Label>
                          <Input
                            type="number"
                            className="h-7 w-12 text-[10px] px-1 text-center border-slate-200"
                            value={item.discount_amount}
                            onChange={(e) => handleUpdateDiscount(idx, Number(e.target.value))}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:bg-red-50"
                          onClick={() => handleRemoveItem(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer selector & info */}
            <div className="p-4 space-y-4 bg-slate-50/20">
              <div className="flex items-end gap-2">
                <div className="grid gap-1.5 flex-1">
                  <Label htmlFor="cust_select" className="text-xs text-slate-600 font-semibold">Select Customer</Label>
                  <select
                    id="cust_select"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCustomerModalOpen(true)}
                  className="h-9 w-9 text-slate-600 border-slate-200 cursor-pointer"
                  title="Add New Customer"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>

              {/* Customer ledger information */}
              {selectedCustomerId !== "00000000-0000-0000-0000-000000000000" && selectedCustomer && (
                <div className="bg-slate-50 border border-slate-200/60 rounded p-2.5 text-xs space-y-1.5 font-semibold">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Ledger Udhaar</span>
                    <span className="text-red-600 font-bold">Rs. {Number(selectedCustomer.current_balance).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Allowed Credit Limit</span>
                    <span className="text-slate-700 font-bold">Rs. {Number(selectedCustomer.credit_limit).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/60 pt-1.5 mt-1.5">
                    <span className="text-slate-500 font-bold">Remaining Credit Limit</span>
                    <span className={`font-black ${
                      (selectedCustomer.credit_limit - selectedCustomer.current_balance) <= 0
                        ? "text-red-600"
                        : (selectedCustomer.credit_limit - selectedCustomer.current_balance) < grandTotal
                          ? "text-amber-600"
                          : "text-emerald-600"
                    }`}>
                      Rs. {(selectedCustomer.credit_limit - selectedCustomer.current_balance).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Customer Purchase History */}
              {selectedCustomerId !== "00000000-0000-0000-0000-000000000000" && (
                <div className="bg-slate-50 border border-slate-200/60 rounded p-2.5 text-xs space-y-2">
                  <span className="text-slate-500 font-bold uppercase tracking-wider block border-b border-slate-200 pb-1 text-[9px]">Past Purchase History</span>
                  {loadingHistory ? (
                    <div className="flex items-center gap-1.5 py-1 text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Loading past bills...</span>
                    </div>
                  ) : purchaseHistory.length === 0 ? (
                    <div className="text-[10px] text-slate-400 py-1 font-medium">No prior purchases recorded.</div>
                  ) : (
                    <div className="space-y-2 max-h-32 overflow-y-auto divide-y divide-slate-200/60 pr-1">
                      {purchaseHistory.map((sale) => (
                        <div key={sale.id} className="pt-1.5 first:pt-0">
                          <div className="flex justify-between font-bold text-slate-700 text-[10px]">
                            <span>{sale.invoice_number}</span>
                            <span>Rs. {Number(sale.grand_total).toLocaleString()}</span>
                          </div>
                          <div className="text-[9px] text-slate-400 font-medium">
                            {new Date(sale.created_at).toLocaleDateString()}
                          </div>
                          <div className="mt-1 text-[10px] text-slate-600 space-y-0.5">
                            {sale.items?.map((item: any) => (
                              <div key={item.id} className="flex justify-between text-[10px]">
                                <span className="truncate max-w-[125px]">{item.product?.name}</span>
                                <span>Qty: {item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payments & Discount Percent */}
            <div className="p-4 space-y-4 bg-slate-50/10">
              <Label className="text-xs text-slate-600 font-semibold block">Record Payments</Label>
              <div className="grid grid-cols-2 gap-2 items-start">
                <div className="flex flex-col gap-1">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-[10px] text-slate-400 font-bold font-mono">CASH</span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={paidCash}
                      onChange={(e) => setPaidCash(e.target.value)}
                      className="h-8 pl-12 text-xs border-slate-200 font-bold text-slate-800"
                    />
                  </div>
                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-1 px-0.5">
                    <button
                      type="button"
                      onClick={() => setPaidCash(String(grandTotal))}
                      className="text-[9px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-1 py-0.5 rounded cursor-pointer transition-colors"
                      title="Exact amount"
                    >
                      Exact
                    </button>
                    {[100, 500, 1000, 5000].map((note) => (
                      <button
                        type="button"
                        key={note}
                        onClick={() => {
                          const current = Number(paidCash) || 0
                          setPaidCash(String(current + note))
                        }}
                        className="text-[9px] font-semibold text-slate-650 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        +{note}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPaidCash("")}
                      className="text-[9px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-1 py-0.5 rounded cursor-pointer transition-colors"
                      title="Clear"
                    >
                      C
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-[10px] text-slate-400 font-bold font-mono">E-PAISA</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={paidEasypaisa}
                    onChange={(e) => setPaidEasypaisa(e.target.value)}
                    className="h-8 pl-14 text-xs border-slate-200 font-bold text-slate-800"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-[10px] text-slate-400 font-bold font-mono">J-CASH</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={paidJazzcash}
                    onChange={(e) => setPaidJazzcash(e.target.value)}
                    className="h-8 pl-14 text-xs border-slate-200 font-bold text-slate-800"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-[10px] text-slate-400 font-bold font-mono">BANK</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={paidBank}
                    onChange={(e) => setPaidBank(e.target.value)}
                    className="h-8 pl-12 text-xs border-slate-200 font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Percentage Discount */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                <Label htmlFor="disc_percent" className="text-xs text-slate-600 font-semibold">Discount Percent (%)</Label>
                <Input
                  id="disc_percent"
                  type="number"
                  placeholder="0"
                  max="100"
                  min="0"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="h-8 w-20 text-xs text-center border-slate-200 font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Sticky Calculations Breakdown */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2 text-xs font-semibold shrink-0">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Discount (-)</span>
              <span className="text-red-600">Rs. {discountTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-800 font-bold text-sm border-t border-slate-100 pt-2">
              <span>Grand Total</span>
              <span className="text-base font-black text-slate-900">Rs. {grandTotal.toLocaleString()}</span>
            </div>

            {/* Cash payment calculations */}
            {totalPaid > 0 && (
              <div className="flex justify-between text-emerald-600 border-t border-dashed border-slate-200 pt-1.5">
                <span>Total Paid (Received)</span>
                <span>Rs. {totalPaid.toLocaleString()}</span>
              </div>
            )}
            {changeAmount > 0 && (
              <div className="flex justify-between text-blue-600 font-bold">
                <span>Change Return Cash</span>
                <span>Rs. {changeAmount.toLocaleString()}</span>
              </div>
            )}
            {balanceDue > 0 && (
              <div className="flex justify-between text-red-600 font-bold">
                <span>Unpaid Balance (Credit/Udhaar)</span>
                <span>Rs. {balanceDue.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Sticky Actions Footer */}
          <CardFooter className="p-4 border-t border-slate-100 bg-slate-50/80 rounded-b-xl flex flex-col gap-2 shrink-0">
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                onClick={handleFullCashPayment}
                variant="outline"
                className="font-semibold text-xs py-2 flex-1 border-slate-200 cursor-pointer"
              >
                Full Cash
              </Button>
              <Button
                type="button"
                onClick={handleCheckout}
                disabled={isPending || cart.length === 0}
                className="font-semibold text-xs py-2 flex-1 shadow-sm cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Checking out...
                  </>
                ) : (
                  "Complete Checkout"
                )}
              </Button>
            </div>
            {/* Display error if exists */}
            {error && (
              <p className="text-[10px] font-bold text-red-600 w-full text-center mt-1">
                {error}
              </p>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Customer Registration Dialog */}
      <Dialog open={customerModalOpen} onOpenChange={setCustomerModalOpen}>
        <DialogContent className="max-w-sm">
          <form onSubmit={handleCreateCustomer}>
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-900">Add New Customer</DialogTitle>
              <DialogDescription className="text-slate-500">
                Register a new farmer, veterinarian, or dealer in the system.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div className="grid gap-1">
                <Label htmlFor="custName" className="text-xs text-slate-650">Customer Name *</Label>
                <Input
                  id="custName"
                  placeholder="e.g. Haji Muhammad Ali"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="custPhone" className="text-xs text-slate-650">Phone Number *</Label>
                <Input
                  id="custPhone"
                  placeholder="e.g. 0300-9876543"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="custType" className="text-xs text-slate-650">Customer Type</Label>
                <select
                  id="custType"
                  value={custType}
                  onChange={(e) => setCustType(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="WALK_IN">Walk-in</option>
                  <option value="FARMER">Farmer</option>
                  <option value="DAIRY_FARM">Dairy Farm</option>
                  <option value="POULTRY_FARM">Poultry Farm</option>
                  <option value="VETERINARIAN">Veterinarian</option>
                  <option value="DEALER">Dealer</option>
                  <option value="PET_OWNER">Pet Owner</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="custLimit" className="text-xs text-slate-650">Udhaar Credit Limit (Rs.)</Label>
                <Input
                  id="custLimit"
                  type="number"
                  placeholder="e.g. 50000"
                  value={custLimit}
                  onChange={(e) => setCustLimit(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCustomerModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creatingCust}>
                {creatingCust ? "Creating..." : "Save Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Checkout Receipt Modal Popup */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold text-slate-900 text-center">Sale Completed Successfully!</DialogTitle>
            <DialogDescription className="text-slate-500 text-center">
              The invoice has been generated. Press the button below to print the thermal receipt.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg bg-slate-50/50">
            <Printer className="h-10 w-10 text-primary mb-2 animate-bounce" />
            <p className="text-xs font-semibold text-slate-600">POS Receipt Printer Ready</p>
            <p className="text-[10px] text-slate-400 mt-1">Supports standard 80mm thermal printers</p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReceiptModalOpen(false)}
              className="font-semibold cursor-pointer"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handlePrintReceipt}
              className="font-semibold gap-2 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Print Receipt (80mm)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
