import * as React from "react"
import { getExpiryManagementData } from "@/lib/actions/inventory"
import { ExpiryClient } from "@/components/inventory/expiry-client"

export default async function ExpiryPage() {
  const res = await getExpiryManagementData()

  // Structure placeholder defaults if query errors out
  const data = res.data || {
    expired: [],
    urgent: [],
    near: [],
    medium: [],
    safe: [],
  }

  const counts = res.counts || {
    expired: 0,
    urgent: 0,
    near: 0,
    medium: 0,
    safe: 0,
  }

  return (
    <ExpiryClient
      data={data as any}
      counts={counts}
    />
  )
}
