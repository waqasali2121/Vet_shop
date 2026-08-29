"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Import,
  Users,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Plus,
  AlertOctagon
} from "lucide-react"

type SidebarItem = {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  items?: { title: string; href: string }[]
}

const sidebarItems: SidebarItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "POS Terminal",
    href: "/pos",
    icon: ShoppingCart,
  },
  {
    title: "Products",
    href: "/products",
    icon: Package,
  },
  {
    title: "Add Medicine",
    href: "/products/new",
    icon: Plus,
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Suppliers",
    href: "/suppliers",
    icon: Import,
  },
  {
    title: "Expired Medicines",
    href: "/inventory/expiry",
    icon: AlertOctagon,
  },
  {
    title: "Backup & Reports",
    href: "/reports",
    icon: BarChart3,
  },
]

interface SidebarProps {
  className?: string
  onCloseMobile?: () => void
}

export function Sidebar({ className, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({})

  // Auto-open group menu if a sub-item is active
  React.useEffect(() => {
    const activeGroup = sidebarItems.find(
      (item) => item.items && item.items.some((sub) => pathname.startsWith(sub.href))
    )
    if (activeGroup) {
      setOpenMenus((prev) => ({ ...prev, [activeGroup.title]: true }))
    }
  }, [pathname])

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const isLinkActive = (href?: string) => {
    if (!href) return false
    if (href === "/dashboard") return pathname === href
    return pathname.startsWith(href)
  }

  const isGroupActive = (items?: { href: string }[]) => {
    if (!items) return false
    return items.some((item) => pathname.startsWith(item.href))
  }

  return (
    <div className={cn("flex flex-col h-full bg-secondary text-secondary-foreground border-r border-sidebar-border w-64 shadow-md", className)}>
      {/* Sidebar Header Brand */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border bg-secondary-foreground/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-inner">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm leading-tight text-white">Salman Farsy</span>
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Vet Store POS</span>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 scrollbar-thin scrollbar-thumb-sidebar-border">
        {sidebarItems.map((item) => {
          const hasChildren = item.items && item.items.length > 0
          const isOpen = openMenus[item.title]
          const Icon = item.icon
          const isActive = item.href ? isLinkActive(item.href) : isGroupActive(item.items)

          return (
            <div key={item.title} className="space-y-1">
              {hasChildren ? (
                // Collapsible Menu Header
                <button
                  onClick={() => toggleMenu(item.title)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm font-semibold rounded-md transition-all duration-150 cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-slate-300 hover:bg-sidebar-accent hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                    <span>{item.title}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  )}
                </button>
              ) : (
                // Simple Navigation Link
                <Link
                  href={item.href || "#"}
                  onClick={onCloseMobile}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-md transition-all duration-150",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-slate-300 hover:bg-sidebar-accent hover:text-white"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                  <span>{item.title}</span>
                </Link>
              )}

              {/* Sub-items list */}
              {hasChildren && isOpen && (
                <div className="pl-7 pr-1 py-1 space-y-1 border-l border-sidebar-border/40 ml-5">
                  {item.items?.map((subItem) => {
                    const isSubActive = pathname === subItem.href
                    return (
                      <Link
                        key={subItem.title}
                        href={subItem.href}
                        onClick={onCloseMobile}
                        className={cn(
                          "block px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                          isSubActive
                            ? "bg-sidebar-accent text-white font-bold"
                            : "text-slate-400 hover:text-white hover:bg-sidebar-accent/50"
                        )}
                      >
                        {subItem.title}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer / Status */}
      <div className="p-4 border-t border-sidebar-border bg-secondary-foreground/5 text-center">
        <span className="text-[10px] text-slate-500 font-semibold">Version 1.0.0 (Production)</span>
      </div>
    </div>
  )
}
