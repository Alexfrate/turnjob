// Simple toast hook (temporary - replace with shadcn toast later)
import { useState } from 'react';

export function useToast() {
  const [, setToasts] = useState<any[]>([]);

  const toast = ({ title, description, variant }: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
    console.log('[Toast]', variant || 'default', title, description);

    // In futuro questo mostrerà un toast UI
    // Per ora logga in console
    if (typeof window !== 'undefined') {
      if (variant === 'destructive') {
        alert(`❌ ${title}\n${description || ''}`);
      } else {
        alert(`✅ ${title}\n${description || ''}`);
      }
    }
  };

  return { toast };
}
