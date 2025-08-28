# Weekend Planner App - Frontend Architecture

## Overview

The Weekend Planner App frontend follows a cross-platform architecture with shared business logic and platform-specific UI implementations. The design emphasizes component reusability, performance optimization, and excellent user experience across mobile and web platforms.

### Platform Strategy
- **Mobile**: React Native (iOS/Android) - Primary platform
- **Web**: React.js Progressive Web App - Secondary platform
- **Shared Logic**: Common state management, API clients, and business logic
- **UI Consistency**: Shared design system with platform-specific adaptations

## Technology Stack

### Core Framework
- **Mobile**: React Native 0.72+
- **Web**: React.js 18+ with Next.js 13+
- **TypeScript**: Full TypeScript implementation
- **State Management**: Redux Toolkit + RTK Query
- **Navigation**: React Navigation 6 (Mobile) / Next.js Router (Web)

### UI Framework & Styling
- **Component Library**: React Native Elements (Mobile) / Material-UI v5 (Web)
- **Icons**: React Native Vector Icons / Material Icons
- **Styling**: Styled Components + Theme Provider
- **Animation**: React Native Reanimated / Framer Motion

### Development Tools
- **Bundler**: Metro (Mobile) / Next.js (Web)
- **Testing**: Jest + React Native Testing Library / React Testing Library
- **Code Quality**: ESLint + Prettier + TypeScript
- **Development**: Flipper (Mobile) / React DevTools (Web)

## Component Architecture

### Directory Structure
```
src/
├── components/           # Shared UI components
│   ├── atoms/           # Basic building blocks
│   ├── molecules/       # Composite components
│   ├── organisms/       # Complex components
│   └── templates/       # Page layouts
├── screens/             # Screen components
│   ├── auth/           # Authentication screens
│   ├── calendar/       # Calendar screens
│   ├── events/         # Event-related screens
│   ├── profile/        # User profile screens
│   └── onboarding/     # Onboarding flow
├── navigation/          # Navigation configuration
├── services/           # API services and utilities
├── store/              # Redux store configuration
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── constants/          # App constants
├── theme/              # Theme and styling
└── assets/             # Static assets
```

## Atomic Design System

### Atoms (Basic Building Blocks)

#### Button Component
```typescript
// components/atoms/Button/Button.tsx
import React from 'react';
import { ButtonProps } from './Button.types';

export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'text';
  size: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  onPress: () => void;
  testID?: string;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  onPress,
  testID,
  children
}) => {
  // Implementation with platform-specific styling
};
```

#### Text Input Component
```typescript
// components/atoms/TextInput/TextInput.tsx
export interface TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  testID?: string;
}
```

#### Typography Component
```typescript
// components/atoms/Typography/Typography.tsx
export interface TypographyProps {
  variant: 'h1' | 'h2' | 'h3' | 'h4' | 'body1' | 'body2' | 'caption' | 'overline';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'text';
  align?: 'left' | 'center' | 'right';
  weight?: 'light' | 'regular' | 'medium' | 'bold';
  numberOfLines?: number;
  testID?: string;
  children: React.ReactNode;
}
```

### Molecules (Composite Components)

#### Event Card Component
```typescript
// components/molecules/EventCard/EventCard.tsx
export interface EventCardProps {
  event: Event;
  variant: 'suggested' | 'confirmed' | 'compact';
  onPress: (event: Event) => void;
  onConfirm?: (event: Event) => void;
  onNotInterested?: (event: Event) => void;
  showDistance?: boolean;
  showPrice?: boolean;
  testID?: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  variant,
  onPress,
  onConfirm,
  onNotInterested,
  showDistance = true,
  showPrice = true,
  testID
}) => {
  return (
    <Card testID={testID}>
      <CardImage source={{ uri: event.coverImage }} />
      <CardContent>
        <Typography variant="h4" numberOfLines={2}>
          {event.title}
        </Typography>
        <Typography variant="body2" color="secondary" numberOfLines={3}>
          {event.description}
        </Typography>
        
        <EventMeta>
          <MetaItem icon="calendar" text={formatDate(event.startTime)} />
          <MetaItem icon="location" text={`${event.location.name} • ${event.location.distanceMiles}mi`} />
          {event.price > 0 && (
            <MetaItem icon="dollar" text={formatPrice(event.price)} />
          )}
        </EventMeta>
        
        <CardActions variant={variant}>
          {variant === 'suggested' && (
            <>
              <Button variant="primary" onPress={() => onConfirm?.(event)}>
                Confirm
              </Button>
              <Button variant="text" onPress={() => onNotInterested?.(event)}>
                Not Interested
              </Button>
            </>
          )}
        </CardActions>
      </CardContent>
    </Card>
  );
};
```

