"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Profile, ChatSession, Message, VisualizationLayer, AppView, BackendType, BackendConfig, SessionData } from '@/types';
import { useProfile } from '@/hooks/useProfile';
import { useChats } from '@/hooks/useChats';

interface AppContextType {
  // Profile
  profile: Profile;
  updateDisplayName: (name: string) => void;
  addGpuUsage: (seconds: number) => void;
  resetGpuUsage: () => void;

  // Backend Configuration
  backendConfig: BackendConfig;
  sessionData: SessionData | null;
  setBackendType: (type: BackendType) => void;
  generateSessionId: () => string;
  initializeSession: () => void;

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
  showBackendSelection: boolean;
  setShowBackendSelection: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const profileState = useProfile();
  const chatState = useChats();
  const [currentView, setCurrentView] = useState<AppView>("chat");
  const [isChatHistoryPanelVisible, setIsChatHistoryPanelVisible] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showBackendSelection, setShowBackendSelection] = useState(false);
  
  // Backend configuration state
  const [backendConfig, setBackendConfig] = useState<BackendConfig>({ type: "gemini" });
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  // Generate unique 10-digit session ID
  const generateSessionId = (): string => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  };

  // Initialize session with backend type
  const initializeSession = () => {
    const sessionId = generateSessionId();
    setSessionData({
      sessionId,
      backendType: backendConfig.type
    });
  };

  // Set backend type and update localStorage
  const setBackendType = (type: BackendType) => {
    const newConfig = { ...backendConfig, type };
    setBackendConfig(newConfig);
    localStorage.setItem('codeJarvisBackendType', type);
    
    // Initialize session for n8n backend
    if (type === 'n8n') {
      initializeSession();
    }
    
    setShowBackendSelection(false);
  };

  useEffect(() => {
    // Load backend preference from localStorage
    const savedBackendType = localStorage.getItem('codeJarvisBackendType') as BackendType;
    if (savedBackendType && (savedBackendType === 'gemini' || savedBackendType === 'n8n')) {
      setBackendConfig({ type: savedBackendType });
      if (savedBackendType === 'n8n') {
        initializeSession();
      }
    } else {
      // Show backend selection if no preference is saved
      setShowBackendSelection(true);
    }
    
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    if (!isInitializing && chatState.chats.length === 0 && !showBackendSelection) {
      chatState.createNewChat();
    }
  }, [isInitializing, chatState.chats.length, chatState.createNewChat, showBackendSelection]);

  const toggleChatHistoryPanelVisibility = () => {
    setIsChatHistoryPanelVisible(prev => !prev);
  };

  const contextValue: AppContextType = {
    ...profileState,
    ...chatState,
    backendConfig,
    sessionData,
    setBackendType,
    generateSessionId,
    initializeSession,
    currentView,
    setCurrentView,
    isChatHistoryPanelVisible,
    toggleChatHistoryPanelVisibility,
    isInitializing,
    showBackendSelection,
    setShowBackendSelection,
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