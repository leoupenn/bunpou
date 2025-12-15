import OpenAI from 'openai'

// Lazy initialization to avoid build-time errors
let openaiInstance: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set')
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiInstance
}

export interface SentenceEvaluation {
  isCorrect: boolean
  feedback: string
  hints?: string
  corrections?: string
}

export async function evaluateSentence(
  grammarPoint: string,
  situation: string,
  userSentence: string
): Promise<SentenceEvaluation> {
  // Check API key before making request
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables')
  }

  const prompt = `You are a Japanese grammar teacher evaluating a student's sentence.

Grammar Point: ${grammarPoint}
Situation: ${situation}
Student's Sentence: ${userSentence}

Please evaluate the sentence for:
1. Grammatical accuracy - is the grammar point used correctly?
2. Naturalness - does it sound natural in Japanese?
3. Appropriateness - does it fit the given situation?

Respond in JSON format:
{
  "isCorrect": boolean,
  "feedback": "detailed feedback in English explaining what's right or wrong",
  "hints": "helpful hints if incorrect (optional)",
  "corrections": "corrected version if incorrect (optional)"
}`

  try {
    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful Japanese grammar teacher. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const evaluation = JSON.parse(content) as SentenceEvaluation
    
    // Validate the evaluation has required fields
    if (typeof evaluation.isCorrect !== 'boolean' || !evaluation.feedback) {
      throw new Error('Invalid evaluation format from OpenAI')
    }
    
    return evaluation
  } catch (error: any) {
    console.error('Error evaluating sentence:', error)
    
    // Preserve original error message
    let errorMessage = 'Failed to evaluate sentence'
    
    if (error?.message) {
      errorMessage = error.message
    } else if (error?.error?.message) {
      errorMessage = error.error.message
    }
    
    // Handle specific OpenAI API errors
    if (error?.status === 401) {
      errorMessage = 'OpenAI API key is invalid or missing'
    } else if (error?.status === 429) {
      errorMessage = 'OpenAI API rate limit exceeded. Please try again later.'
    } else if (error?.status === 500 || error?.status === 503) {
      errorMessage = 'OpenAI API is temporarily unavailable. Please try again later.'
    } else if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to OpenAI API. Check your internet connection.'
    } else if (error instanceof SyntaxError) {
      errorMessage = 'Failed to parse OpenAI response. Please try again.'
    }
    
    throw new Error(errorMessage)
  }
}

