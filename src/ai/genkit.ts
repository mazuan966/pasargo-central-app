import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {config} from 'dotenv';
config();

// Use an empty API key to force Genkit to use Application Default Credentials.
// This is the standard way to authenticate in a secure Google Cloud environment like App Hosting.
export const ai = genkit({
  plugins: [googleAI({apiKey: ''})],
  model: 'googleai/gemini-2.0-flash',
});
