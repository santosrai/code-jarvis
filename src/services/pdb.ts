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
    console.log('=== PDB FETCH START ===');
    console.log('Fetching PDB data for ID:', pdbId);
    
    const cleanPdbId = pdbId.trim().toLowerCase();
    console.log('Cleaned PDB ID:', cleanPdbId);
    
    // Fetch PDB data
    const pdbUrl = `https://files.rcsb.org/download/${cleanPdbId}.pdb`;
    console.log('PDB URL:', pdbUrl);
    
    const pdbResponse = await fetch(pdbUrl);
    console.log('PDB response status:', pdbResponse.status);
    console.log('PDB response ok:', pdbResponse.ok);
    
    if (!pdbResponse.ok) {
      console.error(`PDB request failed for ${cleanPdbId}: ${pdbResponse.status}`);
      console.log('PDB response text:', await pdbResponse.text());
      return null;
    }
    
    const pdbData = await pdbResponse.text();
    console.log('PDB data received, length:', pdbData.length);
    console.log('PDB data preview (first 200 chars):', pdbData.substring(0, 200));
    
    if (!pdbData || pdbData.length < 100) {
      console.error(`Invalid PDB data received for ${cleanPdbId}`);
      console.log('PDB data content:', pdbData);
      return null;
    }
    
    // Extract protein name from PDB header
    const lines = pdbData.split('\n');
    console.log('PDB file has', lines.length, 'lines');
    
    const headerLine = lines.find(line => line.startsWith('HEADER'));
    const titleLine = lines.find(line => line.startsWith('TITLE'));
    
    console.log('Header line:', headerLine);
    console.log('Title line:', titleLine);
    
    let proteinName = cleanPdbId.toUpperCase();
    if (titleLine) {
      proteinName = titleLine.substring(10).trim() || proteinName;
      console.log('Using title line for protein name:', proteinName);
    } else if (headerLine) {
      proteinName = headerLine.substring(10, 50).trim() || proteinName;
      console.log('Using header line for protein name:', proteinName);
    } else {
      console.log('No header or title line found, using PDB ID as name');
    }
    
    const rcsbUrl = `https://www.rcsb.org/structure/${cleanPdbId.toUpperCase()}`;
    console.log('Generated RCSB URL:', rcsbUrl);
    
    const result = {
      name: proteinName,
      pdb: pdbData,
      pdbUrl: rcsbUrl,
      pdbId: cleanPdbId.toUpperCase(),
    };
    
    console.log('=== PDB FETCH SUCCESS ===');
    console.log('Final result:', {
      name: result.name,
      pdbId: result.pdbId,
      pdbUrl: result.pdbUrl,
      dataLength: result.pdb.length
    });
    
    return result;
  } catch (error) {
    console.log('=== PDB FETCH ERROR ===');
    console.error(`Error fetching PDB data for ${pdbId}:`, error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
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
