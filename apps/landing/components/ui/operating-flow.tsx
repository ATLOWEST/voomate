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
    <section ref={sectionRef} className="operating-flow-section" aria-labelledby="flow-title">
      <div className="operating-flow-container">
        {/* Header */}
        <div className="section-heading">
          <p className="editorial-index">How one request moves</p>
          <h2 id="flow-title">
            Install once. Understand everything.
            <br />
            Act instantly.
          </h2>
          <p className="section-subtext">
            Every channel uses the same knowledge, permissions, and conversation history. Your customer never has to start over when the work moves from an answer to an action.
          </p>
        </div>

        {/* Centered Agent Selector Tabs */}
        <div className="agent-selector-tabs-wrapper anim-stage">
          <div className="agent-selector-tabs">
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
        </div>

        {/* 6-Stage Flow Container */}
        <div className="six-stage-flow">
          
          {/* Stage 1: Install */}
          <div className="stage-block anim-stage" data-stage="install">
            <div className="stage-icon-wrap">
              {activeAgent === 'web' && <Code size={20} />}
              {activeAgent === 'voice' && <Phone size={20} />}
              {activeAgent === 'integration' && <Cable size={20} />}
            </div>
            <h4>
              {activeAgent === 'web' && 'One-line SDK'}
              {activeAgent === 'voice' && 'Phone Number'}
              {activeAgent === 'integration' && 'API Connect'}
            </h4>
            <p>Add one line. Live in minutes.</p>
          </div>

          <div className="stage-gap anim-stage">
            <svg width="36" height="2" viewBox="0 0 36 2"><line x1="0" y1="1" x2="36" y2="1" className="flow-connector-line" strokeDasharray="4 4" /></svg>
          </div>

          {/* Stage 2: Understand */}
          <div className="stage-block anim-stage" data-stage="understand">
            <div className="stage-icon-wrap">
              <Database size={20} />
            </div>
            <h4>Stack Scan</h4>
            <p>Learns your real setup — safely, read-only.</p>
          </div>

          <div className="stage-gap anim-stage">
            <svg width="36" height="2" viewBox="0 0 36 2"><line x1="0" y1="1" x2="36" y2="1" className="flow-connector-line" strokeDasharray="4 4" /></svg>
          </div>

          {/* Stage 3: The Reveal (Brain) */}
          <div className="stage-block stage-block--brain anim-stage" data-stage="reveal">
            <div className="brain-orb">
              <div className="brain-orb-core">
                <BrainCircuit size={24} className="arch-icon-ember" />
              </div>
              <div className="brain-particles"></div>
            </div>
            <h4>Voomate Engine</h4>
            <p>Powered by frontier AI models.</p>
          </div>

          <div className="stage-gap anim-stage">
            <svg width="36" height="2" viewBox="0 0 36 2"><line x1="0" y1="1" x2="36" y2="1" className="flow-connector-line" strokeDasharray="4 4" /></svg>
          </div>

          {/* Stage 4: Act (Branching) */}
          <div className="stage-block stage-block--act anim-stage" data-stage="act">
            <div className="act-branches">
              <div className="act-node">
                <MessageSquareText size={14} /> <span>Answers directly</span>
              </div>
              <div className="act-node">
                <MousePointerClick size={14} /> <span>Guides UI</span>
              </div>
              <div className="act-node">
                <UserPlus size={14} /> <span>Human handoff</span>
              </div>
            </div>
            <p>Answers, guides, and escalates safely.</p>
          </div>

          <div className="stage-gap anim-stage">
            <svg width="36" height="2" viewBox="0 0 36 2"><line x1="0" y1="1" x2="36" y2="1" className="flow-connector-line" strokeDasharray="4 4" /></svg>
          </div>

          {/* Stage 5: Manage */}
          <div className="stage-block stage-block--dashboard anim-stage" data-stage="manage">
            <div className="dashboard-preview">
               <div className="dash-header"><div className="dash-dot"/><div className="dash-dot"/><div className="dash-dot"/></div>
               <div className="dash-body">
                 <div className="dash-line" style={{ width: '75%' }}></div>
                 <div className="dash-line" style={{ width: '50%' }}></div>
                 <div className="dash-line" style={{ width: '100%' }}></div>
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
