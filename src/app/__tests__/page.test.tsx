import { render, screen } from '@testing-library/react'
import HomePage from '../page'

// Mock the child components
jest.mock('@/components/marketing/hero', () => {
  return {
    Hero: () => <div data-testid="hero">Hero Component</div>
  }
})

jest.mock('@/components/marketing/features', () => {
  return {
    Features: () => <div data-testid="features">Features Component</div>
  }
})

jest.mock('@/components/marketing/cta', () => {
  return {
    CTA: () => <div data-testid="cta">CTA Component</div>
  }
})

describe('HomePage', () => {
  it('renders all marketing sections', () => {
    render(<HomePage />)
    
    expect(screen.getByTestId('hero')).toBeInTheDocument()
    expect(screen.getByTestId('features')).toBeInTheDocument()
    expect(screen.getByTestId('cta')).toBeInTheDocument()
  })
})