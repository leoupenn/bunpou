'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface SublevelProgressProps {
  userId: string
}

interface GrammarPointProgress {
  id: string
  name: string
  srsLevel: number | null
  status: string | null
}

interface GroupProgress {
  group: number
  total: number
  mastered: number
  inProgress: number
  required: number
  unlocked: boolean
  progress: number
  grammarPoints: GrammarPointProgress[]
}

interface UnlockedGroupsData {
  unlockedGroups: number[]
  groupProgress: GroupProgress[]
}

export default function SublevelProgress({ userId }: SublevelProgressProps) {
  const [data, setData] = useState<UnlockedGroupsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetch(`/api/groups/unlocked?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching group progress:', err)
        setLoading(false)
      })
  }, [userId])

  const toggleGroup = (group: number) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(group)) {
        newSet.delete(group)
      } else {
        newSet.add(group)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
          Sublevel Progress
        </h2>
        <p>Loading...</p>
      </div>
    )
  }

  if (!data || !data.groupProgress || data.groupProgress.length === 0) {
    return (
      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
          Sublevel Progress
        </h2>
        <p>No data available</p>
      </div>
    )
  }

  // Get SRS color based on level (same as inventory page)
  const getSRSColor = (srsLevel: number | null, isStarted: boolean): string => {
    if (!isStarted) {
      return '#e5e7eb' // Gray for not started
    }

    switch (srsLevel) {
      case 0:
        return '#fef3c7' // Yellow - New
      case 1:
        return '#fde68a' // Light yellow - Level 1
      case 2:
        return '#fed7aa' // Light orange - Level 2
      case 3:
        return '#fdba74' // Orange - Level 3
      case 4:
        return '#fb923c' // Dark orange - Level 4
      case 5:
        return '#f97316' // Darker orange - Level 5
      case 6:
        return '#10b981' // Green - Mastered
      default:
        return '#e5e7eb' // Gray - Unknown
    }
  }

  // Calculate average SRS level for the group to determine bar color
  const getBarColor = (group: GroupProgress) => {
    if (!group.unlocked) return '#9ca3af' // Gray for locked

    const startedPoints = group.grammarPoints.filter((gp) => gp.srsLevel !== null)
    if (startedPoints.length === 0) return '#e5e7eb' // Light gray if nothing started

    // Calculate average SRS level
    const avgSRS =
      startedPoints.reduce((sum, gp) => sum + (gp.srsLevel ?? 0), 0) / startedPoints.length

    // Use the average to determine color
    if (avgSRS >= 6) return '#10b981' // Green (all mastered)
    if (avgSRS >= 4) return '#fb923c' // Dark orange
    if (avgSRS >= 3) return '#fdba74' // Orange
    if (avgSRS >= 2) return '#fed7aa' // Light orange
    if (avgSRS >= 1) return '#fde68a' // Light yellow
    return '#fef3c7' // Yellow
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
        Sublevel Progress
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {data.groupProgress.map((group) => {
          const progress = group.progress
          const barColor = getBarColor(group)
          const isExpanded = expandedGroups.has(group.group)
          const isLocked = !group.unlocked

          return (
            <div
              key={group.group}
              style={{
                border: `1px solid ${isLocked ? '#d1d5db' : '#e5e7eb'}`,
                borderRadius: '6px',
                padding: '0.75rem',
                background: isLocked ? '#f3f4f6' : '#fafafa',
                opacity: isLocked ? 0.7 : 1,
              }}
            >
              {/* Header - Clickable */}
              <div
                onClick={() => !isLocked && toggleGroup(group.group)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  marginBottom: isExpanded ? '0.75rem' : '0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    Sublevel {group.group}
                    {isLocked && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                        🔒 Locked
                      </span>
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {group.mastered} mastered
                    {group.inProgress > 0 && (
                      <span style={{ marginLeft: '0.5rem', color: '#f59e0b' }}>
                        • {group.inProgress} in progress
                      </span>
                    )}
                    <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                      / {group.total} total
                    </span>
                    {!isLocked && group.group > 1 && (
                      <span style={{ marginLeft: '0.5rem', color: '#f59e0b', fontSize: '0.75rem' }}>
                        (need {group.required})
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: barColor,
                      minWidth: '3.5rem',
                      textAlign: 'right',
                    }}
                  >
                    {progress.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress Bar - Colored by SRS levels, unified by color */}
              <div
                style={{
                  width: '100%',
                  height: '24px',
                  background: '#f3f4f6',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  position: 'relative',
                  marginBottom: isExpanded ? '0.5rem' : '0',
                  display: 'flex',
                }}
              >
                {(() => {
                  // Group consecutive grammar points with the same color
                  const segments: Array<{ color: string; startIndex: number; count: number; grammarPoints: typeof group.grammarPoints }> = []
                  
                  group.grammarPoints.forEach((gp, index) => {
                    const isStarted = gp.srsLevel !== null
                    const color = getSRSColor(gp.srsLevel, isStarted)
                    
                    const lastSegment = segments[segments.length - 1]
                    if (lastSegment && lastSegment.color === color) {
                      // Same color as previous segment, extend it
                      lastSegment.count++
                      lastSegment.grammarPoints.push(gp)
                    } else {
                      // New color, start a new segment
                      segments.push({
                        color,
                        startIndex: index,
                        count: 1,
                        grammarPoints: [gp],
                      })
                    }
                  })
                  
                  return segments.map((segment, segmentIndex) => {
                    const width = `${(segment.count / group.total) * 100}%`
                    const grammarPointNames = segment.grammarPoints.map(gp => gp.name).join(', ')
                    
                    return (
                      <div
                        key={segmentIndex}
                        style={{
                          width,
                          height: '100%',
                          background: segment.color,
                          transition: 'opacity 0.2s',
                        }}
                        title={grammarPointNames}
                      />
                    )
                  })
                })()}
                {/* Show required threshold line if not unlocked */}
                {!isLocked && group.group > 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${(group.required / group.total) * 100}%`,
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      background: '#10b981',
                      zIndex: 1,
                      boxShadow: '0 0 4px rgba(16, 185, 129, 0.5)',
                    }}
                    title={`Need ${group.required} mastered to unlock next group`}
                  />
                )}
              </div>

              {/* Expanded Details */}
              {isExpanded && !isLocked && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                      <span style={{ color: '#6b7280' }}>Mastered:</span>
                      <span style={{ fontWeight: 600, color: '#10b981', marginLeft: '0.5rem' }}>
                        {group.mastered}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>In Progress:</span>
                      <span style={{ fontWeight: 600, color: '#f59e0b', marginLeft: '0.5rem' }}>
                        {group.inProgress}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>Total:</span>
                      <span style={{ fontWeight: 600, marginLeft: '0.5rem' }}>{group.total}</span>
                    </div>
                  </div>
                  {group.group > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>Required to unlock next:</span>
                      <span style={{ fontWeight: 600, color: '#f59e0b' }}>
                        {group.required} / {group.total}
                      </span>
                    </div>
                  )}
                  
                  {/* Grammar Points List */}
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                      Grammar Points:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {group.grammarPoints.map((gp) => {
                        const isStarted = gp.srsLevel !== null
                        const color = getSRSColor(gp.srsLevel, isStarted)
                        const statusLabel =
                          gp.srsLevel === null
                            ? 'Not started'
                            : gp.status === 'new' && gp.srsLevel === 0
                              ? 'New'
                              : `Level ${gp.srsLevel}`
                        return (
                          <div
                            key={gp.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.375rem 0.5rem',
                              background: isStarted ? `${color}20` : '#f3f4f6',
                              borderRadius: '0.25rem',
                            }}
                          >
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '2px',
                                background: color,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ flex: 1, fontSize: '0.8125rem' }}>{gp.name}</span>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {statusLabel}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {group.unlocked && group.group < Math.max(...data.unlockedGroups) && (
                    <div
                      style={{
                        marginTop: '0.5rem',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Next group unlocked!</span>
                    </div>
                  )}
                </div>
              )}
              {isExpanded && isLocked && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #e5e7eb',
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    fontStyle: 'italic',
                  }}
                >
                  Complete previous sublevels to unlock this group.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

