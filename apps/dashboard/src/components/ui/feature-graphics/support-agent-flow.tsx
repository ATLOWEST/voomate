'use client';

import React, { forwardRef, useRef } from 'react';
import { cn } from '@/lib/utils';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import { Sparkles } from 'lucide-react';

const Circle = forwardRef<HTMLDivElement, { className?: string; children?: React.ReactNode }>(
  ({ className, children }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'z-10 flex size-12 items-center justify-center rounded-full border-2 border-[#EAD9C4] bg-white p-3 shadow-md',
          className,
        )}
      >
        {children}
      </div>
    );
  },
);
Circle.displayName = 'Circle';

export function SupportAgentFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const div1Ref = useRef<HTMLDivElement>(null); // Shopify
  const div2Ref = useRef<HTMLDivElement>(null); // Notion/Knowledge
  const div3Ref = useRef<HTMLDivElement>(null); // WhatsApp
  const div4Ref = useRef<HTMLDivElement>(null); // Voomate Brain
  const div5Ref = useRef<HTMLDivElement>(null); // Instagram
  const div6Ref = useRef<HTMLDivElement>(null); // Zendesk
  const div7Ref = useRef<HTMLDivElement>(null); // Phone

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#FFF4ED] to-[#FFFBF5] p-10"
      ref={containerRef}
    >
      {/* Subtle texture */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="flex size-full flex-col max-w-lg max-h-[300px] items-stretch justify-between gap-10 z-10">
        <div className="flex flex-row items-center justify-between">
          <Circle ref={div1Ref}>
            <Icons.shopify />
          </Circle>
          <Circle ref={div5Ref}>
            <Icons.instagram />
          </Circle>
        </div>
        <div className="flex flex-row items-center justify-between">
          <Circle ref={div2Ref}>
            <Icons.notion />
          </Circle>

          <Circle
            ref={div4Ref}
            className="size-20 border-none shadow-[0_4px_30px_rgba(232,89,12,0.3)] bg-gradient-to-br from-[#FA732F] to-[#E8590C]"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </Circle>

          <Circle ref={div6Ref}>
            <Icons.zendesk />
          </Circle>
        </div>
        <div className="flex flex-row items-center justify-between">
          <Circle ref={div3Ref}>
            <Icons.whatsapp />
          </Circle>
          <Circle ref={div7Ref}>
            <Icons.phone />
          </Circle>
        </div>
      </div>

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div1Ref}
        toRef={div4Ref}
        curvature={-50}
        endYOffset={-10}
      />
      <AnimatedBeam containerRef={containerRef} fromRef={div2Ref} toRef={div4Ref} />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div3Ref}
        toRef={div4Ref}
        curvature={50}
        endYOffset={10}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div5Ref}
        toRef={div4Ref}
        curvature={-50}
        endYOffset={-10}
        reverse
      />
      <AnimatedBeam containerRef={containerRef} fromRef={div6Ref} toRef={div4Ref} reverse />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div7Ref}
        toRef={div4Ref}
        curvature={50}
        endYOffset={10}
        reverse
      />
    </div>
  );
}

const Icons = {
  notion: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z"
        fill="#ffffff"
      />
      <path
        d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z"
        fill="#000000"
      />
    </svg>
  ),
  shopify: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M19.52 7.73l-6.8-2.61c-.48-.18-1.02-.18-1.5 0l-6.8 2.61c-.6.23-1 .81-1.01 1.45l-.46 9.8c-.03.73.55 1.35 1.28 1.35H20c.71 0 1.28-.58 1.28-1.29l.3-9.87c.01-.63-.38-1.2-1.06-1.44z"
        fill="#95BF47"
      />
      <path
        d="M15.48 10.7c-.24 0-.46.12-.59.32l-2.19 3.52-1.02-1.53c-.15-.22-.4-.36-.67-.36s-.52.14-.67.36l-2.51 3.76c-.22.34-.04.82.35.88l8.28 1.24c.39.06.74-.24.74-.63v-6.93c0-.35-.28-.63-.63-.63z"
        fill="#FFFFFF"
      />
    </svg>
  ),
  whatsapp: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12.05 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.74.45 3.42 1.31 4.93L2 22l5.3-1.39c1.47.81 3.12 1.24 4.8 1.24 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.05 2zm5.46 14.18c-.23.64-1.28 1.19-1.78 1.23-.46.04-1.06.13-3.37-.82-2.77-1.14-4.54-4-4.66-4.16-.12-.16-1.12-1.48-1.12-2.82 0-1.34.7-2 1-2.31.25-.26.56-.32.74-.32.18 0 .37 0 .52.01.17.01.4 0 .62.53.23.56.76 1.84.82 1.97.06.13.11.29.02.48-.09.2-.14.32-.27.48-.13.16-.29.35-.4.47-.13.13-.26.27-.12.51.14.24.63 1.04 1.35 1.68.93.83 1.71 1.08 1.95 1.2.24.12.38.1.53-.08.14-.18.63-.73.8-1 .17-.26.34-.22.56-.14.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.59-.17 1.23z"
        fill="#25D366"
      />
    </svg>
  ),
  instagram: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#E1306C" />
      <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" fill="none" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="white" />
    </svg>
  ),
  zendesk: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5c0 1.38-1.12 2.5-2.5 2.5S6 17.88 6 16.5V11h5v5.5zm0-7v-3c0-1.38 1.12-2.5 2.5-2.5S16 5.12 16 6.5v4.5h-5z"
        fill="#03363D"
      />
    </svg>
  ),
  phone: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#4B5563" />
      <path
        d="M15.4 12.6l-2-2c-.2-.2-.5-.2-.7 0l-1.1 1.1c-.2-.1-.5-.2-.8-.4-.3-.2-.5-.4-.7-.6l1.1-1.1c.2-.2.2-.5 0-.7l-2-2c-.2-.2-.5-.2-.7 0L7.1 8.3c-.2.2-.3.5-.3.8 0 2.2.9 4.3 2.5 5.9 1.6 1.6 3.7 2.5 5.9 2.5.3 0 .6-.1.8-.3l1.4-1.4c.2-.2.2-.5 0-.7z"
        fill="white"
      />
    </svg>
  ),
};
