import { parseMacauDate, createSourceId, getMacauNow, formatMacauDateTime } from '../../../date-macau'

describe('Macau Date Utilities', () => {
  describe('parseMacauDate', () => {
    it('should parse single date in "15 March 2024" format', () => {
      const result = parseMacauDate('15 March 2024')
      expect(result.start).toBeTruthy()
      expect(result.end).toBeTruthy()
      
      const startDate = new Date(result.start!)
      expect(startDate.getUTCDate()).toBe(15)
      expect(startDate.getUTCMonth()).toBe(2) // March is month 2 (0-indexed)
      expect(startDate.getUTCFullYear()).toBe(2024)
    })

    it('should parse date range "27–28 September 2024"', () => {
      const result = parseMacauDate('27–28 September 2024')
      expect(result.start).toBeTruthy()
      expect(result.end).toBeTruthy()
      
      const startDate = new Date(result.start!)
      const endDate = new Date(result.end!)
      expect(startDate.getUTCDate()).toBe(27)
      expect(endDate.getUTCDate()).toBe(29) // End of 28th (next day start)
    })

    it('should parse "March 15, 2024" format', () => {
      const result = parseMacauDate('March 15, 2024')
      expect(result.start).toBeTruthy()
      
      const startDate = new Date(result.start!)
      expect(startDate.getUTCDate()).toBe(15)
      expect(startDate.getUTCMonth()).toBe(2) // March
    })

    it('should handle date with time "15 March 2024, 8:00 PM"', () => {
      const result = parseMacauDate('15 March 2024, 8:00 PM')
      expect(result.start).toBeTruthy()
      
      const startDate = new Date(result.start!)
      expect(startDate.getUTCDate()).toBe(15)
      expect(startDate.getUTCMonth()).toBe(2)
      // Time should be converted from Macau time to UTC
    })

    it('should remove day-of-week in parentheses', () => {
      const result = parseMacauDate('15 March 2024 (Saturday)')
      expect(result.start).toBeTruthy()
      
      const startDate = new Date(result.start!)
      expect(startDate.getUTCDate()).toBe(15)
    })

    it('should handle relative dates', () => {
      const result = parseMacauDate('Today')
      expect(result.start).toBeTruthy()
      
      // Should be within a reasonable time of now
      const startTime = new Date(result.start!).getTime()
      const now = Date.now()
      const diffHours = Math.abs(now - startTime) / (1000 * 60 * 60)
      expect(diffHours).toBeLessThan(24)
    })

    it('should return null for invalid dates', () => {
      const result = parseMacauDate('invalid date string')
      expect(result.start).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = parseMacauDate('')
      expect(result.start).toBeNull()
    })
  })

  describe('createSourceId', () => {
    it('should create stable source IDs', () => {
      const id1 = createSourceId('Test Event', '2024-03-15T10:00:00Z', 'Test Venue', 'example.com')
      const id2 = createSourceId('Test Event', '2024-03-15T10:00:00Z', 'Test Venue', 'example.com')
      expect(id1).toBe(id2)
    })

    it('should create different IDs for different events', () => {
      const id1 = createSourceId('Event 1', '2024-03-15T10:00:00Z', 'Venue A', 'example.com')
      const id2 = createSourceId('Event 2', '2024-03-15T10:00:00Z', 'Venue A', 'example.com')
      expect(id1).not.toBe(id2)
    })

    it('should normalize titles for consistent IDs', () => {
      const id1 = createSourceId('Test Event!!!', '2024-03-15T10:00:00Z', 'Test Venue', 'example.com')
      const id2 = createSourceId('test event', '2024-03-15T10:00:00Z', 'Test Venue', 'example.com')
      expect(id1).toBe(id2)
    })

    it('should include domain in ID', () => {
      const id = createSourceId('Test Event', '2024-03-15T10:00:00Z', 'Test Venue', 'galaxymacau.com')
      expect(id).toContain('galaxymacau.com')
    })
  })

  describe('getMacauNow', () => {
    it('should return current time in UTC ISO format', () => {
      const now = getMacauNow()
      expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      
      // Should be within 1 second of actual now
      const parsedTime = new Date(now).getTime()
      const actualNow = Date.now()
      expect(Math.abs(parsedTime - actualNow)).toBeLessThan(1000)
    })
  })

  describe('formatMacauDateTime', () => {
    it('should format UTC time to Macau display format', () => {
      const utcTime = '2024-03-15T10:00:00.000Z'
      const formatted = formatMacauDateTime(utcTime)
      
      // Should contain date, time, and MYT timezone
      expect(formatted).toMatch(/\d{1,2} \w+ \d{4}, \d{2}:\d{2} MYT/)
      expect(formatted).toContain('March')
      expect(formatted).toContain('2024')
      expect(formatted).toContain('MYT')
    })
  })
})