#### Filter Chips Component
```typescript
// components/molecules/FilterChips/FilterChips.tsx
export interface FilterChipsProps {
  categories: Category[];
  selectedCategories: string[];
  onCategoryToggle: (categoryId: string) => void;
  maxVisible?: number;
  testID?: string;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  categories,
  selectedCategories,
  onCategoryToggle,
  maxVisible = 5,
  testID
}) => {
  // Horizontal scrollable filter chips implementation
};
```

#### Date Picker Component
```typescript
// components/molecules/DatePicker/DatePicker.tsx
export interface DatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  mode: 'single' | 'range';
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  testID?: string;
}
```

### Organisms (Complex Components)

#### Calendar Grid Component
```typescript
// components/organisms/CalendarGrid/CalendarGrid.tsx
export interface CalendarGridProps {
  view: 'month' | 'week' | 'day';
  events: CalendarEvent[];
  suggestions: Event[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onEventPress: (event: CalendarEvent) => void;
  onSuggestionPress: (suggestion: Event) => void;
  onConfirmSuggestion: (suggestion: Event) => void;
  conflicts: EventConflict[];
  loading?: boolean;
  testID?: string;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  view,
  events,
  suggestions,
  selectedDate,
  onDateSelect,
  onEventPress,
  onSuggestionPress,
  onConfirmSuggestion,
  conflicts,
  loading = false,
  testID
}) => {
  // Render different calendar views based on 'view' prop
  const renderCalendarView = () => {
    switch (view) {
      case 'month':
        return <MonthView {...props} />;
      case 'week':
        return <WeekView {...props} />;
      case 'day':
        return <DayView {...props} />;
      default:
        return <MonthView {...props} />;
    }
  };

  return (
    <CalendarContainer testID={testID}>
      <CalendarHeader>
        <ViewToggle currentView={view} onViewChange={onViewChange} />
        <DateNavigation selectedDate={selectedDate} onDateSelect={onDateSelect} />
      </CalendarHeader>
      {loading ? <LoadingSpinner /> : renderCalendarView()}
      {conflicts.length > 0 && (
        <ConflictAlert conflicts={conflicts} />
      )}
    </CalendarContainer>
  );
};
```

#### Recommendation Engine Component
```typescript
// components/organisms/RecommendationEngine/RecommendationEngine.tsx
export interface RecommendationEngineProps {
  recommendations: DailyRecommendations;
  onEventPress: (event: Event) => void;
  onConfirm: (event: Event) => void;
  onNotInterested: (event: Event) => void;
  onRefresh: () => void;
  onShowAlternatives: (category: string) => void;
  loading?: boolean;
  testID?: string;
}

export const RecommendationEngine: React.FC<RecommendationEngineProps> = ({
  recommendations,
  onEventPress,
  onConfirm,
  onNotInterested,
  onRefresh,
  onShowAlternatives,
  loading = false,
  testID
}) => {
  return (
    <RecommendationContainer testID={testID}>
      <SectionHeader>
        <Typography variant="h3">Today's Suggestions</Typography>
        <RefreshButton onPress={onRefresh} loading={loading} />
      </SectionHeader>
      
      {Object.entries(recommendations.suggestions).map(([category, events]) => (
        <CategorySection key={category}>
          <CategoryHeader>
            <CategoryTitle>{getCategoryDisplayName(category)}</CategoryTitle>
            <AlternativesButton 
              onPress={() => onShowAlternatives(category)}
              testID={`alternatives-${category}`}
            />
          </CategoryHeader>
          <EventsList
            data={events}
            renderItem={({ item }) => (
              <EventCard
                event={item}
                variant="suggested"
                onPress={onEventPress}
                onConfirm={onConfirm}
                onNotInterested={onNotInterested}
              />
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </CategorySection>
      ))}
    </RecommendationContainer>
  );
};
```

