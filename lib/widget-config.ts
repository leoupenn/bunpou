// Widget configuration types and utilities

export type WidgetType = 
  | 'mastery-overview'
  | 'jlpt-progress'
  | 'sublevel-progress'
  | 'review-forecast'

export interface WidgetConfig {
  id: string
  type: WidgetType
  x: number // Grid column position
  y: number // Grid row position
  w: number // Width in grid units
  h: number // Height in grid units
  enabled: boolean
}

export interface DashboardLayout {
  widgets: WidgetConfig[]
  columns: number // Total grid columns
}

// Default widget configurations
export const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: 'mastery-overview',
    type: 'mastery-overview',
    x: 0,
    y: 0,
    w: 6,
    h: 4,
    enabled: true,
  },
  {
    id: 'jlpt-progress',
    type: 'jlpt-progress',
    x: 6,
    y: 0,
    w: 6,
    h: 4,
    enabled: true,
  },
  {
    id: 'sublevel-progress',
    type: 'sublevel-progress',
    x: 0,
    y: 4,
    w: 8,
    h: 6,
    enabled: true,
  },
  {
    id: 'review-forecast',
    type: 'review-forecast',
    x: 8,
    y: 4,
    w: 4,
    h: 6,
    enabled: true,
  },
]

export const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: DEFAULT_WIDGETS,
  columns: 12, // 12-column grid system
}

// Widget metadata
export const WIDGET_METADATA: Record<WidgetType, { name: string; description: string; minW: number; minH: number; defaultW: number; defaultH: number }> = {
  'mastery-overview': {
    name: 'Mastery Overview',
    description: 'Overall progress and mastery statistics',
    minW: 4,
    minH: 3,
    defaultW: 6,
    defaultH: 4,
  },
  'jlpt-progress': {
    name: 'JLPT Progress',
    description: 'Progress by JLPT level (N5-N1)',
    minW: 4,
    minH: 3,
    defaultW: 6,
    defaultH: 4,
  },
  'sublevel-progress': {
    name: 'Sublevel Progress',
    description: 'Progress by grammar sublevel/group',
    minW: 6,
    minH: 4,
    defaultW: 8,
    defaultH: 6,
  },
  'review-forecast': {
    name: 'Review Forecast',
    description: 'Upcoming reviews schedule',
    minW: 3,
    minH: 4,
    defaultW: 4,
    defaultH: 6,
  },
}

// Load layout from localStorage
export function loadDashboardLayout(userId: string): DashboardLayout {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT
  
  try {
    const stored = localStorage.getItem(`dashboard-layout-${userId}`)
    if (stored) {
      const parsed = JSON.parse(stored) as DashboardLayout
      // Validate and merge with defaults
      return {
        ...DEFAULT_LAYOUT,
        widgets: parsed.widgets.map((w) => {
          const defaultWidget = DEFAULT_WIDGETS.find((dw) => dw.id === w.id) || DEFAULT_WIDGETS[0]
          return { ...defaultWidget, ...w }
        }),
      }
    }
  } catch (error) {
    console.error('Error loading dashboard layout:', error)
  }
  
  return DEFAULT_LAYOUT
}

// Save layout to localStorage
export function saveDashboardLayout(userId: string, layout: DashboardLayout): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(`dashboard-layout-${userId}`, JSON.stringify(layout))
  } catch (error) {
    console.error('Error saving dashboard layout:', error)
  }
}

// Reset layout to defaults
export function resetDashboardLayout(userId: string): DashboardLayout {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT
  
  try {
    localStorage.removeItem(`dashboard-layout-${userId}`)
  } catch (error) {
    console.error('Error resetting dashboard layout:', error)
  }
  
  return DEFAULT_LAYOUT
}
