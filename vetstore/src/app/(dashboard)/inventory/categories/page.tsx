"use client"

import * as React from "react"
import { useTransition, useState } from "react"
import { getCategories, createCategory, updateCategory } from "@/lib/actions/products"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, FolderOpen, Loader2 } from "lucide-react"

type Category = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog states
  const [isOpen, setIsOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPending, startTransition] = useTransition()

  // Fetch categories on mount
  const fetchCategories = async () => {
    setLoading(true)
    const result = await getCategories()
    if (result.error) {
      setError(result.error)
    } else {
      setCategories(result.data as Category[])
      setError(null)
    }
    setLoading(false)
  }

  React.useEffect(() => {
    fetchCategories()
  }, [])

  const handleOpenAdd = () => {
    setEditingCategory(null)
    setName("")
    setDescription("")
    setIsOpen(true)
  }

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category)
    setName(category.name)
    setDescription(category.description || "")
    setIsOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    startTransition(async () => {
      let result
      if (editingCategory) {
        result = await updateCategory(editingCategory.id, { name, description })
      } else {
        result = await createCategory({ name, description })
      }

      if (result.error) {
        setError(result.error)
      } else {
        setIsOpen(false)
        fetchCategories()
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500 font-medium">
            Manage product categories for medicine, livestock feeds, and surgical equipment.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="font-semibold gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
          {error}
        </div>
      )}

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900">Category Catalog</CardTitle>
          <CardDescription className="text-slate-500">
            A comprehensive list of categories defined in the store database.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-slate-500 font-medium">
              <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 p-6">
              <FolderOpen className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold">No categories found</p>
              <Button variant="outline" size="sm" onClick={handleOpenAdd} className="mt-2 font-semibold">
                Create First Category
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Category Name</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{category.name}</td>
                      <td className="px-6 py-4 text-slate-500 max-w-md truncate">
                        {category.description || <span className="text-slate-300 font-normal italic">No description</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(category)}
                          className="font-semibold text-primary hover:text-primary/80 gap-1.5 cursor-pointer"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-900">
                {editingCategory ? "Edit Category" : "Add New Category"}
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Enter the details below to save the category to your inventory database.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-slate-700">Category Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Antibiotics, Vaccines"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isPending}
                  className="border-slate-300 focus:border-primary focus:ring-primary"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description" className="text-slate-700">Description</Label>
                <Input
                  id="description"
                  placeholder="Describe what kind of products are in this category"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPending}
                  className="border-slate-300 focus:border-primary focus:ring-primary"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="font-semibold"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="font-semibold">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Category"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
