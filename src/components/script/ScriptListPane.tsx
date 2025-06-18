
"use client";

import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScriptListItem } from './ScriptListItem';
import { Button } from '../ui/button';
import { PlusSquare } from 'lucide-react';
import type { ChatSession } from '@/types';

export const ScriptListPane: React.FC = () => {
  // Renamed: createNewScript -> createNewChat, setActiveScript -> setActiveChat
  const { chats, createNewChat, setCurrentView, setActiveChat } = useAppContext();

  const handleNewChatAndSwitch = () => {
    const newChatSession = createNewChat();
    setActiveChat(newChatSession.id);
    setCurrentView("chat");
  };
  
  const sortedChats: ChatSession[] = [...chats].sort((a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime());

  return (
    <Card className="flex-1 flex flex-col overflow-hidden shadow-lg rounded-lg">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>My Chat History</CardTitle>
            <CardDescription>Manage your saved chat sessions.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleNewChatAndSwitch}>
            <PlusSquare className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {sortedChats.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <p>No Chats yet.</p>
              <p>Create a new chat to get started!</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {sortedChats.map(chatSession => (
                // Prop name 'script' is kept for ScriptListItem, but it's a ChatSession object
                <ScriptListItem key={chatSession.id} script={chatSession} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
