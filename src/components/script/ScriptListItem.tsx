
"use client";

import React, { useState } from 'react';
import type { ChatSession } from '@/types'; // Updated type import
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Download, Check, X } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

interface ScriptListItemProps {
  script: ChatSession; // Prop name 'script' is kept, but type is ChatSession
}

export const ScriptListItem: React.FC<ScriptListItemProps> = ({ script }) => {
  // Renamed context functions
  const { activeChatId, setActiveChat, renameChat, deleteChat, exportChat } = useAppContext();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(script.title);
  const { toast } = useToast();

  const isActive = script.id === activeChatId;

  const handleSelectScript = () => {
    if (!isRenaming) {
      setActiveChat(script.id);
    }
  };

  const handleRename = () => {
    if (newTitle.trim() && newTitle.trim() !== script.title) {
      renameChat(script.id, newTitle.trim());
    }
    setIsRenaming(false);
  };

  const handleExport = () => {
    const scriptData = exportChat(script.id);
    if (scriptData) {
      const jsonString = JSON.stringify(scriptData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${scriptData.title.replace(/\s+/g, '_') || 'chat_session'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Chat Exported", description: `"${scriptData.title}" downloaded.` });
    }
  };

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all duration-150 ease-in-out
        ${isActive ? 'bg-primary/10 border-primary shadow-md' : 'bg-card hover:bg-muted/50'}`}
      onClick={handleSelectScript}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleSelectScript()}
    >
      <div className="flex justify-between items-center gap-2">
        {isRenaming ? (
          <div className="flex-1 flex items-center gap-1">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setNewTitle(script.title);
                  setIsRenaming(false);
                }
              }}
              className="h-8 text-sm"
              autoFocus
            />
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRename(); }} className="h-8 w-8">
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setIsRenaming(false); setNewTitle(script.title); }} className="h-8 w-8">
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate text-foreground">{script.title}</h3>
            <p className="text-xs text-muted-foreground">
              Last modified: {formatDistanceToNow(new Date(script.lastModifiedAt), { addSuffix: true })}
            </p>
          </div>
        )}

        {!isRenaming && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
              aria-label="Rename chat"
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); handleExport(); }}
              aria-label="Export chat"
              className="h-8 w-8"
            >
              <Download className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Delete chat"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the chat session "{script.title}"
                    and all its data from your browser.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteChat(script.id)}
                    className={buttonVariants({variant: "destructive"})}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  );
};

const buttonVariants = ({ variant }: { variant: "destructive" | "default" }) => {
  if (variant === "destructive") {
    return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
  }
  return "";
};
