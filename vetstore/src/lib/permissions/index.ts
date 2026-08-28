export type UserRole = "OWNER" | "MANAGER" | "CASHIER" | "INVENTORY"

export const PERMISSIONS = {
  dashboard: {
    view: "dashboard.view",
  },
  sales: {
    create: "sales.create",
    view: "sales.view",
    return: "sales.return",
    void: "sales.void",
  },
  products: {
    view: "products.view",
    create: "products.create",
    update: "products.update",
    deactivate: "products.deactivate",
  },
  inventory: {
    view: "inventory.view",
    adjust: "inventory.adjust",
    expiry: "inventory.expiry",
  },
  purchases: {
    view: "purchases.view",
    create: "purchases.create",
    return: "purchases.return",
  },
  customers: {
    view: "customers.view",
    manage: "customers.manage",
    receive_payment: "customers.receive_payment",
  },
  suppliers: {
    view: "suppliers.view",
    manage: "suppliers.manage",
    pay: "suppliers.pay",
  },
  expenses: {
    view: "expenses.view",
    create: "expenses.create",
    update: "expenses.update",
  },
  cash_register: {
    view: "cash_register.view",
    close: "cash_register.close",
  },
  reports: {
    sales: "reports.sales",
    profit: "reports.profit",
    inventory: "reports.inventory",
    financial: "reports.financial",
  },
  users: {
    view: "users.view",
    manage: "users.manage",
  },
  settings: {
    view: "settings.view",
    manage: "settings.manage",
  },
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS][keyof typeof PERMISSIONS[keyof typeof PERMISSIONS]]

// Map roles to their permission keys
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  OWNER: [
    // Owner has full permissions
    "dashboard.view",
    "sales.create", "sales.view", "sales.return", "sales.void",
    "products.view", "products.create", "products.update", "products.deactivate",
    "inventory.view", "inventory.adjust", "inventory.expiry",
    "purchases.view", "purchases.create", "purchases.return",
    "customers.view", "customers.manage", "customers.receive_payment",
    "suppliers.view", "suppliers.manage", "suppliers.pay",
    "expenses.view", "expenses.create", "expenses.update",
    "cash_register.view", "cash_register.close",
    "reports.sales", "reports.profit", "reports.inventory", "reports.financial",
    "users.view", "users.manage",
    "settings.view", "settings.manage",
  ],
  MANAGER: [
    "dashboard.view",
    "sales.create", "sales.view", "sales.return",
    "products.view", "products.create", "products.update",
    "inventory.view", "inventory.adjust", "inventory.expiry",
    "purchases.view", "purchases.create", "purchases.return",
    "customers.view", "customers.manage", "customers.receive_payment",
    "suppliers.view", "suppliers.manage", "suppliers.pay",
    "expenses.view", "expenses.create", "expenses.update",
    "cash_register.view", "cash_register.close",
    "reports.sales", "reports.profit", "reports.inventory", "reports.financial",
    "users.view",
  ],
  CASHIER: [
    "dashboard.view",
    "sales.create", "sales.view",
    "products.view",
    "customers.view", "customers.manage", "customers.receive_payment",
    "cash_register.view",
  ],
  INVENTORY: [
    "dashboard.view",
    "products.view", "products.create", "products.update",
    "inventory.view", "inventory.adjust", "inventory.expiry",
    "purchases.view", "purchases.create",
    "suppliers.view",
  ],
}

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions ? permissions.includes(permission) : false
}

export function hasAnyPermission(role: UserRole, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}
