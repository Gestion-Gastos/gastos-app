# Mis Gastos

App web para registrar gastos personales.
**Frontend:** React + Vite · **Backend y base de datos:** Supabase (PostgreSQL + login).

No hay servidor propio: el navegador habla directo con Supabase y la seguridad la
hace la base de datos (Row Level Security: cada usuario solo ve sus gastos).

---

## 1. Instalar lo necesario en Windows

1. Instalá **Node.js LTS** desde https://nodejs.org (siguiente, siguiente, finalizar).
2. Instalá **Git** desde https://git-scm.com/download/win.
3. Recomendado: **Visual Studio Code** desde https://code.visualstudio.com.

Para comprobar, abrí *PowerShell* y ejecutá:

```powershell
node -v
npm -v
git --version
```

## 2. Crear el proyecto en Supabase

1. Entrá a https://supabase.com, creá una cuenta y un **New project**
   (elegí la región más cercana, por ejemplo São Paulo).
2. Andá a **SQL Editor → New query**, pegá el contenido de `supabase/schema.sql`
   y apretá **Run**. Esto crea las tablas, la seguridad y las categorías iniciales.
3. Andá a **Project Settings → API** (o **API Keys**) y copiá:
   - **Project URL**
   - **Publishable key** (o la *anon public key* en proyectos antiguos).
     Esta clave es pública por diseño; nunca uses la *secret / service_role* en el frontend.
4. Opcional, para uso personal: en **Authentication → Sign In / Providers → Email**
   podés desactivar *Confirm email* y así no tenés que confirmar el correo al registrarte.

## 3. Correr la app en tu PC

En PowerShell, dentro de la carpeta del proyecto:

```powershell
copy .env.example .env
notepad .env        # pegá tu URL y tu key, guardá y cerrá
npm install
npm run dev
```

Abrí http://localhost:5173, registrate e ingresá.

Para usarla desde el celular en tu misma red Wi-Fi: `npm run dev -- --host`
y entrá a la dirección "Network" que muestra la consola (por ejemplo `http://192.168.0.10:5173`).
Si Windows pregunta por el firewall, permití el acceso en redes privadas.

## 4. Subir el código a GitHub

1. Creá un repositorio nuevo en GitHub (por ejemplo `gastos-app`), sin README.
2. En PowerShell:

```powershell
git init
git add .
git commit -m "Proyecto base"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/gastos-app.git
git push -u origin main
```

El archivo `.env` **no** se sube (está en `.gitignore`). El `package-lock.json` que creó
`npm install` sí se sube: el despliegue lo necesita.

## 5. Publicar en GitHub Pages

1. En el repo: **Settings → Secrets and variables → Actions → New repository secret**.
   Creá dos secretos con los mismos valores de tu `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_KEY`
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Andá a la pestaña **Actions** y ejecutá *Publicar en GitHub Pages* (o hacé cualquier push a `main`).
4. La app queda en `https://TU-USUARIO.github.io/gastos-app/`.
5. En Supabase, **Authentication → URL Configuration**, poné esa dirección como
   **Site URL** (así los correos de confirmación apuntan a la app publicada).

Cada vez que hagas `git push` a `main`, la página se vuelve a publicar sola.

---

## Estructura

```
gastos-app/
├─ .github/workflows/deploy.yml   # publicación automática en GitHub Pages
├─ supabase/schema.sql            # tablas, seguridad y categorías iniciales
├─ src/
│  ├─ supabaseClient.js           # conexión a Supabase
│  ├─ App.jsx                     # sesión: login o app
│  ├─ components/
│  │  ├─ Login.jsx                # ingresar / registrarse
│  │  ├─ Gastos.jsx               # historial por mes, totales y por categoría
│  │  └─ FormGasto.jsx            # alta y edición de gastos
│  └─ index.css                   # estilos (con modo oscuro)
├─ .env.example                   # plantilla de configuración
└─ vite.config.js
```

## Ideas para seguir

- Agregar categorías propias desde la app (la tabla ya lo permite).
- Gráfico de evolución mensual.
- Exportar el mes a CSV / Excel.
- Presupuesto mensual por categoría con alertas.
