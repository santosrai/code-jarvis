
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-example-prompts.ts';
import '@/ai/flows/interpret-bio-commands.ts';
import '@/ai/flows/predict-protein-structure.ts';
import '@/ai/flows/generate-chat-response-flow.ts';
import '@/ai/tools/pubchem-tools.ts'; // Added new PubChem tools
