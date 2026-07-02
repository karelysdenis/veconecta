'use client'

export function CountryLocaleRow({
  countrySlug,
  provisioned,
  activeCodes,
  enabledLocales,
  resetAction,
}: {
  countrySlug: string
  provisioned: { code: string; label: string }[]
  activeCodes: string[]
  enabledLocales: string[]
  resetAction: (fd: FormData) => void
}) {
  const formId = `f-${countrySlug}`
  const isRestricted = enabledLocales.length > 0
  const effective = isRestricted ? enabledLocales : activeCodes

  return (
    <>
      {provisioned.map((l) => {
        const isDefault = l.code === 'es'
        const isActiveGlobally = activeCodes.includes(l.code)
        const checked = effective.includes(l.code)
        const isInherited = !isRestricted && checked
        return (
          <td key={l.code} className="text-center py-2">
            <input
              type="checkbox"
              form={formId}
              name="locale"
              value={l.code}
              disabled={!isActiveGlobally || isDefault}
              defaultChecked={checked}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              title={
                isDefault
                  ? 'Español siempre está incluido'
                  : !isActiveGlobally
                    ? `${l.label} está inactivo en todo el sitio`
                    : isInherited
                      ? `Heredado (sin restricción explícita para este país)`
                      : undefined
              }
              className={`h-4 w-4 rounded disabled:opacity-25 ${isInherited ? 'opacity-40' : ''}`}
            />
          </td>
        )
      })}
      <td className="text-center py-2">
        {isRestricted && (
          <form action={resetAction}>
            <input type="hidden" name="countrySlug" value={countrySlug} />
            <button
              type="submit"
              title="Quitar restricción — volver a heredar todos los idiomas activos"
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              ↺
            </button>
          </form>
        )}
      </td>
    </>
  )
}