#### Event Search Component
```typescript
// components/organisms/EventSearch/EventSearch.tsx
export interface EventSearchProps {
  query: string;
  filters: SearchFilters;
  results: Event[];
  onQueryChange: (query: string) => void;
  onFiltersChange: (filters: SearchFilters) => void;
  onEventPress: (event: Event) => void;
  onLoadMore: () => void;
  loading?: boolean;
  hasMore?: boolean;
  testID?: string;
}
```

## Screen Components

### Authentication Screens

#### Login Screen
```typescript
// screens/auth/LoginScreen/LoginScreen.tsx
export const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { login, loginWithGoogle } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<AuthErrors>({});
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await login(formData);
      navigation.navigate('Main');
    } catch (error) {
      setErrors(error.validationErrors || {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContainer>
      <Logo />
      <AuthForm>
        <TextInput
          value={formData.email}
          onChangeText={(email) => setFormData({ ...formData, email })}
          placeholder="Email"
          keyboardType="email-address"
          error={errors.email}
          testID="login-email-input"
        />
        <TextInput
          value={formData.password}
          onChangeText={(password) => setFormData({ ...formData, password })}
          placeholder="Password"
          secureTextEntry
          error={errors.password}
          testID="login-password-input"
        />
        <Button
          variant="primary"
          onPress={handleLogin}
          loading={loading}
          testID="login-submit-button"
        >
          Sign In
        </Button>
        <Divider />
        <Button
          variant="outline"
          icon="google"
          onPress={loginWithGoogle}
          testID="login-google-button"
        >
          Continue with Google
        </Button>
      </AuthForm>
      <AuthFooter>
        <Typography variant="body2">
          Don't have an account?{' '}
          <Link onPress={() => navigation.navigate('Register')}>
            Sign up
          </Link>
        </Typography>
      </AuthFooter>
    </AuthContainer>
  );
};
```

#### Onboarding Screens
```typescript
// screens/onboarding/InterestsScreen/InterestsScreen.tsx
export const InterestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const { interests, loading } = useInterests();

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleContinue = async () => {
    await saveUserPreferences({ interests: selectedInterests });
    navigation.navigate('LocationSetup');
  };

  return (
    <OnboardingContainer>
      <ProgressIndicator currentStep={2} totalSteps={4} />
      <OnboardingHeader>
        <Typography variant="h2">What interests you?</Typography>
        <Typography variant="body1" color="secondary">
          Select activities you'd like to see recommendations for
        </Typography>
      </OnboardingHeader>
      
      <InterestGrid>
        {interests.map(interest => (
          <InterestCard
            key={interest.id}
            interest={interest}
            selected={selectedInterests.includes(interest.id)}
            onToggle={() => toggleInterest(interest.id)}
          />
        ))}
      </InterestGrid>
      
      <OnboardingFooter>
        <Button
          variant="primary"
          onPress={handleContinue}
          disabled={selectedInterests.length === 0}
        >
          Continue
        </Button>
      </OnboardingFooter>
    </OnboardingContainer>
  );
};
```

### Main Application Screens

