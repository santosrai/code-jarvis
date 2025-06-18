"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { User, Bot, Loader2 } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { Skeleton } from "../ui/skeleton";
import { LayerManager } from '@/components/visualization/LayerManager';
import type { Message } from "@/types";

// For displaying tables or other structured data
const FormattedContent: React.FC<{ content: Record<string, any> }> = ({
  content,
}) => {
  if (
    content.type === "table" &&
    Array.isArray(content.data) &&
    content.data.length > 0
  ) {
    const headers = Object.keys(content.data[0]);
    return (
      <div className="overflow-x-auto rounded-md border text-sm">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {headers.map((header) => (
                <th key={header} className="p-2 text-left font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.data.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t">
                {headers.map((header) => (
                  <td key={`${rowIndex}-${header}`} className="p-2 align-top">
                    {String(row[header])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  // Fallback for other structured content
  return (
    <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
};

const formatMessageContent = (content: string): string => {
  // Convert **bold** to <strong>bold</strong>
  let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Convert *italic* to <em>italic</em>
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Convert `code` to <code>code</code>
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>');

  // Convert markdown tables to HTML tables
  formatted = formatted.replace(/\|([^|\n]+)\|([^|\n]+)\|([^|\n]+)\|([^|\n]+)\|\n\|[-\s|]+\|\n(\|([^|\n]+)\|([^|\n]+)\|([^|\n]+)\|([^|\n]+)\|\n?)*/g, (match) => {
    const lines = match.trim().split('\n');
    const headers = lines[0].split('|').slice(1, -1).map(h => h.trim());
    const rows = lines.slice(2).map(line => 
      line.split('|').slice(1, -1).map(cell => cell.trim())
    );

    let table = '<table><thead><tr>';
    headers.forEach(header => {
      table += `<th>${header}</th>`;
    });
    table += '</tr></thead><tbody>';

    rows.forEach(row => {
      table += '<tr>';
      row.forEach(cell => {
        table += `<td>${cell}</td>`;
      });
      table += '</tr>';
    });

    table += '</tbody></table>';
    return table;
  });

  // Convert URLs to clickable links
  formatted = formatted.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>'
  );

  return formatted;
};

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { profile, setActiveVisualizationLayer, activeChat } = useAppContext();
  const isUser = message.sender === "user";

  const handleContentClick = () => {
    if (
      message.visualizationLayerId &&
      activeChat?.activeLayerId !== message.visualizationLayerId
    ) {
      setActiveVisualizationLayer(message.visualizationLayerId);
    }
  };

  const canInteractWithContent = message.visualizationLayerId && !isUser;

  // Find the visualization layer associated with this message
  const associatedLayer = message.visualizationLayerId 
    ? activeChat?.visualizationLayers.find(layer => layer.layerId === message.visualizationLayerId)
    : null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 my-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 border border-primary/50">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot size={18} />
          </AvatarFallback>
        </Avatar>
      )}
      <Card
        className={cn(
          "max-w-[80%] rounded-xl shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground rounded-bl-none",
          canInteractWithContent &&
            "cursor-pointer hover:shadow-md transition-shadow",
        )}
        onClick={canInteractWithContent ? handleContentClick : undefined}
        aria-selected={
          canInteractWithContent &&
          activeChat?.activeLayerId === message.visualizationLayerId
        }
      >
        <CardContent className="p-3 text-sm">
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : typeof message.content === "string" ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div 
                className="whitespace-pre-wrap break-words [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_table]:dark:border-gray-600 [&_th]:border [&_th]:border-gray-300 [&_th]:dark:border-gray-600 [&_th]:bg-gray-50 [&_th]:dark:bg-gray-800 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_td]:border [&_td]:border-gray-300 [&_td]:dark:border-gray-600 [&_td]:px-3 [&_td]:py-2"
                dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
              />
              
              {/* Embed visualization layer info inline */}
              {associatedLayer && !isUser && !message.isLoading && (
                <div className="mt-3 p-3 bg-muted/30 rounded-md border-l-4 border-accent">
                  <div className="text-sm font-medium text-foreground mb-1">
                    {associatedLayer.name}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {associatedLayer.type} - {new Date(associatedLayer.timestamp).toLocaleTimeString()}
                  </div>
                  
                  {associatedLayer.components && associatedLayer.components.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Components:</p>
                      <div className="text-xs text-foreground">
                        {associatedLayer.components.map(comp => comp.name).join(', ')}
                      </div>
                    </div>
                  )}

                  {/* Table with layer details */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-2 font-medium">Name</th>
                          <th className="text-left p-2 font-medium">ID</th>
                          <th className="text-left p-2 font-medium">DB</th>
                          <th className="text-left p-2 font-medium">Sequence</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2">{associatedLayer.name.replace(' (3D)', '')}</td>
                          <td className="p-2">{associatedLayer.cid || 'N/A'}</td>
                          <td className="p-2">{associatedLayer.pubChemUrl ? 'PubChem' : 'Local'}</td>
                          <td className="p-2">
                            {associatedLayer.type === 'protein_fold' ? 
                              (associatedLayer.data ? 'Protein Structure' : 'N/A') :
                              (associatedLayer.cid ? `CID: ${associatedLayer.cid}` : 'N/A')
                            }
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    The 3D molecular structure is now loaded in the visualizer.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <FormattedContent content={message.content} />
          )}
        </CardContent>
      </Card>
      {isUser && (
        <Avatar className="h-8 w-8 border">
          <AvatarFallback>
            {profile.displayName ? (
              profile.displayName.substring(0, 2).toUpperCase()
            ) : (
              <User size={18} />
            )}
          </AvatarFallback>
        </Avatar>
      )}
       
    </div>
  );
};

export const ChatMessageSkeleton: React.FC<{ isUser?: boolean }> = ({
  isUser = false,
}) => {
  return (
    <div
      className={cn(
        "flex items-start gap-3 my-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && <Skeleton className="h-8 w-8 rounded-full" />}
      <div
        className={cn(
          "max-w-[60%] rounded-xl p-3",
          isUser ? "bg-muted" : "bg-muted/50",
        )}
      >
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
      {isUser && <Skeleton className="h-8 w-8 rounded-full" />}
    </div>
  );
};