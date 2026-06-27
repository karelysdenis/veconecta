import { Suspense } from 'react'
import LoginForm from '@/components/admin/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm" />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
