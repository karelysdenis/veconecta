# Diseño: Ciclo de revisión diaria de recursos temporales

**Fecha:** 2026-06-30
**Contexto:** Emergencia — recursos cambian rápido, necesitan revisión diaria.

---

## Problema

Los recursos temporales (`expiresAt != null`) vencen sin que el sistema distinga entre "revisado hoy" y "nunca revisado". Confirmar un recurso no renueva su vigencia. No hay flujo claro de revisión diaria.

---

## Modelo de datos

Sin cambios al schema. La distinción permanente/temporal ya existe:

| Tipo | `expiresAt` |
|------|-------------|
| Permanente | `null` |
| Temporal | fecha concreta |

### Regla de negocio: acción `confirm`

Actualmente solo actualiza `verifiedAt` y `verifiedBy`. Pasa a actualizar tres campos:

```
verifiedAt  = ahora
verifiedBy  = user.email
expiresAt   = ahora + 5 días
```

### Bug a corregir: acción `publishResource` (promover borrador)

Actualmente siempre sobreescribe `expiresAt = ahora + 14 días`. Corrección: solo aplica si el recurso ya tenía `expiresAt != null`. Si era permanente (`expiresAt = null`), conserva `null`.

### Umbrales visuales

| Estado | Condición | Color |
|--------|-----------|-------|
| Vencido | `expiresAt < ahora` | Rojo |
| Urgente | `ahora <= expiresAt <= ahora + 2 días` | Ámbar |
| Ok | `expiresAt > ahora + 2 días` | Verde |
| Permanente | `expiresAt = null` | Sin badge |

---

## Páginas afectadas

### 1. `app/admin/(dashboard)/[country]/page.tsx`

**Badge de días por recurso en la sección "Publicados":**

Extender el componente `DaysLeft` existente para cubrir los tres estados (vencido, urgente, ok) en vez de solo mostrar ≤7 días. Los permanentes no muestran badge de días.

**Botón "Revisar" — badge de urgentes:**

Cambiar el contador del badge naranja de `!verifiedAt` a recursos temporales urgentes (`expiresAt <= ahora + 2 días`). Refleja mejor la prioridad del flujo diario.

### 2. `app/admin/(dashboard)/[country]/review/page.tsx`

**Query — solo temporales:**

```ts
where: {
  countrySlug: country,
  status: 'PUBLISHED',
  expiresAt: showUrgent
    ? { lte: new Date(Date.now() + 2 * 86400000) }
    : { not: null },
}
orderBy: { expiresAt: 'asc' }
```

**Toggle renombrado:**
- `urgentes` (default): vencidos + vencen en ≤2 días
- `todos`: todos los temporales del país

**Acción `confirm` — nueva lógica:**

```ts
data: {
  verifiedAt: new Date(),
  verifiedBy: user.email,
  expiresAt: new Date(Date.now() + 5 * 86400000),
}
```

Tras confirmar avanza al siguiente recurso. Al confirmar el último, redirige a `/admin/${country}`.

**Card del recurso:**

Muestra prominentemente el estado de vencimiento (días restantes o días vencido) usando los umbrales definidos.

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `app/admin/(dashboard)/[country]/page.tsx` | Extender `DaysLeft`, cambiar contador del badge "Revisar", fix en `publishResource` |
| `app/admin/(dashboard)/[country]/review/page.tsx` | Query, toggle, acción `confirm`, card |

Sin migraciones. Sin cambios al schema.

---

## Fuera de alcance

- Archivado automático de recursos vencidos
- Notificaciones por email al vencer
- Batch confirm (confirmar varios a la vez)
