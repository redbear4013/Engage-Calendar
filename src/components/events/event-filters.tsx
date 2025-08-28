'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Search, X, MapPin, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const eventCategories = [
  { id: 'local_events', name: 'Local Events' },
  { id: 'music', name: 'Music' },
  { id: 'arts_culture', name: 'Arts & Culture' },
  { id: 'food_drink', name: 'Food & Drink' },
  { id: 'sports', name: 'Sports' },
  { id: 'outdoors', name: 'Outdoors' },
  { id: 'nightlife', name: 'Nightlife' },
  { id: 'community', name: 'Community' },
  { id: 'business', name: 'Business' },
  { id: 'family', name: 'Family' },
]

interface EventFiltersProps {
  onFiltersChange?: (filters: any) => void
}

export function EventFilters({ onFiltersChange }: EventFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [cityFilter, setCityFilter] = useState('')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => {
      const updated = prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
      
      // Call callback if provided
      onFiltersChange?.({
        searchQuery,
        categories: updated,
        city: cityFilter,
        dateRange: dateRange.start && dateRange.end ? dateRange : undefined
      })
      
      return updated
    })
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onFiltersChange?.({
      searchQuery: value,
      categories: selectedCategories,
      city: cityFilter,
      dateRange: dateRange.start && dateRange.end ? dateRange : undefined
    })
  }

  const handleCityChange = (value: string) => {
    setCityFilter(value)
    onFiltersChange?.({
      searchQuery,
      categories: selectedCategories,
      city: value,
      dateRange: dateRange.start && dateRange.end ? dateRange : undefined
    })
  }

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const updated = { ...dateRange, [field]: value }
    setDateRange(updated)
    
    onFiltersChange?.({
      searchQuery,
      categories: selectedCategories,
      city: cityFilter,
      dateRange: updated.start && updated.end ? updated : undefined
    })
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedCategories([])
    setCityFilter('')
    setDateRange({ start: '', end: '' })
    onFiltersChange?.({
      searchQuery: '',
      categories: [],
      city: '',
      dateRange: undefined
    })
  }

  const activeFiltersCount = [
    searchQuery,
    ...selectedCategories,
    cityFilter,
    dateRange.start && dateRange.end ? 'dateRange' : ''
  ].filter(Boolean).length

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Location & Date Filters */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="City"
            value={cityFilter}
            onChange={(e) => handleCityChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            placeholder="Start date"
            value={dateRange.start}
            onChange={(e) => handleDateRangeChange('start', e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            placeholder="End date"
            value={dateRange.end}
            onChange={(e) => handleDateRangeChange('end', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Categories */}
      <div>
        <h3 className="text-sm font-medium mb-3">Categories</h3>
        <div className="flex flex-wrap gap-2">
          {eventCategories.map((category) => (
            <Badge
              key={category.id}
              variant={selectedCategories.includes(category.id) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => handleCategoryToggle(category.id)}
            >
              {category.name}
              {selectedCategories.includes(category.id) && (
                <X className="w-3 h-3 ml-1" />
              )}
            </Badge>
          ))}
        </div>
      </div>

      {/* Active Filters & Clear */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} applied
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  )
}