# Estado editable en crear/editar recursos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New resources default to `DRAFT` status but the create form lets you pick a different status right away; both `ADMIN` and `EDITOR` can change status directly from both the create and edit forms.

**Architecture:** No schema change (`Resource.status` already exists with `DRAFT`/`PUBLISHED`/`ARCHIVED`, default `DRAFT`). Two Next.js admin pages get a form field + server-action update each: `new/page.tsx` gains a status `<select>` wired to its `create()` action, and `[id]/page.tsx` drops its `ADMIN`-only gate on the existing status `<select>` and on `save()`.

**Tech Stack:** Next.js 16 App Router, React Server Components, inline Server Actions (`'use server'`), Prisma 5, TypeScript.

## Global Constraints

- Don't change `verifiedAt`/`verifiedBy` handling — stays `ADMIN`-only, unrelated to this task.
- Don't change `publishResource`/`archiveResource`/`confirmResource` in `[country]/page.tsx` — already role-correct, out of scope.
- Don't touch the orphaned `app/api/resources/route.ts` / `[id]/route.ts` REST routes — confirmed unused, tracked separately.
- The country-scope guard (`user.role === 'EDITOR' && !user.countrySlugs.includes(country)`) must remain the authorization boundary in both server actions — unchanged.
- `npx tsc --noEmit` must stay clean after each task.
- No automated test suite covers the admin resource pages today (existing `publishResource`/`archiveResource`/`confirmResource` have no tests either) — verification is manual, in-browser, per the approved spec (`docs/superpowers/specs/2026-07-01-resource-status-field-design.md`).

---

### Task 1: Status field on the create form

**Files:**
- Modify: `app/admin/(dashboard)/[country]/new/page.tsx`

**Interfaces:**
- Consumes: `ResourceStatus` enum from `@prisma/client` (already imported at line 4); the `Sel` helper component defined at the bottom of this same file (lines 179-193).
- Produces: none consumed by other tasks — self-contained.

- [ ] **Step 1: Extend the local `Sel` component to accept an optional default value**

In `app/admin/(dashboard)/[country]/new/page.tsx`, replace the `Sel` function (currently lines 179-193):

```tsx
function Sel({ label, name, opts, labels }: { label: string; name: string; opts: string[]; labels?: Record<string, string> }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        name={name}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      >
        {opts.map((o) => (
          <option key={o} value={o}>{labels?.[o] ?? o}</option>
        ))}
      </select>
    </div>
  )
}
```

with:

```tsx
function Sel({ label, name, opts, labels, value }: { label: string; name: string; opts: string[]; labels?: Record<string, string>; value?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        name={name}
        defaultValue={value}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      >
        {opts.map((o) => (
          <option key={o} value={o}>{labels?.[o] ?? o}</option>
        ))}
      </select>
    </div>
  )
}
```

This is additive (`value` is optional) — the existing `Sel` call for "Categoría" is unaffected.

- [ ] **Step 2: Add `STATUSES`/`STATUS_LABELS` constants**

In the same file, right after the existing `CATEGORY_LABELS` block (currently lines 17-26), add:

```tsx
const STATUSES = Object.values(ResourceStatus)

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
}
```

(This mirrors the identical constants already defined in `app/admin/(dashboard)/[country]/[id]/page.tsx` lines 16, 29-33 — same duplication pattern the codebase already uses for `CATEGORY_LABELS` across these two files.)

- [ ] **Step 3: Add the status field to the form and move Ciudad to its own row**

Replace the existing grid block (currently lines 108-122):

```tsx
        <div className="grid grid-cols-2 gap-4">
          <Sel label="Categoría" name="category" opts={CATEGORIES} labels={CATEGORY_LABELS} />
          {cities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad / Región</label>
              <select name="cityId"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                <option value="">— Nacional (sin ciudad específica)</option>
                {cities.map(c => (
                  <option key={c.id} value={c.id}>{c.nameEs}</option>
                ))}
              </select>
            </div>
          )}
        </div>
```

with:

```tsx
        <div className="grid grid-cols-2 gap-4">
          <Sel label="Categoría" name="category" opts={CATEGORIES} labels={CATEGORY_LABELS} />
          <Sel label="Estado" name="status" opts={STATUSES} labels={STATUS_LABELS} value={ResourceStatus.DRAFT} />
        </div>

        {cities.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad / Región</label>
            <select name="cityId"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
              <option value="">— Nacional (sin ciudad específica)</option>
              {cities.map(c => (
                <option key={c.id} value={c.id}>{c.nameEs}</option>
              ))}
            </select>
          </div>
        )}
```

This puts Categoría + Estado side by side and Ciudad on its own row — matching the layout already used in `[id]/page.tsx` (lines 135-147 for the grid, 156-170 for Ciudad).

- [ ] **Step 4: Read status from the form in `create()` instead of hardcoding it**

In the same file, in the `create()` server action, replace this line (currently line 57):

```tsx
        status: ResourceStatus.PUBLISHED,
```

with:

