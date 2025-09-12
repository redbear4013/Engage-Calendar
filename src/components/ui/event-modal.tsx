'use client'

import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Calendar, MapPin, Clock, ChevronLeft, ChevronRight, ExternalLink, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createEventImageGallery, validateImageUrl } from '@/lib/image-fallbacks'
import type { CalendarEvent } from '@/types'

interface EventModalContextType {
  open: boolean
  setOpen: (open: boolean) => void
  eventData: CalendarEvent | null
  setEventData: (data: CalendarEvent | null) => void
}

const EventModalContext = React.createContext<EventModalContextType | undefined>(undefined)

export const EventModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false)
  const [eventData, setEventData] = useState<CalendarEvent | null>(null)

  return (
    <EventModalContext.Provider value={{ open, setOpen, eventData, setEventData }}>
      {children}
    </EventModalContext.Provider>
  )
}

export const useEventModal = () => {
  const context = React.useContext(EventModalContext)
  if (!context) {
    throw new Error('useEventModal must be used within an EventModalProvider')
  }
  return context
}

export function EventModal({ children }: { children: React.ReactNode }) {
  return <EventModalProvider>{children}</EventModalProvider>
}

export const EventModalTrigger = ({
  children,
  className,
  eventData,
}: {
  children: React.ReactNode
  className?: string
  eventData: CalendarEvent
}) => {
  const { setOpen, setEventData } = useEventModal()
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-md text-black dark:text-white text-center relative overflow-hidden',
        className
      )}
      onClick={() => {
        setEventData(eventData)
        setOpen(true)
      }}
    >
      {children}
    </button>
  )
}

export const EventModalBody = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  const { open } = useEventModal()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
  }, [open])

  const modalRef = useRef(null)
  const { setOpen } = useEventModal()
  useOutsideClick(modalRef, () => setOpen(false))

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
            backdropFilter: 'blur(10px)',
          }}
          exit={{
            opacity: 0,
            backdropFilter: 'blur(0px)',
          }}
          className="fixed [perspective:800px] [transform-style:preserve-3d] inset-0 h-full w-full flex items-center justify-center z-50"
        >
          <Overlay />

          <motion.div
            ref={modalRef}
            className={cn(
              'min-h-[50%] max-h-[90%] w-full max-w-4xl mx-4 bg-background border border-border md:rounded-2xl relative z-50 flex flex-col overflow-hidden shadow-lg',
              className
            )}
            initial={{
              opacity: 0,
              scale: 0.5,
              rotateX: 40,
              y: 40,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              rotateX: 0,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
              rotateX: 10,
            }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 15,
            }}
          >
            <CloseIcon />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const EventModalContent = ({
  className,
}: {
  className?: string
}) => {
  const { eventData } = useEventModal()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  if (!eventData) return null

  // Create intelligent image gallery with category-specific fallbacks
  const validatedImageUrl = validateImageUrl(eventData.imageUrl)
  const images = createEventImageGallery(
    validatedImageUrl,
    eventData.title,
    eventData.categories,
    eventData.venueName
  )

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === images.length - 1 ? 0 : prev + 1
    )
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? images.length - 1 : prev - 1
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD'
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'TBD'
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className={cn('flex flex-col flex-1 max-h-[90vh] overflow-hidden', className)}>
      {/* Image Gallery */}
      <div className="relative h-64 md:h-80 bg-muted flex-shrink-0">
        {images.length > 0 && (
          <>
            <img
              src={images[currentImageIndex].url}
              alt={images[currentImageIndex].alt}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.warn('Image failed to load:', images[currentImageIndex].url)
                // If current image fails and we have a fallback, try to show it
                if (currentImageIndex === 0 && images.length > 1) {
                  setCurrentImageIndex(1)
                } else {
                  // Final fallback to a reliable default
                  e.currentTarget.src = `https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=800&h=400&fit=crop&crop=center&auto=format&q=80`
                }
              }}
            />
            
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground rounded-full p-2 transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground rounded-full p-2 transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                
                {/* Image counter */}
                <div className="absolute bottom-4 right-4 bg-background/80 text-foreground px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Content with scrollable area */}
      <div className="flex-1 overflow-y-auto">
        {/* Thumbnail Navigation */}
        {images.length > 1 && (
          <div className="flex gap-2 p-4 overflow-x-auto border-b border-border">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setCurrentImageIndex(index)}
                className={cn(
                  'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                  index === currentImageIndex
                    ? 'border-primary'
                    : 'border-transparent hover:border-border'
                )}
              >
                <img
                  src={image.url}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Event Details */}
        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                {eventData.title}
              </h2>
              {eventData.isSaved && (
                <Badge variant="secondary" className="ml-4">
                  Saved
                </Badge>
              )}
            </div>
            
            {/* Categories */}
            {eventData.categories && eventData.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {eventData.categories.map((category, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {category.replace('_', ' ').toLowerCase()}
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-muted-foreground leading-relaxed">
              {eventData.description || eventData.longDescription || 'No description available.'}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Venue</p>
                <p className="font-medium text-foreground">
                  {eventData.venueName || 'Venue TBD'}
                </p>
                {eventData.city && (
                  <p className="text-sm text-muted-foreground">
                    {eventData.city}{eventData.country && `, ${eventData.country}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium text-foreground">{formatDate(eventData.startTime)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="font-medium text-foreground">
                  {formatTime(eventData.startTime)}
                  {eventData.endTime && ` - ${formatTime(eventData.endTime)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {(eventData.organizerName || eventData.tags?.length) && (
            <div className="space-y-3 pt-4 border-t border-border">
              {eventData.organizerName && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Organizer</p>
                  <p className="font-medium text-foreground">{eventData.organizerName}</p>
                </div>
              )}
              
              {eventData.tags && eventData.tags.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {eventData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const EventModalFooter = ({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) => {
  const { setOpen, eventData } = useEventModal()

  return (
    <div
      className={cn(
        'flex justify-between items-center gap-3 p-6 bg-muted/30 border-t border-border flex-shrink-0',
        className
      )}
    >
      <div className="flex gap-2">
        {eventData?.externalUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(eventData.externalUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Details
          </Button>
        )}
      </div>
      
      {children || (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
          <Button variant="default">
            {eventData?.isSaved ? 'Manage Event' : 'Save Event'}
          </Button>
        </div>
      )}
    </div>
  )
}

const Overlay = ({ className }: { className?: string }) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
        backdropFilter: 'blur(10px)',
      }}
      exit={{
        opacity: 0,
        backdropFilter: 'blur(0px)',
      }}
      className={`fixed inset-0 h-full w-full bg-background/50 z-50 ${className}`}
    />
  )
}

const CloseIcon = () => {
  const { setOpen } = useEventModal()
  return (
    <button
      onClick={() => setOpen(false)}
      className="absolute top-4 right-4 z-10 group bg-background/80 hover:bg-background rounded-full p-2 transition-colors"
      aria-label="Close modal"
    >
      <X className="h-4 w-4 text-foreground group-hover:scale-110 transition-transform" />
    </button>
  )
}

export const useOutsideClick = (
  ref: React.RefObject<HTMLDivElement>,
  callback: Function
) => {
  useEffect(() => {
    const listener = (event: any) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return
      }
      callback(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, callback])
}