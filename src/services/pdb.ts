
'use server';

interface PDBResult {
  name: string;
  pdb: string;
  pdbUrl: string;
  pdbId: string;
}

/**
 * Fetches PDB data for a protein by its PDB ID
 */
export async function getProteinPdbById(pdbId: string): Promise<PDBResult | null> {
  try {
    const cleanPdbId = pdbId.trim().toLowerCase();
    
    // Fetch PDB data
    const pdbResponse = await fetch(`https://files.rcsb.org/download/${cleanPdbId}.pdb`);
    
    if (!pdbResponse.ok) {
      console.error(`PDB request failed for ${cleanPdbId}: ${pdbResponse.status}`);
      return null;
    }
    
    const pdbData = await pdbResponse.text();
    
    if (!pdbData || pdbData.length < 100) {
      console.error(`Invalid PDB data received for ${cleanPdbId}`);
      return null;
    }
    
    // Extract protein name from PDB header
    const lines = pdbData.split('\n');
    const headerLine = lines.find(line => line.startsWith('HEADER'));
    const titleLine = lines.find(line => line.startsWith('TITLE'));
    
    let proteinName = cleanPdbId.toUpperCase();
    if (titleLine) {
      proteinName = titleLine.substring(10).trim() || proteinName;
    } else if (headerLine) {
      proteinName = headerLine.substring(10, 50).trim() || proteinName;
    }
    
    const pdbUrl = `https://www.rcsb.org/structure/${cleanPdbId.toUpperCase()}`;
    
    return {
      name: proteinName,
      pdb: pdbData,
      pdbUrl,
      pdbId: cleanPdbId.toUpperCase(),
    };
  } catch (error) {
    console.error(`Error fetching PDB data for ${pdbId}:`, error);
    return null;
  }
}

/**
 * Search for PDB entries by protein name
 */
export async function searchProteinByName(proteinName: string): Promise<string[] | null> {
  try {
    const searchResponse = await fetch(
      `https://search.rcsb.org/rcsbsearch/v2/query?json=${encodeURIComponent(JSON.stringify({
        query: {
          type: "terminal",
          service: "text",
          parameters: {
            attribute: "struct.title",
            operator: "contains_phrase",
            value: proteinName
          }
        },
        return_type: "entry",
        request_options: {
          pager: {
            start: 0,
            rows: 10
          }
        }
      }))}`
    );
    
    if (!searchResponse.ok) {
      return null;
    }
    
    const searchData = await searchResponse.json();
    const pdbIds = searchData?.result_set?.map((entry: any) => entry.identifier) || [];
    
    return pdbIds.slice(0, 5); // Return top 5 matches
  } catch (error) {
    console.error(`Error searching for protein ${proteinName}:`, error);
    return null;
  }
}
