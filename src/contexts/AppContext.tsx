"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Profile, ChatSession, Message, VisualizationLayer, AppView } from '@/types';
import { useProfile } from '@/hooks/useProfile';
import { useChats } from '@/hooks/useChats';

interface AppContextType {
  // Profile
  profile: Profile;
  updateDisplayName: (name: string) => void;
  addGpuUsage: (seconds: number) => void;
  resetGpuUsage: () => void;

  // Chat Sessions
  chats: ChatSession[];
  activeChat: ChatSession | null;
  activeChatId: string | null;
  createNewChat: () => ChatSession;
  updateChat: (chatId: string, updates: Partial<Omit<ChatSession, 'id' | 'createdAt'>>) => void;
  addMessageToActiveChat: (message: Omit<Message, 'id' | 'timestamp'>) => Message | undefined;
  updateMessageInActiveChat: (messageId: string, updates: Partial<Message>) => void;
  addVisualizationLayerToActiveChat: (layer: Omit<VisualizationLayer, 'layerId' | 'timestamp'>) => VisualizationLayer | null;
  updateVisualizationLayerInActiveChat: (layerId: string, updates: Partial<Omit<VisualizationLayer, 'layerId' | 'promptMessageId'>>) => void;
  removeVisualizationLayerFromActiveChat: (layerId: string) => void;
  setActiveVisualizationLayer: (layerId: string | null) => void;
  renameChat: (chatId: string, newTitle: string) => void;
  deleteChat: (chatId: string) => void;
  importChat: (chatData: ChatSession) => void;
  exportChat: (chatId: string) => ChatSession | null;
  setActiveChat: (chatId: string | null) => void;

  // App View
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  isChatHistoryPanelVisible: boolean;
  toggleChatHistoryPanelVisibility: () => void;

  // Loading state
  isInitializing: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const profileState = useProfile();
  const chatState = useChats();
  const [currentView, setCurrentView] = useState<AppView>("chat");
  const [isChatHistoryPanelVisible, setIsChatHistoryPanelVisible] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    if (!isInitializing && chatState.chats.length === 0) {
      chatState.createNewChat();
    }
  }, [isInitializing, chatState.chats.length, chatState.createNewChat]);

  const toggleChatHistoryPanelVisibility = () => {
    setIsChatHistoryPanelVisible(prev => !prev);
  };

  const contextValue: AppContextType = {
    ...profileState,
    ...chatState,
    currentView,
    setCurrentView,
    isChatHistoryPanelVisible,
    toggleChatHistoryPanelVisibility,
    isInitializing,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};