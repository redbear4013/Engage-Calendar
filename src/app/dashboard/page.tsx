'use client'

import { useState } from 'react'
import { CalendarView } from '@/components/calendar/calendar-view'
import { EventFilters } from '@/components/events/event-filters'
import { EventList } from '@/components/events/event-list'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, List, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

type ViewMode = 'calendar' | 'list'

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Calendar</h1>
          <p className="text-muted-foreground">
            Discover and plan amazing weekend activities
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          
          <div className="border rounded-md p-1 flex">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Events</CardTitle>
          </CardHeader>
          <CardContent>
            <EventFilters />
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid lg:grid-cols-4 gap-6">
        <div className={cn(
          "lg:col-span-3",
          viewMode === 'list' && "lg:col-span-4"
        )}>
          {viewMode === 'calendar' ? (
            <CalendarView 
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          ) : (
            <EventList />
          )}
        </div>
        
        {viewMode === 'calendar' && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                <EventList compact />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}