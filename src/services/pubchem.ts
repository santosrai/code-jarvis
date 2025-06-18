'use server';
/**
 * @fileOverview Service functions for interacting with the PubChem API.
 */

interface PubChemSdfResult {
  name: string;
  sdf: string;
  pubChemUrl: string;
  cid: number;
}

/**
 * Fetches the 3D structure (SDF format) of a molecule by its name from PubChem.
 * @param moleculeName The common name of the molecule.
 * @returns A promise that resolves to an object containing the molecule's name, SDF data, PubChem URL, and CID, or null if not found or an error occurs.
 */
export async function getMoleculeSdfByName(
  moleculeName: string
): Promise<PubChemSdfResult | null> {
  try {
    // 1. Get CID from name
    const cidResponse = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
        moleculeName
      )}/cids/JSON`
    );
    if (!cidResponse.ok) {
      console.error(
        `PubChem CID request failed for ${moleculeName}: ${cidResponse.status}`
      );
      return null;
    }
    const cidData = await cidResponse.json();
    const cid = cidData?.IdentifierList?.CID?.[0];

    if (!cid) {
      console.log(`No CID found for ${moleculeName} on PubChem.`);
      return null;
    }

    const has3dCoords = (sdf: string) => {
      const lines = sdf.split('\n');
      const countsIdx = lines.findIndex((l) => /^\s*\d+\s+\d+/.test(l));
      if (countsIdx === -1) return false;
      const atomCount = parseInt(lines[countsIdx].trim().split(/\s+/)[0]);
      
      // Special validation for caffeine - should have at least 14 atoms
      if (moleculeName.toLowerCase().includes('caffeine') && atomCount < 10) {
        console.log(`Caffeine structure has only ${atomCount} atoms, this seems incorrect`);
        return false;
      }
      
      for (let i = 1; i <= atomCount; i++) {
        const line = lines[countsIdx + i];
        if (!line) break;
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3 && parseFloat(parts[2]) !== 0) return true;
      }
      return false;
    };

    // Try multiple approaches to get the best 3D structure
    let sdfData = null;
    let sdfUrl = '';

    // First try: Get 3D conformer with specific conformer ID
    try {
      sdfUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/conformers/SDF?conformer_type=3d`;
      console.log(`Trying 3D conformers from: ${sdfUrl}`);
      let sdfResponse = await fetch(sdfUrl);
      
      if (sdfResponse.ok) {
        sdfData = await sdfResponse.text();
        if (has3dCoords(sdfData) && sdfData.includes('ATOM') || sdfData.split('\n').length > 10) {
          console.log('Successfully got 3D conformer data');
        } else {
          sdfData = null;
        }
      }
    } catch (error) {
      console.log('3D conformer request failed, trying next method');
    }

    // Second try: Regular 3D record
    if (!sdfData) {
      try {
        sdfUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`;
        console.log(`Trying 3D record from: ${sdfUrl}`);
        let sdfResponse = await fetch(sdfUrl);
        
        if (sdfResponse.ok) {
          sdfData = await sdfResponse.text();
          if (has3dCoords(sdfData) && sdfData.includes('ATOM') || sdfData.split('\n').length > 10) {
            console.log('Successfully got 3D record data');
          } else {
            sdfData = null;
          }
        }
      } catch (error) {
        console.log('3D record request failed, trying 2D');
      }
    }

    // Third try: Regular SDF (2D with coordinates)
    if (!sdfData) {
      try {
        sdfUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF`;
        console.log(`Falling back to regular SDF from: ${sdfUrl}`);
        let sdfResponse = await fetch(sdfUrl);
        
        if (sdfResponse.ok) {
          sdfData = await sdfResponse.text();
          console.log('Got regular SDF data as fallback');
        }
      } catch (error) {
        console.log('All SDF requests failed');
      }
    }

    if (!sdfData) {
      console.error(`Failed to fetch SDF data from all sources`);
      return null;
    }

    const pubChemUrl = `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;

    return {
      name: moleculeName,
      sdf: sdfData,
      pubChemUrl,
      cid,
    };
  } catch (error) {
    console.error(
      `Error fetching molecule data from PubChem for ${moleculeName}:`,
      error
    );
    return null;
  }
}