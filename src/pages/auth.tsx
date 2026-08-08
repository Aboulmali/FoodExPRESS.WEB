import { useState } from "react"
import type { ChangeEvent, FormEvent, ReactNode } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, Clock3, Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, Star, Store, UserRound, UtensilsCrossed } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "../context/auth"
import { ApiError } from "../lib/api"
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Logo } from "../components/logo"

// ===================== Panneau décoratif =====================

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800 lg:flex lg:flex-col lg:justify-between p-10 text-white">
      {/* Motif décoratif */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 size-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -right-20 size-96 rounded-full bg-white/5" />
        <div className="absolute right-16 top-1/3 size-24 rounded-full border border-white/20" />
      </div>

      <div className="relative">
        <Logo className="text-white [&>div]:bg-white [&>div]:text-emerald-700 [&_p]:text-white [&_p+*]:text-white/70" />
      </div>

      <div className="relative max-w-md space-y-6">
        <h2 className="text-3xl font-bold leading-tight">
          Vos plats préférés,<br />
          livrés en un clic.
        </h2>
        <p className="text-sm text-white/80">
          Commandez auprès des meilleurs restaurants de la ville et suivez votre commande en temps réel, du four à votre porte.
        </p>

        <div className="flex items-center gap-1.5 text-sm">
          <span className="flex items-center gap-0.5 text-amber-300">
            <Star className="size-4 fill-amber-300" />
            <Star className="size-4 fill-amber-300" />
            <Star className="size-4 fill-amber-300" />
            <Star className="size-4 fill-amber-300" />
            <Star className="size-4 fill-amber-300" />
          </span>
          <span className="ml-1 text-white/80">4.9/5 · note moyenne de nos clients</span>
        </div>
      </div>

      <div className="relative grid grid-cols-3 gap-3">
        {[
          { icon: Store, value: "120+", label: "Restaurants" },
          { icon: UtensilsCrossed, value: "540+", label: "Plats au menu" },
          { icon: Clock3, value: "30 min", label: "Livraison moyenne" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
            <s.icon className="size-5 text-amber-300" />
            <p className="mt-2 text-xl font-bold">{s.value}</p>
            <p className="text-xs text-white/70">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===================== Coquille commune =====================

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <BrandPanel />

      <div className="flex items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <Logo />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}

          <p className="text-center text-xs text-muted-foreground">
            <Link to="/" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              <ArrowLeft className="size-3" />
              Retour à l'accueil
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  type,
  icon: Icon,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string
  label: string
  type: string
  icon: typeof Mail
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  autoComplete?: string
}) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === "password"
  const current = isPassword && visible ? "text" : type

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={current}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="h-10 pl-9 pr-9"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
    </div>
  )
}

// ===================== Connexion =====================

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email, password)
      toast.success("Bienvenue !")
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? "/", { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Connexion impossible")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Bon retour parmi nous" subtitle="Connectez-vous pour commander en quelques clics.">
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Erreur de connexion</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Field
          id="email"
          label="Adresse e-mail"
          type="email"
          icon={Mail}
          autoComplete="email"
          placeholder="vous@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          id="password"
          label="Mot de passe"
          type="password"
          icon={Lock}
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-1.5 text-muted-foreground">
            <input type="checkbox" className="size-3.5 rounded border-border accent-[var(--primary)]" />
            Se souvenir de moi
          </label>
          <button type="button" className="font-medium text-primary hover:underline" onClick={() => toast.info("Récupération par e-mail bientôt disponible")}>
            Mot de passe oublié ?
          </button>
        </div>

        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy ? "Connexion…" : "Se connecter"}
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          OU
          <div className="h-px flex-1 bg-border" />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Créer un compte
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

// ===================== Inscription =====================

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirm: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }
    if (form.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }
    setBusy(true)
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phoneNumber: form.phoneNumber,
        password: form.password,
      })
      toast.success("Compte créé ! Vous pouvez vous connecter.")
      navigate("/login", { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Inscription impossible")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Créer votre compte" subtitle="Rejoignez FoodExpress : 1 minute, 0 frais d'inscription.">
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Erreur d'inscription</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert className="border-primary/30 bg-primary/5 text-primary">
          <AlertTitle>Compte client</AlertTitle>
          <AlertDescription>
            L'inscription publique crée un compte client. Les comptes restaurant ou livreur sont activés par un
            administrateur après création.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-3">
          <Field
            id="firstName"
            label="Prénom"
            type="text"
            icon={UserRound}
            autoComplete="given-name"
            placeholder="Sarah"
            value={form.firstName}
            onChange={set("firstName")}
          />
          <Field
            id="lastName"
            label="Nom"
            type="text"
            icon={UserRound}
            autoComplete="family-name"
            placeholder="Alami"
            value={form.lastName}
            onChange={set("lastName")}
          />
        </div>

        <Field
          id="reg-email"
          label="Adresse e-mail"
          type="email"
          icon={Mail}
          autoComplete="email"
          placeholder="vous@exemple.com"
          value={form.email}
          onChange={set("email")}
        />

        <Field
          id="reg-phone"
          label="Téléphone"
          type="tel"
          icon={Phone}
          autoComplete="tel"
          placeholder="06 12 34 56 78"
          value={form.phoneNumber}
          onChange={set("phoneNumber")}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field
            id="reg-password"
            label="Mot de passe"
            type="password"
            icon={Lock}
            autoComplete="new-password"
            placeholder="8 caractères min."
            value={form.password}
            onChange={set("password")}
          />
          <Field
            id="reg-confirm"
            label="Confirmation"
            type="password"
            icon={Lock}
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.confirm}
            onChange={set("confirm")}
          />
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
          En créant un compte, vous acceptez nos conditions d'utilisation. Vos données restent protégées.
        </p>

        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy ? "Création du compte…" : "Créer mon compte"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}