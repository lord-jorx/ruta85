# Ruta 85

PWA personal para gestionar un plan de entrenamiento de rotación A/B/C con seguimiento de peso, cintura y rodilla. Importa progresiones desde OpenGym, incluye dieta con objetivos y registro rápido. Los objetivos y registros personales viven en Supabase (RLS por usuario), nunca en el repo.

## Stack

- **Vite 8** + **React 19** + **TypeScript** 
- **Dexie** para almacenamiento local-first
- **Supabase** con RLS (sincronización opcional)
- **vite-plugin-pwa** para instalación en Android

## Estructura

```
src/
├── domain/          # Contrato de tipos
├── data/            # Plan estático
├── lib/             # Lógica pura con tests
├── db/              # Datos y sincronización Supabase
├── components/      # Componentes reutilizables
└── screens/         # Pantallas de la app

supabase/
└── migrations/      # Migrations de RLS y esquema
```

## Comandos

```bash
npm run dev         # Dev server (http://localhost:5173)
npm run test        # Ejecutar tests
npm run build       # Build para dist/
```

## Configuración

Crea `.env.local` en la raíz:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx
```

Sin estos, la app funciona solo en local (Dexie). Con ellos, sincroniza con Supabase.

## Despliegue

- **Automático**: GitHub Actions en cada push a `main` → GitHub Pages (`https://lord-jorx.github.io/ruta85/`)
- **Variables del repo** (no secretos): `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` son públicas por diseño

## Instalar en Android

1. Abre Chrome
2. Menú → "Instalar app"
3. Aparece en tu pantalla de inicio

## Importar copia de OpenGym

1. OpenGym → Settings → Data → Export backup
2. Ruta 85 → Ajustes → Importar copia
3. Se guardan en local (Dexie) y se sincronizan; reimportar no duplica

**Nota**: La service role key de Supabase nunca va en la app ni en el repo.
