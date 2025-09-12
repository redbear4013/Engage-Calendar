import { DateTime } from 'luxon'

const MACAU_TIMEZONE = 'Asia/Macau'

export interface ParsedDateRange {
  start: string | null
  end?: string | null
}

/**
 * Parse Macau date strings and convert to UTC ISO strings
 * Handles various formats common in Macau event listings
 */
export function parseMacauDate(text: string): ParsedDateRange {
  if (!text?.trim()) {
    return { start: null }
  }

  // Clean the text - remove extra whitespace and common prefixes
  const cleanText = text
    .replace(/^\s*(date|time|when):\s*/i, '')
    .replace(/\s*\([^)]*\)/g, '') // Remove day-of-week in parentheses like "(Saturday)"
    .trim()

  console.log(`🗓️  Parsing Macau date: "${cleanText}"`)

  try {
    // MGTO Special Case 1: Handle "Sep 5-28" format (abbreviated month + day range)
    const mgtoRangeMatch = cleanText.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})-(\d{1,2})$/i)
    if (mgtoRangeMatch) {
      const [, month, startDay, endDay] = mgtoRangeMatch
      const currentYear = DateTime.now().year
      const nextYear = currentYear + 1
      
      // Try current year first, then next year if date is too far in the past
      let startDate = DateTime.fromFormat(`${month} ${startDay} ${currentYear}`, 'MMM d yyyy', { zone: MACAU_TIMEZONE })
      let endDate = DateTime.fromFormat(`${month} ${endDay} ${currentYear}`, 'MMM d yyyy', { zone: MACAU_TIMEZONE })
      
      // If start date is more than 60 days in the past, use next year
      if (startDate.isValid && startDate < DateTime.now().minus({ days: 60 })) {
        startDate = DateTime.fromFormat(`${month} ${startDay} ${nextYear}`, 'MMM d yyyy', { zone: MACAU_TIMEZONE })
        endDate = DateTime.fromFormat(`${month} ${endDay} ${nextYear}`, 'MMM d yyyy', { zone: MACAU_TIMEZONE })
      }
      
      if (startDate.isValid && endDate.isValid) {
        console.log(`✅ MGTO range parsed: ${startDate.toISODate()} to ${endDate.toISODate()}`)
        return {
          start: startDate.toUTC().toISO(),
          end: endDate.plus({ days: 1 }).toUTC().toISO() // End of day
        }
      }
    }

    // MGTO Special Case 2: Handle complex multi-date format "Sep 6, 13, 20, Oct 1 & 6"
    const mgtoMultiDateMatch = cleanText.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+([\d\s,&]+)(?:\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+([\d\s,&]+))?/i)
    if (mgtoMultiDateMatch) {
      const [, firstMonth, firstDays, secondMonth, secondDays] = mgtoMultiDateMatch
      const currentYear = DateTime.now().year
      const nextYear = currentYear + 1
      
      // Extract all day numbers from both months
      const allDays: Array<{month: string, day: number}> = []
      
      // Parse first month days (e.g., "6, 13, 20" from "Sep")
      const firstDayNumbers = firstDays.match(/\d+/g)?.map(d => parseInt(d)) || []
      firstDayNumbers.forEach(day => {
        allDays.push({ month: firstMonth, day })
      })
      
      // Parse second month days if present (e.g., "1 & 6" from "Oct")
      if (secondMonth && secondDays) {
        const secondDayNumbers = secondDays.match(/\d+/g)?.map(d => parseInt(d)) || []
        secondDayNumbers.forEach(day => {
          allDays.push({ month: secondMonth, day })
        })
      }
      
      if (allDays.length > 0) {
        // Use the first date as start, last date as end
        const sortedDates = allDays
          .map(({month, day}) => {
            // Try current year first
            let date = DateTime.fromFormat(`${month} ${day} ${currentYear}`, 'MMM d yyyy', { zone: MACAU_TIMEZONE })
            
            // If date is more than 60 days in the past, use next year
            if (date.isValid && date < DateTime.now().minus({ days: 60 })) {
              date = DateTime.fromFormat(`${month} ${day} ${nextYear}`, 'MMM d yyyy', { zone: MACAU_TIMEZONE })
            }
            
            return date
          })
          .filter(date => date.isValid)
          .sort((a, b) => a.toMillis() - b.toMillis())
        
        if (sortedDates.length > 0) {
          const startDate = sortedDates[0]
          const endDate = sortedDates[sortedDates.length - 1]
          
          console.log(`✅ MGTO multi-date parsed: ${sortedDates.length} dates from ${startDate.toISODate()} to ${endDate.toISODate()}`)
          return {
            start: startDate.toUTC().toISO(),
            end: endDate.plus({ days: 1 }).toUTC().toISO() // End of day
          }
        }
      }
    }
    // Handle date ranges like "27–28 September 2025" or "27-28 September 2025"
    const rangeMatch = cleanText.match(/(\d{1,2})[–-](\d{1,2})\s+(\w+)\s+(\d{4})/i)
    if (rangeMatch) {
      const [, startDay, endDay, month, year] = rangeMatch
      const startDate = DateTime.fromFormat(`${startDay} ${month} ${year}`, 'd MMMM yyyy', { zone: MACAU_TIMEZONE })
      const endDate = DateTime.fromFormat(`${endDay} ${month} ${year}`, 'd MMMM yyyy', { zone: MACAU_TIMEZONE })
      
      if (startDate.isValid && endDate.isValid) {
        return {
          start: startDate.toUTC().toISO(),
          end: endDate.plus({ days: 1 }).toUTC().toISO() // End of day
        }
      }
    }

    // Handle single dates like "15 March 2025" or "March 15, 2025"
    let singleDate: DateTime | null = null

    // Try format: "15 March 2025"
    const dmyMatch = cleanText.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i)
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch
      singleDate = DateTime.fromFormat(`${day} ${month} ${year}`, 'd MMMM yyyy', { zone: MACAU_TIMEZONE })
    }

    // Try format: "March 15, 2025"
    if (!singleDate?.isValid) {
      const mdyMatch = cleanText.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i)
      if (mdyMatch) {
        const [, month, day, year] = mdyMatch
        singleDate = DateTime.fromFormat(`${month} ${day} ${year}`, 'MMMM d yyyy', { zone: MACAU_TIMEZONE })
      }
    }

    // Try format without year: "15 March" or "March 15" or short format "Mar 1", "Apr 4"
    if (!singleDate?.isValid) {
      const dmMatch = cleanText.match(/(\d{1,2})\s+(\w+)(?!\s+\d{4})/i)
      if (dmMatch) {
        const [, day, month] = dmMatch
        const currentYear = DateTime.now().year
        
        // Try both full month name and short month name formats
        singleDate = DateTime.fromFormat(`${day} ${month} ${currentYear}`, 'd MMMM yyyy', { zone: MACAU_TIMEZONE })
        
        if (!singleDate.isValid) {
          // Try short month format like "Mar", "Apr"
          singleDate = DateTime.fromFormat(`${day} ${month} ${currentYear}`, 'd MMM yyyy', { zone: MACAU_TIMEZONE })
        }
        
        // If the date would be more than 30 days in the past, assume it's next year
        if (singleDate.isValid && singleDate < DateTime.now().minus({ days: 30 })) {
          singleDate = DateTime.fromFormat(`${day} ${month} ${currentYear + 1}`, 'd MMM yyyy', { zone: MACAU_TIMEZONE })
          
          // If short format failed, try full format for next year
          if (!singleDate.isValid) {
            singleDate = DateTime.fromFormat(`${day} ${month} ${currentYear + 1}`, 'd MMMM yyyy', { zone: MACAU_TIMEZONE })
          }
        }
      }
    }

    // Try format: "March 15" or "Mar 15" without year  
    if (!singleDate?.isValid) {
      const mdMatch = cleanText.match(/(\w+)\s+(\d{1,2})(?!,?\s+\d{4})/i)
      if (mdMatch) {
        const [, month, day] = mdMatch
        const currentYear = DateTime.now().year
        
        // Try full month name first
        singleDate = DateTime.fromFormat(`${month} ${day} ${currentYear}`, 'MMMM d yyyy', { zone: MACAU_TIMEZONE })
        
        if (!singleDate.isValid) {
          // Try short month format like "Mar", "Apr"
          singleDate = DateTime.fromFormat(`${month} ${day} ${currentYear}`, 'MMM d yyyy', { zone: MACAU_TIMEZONE })
        }
        
        // If the date would be more than 30 days in the past, assume it's next year
        if (singleDate.isValid && singleDate < DateTime.now().minus({ days: 30 })) {
          singleDate = DateTime.fromFormat(`${month} ${day} ${currentYear + 1}`, 'MMM d yyyy', { zone: MACAU_TIMEZONE })
          
          // If short format failed, try full format for next year
          if (!singleDate.isValid) {
            singleDate = DateTime.fromFormat(`${month} ${day} ${currentYear + 1}`, 'MMMM d yyyy', { zone: MACAU_TIMEZONE })
          }
        }
      }
    }

    // Try format: "2025-03-15" or "15/03/2025"
    if (!singleDate?.isValid) {
      const isoMatch = cleanText.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
      if (isoMatch) {
        singleDate = DateTime.fromISO(isoMatch[0], { zone: MACAU_TIMEZONE })
      } else {
        const ddmmyyyy = cleanText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
        if (ddmmyyyy) {
          const [, day, month, year] = ddmmyyyy
          singleDate = DateTime.fromFormat(`${day}/${month}/${year}`, 'd/M/yyyy', { zone: MACAU_TIMEZONE })
        }
      }
    }

    // Try to parse with time if present
    const timeMatch = cleanText.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i)
    if (singleDate?.isValid && timeMatch) {
      const [, hours, minutes, ampm] = timeMatch
      let hour24 = parseInt(hours)
      
      if (ampm?.toLowerCase() === 'pm' && hour24 !== 12) {
        hour24 += 12
      } else if (ampm?.toLowerCase() === 'am' && hour24 === 12) {
        hour24 = 0
      }
      
      singleDate = singleDate.set({ hour: hour24, minute: parseInt(minutes) })
    }

    if (singleDate?.isValid) {
      return {
        start: singleDate.toUTC().toISO(),
        end: singleDate.plus({ hours: 2 }).toUTC().toISO() // Default 2-hour duration
      }
    }

    // Fallback: try relative dates like "Today", "Tomorrow"
    const today = DateTime.now().setZone(MACAU_TIMEZONE).startOf('day')
    const lowerText = cleanText.toLowerCase()
    
    if (lowerText.includes('today')) {
      return {
        start: today.toUTC().toISO(),
        end: today.plus({ hours: 2 }).toUTC().toISO()
      }
    }
    
    if (lowerText.includes('tomorrow')) {
      const tomorrow = today.plus({ days: 1 })
      return {
        start: tomorrow.toUTC().toISO(),
        end: tomorrow.plus({ hours: 2 }).toUTC().toISO()
      }
    }

    // If we can't parse anything, return null
    return { start: null }

  } catch (error) {
    console.warn('Failed to parse Macau date:', cleanText, error)
    return { start: null }
  }
}

/**
 * Get current time in Macau timezone as UTC ISO string
 */
export function getMacauNow(): string {
  return DateTime.now().setZone(MACAU_TIMEZONE).toUTC().toISO()!
}

/**
 * Convert UTC ISO string to Macau timezone display format
 */
export function formatMacauDateTime(utcIsoString: string): string {
  const dt = DateTime.fromISO(utcIsoString, { zone: 'utc' }).setZone(MACAU_TIMEZONE)
  return dt.toFormat('d MMMM yyyy, HH:mm \'MYT\'')
}

/**
 * Create a stable hash-based source ID for events
 */
export function createSourceId(title: string, startDate: string | null, venue: string = '', hostDomain: string): string {
  const normalizedTitle = title.toLowerCase().replace(/[^\w\s]/g, '').trim()
  const hashInput = `${normalizedTitle}-${startDate || 'no-date'}-${venue.toLowerCase()}-${hostDomain}`
  
  // Simple hash function (for production, consider using crypto.subtle or a proper hashing library)
  let hash = 0
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return `${hostDomain}-${Math.abs(hash).toString(36)}`
}