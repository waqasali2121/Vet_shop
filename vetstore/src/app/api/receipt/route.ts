import { NextRequest, NextResponse } from "next/server"
import { getSaleReceiptData } from "@/lib/actions/sales"

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
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          line-height: 1.4;
          width: 76mm;
          margin: 2mm auto;
          color: #000;
        }
        .text-center {
          text-align: center;
        }
        .text-right {
          text-align: right;
        }
        .bold {
          font-weight: bold;
        }
        .header {
          margin-bottom: 8px;
        }
        .store-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        .store-address {
          font-size: 10px;
          margin-bottom: 4px;
        }
        .separator {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        .meta-table, .items-table, .totals-table {
          width: 100%;
          border-collapse: collapse;
        }
        .meta-table td, .totals-table td {
          font-size: 11px;
          padding: 1px 0;
        }
        .items-table th {
          border-bottom: 1px dashed #000;
          font-size: 11px;
          font-weight: bold;
          padding: 2px 0;
        }
        .items-table td {
          font-size: 11px;
          padding: 3px 0;
          vertical-align: top;
        }
        .item-row {
          border-bottom: 1px dotted #ccc;
        }
        .footer {
          margin-top: 15px;
          font-size: 10px;
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
      <div class="no-print" style="padding: 10px; text-align: center; background: #f3f4f6; margin-bottom: 10px; border-radius: 4px;">
        <button onclick="window.print()" style="padding: 6px 12px; font-weight: bold; background: #047857; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Print Receipt
        </button>
      </div>

      <div class="text-center header">
        <div class="store-name">SALMAN FARSY VET STORE</div>
        <div class="store-address">Opposite Grain Market, Veterinary Hospital Road<br>Phone: 0300-1234567</div>
        <div class="bold">POS RETAIL RECEIPT</div>
      </div>

      <div class="separator"></div>

      <table class="meta-table">
        <tr>
          <td><span class="bold">Invoice #:</span></td>
          <td class="text-right">${sale.invoice_number}</td>
        </tr>
        <tr>
          <td><span class="bold">Date:</span></td>
          <td class="text-right">${new Date(sale.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}</td>
        </tr>
        <tr>
          <td><span class="bold">Cashier:</span></td>
          <td class="text-right">${sale.cashier?.first_name || sale.cashier?.email.split("@")[0]}</td>
        </tr>
        <tr>
          <td><span class="bold">Customer:</span></td>
          <td class="text-right">${sale.customer?.name}</td>
        </tr>
      </table>

      <div class="separator"></div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align: left;">Item Description</th>
            <th class="text-center" style="width: 15%;">Qty</th>
            <th class="text-right" style="width: 25%;">Price</th>
            <th class="text-right" style="width: 25%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${sale.items.map((item: any) => `
            <tr class="item-row">
              <td style="text-align: left;">
                ${item.product?.name}
                ${item.discount_amount > 0 ? `<br><span style="font-size:9px;color:#555;">(Disc: -${formatCurrency(item.discount_amount)})</span>` : ""}
              </td>
              <td class="text-center">${item.quantity}</td>
              <td class="text-right">${Number(item.unit_price).toLocaleString()}</td>
              <td class="text-right">${Number(item.line_total).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="separator"></div>

      <table class="totals-table">
        <tr>
          <td>Subtotal:</td>
          <td class="text-right">${formatCurrency(sale.subtotal)}</td>
        </tr>
        ${sale.discount_amount > 0 ? `
        <tr>
          <td>Discount (-):</td>
          <td class="text-right">${formatCurrency(sale.discount_amount)}</td>
        </tr>
        ` : ""}
        <tr class="bold">
          <td>Grand Total:</td>
          <td class="text-right" style="font-size: 13px;">${formatCurrency(sale.grand_total)}</td>
        </tr>
        <tr>
          <td>Amount Paid:</td>
          <td class="text-right">${formatCurrency(sale.paid_amount)}</td>
        </tr>
        <tr class="bold">
          <td>Balance Due:</td>
          <td class="text-right">${formatCurrency(sale.balance_amount)}</td>
        </tr>
      </table>

      <div class="separator"></div>

      <div class="bold" style="font-size: 10px;">Payment Breakdown:</div>
      <table class="meta-table" style="margin-top: 2px;">
        ${sale.payments.map((p: any) => `
          <tr>
            <td style="font-size:10px;">· ${p.payment_method}</td>
            <td class="text-right" style="font-size:10px;">${formatCurrency(p.amount)}</td>
          </tr>
        `).join('')}
      </table>

      <div class="separator"></div>

      <div class="text-center footer">
        <span class="bold">Thank You For Your Business!</span><br>
        Software Generated Receipt.<br>
        For inquiries, call 0300-1234567
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