#### Calendar Screen
```typescript
// screens/calendar/CalendarScreen/CalendarScreen.tsx
export const CalendarScreen: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  
  const { data: calendarData, loading } = useCalendarQuery({
    startDate: getCalendarStartDate(selectedDate, calendarView),
    endDate: getCalendarEndDate(selectedDate, calendarView),
    view: calendarView
  });

  const { mutate: confirmEvent } = useConfirmEventMutation();
  const { mutate: removeEvent } = useRemoveEventMutation();

  const handleEventPress = (event: CalendarEvent) => {
    navigation.navigate('EventDetails', { eventId: event.id });
  };

  const handleConfirmSuggestion = async (event: Event) => {
    try {
      await confirmEvent({ eventId: event.id });
      showSuccessToast('Event added to your calendar');
    } catch (error) {
      showErrorToast('Failed to add event');
    }
  };

  return (
    <ScreenContainer>
      <CalendarHeader>
        <HeaderTitle>Calendar</HeaderTitle>
        <HeaderActions>
          <IconButton 
            icon="filter" 
            onPress={() => setFilterModalVisible(true)} 
          />
          <IconButton 
            icon="search" 
            onPress={() => navigation.navigate('EventSearch')} 
          />
        </HeaderActions>
      </CalendarHeader>
      
      <CalendarGrid
        view={calendarView}
        events={calendarData?.events || []}
        suggestions={calendarData?.suggestions || []}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        onEventPress={handleEventPress}
        onConfirmSuggestion={handleConfirmSuggestion}
        conflicts={calendarData?.conflicts || []}
        loading={loading}
        testID="calendar-grid"
      />
      
      <FloatingActionButton
        icon="plus"
        onPress={() => navigation.navigate('AddEvent')}
        testID="add-event-fab"
      />
    </ScreenContainer>
  );
};
```

#### Recommendations Screen
```typescript
// screens/recommendations/RecommendationsScreen/RecommendationsScreen.tsx
export const RecommendationsScreen: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const { 
    data: recommendations, 
    loading, 
    refetch 
  } = useDailyRecommendationsQuery({
    date: selectedDate.toISOString().split('T')[0]
  });

  const { mutate: submitFeedback } = useRecommendationFeedbackMutation();
  const { mutate: confirmEvent } = useConfirmEventMutation();

  const handleNotInterested = async (event: Event) => {
    await submitFeedback({
      eventId: event.id,
      feedbackType: 'not_interested',
      reasons: ['not_relevant'] // Could open modal for specific reasons
    });
  };

  const handleConfirm = async (event: Event) => {
    try {
      await confirmEvent({ eventId: event.id });
      showSuccessToast('Event added to your calendar');
    } catch (error) {
      showErrorToast('Failed to add event');
    }
  };

  return (
    <ScreenContainer>
      <RecommendationHeader>
        <DateSelector
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
        <RefreshButton onPress={() => refetch()} loading={loading} />
      </RecommendationHeader>
      
      {recommendations && (
        <RecommendationEngine
          recommendations={recommendations}
          onEventPress={(event) => navigation.navigate('EventDetails', { eventId: event.id })}
          onConfirm={handleConfirm}
          onNotInterested={handleNotInterested}
          onRefresh={refetch}
          onShowAlternatives={(category) => 
            navigation.navigate('Alternatives', { category, date: selectedDate })
          }
          loading={loading}
          testID="recommendation-engine"
        />
      )}
    </ScreenContainer>
  );
};
```

## State Management Architecture

### Redux Store Structure
```typescript
// store/index.ts
export interface RootState {
  auth: AuthState;
  calendar: CalendarState;
  events: EventsState;
  recommendations: RecommendationsState;
  user: UserState;
  ui: UIState;
  api: ApiState; // RTK Query state
}

// store/slices/authSlice.ts
interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// store/slices/calendarSlice.ts
interface CalendarState {
  selectedDate: string;
  calendarView: 'month' | 'week' | 'day';
  events: { [date: string]: CalendarEvent[] };
  suggestions: { [date: string]: Event[] };
  conflicts: EventConflict[];
  filters: CalendarFilters;
}
```

### API Service Layer
```typescript
// services/api.ts
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.tokens?.accessToken;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Event', 'Calendar', 'Recommendation'],
  endpoints: (builder) => ({
    // Calendar endpoints
    getCalendar: builder.query<CalendarData, CalendarParams>({
      query: (params) => ({
        url: '/calendar',
        params,
      }),
      providesTags: ['Calendar'],
    }),
    
    confirmEvent: builder.mutation<void, { eventId: string }>({
      query: ({ eventId }) => ({
        url: `/calendar/events/${eventId}/confirm`,
        method: 'POST',
      }),
      invalidatesTags: ['Calendar', 'Event'],
    }),
    
    // Recommendations endpoints
    getDailyRecommendations: builder.query<DailyRecommendations, { date: string }>({
      query: ({ date }) => ({
        url: '/recommendations/daily',
        params: { date },
      }),
      providesTags: ['Recommendation'],
    }),
    
    submitRecommendationFeedback: builder.mutation<void, RecommendationFeedback>({
      query: (feedback) => ({
        url: '/recommendations/feedback',
        method: 'POST',
        body: feedback,
      }),
      invalidatesTags: ['Recommendation'],
    }),
  }),
});
```

