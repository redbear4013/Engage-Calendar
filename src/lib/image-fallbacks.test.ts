import { createEventImageGallery } from './image-fallbacks'

describe('createEventImageGallery', () => {
  it('returns only the event image when imageUrl is provided', () => {
    const images = createEventImageGallery(
      ['https://example.com/event.jpg'],
      'Sample Event',
      ['music'],
      'Sample Venue'
    )

    expect(images).toHaveLength(1)
    expect(images[0].id).toBe('event-image')
  })

  it('returns a default image when no event image is available', () => {
    const images = createEventImageGallery(
      [],
      'Sample Event',
      ['music'],
      'Sample Venue'
    )

    expect(images).toHaveLength(1)
    expect(images[0].id).toBe('concert')
  })
})
