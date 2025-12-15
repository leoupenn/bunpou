'use client'

import { useState, useEffect } from 'react'

interface SentencePracticeProps {
  grammarPointId: string
  situationId?: string
  grammarPointName: string
  situation: string
  userId: string
  onCorrect: () => void
  onIncorrect?: () => void
  attemptType: 'practice' | 'review' | 'achievement_test'
  showFeedback?: boolean
}

export default function SentencePractice({
  grammarPointId,
  situationId,
  grammarPointName,
  situation,
  userId,
  onCorrect,
  onIncorrect,
  attemptType,
  showFeedback = false,
}: SentencePracticeProps) {
  const [sentence, setSentence] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean
    message: string
    hints?: string
    corrections?: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sentence.trim()) return

    setLoading(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/attempt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          grammarPointId,
          situationId,
          userSentence: sentence,
          attemptType,
        }),
      })

      const data = await response.json()

      if (data.evaluation) {
        setFeedback({
          isCorrect: data.evaluation.isCorrect,
          message: data.evaluation.feedback,
          hints: data.evaluation.hints,
          corrections: data.evaluation.corrections,
        })

        // Don't auto-advance - user must click Continue or press Enter
      }
    } catch (error) {
      console.error('Error submitting sentence:', error)
      setFeedback({
        isCorrect: false,
        message: 'Error evaluating sentence. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    if (feedback) {
      setLoading(false)
      setSentence('')
      setFeedback(null)
      
      if (feedback.isCorrect && onCorrect) {
        onCorrect()
      } else if (!feedback.isCorrect && onIncorrect) {
        onIncorrect()
      }
    }
  }

  // Handle Enter key to continue after feedback
  useEffect(() => {
    if (!feedback) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        setLoading(false)
        setSentence('')
        const currentFeedback = feedback
        setFeedback(null)
        
        if (currentFeedback.isCorrect && onCorrect) {
          onCorrect()
        } else if (!currentFeedback.isCorrect && onIncorrect) {
          onIncorrect()
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [feedback, onCorrect, onIncorrect])

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea
          className="input"
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder="Type your sentence in Japanese..."
          rows={4}
          disabled={loading || !!feedback}
          style={{ fontSize: '1.125rem', padding: '1rem' }}
          autoFocus={!feedback}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !sentence.trim()}
          style={{ marginTop: '1rem', width: '100%', padding: '0.75rem 1.5rem', fontSize: '1rem' }}
        >
          {loading ? <span className="loading" /> : 'Submit Answer'}
        </button>
      </form>

      {feedback && (
        <div className={`feedback ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
          <p><strong>{feedback.isCorrect ? '✓ Correct!' : '✗ Incorrect'}</strong></p>
          <p style={{ marginTop: '0.5rem' }}>{feedback.message}</p>
          {feedback.hints && (
            <p style={{ marginTop: '0.5rem' }}>
              <strong>Hint:</strong> {feedback.hints}
            </p>
          )}
          {feedback.corrections && (
            <p style={{ marginTop: '0.5rem' }}>
              <strong>Correction:</strong> {feedback.corrections}
            </p>
          )}
          <button
            onClick={handleContinue}
            className="btn-primary"
            style={{ marginTop: '1rem', width: '100%' }}
            autoFocus
          >
            {feedback.isCorrect ? 'Continue' : attemptType === 'achievement_test' ? 'Continue to Next Test' : 'Continue'}
          </button>
          <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>
            Press Enter to continue
          </p>
        </div>
      )}
    </div>
  )
}

