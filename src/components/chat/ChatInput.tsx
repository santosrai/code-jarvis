"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Loader2 } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { getN8nWebhookService } from "@/services/n8n-webhook";
import { getProteinPdbById } from "@/services/pdb";

import {
  generateChatResponse,
  GenerateChatResponseOutput,
} from "@/ai/flows/generate-chat-response-flow";

import type { Message, VisualizationLayer } from "@/types";

// Helper function to extract PDB IDs from text response
const extractPdbIdsFromResponse = (text: string): string[] => {
  // PDB ID pattern: 4 alphanumeric characters (e.g., 1ABC, 2XYZ)
  // Updated to be more specific and avoid false positives
  const pdbIdPattern = /\b([A-Z0-9]{4})\b/g;
  const matches = text.match(pdbIdPattern);
  
  console.log('Extracting PDB IDs from text:', text);
  console.log('Raw matches:', matches);
  
  if (!matches) return [];
  
  // Remove duplicates and filter out common false positives
  const uniqueIds = [...new Set(matches)];
  const filteredIds = uniqueIds.filter(id => {
    // Filter out common false positives like "HTTP", "JSON", "HTML", etc.
    const falsePositives = ['HTTP', 'JSON', 'HTML', 'REST', 'API', 'URL', 'POST', 'GET', 'PUT', 'DELETE', 'PDB', 'RCSB'];
    const isFalsePositive = falsePositives.includes(id);
    
    // Additional check: PDB IDs should not be all the same character
    const isRepeated = /^(.)\1{3}$/.test(id);
    
    console.log(`PDB ID candidate: ${id}, isFalsePositive: ${isFalsePositive}, isRepeated: ${isRepeated}`);
    
    return !isFalsePositive && !isRepeated;
  });
  
  console.log('Filtered PDB IDs:', filteredIds);
  return filteredIds;
};

