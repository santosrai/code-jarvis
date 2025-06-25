"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { ChatSession, BackendType } from '@/types';
import { Bot, Zap } from 'lucide-react';

function formatGpuTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)} sec`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  return `${(seconds / 3600).toFixed(2)} hrs`;
}

export const ProfilePane: React.FC = () => {
  const { 
    profile, 
    updateDisplayName, 
    resetGpuUsage, 
    chats, 
    importChat, 
    backendConfig, 
    sessionData, 
    setShowBackendSelection 
  } = useAppContext();
  const [displayNameInput, setDisplayNameInput] = useState(profile.displayName);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayNameInput(profile.displayName);
  }, [profile.displayName]);

  const handleSaveDisplayName = () => {
    updateDisplayName(displayNameInput);
    toast({ title: "Profile Updated", description: "Display name saved." });
  };

  const handleResetGpuUsage = () => {
    resetGpuUsage();
    toast({ title: "GPU Usage Reset", description: "Estimated GPU usage has been reset to zero." });
  };

  const handleChangeBackend = () => {
    setShowBackendSelection(true);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          // Basic validation for ChatSession structure
          if (json.id && json.title && Array.isArray(json.chatHistory) && Array.isArray(json.visualizationLayers)) {
            importChat(json as ChatSession);
            toast({ title: "Chat Imported", description: `"${json.title}" has been imported successfully.` });
          } else {
            throw new Error("Invalid chat session file format.");
          }
        } catch (error) {
          console.error("Error importing chat session:", error);
          toast({ variant: "destructive", title: "Import Failed", description: "The selected file is not a valid chat session." });
        }
      };
      reader.readAsText(file);
      event.target.value = ''; 
    }
  };

  const getBackendIcon = (type: BackendType) => {
    return type === 'gemini' ? <Bot className="h-4 w-4" /> : <Zap className="h-4 w-4" />;
  };

  const getBackendLabel = (type: BackendType) => {
    return type === 'gemini' ? 'Gemini AI' : 'n8n';
  };

  const getBackendColor = (type: BackendType) => {
    return type === 'gemini' ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800';
  };

  return (
    <Card className="flex-1 flex flex-col overflow-hidden shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle>User Profile & Settings</CardTitle>
        <CardDescription>Manage your local profile and application settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 overflow-y-auto p-6">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <div className="flex gap-2">
            <Input
              id="displayName"
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              placeholder="Enter your display name"
            />
            <Button onClick={handleSaveDisplayName} disabled={displayNameInput === profile.displayName}>Save</Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Current Chat Backend</Label>
          <div className="flex items-center gap-3">
            <Badge className={`${getBackendColor(backendConfig.type)} flex items-center gap-1`}>
              {getBackendIcon(backendConfig.type)}
              {getBackendLabel(backendConfig.type)} Powered
            </Badge>
            <Button variant="outline" size="sm" onClick={handleChangeBackend}>
              Change Backend
            </Button>
          </div>
          {backendConfig.type === 'n8n' && sessionData?.sessionId && (
            <div className="mt-2 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Session ID: {sessionData.sessionId}</p>
              <p className="text-xs text-muted-foreground">This session ID is used for n8n webhook calls</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {backendConfig.type === 'gemini' 
              ? 'Using Gemini AI for natural language processing and bioinformatics tasks.'
              : 'Using n8n webhook for custom automation workflows.'
            }
          </p>
        </div>
        
        <div className="space-y-2">
          <Label>Chat Session Count</Label>
          <p className="text-2xl font-semibold">{chats.length}</p>
          <p className="text-sm text-muted-foreground">Total number of chat sessions stored in your browser.</p>
        </div>

        <div className="space-y-2">
          <Label>Estimated GPU Usage</Label>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-semibold">{formatGpuTime(profile.estimatedGpuUsage)}</p>
            <Button variant="outline" size="sm" onClick={handleResetGpuUsage} disabled={profile.estimatedGpuUsage === 0}>
              Reset Usage
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Accumulated from backend compute tasks like protein folding. This is an estimate.</p>
        </div>
      </CardContent>
      <CardFooter className="border-t p-6">
        <Button onClick={handleImportClick} variant="outline">Import Chat (JSON)</Button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          onChange={handleFileImport}
          className="hidden"
        />
      </CardFooter>
    </Card>
  );
};
