
"use client";

import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Layers, Trash2 } from 'lucide-react';
import type { VisualizationLayer } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface LayerItemProps {
  layer: VisualizationLayer;
  isActive: boolean;
  onSelect: () => void;
  onToggleComponentVisibility: (componentId: string) => void;
  onDelete: () => void;
}

const LayerItem: React.FC<LayerItemProps> = ({ layer, isActive, onSelect, onToggleComponentVisibility, onDelete }) => {
  return (
    <div
      className={`p-2 rounded-md border transition-all cursor-pointer ${isActive ? 'bg-accent/20 border-accent' : 'hover:bg-muted/50'}`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium truncate">{layer.name}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          {isActive ? <Layers className="h-4 w-4 text-accent" /> : <Layers className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{layer.type} - {new Date(layer.timestamp).toLocaleTimeString()}</p>
      {isActive && layer.components && layer.components.length > 0 && (
        <div className="mt-2 space-y-1 pl-2 border-l-2 border-accent/50 ml-1">
          <p className="text-xs font-medium text-muted-foreground">Components:</p>
          {layer.components.map(comp => (
            <div key={comp.id} className="flex items-center space-x-2">
              <Checkbox
                id={`${layer.layerId}-${comp.id}`}
                checked={comp.visible}
                onCheckedChange={() => onToggleComponentVisibility(comp.id)}
                onClick={(e) => e.stopPropagation()} // Prevent layer selection when clicking checkbox
              />
              <Label htmlFor={`${layer.layerId}-${comp.id}`} className="text-xs font-normal cursor-pointer">
                {comp.name}
              </Label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const LayerManager: React.FC = () => {
  const { activeChat, setActiveVisualizationLayer, updateChat, removeVisualizationLayerFromActiveChat } = useAppContext();

  if (!activeChat || activeChat.visualizationLayers.length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground text-center border rounded-md bg-muted/30">
        No visualizations yet for this chat.
      </div>
    );
  }

  const handleToggleComponentVisibility = (layerId: string, componentId: string) => {
    if (!activeChat) return;

    const updatedLayers = activeChat.visualizationLayers.map(l => {
      if (l.layerId === layerId && l.components) {
        return {
          ...l,
          components: l.components.map(c =>
            c.id === componentId ? { ...c, visible: !c.visible } : c
          )
        };
      }
      return l;
    });
    updateChat(activeChat.id, { visualizationLayers: updatedLayers, lastModifiedAt: new Date().toISOString() });
  };


  const sortedLayers = [...activeChat.visualizationLayers].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <Card className="shadow-sm rounded-lg border bg-card/80 backdrop-blur-sm">
      <CardHeader className="p-3 border-b">
        <CardTitle className="text-sm">Visualization Layers</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-48 max-h-[20vh]"> {/* Adjust height as needed */}
          <div className="p-2 space-y-1.5">
            {sortedLayers.map(layer => (
              <LayerItem
                key={layer.layerId}
                layer={layer}
                isActive={activeChat.activeLayerId === layer.layerId}
                onSelect={() => setActiveVisualizationLayer(layer.layerId)}
                onToggleComponentVisibility={(componentId) => handleToggleComponentVisibility(layer.layerId, componentId)}
                onDelete={() => removeVisualizationLayerFromActiveChat(layer.layerId)}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

