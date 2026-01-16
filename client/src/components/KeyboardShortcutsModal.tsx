import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InteractiveButton } from "@/components/ui/interactive-button";
import { X } from "lucide-react";
import { useMicroInteractions } from "@/hooks/use-micro-interactions";

export type ShortcutDescription = {
  id: string;
  keys: string;
  description: string;
};

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: (ShortcutDescription | null)[] | ShortcutDescription[];
}

const KeyboardShortcutsModal = ({
  open,
  onOpenChange,
  shortcuts: rawShortcuts,
}: KeyboardShortcutsModalProps) => {
  // Filter out null values
  const shortcuts = rawShortcuts.filter((s): s is ShortcutDescription => s !== null);
  
  // Use micro-interactions
  const microInteractions = useMicroInteractions({
    onPulse: true,
  });
  
  // Helper function to pulse elements 
  const pulseElement = (element: HTMLElement) => {
    const color = 'rgba(118, 185, 0, 0.2)';
    const originalBoxShadow = element.style.boxShadow;
    
    element.style.boxShadow = `0 0 0 2px ${color}`;
    
    setTimeout(() => {
      element.style.boxShadow = originalBoxShadow;
    }, 300);
  };
  
  // Group shortcuts by category based on their ID prefix
  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    // This cast is safe because we already filtered out null values
    const safeShortcut = shortcut as ShortcutDescription;
    const category = safeShortcut.id.split('.')[0] || 'general';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(safeShortcut);
    return groups;
  }, {} as Record<string, ShortcutDescription[]>);

  // Format category names
  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A1A] border-[#333] text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            Keyboard Shortcuts
            <DialogClose asChild>
              <InteractiveButton 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onRipple={true}
              >
                <X className="h-4 w-4" />
              </InteractiveButton>
            </DialogClose>
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate JensenGPT more efficiently.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 sm:grid-cols-2">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="space-y-3">
              <h3 className="font-medium text-nvidia-green text-sm uppercase tracking-wider">
                {formatCategory(category)}
              </h3>
              <div className="space-y-1">
                {categoryShortcuts.map((shortcut) => (
                  <div 
                    key={shortcut.id} 
                    className="flex justify-between text-sm py-1.5 border-b border-[#333] transition-colors hover:bg-[rgba(118,185,0,0.05)] rounded-sm px-2 cursor-default"
                    ref={(el) => el && el.addEventListener('mouseenter', () => pulseElement(el))}
                  >
                    <span className="text-gray-300">{shortcut.description}</span>
                    <kbd className="ml-2 px-2 py-0.5 bg-[#2A2A2A] border border-[#444] rounded text-xs font-mono transition-all hover:border-nvidia-green hover:shadow-sm hover:shadow-[rgba(118,185,0,0.2)]">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsModal;