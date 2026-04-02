import { evaluateSentenceWithOpenAI, type SentenceEvaluation } from './openai'
import { evaluateSentenceWithGemini } from './gemini'

export type { SentenceEvaluation }

/**
 * Evaluates a sentence using OpenAI when configured; on failure (or if only Gemini is configured),
 * falls back to Google Gemini when GEMINI_API_KEY is set.
 */
export async function evaluateSentence(
  grammarPoint: string,
  situation: string,
  userSentence: string
): Promise<SentenceEvaluation> {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim())
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim())

  if (!hasOpenAI && !hasGemini) {
    throw new Error(
      'No AI provider configured: set OPENAI_API_KEY and/or GEMINI_API_KEY in environment variables'
    )
  }

  let openAIError: Error | null = null

  if (hasOpenAI) {
    try {
      return await evaluateSentenceWithOpenAI(grammarPoint, situation, userSentence)
    } catch (err: unknown) {
      openAIError = err instanceof Error ? err : new Error(String(err))
      console.error('[sentence-evaluation] OpenAI failed:', openAIError.message)
      if (!hasGemini) {
        throw openAIError
      }
    }
  }

  try {
    return await evaluateSentenceWithGemini(grammarPoint, situation, userSentence)
  } catch (geminiErr: unknown) {
    const geminiError = geminiErr instanceof Error ? geminiErr : new Error(String(geminiErr))
    console.error('[sentence-evaluation] Gemini failed:', geminiError.message)
    if (openAIError) {
      throw new Error(
        `OpenAI failed (${openAIError.message}); Gemini fallback failed (${geminiError.message})`
      )
    }
    throw geminiError
  }
}
