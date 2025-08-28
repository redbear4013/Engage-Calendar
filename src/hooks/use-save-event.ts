'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

interface SaveEventParams {
  eventId: string
  action: 'save' | 'unsave'
  note?: string
}

export function useSaveEvent() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ eventId, action, note }: SaveEventParams) => {
      if (!user) throw new Error('User not authenticated')

      if (action === 'save') {
        const { data, error } = await supabase
          .from('saved_events')
          .insert([
            {
              user_id: user.id,
              event_id: eventId,
              note: note || null,
            },
          ])
          .select()

        if (error) throw error
        return data
      } else {
        const { error } = await supabase
          .from('saved_events')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', eventId)

        if (error) throw error
        return null
      }
    },
    onSuccess: () => {
      // Invalidate events queries to refetch with updated saved status
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['saved-events'] })
    },
  })
}