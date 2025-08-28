'use client'

import { useRef, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Today } from 'lucide-react'
import { useEvents } from '@/hooks/use-events'
import { formatDate } from '@/lib/utils'

interface CalendarViewProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
}

export function CalendarView({ selectedDate, onDateSelect }: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null)
  const { data: events = [], isLoading } = useEvents()

  const handleDateClick = useCallback((arg: any) => {
    onDateSelect(new Date(arg.date))
  }, [onDateSelect])

  const handleEventClick = useCallback((arg: any) => {
    // TODO: Open event details modal
    console.log('Event clicked:', arg.event)
  }, [])

  const handlePrevious = useCallback(() => {
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      calendarApi.prev()
    }
  }, [])

  const handleNext = useCallback(() => {
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      calendarApi.next()
    }
  }, [])

  const handleToday = useCallback(() => {
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      calendarApi.today()
      onDateSelect(new Date())
    }
  }, [onDateSelect])

  // Transform events data for FullCalendar
  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: event.startTime,
    end: event.endTime,
    backgroundColor: event.isSaved ? '#3b82f6' : '#e5e7eb',
    borderColor: event.isSaved ? '#2563eb' : '#d1d5db',
    textColor: event.isSaved ? '#ffffff' : '#374151',
    extendedProps: {
      description: event.description,
      city: event.city,
      categories: event.categories,
      isSaved: event.isSaved,
    }
  }))

  return (
    <Card className="p-6">
      {/* Custom Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            <Today className="w-4 h-4 mr-2" />
            Today
          </Button>
        </div>
        
        <h2 className="text-xl font-semibold">
          {formatDate(selectedDate, 'long')}
        </h2>

        <div className="text-sm text-muted-foreground">
          {events.length} events found
        </div>
      </div>

      {/* FullCalendar */}
      <div className="calendar-container">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading events...</p>
            </div>
          </div>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false} // We're using our custom header
            height="auto"
            events={calendarEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            dayMaxEvents={3}
            moreLinkClick="popover"
            eventDisplay="block"
            displayEventTime={false}
            eventClassNames={(arg) => [
              'cursor-pointer',
              'hover:opacity-80',
              'transition-opacity'
            ]}
            dayCellClassNames="hover:bg-muted/50 cursor-pointer transition-colors"
            eventDidMount={(info) => {
              // Add tooltip or additional styling
              info.el.title = info.event.extendedProps.description || info.event.title
            }}
          />
        )}
      </div>
    </Card>
  )
}