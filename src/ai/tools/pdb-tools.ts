
/**
 * @fileOverview Genkit tools for interacting with PDB.
 */
import {ai} from '@/ai/genkit';
import { getProteinPdbById, searchProteinByName } from '@/services/pdb';
import {z} from 'genkit';

export const FetchProteinPdbInputSchema = z.object({
  pdbId: z.string().describe("The PDB ID (4-character code) of the protein structure to fetch (e.g., '1crn', '2gb1')."),
});

export const FetchProteinPdbOutputSchema = z.object({
  found: z.boolean().describe("Whether the protein structure was found."),
  name: z.string().optional().describe("The name of the protein."),
  pdb: z.string().optional().describe("The protein structure data in PDB format."),
  pdbUrl: z.string().url().optional().describe("Direct URL to the RCSB PDB page for this structure."),
  pdbId: z.string().optional().describe("The PDB ID.")
});

export const SearchProteinInputSchema = z.object({
  proteinName: z.string().describe("The name of the protein to search for (e.g., 'insulin', 'lysozyme')."),
});

export const SearchProteinOutputSchema = z.object({
  found: z.boolean().describe("Whether any matching proteins were found."),
  pdbIds: z.array(z.string()).optional().describe("Array of PDB IDs that match the search.")
});

export const fetchProteinPdbById = ai.defineTool(
  {
    name: 'fetchProteinPdbById',
    description: 'Fetches 3D protein structure data (PDB format) for a given PDB ID. Use this to get protein structures from the Protein Data Bank.',
    inputSchema: FetchProteinPdbInputSchema,
    outputSchema: FetchProteinPdbOutputSchema,
  },
  async (input) => {
    const result = await getProteinPdbById(input.pdbId);
    if (result) {
      return {
        found: true,
        name: result.name,
        pdb: result.pdb,
        pdbUrl: result.pdbUrl,
        pdbId: result.pdbId,
      };
    }
    return { found: false };
  }
);

export const searchProteinByNameTool = ai.defineTool(
  {
    name: 'searchProteinByName',
    description: 'Searches for protein structures by name and returns matching PDB IDs. Use this to find PDB IDs when users ask about proteins by name.',
    inputSchema: SearchProteinInputSchema,
    outputSchema: SearchProteinOutputSchema,
  },
  async (input) => {
    const result = await searchProteinByName(input.proteinName);
    if (result && result.length > 0) {
      return {
        found: true,
        pdbIds: result,
      };
    }
    return { found: false };
  }
);
