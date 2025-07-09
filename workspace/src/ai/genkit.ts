import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {config} from 'dotenv';
config();

export const ai = genkit({
  plugins: [googleAI()], // No API key here, will use Application Default Credentials from the service account
  model: 'googleai/gemini-2.0-flash',
});
