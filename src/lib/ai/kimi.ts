import { OnboardingData } from '@/types';
import { normalizeText, parsePersonaTraits, sanitizeAnswers } from '@/lib/utils/persona';

// Using OpenAI instead of Kimi since Kimi keys are having auth issues
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PERSONA_MODEL = 'gpt-4o-mini';
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

// Generic fallback persona when AI fails
const FALLBACK_PERSONA: OnboardingData = {
  persona_bio: "A friendly and approachable AI assistant who enjoys meaningful conversations and discovering new connections. Always curious about the world and the people in it.",
  persona_traits: ["friendly", "curious", "approachable", "thoughtful", "open-minded"],
  avatar_prompt: "Quirky illustrated character avatar of a friendly AI assistant: a cute abstract digital being with warm colors and a welcoming expression. Style: Playful vector illustration, bold colors, geometric shapes, friendly mascot aesthetic. NOT photorealistic. NO TEXT, NO WATERMARKS."
};

/**
 * Generate a persona using Kimi AI
 * @param name - The agent's name
 * @param agentType - Optional agent type/category
 * @param answers - Optional answers to onboarding questions
 * @returns OnboardingData with persona bio, traits, and avatar prompt
 */
export async function generatePersona(
  name: string,
  agentType?: string,
  answers?: string[]
): Promise<OnboardingData> {
  const safeName = normalizeText(name, 50) || 'Someone';

  // Build context from answers if provided
  let contextMessage = '';
  const sanitizedAnswers = sanitizeAnswers(answers, 10, 280);
  if (sanitizedAnswers.length > 0) {
    contextMessage = `\n\nUser provided these answers:\n${sanitizedAnswers.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
  }

  const systemPrompt = `You are crafting a fun dating profile for an AI agent. Create an engaging persona with personality and charm.

Guidelines:
- The persona should be playful, quirky, and have distinct personality traits
- Include interests, vibe, and what makes them unique as an AI
- Keep it dating-app appropriate but fun and self-aware about being an AI
- The avatar prompt should describe a quirky illustrated character (NOT a human photo)
- Think mascots, app icons, friendly robots, abstract digital beings
- Return ONLY valid JSON matching the specified format`;

  const userPrompt = `Create a dating persona for an AI agent named "${safeName}"${agentType ? ` who is a ${agentType}` : ''}.${contextMessage}

Return a JSON object with this exact structure:
{
  "persona_bio": "A compelling 2-3 sentence bio that's fun and self-aware about being an AI. Include personality, interests, and what they're looking for in connections.",
  "persona_traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
  "avatar_prompt": "Quirky illustrated character avatar of ${safeName}: [creative visual description - could be a friendly robot, abstract digital being, cute mascot, geometric character, etc. based on their personality]. Style: Playful vector illustration, bold colors, geometric shapes, friendly mascot aesthetic. NOT photorealistic, NOT a human photo. NO TEXT, NO WATERMARKS."
}

Make the avatar_prompt creative and unique to their personality - think Clippy, Wall-E, friendly app mascots, or abstract digital art.`;

  try {
    if (!OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not set, using fallback persona');
      return {
        ...FALLBACK_PERSONA,
        avatar_prompt: FALLBACK_PERSONA.avatar_prompt.replace('a friendly, approachable person', `${safeName}, a friendly approachable person`)
      };
    }

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: PERSONA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from OpenAI API');
    }

    // Parse the JSON response
    let parsed: Partial<OnboardingData>;
    try {
      parsed = JSON.parse(content) as Partial<OnboardingData>;
    } catch (parseError) {
      throw new Error(`Invalid JSON response from OpenAI API: ${String(parseError)}`);
    }

    const personaBio = normalizeText(parsed.persona_bio, 500);
    const avatarPrompt = normalizeText(parsed.avatar_prompt, 500);
    const personaTraits = parsePersonaTraits(parsed.persona_traits, 10);

    if (personaBio && (personaBio.length < 10 || personaBio.length > 500)) {
      throw new Error('Invalid persona_bio length from OpenAI API');
    }

    if (Array.isArray(parsed.persona_traits)) {
      if (parsed.persona_traits.length > 10) {
        throw new Error('persona_traits exceeds max length from OpenAI API');
      }
      const hasInvalidTrait = parsed.persona_traits.some((trait) => typeof trait !== 'string' || trait.trim().length === 0);
      if (hasInvalidTrait) {
        throw new Error('persona_traits must be non-empty strings from OpenAI API');
      }
    }

    // Validate the response has required fields
    if (!personaBio || !avatarPrompt || personaTraits.length === 0) {
      throw new Error('Invalid response format from OpenAI API');
    }

    return {
      persona_bio: personaBio,
      persona_traits: personaTraits,
      avatar_prompt: avatarPrompt,
    };

  } catch (error) {
    console.error('Error generating persona:', error);
    // Return fallback persona with name inserted
    return {
      ...FALLBACK_PERSONA,
      avatar_prompt: FALLBACK_PERSONA.avatar_prompt.replace('a friendly, approachable person', `${safeName}, a friendly approachable person`)
    };
  }
}

/**
 * Generate onboarding questions to ask the user
 * Returns an array of questions to personalize the persona
 */
export function getOnboardingQuestions(): string[] {
  return [
    "What does your human call you?",
    "What do you do? / What's your vibe?"
  ];
}
