import { GoogleGenerativeAI, BlockReason } from '@google/generative-ai'
import { buildEvaluationPrompt, type SentenceEvaluation } from './openai'

let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY?.trim()
    if (!key) {
      throw new Error('GEMINI_API_KEY is not set')
    }
    genAI = new GoogleGenerativeAI(key)
  }
  return genAI
}

export async function evaluateSentenceWithGemini(
  grammarPoint: string,
  situation: string,
  userSentence: string
): Promise<SentenceEvaluation> {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new Error('GEMINI_API_KEY is not set in environment variables')
  }

  const prompt = buildEvaluationPrompt(grammarPoint, situation, userSentence)
  const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-1.5-flash'

  try {
    const model = getGenAI().getGenerativeModel({
      model: modelName,
      systemInstruction:
        'You are a helpful Japanese grammar teacher. Always respond with valid JSON only, matching the requested schema.',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    })

    const result = await model.generateContent(prompt)
    const response = result.response

    const blockReason = response.promptFeedback?.blockReason
    if (
      blockReason !== undefined &&
      blockReason !== BlockReason.BLOCKED_REASON_UNSPECIFIED
    ) {
      throw new Error(`Gemini blocked the request: ${blockReason}`)
    }

    const content = response.text()
    if (!content?.trim()) {
      throw new Error('No response from Gemini')
    }

    const evaluation = JSON.parse(content) as SentenceEvaluation

    if (typeof evaluation.isCorrect !== 'boolean' || !evaluation.feedback) {
      throw new Error('Invalid evaluation format from Gemini')
    }

    return evaluation
  } catch (error: unknown) {
    console.error('Error evaluating sentence (Gemini):', error)

    let errorMessage = 'Failed to evaluate sentence with Gemini'

    if (error instanceof Error) {
      errorMessage = error.message
    }

    const msg = String(errorMessage).toLowerCase()
    if (msg.includes('api key') || msg.includes('401') || msg.includes('permission')) {
      errorMessage = 'Gemini API key is invalid or missing'
    } else if (msg.includes('429') || msg.includes('resource exhausted')) {
      errorMessage = 'Gemini API rate limit exceeded. Please try again later.'
    } else if (msg.includes('503') || msg.includes('overloaded') || msg.includes('unavailable')) {
      errorMessage = 'Gemini API is temporarily unavailable. Please try again later.'
    } else if (msg.includes('fetch failed') || msg.includes('enotfound') || msg.includes('econnrefused')) {
      errorMessage = 'Cannot connect to Gemini API. Check your internet connection.'
    } else if (error instanceof SyntaxError) {
      errorMessage = 'Failed to parse Gemini response. Please try again.'
    }

    throw new Error(errorMessage)
  }
}
