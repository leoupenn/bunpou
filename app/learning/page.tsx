'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SentencePractice from '@/components/SentencePractice'
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
  unlockedSituationNumber?: number
  lastSituationId?: string | null
}

export default function LearningPage() {
  const { user } = useUser()
  const [grammarPoints, setGrammarPoints] = useState<GrammarProgress[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentSituationIndex, setCurrentSituationIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetch(`/api/grammar?userId=${user.id}&status=new`)
      .then((res) => res.json())
      .then((data) => {
        setGrammarPoints(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching grammar points:', err)
        setLoading(false)
      })
  }, [user])

  const handleCorrect = () => {
    const currentGrammar = grammarPoints[currentIndex]
    const situations = currentGrammar.grammarPoint.situations || []
    
    // For new grammar points, only first situation is available
    // After completing it, move to next grammar point
    // The attempt route will unlock the next situation when progress is created
    if (currentIndex < grammarPoints.length - 1) {
      // Move to next grammar point
      setCurrentIndex(currentIndex + 1)
      setCurrentSituationIndex(0) // Always use first situation for new grammar points
    } else {
      // All done - refresh to get updated list
      fetch(`/api/grammar?userId=${user?.id}&status=new`)
        .then((res) => res.json())
        .then((data) => {
          setGrammarPoints(data)
          setCurrentIndex(0)
          setCurrentSituationIndex(0)
        })
        .catch((err) => {
          console.error('Error fetching grammar points:', err)
        })
    }
  }

  const handleMarkAsMastered = async () => {
    const currentGrammar = grammarPoints[currentIndex]
    try {
      if (!user) return
      const response = await fetch(`/api/grammar/${currentGrammar.grammarPoint.id}/master`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      if (response.ok) {
        // Remove from current list and move to next
        const remaining = grammarPoints.filter((_, i) => i !== currentIndex)
        setGrammarPoints(remaining)
        if (remaining.length > 0) {
          setCurrentIndex(Math.min(currentIndex, remaining.length - 1))
        }
      } else {
        alert('Error moving to achievement test. Please try again.')
      }
    } catch (error) {
      console.error('Error marking as mastered:', error)
      alert('Error marking as mastered. Please try again.')
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
        <h1>Learning Workflow</h1>
        <p>Loading...</p>
      </div>
      </ProtectedRoute>
    )
  }

  if (grammarPoints.length === 0) {
    return (
      <div className="container">
        <h1>Learning Workflow</h1>
        <div className="card">
          <p>No new grammar points to learn. Great job!</p>
          <Link href="/" style={{ display: 'inline-block', marginTop: '1rem' }}>
            <button className="btn-primary">Back to Home</button>
          </Link>
        </div>
      </div>
    )
  }

  const currentGrammar = grammarPoints[currentIndex]
  const situations = currentGrammar.grammarPoint.situations || []
  // For new grammar points, only show first situation (lessonNumber 1)
  const currentSituation = situations.find((s) => s.lessonNumber === 1) || situations[0]

  if (!currentSituation) {
    return (
      <ProtectedRoute>
        <div className="container">
          <h1>Learning Workflow</h1>
          <div className="card">
            <p>No situations available for this grammar point.</p>
          </div>
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
      <h1>Learning Workflow</h1>
      <p style={{ marginBottom: '1rem' }}>
        Grammar Point: {currentIndex + 1} / {grammarPoints.length} | 
        Situation: {currentSituationIndex + 1} / {situations.length}
      </p>

      <div className="card">
        <h2>{currentGrammar.grammarPoint.name}</h2>
        <p style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
          {currentGrammar.grammarPoint.description}
        </p>
        {currentGrammar.grammarPoint.referenceUrl && (
          <a
            href={currentGrammar.grammarPoint.referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              background: '#6366f1',
              color: 'white',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
            }}
          >
            View Reference Document →
          </a>
        )}
        {currentSituation.wordBank && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f3f4f6', borderRadius: '0.375rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Word Bank:</strong>
              <WordBankTable wordBank={currentSituation.wordBank} />
          </div>
        )}

        <SentencePractice
          grammarPointId={currentGrammar.grammarPoint.id}
          situationId={currentSituation.id}
          grammarPointName={currentGrammar.grammarPoint.name}
          situation={currentSituation.situation}
            userId={user.id}
          onCorrect={handleCorrect}
          attemptType="practice"
        />

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

