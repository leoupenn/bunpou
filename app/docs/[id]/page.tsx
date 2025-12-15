'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

interface Situation {
  id: string
  lessonNumber: number
  situation: string
  wordBank: string
  difficulty: number
}

interface GrammarPoint {
  id: string
  name: string
  description: string
  referenceUrl: string | null
  group: number
  jlptLevel: string
  situations: Situation[]
}

export default function GrammarDocsPage({
  params,
}: {
  params: { id: string }
}) {
  const { user } = useUser()
  const [grammarPoint, setGrammarPoint] = useState<GrammarPoint | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    
    fetch(`/api/grammar/${params.id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch grammar point')
        }
        return res.json()
      })
      .then((data) => {
        setGrammarPoint(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching grammar point:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [user, params.id])

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
          <h1>Grammar Documentation</h1>
          <p>Loading...</p>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !grammarPoint) {
    return (
      <ProtectedRoute>
        <div className="container">
          <Link href="/" style={{ marginBottom: '1rem', display: 'inline-block' }}>
            ← Back to Home
          </Link>
          <h1>Grammar Documentation</h1>
          <div className="card">
            <p>Error loading grammar point: {error || 'Grammar point not found'}</p>
            <Link href="/" style={{ display: 'inline-block', marginTop: '1rem' }}>
              <button className="btn-primary">Back to Home</button>
            </Link>
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
        <h1>Grammar Documentation</h1>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ marginBottom: '0.5rem', fontSize: '2rem' }}>{grammarPoint.name}</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  JLPT Level: {grammarPoint.jlptLevel}
                </span>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Group: {grammarPoint.group}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f3f4f6', borderRadius: '0.375rem' }}>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem' }}>Description</h3>
            <p style={{ lineHeight: '1.6', fontSize: '1rem' }}>{grammarPoint.description}</p>
          </div>

          {grammarPoint.referenceUrl && (
            <div style={{ marginBottom: '1.5rem' }}>
              <a
                href={grammarPoint.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  background: '#6366f1',
                  color: 'white',
                  borderRadius: '0.375rem',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                View External Reference →
              </a>
            </div>
          )}

          <div>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>
              Situations ({grammarPoint.situations.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {grammarPoint.situations.map((situation, index) => (
                <div
                  key={situation.id}
                  style={{
                    padding: '1rem',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>
                      Situation {situation.lessonNumber}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Difficulty: {situation.difficulty}
                    </span>
                  </div>
                  <p style={{ marginBottom: '0.75rem', lineHeight: '1.6' }}>
                    {situation.situation}
                  </p>
                  {situation.wordBank && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '0.375rem' }}>
                      <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        Word Bank:
                      </strong>
                      <WordBankTable wordBank={situation.wordBank} />
                    </div>
                  )}
                </div>
              ))}
            </div>
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
    return <div style={{ fontSize: '0.875rem' }}>{wordBank}</div>
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
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
