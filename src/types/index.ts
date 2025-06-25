export interface Profile {
  displayName: string;
  estimatedGpuUsage: number; // in seconds
}

export type BackendType = "gemini" | "n8n";

export interface BackendConfig {
  type: BackendType;
  n8nWebhookUrl?: string;
}

export interface SessionData {
  sessionId: string;
  backendType: BackendType;
}

export interface Message {
  id: string;
  sender: "user" | "copilot";
  content: string | Record<string, any>; // Can be string or structured data like a table
  timestamp: string;
  visualizationLayerId?: string; // Optional: links to a specific layer
  isLoading?: boolean; // For displaying loading state for copilot messages
}

export type VisualizationLayerType = 
  | "protein_fold" 
  | "docking_result" 
  | "pdb_load" 
  | "search_result" 
  | "smiles_result"
  | "molecule_3d_sdf" // New type for PubChem 3D molecules
  | "protein_3d_pdb" // New type for PDB protein data
  | "generic_text";

export interface VisualizationLayer {
  layerId: string;
  promptMessageId: string; // ID of the user message that triggered this layer
  name: string; // e.g., "P04637 Folded", "Docking caffeine to P12345", "Aspirin 3D"
  type: VisualizationLayerType;
  data: any; // PDB string, SMILES, docking scores, table data, SDF string, etc.
  visualizationState?: any; // Camera view, component visibility for 3D viewer
  timestamp: string;
  plddt?: number; // For protein folding
  components?: Array<{ id: string, name: string, visible: boolean }>; // For FR7.8
  pubChemUrl?: string; // Optional: URL to the PubChem page for the molecule
  sdfUrl?: string; // Optional: URL to the SDF file for the molecule
  pdbUrl?: string; // Optional: URL to the PDB file for the protein
  pdbId?: string; // Optional: PDB ID for the protein
  cid?: number; // Optional: PubChem CID for the molecule
  status?: 'pending' | 'loaded' | 'error'; // Status of the layer loading
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  lastModifiedAt: string;
  chatHistory: Message[];
  visualizationLayers: VisualizationLayer[];
  activeLayerId: string | null;
}

export type AppView = "chat" | "profile";

export interface StructureData {
  format: 'pdb' | 'sdf' | undefined;
  url: string | undefined;
  id: string | number | undefined; // CID (number) for molecules, PDB ID (string) for proteins
  searchName: string;
  originalName: string;
}