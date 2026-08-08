import { useCallback, useEffect, useMemo, useState } from "react"
import type { ChangeEvent, FormEvent, ReactNode } from "react"
import { ImagePlus, Plus, Store, Trash2, UtensilsCrossed } from "lucide-react"
import { toast } from "sonner"
import { api, ApiError } from "../lib/api"
import type { Category, Dish, Restaurant } from "../lib/api"
import { useAuth } from "../context/auth"
import { formatMAD } from "../lib/format"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Textarea } from "../components/ui/textarea"
import { Skeleton } from "../components/ui/skeleton"

const inputCls = "h-9 w-full"

// ==================== Page principale =====================

export function OwnerDashboardPage() {
  const { user } = useAuth()
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  const mine = useMemo(
    () => (restaurants ?? []).filter((r) => r.ownerId && r.ownerId === user?.sub),
    [restaurants, user],
  )

  const loadAll = useCallback(async () => {
    try {
      const [rests, cats] = await Promise.all([api.restaurants(), api.categories()])
      setRestaurants(rests)
      setCategories(cats)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible de charger vos restaurants")
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  if (!restaurants) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ma gestion</h1>
        <p className="text-sm text-muted-foreground">Gérez votre restaurant et vos plats.</p>
      </div>

      {mine.length === 0 ? (
        <CreateRestaurantForm onCreated={loadAll} />
      ) : (
        mine.map((r) => <RestaurantPanel key={r.id} restaurant={r} categories={categories} onChanged={loadAll} />)
      )}
    </div>
  )
}

// ===================== Création de restaurant =====================

function CreateRestaurantForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    phoneNumber: "",
    email: "",
    openingTime: "09:00",
    closingTime: "23:00",
  })
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      let latitude = 0
      let longitude = 0
      if (form.address || form.city) {
        const query = encodeURIComponent(`${form.address}, ${form.city}`)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`)
          const results = (await res.json()) as { lat: string; lon: string }[]
          if (results.length > 0) {
            latitude = Number(results[0].lat)
            longitude = Number(results[0].lon)
          }
        } catch {
          /* géocodage best-effort : on reste sur 0,0 si le service est injoignable */
        }
        if (latitude === 0 && longitude === 0) {
          toast.info("Localisation introuvable : coordonnées par défaut (0,0). Complétez votre adresse plus tard.")
        }
      }
      await api.createRestaurant({ ...form, latitude, longitude })
      toast.success("Restaurant créé !")
      await onCreated()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Création impossible")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="size-5 text-primary" />
          Créer votre restaurant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="r-name">Nom du restaurant *</Label>
            <Input id="r-name" required value={form.name} onChange={set("name")} placeholder="Chez Sarah" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-city">Ville *</Label>
            <Input id="r-city" required value={form.city} onChange={set("city")} placeholder="Casablanca" className={inputCls} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="r-desc">Description</Label>
            <Textarea id="r-desc" value={form.description} onChange={set("description")} placeholder="Notre cuisine…" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="r-address">Adresse *</Label>
            <Input id="r-address" required value={form.address} onChange={set("address")} placeholder="12 rue des Fleurs" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-phone">Téléphone *</Label>
            <Input id="r-phone" required value={form.phoneNumber} onChange={set("phoneNumber")} placeholder="06 00 00 00 00" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-email">Email</Label>
            <Input id="r-email" type="email" value={form.email} onChange={set("email")} placeholder="contact@chezmama.ma" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-open">Ouverture</Label>
            <Input id="r-open" type="time" value={form.openingTime} onChange={set("openingTime")} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-close">Fermeture</Label>
            <Input id="r-close" type="time" value={form.closingTime} onChange={set("closingTime")} className={inputCls} />
          </div>
          <Button type="submit" disabled={busy} className="sm:col-span-2">
            {busy ? "Création…" : "Créer mon restaurant"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ==================== Panneau restaurant =====================

function RestaurantPanel({
  restaurant,
  categories,
  onChanged,
}: {
  restaurant: Restaurant
  categories: Category[]
  onChanged: () => Promise<void>
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [dishes, setDishes] = useState<Dish[] | null>(null)

  const loadDishes = useCallback(async () => {
    try {
      setDishes(await api.dishes(restaurant.id))
    } catch {
      setDishes([])
    }
  }, [restaurant.id])

  useEffect(() => {
    loadDishes()
  }, [loadDishes])

  const removeRestaurant = async () => {
    if (!confirm("Supprimer définitivement ce restaurant et ses plats ?")) return
    try {
      await api.deleteRestaurant(restaurant.id)
      toast.success("Restaurant supprimé")
      await onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Suppression impossible")
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          {restaurant.logoUrl ? (
            <img src={restaurant.logoUrl} alt={restaurant.name} className="size-14 rounded-xl object-cover" />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
              <Store className="size-6 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold">{restaurant.name}</p>
              <Badge variant={restaurant.isOpen ? "default" : "secondary"}>
                {restaurant.isOpen ? "Ouvert" : "Fermé"}
              </Badge>
            </div>
            <p className="truncate text-sm text-muted-foreground">{restaurant.address}</p>
            <p className="text-xs text-muted-foreground">
              {restaurant.dishesCount} plat(s) · note {restaurant.rating.toFixed(1)}
            </p>
          </div>
          <LogoUpload restaurantId={restaurant.id} onDone={onChanged} />
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Modifier
          </Button>
          <Button variant="destructive" size="sm" onClick={removeRestaurant}>
            <Trash2 className="size-4" />
            Supprimer
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <UtensilsCrossed className="size-5 text-primary" />
          Mes plats
        </h2>
        <CreateDishDialog restaurantId={restaurant.id} categories={categories} onCreated={loadDishes}>
          <Button size="sm">
            <Plus className="size-4" />
            Ajouter un plat
          </Button>
        </CreateDishDialog>
      </div>

      {!dishes ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : dishes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aucun plat pour le moment. Ajoutez votre premier plat !
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {dishes.map((d) => (
            <DishRow key={d.id} dish={d} categories={categories} onChanged={loadDishes} />
          ))}
        </div>
      )}

      <EditRestaurantDialog
        restaurant={restaurant}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  )
}

// ==================== Logo =====================

function LogoUpload({ restaurantId, onDone }: { restaurantId: string; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      await api.uploadLogo(restaurantId, file)
      toast.success("Logo mis à jour")
      await onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload impossible")
    } finally {
      setBusy(false)
    }
  }
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
      <ImagePlus className="size-4" />
      {busy ? "Envoi…" : "Logo"}
      <input type="file" accept="image/*" className="hidden" onChange={pick} />
    </label>
  )
}

// ==================== Édition restaurant =====================

function EditRestaurantDialog({
  restaurant,
  open,
  onOpenChange,
}: {
  restaurant: Restaurant
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [form, setForm] = useState({
    name: restaurant.name,
    description: restaurant.description,
    address: restaurant.address,
    city: restaurant.city,
    phoneNumber: restaurant.phoneNumber,
    openingTime: restaurant.openingTime,
    closingTime: restaurant.closingTime,
    isOpen: restaurant.isOpen,
  })
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.updateRestaurant(restaurant.id, form)
      toast.success("Restaurant mis à jour")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Modification impossible")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier {restaurant.name}</DialogTitle>
          <DialogDescription>Mettez à jour les informations de votre restaurant.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="e-name">Nom</Label>
            <Input id="e-name" required value={form.name} onChange={set("name")} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-city">Ville</Label>
            <Input id="e-city" value={form.city} onChange={set("city")} className={inputCls} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="e-desc">Description</Label>
            <Textarea id="e-desc" value={form.description} onChange={set("description")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="e-address">Adresse</Label>
            <Input id="e-address" value={form.address} onChange={set("address")} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-phone">Téléphone</Label>
            <Input id="e-phone" value={form.phoneNumber} onChange={set("phoneNumber")} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-open">Ouverture</Label>
            <Input id="e-open" type="time" value={form.openingTime} onChange={set("openingTime")} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-close">Fermeture</Label>
            <Input id="e-close" type="time" value={form.closingTime} onChange={set("closingTime")} className={inputCls} />
          </div>
          <label className="flex items-center gap-2 pt-4 text-sm">
            <input type="checkbox" checked={form.isOpen} onChange={(e) => setForm((f) => ({ ...f, isOpen: e.target.checked }))} />
            Restaurant ouvert maintenant
          </label>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ==================== Plat =====================

function DishRow({ dish, categories, onChanged }: { dish: Dish; categories: Category[]; onChanged: () => Promise<void> }) {
  const [editOpen, setEditOpen] = useState(false)

  const remove = async () => {
    if (!confirm(`Supprimer « ${dish.name} » ?`)) return
    try {
      await api.deleteDish(dish.id)
      toast.success("Plat supprimé")
      await onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Suppression impossible")
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        {dish.imageUrl ? (
          <img src={dish.imageUrl} alt={dish.name} className="size-12 rounded-lg object-cover" />
        ) : (
          <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
            <UtensilsCrossed className="size-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{dish.name}</p>
            {!dish.isAvailable && <Badge variant="secondary">Indisponible</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {dish.categoryName} · stock {dish.stock} · {formatMAD(dish.price)}
          </p>
        </div>
        <DishImageUpload dishId={dish.id} onDone={onChanged} />
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          Modifier
        </Button>
        <Button variant="destructive" size="sm" onClick={remove}>
          <Trash2 className="size-4" />
        </Button>
      </CardContent>
      <EditDishDialog dish={dish} categories={categories} open={editOpen} onOpenChange={setEditOpen} onSaved={onChanged} />
    </Card>
  )
}

function DishImageUpload({ dishId, onDone }: { dishId: string; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      await api.uploadDishImage(dishId, file)
      toast.success("Image mise à jour")
      await onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload impossible")
    } finally {
      setBusy(false)
    }
  }
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-muted">
      <ImagePlus className="size-4" />
      {busy ? "…" : "Image"}
      <input type="file" accept="image/*" className="hidden" onChange={pick} />
    </label>
  )
}

// ==================== Formulaires plat =====================

type DishFormValues = {
  name: string
  description: string
  price: number
  stock: number
  isVegetarian: boolean
  isSpicy: boolean
  preparationTimeMinutes: number
  categoryId: string
}

function DishFormDialog({
  title,
  initial,
  categories,
  submitLabel,
  open,
  onOpenChange,
  onSubmit,
}: {
  title: string
  initial: DishFormValues
  categories: Category[]
  submitLabel: string
  open: boolean
  onOpenChange: (o: boolean) => void
  onSubmit: (values: DishFormValues) => Promise<void>
}) {
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)

  const initialKey = JSON.stringify(initial)
  useEffect(() => {
    setForm(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit({
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        preparationTimeMinutes: Number(form.preparationTimeMinutes),
      })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Échec de l'enregistrement")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Remplissez les informations du plat.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="d-name">Nom *</Label>
            <Input id="d-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="d-desc">Description</Label>
            <Textarea id="d-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-price">Prix (MAD) *</Label>
            <Input id="d-price" type="number" min={0} step="0.01" required value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-stock">Stock</Label>
            <Input id="d-stock" type="number" min={0} value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-cat">Catégorie</Label>
            <select id="d-cat" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} className={inputCls}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-prep">Préparation (min)</Label>
            <Input id="d-prep" type="number" min={0} value={form.preparationTimeMinutes} onChange={(e) => setForm((f) => ({ ...f, preparationTimeMinutes: Number(e.target.value) }))} className={inputCls} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isVegetarian} onChange={(e) => setForm((f) => ({ ...f, isVegetarian: e.target.checked }))} />
            Végétarien
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isSpicy} onChange={(e) => setForm((f) => ({ ...f, isSpicy: e.target.checked }))} />
            Épicé
          </label>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Enregistrement…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CreateDishDialog({
  restaurantId,
  categories,
  onCreated,
  children,
}: {
  restaurantId: string
  categories: Category[]
  onCreated: () => Promise<void>
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>
      <DishFormDialog
        title="Nouveau plat"
        initial={{
          name: "",
          description: "",
          price: 0,
          stock: 100,
          isVegetarian: false,
          isSpicy: false,
          preparationTimeMinutes: 20,
          categoryId: categories[0]?.id ?? "",
        }}
        categories={categories}
        submitLabel="Ajouter"
        open={open}
        onOpenChange={setOpen}
        onSubmit={async (data) => {
          await api.createDish({ ...data, restaurantId })
          toast.success("Plat ajouté")
          setOpen(false)
          await onCreated()
        }}
      />
    </>
  )
}

function EditDishDialog({
  dish,
  categories,
  open,
  onOpenChange,
  onSaved,
}: {
  dish: Dish
  categories: Category[]
  open: boolean
  onOpenChange: (o: boolean) => void
  onSaved: () => Promise<void>
}) {
  return (
    <DishFormDialog
      title={`Modifier « ${dish.name} »`}
      initial={{
        name: dish.name,
        description: dish.description,
        price: Number(dish.price),
        stock: dish.stock,
        isVegetarian: dish.isVegetarian,
        isSpicy: dish.isSpicy,
        preparationTimeMinutes: dish.preparationTimeMinutes,
        categoryId: dish.categoryId,
      }}
      categories={categories}
      submitLabel="Enregistrer"
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={async (data) => {
        await api.updateDish(dish.id, { ...data, isAvailable: dish.isAvailable })
        toast.success("Plat mis à jour")
        onOpenChange(false)
        await onSaved()
      }}
    />
  )
}