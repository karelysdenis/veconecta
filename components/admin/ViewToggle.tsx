import type { ReviewViewMode } from '@/lib/review-view'

export function ViewToggle({
  mode,
  returnTo,
  action,
}: {
  mode: ReviewViewMode
  returnTo: string
  action: (fd: FormData) => void
}) {
  return (
    <div className="flex text-xs rounded-lg border border-gray-200 overflow-hidden">
      <form action={action}>
        <input type="hidden" name="mode" value="one" />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button
          type="submit"
          className={`px-3 py-1.5 ${mode === 'one' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Uno a uno
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="mode" value="list" />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button
          type="submit"
          className={`px-3 py-1.5 ${mode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Lista
        </button>
      </form>
    </div>
  )
}
