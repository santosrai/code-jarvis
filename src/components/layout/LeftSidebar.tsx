
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

export const LeftSidebar: React.FC = () => {
  const { 
    isChatHistoryPanelVisible, 
    toggleChatHistoryPanelVisibility,
    currentView 
  } = useAppContext();

  // Only show in chat view
  if (currentView !== 'chat') return null;

  return (
    <div className="fixed left-0 top-16 z-40 flex flex-col bg-card border-r shadow-sm">
      <div className="p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleChatHistoryPanelVisibility}
          aria-label={
            isChatHistoryPanelVisible
              ? "Hide chat history"
              : "Show chat history"
          }
          className={cn(
            "h-8 w-8 hover:bg-accent",
            isChatHistoryPanelVisible && "bg-accent"
          )}
        >
          {isChatHistoryPanelVisible ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
