import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set')
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
    return evaluation
  } catch (error) {
    console.error('Error evaluating sentence:', error)
    throw new Error('Failed to evaluate sentence')
  }
}

