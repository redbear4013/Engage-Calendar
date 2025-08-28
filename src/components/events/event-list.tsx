'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useEvents } from '@/hooks/use-events'
import { useSaveEvent } from '@/hooks/use-save-event'
import { formatDate, formatDateRange } from '@/lib/utils'
import { 
  Heart, 
  MapPin, 
  Clock, 
  ExternalLink,
  Calendar,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from '@/types'

interface EventListProps {
  compact?: boolean
  limit?: number
}

export function EventList({ compact = false, limit }: EventListProps) {
  const { data: events = [], isLoading } = useEvents()
  const { mutate: saveEvent, isPending } = useSaveEvent()
  const [processingEvents, setProcessingEvents] = useState<Set<string>>(new Set())

  const displayEvents = limit ? events.slice(0, limit) : events

  const handleSaveEvent = async (event: CalendarEvent) => {
    if (processingEvents.has(event.id)) return
    
    setProcessingEvents(prev => new Set([...prev, event.id]))
    
    try {
      await saveEvent({
        eventId: event.id,
        action: event.isSaved ? 'unsave' : 'save'
      })
    } finally {
      setProcessingEvents(prev => {
        const newSet = new Set(prev)
        newSet.delete(event.id)
        return newSet
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(compact ? 3 : 6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No events found</h3>
          <p className="text-muted-foreground mb-4">
            Check back later for new events, or adjust your filters.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {displayEvents.map((event) => (
        <Card key={event.id} className="group hover:shadow-md transition-shadow">
          <CardContent className={cn(
            "p-4",
            compact ? "p-3" : "p-6"
          )}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className={cn(
                      "font-semibold line-clamp-2 mb-2",
                      compact ? "text-sm" : "text-lg"
                    )}>
                      {event.title}
                    </h3>
                    
                    {!compact && event.description && (
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                        {event.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                      {event.startTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {event.endTime ? 
                            formatDateRange(event.startTime, event.endTime) : 
                            formatDate(event.startTime, 'long')
                          }
                        </div>
                      )}
                      
                      {event.city && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.city}
                        </div>
                      )}

                      {event.organizerName && (
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {event.organizerName}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {event.categories.map((category) => (
                        <Badge 
                          key={category} 
                          variant="secondary" 
                          className="text-xs"
                        >
                          {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <Button
                  variant={event.isSaved ? "default" : "outline"}
                  size={compact ? "sm" : "default"}
                  onClick={() => handleSaveEvent(event)}
                  disabled={processingEvents.has(event.id)}
                  className="min-w-0"
                >
                  <Heart className={cn(
                    "w-4 h-4",
                    compact ? "mr-1" : "mr-2",
                    event.isSaved && "fill-current"
                  )} />
                  {compact ? "" : (event.isSaved ? "Saved" : "Save")}
                </Button>

                {event.externalUrl && (
                  <Button
                    variant="ghost"
                    size={compact ? "sm" : "default"}
                    asChild
                    className="min-w-0"
                  >
                    <a
                      href={event.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className={cn(
                        "w-4 h-4",
                        !compact && "mr-2"
                      )} />
                      {!compact && "View"}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {limit && events.length > limit && (
        <div className="text-center">
          <Button variant="outline">
            View All Events ({events.length})
          </Button>
        </div>
      )}
    </div>
  )
}