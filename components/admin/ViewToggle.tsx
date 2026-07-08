import { List, SquareStack } from 'lucide-react'
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
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      <form action={action}>
        <input type="hidden" name="mode" value="one" />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button
          type="submit"
          title="Uno a uno"
          aria-label="Uno a uno"
          aria-pressed={mode === 'one'}
          className={`flex items-center px-2 py-1.5 ${mode === 'one' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <SquareStack size={14} />
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="mode" value="list" />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button
          type="submit"
          title="Lista"
          aria-label="Lista"
          aria-pressed={mode === 'list'}
          className={`flex items-center px-2 py-1.5 ${mode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <List size={14} />
        </button>
      </form>
    </div>
  )
}
