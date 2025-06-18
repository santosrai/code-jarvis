
"use client";

import React, { useEffect, useRef } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage, ChatMessageSkeleton } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ExamplePrompts } from './ExamplePrompts';
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

import { generateChatResponse, GenerateChatResponseOutput } from '@/ai/flows/generate-chat-response-flow';
import type { VisualizationLayer, Message } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const ChatPane: React.FC = () => {
  const {
    activeChat,
    addMessageToActiveChat,
    isInitializing,
    updateMessageInActiveChat,
    addVisualizationLayerToActiveChat,
    updateVisualizationLayerInActiveChat,
    setActiveVisualizationLayer,
    addGpuUsage
  } = useAppContext();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [activeChat?.chatHistory]);

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [activeChat?.id]);


  const handlePromptSelect = async (selectedPrompt: string) => {
    if (!activeChat || !addMessageToActiveChat || !updateMessageInActiveChat || !addVisualizationLayerToActiveChat || !updateVisualizationLayerInActiveChat || !addGpuUsage || !setActiveVisualizationLayer) {
      toast({ variant: "destructive", title: "Error", description: "Cannot process prompt. Chat not ready." });
      console.error("Missing core functions or active chat for prompt selection.");
      return;
    }

    const userMessage = addMessageToActiveChat({ sender: 'user', content: selectedPrompt });
    if (!userMessage) {
      toast({ variant: "destructive", title: "Error", description: "Could not send message." });
      return;
    }

    const thinkingMessage = addMessageToActiveChat({ sender: 'copilot', content: '', isLoading: true });
    if (!thinkingMessage) {
      toast({ variant: "destructive", title: "Error", description: "Could not initiate AI response." });
      return;
    }

    let pendingLayerId: string | null = null;

    try {
      const interpretation: BioCommandOutput = await interpretBioCommands({ command: selectedPrompt });

      let copilotResponseMessage: Partial<Message> = { isLoading: false };
      let layerIdToActivate: string | null = null;

      // Check for visualization-related intents first to create a pending layer
      const potentialMoleculeNameFromInterpretation = interpretation.entities?.protein_name || interpretation.entities?.smiles_string;
      const isFoldIntent = interpretation.intent === 'fold_sequence' || interpretation.intent === 'predict_protein_structure';
      const sequenceForFold = interpretation.entities?.sequence || interpretation.entities?.protein_id;
      
      // Enhanced molecule detection - more comprehensive checking
      const promptLower = selectedPrompt.toLowerCase();
      const isMoleculeQuery = interpretation.intent?.toLowerCase().includes('molecule') ||
          interpretation.intent?.toLowerCase().includes('find_') ||
          interpretation.intent?.toLowerCase().includes('get_') ||
          interpretation.intent?.toLowerCase().includes('show_') ||
          interpretation.intent === 'visualize_molecule' ||
          promptLower.includes('molecule') ||
          promptLower.includes(' 3d') ||
          promptLower.includes(' structure') ||
          promptLower.includes('chemical') ||
          promptLower.includes('compound') ||
          promptLower.includes('drug') ||
          promptLower.includes('caffeine') ||
          promptLower.includes('aspirin') ||
          promptLower.includes('glucose') ||
          promptLower.includes('pubchem') ||
          (potentialMoleculeNameFromInterpretation && (promptLower.includes(potentialMoleculeNameFromInterpretation.toLowerCase()) || interpretation.intent?.includes(potentialMoleculeNameFromInterpretation.toLowerCase())));

      if (isFoldIntent && typeof sequenceForFold === 'string' && sequenceForFold.length > 0) {
        const pendingLayer = addVisualizationLayerToActiveChat({
          promptMessageId: userMessage.id,
          name: `Loading structure for ${sequenceForFold.substring(0, 10)}...`,
          type: "protein_fold",
          data: null,
          status: 'pending',
          components: [{ id: 'protein', name: 'Protein', visible: true }],
        });
        if (pendingLayer) {
          pendingLayerId = pendingLayer.layerId;
          console.log('Created pending protein fold layer:', pendingLayerId);
        }
      } else if (isMoleculeQuery) {
        const moleculeNameGuess = potentialMoleculeNameFromInterpretation || 
          promptLower.match(/\b(caffeine|aspirin|glucose|water|ethanol|methane|benzene|acetone|ibuprofen)\b/)?.[0] ||
          selectedPrompt.split(" ").filter(s => s.length > 2 && isNaN(Number(s))).pop() || 
          "molecule";
        const pendingLayer = addVisualizationLayerToActiveChat({
          promptMessageId: userMessage.id,
          name: `Loading ${moleculeNameGuess}...`,
          type: "molecule_3d_sdf",
          data: null,
          status: 'pending',
          components: [{ id: 'molecule', name: 'Molecule', visible: true }],
        });
        if (pendingLayer) {
          pendingLayerId = pendingLayer.layerId;
          console.log('Created pending molecule layer:', pendingLayerId);
        }
      }


      if (isFoldIntent) {
        if (typeof sequenceForFold === 'string' && sequenceForFold.length > 0) {
          updateMessageInActiveChat(thinkingMessage.id, { isLoading: true, content: `Predicting structure for ${sequenceForFold.substring(0, 15)}... (this may take a moment)` });
          const predictionResult = await predictProteinStructure({ sequence: sequenceForFold });

          if (predictionResult.pdbData) {
            let responseContent = `Predicted structure for sequence (pLDDT: ${predictionResult.plddt?.toFixed(2) ?? 'N/A'}). View in visualizer.`;
            if (predictionResult.estimatedTime) {
              addGpuUsage(predictionResult.estimatedTime);
              responseContent += `\nEstimated GPU time: ${predictionResult.estimatedTime}s.`;
            }
            copilotResponseMessage.content = responseContent;
            if (pendingLayerId) {
              updateVisualizationLayerInActiveChat(pendingLayerId, {
                name: `Folded: ${sequenceForFold.substring(0, 10)}...`,
                data: predictionResult.pdbData,
                plddt: predictionResult.plddt,
                status: 'loaded',
              });
              layerIdToActivate = pendingLayerId;
            }
          } else {
            copilotResponseMessage.content = `Could not predict structure for ${sequenceForFold}. The model might not support this sequence or an error occurred.`;
            if (pendingLayerId) updateVisualizationLayerInActiveChat(pendingLayerId, { status: 'error', data: `Failed to predict structure for ${sequenceForFold}.` });
          }
        } else {
          copilotResponseMessage.content = "No valid sequence or protein ID found for structure prediction.";
        }
      } else { // General chat, potentially with PubChem tool usage
        updateMessageInActiveChat(thinkingMessage.id, { isLoading: true, content: `BioAI CoPilot is thinking...` });
        const chatResponse: GenerateChatResponseOutput = await generateChatResponse({ command: selectedPrompt });
        copilotResponseMessage.content = chatResponse.responseText;

        if (chatResponse.moleculeDataSDF && chatResponse.moleculeName) {
          if (pendingLayerId) {
            updateVisualizationLayerInActiveChat(pendingLayerId, {
              name: `${chatResponse.moleculeName} (3D)`,
              data: chatResponse.moleculeDataSDF,
              pubChemUrl: chatResponse.pubChemUrl,
              cid: chatResponse.cid,
              status: 'loaded',
            });
            layerIdToActivate = pendingLayerId;
            console.log('Updated pending layer with molecule data:', pendingLayerId);
          } else { // No pending layer, but AI returned molecule data - always create one
            const newLayer = addVisualizationLayerToActiveChat({
              promptMessageId: userMessage.id,
              name: `${chatResponse.moleculeName} (3D)`,
              type: "molecule_3d_sdf",
              data: chatResponse.moleculeDataSDF,
              pubChemUrl: chatResponse.pubChemUrl,
              cid: chatResponse.cid,
              status: 'loaded',
              components: [{ id: 'molecule', name: 'Molecule', visible: true }],
            });
            if (newLayer) {
              layerIdToActivate = newLayer.layerId;
              console.log('Created new layer for molecule data:', newLayer.layerId);
            }
          }
        } else if (pendingLayerId) { // Pending layer existed but AI didn't return molecule data
            updateVisualizationLayerInActiveChat(pendingLayerId, { 
              status: 'error', 
              data: chatResponse.responseText || "Molecule 3D data not found or AI did not provide it." 
            });
            console.log('Updated pending layer with error:', pendingLayerId);
        } else {
          // If no pending layer and no molecule data, but this looks like a visualization request, create a text layer
          if (isMoleculeQuery && chatResponse.responseText) {
            const textLayer = addVisualizationLayerToActiveChat({
              promptMessageId: userMessage.id,
              name: `Response: ${selectedPrompt.substring(0, 20)}...`,
              type: "generic_text",
              data: chatResponse.responseText,
              status: 'loaded',
              components: [{ id: 'text', name: 'Text Response', visible: true }],
            });
            if (textLayer) {
              layerIdToActivate = textLayer.layerId;
              console.log('Created text layer for response:', textLayer.layerId);
            }
          }
        }
      }

      if (layerIdToActivate) {
        copilotResponseMessage.visualizationLayerId = layerIdToActivate;
        setActiveVisualizationLayer(layerIdToActivate);
      }
      updateMessageInActiveChat(thinkingMessage.id, copilotResponseMessage);

    } catch (error) {
      console.error("Error processing example prompt command:", error);
      let errorMessageText = "Sorry, I encountered an error trying to understand or execute your command.";
      if (error instanceof Error) {
        if (error.message.includes('API key') || error.message.includes('Quota') || error.message.includes('model not found') || error.message.includes('GenerateContentRequest') || error.message.includes('GoogleGenerativeAI Error')) {
          errorMessageText = `AI service error: ${error.message}. Please check your API key, service configuration, and tool schemas.`;
        } else if (error.message.length < 200) {
          errorMessageText += ` Details: ${error.message}`;
        }
      }
      updateMessageInActiveChat(thinkingMessage.id, {
        content: errorMessageText,
        isLoading: false
      });
      if (pendingLayerId) updateVisualizationLayerInActiveChat(pendingLayerId, { status: 'error', data: errorMessageText });
      toast({ variant: "destructive", title: "AI Error", description: "Could not process command via example prompt. Check console for details." });
    }
  };

  if (isInitializing) {
    return (
      <Card className="flex-1 flex flex-col overflow-hidden shadow-lg rounded-lg">
        <CardHeader className="border-b">
          <CardTitle><ChatMessageSkeleton /></CardTitle>
          <CardDescription>Loading chat...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          <div className="p-4 space-y-4">
            <ChatMessageSkeleton />
            <ChatMessageSkeleton isUser />
            <ChatMessageSkeleton />
          </div>
        </CardContent>
        <div className="p-3 border-t">
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }

  if (!activeChat) {
    return (
      <Card className="flex-1 flex flex-col items-center justify-center overflow-hidden shadow-lg rounded-lg p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <CardTitle>No Active Chat</CardTitle>
        <CardDescription className="mt-2">
          Please create a new chat or select an existing one.
        </CardDescription>
      </Card>
    );
  }


  return (
    <Card className="flex-1 flex flex-col overflow-hidden shadow-lg rounded-lg">
      <CardHeader className="border-b">
        <CardTitle className="truncate">{activeChat.title || "Chat"}</CardTitle>
        <CardDescription>Conversation with BioAI CoPilot</CardDescription>
      </CardHeader>

      <ScrollArea className="flex-1" viewportRef={scrollAreaRef}>
        <div className="p-4 space-y-1">
          {activeChat.chatHistory.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {activeChat.chatHistory.length === 0 && (
        <ExamplePrompts onPromptSelect={handlePromptSelect} />
      )}

      <ChatInput disabled={!activeChat} key={activeChat.id} />
    </Card>
  );
};

