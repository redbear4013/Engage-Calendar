import { Hero } from '@/components/marketing/hero'
import { Features } from '@/components/marketing/features'
import { CTA } from '@/components/marketing/cta'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <CTA />
    </main>
  )
}