# Import de recursos desde el PM tracker (.xlsx) — Diseño

**Fecha:** 2026-07-05
**Rama:** `feature/admin-resource-import`
**Origen:** hoy se pasaron a mano 15 filas de Francia desde `Veconecta.md` hacia el PM tracker (`VeConecta-PM (2).xlsx`); el usuario pidió automatizar el paso siguiente (tracker → `Resource` en DRAFT) como feature de admin.

## Objetivo

Permitir que un ADMIN o EDITOR suba el mismo Excel de PM tracking (`📋 Contenido por País`) que ya se usa para investigar/curar recursos, y que el sistema cree los `Resource` correspondientes en estado `DRAFT`, sin duplicar filas ya importadas y sin tocar países/recursos fuera del alcance del usuario.

## 1. Columnas del template

La hoja **"📋 Contenido por País"** gana dos grupos de columnas que hoy faltan, para que todo campo localizable de `Resource` tenga su columna (paralelo a como ya están las notas):

- `Nombre EN`, `Nombre PT`, `Nombre FR`, `Nombre DE` (nuevas — hoy solo existe "Nombre del recurso")
- `Nota FR` (nueva — hoy están ES/EN/PT/DE pero falta FR)

Mapeo completo columna → campo de `Resource`:

| Columna | Campo | Requerido | Notas |
|---|---|---|---|
| País | `countrySlug` | Sí | Resuelto vía alias map + match; ver §2 |
| Categoría | `category` | Sí | Debe matchear un valor exacto de `ResourceCategory` |
| Nombre del recurso | `name` | Sí | No vacío tras trim |
| Nombre EN/PT/FR/DE | `nameEn/namePt/nameFr/nameDe` | No | |
| URL | `url` | No | |
| Tel / Bizum / Cuenta / PIX | `phone` y/o `paymentKey` | No | Heurística, ver §2 |
| Gratuito | `free` | No | "Sí" → true, cualquier otra cosa (incl. vacío) → false |
| Ciudad / Región | `cityId` | No | Resuelto/creado, ver §2 |
| Dirección física | `address` | No | |
| Horario | `schedule` | No | |
| Nota ES/EN/PT/FR/DE | `notesEs/En/Pt/Fr/De` | No | |
| Estado | *(ignorada)* | — | El import siempre fuerza `status: DRAFT` |
| Verificado por | *(ignorada)* | — | `verifiedBy` queda `null` |
| Fecha verificación | *(ignorada)* | — | `verifiedAt` queda `null` |
| Caduca el | `validUntil` | No | Solo tiene efecto porque `kind` siempre es `PERMANENT` en este import |
| Idiomas disponibles | *(ignorada)* | — | Informativo, redundante con qué columnas Nota vienen llenas |
| Prioridad | *(ignorada, con aviso)* | — | Ver §3 |
| Notas internas | *(ignorada, con aviso)* | — | Ver §3 |

Recursos creados por este import siempre tienen `kind: PERMANENT` (el tracker no tiene columnas de evento) y `status: DRAFT`.

## 2. Resolución y validación por fila

**País:**
1. Alias map estático (`lib/import-country-aliases.ts` o similar) para variantes conocidas de texto libre → slug (ej. `EEUU→usa`, `México→mexico`, `Brasil→brazil`, `España→spain`).
2. Si no hay alias, intenta match exacto (case-insensitive) contra `Country.nameEs`.
3. Si aun así no resuelve:
   - **ADMIN**: la fila se ofrece en una sección aparte del preview ("países nuevos a crear"), con checkbox. Si se confirma, se crea `Country` con `active: false` (borrador), `slug: slugify(nombre)`, `nameEs: nombre tal cual vino`, `cca2` desde `SLUG_TO_ISO[slug]` si existe, `flag` con un placeholder (🏳️) hasta que un ADMIN lo edite en `/admin/countries/[slug]`.
   - **EDITOR**: la fila se marca automáticamente "fuera de tu alcance" (ver permisos abajo) — un EDITOR nunca puede tener asignado un país que no existe todavía, así que esto no necesita lógica especial adicional.

**Ciudad:** dentro del país ya resuelto, match case-insensitive contra `City.nameEs`; si no hay match, se autocrea reusando el mismo patrón idempotente que `lib/city.ts` (`resolveCityId`) — `nameEs` es el texto libre tal cual (aunque venga compuesto, ej. "Mérignac / Bordeaux"), `slug: slugify(texto)`. Igual que en el form manual, dos filas con el mismo texto no crean dos ciudades (colisión de slug reutiliza la existente).