## Navigation Architecture

### Navigation Structure
```typescript
// navigation/AppNavigator.tsx
export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

// navigation/MainNavigator.tsx
const Tab = createBottomTabNavigator();

export const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = getTabIcon(route.name, focused);
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondary,
      })}
    >
      <Tab.Screen 
        name="Calendar" 
        component={CalendarNavigator}
        options={{ title: 'Calendar' }}
      />
      <Tab.Screen 
        name="Discover" 
        component={RecommendationsScreen}
        options={{ title: 'Discover' }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchNavigator}
        options={{ title: 'Search' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileNavigator}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};
```

## Custom Hooks

### useAuth Hook
```typescript
// hooks/useAuth.ts
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading } = useAppSelector(state => state.auth);
  
  const login = async (credentials: LoginCredentials) => {
    const response = await dispatch(loginThunk(credentials));
    if (loginThunk.fulfilled.match(response)) {
      await AsyncStorage.setItem('authTokens', JSON.stringify(response.payload.tokens));
    }
    return response;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('authTokens');
    dispatch(logoutAction());
  };

  const refreshToken = async () => {
    const tokens = await AsyncStorage.getItem('authTokens');
    if (tokens) {
      const parsedTokens = JSON.parse(tokens);
      return dispatch(refreshTokenThunk(parsedTokens.refreshToken));
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
  };
};
```

### useCalendar Hook
```typescript
// hooks/useCalendar.ts
export const useCalendar = (date: Date, view: CalendarView) => {
  const { data, loading, error, refetch } = useCalendarQuery({
    startDate: getCalendarStartDate(date, view),
    endDate: getCalendarEndDate(date, view),
    view,
  });

  const [confirmEvent] = useConfirmEventMutation();
  const [removeEvent] = useRemoveEventMutation();

  const getEventsForDate = useCallback((date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return data?.events.filter(event => 
      event.startTime.startsWith(dateString)
    ) || [];
  }, [data]);

  const getSuggestionsForDate = useCallback((date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return data?.suggestions.filter(suggestion => 
      suggestion.startTime.startsWith(dateString)
    ) || [];
  }, [data]);

  const hasConflictsForDate = useCallback((date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return data?.conflicts.some(conflict => 
      conflict.date === dateString
    ) || false;
  }, [data]);

  return {
    events: data?.events || [],
    suggestions: data?.suggestions || [],
    conflicts: data?.conflicts || [],
    loading,
    error,
    refetch,
    confirmEvent,
    removeEvent,
    getEventsForDate,
    getSuggestionsForDate,
    hasConflictsForDate,
  };
};
```

## Theme and Styling

### Theme Configuration
```typescript
// theme/index.ts
export const lightTheme = {
  colors: {
    primary: '#6366F1',
    secondary: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      disabled: '#9CA3AF',
    },
    border: '#E5E7EB',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' },
    h2: { fontSize: 28, fontWeight: 'bold' },
    h3: { fontSize: 24, fontWeight: '600' },
    h4: { fontSize: 20, fontWeight: '600' },
    body1: { fontSize: 16, fontWeight: 'normal' },
    body2: { fontSize: 14, fontWeight: 'normal' },
    caption: { fontSize: 12, fontWeight: 'normal' },
  },
  shadows: {
    sm: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    md: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    lg: '0px 8px 16px rgba(0, 0, 0, 0.1)',
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
};

export const darkTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    background: '#111827',
    surface: '#1F2937',
    text: {
      primary: '#F9FAFB',
      secondary: '#D1D5DB',
      disabled: '#6B7280',
    },
    border: '#374151',
  },
};
```