```tsx
        status: (fd.get('status') as ResourceStatus) || ResourceStatus.DRAFT,
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification in browser**

1. `npm run dev`, log in as the seeded `ADMIN` (magic link printed to console).
2. Go to any country → "+ Añadir". Confirm the form now shows an "Estado" dropdown defaulted to "Borrador", positioned next to "Categoría".
3. Fill required fields, leave "Estado" on "Borrador", submit. Confirm the new resource appears under "Borradores" on the country page (not "Publicados").
4. Create a second resource, this time changing "Estado" to "Publicado" before submitting. Confirm it appears directly under "Publicados".

- [ ] **Step 7: Commit**

```bash
git add "app/admin/(dashboard)/[country]/new/page.tsx"
git commit -m "$(cat <<'EOF'
feat: new resources default to draft with editable status on create

Resource creation no longer force-publishes; the form now shows a status
selector (defaulted to Borrador) so it can still be published immediately
when needed.
EOF
)"
```

---

### Task 2: Make the edit-form status selector available to every role

**Files:**
- Modify: `app/admin/(dashboard)/[country]/[id]/page.tsx`

**Interfaces:**
- Consumes: `STATUSES`, `STATUS_LABELS`, `Sel` component already defined in this file (lines 16, 29-33, 224-243) — no changes needed to any of those.
- Produces: none consumed by other tasks.

- [ ] **Step 1: Remove the `ADMIN`-only branch around the status selector**

In `app/admin/(dashboard)/[country]/[id]/page.tsx`, replace the current block (lines 135-147):

```tsx
        <div className="grid grid-cols-2 gap-4">
          <Sel label="Categoría" name="category" value={resource.category} opts={CATEGORIES} labels={CATEGORY_LABELS} />
          {user.role === 'ADMIN' ? (
            <Sel label="Estado" name="status" value={resource.status} opts={STATUSES} labels={STATUS_LABELS} />
          ) : (
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-1">Estado</p>
              <p className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500">
                {STATUS_LABELS[resource.status] ?? resource.status}
              </p>
            </div>
          )}
        </div>
```

with:

```tsx
        <div className="grid grid-cols-2 gap-4">
          <Sel label="Categoría" name="category" value={resource.category} opts={CATEGORIES} labels={CATEGORY_LABELS} />
          <Sel label="Estado" name="status" value={resource.status} opts={STATUSES} labels={STATUS_LABELS} />
        </div>
```

- [ ] **Step 2: Apply the status change for every role in `save()`**

In the same file, replace these two lines in `save()` (currently lines 69-70):

```tsx
    const isAdmin = user.role === 'ADMIN'
    const newStatus = isAdmin ? fd.get('status') as ResourceStatus : undefined
```

with:

```tsx
    const isAdmin = user.role === 'ADMIN'
    const newStatus = fd.get('status') as ResourceStatus
```

Then replace this line (currently line 78):

```tsx
        ...(newStatus !== undefined ? { status: newStatus } : {}),
```

with:

```tsx
        status: newStatus,
```

`isAdmin` stays in the file — it's still used for `verifiedAt`/`verifiedBy` on lines 90-91, which are unaffected by this change.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Create a temporary local EDITOR account for manual testing**

Open Prisma Studio: `npx prisma studio`. In the `AdminUser` table, add a row: `email` = an address you can read dev magic-links for (e.g. `editor-test@example.com`), `role` = `EDITOR`, `isActive` = `true`, `countrySlugs` = an array containing one seeded country slug (e.g. `["espana"]` — check the `Country` table for an existing slug). Save.

- [ ] **Step 5: Manual verification in browser**

1. In an incognito window, go to `/admin/login`, request a magic link for `editor-test@example.com`, and grab the link from the dev console log.
2. Open a resource belonging to the assigned country (`/admin/<that-country-slug>/<resource-id>`). Confirm the "Estado" field is now an editable dropdown (not the previous read-only text).
3. Change the status (e.g. Borrador → Publicado) and save. Confirm the resource moves to the correct section ("Publicados"/"Borradores") on the country list page.
4. Log back in as `ADMIN` and confirm its "Estado" dropdown on the same edit form still works as before.

- [ ] **Step 6: Remove the temporary EDITOR test account**

Back in Prisma Studio, delete the `editor-test@example.com` row from `AdminUser` (avoid leaving test accounts in the dev database).

- [ ] **Step 7: Commit**

```bash
git add "app/admin/(dashboard)/[country]/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
feat: allow EDITOR to change resource status from the edit form

The status selector was previously ADMIN-only in the edit form even
though EDITOR could already reach the same outcome via the Publicar/
Archivar buttons on the country list — this makes the two paths
consistent.
EOF
)"
```

---

### Task 3: Full regression pass and deploy

**Files:** none (verification only).

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: End-to-end smoke test in browser**

As `ADMIN`:
1. Create a resource leaving Estado on Borrador → appears in Borradores.
2. Click "Publicar" on it from the list (existing button) → moves to Publicados.
3. Open it for edit, change Estado back to Borrador via the dropdown, save → moves back to Borradores on the list page.
4. Confirm the public site (`/es/<country-slug>`) does **not** show the draft resource, and does show it once it's Publicado again.

- [ ] **Step 3: Push**

```bash
git push origin master
```

Confirm this to the user before running — pushing to `master` triggers an automatic production deploy on Vercel (per project setup).

- [ ] **Step 4: Post-deploy smoke check**

Once Vercel finishes deploying, load the production admin (`veconecta.org/admin`) and repeat Step 2's create → publish → unpublish cycle once, quickly, to confirm the deployed build behaves the same as local.
