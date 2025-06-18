
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { suggestExamplePrompts, SuggestExamplePromptsOutput } from '@/ai/flows/suggest-example-prompts';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb } from 'lucide-react';

interface ExamplePromptsProps {
  onPromptSelect: (prompt: string) => void;
}

export const ExamplePrompts: React.FC<ExamplePromptsProps> = ({ onPromptSelect }) => {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrompts() {
      try {
        setIsLoading(true);
        setError(null);
        const result: SuggestExamplePromptsOutput = await suggestExamplePrompts();
        setPrompts(result.prompts);
      } catch (err) {
        console.error("Failed to fetch example prompts:", err);
        setError("Could not load suggestions. Please try refreshing.");
        // Fallback prompts
        setPrompts([
          "Find human trypsin",
          "Fold P04637",
          "What is the SMILES for aspirin?",
          "Visualize uploaded PDB",
        ]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPrompts();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    );
  }

  if (error) {
     return (
      <div className="p-4 text-center text-destructive-foreground bg-destructive/80 rounded-md">
        <p>{error}</p>
         {prompts.length > 0 && (
          <div className="mt-4">
            <p className="text-sm mb-2">You can try these common examples:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {prompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onPromptSelect(prompt)}
                  className="bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 border-t">
      <h4 className="text-sm font-medium mb-2 text-muted-foreground flex items-center">
        <Lightbulb className="h-4 w-4 mr-2 text-accent" />
        Not sure where to start? Try these:
      </h4>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onPromptSelect(prompt)}
            className="bg-accent/10 hover:bg-accent/20 border-accent/30 text-accent"
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
};
