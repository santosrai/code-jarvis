'use server';
/**
 * @fileOverview A flow that suggests example prompts to new users.
 *
 * - suggestExamplePrompts - A function that returns a list of example prompts.
 * - SuggestExamplePromptsOutput - The return type for the suggestExamplePrompts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestExamplePromptsOutputSchema = z.object({
  prompts: z.array(z.string()).describe('A list of example prompts.'),
});
export type SuggestExamplePromptsOutput = z.infer<typeof SuggestExamplePromptsOutputSchema>;

export async function suggestExamplePrompts(): Promise<SuggestExamplePromptsOutput> {
  return suggestExamplePromptsFlow();
}

const prompt = ai.definePrompt({
  name: 'suggestExamplePromptsPrompt',
  output: {schema: SuggestExamplePromptsOutputSchema},
  prompt: `You are an AI assistant designed to suggest example prompts for a bioinformatics web application called BioAI CoPilot Lite. 
The application allows users to perform tasks such as protein data retrieval, structure prediction, and molecular docking.

Suggest top 5 diverse list of example prompts that showcase the capabilities of the application. 
Focus on prompts that are clear, concise, and easy for new users to understand. The prompts should cover a range of functionalities, including:

*   Finding information about proteins
*   Predicting protein structures
*   Performing molecular docking simulations
*   Visualizing molecular data
*   Uploading files

Return the prompts as a JSON array of strings.

Example:
{
  "prompts": [
    "Find human trypsin",
    "Fold P04637",
    "Dock caffeine into protein P12345",
    "Visualize uploaded PDB",
    "What is the SMILES for aspirin?"
  ]
}

Make sure to return valid JSON.
`,
});

const suggestExamplePromptsFlow = ai.defineFlow(
  {
    name: 'suggestExamplePromptsFlow',
    outputSchema: SuggestExamplePromptsOutputSchema,
  },
  async () => {
    const {output} = await prompt({});
    return output!;
  }
);