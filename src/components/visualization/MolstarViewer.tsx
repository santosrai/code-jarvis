import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec";
import { PluginConfig } from "molstar/lib/mol-plugin/config";
import { Download, RotateCcw } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

interface MolstarViewerProps {
  className?: string;
}

export const MolstarViewer: React.FC<MolstarViewerProps> = ({
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginUIContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPluginReady, setIsPluginReady] = useState(false);

  const { activeChat } = useAppContext();

  // Get current layer data
  const currentLayer = activeChat?.visualizationLayers.find(
    (l) => l.layerId === activeChat?.activeLayerId,
  );

  // Initialize plugin
  useEffect(() => {
    if (!containerRef.current) return;

    const initPlugin = async () => {
      try {
        console.log("Initializing MolStar plugin...");

        const spec = {
          ...DefaultPluginUISpec(),
          layout: {
            initial: {
              isExpanded: false,
              showControls: false,
            },
          },
          components: {
            controls: {
              top: "none" as const,
              bottom: "none" as const,
              left: "none" as const,
              right: "none" as const,
            },
          },
        };

        pluginRef.current = await createPluginUI({
          target: containerRef.current!,
          spec,
          render: (element: React.ReactElement, container: HTMLElement) =>
            createRoot(container).render(element),
        });

        // Apply dark theme
        if (containerRef.current) {
          containerRef.current.classList.add("msp-dark-theme");
        }

        setIsPluginReady(true);
        console.log("MolStar plugin initialized successfully");
      } catch (err) {
        console.error("Failed to initialize Molstar:", err);
        setError("Failed to initialize 3D viewer");
      }
    };

    initPlugin();

    return () => {
      if (pluginRef.current) {
        pluginRef.current.dispose();
        pluginRef.current = null;
      }
      setIsPluginReady(false);
    };
  }, []);

  // Load structure when plugin is ready or when currentLayer changes
  useEffect(() => {
    if (!pluginRef.current || !currentLayer || !isPluginReady) return;

    const loadStructure = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log("Loading structure data:", {
          dataType: currentLayer.type,
          name: currentLayer.name,
          dataLength: currentLayer.data?.length,
          hasCid: !!currentLayer.cid,
          cid: currentLayer.cid,
        });

        // Clear existing structures
        await pluginRef.current!.clear();

        let url: string | undefined;
        let format: "pdb" | "sdf";

        if (currentLayer.type === "molecule_3d_sdf" && currentLayer.cid) {
          // For molecules, try to use PubChem 3D URL if CID is available
          url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${currentLayer.cid}/SDF?record_type=3d`;
          format = "sdf";
          console.log("Trying PubChem 3D URL:", url);
        } else if (
          currentLayer.type === "protein_3d_pdb" &&
          currentLayer.pdbId
        ) {
          // For proteins, use PDB URL if ID is available
          url = `https://files.rcsb.org/view/${currentLayer.pdbId}.pdb`;
          format = "pdb";
          console.log("Using PDB URL:", url);
        }

        if (url) {
          console.log("Loading structure:", { url, format });

          // Download and parse the structure
          const data = await pluginRef.current!.builders.data.download(
            { url, isBinary: false },
            { state: { isGhost: true } },
          );

          let trajectory;
          if (format === "pdb") {
            trajectory =
              await pluginRef.current!.builders.structure.parseTrajectory(
                data,
                "pdb",
              );
          } else {
            trajectory =
              await pluginRef.current!.builders.structure.parseTrajectory(
                data,
                "sdf",
              );
          }

          const model =
            await pluginRef.current!.builders.structure.createModel(trajectory);
          const structure =
            await pluginRef.current!.builders.structure.createStructure(model);

          // Create appropriate representation based on type
          if (format === "pdb") {
            // Protein - use cartoon representation
            await pluginRef.current!.builders.structure.representation.addRepresentation(
              structure,
              {
                type: "cartoon",
                color: "chain-id",
                size: "uniform",
              },
            );
          } else {
            // Molecule - use ball and stick representation
            await pluginRef.current!.builders.structure.representation.addRepresentation(
              structure,
              {
                type: "ball-and-stick",
                color: "element-symbol",
                size: "uniform",
              },
            );
          }

          // Focus on the structure
          if (structure.data?.units.length > 0) {
            pluginRef.current!.managers.camera.focusLoci(
              structure.data.units[0].lookup3d.boundary.sphere,
            );
          }

          console.log(
            "Structure loaded successfully from",
            format === "pdb" ? "PDB" : "PubChem 3D",
          );
        } else {
          // Fallback: try to load from raw data if available
          console.log("No URL available, trying to load from raw data");

          if (currentLayer.data && typeof currentLayer.data === "string") {
            const dataStr = currentLayer.data;
            let dataFormat: "pdb" | "sdf" = "pdb";

            if (dataStr.includes("V2000") || dataStr.includes("M  END")) {
              dataFormat = "sdf";
            }

            const data = await pluginRef.current!.builders.data.rawData({
              data: dataStr,
              label: currentLayer.name,
            });

            const trajectory =
              await pluginRef.current!.builders.structure.parseTrajectory(
                data,
                dataFormat,
              );
            const model =
              await pluginRef.current!.builders.structure.createModel(
                trajectory,
              );
            const structure =
              await pluginRef.current!.builders.structure.createStructure(
                model,
              );

            if (dataFormat === "pdb") {
              await pluginRef.current!.builders.structure.representation.addRepresentation(
                structure,
                {
                  type: "cartoon",
                  color: "chain-id",
                  size: "uniform",
                },
              );
            } else {
              await pluginRef.current!.builders.structure.representation.addRepresentation(
                structure,
                {
                  type: "ball-and-stick",
                  color: "element-symbol",
                  size: "uniform",
                },
              );
            }

            if (structure.data?.units.length > 0) {
              pluginRef.current!.managers.camera.focusLoci(
                structure.data.units[0].lookup3d.boundary.sphere,
              );
            }

            console.log("Structure loaded from raw data");
          } else {
            throw new Error("No valid structure data available");
          }
        }
      } catch (err) {
        console.error("Failed to load structure:", err);
        setError(`Failed to load structure: ${currentLayer.name}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadStructure();
  }, [currentLayer, isPluginReady]);

  const handleDownloadImage = async () => {
    if (!pluginRef.current) return;

    try {
      const canvas = pluginRef.current.canvas3d?.webgl?.gl
        ?.canvas as HTMLCanvasElement;
      if (canvas) {
        const link = document.createElement("a");
        link.download = `${currentLayer?.name || "structure"}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    } catch (err) {
      console.error("Failed to download image:", err);
    }
  };

  const handleResetCamera = async () => {
    if (!pluginRef.current) return;

    try {
      // Get the current structure and reset camera to focus on it
      const state = pluginRef.current.state.data;
      const structures = state.select("structure");

      if (structures.length > 0) {
        const structure = structures[0];
        if (
          structure.data &&
          structure.data.units &&
          structure.data.units.length > 0
        ) {
          pluginRef.current.managers.camera.focusLoci(
            structure.data.units[0].lookup3d.boundary.sphere,
          );
        }
      } else {
        // If no structure, just reset to default position
        pluginRef.current.managers.camera.reset();
      }
    } catch (err) {
      console.error("Failed to reset camera:", err);
      // Fallback to basic reset
      try {
        pluginRef.current.managers.camera.reset();
      } catch (fallbackErr) {
        console.error("Fallback reset also failed:", fallbackErr);
      }
    }
  };

  return (
    <div
      className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}
      style={{ minHeight: "400px" }}
    >
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: "400px" }}
      />

      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>Loading 3D structure...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
          <div className="text-center text-red-400">
            <p>{error}</p>
          </div>
        </div>
      )}

      {!currentLayer && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="w-16 h-16 mx-auto mb-4 opacity-50">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <p className="text-lg mb-2">No structure loaded</p>
            <p className="text-sm">
              Start a conversation to load a 3D structure
            </p>
          </div>
        </div>
      )}

      {currentLayer && !isLoading && (
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={handleResetCamera}
            className="p-2 bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-lg transition-colors"
            title="Reset camera view"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownloadImage}
            className="p-2 bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-lg transition-colors"
            title="Download image"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      )}

      {currentLayer && (
        <div className="absolute bottom-4 left-4 bg-gray-800/90 text-white px-3 py-2 rounded-lg">
          <p className="text-sm font-medium">
            {currentLayer.type === "protein_3d_pdb" && currentLayer.pdbId
              ? `PDB: ${currentLayer.pdbId}`
              : currentLayer.type === "molecule_3d_sdf" && currentLayer.cid
                ? `CID: ${currentLayer.cid}`
                : currentLayer.name}
          </p>
        </div>
      )}
    </div>
  );
};
