"use server";
/**
 * @fileOverview Generates a chat response using a large language model.
 * Can use tools to fetch additional data like 3D molecule structures.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";
import type { StructureData } from "@/types";

const GenerateChatResponseInputSchema = z.object({
  command: z
    .string()
    .describe(
      "The user's command/question about biology, molecules, or proteins.",
    ),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        content: z.string(),
      }),
    )
    .optional()
    .describe("Previous conversation history for context."),
});

export type GenerateChatResponseInput = {
  command: string;
  chatHistory?: Array<{
    role: "user" | "model";
    content: string;
  }>;
};

const GenerateChatResponseOutputSchema = z.object({
  responseText: z
    .string()
    .describe("The AI-generated response to the command."),
  moleculeName: z
    .string()
    .optional()
    .describe("The name of the molecule if found."),
  moleculeDataSDF: z
    .string()
    .optional()
    .describe("The 3D molecule data in SDF format if found."),
  pubChemUrl: z
    .string()
    .url()
    .optional()
    .describe("Direct URL to the PubChem page if found."),
  cid: z.number().optional().describe("The PubChem CID if found."),
  proteinDataPDB: z
    .string()
    .optional()
    .describe("The protein data in PDB format if found."),
  proteinName: z.string().optional().describe("The protein name if found."),
  pdbUrl: z
    .string()
    .url()
    .optional()
    .describe("Direct URL to the PDB page if found."),
  pdbId: z.string().optional().describe("The PDB ID if found."),
});

export type GenerateChatResponseOutput = z.infer<
  typeof GenerateChatResponseOutputSchema
>;

export async function generateChatResponse(
  input: GenerateChatResponseInput,
): Promise<GenerateChatResponseOutput> {
  return generateChatResponseFlow(input);
}

async function analyzeSearchQuery(userInput: string): Promise<string> {
  if (!ai) {
    console.log("AI not available, using original input");
    return userInput;
  }

  try {
    const analysisPrompt = ai.definePrompt({
      name: "analyzeSearchQuery",
      input: { schema: z.object({ query: z.string() }) },
      output: {
        schema: z.object({
          correctedName: z
            .string()
            .describe(
              "The corrected and standardized name for searching databases",
            ),
          reasoning: z
            .string()
            .describe("Brief explanation of any corrections made"),
        }),
      },
      prompt: `You are a molecular biology expert. Analyze this user query and extract/correct the molecule or protein name for database searching.

User input: "{{query}}"

Common corrections needed:
- Fix spelling errors (e.g., "caffiene" → "caffeine")
- Standardize names (e.g., "acetylsalicylic acid" → "aspirin")
- Extract the actual molecule/protein name from conversational text
- Use common database names

Return the best search term for PDB/PubChem databases.`,
    });

    const result = await analysisPrompt({ query: userInput });
    console.log(
      `AI corrected "${userInput}" to "${result.output?.correctedName}" - ${result.output?.reasoning}`,
    );
    return result.output?.correctedName || userInput;
  } catch (error) {
    console.log("AI analysis failed, using original input:", error);
    return userInput;
  }
}

async function guessFormatAndFetch(inputName: string) {
  let format: string | undefined,
    url: string | undefined,
    id: string | number | undefined;

  console.log(`Starting search for: "${inputName}"`);

  // Use AI to analyze and improve the search query
  const analyzedName = await analyzeSearchQuery(inputName);
  const searchName = analyzedName !== inputName ? analyzedName : inputName;

  console.log(`Searching with: "${searchName}" (original: "${inputName}")`);

  try {
    // Try PubChem first for molecules/SDF
    const pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(searchName)}/cids/JSON`;
    console.log("Searching PubChem:", pubchemUrl);

    const cidResponse = await fetch(pubchemUrl);
    console.log("PubChem CID response status:", cidResponse.status);

    if (cidResponse.ok) {
      const cidData = await cidResponse.json();
      console.log("PubChem CID result:", cidData);

      if (cidData?.IdentifierList?.CID?.[0]) {
        id = cidData.IdentifierList.CID[0];
        format = "sdf";
        url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${id}/SDF?record_type=3d`;
        console.log(`Found PubChem compound: CID ${id}`);
        const response: StructureData = { format, url, id, searchName, originalName: inputName };
        return response;
      }
    }
  } catch (error) {
    console.log("PubChem search failed:", error);
  }

  try {
    // Try RCSB PDB if PubChem search failed
    const pdbSearchQuery = {
      query: {
        type: "terminal",
        service: "full_text",
        parameters: {
          value: searchName,
        },
      },
      return_type: "entry",
      request_options: {
        paginate: {
          start: 0,
          rows: 5,
        },
      },
    };

    console.log("Searching PDB with query:", pdbSearchQuery);

    const pdbResponse = await fetch(
      "https://search.rcsb.org/rcsbsearch/v2/query",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pdbSearchQuery),
      },
    );

    console.log("PDB response status:", pdbResponse.status);

    if (pdbResponse.ok) {
      const pdbSearch = await pdbResponse.json();
      console.log("PDB search result:", pdbSearch);

      if (
        pdbSearch.total_count &&
        pdbSearch.total_count > 0 &&
        pdbSearch.result_set &&
        pdbSearch.result_set.length > 0
      ) {
        // It's a PDB entry
        id = pdbSearch.result_set[0].identifier;
        format = "pdb";
        url = `https://files.rcsb.org/view/${id}.pdb`;
        console.log(`Found PDB entry: ${id}`);
        const response: StructureData = { format, url, id, searchName, originalName: inputName };
        return response;
      }
    }
  } catch (error) {
    console.log("PDB search failed:", error);
  }

  console.log(
    `No results found for: "${searchName}" (original: "${inputName}")`,
  );
  const response: StructureData = {
    format: undefined,
    url: undefined,
    id: undefined,
    searchName,
    originalName: inputName,
  };
  return response;
}

const generateChatResponseFlow = ai.defineFlow(
  {
    name: "generateChatResponse",
    inputSchema: GenerateChatResponseInputSchema,
    outputSchema: GenerateChatResponseOutputSchema,
  },
  async (input) => {
    const command = input.command.toLowerCase().trim();

    // Direct structure detection and fetching
    try {
      // Extract the actual molecule/protein name from the command
      let searchName = command.trim();

      // Remove common command words to get the actual name
      const commandWords = [
        "show",
        "display",
        "visualize",
        "load",
        "find",
        "get",
        "view",
      ];
      for (const word of commandWords) {
        searchName = searchName
          .replace(new RegExp(`\\b${word}\\b`, "gi"), "")
          .trim();
      }

      // If nothing left, try the original command
      if (!searchName) {
        searchName = command.trim();
      }

      console.log(`Searching for: "${searchName}" (original: "${command}")`);

      const result = await guessFormatAndFetch(searchName);

      if (result.format === "pdb" && result.url) {
        // Fetch PDB data
        const pdbResponse = await fetch(result.url);
        if (pdbResponse.ok) {
          const pdbData = await pdbResponse.text();
          const displayName = result.searchName || searchName;
          const correctionNote =
            result.searchName !== result.originalName
              ? ` (corrected from "${result.originalName}")`
              : "";
          return {
            responseText: `Found ${displayName} protein structure${correctionNote}! This protein is now loaded in the 3D viewer.`,
            proteinName: displayName,
            proteinDataPDB: pdbData,
            pdbUrl: `https://www.rcsb.org/structure/${result.id}`,
            pdbId: result.id as string,
          };
        }
      } else if (result.format === "sdf" && result.url) {
        // Fetch SDF data
        const sdfResponse = await fetch(result.url);
        if (sdfResponse.ok) {
          const sdfData = await sdfResponse.text();
          const displayName = result.searchName || searchName;
          const correctionNote =
            result.searchName !== result.originalName
              ? ` (corrected from "${result.originalName}")`
              : "";
          return {
            responseText: `Found ${displayName} molecule structure${correctionNote}! This molecule is now loaded in the 3D viewer.`,
            moleculeName: displayName,
            moleculeDataSDF: sdfData,
            pubChemUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${result.id}`,
            cid: result.id as number,
          };
        }
      }

      // Fallback response
      return {
        responseText: `I couldn't find 3D structure data for "${searchName}". This could be because the structure isn't available in PDB or PubChem databases, or there was an issue with the search. Try searching for common molecules like "caffeine", "aspirin", or proteins like "insulin".`,
      };
    } catch (error) {
      console.error("Direct structure search failed:", error);
      return {
        responseText: `I encountered an issue while searching for "${input.command}". Please try again with a specific molecule name like "caffeine" or protein name like "lysozyme".`,
      };
    }
  },
);
