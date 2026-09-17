'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function BuilderUsernameRedirect() {
  const { username } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (!username) return;
    const key = Array.isArray(username) ? username[0] : username;
    // Fetch profile to get id, then route to /b/[id]
    fetch(`/api/users/${encodeURIComponent(key)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data?.id) {
          router.replace(`/b/${data.data.id}`);
        } else {
          router.replace(`/b/${key}`);
        }
      })
      .catch(() => {
        router.replace(`/b/${key}`);
      });
  }, [username, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-2 font-mono text-sm text-fg3">
        <Loader2 size={16} className="animate-spin text-accent" />
        <span>Loading builder profile...</span>
      </div>
    </div>
  );
}
