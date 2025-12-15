'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import HistoryLink from '@/components/HistoryLink'
import { format, formatDistanceToNow } from 'date-fns'
import { useUser } from '@/contexts/UserContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

interface GrammarProgress {
  id: string
  grammarPoint: {
    id: string
    name: string
    description: string
    situation: string
  }
  srsLevel: number
  status: string
  nextReviewAt: string | null
  lastReviewedAt: string | null
}

export default function ProgressPage() {
  const { user } = useUser()
  const [grammarPoints, setGrammarPoints] = useState<GrammarProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetch(`/api/grammar?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        setGrammarPoints(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching progress:', err)
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
        <h1>My Progress</h1>
        <p>Loading...</p>
      </div>
      </ProtectedRoute>
    )
  }

  const groupedByStatus = {
    new: grammarPoints.filter((gp) => gp.status === 'new'),
    learning: grammarPoints.filter((gp) => gp.status === 'learning'),
    mastered: grammarPoints.filter((gp) => gp.status === 'mastered'),
    achievement_test: grammarPoints.filter((gp) => gp.status === 'achievement_test'),
  }

  return (
    <ProtectedRoute>
    <div className="container">
      <Link href="/" style={{ marginBottom: '1rem', display: 'inline-block' }}>
        ← Back to Home
      </Link>
      <h1>My Progress</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
        <div className="card">
          <h2>New ({groupedByStatus.new.length})</h2>
          {groupedByStatus.new.map((gp) => (
            <GrammarPointCard
              key={gp.id}
              grammarProgress={gp}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
            />
          ))}
        </div>

        <div className="card">
          <h2>Learning ({groupedByStatus.learning.length})</h2>
          {groupedByStatus.learning.map((gp) => (
            <GrammarPointCard
              key={gp.id}
              grammarProgress={gp}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
            />
          ))}
        </div>

        <div className="card">
          <h2>Mastered ({groupedByStatus.mastered.length})</h2>
          {groupedByStatus.mastered.map((gp) => (
            <GrammarPointCard
              key={gp.id}
              grammarProgress={gp}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
            />
          ))}
        </div>

        <div className="card">
          <h2>Achievement Test ({groupedByStatus.achievement_test.length})</h2>
          {groupedByStatus.achievement_test.map((gp) => (
            <GrammarPointCard
              key={gp.id}
              grammarProgress={gp}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
            />
          ))}
        </div>
      </div>
    </div>
    </ProtectedRoute>
  )
}

function GrammarPointCard({
  grammarProgress,
  hoveredId,
  setHoveredId,
}: {
  grammarProgress: GrammarProgress
  hoveredId: string | null
  setHoveredId: (id: string | null) => void
}) {
  const isHovered = hoveredId === grammarProgress.id
  const nextReviewText = grammarProgress.nextReviewAt
    ? formatDistanceToNow(new Date(grammarProgress.nextReviewAt), { addSuffix: true })
    : 'No review scheduled'

  return (
    <div
      className="grammar-box"
      style={{ marginBottom: '0.5rem' }}
      onMouseEnter={() => setHoveredId(grammarProgress.id)}
      onMouseLeave={() => setHoveredId(null)}
    >
      {isHovered && <HistoryLink grammarProgressId={grammarProgress.id} />}
      <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>
        {grammarProgress.grammarPoint.name}
      </h3>
      <p style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.25rem' }}>
        SRS Level: {grammarProgress.srsLevel}
      </p>
      {isHovered && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.9 }}>
          <p>Next review: {nextReviewText}</p>
          <p style={{ marginTop: '0.25rem' }}>Click arrow → to view history</p>
        </div>
      )}
    </div>
  )
}

