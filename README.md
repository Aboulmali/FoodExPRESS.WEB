# 🍔 FoodExpress.Web — Frontend client

Application vitrine côté client de la plateforme de livraison **FoodExpress**. Consomme les microservices backend exclusivement via l'**API Gateway** (YARP, port 5000) — jamais d'appel direct aux services.

Stack : **React 19** · **TypeScript** · **Vite 8** · **Tailwind CSS 4** · **shadcn/ui** (Radix UI) · **React Router 7** · **Sonner** (toasts) · **next-themes**.

## ✨ Fonctionnalités

- **Catalogue** : liste des restaurants (images, notes, état ouvert/fermé), recherche filtrante, menu par catégorie
- **Panier** : persistance localStorage — quantités `+ / −` bornées au stock, garde multi-restaurants, **réhydratation depuis le serveur** (prix/stock frais au chargement, snapshot de secours hors-ligne)
- **Commande** : livraison en 2 étapes (panier → confirmation), puis suivi avec **mise à jour automatique toutes les 10 s** (polling) et toasts de changement de statut
- **Auth** : inscription / connexion via Keycloak (JWT, session persistée), pages protégées
- **Design** : thème clair (tokens verts) type dashboard Cloud Kitchen, sidebar + topbar, images `loading="lazy"` avec fallback (`SmartImage`)

## 🚀 Démarrer

```bash
npm install
npm run dev        # http://localhost:5173 — proxy /api → http://localhost:5000 (Gateway)
```

En production : renseigner `VITE_API_URL` (ex. `https://api.foodexpress.ma`) — sans cela le front attend le proxy de dev.

## 📦 Scripts

| Commande | But |
|---|---|
| `npm run dev` | Dev server (HMR) |
| `npm run build` | `tsc -b` + build Vite |
| `npm run lint` | Oxlint |
| `npm test` | Vitest (15 tests) |
| `npm run test:watch` | Vitest watch mode |

## 🧪 Tests

Tests **Vitest + Testing Library** dans `src/context/` :

- `cart.test.tsx` — ajout, bornes de stock, persistance localStorage, **réhydratation** (prix frais, 404/épuisé écartés, mode hors-ligne)
- `auth.test.tsx` — login (token + décodage JWT), restauration de session, logout, register

Modèle : `label` — l'API est mockée (`vi.mock`), pas de réseau.

## 📁 Structure

```
src/
├── components/    # AppLayout, CartDrawer, DishCard, RestaurantCard, SmartImage, ui/ (shadcn)…
├── context/       # auth.tsx (session JWT), cart.tsx (panier + réhydratation)
├── lib/           # api.ts (client HTTP + types), format.ts (MAD, statuts)
├── pages/         # home, menu, login/register, orders, order-detail
└── test/          # setup Vitest
```

## 🔗 Accès

- Front : http://localhost:5173
- Gateway : http://localhost:5000
- Backend et architecture : voir `README.md` du dépôt `projet_cs/FoodExpress`