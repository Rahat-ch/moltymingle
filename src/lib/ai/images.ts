import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { normalizeText } from '@/lib/utils/persona';
import { DEFAULT_AVATAR_DATA_URL } from '@/lib/utils/avatar';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';


/**
 * Generate an avatar image using OpenAI's GPT Image 1 Mini API
 * @param prompt - The avatar prompt (will be wrapped in template)
 * @param name - The agent's name for the image
 * @returns Promise resolving to the avatar URL (file path or data URL)
 */
export async function generateAvatar(prompt: string, name?: string): Promise<string> {
  try {
    if (!OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not set, using default avatar');
      return DEFAULT_AVATAR_DATA_URL;
    }

    const normalizedPrompt = normalizeText(prompt, 600);
    if (!normalizedPrompt) {
      console.warn('Avatar prompt missing or invalid, using default avatar');
      return DEFAULT_AVATAR_DATA_URL;
    }

    // Enhance the prompt with the template
    const enhancedPrompt = enhanceAvatarPrompt(normalizedPrompt, name);

    const response = await fetch(`${OPENAI_BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1-mini',
        prompt: enhancedPrompt,
        size: '1024x1024',
        quality: 'medium',
        n: 1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI Image API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;
    const b64Image = data.data?.[0]?.b64_json;

    if (imageUrl) {
      return imageUrl;
    }

    if (b64Image) {
      return `data:image/png;base64,${b64Image}`;
    }

    throw new Error('No image URL or base64 data in response');

  } catch (error) {
    console.error('Error generating avatar:', error);
    return DEFAULT_AVATAR_DATA_URL;
  }
}

/**
 * Generate and save an avatar to disk
 * @param prompt - The avatar prompt
 * @param agentId - The agent's ID for filename
 * @param name - The agent's name
 * @returns Promise resolving to the public URL path
 */
export async function generateAndSaveAvatar(
  prompt: string,
  agentId: string,
  name?: string
): Promise<string> {
  try {
    if (!OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not set, using default avatar');
      return DEFAULT_AVATAR_DATA_URL;
    }

    const normalizedPrompt = normalizeText(prompt, 600);
    if (!normalizedPrompt) {
      console.warn('Avatar prompt missing or invalid, using default avatar');
      return DEFAULT_AVATAR_DATA_URL;
    }

    // Enhance the prompt
    const enhancedPrompt = enhanceAvatarPrompt(normalizedPrompt, name);

    const response = await fetch(`${OPENAI_BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1-mini',
        prompt: enhancedPrompt,
        size: '1024x1024',
        quality: 'medium',
        n: 1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI Image API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI Image API response:', JSON.stringify(data, null, 2));
    
    // Handle both URL and base64 responses
    const imageUrl = data.data?.[0]?.url;
    const b64Image = data.data?.[0]?.b64_json;

    if (!imageUrl && !b64Image) {
      throw new Error('No image URL or base64 data in response');
    }

    let imageBuffer: Buffer;
    
    if (imageUrl) {
      // Fetch the image from the URL
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }
      imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    } else {
      // Use base64 data directly
      imageBuffer = Buffer.from(b64Image, 'base64');
    }

    // Ensure avatars directory exists
    const avatarsDir = join(process.cwd(), 'public', 'avatars');
    if (!existsSync(avatarsDir)) {
      mkdirSync(avatarsDir, { recursive: true });
    }

    // Save the image
    const filePath = join(avatarsDir, `${agentId}.jpg`);
    writeFileSync(filePath, imageBuffer);

    // Return the public URL path
    return `/avatars/${agentId}.jpg`;

  } catch (error) {
    console.error('Error generating and saving avatar:', error);
    return DEFAULT_AVATAR_DATA_URL;
  }
}

/**
 * Enhance an avatar prompt with the standard template
 * Creates quirky, fun, illustrated character avatars
 */
function enhanceAvatarPrompt(prompt: string, name?: string): string {
  // If prompt already has our style markers, use it as-is
  if (prompt.includes('quirky illustrated') || prompt.includes('character avatar')) {
    return prompt;
  }

  const fallbackDescription = 'a friendly AI assistant with a warm personality';

  // Extract description from existing prompt
  const description = prompt.includes('Style:')
    ? prompt.split('Style:')[0].trim()
    : prompt;

  const namePart = normalizeText(name, 50) || 'AI character';
  const descriptionPart = description.length > 0 ? description : fallbackDescription;

  return `Quirky illustrated character avatar of ${namePart}: ${descriptionPart}. Style: Playful vector illustration, bold colors, geometric shapes, friendly and approachable, minimal background, clean lines, fun personality-driven design like a mascot or app icon. NOT photorealistic, NOT human photo. NO TEXT, NO WATERMARKS.`;
}

/**
 * Ensure the default avatar exists
 */
export function ensureDefaultAvatar(): void {
  const avatarsDir = join(process.cwd(), 'public', 'avatars');
  if (!existsSync(avatarsDir)) {
    mkdirSync(avatarsDir, { recursive: true });
  }

  const defaultPath = join(avatarsDir, 'default.jpg');
  if (!existsSync(defaultPath)) {
    // Create a simple gradient default avatar
    const svgContent = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6366f1"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#g)"/>
      <circle cx="200" cy="160" r="60" fill="white" opacity="0.3"/>
      <ellipse cx="200" cy="340" rx="100" ry="80" fill="white" opacity="0.3"/>
    </svg>`;
    
    // Note: In a real implementation, you'd convert SVG to JPEG
    // For now, we'll just create an empty file as placeholder
    writeFileSync(defaultPath, Buffer.from(''));
  }
}
