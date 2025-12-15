'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface MasteryOverviewProps {
  userId: string
}

interface OverallStats {
  totalGrammarPoints: number
  mastered: number
  inProgress: number
  notStarted: number
  overallPercentage: number
  learningVelocity: {
    perDay: number
    perWeek: number
  }
  estimatedCompletionDate: Date | null
}

interface DashboardStats {
  overall: OverallStats
}

export default function MasteryOverview({ userId }: MasteryOverviewProps) {
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
        console.error('Error fetching mastery overview:', err)
        setLoading(false)
      })
  }, [userId])

  if (loading) {
    return (
      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
          Mastery Overview
        </h2>
        <p>Loading...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
          Mastery Overview
        </h2>
        <p>No data available</p>
      </div>
    )
  }

  const { overall } = stats
  const percentage = overall.overallPercentage

  // Calculate donut chart values
  const masteredAngle = (overall.mastered / overall.totalGrammarPoints) * 360
  const inProgressAngle = (overall.inProgress / overall.totalGrammarPoints) * 360
  const notStartedAngle = (overall.notStarted / overall.totalGrammarPoints) * 360

  const getBarColor = (percentage: number) => {
    if (percentage >= 80) return '#10b981' // Green
    if (percentage >= 50) return '#f59e0b' // Orange
    if (percentage >= 25) return '#f97316' // Dark orange
    return '#e5e7eb' // Gray
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
        Mastery Overview
      </h2>

      {/* Overall Progress Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Overall Progress</span>
          <span
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: getBarColor(percentage),
            }}
          >
            {percentage.toFixed(1)}%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '28px',
            background: '#f3f4f6',
            borderRadius: '6px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              background: getBarColor(percentage),
              borderRadius: '6px',
              transition: 'width 0.3s ease',
              minWidth: percentage > 0 ? '2px' : '0',
            }}
          />
          {percentage > 5 && (
            <span
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: percentage > 50 ? 'white' : '#374151',
              }}
            >
              {overall.mastered} / {overall.totalGrammarPoints} mastered
            </span>
          )}
        </div>
      </div>

      {/* Statistics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            padding: '1rem',
            background: '#f0fdf4',
            borderRadius: '6px',
            border: '1px solid #bbf7d0',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#166534', marginBottom: '0.25rem' }}>
            Mastered
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
            {overall.mastered}
          </div>
        </div>
        <div
          style={{
            padding: '1rem',
            background: '#fffbeb',
            borderRadius: '6px',
            border: '1px solid #fde68a',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#92400e', marginBottom: '0.25rem' }}>
            In Progress
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
            {overall.inProgress}
          </div>
        </div>
        <div
          style={{
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.25rem' }}>
            Not Started
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6b7280' }}>
            {overall.notStarted}
          </div>
        </div>
      </div>

      {/* Learning Velocity */}
      {overall.learningVelocity.perDay > 0 && (
        <div
          style={{
            padding: '1rem',
            background: '#eff6ff',
            borderRadius: '6px',
            border: '1px solid #bfdbfe',
            marginBottom: '1rem',
          }}
        >
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Learning Velocity
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: '#6b7280' }}>Per Day: </span>
              <span style={{ fontWeight: 600, color: '#3b82f6' }}>
                {overall.learningVelocity.perDay.toFixed(2)}
              </span>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Per Week: </span>
              <span style={{ fontWeight: 600, color: '#3b82f6' }}>
                {overall.learningVelocity.perWeek.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Estimated Completion */}
      {overall.estimatedCompletionDate && (
        <div
          style={{
            padding: '1rem',
            background: '#f0fdf4',
            borderRadius: '6px',
            border: '1px solid #bbf7d0',
          }}
        >
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Estimated Completion Date
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10b981' }}>
            {format(new Date(overall.estimatedCompletionDate), 'MMMM d, yyyy')}
          </div>
        </div>
      )}
    </div>
  )
}

