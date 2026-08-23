'use client';

import { usePathname } from 'next/navigation';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function MarketingMotion() {
  const pathname = usePathname();

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
          gsap.fromTo(
            element,
            { opacity: 0.48, y: 28 },
            {
              opacity: 1,
              y: 0,
              duration: 0.9,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: element,
                start: 'top 88%',
                once: true,
              },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>('[data-scrub]').forEach((element) => {
          gsap.fromTo(
            element,
            { opacity: 0.78, y: 18 },
            {
              opacity: 1,
              y: 0,
              duration: 0.75,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: element,
                start: 'top 90%',
                once: true,
              },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((element) => {
          gsap.fromTo(
            element,
            { yPercent: -6 },
            {
              yPercent: 8,
              ease: 'none',
              scrollTrigger: {
                trigger: element,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.2,
              },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>('[data-media-reveal]').forEach((element) => {
          gsap.fromTo(
            element,
            { opacity: 0.66, scale: 0.96, transformOrigin: '50% 50%' },
            {
              opacity: 1,
              scale: 1,
              duration: 0.8,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: element,
                start: 'top 88%',
                once: true,
              },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>('[data-word-scrub]').forEach((element) => {
          const words = gsap.utils.toArray<HTMLElement>('span', element);
          gsap.fromTo(
            words,
            { autoAlpha: 0.16 },
            {
              autoAlpha: 1,
              stagger: 0.06,
              ease: 'none',
              scrollTrigger: {
                trigger: element,
                start: 'top 82%',
                end: 'bottom 54%',
                scrub: 0.55,
              },
            },
          );
        });

        requestAnimationFrame(() => ScrollTrigger.refresh());
      });

      return () => media.revert();
    },
    { dependencies: [pathname] },
  );

  return null;
}
