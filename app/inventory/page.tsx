'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

interface InventoryItem {
  id: string
  name: string
  description: string
  group: number
  jlptLevel?: string
  situationCount: number
  isLocked?: boolean
  progress: {
    id: string
    srsLevel: number
    status: string
    nextReviewAt: string | null
    lastReviewedAt: string | null
  } | null
}

// Color mapping for SRS levels
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

const getSRSLabel = (srsLevel: number | null, isStarted: boolean): string => {
  if (!isStarted) {
    return 'Not Started'
  }
  if (srsLevel === null) {
    return 'Unknown'
  }
  if (srsLevel === 6) {
    return 'Mastered'
  }
  return `Level ${srsLevel}`
}

export default function InventoryPage() {
  const { user } = useUser()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'started' | 'not-started'>('all')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetch(`/api/inventory?userId=${user.id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch inventory')
        }
        return res.json()
      })
      .then((data: InventoryItem[] | { error: string }) => {
        // Check if response is an error object
        if (data && typeof data === 'object' && 'error' in data) {
          console.error('API error:', data.error)
          setInventory([])
        } else if (Array.isArray(data)) {
          setInventory(data)
        } else {
          console.error('Unexpected response format:', data)
          setInventory([])
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching inventory:', err)
        setInventory([])
        setLoading(false)
      })
  }, [user])

  if (!user) {
    return (
      <ProtectedRoute>
        <div className="container">
          <p>Loading...</p>
        </div>
      </ProtectedRoute>
    )
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="container">
          <h1>Inventory</h1>
          <p>Loading...</p>
        </div>
      </ProtectedRoute>
    )
  }

  // Ensure inventory is always an array
  const safeInventory: InventoryItem[] = Array.isArray(inventory) ? inventory : []

  const filteredInventory: InventoryItem[] = safeInventory.filter((item) => {
    if (filter === 'started') return item.progress !== null
    if (filter === 'not-started') return item.progress === null
    return true
  })

  const startedCount = safeInventory.filter((item) => item.progress !== null).length
  const notStartedCount = safeInventory.filter((item) => item.progress === null).length

  return (
    <ProtectedRoute>
      <div className="container">
        <Link href="/" style={{ marginBottom: '1rem', display: 'inline-block' }}>
          ← Back to Home
        </Link>
        <h1>Grammar Inventory</h1>

        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.875rem' }}
            >
              All ({safeInventory.length})
            </button>
            <button
              onClick={() => setFilter('started')}
              className={filter === 'started' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.875rem' }}
            >
              Started ({startedCount})
            </button>
            <button
              onClick={() => setFilter('not-started')}
              className={filter === 'not-started' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.875rem' }}
            >
              Not Started ({notStartedCount})
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>SRS Level Colors:</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', background: '#e5e7eb', borderRadius: '4px' }} />
              <span>Not Started</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', background: '#fef3c7', borderRadius: '4px' }} />
              <span>Level 0 (New)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', background: '#fde68a', borderRadius: '4px' }} />
              <span>Level 1</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', background: '#fed7aa', borderRadius: '4px' }} />
              <span>Level 2</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', background: '#fdba74', borderRadius: '4px' }} />
              <span>Level 3</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', background: '#fb923c', borderRadius: '4px' }} />
              <span>Level 4</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', background: '#f97316', borderRadius: '4px' }} />
              <span>Level 5</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', background: '#10b981', borderRadius: '4px' }} />
              <span>Level 6 (Mastered)</span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1rem',
          }}
        >
          {filteredInventory.map((item) => {
            const isStarted = item.progress !== null
            const isLocked = item.isLocked ?? false
            const srsLevel = item.progress?.srsLevel ?? null
            const backgroundColor = isLocked ? '#f3f4f6' : getSRSColor(srsLevel, isStarted)
            const isHovered = hoveredId === item.id

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: backgroundColor,
                  border: '2px solid',
                  borderColor: isLocked ? '#9ca3af' : isStarted ? '#6366f1' : '#d1d5db',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  transform: isHovered && !isLocked ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: isHovered && !isLocked
                    ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                  position: 'relative',
                  opacity: isLocked ? 0.7 : 1,
                }}
              >
                {isLocked && (
                  <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', padding: '0.25rem 0.5rem', background: '#9ca3af', color: 'white', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    🔒 Locked
                  </div>
                )}
                {isStarted && item.progress && !isLocked && (
                  <div style={{ position: 'absolute', top: '0.5rem', right: isLocked ? '4rem' : '0.5rem', opacity: isHovered ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                    <Link
                      href={`/history/${item.progress.id}`}
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.5rem',
                        background: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '0.25rem',
                        fontSize: '1rem',
                        textDecoration: 'none',
                        color: '#6366f1',
                        fontWeight: 'bold',
                      }}
                      title="View past attempts"
                    >
                      →
                    </Link>
                  </div>
                )}
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem', fontWeight: 'bold' }}>
                  {item.name}
                  {item.jlptLevel && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: 'normal' }}>
                      {item.jlptLevel}
                    </span>
                  )}
                </h3>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem', opacity: isLocked ? 0.6 : 0.8 }}>
                  {item.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {isLocked ? '🔒 Locked' : getSRSLabel(srsLevel, isStarted)}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                      Group {item.group} • {item.situationCount} situation{item.situationCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {isStarted && item.progress && !isLocked && (
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                      {item.progress.status === 'mastered' && '✓'}
                      {item.progress.status === 'achievement_test' && '🎯'}
                      {item.progress.status === 'learning' && '📚'}
                      {item.progress.status === 'new' && '🆕'}
                    </div>
                  )}
                </div>
                {isHovered && (
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.1)', fontSize: '0.75rem' }}>
                    {isStarted && item.progress && !isLocked && (
                      <>
                        <div>Status: {item.progress.status}</div>
                        {item.progress.nextReviewAt && (
                          <div>Next review: {new Date(item.progress.nextReviewAt).toLocaleDateString()}</div>
                        )}
                      </>
                    )}
                    {isLocked && (
                      <div style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
                        Complete previous groups to unlock this grammar point
                      </div>
                    )}
                    <Link
                      href={`/docs/${item.id}`}
                      style={{
                        display: 'inline-block',
                        marginTop: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        background: '#6366f1',
                        color: 'white',
                        borderRadius: '0.25rem',
                        textDecoration: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      📚 View Documentation
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filteredInventory.length === 0 && (
          <div className="card" style={{ marginTop: '2rem', textAlign: 'center' }}>
            {safeInventory.length === 0 ? (
              <div>
                <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  No grammar points found
                </p>
                <p style={{ color: '#6b7280' }}>
                  The database may be empty. Please check if grammar points have been seeded.
                </p>
              </div>
            ) : (
              <p>No grammar points found matching the selected filter.</p>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

