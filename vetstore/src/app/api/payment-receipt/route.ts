import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return new NextResponse("Missing payment ID", { status: 400 })
  }

  const supabase = await createClient()

  // Fetch payment details with customer and cashier details
  const { data: payment, error } = await supabase
    .from("customer_payments")
    .select(`
      *,
      customer:customers(name, phone),
      receiver:profiles!customer_payments_received_by_fkey(first_name, last_name, email)
    `)
    .eq("id", id)
    .single()

  if (error || !payment) {
    return new NextResponse("Payment record not found", { status: 404 })
  }

  // Fetch store settings for custom name, phone, address
  const { data: storeSettings } = await supabase
    .from("store_settings")
    .select("store_name, phone, address")
    .maybeSingle()

  const storeName = storeSettings?.store_name || "SALMAN FARSY VET STORE"
  const storePhone = storeSettings?.phone || "03148020942"
  const storeAddress = storeSettings?.address || "opposite Masjid Pakistan Gujrat Bakshahali"

  // Method formatting helper
  const getMethodLabel = (method: string): string => {
    switch (method) {
      case "CASH": return "Cash"
      case "BANK_TRANSFER": return "Bank Transfer"
      case "CARD": return "Credit/Debit Card"
      case "EASYPAISA": return "EasyPaisa"
      case "JAZZCASH": return "JazzCash"
      case "OTHER": return "Other"
      default: return method
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Receipt #${payment.reference_number || "Draft"}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 11px;
          line-height: 1.5;
          width: 74mm;
          margin: 2mm auto;
          color: #0f172a;
        }
        .text-center {
          text-align: center;
        }
        .text-right {
          text-align: right;
        }
        .bold {
          font-weight: 700;
        }
        .black {
          font-weight: 800;
          color: #000;
        }
        .header {
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .logo {
          height: 52px;
          width: 52px;
          border-radius: 50%;
          object-fit: cover;
          margin-bottom: 6px;
          border: 1.5px solid #0f172a;
        }
        .store-name {
          font-size: 14px;
          font-weight: 800;
          color: #000;
          letter-spacing: 0.25px;
          text-transform: uppercase;
        }
        .store-address {
          font-size: 9.5px;
          color: #475569;
          font-weight: 500;
          margin-top: 2px;
        }
        .receipt-title {
          font-size: 10px;
          font-weight: 700;
          background: #ecfdf5;
          border: 1px solid #86efac;
          color: #166534;
          padding: 2px 10px;
          border-radius: 9999px;
          margin-top: 6px;
          text-transform: uppercase;
        }
        .separator {
          border-top: 1.5px dashed #475569;
          margin: 8px 0;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
        }
        .meta-table td {
          font-size: 10px;
          padding: 2.5px 0;
          color: #1e293b;
        }
        .amount-row {
          font-size: 14px !important;
          font-weight: 800;
          color: #059669 !important;
        }
        .footer {
          margin-top: 18px;
          font-size: 9.5px;
          color: #475569;
          font-weight: 500;
        }
        @media print {
          body {
            margin: 0;
            width: 80mm;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="padding: 10px; text-align: center; background: #f8fafc; margin-bottom: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
        <button onclick="window.print()" style="padding: 6px 14px; font-weight: 700; font-size: 11px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          Print Receipt
        </button>
      </div>

      <div class="text-center header">
        <img src="/logo.jpeg" alt="Logo" class="logo" />
        <div class="store-name" style="font-size: 13px; font-weight: 800;">Salman Farsy Veterinary Store</div>
        <div class="store-address">Gujrat Near Masjid Pakistan<br>Contact No. 0314-8020942</div>
        <div class="receipt-title">Payment Receipt</div>
      </div>

      <div class="separator"></div>

      <table class="meta-table">
        <tr>
          <td><span class="bold">Receipt #:</span></td>
          <td class="text-right font-bold" style="color: #000;">${payment.reference_number || "—"}</td>
        </tr>
        <tr>
          <td><span class="bold">Date:</span></td>
          <td class="text-right">${new Date(payment.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}</td>
        </tr>
        <tr>
          <td><span class="bold">Cashier:</span></td>
          <td class="text-right" style="text-transform: capitalize;">${payment.receiver?.first_name || payment.receiver?.email?.split("@")[0] || "System"}</td>
        </tr>
        <tr>
          <td><span class="bold">Customer:</span></td>
          <td class="text-right font-bold">${payment.customer?.name}</td>
        </tr>
        <tr>
          <td><span class="bold">Phone:</span></td>
          <td class="text-right">${payment.customer?.phone}</td>
        </tr>
      </table>

      <div class="separator"></div>

      <table class="meta-table">
        <tr>
          <td>Previous Balance:</td>
          <td class="text-right font-semibold">Rs. ${Number(payment.previous_balance).toLocaleString()}</td>
        </tr>
        <tr class="amount-row">
          <td style="color: #059669; font-weight: 800;">Amount Received:</td>
          <td class="text-right font-bold" style="color: #059669;">Rs. ${Number(payment.amount).toLocaleString()}</td>
        </tr>
        <tr style="border-top: 1.5px dashed #475569;">
          <td class="black" style="padding-top: 6px; font-size: 12px;">New Balance:</td>
          <td class="text-right black" style="padding-top: 6px; font-size: 12px; color: ${payment.new_balance > 0 ? '#dc2626' : '#059669'}">
            Rs. ${Number(payment.new_balance).toLocaleString()}
          </td>
        </tr>
        <tr>
          <td class="bold">Payment Method:</td>
          <td class="text-right bold">${getMethodLabel(payment.payment_method)}</td>
        </tr>
        ${payment.notes ? `
        <tr>
          <td class="bold">Remarks:</td>
          <td class="text-right font-semibold">${payment.notes}</td>
        </tr>
        ` : ""}
        <tr>
          <td class="bold">Account Status:</td>
          <td class="text-right bold" style="text-transform: uppercase; color: ${payment.new_balance <= 0 ? '#059669' : '#dc2626'}">
            ${payment.new_balance <= 0 ? 'FULLY PAID' : 'PARTIALLY PAID'}
          </td>
        </tr>
      </table>

      <div class="separator"></div>

      <div class="text-center footer">
        <span class="bold" style="color: #000;">Thank You For Your Payment!</span><br>
        Software Generated Payment Receipt.<br>
        For inquiries, call 0314-8020942<br>
        <span style="font-weight: 750; font-size: 8.5px; color: #475569; display: block; margin-top: 4px;">App Design By Waqas Ali</span>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  })
}
