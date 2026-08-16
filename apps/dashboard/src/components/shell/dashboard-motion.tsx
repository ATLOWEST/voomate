'use client';

import { usePathname } from 'next/navigation';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function DashboardMotion() {
  const pathname = usePathname();

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
        intro.fromTo(
          '.dashboard-main [data-dashboard-motion]',
          { autoAlpha: 0, y: 18, scale: 0.99 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.68,
            stagger: 0.09,
            clearProps: 'transform',
          },
        );

        gsap.utils.toArray<HTMLElement>('[data-dashboard-stack]').forEach((element) => {
          gsap.fromTo(
            element,
            { autoAlpha: 0, y: 24, scale: 0.975 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.76,
              ease: 'power3.out',
              clearProps: 'transform',
              scrollTrigger: {
                trigger: element,
                scroller: '#dashboard-content',
                start: 'top 94%',
                once: true,
              },
            },
          );
        });

        gsap.to('.dashboard-live-track', {
          xPercent: -50,
          duration: 30,
          repeat: -1,
          ease: 'none',
        });
      });
      return () => media.revert();
    },
    { dependencies: [pathname] },
  );

  return null;
}
