import { useEffect } from "react";

type KeyCombo = {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
};

type ShortcutHandler = (event: KeyboardEvent) => void;

type ShortcutMap = {
  [id: string]: {
    combo: KeyCombo | KeyCombo[];
    handler: ShortcutHandler;
    description: string;
    disabled?: boolean;
  };
};

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if target is input/textarea/select
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }
      
      // Check each shortcut
      Object.entries(shortcuts).forEach(([_, shortcut]) => {
        if (shortcut.disabled) return;
        
        const combos = Array.isArray(shortcut.combo) 
          ? shortcut.combo 
          : [shortcut.combo];
        
        const matchesCombo = combos.some(combo => {
          return (
            event.key.toLowerCase() === combo.key.toLowerCase() &&
            !!event.altKey === !!combo.altKey &&
            !!event.ctrlKey === !!combo.ctrlKey &&
            !!event.shiftKey === !!combo.shiftKey &&
            !!event.metaKey === !!combo.metaKey
          );
        });
        
        if (matchesCombo) {
          event.preventDefault();
          shortcut.handler(event);
        }
      });
    };
    
    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shortcuts]);
  
  // Return a function that gets all shortcut descriptions
  return {
    getShortcutDescriptions: () => {
      return Object.entries(shortcuts)
        .filter(([_, shortcut]) => !shortcut.disabled)
        .map(([id, shortcut]) => {
          const combos = Array.isArray(shortcut.combo) 
            ? shortcut.combo 
            : [shortcut.combo];
          
          const keyText = combos.map(combo => {
            const parts = [];
            if (combo.ctrlKey) parts.push("Ctrl");
            if (combo.altKey) parts.push("Alt");
            if (combo.shiftKey) parts.push("Shift");
            if (combo.metaKey) parts.push("⌘");
            
            let keyName = combo.key;
            if (keyName === " ") keyName = "Space";
            if (keyName.length === 1) keyName = keyName.toUpperCase();
            
            parts.push(keyName);
            return parts.join("+");
          }).join(" or ");
          
          return {
            id,
            keys: keyText,
            description: shortcut.description
          };
        });
    }
  };
}