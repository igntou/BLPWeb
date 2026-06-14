# Guía completa: del sitio a producción con Claude Code + Vercel

Esta carpeta contiene **todo lo que necesitás** para pasar la landing de Blue Phoenix Lab a un repositorio real, conectarle un backend que capture los leads (nombre + email del autodiagnóstico) y publicarla en internet con Vercel.

Está pensada para seguirse de arriba hacia abajo. No hace falta saber programar: en cada paso te dejo el **prompt exacto** para pegarle a Claude Code.

---

## 0. Qué tenés hoy (punto de partida)

- **`index.html`** → la landing completa, ya diseñada y funcionando: hero, secciones, y el **autodiagnóstico interactivo de 10 preguntas** que al final pide **nombre + email** y muestra el resultado con el CTA "Agendar llamada para una demo". **Ya tiene el `fetch` conectado a `/api/lead`.**
- **`phoenix-mark.png`** → el logo (lo usa el HTML).
- **`api/lead.js`** → backend (Serverless Function) que recibe los leads y te avisa por email.
- **`package.json`** → declara la dependencia `resend`.
- **`.gitignore`** → evita subir claves y `node_modules` a GitHub.
- **`.env.example`** → plantilla de las variables de entorno.

**Lo único que falta para producción:** cargar tus claves (Resend) y hacer el deploy. El formulario **ya envía** los datos a `/api/lead`; solo falta que ese backend tenga las credenciales para avisarte. Eso es lo que resolvemos acá.

### Arquitectura que vamos a montar

```
  Navegador (Landing Page)                    Vercel
 ┌───────────────────────┐         ┌──────────────────────────────┐
 │  Autodiagnóstico       │  POST   │  /api/lead.js  (serverless)  │
 │  → nombre + email  ────┼────────▶│   1. valida                  │
 │                        │  /api   │   2. te avisa por email      │
 │  index.html (estático) │◀────────┤   3. (opcional) guarda en DB │
 └───────────────────────┘   ok    └──────────────────────────────┘
```

La landing sigue siendo **un archivo estático** (rápido y barato). El backend es **una sola función** que vive en `/api`. Vercel sirve las dos cosas juntas sin configurar servidores.

---

## 1. Instalar las herramientas (una sola vez)

1. **Node.js** (incluye `npm`): https://nodejs.org → descargá la versión "LTS".
2. **Claude Code**: abrí una terminal y corré:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```
   Después escribí `claude` y seguí los pasos para iniciar sesión.
3. **Cuenta de GitHub**: https://github.com (gratis) — Vercel lo usa para publicar.
4. **Cuenta de Vercel**: https://vercel.com → "Sign up with GitHub".
5. **Cuenta de Resend** (para que los emails te lleguen): https://resend.com (gratis hasta 3.000 emails/mes).

---

## 2. Crear el proyecto y abrir Claude Code

1. Creá una carpeta nueva en tu computadora, por ejemplo `blue-phoenix-web`.
2. Copiá adentro **todo el contenido de esta carpeta de handoff** (ya viene con la estructura correcta):
   - `index.html`  (la landing — ya con el nombre que Vercel espera)
   - `phoenix-mark.png`
   - `api/lead.js`
   - `package.json`, `.gitignore`, `.env.example`
3. Abrí una terminal **dentro** de esa carpeta y escribí:
   ```bash
   claude
   ```

Ya estás adentro de Claude Code, parado en tu proyecto. Ahora le vas dando los prompts de abajo.

---

## 3. (Ya hecho) El formulario está conectado al backend

`index.html` **ya envía** los leads a `POST /api/lead` cuando alguien completa el autodiagnóstico (`source: 'autodiagnostico'`, con las respuestas) o el modal del checklist (`source: 'checklist'`). Lo hace con una función `window.sendLead(...)` que ya está en el HTML. **No tenés que tocar nada acá.**

> Si en algún momento querés revisarlo o ajustarlo, pedile a Claude Code:
> "Mostrame dónde `index.html` llama a `window.sendLead` y a `/api/lead`, y verificá que mande `name`, `email` y `source`."

---

## 4. Prompt para preparar el backend

El archivo `api/lead.js` ya está escrito, pero necesita la dependencia y las variables. Pegale:

> **Prompt 2 — preparar el backend:**
>
> "Tengo una Vercel Serverless Function en `api/lead.js` que usa la librería `resend`, y un `package.json` que ya la declara. Corré `npm install` para instalarla. Después revisá `api/lead.js` y confirmá que la validación de email y el manejo de errores estén bien. No hace falta un servidor Express: es una función serverless de Vercel."

---

## 5. Dónde guardar los leads (elegí UNA opción)

El ejemplo ya **te avisa por email** cada lead (suficiente para arrancar). Si además querés una lista/base de datos, decile a Claude Code cuál preferís:

| Opción | Para quién | Prompt para Claude Code |
|---|---|---|
| **Solo email** (Resend) | Arrancar ya, sin base de datos | *(ya está hecho — no hagas nada)* |
| **Airtable** ✅ | Querés un mini-CRM visual | *(ya viene integrado — solo cargá las 3 variables, ver abajo)* |
| **Google Sheets** | Querés ver los leads en una planilla | "Agregá a `api/lead.js` que cada lead también se escriba como fila en una Google Sheet usando una Service Account. Explicame qué credenciales necesito." |
| **Base de datos (Postgres)** | Producto serio a futuro | "Agregá Vercel Postgres y guardá cada lead en una tabla `leads (id, name, email, source, result, created_at)`." |

Recomendación para empezar: **email + Airtable** (es lo más simple de ver y exportar).

### Cómo conectar Airtable (ya viene integrado en `api/lead.js`)

1. Entrá a https://airtable.com y creá una **base** con una tabla llamada **`Leads`**.
2. Creá estas columnas (campos) en la tabla — los nombres deben coincidir:
   - `Nombre` (Single line text)
   - `Email` (Email o Single line text)
   - `Fuente` (Single select o Single line text)
   - `Resultado` (Long text)
   - `Respuestas` (Long text)
   - `Fecha` (Single line text, o Date)
3. Generá un **Personal Access Token** en https://airtable.com/create/tokens con el permiso **`data.records:write`** y dale acceso a tu base.
4. Anotá el **Base ID** (empieza con `app...`; lo ves en https://airtable.com/api o en la URL de la base).
5. Cargá estas variables (en `.env.local` y después en Vercel):
   ```
   AIRTABLE_TOKEN=pat_xxxxxxxxxxxx
   AIRTABLE_BASE_ID=appxxxxxxxxxxxx
   AIRTABLE_TABLE=Leads
   ```

> Si NO cargás esas variables, el backend simplemente **ignora Airtable** y sigue avisándote por email. No rompe nada.

---

## 6. Configurar las claves (variables de entorno)

1. En **Resend** → "API Keys" → creá una y copiala.
2. En Resend → "Domains", verificá tu dominio (o usá `onboarding@resend.dev` como `FROM_EMAIL` para testear).
3. En la carpeta del proyecto ya tenés un archivo **`.env.example`**. Copialo como **`.env.local`** y reemplazá los valores por los reales:

   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   OWNER_EMAIL=tucorreo@gmail.com
   FROM_EMAIL=leads@tudominio.com
   ```

> **Prompt 3 — variables de entorno:**
>
> "Copiá `.env.example` como `.env.local`. Confirmá que `.env.local` esté en `.gitignore` para que no se suba a GitHub. Decime después dónde pegar los valores reales."

> ⚠️ **Importante:** las claves nunca se suben a GitHub. En Vercel se cargan aparte (paso 8).

---

## 7. Probar en tu computadora antes de publicar

> **Prompt 4 — probar local:**
>
> "Quiero probar el sitio y la función `/api/lead` en mi computadora antes de publicar. Instalá Vercel CLI, corré `vercel dev`, y guiame para abrir el sitio en el navegador y completar el autodiagnóstico para verificar que me llega el email de prueba."

Completá el formulario con tu propio email y confirmá que te llega la notificación. Si llega, está todo listo para publicar.

---

## 8. Publicar en Vercel (deploy)

Hay dos caminos. El recomendado es por GitHub (así cada cambio se publica solo).

### Opción A — recomendado (GitHub + Vercel)

> **Prompt 5 — subir a GitHub:**
>
> "Inicializá git en este proyecto, hacé el primer commit y subilo a un repositorio nuevo de GitHub llamado `blue-phoenix-web`. Asegurate de que `.env.local` y `node_modules` estén en `.gitignore`."

Después, en el navegador:
1. Entrá a https://vercel.com → **Add New… → Project**.
2. Elegí el repo `blue-phoenix-web` y dale **Import**.
3. En **Environment Variables** cargá las tres claves del paso 6 (`RESEND_API_KEY`, `OWNER_EMAIL`, `FROM_EMAIL`) con los **valores reales**.
4. **Deploy**. En ~1 minuto tenés una URL tipo `blue-phoenix-web.vercel.app`.

A partir de ahí, cada vez que le pidas un cambio a Claude Code y hagas `git push`, **Vercel republica solo**.

### Opción B — rápido (sin GitHub)

> **Prompt 5b — deploy directo:**
>
> "Publicá este proyecto en Vercel directamente desde la terminal con `vercel --prod`, y guiame para cargar las variables de entorno en el dashboard."

---

## 8.5. Cambiar el link de Google Calendar

El botón "Agendar llamada para una demo" (al final del autodiagnóstico) usa **una sola variable**. En `index.html`, dentro del `<script>` del diagnóstico, buscá:

```js
const DG_CAL = "https://calendar.app.google/WQ7tZxNE5tLQYieE6";
```

Reemplazá esa URL por la tuya. Para obtener tu link propio:
1. Google Calendar → **Crear → Programación de citas**.
2. Configurá nombre, duración y disponibilidad → **Guardar**.
3. **Compartir → Copiar enlace de la página de reservas** (`https://calendar.app.google/…`).
4. Pegá ese link en `DG_CAL`.

> Sirve igual con Calendly o Cal.com: copiás tu link público y lo pegás ahí.

Prompt para Claude Code:
> "En `index.html`, cambiá el valor de la constante `DG_CAL` por: `<tu-link>`."

---

## 9. Conectar tu dominio propio (opcional)

1. En Vercel → tu proyecto → **Settings → Domains → Add**.
2. Escribí tu dominio (ej. `bluephoenixlab.com`).
3. Vercel te muestra unos registros DNS → cargalos donde compraste el dominio (Namecheap, GoDaddy, etc.).
4. En unos minutos queda con HTTPS automático.

> Acordate: para que los emails salgan desde `@tudominio.com`, verificá ese mismo dominio también en **Resend**.

---

## 10. Checklist final

- [ ] `index.html` envía los leads a `/api/lead` *(ya viene hecho)*.
- [ ] `npm install` corrido para instalar `resend` (Prompt 2).
- [ ] Variables `RESEND_API_KEY`, `OWNER_EMAIL`, `FROM_EMAIL` cargadas (paso 6 y 8).
- [ ] (Opcional) Airtable: tabla `Leads` creada + `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE` cargadas (paso 5).
- [ ] Probado en local con `vercel dev` y llegó el email (paso 7).
- [ ] Deploy hecho en Vercel y la URL abre bien (paso 8).
- [ ] (Opcional) Dominio propio conectado (paso 9).
- [ ] (Opcional) Leads guardándose en Airtable (paso 5).

---

## Notas sobre los archivos de esta carpeta

- **Son la referencia de diseño y un backend de arranque**, no un producto cerrado. La idea es que Claude Code los tome como base y los integre/ajuste en tu repo real.
- El HTML es un diseño **hi-fi** (colores, tipografía y comportamiento finales). Se puede publicar tal cual como estático; no hace falta reescribirlo en React salvo que más adelante quieras un sitio más grande.
- Si en el futuro querés agendar las llamadas con un sistema propio (en vez del link de Google Calendar), avisá y se planifica una segunda etapa.
