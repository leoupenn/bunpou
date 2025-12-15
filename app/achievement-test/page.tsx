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
}

export default function AchievementTestPage() {
  const { user } = useUser()
  const [grammarPoints, setGrammarPoints] = useState<GrammarProgress[]>([])
  const [selectedGrammarProgress, setSelectedGrammarProgress] = useState<GrammarProgress | null>(null)
  const [currentTestIndex, setCurrentTestIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [testSituations, setTestSituations] = useState<Situation[]>([])

  const fetchAchievementTests = () => {
    if (!user) return
    fetch(`/api/achievement-test?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        setGrammarPoints(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching achievement tests:', err)
        setLoading(false)
      })
  }

  useEffect(() => {
    if (user) {
      fetchAchievementTests()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleResult = (isCorrect: boolean) => {
    const newResults = [...results, isCorrect]
    setResults(newResults)
    console.log(`Test ${currentTestIndex + 1}/5: ${isCorrect ? 'Correct' : 'Incorrect'}. Results:`, newResults)

    const correctCount = newResults.filter((r) => r).length
    const wrongCount = newResults.filter((r) => !r).length
    const maxTests = testSituations.length > 0 ? testSituations.length : 5

    // Early termination: 3 correct = pass, 3 wrong = fail
    if (correctCount >= 3) {
      // Passed early with 3 correct
      console.log('Passed early with 3 correct answers. Submitting results...', newResults)
      submitAchievementTest(newResults, true)
    } else if (wrongCount >= 3) {
      // Failed early with 3 wrong (can't reach 3 correct anymore)
      console.log('Failed early with 3 wrong answers. Submitting results...', newResults)
      submitAchievementTest(newResults, false)
    } else if (currentTestIndex < maxTests - 1) {
      // Move to next test (same grammar point), no repetition within this session
      setCurrentTestIndex(currentTestIndex + 1)
    } else {
      // Completed all tests for this session, submit results
      console.log(`All ${maxTests} tests completed. Submitting results...`, newResults)
      submitAchievementTest(newResults, correctCount >= 3)
    }
  }

  const handleSelectGrammarPoint = (grammarProgress: GrammarProgress) => {
    setSelectedGrammarProgress(grammarProgress)
    setCurrentTestIndex(0)
    setResults([])
    setCompleted(false)

    // Prepare randomized, non-repeating situations for this test session
    const allSituations = grammarProgress.grammarPoint.situations || []
    if (allSituations.length === 0) {
      setTestSituations([])
      return
    }

    // Shuffle situations
    const shuffled = [...allSituations].sort(() => Math.random() - 0.5)

    // We want between 3 and 5 tests total
    const desiredTests = Math.min(5, Math.max(3, shuffled.length))

    // Build test sequence: use all unique situations first, then repeat from the start if needed
    const sequence: Situation[] = []
    let i = 0
    while (sequence.length < desiredTests) {
      sequence.push(shuffled[i % shuffled.length])
      i++
    }

    setTestSituations(sequence)
  }

  const handleBackToSelection = () => {
    setSelectedGrammarProgress(null)
    setCurrentTestIndex(0)
    setResults([])
    setCompleted(false)
    setTestSituations([])
    fetchAchievementTests() // Refresh the list
  }

  const submitAchievementTest = async (finalResults: boolean[], isMastered: boolean) => {
    if (!selectedGrammarProgress || !user || submitting) return

    setSubmitting(true)
    const correctCount = finalResults.filter((r) => r).length
    const totalTests = finalResults.length

    try {
      console.log('Submitting achievement test:', {
        userId: user.id,
        grammarProgressId: selectedGrammarProgress.id,
        results: finalResults,
        correctCount,
        totalTests,
        isMastered,
      })

      const response = await fetch('/api/achievement-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          grammarProgressId: selectedGrammarProgress.id,
          results: finalResults,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Achievement test response:', data)

      if (data.isMastered) {
        setCompleted(true)
        // Refresh the list after a delay
        setTimeout(() => {
          fetchAchievementTests()
          handleBackToSelection()
        }, 3000)
      } else {
        // Not mastered, reset and try again
        const earlyTermination = totalTests < 5
        const message = earlyTermination
          ? `You got ${correctCount}/${totalTests} correct, but had 3 wrong answers. Need 3 correct to master. Try again!`
          : `You got ${correctCount}/5 correct. Need 3/5 to master. Try again!`
        alert(message)
        setCurrentTestIndex(0)
        setResults([])
      }
    } catch (error) {
      console.error('Error submitting achievement test:', error)
      alert(`Error submitting test: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setSubmitting(false)
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
        <h1>Achievement Test</h1>
        <p>Loading...</p>
      </div>
      </ProtectedRoute>
    )
  }

  // Selection screen - show if no grammar point is selected
  if (!selectedGrammarProgress) {
    return (
      <ProtectedRoute>
        <div className="container">
          <Link href="/" style={{ marginBottom: '1rem', display: 'inline-block' }}>
            ← Back to Home
          </Link>
          <h1>Achievement Test</h1>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Select a grammar point to take its achievement test. You need to get 3 correct to master it. The test will end early if you get 3 correct (pass) or 3 wrong (fail).
          </p>

          {grammarPoints.length === 0 ? (
            <div className="card">
              <p>No grammar points ready for achievement test.</p>
              <p style={{ marginTop: '0.5rem' }}>
                Mark grammar points as mastered in the Learning Workflow or Level Review to add them here.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
                marginTop: '1.5rem',
              }}
            >
              {grammarPoints.map((gp) => (
                <div
                  key={gp.id}
                  onClick={() => handleSelectGrammarPoint(gp)}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    padding: '1.5rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    border: '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem', fontWeight: 'bold' }}>
                    {gp.grammarPoint.name}
                  </h3>
                  <p style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                    {gp.grammarPoint.description}
                  </p>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    {gp.grammarPoint.situations.length} situation{gp.grammarPoint.situations.length !== 1 ? 's' : ''} available
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ProtectedRoute>
    )
  }

  const currentGrammar = selectedGrammarProgress
  const situations = currentGrammar?.grammarPoint.situations || []
  const currentSituation = testSituations[currentTestIndex] || null

  if (completed) {
    return (
      <ProtectedRoute>
        <div className="container">
          <Link href="/" style={{ marginBottom: '1rem', display: 'inline-block' }}>
            ← Back to Home
          </Link>
          <h1>Achievement Test</h1>
          <div className="card">
            <div className="feedback correct">
              <h2>🎉 Congratulations!</h2>
              <p>You&apos;ve mastered {currentGrammar?.grammarPoint.name}!</p>
              <p style={{ marginTop: '0.5rem' }}>
                This grammar point has been set to SRS level 6 (mastered).
              </p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                Returning to selection...
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <Link href="/" style={{ display: 'inline-block' }}>
            ← Back to Home
          </Link>
          <button
            onClick={handleBackToSelection}
            className="btn-secondary"
            style={{ fontSize: '0.875rem' }}
          >
            ← Back to Selection
          </button>
        </div>
        <h1>Achievement Test</h1>
        <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '0.375rem' }}>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Grammar Point:</strong> {currentGrammar.grammarPoint.name} | <strong>Test:</strong> {currentTestIndex + 1} / 5
            {results.length > 0 && results.length < 5 && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#059669', fontWeight: 600 }}>
                (Early termination possible)
              </span>
            )}
          </p>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Progress:</strong> {results.filter(r => r).length} correct, {results.filter(r => !r).length} wrong out of {results.length} completed
          </p>
          <p style={{ fontSize: '0.875rem', color: '#666' }}>
            You need to get 3 correct to master this grammar point. The test will end early if you get 3 correct (pass) or 3 wrong (fail).
          </p>
          {submitting && (
            <p style={{ marginTop: '0.5rem', color: '#059669', fontWeight: 'bold' }}>
              Submitting results...
            </p>
          )}
          <button
            onClick={async () => {
              if (!user) return
              try {
                const response = await fetch(`/api/grammar/${currentGrammar.grammarPoint.id}/return-to-review`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ userId: user.id }),
                })

                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                  throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
                }

                alert('Moved back to Level Review.')
                handleBackToSelection()
              } catch (error) {
                console.error('Error moving back to review:', error)
                alert(`Error moving back to review: ${error instanceof Error ? error.message : 'Please try again.'}`)
              }
            }}
            className="btn-secondary"
            style={{ marginTop: '0.75rem', fontSize: '0.875rem', width: '100%' }}
          >
            ← Move Back to Level Review
          </button>
        </div>

      {!currentSituation ? (
        <div className="card">
          <p>No situations available for this grammar point.</p>
        </div>
      ) : (
        <div className="card">
          <h2>{currentGrammar.grammarPoint.name}</h2>
          <p style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            <strong>Situation:</strong> {currentSituation.situation}
          </p>
          {currentSituation.wordBank && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f3f4f6', borderRadius: '0.375rem' }}>
              <strong>Word Bank:</strong> {currentSituation.wordBank}
            </div>
          )}

          <SentencePractice
            key={`${currentGrammar.grammarPoint.id}-${currentTestIndex}`}
            grammarPointId={currentGrammar.grammarPoint.id}
            situationId={currentSituation.id}
            grammarPointName={currentGrammar.grammarPoint.name}
            situation={currentSituation.situation}
            userId={user.id}
            onCorrect={() => handleResult(true)}
            onIncorrect={() => handleResult(false)}
            attemptType="achievement_test"
            showFeedback={true}
          />
        </div>
      )}
      </div>
    </ProtectedRoute>
  )
}