### Styled Components
```typescript
// components/atoms/Button/Button.styles.ts
import styled from 'styled-components/native';

export const ButtonContainer = styled.TouchableOpacity<{
  variant: ButtonVariant;
  size: ButtonSize;
  disabled: boolean;
}>`
  padding: ${({ size, theme }) => {
    switch (size) {
      case 'small': return `${theme.spacing.sm}px ${theme.spacing.md}px`;
      case 'large': return `${theme.spacing.lg}px ${theme.spacing.xl}px`;
      default: return `${theme.spacing.md}px ${theme.spacing.lg}px`;
    }
  }};
  
  background-color: ${({ variant, theme }) => {
    switch (variant) {
      case 'primary': return theme.colors.primary;
      case 'secondary': return theme.colors.surface;
      case 'outline': return 'transparent';
      default: return theme.colors.primary;
    }
  }};
  
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
  opacity: ${({ disabled }) => disabled ? 0.6 : 1};
`;
```

## Performance Optimization

### Component Memoization
```typescript
// components/molecules/EventCard/EventCard.tsx
export const EventCard = React.memo<EventCardProps>(({
  event,
  variant,
  onPress,
  onConfirm,
  onNotInterested
}) => {
  const handlePress = useCallback(() => {
    onPress(event);
  }, [onPress, event]);

  const handleConfirm = useCallback(() => {
    onConfirm?.(event);
  }, [onConfirm, event]);

  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.event.id === nextProps.event.id &&
    prevProps.variant === nextProps.variant &&
    prevProps.event.updatedAt === nextProps.event.updatedAt
  );
});
```

### List Optimization
```typescript
// components/organisms/EventsList/EventsList.tsx
export const EventsList: React.FC<EventsListProps> = ({ events, onEventPress }) => {
  const renderItem = useCallback(({ item }: { item: Event }) => (
    <EventCard
      event={item}
      variant="compact"
      onPress={onEventPress}
    />
  ), [onEventPress]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: EVENT_CARD_HEIGHT,
    offset: EVENT_CARD_HEIGHT * index,
    index,
  }), []);

  const keyExtractor = useCallback((item: Event) => item.id, []);

  return (
    <FlatList
      data={events}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={8}
      showsVerticalScrollIndicator={false}
    />
  );
};
```

## Testing Strategy

### Component Testing
```typescript
// components/atoms/Button/Button.test.tsx
describe('Button Component', () => {
  it('renders correctly with primary variant', () => {
    const { getByTestId } = render(
      <Button variant="primary" onPress={jest.fn()} testID="test-button">
        Test Button
      </Button>
    );
    
    const button = getByTestId('test-button');
    expect(button).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <Button variant="primary" onPress={onPress} testID="test-button">
        Test Button
      </Button>
    );
    
    fireEvent.press(getByTestId('test-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled prop is true', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <Button variant="primary" onPress={onPress} disabled testID="test-button">
        Test Button
      </Button>
    );
    
    fireEvent.press(getByTestId('test-button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

### Screen Testing
```typescript
// screens/calendar/CalendarScreen/CalendarScreen.test.tsx
describe('CalendarScreen', () => {
  const mockCalendarData = {
    events: [],
    suggestions: [],
    conflicts: []
  };

  it('renders calendar grid', async () => {
    (useCalendarQuery as jest.Mock).mockReturnValue({
      data: mockCalendarData,
      loading: false
    });

    const { getByTestId } = render(<CalendarScreen />);
    
    await waitFor(() => {
      expect(getByTestId('calendar-grid')).toBeTruthy();
    });
  });

  it('handles event confirmation', async () => {
    const mockEvent = createMockEvent();
    const confirmEvent = jest.fn();
    
    (useConfirmEventMutation as jest.Mock).mockReturnValue([confirmEvent]);

    // Test implementation
  });
});
```

This comprehensive frontend architecture provides a solid foundation for building the Weekend Planner App with excellent user experience, maintainability, and scalability across both mobile and web platforms.