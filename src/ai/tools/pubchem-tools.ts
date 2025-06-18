
/**
 * @fileOverview Genkit tools for interacting with PubChem.
 * 
 * - fetchMoleculeDataFromPubChem - Fetches 3D SDF data and URL for a molecule from PubChem.
 */
import {ai} from '@/ai/genkit';
import { getMoleculeSdfByName } from '@/services/pubchem';
import {z} from 'genkit';

export const FetchMoleculeDataInputSchema = z.object({
  moleculeName: z.string().describe("The common name of the small molecule to search for on PubChem (e.g., 'aspirin', 'caffeine')."),
});

export const FetchMoleculeDataOutputSchema = z.object({
  found: z.boolean().describe("Whether the molecule was found and 3D data is available."),
  name: z.string().optional().describe("The name of the molecule."),
  sdf: z.string().optional().describe("The 3D molecular data in SDF format."),
  pubChemUrl: z.string().url().optional().describe("Direct URL to the PubChem page for this molecule."),
  cid: z.number().optional().describe("The PubChem Compound ID (CID).")
});

export const fetchMoleculeDataFromPubChem = ai.defineTool(
  {
    name: 'fetchMoleculeDataFromPubChem',
    description: 'Fetches 3D molecular data (SDF format) and the PubChem URL for a given small molecule name. Use this to find 3D structures of chemicals.',
    inputSchema: FetchMoleculeDataInputSchema,
    outputSchema: FetchMoleculeDataOutputSchema,
  },
  async (input) => {
    const result = await getMoleculeSdfByName(input.moleculeName);
    if (result) {
      return {
        found: true,
        name: result.name,
        sdf: result.sdf,
        pubChemUrl: result.pubChemUrl,
        cid: result.cid,
      };
    }
    return { found: false };
  }
);
