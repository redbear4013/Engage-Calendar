'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Hero } from '@/components/marketing/hero'
import { Features } from '@/components/marketing/features'
import { CTA } from '@/components/marketing/cta'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Only show marketing page for unauthenticated users
  if (!user) {
    return (
      <main className="min-h-screen">
        <Hero />
        <Features />
        <CTA />
      </main>
    )
  }

  // This shouldn't be reached due to the redirect, but just in case
  return null
}