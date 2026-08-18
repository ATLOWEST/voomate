'use client';

import { useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Code, Database, BrainCircuit, MousePointerClick, MessageSquareText, UserPlus, LayoutDashboard, Phone, Cable, CheckCircle2 } from 'lucide-react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

type AgentType = 'web' | 'voice' | 'integration';

export function OperatingFlow() {
  const [activeAgent, setActiveAgent] = useState<AgentType>('web');
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Staggered reveal animation on scroll
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 75%',
        end: 'bottom center',
        toggleActions: 'play none none reverse',
      }
    });

    tl.fromTo('.anim-stage', 
      { autoAlpha: 0, y: 30 }, 
      { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.2, ease: 'power3.out' }
    );

    // Continuous pulse for SVG connecting lines
    gsap.to('.flow-connector-line', {
      strokeDashoffset: -40,
      duration: 1.5,
      ease: 'none',
      repeat: -1,
    });
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="flow-story" aria-labelledby="flow-title">
      <div className="arch-stage">
        {/* Header & Tabs */}
        <div className="arch-header">
          <p className="editorial-index">How one request moves</p>
          <h2 id="arch-flow-title">
            Install once. Understand everything. Act instantly.
          </h2>
        </div>

        <div className="agent-selector-tabs anim-stage">
          <button 
            className={`agent-tab ${activeAgent === 'web' ? 'active' : ''}`}
            onClick={() => setActiveAgent('web')}
          >
            Web Agent
          </button>
          <button 
            className={`agent-tab ${activeAgent === 'voice' ? 'active' : ''}`}
            onClick={() => setActiveAgent('voice')}
          >
            Voice Agent
          </button>
          <button 
            className={`agent-tab ${activeAgent === 'integration' ? 'active' : ''}`}
            onClick={() => setActiveAgent('integration')}
          >
            Integration Agent
          </button>
        </div>

        {/* 6-Stage Flow Container */}
        <div className="six-stage-flow mt-16">
          
          {/* Stage 2: Install */}
          <div className="stage-block anim-stage" data-stage="install">
            <div className="stage-icon-wrap">
              {activeAgent === 'web' && <Code size={24} />}
              {activeAgent === 'voice' && <Phone size={24} />}
              {activeAgent === 'integration' && <Cable size={24} />}
            </div>
            <h4>
              {activeAgent === 'web' && 'One-line SDK'}
              {activeAgent === 'voice' && 'Phone Number'}
              {activeAgent === 'integration' && 'API Connect'}
            </h4>
            <p>Add one line. Live in minutes.</p>
          </div>

          <div className="stage-gap anim-stage">
            <svg width="100%" height="2px"><line x1="0" y1="1" x2="100%" y2="1" className="flow-connector-line" strokeDasharray="6 6" /></svg>
          </div>

          {/* Stage 3: Understand */}
          <div className="stage-block anim-stage" data-stage="understand">
            <div className="stage-icon-wrap">
              <Database size={24} />
            </div>
            <h4>Stack Scan</h4>
            <p>Learns your real setup — safely, read-only.</p>
          </div>

          <div className="stage-gap anim-stage">
            <svg width="100%" height="2px"><line x1="0" y1="1" x2="100%" y2="1" className="flow-connector-line" strokeDasharray="6 6" /></svg>
          </div>

          {/* Stage 1: The Reveal (Brain) */}
          <div className="stage-block stage-block--brain anim-stage" data-stage="reveal">
            <div className="brain-orb">
              <div className="brain-orb-core">
                <BrainCircuit size={28} className="arch-icon-ember" />
              </div>
              {/* Optional embedded orange dots pattern here */}
              <div className="brain-particles"></div>
            </div>
            <h4>Voomate Engine</h4>
            <p>Powered by frontier AI models.</p>
          </div>

          <div className="stage-gap anim-stage">
            <svg width="100%" height="2px"><line x1="0" y1="1" x2="100%" y2="1" className="flow-connector-line" strokeDasharray="6 6" /></svg>
          </div>

          {/* Stage 4: Act (Branching) */}
          <div className="stage-block stage-block--act anim-stage" data-stage="act">
            <div className="act-branches">
              <div className="act-node">
                <MessageSquareText size={16} /> <span>Answers directly</span>
              </div>
              <div className="act-node">
                <MousePointerClick size={16} /> <span>Guides UI</span>
              </div>
              <div className="act-node">
                <UserPlus size={16} /> <span>Human handoff</span>
              </div>
            </div>
            <p className="mt-4">Answers, guides, and knows when to escalate.</p>
          </div>

          <div className="stage-gap anim-stage">
            <svg width="100%" height="2px"><line x1="0" y1="1" x2="100%" y2="1" className="flow-connector-line" strokeDasharray="6 6" /></svg>
          </div>

          {/* Stage 5: Manage */}
          <div className="stage-block stage-block--dashboard anim-stage" data-stage="manage">
            <div className="dashboard-preview">
               <div className="dash-header"><div className="dash-dot"/><div className="dash-dot"/><div className="dash-dot"/></div>
               <div className="dash-body">
                 <div className="dash-line w-3/4"></div>
                 <div className="dash-line w-1/2"></div>
                 <div className="dash-line w-full"></div>
               </div>
            </div>
            <h4>Control Center</h4>
            <p>Every conversation, one dashboard.</p>
          </div>

        </div>
      </div>
    </section>
  );
}
