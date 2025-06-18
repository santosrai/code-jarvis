"use client";

import React, { useState, useRef, useEffect, Component, ReactNode } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Settings,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Download,
  ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

import { MolstarViewer } from "./MolstarViewer";

import type { StructureData } from "@/types";

// Simple ErrorBoundary component
class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("MolecularViewer error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const VisualizerPane: React.FC = () => {
  const { activeChat } = useAppContext();
  const { toast } = useToast();
  const [bondLength, setBondLength] = useState(1.0);
  const [showControls, setShowControls] = useState(false);

  const currentLayer = activeChat?.visualizationLayers.find(
    (l) => l.layerId === activeChat?.activeLayerId,
  );

  console.log("VisualizerPane Debug:", {
    hasActiveChat: !!activeChat,
    activeLayerId: activeChat?.activeLayerId,
    totalLayers: activeChat?.visualizationLayers?.length,
    layerIds: activeChat?.visualizationLayers?.map((l) => l.layerId),
    currentLayer: currentLayer,
  });

  const handleDownloadData = () => {
    if (
      !currentLayer ||
      !currentLayer.data ||
      currentLayer.status === "pending"
    ) {
      toast({
        variant: "destructive",
        title: "Export Error",
        description:
          "No data or data is still loading in current layer to export.",
      });
      return;
    }
    if (currentLayer.status === "error") {
      toast({
        variant: "destructive",
        title: "Export Error",
        description: "Cannot export layer with error.",
      });
      return;
    }

    let fileName = `${currentLayer.name.replace(/\s+/g, "_") || "visualization_data"}`;
    let mimeType = "text/plain;charset=utf-8";
    let dataToDownload = "";

    if (
      currentLayer.type === "protein_fold" &&
      typeof currentLayer.data === "string"
    ) {
      fileName += ".pdb";
      dataToDownload = currentLayer.data;
    } else if (
      currentLayer.type === "molecule_3d_sdf" &&
      typeof currentLayer.data === "string"
    ) {
      fileName += ".sdf";
      dataToDownload = currentLayer.data;
    } else if (typeof currentLayer.data === "string") {
      fileName += ".txt";
      dataToDownload = currentLayer.data;
    } else {
      fileName += ".json";
      mimeType = "application/json;charset=utf-8";
      dataToDownload = JSON.stringify(currentLayer.data, null, 2);
    }

    const blob = new Blob([dataToDownload], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Data Exported", description: `Downloaded ${a.download}.` });
  };

  const handleCaptureImage = () => {
    if (!currentLayer || currentLayer.status !== "loaded") {
      toast({
        variant: "destructive",
        title: "Capture Error",
        description: "No visualization to capture or data is still loading.",
      });
      return;
    }

    // Find the canvas element in the molecular viewer
    const canvas = document.querySelector(
      "#molecular-viewer-container canvas",
    ) as HTMLCanvasElement;
    if (!canvas) {
      toast({
        variant: "destructive",
        title: "Capture Error",
        description: "Could not find the 3D visualization canvas.",
      });
      return;
    }

    try {
      // Create a temporary link to download the image
      canvas.toBlob((blob) => {
        if (!blob) {
          toast({
            variant: "destructive",
            title: "Capture Error",
            description: "Failed to capture the image.",
          });
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${currentLayer.name.replace(/[^a-zA-Z0-9]/g, "_")}_3D_visualization.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Screenshot Captured",
          description: "3D visualization image has been downloaded.",
        });
      }, "image/png");
    } catch (error) {
      console.error("Error capturing image:", error);
      toast({
        variant: "destructive",
        title: "Capture Error",
        description: "Failed to capture the visualization.",
      });
    }
  };

  const threeToOneLetter: { [key: string]: string } = {
    'ALA': 'A', 'ARG': 'R', 'ASN': 'N', 'ASP': 'D',
    'CYS': 'C', 'GLN': 'Q', 'GLU': 'E', 'GLY': 'G',
    'HIS': 'H', 'ILE': 'I', 'LEU': 'L', 'LYS': 'K',
    'MET': 'M', 'PHE': 'F', 'PRO': 'P', 'SER': 'S',
    'THR': 'T', 'TRP': 'W', 'TYR': 'Y', 'VAL': 'V'
  };

  // Function to extract protein sequence from PDB data
  const extractProteinSequence = (pdbData: string): string => {
    const lines = pdbData.split('\n');

    // Try SEQRES records first (most reliable)
    const seqresLines = lines.filter(line => line.startsWith('SEQRES'));

    if (seqresLines.length > 0) {
      // Group by chain
      const chainSequences: { [key: string]: string } = {};

      seqresLines.forEach(line => {
        // SEQRES format: SEQRES   1 A  141  VAL LEU SER ALA ALA ASP LYS ALA ASN VAL LYS ALA ALA
        if (line.length >= 19) {
          const chainId = line.charAt(11).trim();
          const residues = line.substring(19).trim().split(/\s+/);

          if (!chainSequences[chainId]) {
            chainSequences[chainId] = "";
          }

          residues.forEach(residue => {
            if (residue && residue.length === 3) {
              const singleLetter = threeToOneLetter[residue] || 'X';
              chainSequences[chainId] += singleLetter;
            }
          });
        }
      });

      // Combine all chains (A, B, C, D for hemoglobin)
      const sortedChains = Object.keys(chainSequences).sort();
      return sortedChains.map(chain => chainSequences[chain]).join('');
    }

    // Fallback to ATOM records if no SEQRES
    const atomLines = lines.filter(line => line.startsWith('ATOM'));
    if (atomLines.length === 0) return "";

    const chainSequences: { [key: string]: { [key: number]: string } } = {};

    atomLines.forEach(line => {
      if (line.length >= 26) {
        const chainId = line.charAt(21).trim() || 'A';
        const resName = line.substring(17, 20).trim();
        const resNum = parseInt(line.substring(22, 26).trim());

        if (!isNaN(resNum) && resName.length === 3) {
          if (!chainSequences[chainId]) {
            chainSequences[chainId] = {};
          }
          chainSequences[chainId][resNum] = resName;
        }
      }
    });

    // Convert to sequence
    let fullSequence = "";
    const sortedChains = Object.keys(chainSequences).sort();

    sortedChains.forEach(chain => {
      const residues = chainSequences[chain];
      const sortedResNums = Object.keys(residues).map(n => parseInt(n)).sort((a, b) => a - b);

      sortedResNums.forEach(resNum => {
        const resName = residues[resNum];
        const singleLetter = threeToOneLetter[resName] || 'X';
        fullSequence += singleLetter;
      });
    });

    return fullSequence;
  };

  // Helper function to extract molecular formula from SDF data
  const extractMolecularFormula = (sdfData: string): string => {
    if (!sdfData || typeof sdfData !== "string") return "";

    const lines = sdfData.split('\n');
    const atomCounts: { [key: string]: number } = {};

    // Find the counts line - should be line 4 (index 3) in standard SDF format
    let countsLineIndex = -1;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      if (line && /^\s*\d+\s+\d+/.test(line)) {
        countsLineIndex = i;
        break;
      }
    }

    if (countsLineIndex >= 0) {
      const countsLine = lines[countsLineIndex];
      const parts = countsLine.trim().split(/\s+/);

      if (parts.length >= 2) {
        const atomCount = parseInt(parts[0]);
        const bondCount = parseInt(parts[1]);

        console.log(`SDF parsing: Found ${atomCount} atoms, ${bondCount} bonds`);

        // Parse atom block (starts right after counts line)
        for (let i = 1; i <= atomCount && (countsLineIndex + i) < lines.length; i++) {
          const atomLine = lines[countsLineIndex + i];
          if (atomLine) {
            const atomParts = atomLine.trim().split(/\s+/);
            if (atomParts.length >= 4) {
              // Element symbol is typically in the 4th column (index 3)
              let element = atomParts[3];

              // Clean the element symbol - remove any trailing numbers or special chars
              element = element.replace(/[^A-Za-z]/g, '');

              // Validate it's a proper element symbol (starts with capital, optional lowercase)
              if (element && /^[A-Z][a-z]?$/.test(element)) {
                atomCounts[element] = (atomCounts[element] || 0) + 1;
              }
            }
          }
        }

        console.log('Atom counts:', atomCounts);

        // Build molecular formula string
        if (Object.keys(atomCounts).length > 0) {
          const formula = Object.entries(atomCounts)
            .sort(([a], [b]) => {
              // Standard order: C first, H second, then alphabetical
              if (a === 'C') return -1;
              if (b === 'C') return 1;
              if (a === 'H') return -1;
              if (b === 'H') return 1;
              return a.localeCompare(b);
            })
            .map(([element, count]) => count > 1 ? `${element}${count}` : element)
            .join('');

          return formula;
        }
      }
    }

    return "Formula not available";
  };

  const renderVisualizerContent = () => {
    console.log("VisualizerPane - currentLayer status check:", {
      currentLayer,
      hasData: !!currentLayer?.data,
      status: currentLayer?.status,
    });

    if (!currentLayer) {
      return (
        <p className="text-muted-foreground p-4 text-center">
          Select or generate a visualization.
        </p>
      );
    }

    // Try to extract actual molecular data from the layer
    let actualData = currentLayer.data;

    // Check if it's valid SDF data (should contain molecule structure)
    const isValidSDF =
      actualData &&
      typeof actualData === "string" &&
      (actualData.includes("V2000") ||
        actualData.includes("M  END") ||
        (actualData.split("\n").length > 3 &&
          /^\s*\d+\s+\d+/.test(actualData.split("\n")[3])));

    // Check if it's valid PDB data (more strict - must not be SDF format)
    const isValidPDB =
      actualData &&
      typeof actualData === "string" &&
      !isValidSDF && // Not SDF format
      (actualData.includes("ATOM") ||
        actualData.includes("HETATM") ||
        actualData.startsWith("HEADER"));

    const hasValidData = isValidSDF || isValidPDB;

    // Extract sequence/formula information
    const sequenceInfo = hasValidData 
      ? isValidPDB 
        ? extractProteinSequence(actualData as string)
        : isValidSDF 
          ? extractMolecularFormula(actualData as string)
          : ""
      : "";

    console.log("Extracted sequence/formula:", sequenceInfo);

    // Determine effective status
    const effectiveStatus =
      currentLayer.status === "error" && !hasValidData
        ? "error"
        : hasValidData
          ? "loaded"
          : currentLayer.status || "pending";

    switch (effectiveStatus) {
      case "pending":
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Loading {currentLayer.name}...</p>
          </div>
        );
      case "error":
        return (
          <div className="flex flex-col items-center justify-center h-full text-destructive p-4 text-center">
            <AlertTriangle className="h-8 w-8 mb-4" />
            <p className="font-medium">Visualization Error</p>
            <p className="text-sm mt-2 max-w-md">
              {currentLayer.data || "Unknown error occurred"}
            </p>
          </div>
        );
      case "loaded":
      default:
        if (hasValidData) {
          console.log("Rendering 3D structure with data type:", {
            isValidSDF,
            isValidPDB,
          });

          if (isValidPDB) {
            // PDB data - proteins
            const pdbUrl = currentLayer.pdbId
              ? `https://files.rcsb.org/download/${currentLayer.pdbId}.pdb`
              : undefined;

            const structureData: StructureData = {
              format: "pdb",
              url: pdbUrl,
              id: currentLayer.pdbId || "unknown",
              searchName: currentLayer.name,
            };

            return (
              <div className="w-full h-full flex flex-col">
                <MolstarViewer />
              </div>
            );
          } else if (isValidSDF) {
            // SDF data - molecules - prioritize raw data for reliability
            console.log(
              "Rendering SDF with data length:",
              actualData?.length,
              "and CID:",
              currentLayer.cid,
            );
            // Generate SDF URL from CID if available
            const sdfUrl = currentLayer.cid
              ? `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${currentLayer.cid}/SDF?record_type=3d`
              : undefined;

            const structureData: StructureData = {
              format: "sdf" as const,
              url: sdfUrl,
              id: currentLayer.cid || "unknown",
              searchName: currentLayer.name,
              originalName: currentLayer.name,
            };

            return (
              <div className="w-full h-full flex flex-col">
                <MolstarViewer 
                  key={currentLayer.promptMessageId + "-" + currentLayer.name} />
                {sequenceInfo && (
                  <div className="mt-2 p-3 bg-muted/30 rounded-md border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">Molecular Formula:</span>
                    </div>
                    <div className="text-sm font-mono bg-muted p-2 rounded border">
                      {sequenceInfo}
                    </div>
                  </div>
                )}
              </div>
            );
          }
        }

        // Fallback for invalid or missing data
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
            <AlertTriangle className="h-8 w-8 mb-4" />
            <p className="font-medium">No Valid Structure Data</p>
            <p className="text-sm mt-2">
              The layer contains no valid 3D structure data to display.
            </p>
            <p className="text-xs mt-2 text-muted-foreground">
              Expected: SDF data with V2000/M END or PDB data with ATOM records
            </p>
            {currentLayer.data && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer">
                  Debug: Show raw data
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-left overflow-auto max-w-md max-h-32">
                  {typeof currentLayer.data === "string"
                    ? currentLayer.data.substring(0, 500)
                    : JSON.stringify(currentLayer.data, null, 2).substring(
                        0,
                        500,
                      )}
                </pre>
              </details>
            )}
          </div>
        );
    }
  };

  if (!currentLayer) {
    return (
      <Card className="flex-1 flex flex-col overflow-hidden shadow-lg rounded-lg">
        <CardHeader className="border-b">
          <CardTitle>3D Visualizer</CardTitle>
          <CardDescription>
            No structure selected. Chat with the AI to load molecules or
            proteins.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground">
            <div className="mb-2">🧬</div>
            <p>Start a conversation to visualize molecular structures</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only show loading if status is specifically "pending" and data is null
  const effectiveStatus =
    currentLayer.status || (currentLayer.data ? "loaded" : "pending"));
  if (effectiveStatus === "pending" && !currentLayer.data) {
    return (
      <Card className="flex-1 flex flex-col overflow-hidden shadow-lg rounded-lg">
        <CardHeader className="border-b">
          <CardTitle>3D Visualizer</CardTitle>
          <CardDescription>Loading structure...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{currentLayer.name}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1 flex flex-col overflow-hidden shadow-lg rounded-lg">
      <CardHeader className="border-b flex flex-row justify-between items-center py-3 px-4">
        <div>
          <CardTitle>3D Visualizer</CardTitle>
          <CardDescription
            className="text-xs truncate max-w-[200px] sm:max-w-xs md:max-w-sm"
            title={
              currentLayer
                ? `Displaying: ${currentLayer.name}`
                : "No active visualization."
            }
          >
            {currentLayer
              ? `Displaying: ${currentLayer.name}`
              : "No active visualization."}
            {currentLayer?.status === "pending" && " (Loading...)"}
            {currentLayer?.status === "error" && " (Error)"}
          </CardDescription>
        </div>
        <div className="flex gap-1 sm:gap-2">
          {currentLayer?.pubChemUrl && currentLayer.status !== "pending" && (
            <Button variant="outline" size="xs" asChild>
              <Link
                href={currentLayer.pubChemUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />{" "}
                PubChem
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowControls(!showControls)}
            disabled={
              (currentLayer?.type !== "molecule_3d_sdf" &&
                currentLayer?.type !== "protein_3d_pdb") ||
              currentLayer?.status === "pending" ||
              currentLayer?.status === "error"
            }
          >
            <Settings className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" /> Settings
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={handleDownloadData}
            disabled={
              !currentLayer?.data ||
              currentLayer.status === "pending" ||
              currentLayer.status === "error"
            }
          >
            <Download className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" /> Download
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={handleCaptureImage}
            disabled={
              currentLayer?.status === "pending" ||
              currentLayer?.status === "error"
            }
          >
            <ImageIcon className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" /> Capture
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-2 md:p-4 flex flex-col gap-2 md:gap-4 overflow-hidden">
        <div
          className="flex-1 bg-muted/50 rounded-md border-2 border-dashed border-border flex items-center justify-center min-h-[200px]" // Added min-h
          data-ai-hint={
            currentLayer?.type === "protein_fold"
              ? "protein structure"
              : currentLayer?.type === "molecule_3d_sdf"
                ? "molecule chemistry"
                : "visualization"
          }
        >
          {renderVisualizerContent()}
        </div>

        {showControls &&
          (currentLayer?.type === "molecule_3d_sdf" ||
            currentLayer?.type === "protein_3d_pdb") &&
          currentLayer?.status === "loaded" && (
            <div className="bg-muted/30 rounded-md p-3 border">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Bond Length: {bondLength.toFixed(1)}x
                  </label>
                  <span className="text-xs text-muted-foreground">
                    0.5x - 3.0x
                  </span>
                </div>
                <Slider
                  value={[bondLength]}
                  onValueChange={(value) => setBondLength(value[0])}
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Adjust the length of bonds between atoms. Higher values create
                  longer bonds.
                </p>
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
};