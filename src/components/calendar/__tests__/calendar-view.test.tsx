import { render, screen } from '@testing-library/react'
import { CalendarView } from '../calendar-view'

// Mock FullCalendar and related plugins to avoid heavy DOM dependencies
jest.mock('@fullcalendar/react', () => {
  return function MockFullCalendar() {
    return <div data-testid="fullcalendar" />
  }
})
jest.mock('@fullcalendar/daygrid', () => ({}))
jest.mock('@fullcalendar/timegrid', () => ({}))
jest.mock('@fullcalendar/interaction', () => ({}))

// Mock useEvents to provide controlled event data
jest.mock('../../../hooks/use-events', () => {
  const events = [
    {
      id: '1',
      title: 'May Event',
      startTime: '2024-05-10T00:00:00Z',
      endTime: '2024-05-10T01:00:00Z',
      description: '',
      city: '',
      categories: [],
      isSaved: false,
    },
    {
      id: '2',
      title: 'June Event',
      startTime: '2024-06-05T00:00:00Z',
      endTime: '2024-06-05T01:00:00Z',
      description: '',
      city: '',
      categories: [],
      isSaved: false,
    },
  ]
  return {
    useEvents: () => ({ data: events, isLoading: false })
  }
})

describe('CalendarView', () => {
  it('shows count of events only for the selected month', () => {
    render(<CalendarView selectedDate={new Date('2024-05-01')} onDateSelect={() => {}} />)
    expect(screen.getByText('1 events found')).toBeInTheDocument()
  })
})
