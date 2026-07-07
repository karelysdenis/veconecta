export default function Loading() {
  return (
    <div className="max-w-2xl animate-pulse space-y-4">
      <div className="h-4 w-40 bg-gray-100 rounded" />
      <div className="h-1 bg-gray-100 rounded-full" />
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="h-6 w-2/3 bg-gray-100 rounded" />
        <div className="h-4 w-1/2 bg-gray-100 rounded" />
        <div className="h-24 bg-gray-50 rounded" />
      </div>
    </div>
  )
}
