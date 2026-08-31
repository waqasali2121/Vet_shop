import { NextRequest, NextResponse } from "next/server"
import { getSaleReceiptData } from "@/lib/actions/sales"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return new NextResponse("Missing invoice ID", { status: 400 })
  }

  const res = await getSaleReceiptData(id)
  if (res.error || !res.data) {
    return new NextResponse("Invoice not found", { status: 404 })
  }

  const sale = res.data as any
  const supabase = await createClient()

  // Fetch store settings for dynamically custom name, phone, address
  const { data: storeSettings } = await supabase
    .from("store_settings")
    .select("store_name, phone, address")
    .maybeSingle()

  const storeName = storeSettings?.store_name || "SALMAN FARSY VET STORE"
  const storePhone = storeSettings?.phone || "03148020942"
  const storeAddress = storeSettings?.address || "opposite Masjid Pakistan Gujrat Bakshahali"

  // Formatting helper for currency
  const formatCurrency = (val: number) => `Rs. ${Number(val).toLocaleString()}`

  // Render pure HTML thermal receipt
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice #${sale.invoice_number}</title>
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
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #1e293b;
          padding: 2px 10px;
          border-radius: 9999px;
          margin-top: 6px;
          text-transform: uppercase;
        }
        .separator {
          border-top: 1.5px dashed #475569;
          margin: 8px 0;
        }
        .meta-table, .items-table, .totals-table {
          width: 100%;
          border-collapse: collapse;
        }
        .meta-table td, .totals-table td {
          font-size: 10px;
          padding: 2.5px 0;
          color: #1e293b;
        }
        .items-table th {
          border-bottom: 1.5px solid #0f172a;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 0;
          color: #000;
          text-transform: uppercase;
        }
        .items-table td {
          font-size: 10px;
          padding: 5px 0;
          vertical-align: top;
          color: #1e293b;
        }
        .item-row {
          border-bottom: 1px dotted #cbd5e1;
        }
        .totals-table tr.grand-total-row {
          border-top: 1.5px dashed #475569;
          border-bottom: 1.5px dashed #475569;
          font-weight: 800;
          font-size: 12px;
          color: #000;
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
        <div class="store-name">${storeName}</div>
        <div class="store-address">${storeAddress}<br>Mobile No. ${storePhone}</div>
        <div class="receipt-title">Retail Invoice</div>
      </div>

      <div class="separator"></div>

      <table class="meta-table">
        <tr>
          <td><span class="bold">Invoice #:</span></td>
          <td class="text-right font-bold" style="color: #000;">${sale.invoice_number}</td>
        </tr>
        <tr>
          <td><span class="bold">Date:</span></td>
          <td class="text-right">${new Date(sale.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}</td>
        </tr>
        <tr>
          <td><span class="bold">Cashier:</span></td>
          <td class="text-right" style="text-transform: capitalize;">${sale.cashier?.first_name || sale.cashier?.email.split("@")[0]}</td>
        </tr>
        <tr>
          <td><span class="bold">Customer:</span></td>
          <td class="text-right font-bold">${sale.customer?.name}</td>
        </tr>
      </table>

      <div class="separator"></div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align: left; width: 50%;">Item Description</th>
            <th class="text-center" style="width: 15%;">Qty</th>
            <th class="text-right" style="width: 35%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${sale.items.map((item: any) => `
            <tr class="item-row">
              <td style="text-align: left; padding: 5px 0;">
                <div class="bold" style="color: #0f172a; font-size: 10px;">${item.product?.name}</div>
                <div style="font-size: 9px; color: #64748b; font-weight: 500;">
                  Price: Rs. ${Number(item.unit_price).toLocaleString()}
                </div>
                ${item.discount_amount > 0 ? `<div style="font-size: 8.5px; color: #dc2626; font-weight: 700;">(Disc: -Rs. ${Number(item.discount_amount).toLocaleString()})</div>` : ""}
              </td>
              <td class="text-center" style="padding: 5px 0; font-weight: 600;">${item.quantity} ${item.product?.unit?.abbreviation || ""}</td>
              <td class="text-right bold" style="padding: 5px 0; color: #000;">Rs. ${Number(item.line_total).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="separator"></div>

      <table class="totals-table">
        <tr>
          <td>Subtotal:</td>
          <td class="text-right">Rs. ${Number(sale.subtotal).toLocaleString()}</td>
        </tr>
        ${sale.discount_amount > 0 ? `
        <tr>
          <td style="color: #dc2626; font-weight: 600;">Discount (-):</td>
          <td class="text-right font-semibold" style="color: #dc2626;">Rs. ${Number(sale.discount_amount).toLocaleString()}</td>
        </tr>
        ` : ""}
        <tr class="grand-total-row">
          <td style="padding: 5px 0; font-size: 11.5px; font-weight: 800;">Grand Total:</td>
          <td class="text-right" style="padding: 5px 0; font-size: 11.5px; font-weight: 800;">Rs. ${Number(sale.grand_total).toLocaleString()}</td>
        </tr>
        <tr>
          <td>Amount Paid:</td>
          <td class="text-right">Rs. ${Number(sale.paid_amount).toLocaleString()}</td>
        </tr>
        <tr class="bold">
          <td style="color: ${sale.balance_amount > 0 ? '#dc2626' : '#1e293b'}">Remaining Balance:</td>
          <td class="text-right" style="color: ${sale.balance_amount > 0 ? '#dc2626' : '#1e293b'}">Rs. ${Number(sale.balance_amount).toLocaleString()}</td>
        </tr>
        <tr>
          <td class="bold">Payment Status:</td>
          <td class="text-right bold" style="text-transform: uppercase; color: ${sale.payment_status === 'PAID' ? '#059669' : '#dc2626'}">${sale.payment_status}</td>
        </tr>
      </table>

      <div class="separator"></div>

      <div class="bold" style="font-size: 9.5px; color: #000; text-transform: uppercase;">Payment Breakdown:</div>
      <table class="meta-table" style="margin-top: 3px;">
        ${sale.payments.map((p: any) => `
          <tr>
            <td style="font-size: 9px; color: #475569; font-weight: 600;">· ${p.payment_method}</td>
            <td class="text-right bold" style="font-size: 9px; color: #0f172a;">Rs. ${Number(p.amount).toLocaleString()}</td>
          </tr>
        `).join('')}
      </table>

      <div class="separator"></div>

      <div class="text-center footer">
        <span class="bold" style="color: #000;">Thank You For Your Business!</span><br>
        Software Generated Retail Bill.<br>
        For inquiries, call ${storePhone}
      </div>

      <script>
        // Trigger browser print automatically on load
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
