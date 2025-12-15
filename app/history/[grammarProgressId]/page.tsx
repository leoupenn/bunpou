'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ProtectedRoute } from '@/components/ProtectedRoute'

interface Attempt {
  id: string
  userSentence: string
  isCorrect: boolean
  feedback: string | null
  hints: string | null
  corrections: string | null
  attemptType: string
  createdAt: string
  grammarPoint: {
    name: string
  }
  situation: {
    situation: string
  } | null
}

export default function HistoryPage({
  params,
}: {
  params: { grammarProgressId: string }
}) {
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.grammarProgressId) {
      console.error('No grammarProgressId provided')
      setLoading(false)
      return
    }

    fetch(`/api/attempts/${params.grammarProgressId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`)
        }
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setAttempts(data)
          if (data.length > 0) {
            setSelectedAttempt(data[0])
          }
        } else if (data.error) {
          console.error('API error:', data.error, data.details)
          setAttempts([])
        } else {
          console.error('Unexpected response format:', data)
          setAttempts([])
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching attempts:', err)
        setLoading(false)
      })
  }, [params.grammarProgressId])

  if (loading) {
    return (
      <ProtectedRoute>
      <div className="container">
        <h1>History</h1>
        <p>Loading...</p>
      </div>
      </ProtectedRoute>
    )
  }

  if (attempts.length === 0) {
    return (
      <ProtectedRoute>
      <div className="container">
        <Link href="/progress" style={{ marginBottom: '1rem', display: 'inline-block' }}>
          ← Back to Progress
        </Link>
        <h1>History</h1>
        <div className="card">
          <p>No attempts found for this grammar point.</p>
        </div>
      </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container">
        <Link href="/progress" style={{ marginBottom: '1rem', display: 'inline-block' }}>
          ← Back to Progress
        </Link>
        <h1>History - {attempts[0]?.grammarPoint.name}</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', marginTop: '2rem' }}>
          <div className="card">
            <h2>Past Attempts</h2>
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {attempts.map((attempt, index) => (
                <div
                  key={attempt.id}
                  onClick={() => setSelectedAttempt(attempt)}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.5rem',
                    background: selectedAttempt?.id === attempt.id ? '#e0e7ff' : 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>Attempt #{attempts.length - index}</span>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        background: attempt.isCorrect ? '#d1fae5' : '#fee2e2',
                        color: attempt.isCorrect ? '#065f46' : '#991b1b',
                        fontSize: '0.875rem',
                      }}
                    >
                      {attempt.isCorrect ? '✓' : '✗'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                    {format(new Date(attempt.createdAt), 'MMM d, yyyy HH:mm')}
                  </p>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                    {attempt.userSentence}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {selectedAttempt && (
            <div className="card">
              <h2>Attempt Details</h2>
              <div style={{ marginTop: '1rem' }}>
                <p>
                  <strong>Date:</strong> {format(new Date(selectedAttempt.createdAt), 'MMMM d, yyyy at HH:mm')}
                </p>
                <p style={{ marginTop: '0.5rem' }}>
                  <strong>Type:</strong> {selectedAttempt.attemptType}
                </p>
                <p style={{ marginTop: '0.5rem' }}>
                  <strong>Situation:</strong> {selectedAttempt.situation?.situation || 'N/A'}
                </p>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <h3>Your Sentence</h3>
                <div
                  style={{
                    padding: '1rem',
                    background: '#f3f4f6',
                    borderRadius: '0.375rem',
                    marginTop: '0.5rem',
                  }}
                >
                  {selectedAttempt.userSentence}
                </div>
              </div>

              <div
                className={`feedback ${selectedAttempt.isCorrect ? 'correct' : 'incorrect'}`}
                style={{ marginTop: '1.5rem' }}
              >
                <h3>{selectedAttempt.isCorrect ? '✓ Correct!' : '✗ Incorrect'}</h3>
                <p style={{ marginTop: '0.5rem' }}>{selectedAttempt.feedback}</p>
              </div>

              {selectedAttempt.hints && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h3>Hints</h3>
                  <p style={{ marginTop: '0.5rem', padding: '1rem', background: '#fef3c7', borderRadius: '0.375rem' }}>
                    {selectedAttempt.hints}
                  </p>
                </div>
              )}

              {selectedAttempt.corrections && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h3>Corrections</h3>
                  <p style={{ marginTop: '0.5rem', padding: '1rem', background: '#dbeafe', borderRadius: '0.375rem' }}>
                    {selectedAttempt.corrections}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

