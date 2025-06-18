"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Loader2 } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

import {
  generateChatResponse,
  GenerateChatResponseOutput,
} from "@/ai/flows/generate-chat-response-flow";

import type { Message, VisualizationLayer } from "@/types";

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
      // User message was added, but thinking message failed. This state is unusual.
      // Consider if userMessage should be removed or if this is acceptable.
      return;
    }

    let pendingLayerId: string | null = null;

    try {
      let copilotResponseMessage: Partial<Message> = { isLoading: false };
      let layerIdToActivate: string | null = null;


        // General chat, potentially with PubChem tool usage
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
    
    } catch (error) {
      console.error("Error processing command:", error);
      let errorMessage =
        "Sorry, I encountered an error trying to understand or execute your command.";
      if (error instanceof Error) {
        if (
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
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Could not process command. Check console for details.",
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