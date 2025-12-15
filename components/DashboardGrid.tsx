'use client'

import { useState, useEffect } from 'react'
import ReviewForecast from '@/components/ReviewForecast'
import JLPTProgressChart from '@/components/JLPTProgressChart'
import SublevelProgress from '@/components/SublevelProgress'
import MasteryOverview from '@/components/MasteryOverview'

interface DashboardGridProps {
  userId: string
}

export type WidgetType = 'mastery-overview' | 'jlpt-progress' | 'sublevel-progress' | 'review-forecast'

export interface WidgetConfig {
  id: string
  type: WidgetType
  enabled: boolean
  collapsed: boolean
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: '1', type: 'mastery-overview', enabled: true, collapsed: false },
  { id: '2', type: 'jlpt-progress', enabled: true, collapsed: false },
  { id: '3', type: 'sublevel-progress', enabled: true, collapsed: false },
  { id: '4', type: 'review-forecast', enabled: true, collapsed: false },
]

const WIDGET_NAMES: Record<WidgetType, string> = {
  'mastery-overview': 'Mastery Overview',
  'jlpt-progress': 'JLPT Progress',
  'sublevel-progress': 'Sublevel Progress',
  'review-forecast': 'Review Forecast',
}

export default function DashboardGrid({ userId }: DashboardGridProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS)
  const [showSettings, setShowSettings] = useState(false)
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null)
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null)

  // Load saved widget configuration from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`dashboard-widgets-${userId}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setWidgets(parsed)
      } catch (e) {
        console.error('Failed to parse saved widgets:', e)
      }
    }
  }, [userId])

  // Save widget configuration to localStorage
  const saveWidgets = (newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets)
    localStorage.setItem(`dashboard-widgets-${userId}`, JSON.stringify(newWidgets))
  }

  const toggleWidget = (widgetId: string) => {
    const updated = widgets.map((w) =>
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    )
    saveWidgets(updated)
  }

  const toggleCollapse = (widgetId: string) => {
    const updated = widgets.map((w) =>
      w.id === widgetId ? { ...w, collapsed: !w.collapsed } : w
    )
    saveWidgets(updated)
  }

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidgetId(widgetId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', widgetId)
    // Add a slight delay to allow drag to start
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.5'
      }
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1'
    }
    setDraggedWidgetId(null)
    setDragOverWidgetId(null)
  }

  const handleDragOver = (e: React.DragEvent, widgetId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedWidgetId && draggedWidgetId !== widgetId) {
      setDragOverWidgetId(widgetId)
    }
  }

  const handleDragLeave = () => {
    setDragOverWidgetId(null)
  }

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault()
    
    if (!draggedWidgetId || draggedWidgetId === targetWidgetId) {
      setDraggedWidgetId(null)
      setDragOverWidgetId(null)
      return
    }

    const draggedIndex = widgets.findIndex((w) => w.id === draggedWidgetId)
    const targetIndex = widgets.findIndex((w) => w.id === targetWidgetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedWidgetId(null)
      setDragOverWidgetId(null)
      return
    }

    const newWidgets = [...widgets]
    const [removed] = newWidgets.splice(draggedIndex, 1)
    newWidgets.splice(targetIndex, 0, removed)
    
    saveWidgets(newWidgets)
    setDraggedWidgetId(null)
    setDragOverWidgetId(null)
  }

  const renderWidget = (widget: WidgetConfig) => {
    if (!widget.enabled) return null

    const commonProps = { userId }
    let widgetContent

    switch (widget.type) {
      case 'mastery-overview':
        widgetContent = <MasteryOverview {...commonProps} />
        break
      case 'jlpt-progress':
        widgetContent = <JLPTProgressChart {...commonProps} />
        break
      case 'sublevel-progress':
        widgetContent = <SublevelProgress {...commonProps} />
        break
      case 'review-forecast':
        widgetContent = <ReviewForecast {...commonProps} />
        break
      default:
        return null
    }

    return (
      <div
        style={{
          position: 'relative',
          overflow: widget.collapsed ? 'hidden' : 'visible',
          maxHeight: widget.collapsed ? '60px' : 'none',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            zIndex: 10,
            display: 'flex',
            gap: '0.25rem',
          }}
        >
          <button
            onClick={() => toggleCollapse(widget.id)}
            style={{
              padding: '0.25rem 0.5rem',
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              color: '#6b7280',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
            title={widget.collapsed ? 'Expand' : 'Collapse'}
          >
            {widget.collapsed ? '▼' : '▲'}
          </button>
          {showSettings && (
            <button
              onClick={() => toggleWidget(widget.id)}
              style={{
                padding: '0.25rem 0.5rem',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #e5e7eb',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                color: '#6b7280',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
              title="Hide widget"
            >
              ✕
            </button>
          )}
        </div>
        {widgetContent}
      </div>
    )
  }

  const enabledWidgets = widgets.filter((w) => w.enabled)

  return (
    <div>
      {/* Settings Button - Minimal, like WaniKani */}
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            padding: '0.5rem 0.75rem',
            background: showSettings ? '#6366f1' : 'transparent',
            color: showSettings ? 'white' : '#6b7280',
            border: showSettings ? 'none' : '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            transition: 'all 0.2s',
          }}
          title="Customize dashboard"
        >
          ⚙️ {showSettings ? 'Done' : 'Settings'}
        </button>
      </div>

      {/* Widget Settings Panel - Minimal, only when settings is open */}
      {showSettings && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '0.75rem 1rem',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 500, color: '#374151' }}>Show/Hide widgets:</span>
            {widgets.map((widget) => (
              <label
                key={widget.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  background: widget.enabled ? 'white' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={widget.enabled}
                  onChange={() => toggleWidget(widget.id)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: widget.enabled ? '#111827' : '#9ca3af' }}>
                  {WIDGET_NAMES[widget.type]}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Widget Grid - Simple 2-column layout like WaniKani */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1.5rem',
        }}
      >
        {enabledWidgets.map((widget) => (
          <div
            key={widget.id}
            draggable
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            style={{
              cursor: 'move',
              opacity: draggedWidgetId === widget.id ? 0.5 : 1,
              transform: dragOverWidgetId === widget.id ? 'translateY(-4px)' : 'translateY(0)',
              transition: draggedWidgetId ? 'transform 0.2s ease' : 'none',
              position: 'relative',
            }}
          >
            {/* Drag indicator */}
            {draggedWidgetId === widget.id && (
              <div
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  left: '0.5rem',
                  zIndex: 20,
                  padding: '0.25rem 0.5rem',
                  background: '#6366f1',
                  color: 'white',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  pointerEvents: 'none',
                }}
              >
                Dragging...
              </div>
            )}
            {/* Drop indicator */}
            {dragOverWidgetId === widget.id && draggedWidgetId !== widget.id && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: '#6366f1',
                  borderRadius: '0.25rem 0.25rem 0 0',
                  zIndex: 15,
                  pointerEvents: 'none',
                }}
              />
            )}
            {renderWidget(widget)}
          </div>
        ))}
      </div>
    </div>
  )
}