**Categoría:** debe matchear exacto un valor de `ResourceCategory`. Si no, error de fila ("categoría no reconocida: <valor>").

**Nombre:** no vacío tras `trim()`. Si no, error de fila.

**Duplicados:** antes de crear, se busca un `Resource` existente con `countrySlug` + `name` (trim, exacto) iguales. Si existe, la fila se omite con motivo "ya importada" — permite resubir el Excel completo cuantas veces haga falta sin generar copias.

**Tel / Bizum / Cuenta / PIX → phone / paymentKey (heurística):**
- Si el texto contiene un prefijo tipo `Tel:` o parece un número de teléfono/WhatsApp (dígitos, `+`, espacios) → va a `phone`.
- Si contiene palabras clave `Cuenta`, `PIX`, `Bizum` → va a `paymentKey`.
- Si contiene ambos tipos de señal (ej. "Tel: ... | Cuenta: ..."), se separan por el delimitador `|` (mismo separador que ya usa el tracker hoy, ej. fila 9 de Argentina) y cada parte va a su campo según la heurística de arriba.
- Si no matchea ninguna heurística, el texto completo va a `phone` (fallback conservador, evita perder el dato).

## 3. Permisos y alcance

Página nueva `/admin/import`, visible para `ADMIN` y `EDITOR` (nav junto a `/admin/languages`).

- **ADMIN:** ve y puede confirmar todas las filas, incluyendo la creación de países nuevos.
- **EDITOR:** solo ve como "a crear" las filas cuyo país resuelto está en su `countrySlugs`. El resto aparece en una sección separada "fuera de tu alcance" (nunca se ignoran en silencio) con el motivo ("país X no asignado a tu cuenta").

**Notas internas / Prioridad:** no se guardan en ningún campo de `Resource` (no existe columna equivalente), pero si una fila trae contenido en cualquiera de las dos, el preview muestra un aviso aparte (no bloqueante): *"N filas tienen Notas internas/Prioridad que no se importan — revísalas en el Excel."*

## 4. Flujo (dry-run → confirmar)

1. **Subir archivo** (`.xlsx`) en `/admin/import` → server action lee la hoja `📋 Contenido por País` con `exceljs` (nueva dependencia; no había ninguna librería de spreadsheets en el proyecto), aplica §2 a cada fila.
2. **Preview**, sin escribir en la base de datos:
   - ✅ A crear (N) — tabla con los campos ya resueltos
   - ⏭️ Duplicada, se omite (N)
   - 🚫 Fuera de tu alcance (N) — solo relevante para EDITOR
   - ❌ Error (N) — con motivo por fila
   - ⚠️ Aviso de Notas internas/Prioridad si aplica
   - Sección "países nuevos a crear" (solo ADMIN) con checkbox por país
3. Las filas "a crear" (ya totalmente resueltas: slugs, cityId, valores finales) viajan como JSON en un input oculto del propio form de preview — no se vuelve a leer el Excel ni se persiste nada intermedio en servidor/DB.
4. **Confirmar import** → segunda server action: crea los países nuevos marcados (si aplica), crea cada `Resource` (mismo shape que `create()` en `app/admin/(dashboard)/[country]/new/page.tsx`, con `status: DRAFT`, `kind: PERMANENT`, `verifiedAt/verifiedBy: null`), y registra **un solo `AuditLog`** de resumen (`action: 'RESOURCE_BULK_IMPORT'`, `detail` con el conteo total y los países afectados) — no un log por fila, para no saturar `/admin/activity`.
5. Resultado: cuántos `Resource` DRAFT se crearon, con links a cada país afectado para revisarlos desde el admin normal.

## Fuera de alcance (explícitamente no incluido)

- Editar/actualizar recursos existentes vía import (solo crear nuevos; duplicados se omiten, no se sobreescriben).
- Soportar `kind: EVENT` desde el import (el tracker no tiene columnas de evento).
- Traducción automática de contenido faltante (las columnas de idioma se toman tal cual vienen en el Excel; si faltan, quedan `null`).
- Deshacer un import ya confirmado (no hay "undo" — se corrige a mano en el admin si algo salió mal, igual que con cualquier alta manual).
