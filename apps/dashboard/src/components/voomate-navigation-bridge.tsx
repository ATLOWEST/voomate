'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type NavigationRequest = CustomEvent<{
  requestId?: unknown;
  url?: unknown;
  mode?: unknown;
}>;

export function VoomateNavigationBridge() {
  const router = useRouter();

  useEffect(() => {
    let completionTimer: number | undefined;
    let timeoutTimer: number | undefined;

    const complete = (requestId: string, ok: boolean) => {
      window.dispatchEvent(
        new CustomEvent('voomate:navigation-complete', { detail: { requestId, ok } }),
      );
    };

    const onNavigationRequest = (rawEvent: Event) => {
      const event = rawEvent as NavigationRequest;
      const requestId = event.detail?.requestId;
      const destination = event.detail?.url;
      if (typeof requestId !== 'string' || typeof destination !== 'string') return;

      let target: URL;
      try {
        target = new URL(destination, window.location.href);
      } catch {
        return;
      }
      if (
        target.origin !== window.location.origin ||
        !['http:', 'https:'].includes(target.protocol)
      ) {
        return;
      }

      event.preventDefault();
      if (completionTimer) window.clearInterval(completionTimer);
      if (timeoutTimer) window.clearTimeout(timeoutTimer);

      const expected = `${target.pathname}${target.search}${target.hash}`;
      const current = () =>
        `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (current() === expected) {
        complete(requestId, true);
        return;
      }

      router.push(expected);
      completionTimer = window.setInterval(() => {
        if (current() !== expected) return;
        if (completionTimer) window.clearInterval(completionTimer);
        if (timeoutTimer) window.clearTimeout(timeoutTimer);
        completionTimer = undefined;
        timeoutTimer = undefined;
        complete(requestId, true);
      }, 40);
      timeoutTimer = window.setTimeout(() => {
        if (completionTimer) window.clearInterval(completionTimer);
        completionTimer = undefined;
        timeoutTimer = undefined;
        complete(requestId, false);
      }, 7_000);
    };

    window.addEventListener('voomate:navigation-request', onNavigationRequest);
    return () => {
      window.removeEventListener('voomate:navigation-request', onNavigationRequest);
      if (completionTimer) window.clearInterval(completionTimer);
      if (timeoutTimer) window.clearTimeout(timeoutTimer);
    };
  }, [router]);

  return null;
}
