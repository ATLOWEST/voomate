'use client';

import { usePathname } from 'next/navigation';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

export function DashboardMotion() {
  const pathname = usePathname();

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.dashboard-main [data-dashboard-motion]',
          { autoAlpha: 0, y: 18, scale: 0.99 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.62,
            stagger: 0.08,
            ease: 'power3.out',
            clearProps: 'transform',
          },
        );
      });
      return () => media.revert();
    },
    { dependencies: [pathname] },
  );

  return null;
}
