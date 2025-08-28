import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'time' = 'short') {
  const d = new Date(date)
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    case 'long':
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    case 'time':
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    default:
      return d.toLocaleDateString()
  }
}

export function formatDateRange(start: string | Date, end?: string | Date) {
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : null
  
  if (!endDate) {
    return formatDate(startDate, 'long')
  }
  
  const isSameDay = startDate.toDateString() === endDate.toDateString()
  
  if (isSameDay) {
    return `${formatDate(startDate, 'long')} • ${formatDate(startDate, 'time')} - ${formatDate(endDate, 'time')}`
  }
  
  return `${formatDate(startDate, 'short')} - ${formatDate(endDate, 'short')}`
}