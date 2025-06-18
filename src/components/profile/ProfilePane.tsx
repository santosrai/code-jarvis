
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { ChatSession } from '@/types'; // Updated type import

function formatGpuTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)} sec`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  return `${(seconds / 3600).toFixed(2)} hrs`;
}

export const ProfilePane: React.FC = () => {
  const { profile, updateDisplayName, resetGpuUsage, chats, importChat } = useAppContext(); // Renamed: scripts -> chats, importScript -> importChat
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
            importChat(json as ChatSession); // Updated function call and type assertion
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
          <Label>Chat Session Count</Label>
          <p className="text-2xl font-semibold">{chats.length}</p> {/* Renamed: scripts.length -> chats.length */}
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
