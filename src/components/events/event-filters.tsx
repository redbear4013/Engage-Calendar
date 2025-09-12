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
  { id: 'concert', name: 'Concerts' },
  { id: 'show', name: 'Shows' },
  { id: 'arts_culture', name: 'Arts & Culture' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'food_drink', name: 'Food & Drink' },
  { id: 'dining', name: 'Dining' },
  { id: 'sports', name: 'Sports' },
  { id: 'outdoors', name: 'Outdoors' },
  { id: 'nightlife', name: 'Nightlife' },
  { id: 'community', name: 'Community' },
  { id: 'business', name: 'Business' },
  { id: 'mice', name: 'MICE' },
  { id: 'exhibition', name: 'Exhibitions' },
  { id: 'convention', name: 'Conventions' },
  { id: 'family', name: 'Family' },
  { id: 'cultural', name: 'Cultural' },
  { id: 'festivals', name: 'Festivals' },
]

const macauVenues = [
  { id: 'londoner', name: 'The Londoner Macao' },
  { id: 'venetian', name: 'The Venetian Macao' },
  { id: 'galaxy', name: 'Galaxy Macau' },
  { id: 'mgto', name: 'MGTO Events' },
  { id: 'mice', name: 'MICE Venues' },
]

const cityOptions = [
  'Macau',
  'New York',
  'Los Angeles', 
  'Chicago',
  'Houston',
  'Phoenix'
]

interface EventFiltersProps {
  onFiltersChange?: (filters: any) => void
}

export function EventFilters({ onFiltersChange }: EventFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedVenues, setSelectedVenues] = useState<string[]>([])
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
        venues: selectedVenues,
        city: cityFilter,
        dateRange: dateRange.start && dateRange.end ? dateRange : undefined
      })
      
      return updated
    })
  }

  const handleVenueToggle = (venueId: string) => {
    setSelectedVenues(prev => {
      const updated = prev.includes(venueId)
        ? prev.filter(id => id !== venueId)
        : [...prev, venueId]
      
      // Call callback if provided
      onFiltersChange?.({
        searchQuery,
        categories: selectedCategories,
        venues: updated,
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
      venues: selectedVenues,
      city: cityFilter,
      dateRange: dateRange.start && dateRange.end ? dateRange : undefined
    })
  }

  const handleCityChange = (value: string) => {
    setCityFilter(value)
    onFiltersChange?.({
      searchQuery,
      categories: selectedCategories,
      venues: selectedVenues,
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
      venues: selectedVenues,
      city: cityFilter,
      dateRange: updated.start && updated.end ? updated : undefined
    })
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedCategories([])
    setSelectedVenues([])
    setCityFilter('')
    setDateRange({ start: '', end: '' })
    onFiltersChange?.({
      searchQuery: '',
      categories: [],
      venues: [],
      city: '',
      dateRange: undefined
    })
  }

  const activeFiltersCount = [
    searchQuery,
    ...selectedCategories,
    ...selectedVenues,
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
          <select
            value={cityFilter}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">All Cities</option>
            {cityOptions.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
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

      {/* Macau Venues */}
      <div>
        <h3 className="text-sm font-medium mb-3">Macau Venues</h3>
        <div className="flex flex-wrap gap-2">
          {macauVenues.map((venue) => (
            <Badge
              key={venue.id}
              variant={selectedVenues.includes(venue.id) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => handleVenueToggle(venue.id)}
            >
              {venue.name}
              {selectedVenues.includes(venue.id) && (
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