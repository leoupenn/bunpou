'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SentencePractice from '@/components/SentencePractice'
import HistoryLink from '@/components/HistoryLink'
import { useUser } from '@/contexts/UserContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

interface Situation {
  id: string
  lessonNumber: number
  situation: string
  wordBank: string
  difficulty: number
}

interface GrammarProgress {
  id: string
  grammarPoint: {
    id: string
    name: string
    description: string
    referenceUrl: string | null
    situations: Situation[]
  }
  srsLevel: number
  status: string
  nextReviewAt: string | null
  unlockedSituationNumber: number
  lastSituationId: string | null
}

export default function ReviewPage() {
  const { user } = useUser()
  const [grammarPoints, setGrammarPoints] = useState<GrammarProgress[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentSituation, setCurrentSituation] = useState<Situation | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWordBank, setShowWordBank] = useState(false)
  const [skippingWait, setSkippingWait] = useState(false)

  const fetchAvailableReviews = async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/reviews/available?userId=${user.id}`)
      const data = await res.json()
      setGrammarPoints(data)
      setCurrentIndex(0)
      setLoading(false)
      
      // Fetch the next situation for the first grammar point
      if (data.length > 0) {
        await fetchNextSituation(data[0].id)
      }
    } catch (err) {
      console.error('Error fetching reviews:', err)
      setLoading(false)
    }
  }

  const fetchNextSituation = async (grammarProgressId: string) => {
    if (!user) return
    try {
      const res = await fetch(`/api/situations/next?userId=${user.id}&grammarProgressId=${grammarProgressId}`)
      if (res.ok) {
        const situation = await res.json()
        setCurrentSituation(situation)
      } else {
        setCurrentSituation(null)
      }
    } catch (err) {
      console.error('Error fetching next situation:', err)
      setCurrentSituation(null)
    }
  }

  useEffect(() => {
    if (user) {
      fetchAvailableReviews()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Fetch next situation when grammar point changes
  useEffect(() => {
    if (grammarPoints.length > 0 && currentIndex < grammarPoints.length && user && !loading) {
      fetchNextSituation(grammarPoints[currentIndex].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex])

  const handleCorrect = async () => {
    const currentGrammar = grammarPoints[currentIndex]
    
    // Reset word bank visibility
    setShowWordBank(false)
    
    // Refresh the grammar progress to get updated unlockedSituationNumber
    // Then fetch the next situation
    try {
      // Refresh available reviews to get updated progress
      const res = await fetch(`/api/reviews/available?userId=${user?.id}`)
      const updatedData = await res.json()
      
      // Update the current grammar point in the list
      const updatedGrammar = updatedData.find((gp: GrammarProgress) => gp.id === currentGrammar.id)
      if (updatedGrammar) {
        setGrammarPoints((prev) => 
          prev.map((gp) => gp.id === currentGrammar.id ? updatedGrammar : gp)
        )
        
        // Fetch next situation with updated progress
        await fetchNextSituation(updatedGrammar.id)
      } else {
        // Grammar point no longer available, move to next or refresh
        if (currentIndex < grammarPoints.length - 1) {
          setCurrentIndex(currentIndex + 1)
          await fetchNextSituation(grammarPoints[currentIndex + 1].id)
        } else {
          await fetchAvailableReviews()
        }
      }
    } catch (err) {
      console.error('Error refreshing after correct:', err)
      // Fallback: just fetch next situation
      await fetchNextSituation(currentGrammar.id)
    }
  }

  const handleMarkAsMastered = async () => {
    if (!user) return
    const currentGrammar = grammarPoints[currentIndex]
    try {
      const response = await fetch(`/api/grammar/${currentGrammar.grammarPoint.id}/master`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      if (response.ok) {
        // Refresh available reviews
        fetchAvailableReviews()
      } else {
        alert('Error moving to achievement test. Please try again.')
      }
    } catch (error) {
      console.error('Error marking as mastered:', error)
      alert('Error marking as mastered. Please try again.')
    }
  }

  const handleSkipWait = async () => {
    if (!user || skippingWait) return
    
    setSkippingWait(true)
    try {
      const response = await fetch('/api/reviews/skip-wait', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh available reviews
        await fetchAvailableReviews()
        // Show success message
        console.log(data.message)
      } else {
        alert(data.error || 'Error skipping wait time. Please try again.')
      }
    } catch (error) {
      console.error('Error skipping wait time:', error)
      alert('Error skipping wait time. Please try again.')
    } finally {
      setSkippingWait(false)
    }
  }

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
        <h1>Level Review</h1>
        <p>Loading...</p>
      </div>
      </ProtectedRoute>
    )
  }

  if (grammarPoints.length === 0) {
    return (
      <ProtectedRoute>
      <div className="container">
        <h1>Level Review</h1>
        <div className="card">
          <p>No reviews available at this time. Check back later!</p>
          <Link href="/" style={{ display: 'inline-block', marginTop: '1rem' }}>
            <button className="btn-primary">Back to Home</button>
          </Link>
        </div>
      </div>
      </ProtectedRoute>
    )
  }

  const currentGrammar = grammarPoints[currentIndex]

  if (!currentGrammar) {
    return (
      <ProtectedRoute>
      <div className="container">
        <h1>Level Review</h1>
        <p>Loading...</p>
      </div>
      </ProtectedRoute>
    )
  }

  // If no situation loaded yet, show loading state
  if (!currentSituation) {
    return (
      <ProtectedRoute>
      <div className="container">
        <h1>Level Review</h1>
        <p>Loading situation...</p>
      </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
    <div className="container">
      <Link href="/" style={{ marginBottom: '1rem', display: 'inline-block' }}>
        ← Back to Home
      </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>Level Review</h1>
            <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              Available Reviews: {grammarPoints.length} | Current: {currentIndex + 1} / {grammarPoints.length}
            </p>
          </div>
          <button
            onClick={handleSkipWait}
            disabled={skippingWait}
            className="btn-secondary"
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              opacity: skippingWait ? 0.6 : 1,
              cursor: skippingWait ? 'not-allowed' : 'pointer'
            }}
            title="Make all upcoming reviews immediately available"
          >
            {skippingWait ? 'Skipping...' : '⏩ Skip Wait Time'}
          </button>
        </div>

        <div className="grammar-box" style={{ marginBottom: '2rem' }}>
        <HistoryLink grammarProgressId={currentGrammar.id} />
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{currentGrammar.grammarPoint.name}</h2>
          {currentSituation && (
            <p style={{ fontSize: '1.125rem', marginTop: '1rem', marginBottom: '0.5rem', lineHeight: '1.6' }}>
              {currentSituation.situation}
            </p>
          )}
          <p style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
          SRS Level: {currentGrammar.srsLevel}
        </p>
      </div>

        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {currentSituation.wordBank && (
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                onClick={() => setShowWordBank(!showWordBank)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: showWordBank ? '#e5e7eb' : '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!showWordBank) e.currentTarget.style.background = '#e5e7eb'
                }}
                onMouseLeave={(e) => {
                  if (!showWordBank) e.currentTarget.style.background = '#f3f4f6'
                }}
              >
                <span>Word Bank</span>
                <span style={{ fontSize: '0.75rem', transform: showWordBank ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  ▼
                </span>
              </button>
              {showWordBank && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}>
                  <WordBankTable wordBank={currentSituation.wordBank} />
                </div>
              )}
          </div>
        )}
          {currentSituation && (
            <SentencePractice
              grammarPointId={currentGrammar.grammarPoint.id}
              situationId={currentSituation.id}
              grammarPointName={currentGrammar.grammarPoint.name}
              situation={currentSituation.situation}
              userId={user.id}
              onCorrect={handleCorrect}
              attemptType="review"
            />
          )}

        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={handleMarkAsMastered}
            className="btn-success"
            style={{ width: '100%' }}
          >
            ✓ Mark as Mastered (Move to Achievement Test)
          </button>
          <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
            If you feel you&apos;ve mastered this grammar point, click to move it to the achievement test.
          </p>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  )
}

function WordBankTable({ wordBank }: { wordBank: string }) {
  // Parse word bank - handle formats like:
  // "word1: meaning1, word2: meaning2"
  // "word1 - meaning1, word2 - meaning2"
  // "word1 (meaning1), word2 (meaning2)"
  const parseWordBank = (text: string): Array<{ japanese: string; meaning: string }> => {
    const entries: Array<{ japanese: string; meaning: string }> = []
    
    // Split by comma, but be careful with commas inside parentheses
    const parts = text.split(',').map(p => p.trim()).filter(p => p)
    
    for (const part of parts) {
      // Try different separators
      let japanese = ''
      let meaning = ''
      
      if (part.includes(':')) {
        const [jp, ...meanParts] = part.split(':')
        japanese = jp.trim()
        meaning = meanParts.join(':').trim()
      } else if (part.includes(' - ')) {
        const [jp, mean] = part.split(' - ')
        japanese = jp.trim()
        meaning = mean.trim()
      } else if (part.includes('(') && part.includes(')')) {
        const match = part.match(/^(.+?)\s*\((.+?)\)$/)
        if (match) {
          japanese = match[1].trim()
          meaning = match[2].trim()
        }
      } else {
        // If no clear separator, treat the whole thing as Japanese
        japanese = part
        meaning = ''
      }
      
      if (japanese) {
        entries.push({ japanese, meaning })
      }
    }
    
    return entries
  }

  const entries = parseWordBank(wordBank)

  if (entries.length === 0) {
    // Fallback: if parsing fails, just show the original text
    return <div>{wordBank}</div>
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {entries.map((entry, index) => (
          <tr key={index} style={{ borderBottom: index < entries.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
            <td style={{ 
              padding: '0.5rem 0.75rem 0.5rem 0', 
              fontWeight: 'bold',
              verticalAlign: 'top',
              width: '40%'
            }}>
              {entry.japanese}
            </td>
            <td style={{ 
              padding: '0.5rem 0', 
              verticalAlign: 'top',
              color: '#4b5563'
            }}>
              {entry.meaning || '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

