'use client'

import { useState, useEffect } from 'react'

interface JLPTProgressChartProps {
  userId: string
}

interface JLPTStats {
  total: number
  mastered: number
  inProgress: number
  notStarted: number
  percentage: number
}

interface DashboardStats {
  jlptLevels: {
    N5: JLPTStats
    N4: JLPTStats
    N3: JLPTStats
    N2: JLPTStats
    N1: JLPTStats
  }
}

export default function JLPTProgressChart({ userId }: JLPTProgressChartProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/dashboard/stats?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching JLPT stats:', err)
        setLoading(false)
      })
  }, [userId])

  if (loading) {
    return (
      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
          JLPT Level Progress
        </h2>
        <p>Loading...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
          JLPT Level Progress
        </h2>
        <p>No data available</p>
      </div>
    )
  }

  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'] as const

  const getBarColor = (percentage: number) => {
    if (percentage >= 80) return '#10b981' // Green
    if (percentage >= 50) return '#f59e0b' // Orange
    if (percentage >= 25) return '#f97316' // Dark orange
    return '#e5e7eb' // Gray
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
        JLPT Level Progress
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {levels.map((level) => {
          const levelStats = stats.jlptLevels[level]
          const percentage = levelStats.percentage
          const barColor = getBarColor(percentage)

          return (
            <div key={level} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: '3rem' }}>
                  {level}
                </span>
                <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: '1rem' }}>
                  {levelStats.mastered} / {levelStats.total} mastered
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
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '24px',
                  background: '#f3f4f6',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                    minWidth: percentage > 0 ? '2px' : '0',
                  }}
                />
                {percentage > 5 && (
                  <span
                    style={{
                      position: 'absolute',
                      left: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: percentage > 50 ? 'white' : '#374151',
                    }}
                  >
                    {levelStats.mastered} / {levelStats.total}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginTop: '-0.25rem',
                }}
              >
                <span>In Progress: {levelStats.inProgress}</span>
                <span>Not Started: {levelStats.notStarted}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

