# Cota · puesta en marcha de Supabase (nube opcional)

La app funciona sin nada de esto (modo solo local, datos en el navegador). Supabase añade
copia en la nube y sincronización entre dispositivos. Es gratis para un único usuario.

## 1. Crear el proyecto

1. Entra en <https://supabase.com> y crea una cuenta (plan **Free**).
2. **New project** → nombre `ruta85`, elige una región cercana (p. ej. `West EU`) y guarda la
   contraseña de la base de datos en tu gestor de contraseñas (la app no la usa).
3. Espera a que termine de aprovisionarse (1-2 minutos).

## 2. Crear las tablas

1. En el panel: **SQL Editor** → **New query**.
2. Pega todo el contenido de [`migrations/001_init.sql`](./migrations/001_init.sql) y pulsa **Run**.
3. Debe terminar con `Success. No rows returned`. Es seguro volver a ejecutarlo.
4. Comprueba en **Table Editor** que existen 9 tablas (`settings`, `body_logs`, `sessions`,
   `session_sets`, `activities`, `shifts`, `food_logs`, `food_favorites`, `imports`) y que cada una
   muestra el candado de **RLS enabled**.

## 3. Autenticación con enlace mágico

1. **Authentication → Sign In / Providers → Email**: activado. Deja activado "Confirm email".
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://lord-jorx.github.io/ruta85/`
   - **Redirect URLs** (añade las dos):
     - `https://lord-jorx.github.io/ruta85/`
     - `http://localhost:5173/`
3. (Opcional, recomendado en la PWA instalada) **Authentication → Email Templates → Magic Link**:
   añade al cuerpo `Código: {{ .Token }}`. Así puedes iniciar sesión escribiendo el código de 6
   cifras en la app (`verifyEmailCode`) si el enlace se abre en otro navegador.

Importante: la app usa el flujo **PKCE**. El enlace debe abrirse **en el mismo navegador** (o en
la misma PWA instalada) desde el que pediste el acceso; si lo abres en otro, usa el código de
6 cifras.

## 4. Crear tu cuenta y cerrar el registro

1. Despliega o abre la app (`npm run dev` → <http://localhost:5173/>), ve a **Ajustes → Cuenta** y
   pide el enlace con tu email. Ábrelo desde el correo: ya tienes sesión.
2. Cuando veas tu usuario en **Authentication → Users**, ve a
   **Authentication → Sign In / Providers** y **desactiva "Allow new users to sign up"**.
   A partir de ahí nadie más puede crear cuentas (tú sigues entrando con enlace mágico).

## 5. Conectar la app

En **Project Settings → API** copia:

- **Project URL** (`https://xxxx.supabase.co`)
- **anon / publishable key** (la clave pública)

Local: crea `.env.local` en la raíz del proyecto (está en `.gitignore`; ver `.env.example`):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-o-publishable
```

Reinicia `npm run dev`. En GitHub Actions: repositorio → **Settings → Secrets and variables →
Actions → New repository secret** y crea `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los
mismos valores (el workflow de despliegue los inyecta en el build).

## Seguridad: lo que NUNCA debe ir en la app

- La clave **`service_role`** (o "secret key") se salta toda la seguridad por filas. **No la pongas
  nunca** en `.env.local`, en el código, en los secretos con prefijo `VITE_` ni en el repositorio:
  todo lo que lleva el prefijo `VITE_` acaba en el JavaScript público.
- La clave anon/publishable sí es pública por diseño: lo que protege tus datos son las políticas
  RLS del SQL (cada fila solo es visible para su `user_id`) y que el registro esté cerrado.

## Cómo sincroniza (resumen)

- Todo se escribe primero en el navegador (IndexedDB) y se encola en un *outbox*.
- Con sesión y conexión: se descargan los cambios del servidor, se fusionan con
  "el último cambio gana" (`updated_at`) y se suben los pendientes.
- Los borrados son lógicos (`deleted = true`) para que lleguen a todos los dispositivos.
- Sin conexión no pasa nada: queda en el outbox y se sube al volver la red.