export const ChatInput: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const {
    activeChat,
    addMessageToActiveChat,
    updateMessageInActiveChat,
    addVisualizationLayerToActiveChat,
    updateVisualizationLayerInActiveChat,
    setActiveVisualizationLayer,
    addGpuUsage,
    profile,
    backendConfig,
    sessionData,
  } = useAppContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || !activeChat) return;

    setIsSending(true);
    const userMessage = addMessageToActiveChat({
      sender: "user",
      content: trimmedInput,
    });
    setInputValue("");

    if (!userMessage) {
      setIsSending(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not send message. No active chat.",
      });
      return;
    }

    const thinkingMessage = addMessageToActiveChat({
      sender: "copilot",
      content: "",
      isLoading: true,
    });
    if (!thinkingMessage) {
      setIsSending(false);
      return;
    }

    let pendingLayerId: string | null = null;

    try {
      let layerIdToActivate: string | null = null;

      // Handle different backends
      if (backendConfig.type === 'n8n') {
        // n8n backend handling
        if (!sessionData?.sessionId) {
          throw new Error('No session ID available for n8n backend');
        }

        updateMessageInActiveChat(thinkingMessage.id, {
          isLoading: true,
          content: `Sending message to n8n workflow...`,
        });

        const n8nService = getN8nWebhookService();
        if (!n8nService) {
          throw new Error(
            'n8n webhook service not configured. Please check your environment variables. ' +
            'Add NEXT_PUBLIC_N8N_WEBHOOK_URL to your .env.local file with your actual n8n webhook URL.'
          );
        }

        const response = await n8nService.sendChatMessage(trimmedInput, sessionData.sessionId);

        console.log('=== N8N RESPONSE DEBUG ===');
        console.log('Raw response:', response);
        console.log('Response agentName:', response.agentName);
        console.log('Response cmd:', response.cmd);
        console.log('Response response:', response.response);
        console.log('========================');

        let chatContent = '';
        let pdbId = null;
        let pdbUrl = null;
        let proteinName = null;
        let proteinDataPDB = null;
        let shouldUpdateCanvas = false;

        // Updated logic for new n8n response format
        if (
          response.agentName === 'PDBAgent' &&
          (
            (response.pdbData && response.pdbData.pdbId) ||
            (response.metadata && Array.isArray(response.metadata.response) && response.metadata.response.length > 0)
          )
        ) {
          if (response.pdbData && response.pdbData.pdbId) {
            chatContent = response.message || '';
            pdbId = response.pdbData.pdbId;
            pdbUrl = response.pdbData.pdbUrl;
            proteinName = response.pdbData.proteinName;
            proteinDataPDB = response.pdbData.proteinDataPDB;
          } else if (response.metadata && Array.isArray(response.metadata.response) && response.metadata.response.length > 0) {
            try {
              const pdbObj = JSON.parse(response.metadata.response[0]);
              chatContent = pdbObj.responseText || response.message || '';
              pdbId = pdbObj.pdbId;
              pdbUrl = pdbObj.pdbUrl;
              proteinName = pdbObj.proteinName;
              proteinDataPDB = pdbObj.proteinDataPDB;
            } catch (e) {
              chatContent = 'Error parsing PDBAgent metadata response.';
            }
          }
        } else if (response.response !== undefined) {
          // Use response.response if present
          if (Array.isArray(response.response)) {
            chatContent = response.response.map((r: any) => (typeof r === 'string' ? r : JSON.stringify(r))).join('\n');
          } else if (typeof response.response === 'string' || typeof response.response === 'number') {
            chatContent = String(response.response);
          } else {
            chatContent = JSON.stringify(response.response);
          }
        } else if (response.message !== undefined) {
          // Fallback to response.message
          chatContent = String(response.message);
        } else {
          chatContent = '[No response content]';
        }

        // Always show the response in chat
        if (typeof chatContent !== 'string') {
          chatContent = JSON.stringify(chatContent);
        }
        // Build a complete Message object
        let copilotResponseMessage: Message = {
          id: thinkingMessage.id,
          sender: "copilot",
          content: chatContent,
          isLoading: false,
          timestamp: new Date().toISOString(),
        };

        // Debug log for all n8n agent types
        console.log('copilotResponseMessage (n8n):', copilotResponseMessage);

        // Only update the 3D canvas if cmd is 'update canvas' and we have a valid pdbId
        const cmd = response.cmd || response.data?.cmd || response.metadata?.cmd;
        if (
          response.agentName === 'PDBAgent' &&
          cmd === 'update canvas' &&
          pdbId && pdbId !== 'N/A'
        ) {
          console.log('PDBAgent canvas update: pdbId', pdbId);
          // Create a pending layer for the PDB structure
          const pendingLayer = addVisualizationLayerToActiveChat({
            promptMessageId: userMessage.id,
            name: `Loading ${pdbId.toUpperCase()}...`,
            type: 'protein_3d_pdb',
            data: 'Loading...',
            pdbId: pdbId.toUpperCase(),
            status: 'pending',
            components: [{ id: 'protein', name: 'Protein', visible: true }],
          });
          console.log('PDBAgent canvas update: pendingLayer', pendingLayer);

          if (pendingLayer) {
            pendingLayerId = pendingLayer.layerId;
            updateMessageInActiveChat(thinkingMessage.id, {
              isLoading: true,
              content: `Found PDB ID: ${pdbId.toUpperCase()}. Loading 3D structure...`,
            });
            try {
              // Fetch PDB data from the RCSB database
              const pdbResult = await getProteinPdbById(pdbId);
              console.log('PDBAgent canvas update: pdbResult', pdbResult);
              if (pdbResult) {
                updateVisualizationLayerInActiveChat(pendingLayerId, {
                  name: `${pdbResult.name} (${pdbId.toUpperCase()})`,
                  data: pdbResult.pdb,
                  pdbUrl: pdbResult.pdbUrl,
                  pdbId: pdbResult.pdbId,
                  status: 'loaded',
                });
                layerIdToActivate = pendingLayerId;
                copilotResponseMessage.content += `\n\n✅ Successfully loaded ${pdbResult.name} (${pdbId.toUpperCase()}) in the 3D viewer!`;
              } else {
                updateVisualizationLayerInActiveChat(pendingLayerId, {
                  name: `Failed to load ${pdbId.toUpperCase()}`,
                  data: `Could not fetch PDB data for ${pdbId.toUpperCase()}. The structure might not exist or be accessible.`,
                  status: 'error',
                });
                copilotResponseMessage.content += `\n\n❌ Could not load PDB structure for ${pdbId.toUpperCase()}. The structure might not exist or be accessible.`;
              }
            } catch (pdbError) {
              updateVisualizationLayerInActiveChat(pendingLayerId, {
                name: `Error loading ${pdbId.toUpperCase()}`,
                data: `Error fetching PDB data: ${pdbError instanceof Error ? pdbError.message : 'Unknown error'}`,
                status: 'error',
              });
              copilotResponseMessage.content += `\n\n❌ Error loading PDB structure for ${pdbId.toUpperCase()}.`;
            }
            if (layerIdToActivate) {
              copilotResponseMessage.visualizationLayerId = layerIdToActivate;
              setActiveVisualizationLayer(layerIdToActivate);
            }
          }
        }
        // Always update the message for all n8n agent types
        updateMessageInActiveChat(thinkingMessage.id, copilotResponseMessage);
        return;
      } else {
        // Gemini AI backend handling (existing logic)
        let copilotResponseMessage: Partial<Message> = { isLoading: false };
        updateMessageInActiveChat(thinkingMessage.id, {
          isLoading: true,
          content: `AI is thinking...`,
        });
        const chatResponse: GenerateChatResponseOutput =
          await generateChatResponse({ command: trimmedInput });
        copilotResponseMessage.content = chatResponse.responseText;

        // Handle the regular chat response and structure data
        console.log("Chat response structure data:", {
          hasMoleculeDataSDF: !!chatResponse.moleculeDataSDF,
          hasMoleculeName: !!chatResponse.moleculeName,
          hasProteinDataPDB: !!chatResponse.proteinDataPDB,
          hasProteinName: !!chatResponse.proteinName,
          pendingLayerId,
        });

        // Handle molecule data first
        if (chatResponse.moleculeDataSDF && chatResponse.moleculeName) {
          if (pendingLayerId) {
            // Update existing pending layer
            updateVisualizationLayerInActiveChat(pendingLayerId, {
              name: `${chatResponse.moleculeName} (3D)`,
              data: chatResponse.moleculeDataSDF,
              pubChemUrl: chatResponse.pubChemUrl,
              cid: chatResponse.cid,
              status: "loaded",
            });
            layerIdToActivate = pendingLayerId;
            console.log("Updated pending molecule layer:", pendingLayerId);
          } else {
            // No pending layer, create new one
            const newLayer = addVisualizationLayerToActiveChat({
              promptMessageId: userMessage.id,
              name: `${chatResponse.moleculeName} (3D)`,
              type: "molecule_3d_sdf",
              data: chatResponse.moleculeDataSDF,
              pubChemUrl: chatResponse.pubChemUrl,
              cid: chatResponse.cid,
              status: "loaded",
              components: [{ id: "molecule", name: "Molecule", visible: true }],
            });
            if (newLayer) {
              layerIdToActivate = newLayer.layerId;
              console.log("Created new molecule layer:", newLayer.layerId);
            }
          }
        }
        // Handle protein data
        else if (chatResponse.proteinDataPDB && chatResponse.proteinName) {
          if (pendingLayerId) {
            // Update existing pending layer
            updateVisualizationLayerInActiveChat(pendingLayerId, {
              name: `${chatResponse.proteinName} (PDB)`,
              data: chatResponse.proteinDataPDB,
              status: "loaded",
              pdbUrl: chatResponse.pdbUrl,
              pdbId: chatResponse.pdbId,
            });
            layerIdToActivate = pendingLayerId;
            console.log("Updated pending protein layer:", pendingLayerId);
          } else {
            // No pending layer, create new one
            const newLayer = addVisualizationLayerToActiveChat({
              promptMessageId: userMessage.id,
              name: `${chatResponse.proteinName} (PDB)`,
              type: "protein_3d_pdb",
              data: chatResponse.proteinDataPDB,
              pdbUrl: chatResponse.pdbUrl,
              pdbId: chatResponse.pdbId,
              status: "loaded",
              components: [{ id: "protein", name: "Protein", visible: true }],
            });
            if (newLayer) {
              layerIdToActivate = newLayer.layerId;
              console.log("Created new protein layer:", newLayer.layerId);
            }
          }
        }
        // No structure data found
        else if (pendingLayerId) {
          console.log(
            "No structure data found, updating pending layer to error",
          );
          updateVisualizationLayerInActiveChat(pendingLayerId, {
            name: `No structure found`,
            data:
              chatResponse.responseText ||
              "Sorry, I could not find 3D data for this structure.",
            status: "error",
          });
        }

        if (layerIdToActivate) {
          copilotResponseMessage.visualizationLayerId = layerIdToActivate;
          console.log("Setting active visualization layer:", layerIdToActivate);
          setActiveVisualizationLayer(layerIdToActivate);
        }
        updateMessageInActiveChat(thinkingMessage.id, copilotResponseMessage);
      }
    } catch (error) {
      console.error("Error processing command:", error);
      let errorMessage = "Sorry, I encountered an error trying to understand or execute your command.";
      
      if (error instanceof Error) {
        if (backendConfig.type === 'n8n') {
          errorMessage = `n8n workflow error: ${error.message}`;
        } else if (
          error.message.includes("API key") ||
          error.message.includes("Quota") ||
          error.message.includes("model not found") ||
          error.message.includes("GenerateContentRequest") ||
          error.message.includes("GoogleGenerativeAI Error")
        ) {
          errorMessage = `AI service error: ${error.message}. Please check your API key, service configuration, and tool schemas.`;
        } else if (error.message.length < 200) {
          errorMessage += ` Details: ${error.message}`;
        }
      }
      
      updateMessageInActiveChat(thinkingMessage.id, {
        content: errorMessage,
        isLoading: false,
      });
      if (pendingLayerId)
        updateVisualizationLayerInActiveChat(pendingLayerId, {
          status: "error",
          data: errorMessage,
        });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !isSending && !disabled) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUploadClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && activeChat) {
      addMessageToActiveChat({
        sender: "user",
        content: `Uploaded file: ${file.name}`,
      });
      const fileRef = `file_reference_for_${file.name}`;
      addMessageToActiveChat({
        sender: "copilot",
        content: `Received ${file.name}. You can now refer to it in your commands (e.g., "Visualize uploaded PDB ${fileRef}"). Currently, direct file processing in commands is not fully implemented.`,
      });
      toast({
        title: "File Uploaded",
        description: `${file.name} is ready to be referenced.`,
      });
      event.target.value = "";
    }
  };

  return (
    <div className="p-3 border-t bg-background flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleFileUploadClick}
        disabled={isSending || disabled}
        aria-label="Upload file"
      >
        <Paperclip className="h-5 w-5" />
      </Button>
      <Input
        type="text"
        id="chat-input-field"
        placeholder="Type your command..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={isSending || disabled || !activeChat}
        className="flex-1"
      />
      <Button
        onClick={handleSendMessage}
        disabled={isSending || !inputValue.trim() || disabled || !activeChat}
        aria-label="Send message"
      >
        {isSending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdb,.cif,.fasta,.sdf,.mol2,text/plain,.txt"
      />
    </div>
  );
};