'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { User as AppUser, LoginCredentials, RegisterCredentials } from '@/types'

interface AuthContextType {
  user: User | null
  profile: AppUser | null
  loading: boolean
  signIn: (credentials: LoginCredentials) => Promise<{ error?: string }>
  signUp: (credentials: RegisterCredentials) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<AppUser>) => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data) {
        setProfile({
          id: data.id,
          email: data.email,
          name: data.name || undefined,
          city: data.city || undefined,
          country: data.country || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const signIn = async (credentials: LoginCredentials) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) throw error
      return {}
    } catch (error: any) {
      return { error: error.message }
    }
  }

  const signUp = async (credentials: RegisterCredentials) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            name: credentials.name,
            city: credentials.city,
            country: credentials.country,
          },
        },
      })

      if (error) throw error

      // Check if email confirmation is required
      if (data.user && !data.session) {
        return { error: 'Please check your email and click the confirmation link to complete registration.' }
      }

      // User profile will be created automatically by database trigger
      // No need to manually insert into users table

      return {}
    } catch (error: any) {
      return { error: error.message }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const updateProfile = async (updates: Partial<AppUser>) => {
    if (!user) return { error: 'No user logged in' }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: updates.name,
          city: updates.city,
          country: updates.country,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      // Update local profile state
      setProfile(prev => prev ? { ...prev, ...updates } : null)
      return {}
    } catch (error: any) {
      return { error: error.message }
    }
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}