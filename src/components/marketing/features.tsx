import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Bell, 
  Filter, 
  Heart, 
  MapPin, 
  Clock,
  Users,
  Smartphone 
} from 'lucide-react'

const features = [
  {
    icon: Calendar,
    title: 'Smart Calendar Views',
    description: 'Month, week, and day views with intelligent event suggestions integrated seamlessly.',
    badge: 'Core'
  },
  {
    icon: Bell,
    title: 'Event Notifications',
    description: 'Get notified about upcoming events and new recommendations that match your interests.',
    badge: 'Coming Soon'
  },
  {
    icon: Filter,
    title: 'Advanced Filtering',
    description: 'Filter events by category, location, price, and time to find exactly what you\'re looking for.',
    badge: 'Core'
  },
  {
    icon: Heart,
    title: 'Save Favorites',
    description: 'Save events to your personal calendar and build your perfect weekend itinerary.',
    badge: 'Core'
  },
  {
    icon: MapPin,
    title: 'Location-Based',
    description: 'Discover events and activities based on your location with distance and travel time.',
    badge: 'Core'
  },
  {
    icon: Clock,
    title: 'Time Management',
    description: 'Smart scheduling that helps you avoid conflicts and maximize your weekend.',
    badge: 'Coming Soon'
  },
  {
    icon: Users,
    title: 'Social Features',
    description: 'Share events with friends and see what others in your area are planning.',
    badge: 'Future'
  },
  {
    icon: Smartphone,
    title: 'Mobile Optimized',
    description: 'Beautiful, responsive design that works perfectly on all your devices.',
    badge: 'Core'
  }
]

export function Features() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Everything You Need for Perfect Weekends
          </h2>
          <p className="text-xl text-muted-foreground">
            Powerful features designed to help you discover, plan, and enjoy amazing weekend experiences.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <Badge 
                    variant={
                      feature.badge === 'Core' ? 'default' : 
                      feature.badge === 'Coming Soon' ? 'secondary' : 
                      'outline'
                    }
                    className="text-xs"
                  >
                    {feature.badge}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}