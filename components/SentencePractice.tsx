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
    if (!sentence.trim()) {
      console.log('Sentence is empty, not submitting')
      return
    }

    console.log('Submitting sentence:', { grammarPointId, situationId, attemptType, sentenceLength: sentence.length })
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

      console.log('Response status:', response.status, response.ok)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API error:', errorData)
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || `HTTP error! status: ${response.status}`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('Response data:', data)

      if (data.evaluation) {
        setFeedback({
          isCorrect: data.evaluation.isCorrect,
          message: data.evaluation.feedback,
          hints: data.evaluation.hints,
          corrections: data.evaluation.corrections,
        })
        console.log('Feedback set:', data.evaluation.isCorrect ? 'Correct' : 'Incorrect')
      } else {
        console.error('No evaluation in response:', data)
        setFeedback({
          isCorrect: false,
          message: 'Error: No evaluation received. Please try again.',
        })
      }
    } catch (error) {
      console.error('Error submitting sentence:', error)
      setFeedback({
        isCorrect: false,
        message: `Error evaluating sentence: ${error instanceof Error ? error.message : 'Please try again.'}`,
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
      <form 
        onSubmit={(e) => {
          console.log('Form onSubmit triggered')
          handleSubmit(e)
        }}
      >
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
          style={{ 
            marginTop: '1rem', 
            width: '100%', 
            padding: '0.75rem 1.5rem', 
            fontSize: '1rem',
            opacity: (loading || !sentence.trim()) ? 0.6 : 1,
            cursor: (loading || !sentence.trim()) ? 'not-allowed' : 'pointer'
          }}
          onClick={(e) => {
            console.log('Submit button clicked', { 
              loading, 
              hasSentence: !!sentence.trim(), 
              sentenceLength: sentence.length,
              disabled: loading || !sentence.trim()
            })
          }}
        >
          {loading ? (
            <>
              <span className="loading" /> Submitting...
            </>
          ) : (
            'Submit Answer'
          )}
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

