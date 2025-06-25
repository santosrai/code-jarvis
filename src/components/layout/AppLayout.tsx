"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Header } from './Header';
import { LeftSidebar } from './LeftSidebar';
import { ProfilePane } from '@/components/profile/ProfilePane';
import { ScriptListPane } from '@/components/script/ScriptListPane';
import { ChatPane } from '@/components/chat/ChatPane';
import { VisualizerPane } from '@/components/visualization/VisualizerPane';
import { BackendSelectionModal } from '@/components/ui/backend-selection-modal';
import { useAppContext } from '@/contexts/AppContext';
import { Toaster } from "@/components/ui/toaster";
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ResizableLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const ResizableSplitter: React.FC<{
  onDrag: (deltaX: number) => void;
  className?: string;
}> = ({ onDrag, className }) => {
  const isDragging = useRef(false);
  const startX = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      const deltaX = e.clientX - startX.current;
      startX.current = e.clientX;
      onDrag(deltaX);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [onDrag]);

  return (
    <div
      className={cn(
        "w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors duration-200 flex-shrink-0",
        className
      )}
      onMouseDown={handleMouseDown}
    />
  );
};

export const AppLayout: React.FC = () => {
  const { currentView, isInitializing, isChatHistoryPanelVisible, showBackendSelection } = useAppContext();
  
  // Panel widths (in pixels)
  const [chatHistoryWidth, setChatHistoryWidth] = useState(280);
  const [chatWidth, setChatWidth] = useState(500);
  
  const minPanelWidth = 200;
  const maxChatHistoryWidth = 400;
  const maxChatWidth = 800;

  const handleChatHistoryResize = useCallback((deltaX: number) => {
    setChatHistoryWidth(prev => {
      const newWidth = prev + deltaX;
      return Math.max(minPanelWidth, Math.min(maxChatHistoryWidth, newWidth));
    });
  }, []);

  const handleChatResize = useCallback((deltaX: number) => {
    setChatWidth(prev => {
      const newWidth = prev + deltaX;
      return Math.max(minPanelWidth, Math.min(maxChatWidth, newWidth));
    });
  }, []);

  if (isInitializing) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex flex-1 overflow-hidden p-1 sm:p-2 md:p-4 gap-1 sm:gap-2 md:gap-4">
          {currentView === 'chat' ? (
            <>
              <div className="w-full md:w-1/4 lg:w-1/5 flex flex-col gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="flex-1 w-full" />
              </div>
              <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="flex-1 w-full" />
              </div>
              <div className="w-full md:w-1/4 lg:w-2/5 flex flex-col gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="flex-1 w-full" />
              </div>
            </>
          ) : (
            <>
              <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="flex-1 w-full" />
              </div>
              <div className="w-full md:w-1/2 lg:w-3/5 flex flex-col gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="flex-1 w-full" />
              </div>
            </>
          )}
        </main>
        <Toaster />
        <BackendSelectionModal />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <LeftSidebar />
      <main className="flex flex-1 overflow-hidden p-1 sm:p-2 md:p-4 gap-0" style={{ marginLeft: currentView === 'chat' ? '48px' : '0' }}>
        {currentView === 'chat' ? (
          <>
            {isChatHistoryPanelVisible && (
              <>
                <div 
                  className="flex flex-col overflow-hidden"
                  style={{ width: `${chatHistoryWidth}px` }}
                >
                  <ScriptListPane />
                </div>
                <ResizableSplitter onDrag={handleChatHistoryResize} />
              </>
            )}
            <div 
              className="flex flex-col overflow-hidden"
              style={{ 
                width: `${chatWidth}px`
              }}
            >
              <ChatPane />
            </div>
            <ResizableSplitter onDrag={handleChatResize} />
            <div className="flex flex-col overflow-hidden flex-1">
              <VisualizerPane />
            </div>
          </>
        ) : (
          <>
            <div 
              className="flex flex-col overflow-hidden"
              style={{ width: `${chatHistoryWidth}px` }}
            >
              <ScriptListPane />
            </div>
            <ResizableSplitter onDrag={handleChatHistoryResize} />
            <div className="flex flex-col overflow-hidden flex-1">
              <ProfilePane />
            </div>
          </>
        )}
      </main>
      <Toaster />
      <BackendSelectionModal />
    </div>
  );
};
