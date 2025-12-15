'use client'

import { ReactNode } from 'react'
import { WidgetConfig } from '@/lib/widget-config'

interface DashboardWidgetProps {
  config: WidgetConfig
  children: ReactNode
  onRemove?: () => void
  onToggle?: () => void
  isEditing?: boolean
}

export default function DashboardWidget({
  config,
  children,
  onRemove,
  onToggle,
  isEditing = false,
}: DashboardWidgetProps) {
  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Edit Controls */}
      {isEditing && (
        <div
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            display: 'flex',
            gap: '0.25rem',
            zIndex: 10,
          }}
        >
          {onToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
              style={{
                padding: '0.25rem 0.5rem',
                background: config.enabled ? '#10b981' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
              title={config.enabled ? 'Disable widget' : 'Enable widget'}
            >
              {config.enabled ? '✓' : '✗'}
            </button>
          )}
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              style={{
                padding: '0.25rem 0.5rem',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
              title="Remove widget"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Widget Content */}
      <div
        style={{
          height: '100%',
          opacity: config.enabled ? 1 : 0.5,
          pointerEvents: config.enabled ? 'auto' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
