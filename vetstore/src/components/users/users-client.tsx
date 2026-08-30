"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateUserProfile } from "@/lib/actions/settings"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCog, Save, Loader2, ShieldCheck } from "lucide-react"

type Profile = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: "OWNER" | "MANAGER" | "CASHIER" | "INVENTORY"
  is_active: boolean
  created_at: string
}

interface UsersClientProps {
  profiles: Profile[]
  currentUserRole: string
}

export function UsersClient({ profiles, currentUserRole }: UsersClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Local state to track modifications before saving
  const [editedProfiles, setEditedProfiles] = useState<Record<string, { role: Profile["role"]; is_active: boolean }>>({})

  const isOwner = currentUserRole === "OWNER"
  const canManageUsers = currentUserRole === "OWNER" || currentUserRole === "MANAGER"

  const handleRoleChange = (id: string, role: Profile["role"]) => {
    setEditedProfiles(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        role,
        is_active: prev[id]?.is_active ?? profiles.find(p => p.id === id)!.is_active
      }
    }))
  }

  const handleStatusChange = (id: string, is_active: boolean) => {
    setEditedProfiles(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        is_active,
        role: prev[id]?.role ?? profiles.find(p => p.id === id)!.role
      }
    }))
  }

  const handleSaveChanges = (profileId: string) => {
    setError(null)
    setSuccess(null)
    const updates = editedProfiles[profileId]
    if (!updates) return

    startTransition(async () => {
      const res = await updateUserProfile(profileId, updates.role, updates.is_active)
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess("Employee credentials updated successfully.")
        // Remove from edited state
        const nextEdited = { ...editedProfiles }
        delete nextEdited[profileId]
        setEditedProfiles(nextEdited)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users & Roles</h1>
        <p className="text-sm text-slate-500 font-medium">
          Manage employee accounts, assign permissions, and activate/deactivate cashier credentials.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 font-semibold border border-emerald-200">
          {success}
        </div>
      )}

      {!canManageUsers && (
        <div className="rounded-md bg-amber-50 p-3.5 text-xs text-amber-700 font-black border border-amber-200">
          ⚠️ READ-ONLY ACCESS: Only Owners and Managers can modify employee roles or activate/deactivate accounts.
        </div>
      )}

      {/* Users List Card */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900">Registered Staff Profiles</CardTitle>
          <CardDescription className="text-slate-500">
            Current cashiers, managers, and inventory staff accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Staff Email</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Assigned Role</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  {canManageUsers && <th className="px-6 py-3 text-right pr-8">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {profiles.map((profile) => {
                  const currentRole = editedProfiles[profile.id]?.role ?? profile.role
                  const currentStatus = editedProfiles[profile.id]?.is_active ?? profile.is_active
                  const isModified = editedProfiles[profile.id] !== undefined
                  const isSelf = profiles.find(p => p.id === profile.id)?.email === profile.email // disable self-deactivation
                  const canEditThisProfile = canManageUsers && (profile.role !== "OWNER" || currentUserRole === "OWNER")

                  return (
                    <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {profile.email}
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-650">
                        {profile.first_name ? `${profile.first_name} ${profile.last_name || ''}` : "—"}
                      </td>

                      <td className="px-6 py-4">
                        {canEditThisProfile ? (
                          <select
                            value={currentRole}
                            onChange={(e) => handleRoleChange(profile.id, e.target.value as any)}
                            disabled={isPending}
                            className="h-8 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 focus:outline-none"
                          >
                            {currentUserRole === "OWNER" && <option value="OWNER">Owner</option>}
                            <option value="MANAGER">Manager</option>
                            <option value="CASHIER">Cashier</option>
                            <option value="INVENTORY">Inventory Staff</option>
                          </select>
                        ) : (
                          <Badge variant="secondary" className="font-bold text-[9px] uppercase tracking-wider px-2">
                            {profile.role}
                          </Badge>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {canEditThisProfile ? (
                          <select
                            value={currentStatus ? "true" : "false"}
                            onChange={(e) => handleStatusChange(profile.id, e.target.value === "true")}
                            disabled={isPending || isSelf}
                            className="h-8 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 focus:outline-none"
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        ) : (
                          <Badge variant={profile.is_active ? "success" : "secondary"}>
                            {profile.is_active ? "Active" : "Inactive"}
                          </Badge>
                        )}
                      </td>

                      {canManageUsers && (
                        <td className="px-6 py-4 text-right pr-8">
                          <Button
                            size="sm"
                            disabled={!isModified || isPending || !canEditThisProfile}
                            onClick={() => handleSaveChanges(profile.id)}
                            className="font-semibold text-xs py-1 px-3.5 gap-1.5 shadow-sm cursor-pointer"
                          >
                            {isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            Save
                          </Button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
