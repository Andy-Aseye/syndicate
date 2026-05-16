'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

export interface ActivityLog {
  id: string;
  timestamp: string;
  agent: string;
  message: string;
}

export default function ActivityStream({ engagementId }: { engagementId: string }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    // Reference the subcollection: engagements/{engagementId}/logs
    const q = query(
      collection(db, 'engagements', engagementId, 'logs'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];
      setLogs(newLogs);
    });

    return () => unsubscribe();
  }, [engagementId]);

  return (
    <div className="rounded border border-white/10 bg-card flex flex-col h-[500px]">
      <div className="p-4 border-b border-white/10">
        <h3 className="font-bold text-sm text-gold uppercase tracking-wider">Live Activity Stream</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {logs.length === 0 ? (
          <p className="text-muted text-sm italic">Awaiting agent activity...</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 text-sm">
              <span className="text-xs text-muted min-w-[60px]">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="px-2 py-0.5 rounded bg-white/5 font-mono text-xs text-cyan border border-cyan/20">
                {log.agent}
              </span>
              <span className="text-gray-200">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
