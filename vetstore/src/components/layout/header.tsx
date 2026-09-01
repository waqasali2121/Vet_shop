"use client"

import { useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { logout } from "@/app/(auth)/auth-actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { User, LogOut, Settings, CheckCircle, Menu } from "lucide-react"

interface HeaderProps {
  onToggleSidebar: () => void
  userEmail?: string
  userRole?: string
  userAvatar?: string | null
  registerSession?: { id: string; openedAt: string } | null
}

export function Header({
  onToggleSidebar,
  userEmail = "staff@salmanfarsy.com",
  userRole = "CASHIER",
  userAvatar = null,
  registerSession = null,
}: HeaderProps) {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logout()
    })
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 shadow-sm">
      {/* Sidebar Toggle & App Title */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="md:hidden text-slate-600"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
        <div className="hidden md:flex items-center gap-3">
          <div className="relative h-9 w-9 overflow-hidden rounded-md bg-white border border-slate-200 flex items-center justify-center">
            <Image src="/logo.jpeg" alt="Salman Farsy Vet Store Logo" fill className="object-cover animate-fade-in" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-slate-800 leading-tight">Salman Farsy Veterinary Store</h2>
            <p className="text-[10px] font-semibold text-slate-400">POS Terminal System</p>
          </div>
        </div>
      </div>

      {/* Cash Register Status & User Menu */}
      <div className="flex items-center gap-4">
        {/* Register Status Indicator */}
        {registerSession && (
          <div className="flex items-center gap-2">
            <Badge variant="success" className="flex items-center gap-1 py-1 px-2.5 text-xs font-semibold">
              <CheckCircle className="h-3 w-3" />
              <span>Register Active</span>
            </Badge>
          </div>
        )}

        {/* User Account Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-slate-200 hover:bg-slate-50 cursor-pointer p-1.5 sm:px-3"
            >
              {userAvatar ? (
                <div className="relative h-6 w-6 overflow-hidden rounded-full border border-slate-200">
                  <Image src={userAvatar} alt="Profile" fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-700">
                {userEmail.split("@")[0]}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-slate-900 leading-none">
                  {userEmail}
                </p>
                <div className="mt-1 flex items-center">
                  <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0.5 tracking-wider">
                    {userRole}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/settings" className="w-full cursor-pointer">
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4 text-slate-500" />
                <span>My Profile</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isPending}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{isPending ? "Logging out..." : "Log out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
