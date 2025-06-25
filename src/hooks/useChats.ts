"use client";

import { useState, useEffect, useCallback } from 'react';
import type { ChatSession, Message, VisualizationLayer } from '@/types';
import useLocalStorage from './useLocalStorage';
import { LOCALSTORAGE_CHATS_KEY, DEFAULT_CHAT_TITLE } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

const MAX_CHATS = 50;
function pruneChats(chats: ChatSession[]): ChatSession[] {
  return [...chats]
    .sort((a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime())
    .slice(0, MAX_CHATS);
}

export function useChats() {
  const [chats, setChats] = useLocalStorage<ChatSession[]>(LOCALSTORAGE_CHATS_KEY, []);
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);

  useEffect(() => {
    if (chats.length === 0) {
      if (activeChatId !== null) {
        setActiveChatIdState(null);
      }
    } else { 
      const activeChatExists = chats.some(chat => chat.id === activeChatId);
      if (!activeChatId || !activeChatExists) {
        const sortedChats = [...chats].sort((a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime());
        setActiveChatIdState(sortedChats[0].id);
      }
    }
  }, [chats, activeChatId]);

  const activeChat = chats.find(chat => chat.id === activeChatId) || null;

  const createNewChat = useCallback(() => {
    const newId = uuidv4();
    const now = new Date().toISOString();
    const newChatSession: ChatSession = {
      id: newId,
      title: `${DEFAULT_CHAT_TITLE} ${chats.length + 1}`,
      createdAt: now,
      lastModifiedAt: now,
      chatHistory: [],
      visualizationLayers: [],
      activeLayerId: null,
    };
    setChats(prev => pruneChats([newChatSession, ...prev]));
    setActiveChatIdState(newId); 
    return newChatSession;
  }, [chats.length, setChats]);

  const updateChat = useCallback((chatId: string, updates: Partial<Omit<ChatSession, 'id' | 'createdAt' | 'chatHistory' | 'visualizationLayers'>>) => {
    setChats(prevChats => pruneChats(prevChats.map(chat =>
      chat.id === chatId
        ? { ...chat, ...updates, lastModifiedAt: new Date().toISOString() }
        : chat
    )));
  }, [setChats]);

  const addMessageToActiveChat = useCallback((message: Omit<Message, 'id' | 'timestamp'>): Message | undefined => {
    if (!activeChatId) return undefined;
    const newMessage: Message = {
      ...message,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };

    setChats(prevChats => pruneChats(prevChats.map(chat => {
      if (chat.id === activeChatId) {
        return {
          ...chat,
          chatHistory: [...chat.chatHistory, newMessage],
          lastModifiedAt: new Date().toISOString(),
        };
      }
      return chat;
    })));
    return newMessage;
  }, [activeChatId, setChats]);

  const updateMessageInActiveChat = useCallback((messageId: string, updates: Partial<Message>) => {
    if (!activeChatId) return;

    setChats(prevChats => pruneChats(prevChats.map(chat => {
      if (chat.id === activeChatId) {
        const newChatHistory = chat.chatHistory.map(msg =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        );
        const historyChanged = JSON.stringify(newChatHistory) !== JSON.stringify(chat.chatHistory);
        return {
          ...chat,
          chatHistory: newChatHistory,
          lastModifiedAt: historyChanged || updates.content || typeof updates.isLoading === 'boolean' ? new Date().toISOString() : chat.lastModifiedAt,
        };
      }
      return chat;
    })));
  }, [activeChatId, setChats]);


  const addVisualizationLayerToActiveChat = useCallback((layer: Omit<VisualizationLayer, 'layerId' | 'timestamp'>): VisualizationLayer | null => {
    if (!activeChatId) return null;
    const newLayer: VisualizationLayer = {
      ...layer,
      layerId: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    setChats(prevChats => pruneChats(prevChats.map(chat => {
      if (chat.id === activeChatId) {
        return {
          ...chat,
          visualizationLayers: [...chat.visualizationLayers, newLayer],
          activeLayerId: newLayer.layerId, 
          lastModifiedAt: new Date().toISOString(),
        };
      }
      return chat;
    })));
    return newLayer;
  }, [activeChatId, setChats]);

  const updateVisualizationLayerInActiveChat = useCallback((layerId: string, updates: Partial<Omit<VisualizationLayer, 'layerId' | 'promptMessageId'>>) => {
    if (!activeChatId) return;
    setChats(prevChats => pruneChats(prevChats.map(chat => {
      if (chat.id === activeChatId) {
        return {
          ...chat,
          visualizationLayers: chat.visualizationLayers.map(l =>
            l.layerId === layerId ? { ...l, ...updates, timestamp: new Date().toISOString() } : l
          ),
          lastModifiedAt: new Date().toISOString(),
        };
      }
      return chat;
    })));
  }, [activeChatId, setChats]);

  const removeVisualizationLayerFromActiveChat = useCallback((layerId: string) => {
    if (!activeChatId) return;

    setChats(prevChats => pruneChats(prevChats.map(chat => {
      if (chat.id === activeChatId) {
        const updatedLayers = chat.visualizationLayers.filter(layer => layer.layerId !== layerId);
        const newActiveLayerId = updatedLayers.length > 0 ? updatedLayers[0].layerId : null;

        return {
          ...chat,
          visualizationLayers: updatedLayers,
          activeLayerId: newActiveLayerId,
          lastModifiedAt: new Date().toISOString(),
        };
      }
      return chat;
    })));
  }, [activeChatId, setChats]);

  const setActiveVisualizationLayer = useCallback((layerId: string | null) => {
    if (!activeChatId) return;
    updateChat(activeChatId, { activeLayerId: layerId });
  }, [activeChatId, updateChat]);

  const renameChat = useCallback((chatId: string, newTitle: string) => {
    updateChat(chatId, { title: newTitle || DEFAULT_CHAT_TITLE });
  }, [updateChat]);

  const deleteChat = useCallback((chatId: string) => {
    setChats(prevChats => pruneChats(prevChats.filter(chat => chat.id !== chatId)));
  }, [setChats]); 

  const importChat = useCallback((chatData: ChatSession) => {
    setChats(prev => {
        const existingChat = prev.find(s => s.id === chatData.id);
        const chatToImport = existingChat ? { ...chatData, id: uuidv4(), title: `${chatData.title} (Imported)` } : chatData;
        const updatedChats = [chatToImport, ...prev.filter(s => s.id !== chatToImport.id)]; 
        setActiveChatIdState(chatToImport.id); 
        return pruneChats(updatedChats);
    });
  }, [setChats]);

  const exportChat = useCallback((chatId: string): ChatSession | null => {
    return chats.find(s => s.id === chatId) || null;
  }, [chats]);

  const setActiveChat = useCallback((chatId: string | null) => {
    setActiveChatIdState(chatId);
  }, []);


  return {
    chats,
    activeChat,
    activeChatId,
    createNewChat,
    updateChat, 
    addMessageToActiveChat,
    updateMessageInActiveChat,
    addVisualizationLayerToActiveChat,
    updateVisualizationLayerInActiveChat,
    removeVisualizationLayerFromActiveChat,
    setActiveVisualizationLayer,
    renameChat,
    deleteChat,
    importChat,
    exportChat,
    setActiveChat,
  };
}