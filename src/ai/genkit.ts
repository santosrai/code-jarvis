import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Ensure we have an API key
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.warn('Missing API key: AI features will be limited. Please set GEMINI_API_KEY or GOOGLE_API_KEY environment variable');
}

export const ai = apiKey ? genkit({
  plugins: [googleAI({
    apiKey: apiKey
  })],
  model: 'googleai/gemini-2.0-flash',
}) : null;