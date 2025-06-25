"use client";

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import { BackendType } from '@/types';
import { Bot, Zap } from 'lucide-react';

export const BackendSelectionModal: React.FC = () => {
  const { showBackendSelection, setBackendType } = useAppContext();

  const handleBackendSelection = (backendType: BackendType) => {
    setBackendType(backendType);
  };

  return (
    <Dialog open={showBackendSelection} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-primary">
            Welcome to Code Jarvis
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Choose your preferred chat backend to get started
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/50"
            onClick={() => handleBackendSelection('gemini')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bot className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Gemini AI Powered</CardTitle>
                  <CardDescription>Traditional AI-powered chat interface</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Natural language processing for bioinformatics</li>
                <li>• Direct AI chat interface</li>
                <li>• Built-in NLP tools and analysis</li>
                <li>• Real-time AI responses</li>
              </ul>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/50"
            onClick={() => handleBackendSelection('n8n')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Zap className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">n8n Powered</CardTitle>
                  <CardDescription>Webhook-based automation platform</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Webhook-based message handling</li>
                <li>• Custom automation workflows</li>
                <li>• Session management with unique IDs</li>
                <li>• Integration with external services</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center pt-4">
          <p className="text-xs text-muted-foreground text-center">
            You can change this preference later in your profile settings
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 