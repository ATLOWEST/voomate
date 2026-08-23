'use client';

import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Activity,
  ArrowRight,
  AudioLines,
  Bot,
  Braces,
  Cable,
  Check,
  Database,
  Mail,
  Network,
  Radio,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
} from 'lucide-react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

type ScenarioId = 'commerce' | 'support' | 'voice' | 'fleet';

type Scenario = {
  id: ScenarioId;
  label: string;
  workflow: string;
  focus: string;
  stages: Array<{ title: string; detail: string; event: string }>;
  metrics: Array<{ label: string; value: string; detail: string }>;
};

const scenarios: readonly Scenario[] = [
  {
    id: 'commerce',
    label: 'Commerce',
    workflow: 'Verified customer resolution',
    focus: 'A web visitor gets grounded answers, controlled reads, and a verified next step.',
    stages: [
      { title: 'Intent', detail: 'Classifies the visitor request.', event: 'intent.classified' },
      {
        title: 'Context',
        detail: 'Uses the current page and approved knowledge.',
        event: 'context.bound',
      },
      {
        title: 'Action',
        detail: 'Executes only a named, approved capability.',
        event: 'action.gated',
      },
      {
        title: 'Receipt',
        detail: 'Records the outcome or escalates safely.',
        event: 'receipt.recorded',
      },
    ],
    metrics: [
      { label: 'Resolution', value: 'Measured per outcome', detail: 'Not message volume.' },
      { label: 'Actions', value: 'Policy-gated', detail: 'High-risk work needs approval.' },
      { label: 'Evidence', value: 'Trace retained', detail: 'Every run has a receipt.' },
    ],
  },
  {
    id: 'support',
    label: 'Customer support',
    workflow: 'Grounded support loop',
    focus: 'One shared conversation path keeps the answer tied to verified business knowledge.',
    stages: [
      { title: 'Question', detail: 'Identifies the customer need.', event: 'question.received' },
      {
        title: 'Grounding',
        detail: 'Retrieves tenant-scoped sources only.',
        event: 'knowledge.retrieved',
      },
      { title: 'Response', detail: 'Streams a customer-safe answer.', event: 'response.validated' },
      {
        title: 'Review',
        detail: 'Captures feedback and escalation signals.',
        event: 'quality.logged',
      },
    ],
    metrics: [
      { label: 'Grounding', value: 'Evaluated', detail: 'Against reviewed cases.' },
      { label: 'Escalation', value: 'Explicit', detail: 'Never hidden as a resolution.' },
      { label: 'Corrections', value: 'Tracked', detail: 'Used for offline improvement.' },
    ],
  },
  {
    id: 'voice',
    label: 'Voice and web',
    workflow: 'Shared omnichannel turn',
    focus: 'Voice is an audio interface over the same policy, context, and action planning path.',
    stages: [
      {
        title: 'Audio',
        detail: 'Detects speech and transcribes the turn.',
        event: 'audio.transcribed',
      },
      {
        title: 'Plan',
        detail: 'Uses the same deterministic orchestration as chat.',
        event: 'turn.planned',
      },
      {
        title: 'Stream',
        detail: 'Returns text and audio in the same turn lifecycle.',
        event: 'response.streaming',
      },
      {
        title: 'Handoff',
        detail: 'Stops or escalates when confidence is insufficient.',
        event: 'handoff.available',
      },
    ],
    metrics: [
      { label: 'First token', value: 'Logged', detail: 'Measured in runtime events.' },
      { label: 'Voice quality', value: 'Benchmarked', detail: 'Per locale and voice.' },
      { label: 'Parity', value: 'One planner', detail: 'No separate voice policy.' },
    ],
  },
  {
    id: 'fleet',
    label: 'Agent fleet',
    workflow: 'Governed operating control',
    focus:
      'Each workspace activates only released agents, scoped connections, and reviewed business learning.',
    stages: [
      {
        title: 'Catalog',
        detail: 'Releases only complete runtime contracts.',
        event: 'catalog.checked',
      },
      {
        title: 'Profile',
        detail: 'Pins an approved business operating profile.',
        event: 'profile.approved',
      },
      {
        title: 'Lease',
        detail: 'Binds runtime work to a revocable revision.',
        event: 'lease.verified',
      },
      {
        title: 'Audit',
        detail: 'Keeps evidence through pause and archive.',
        event: 'audit.persisted',
      },
    ],
    metrics: [
      { label: 'Lifecycle', value: 'Governed', detail: 'Draft, active, paused, archived.' },
      { label: 'Learning', value: 'Reviewed', detail: 'Never self-promoted.' },
      { label: 'Access', value: 'Named scopes', detail: 'No inherited authority.' },
    ],
  },
] as const;

const inputs = [
  { label: 'Web SDK', detail: 'Signed session', icon: Braces },
  { label: 'Business API', detail: 'Named capability', icon: Cable },
  { label: 'Voice stream', detail: 'WebRTC transport', icon: AudioLines },
  { label: 'Knowledge', detail: 'Reviewed sources', icon: Database },
  { label: 'Telephony', detail: 'Approved connector', icon: Radio },
  { label: 'Tenant boundary', detail: 'Scoped data', icon: ShieldCheck },
  { label: 'Events', detail: 'Verified webhook', icon: Mail },
  { label: 'Retrieval', detail: 'Grounded context', icon: ScanSearch },
] as const;

export function OperatingFlow() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('commerce');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [simulation, setSimulation] = useState(0);
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const scenario = scenarios.find(({ id }) => id === scenarioId) ?? scenarios[0];

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 72%',
          end: 'bottom 30%',
          toggleActions: 'play none none reverse',
        },
      });
      timeline.fromTo(
        '.workflow-reveal',
        { autoAlpha: 0, y: 28 },
        { autoAlpha: 1, y: 0, duration: 0.72, stagger: 0.1, ease: 'power3.out' },
      );
      gsap.to('.workflow-orbit-dash', {
        strokeDashoffset: -72,
        duration: 2.4,
        ease: 'none',
        repeat: -1,
      });
    },
    { scope: sectionRef },
  );

  useGSAP(
    () => {
      if (!simulation) return;
      const stages = gsap.utils.toArray<HTMLElement>('.workflow-stage');
      const timeline = gsap.timeline({ onComplete: () => setActiveStage(null) });
      stages.forEach((stage, index) => {
        timeline
          .call(() => setActiveStage(index))
          .to(stage, { scale: 1.025, duration: 0.16, ease: 'power2.out' })
          .to(stage, { scale: 1, duration: 0.24, ease: 'power2.inOut' });
      });
    },
    { dependencies: [simulation], scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="working-loop"
      className="operating-flow-section"
      aria-labelledby="flow-title"
    >
      <div className="operating-flow-container workflow-shell">
        <div className="section-heading workflow-heading workflow-reveal">
          <h2 id="flow-title">Install once. Understand everything. Act with control.</h2>
          <p className="section-subtext">
            The same governed runtime carries context, permissions, and evidence across web chat,
            voice, and connected business systems.
          </p>
        </div>

        <div className="workflow-cockpit-frame workflow-reveal">
          <div className="workflow-topline">
            <span className="workflow-live-mark" aria-hidden="true" />
            <span>Voomate AI Operating System</span>
            <span className="workflow-topline-detail">Governance and telemetry</span>
          </div>

          <div className="workflow-tabs" role="tablist" aria-label="Operating scenarios">
            {scenarios.map((item) => (
              <button
                key={item.id}
                id={`workflow-tab-${item.id}`}
                className={item.id === scenario.id ? 'workflow-tab is-active' : 'workflow-tab'}
                role="tab"
                type="button"
                aria-selected={item.id === scenario.id}
                aria-controls={`workflow-panel-${item.id}`}
                tabIndex={item.id === scenario.id ? 0 : -1}
                onClick={() => setScenarioId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            id={`workflow-panel-${scenario.id}`}
            className="workflow-grid"
            role="tabpanel"
            aria-labelledby={`workflow-tab-${scenario.id}`}
          >
            <section
              className="workflow-panel workflow-inputs workflow-reveal"
              aria-label="Enterprise inputs"
            >
              <div className="workflow-panel-heading">
                <Network size={17} />
                <span>Enterprise inputs</span>
              </div>
              <div className="workflow-input-grid">
                {inputs.map(({ label, detail, icon: Icon }) => (
                  <div className="workflow-input" key={label} title={detail}>
                    <Icon size={15} aria-hidden="true" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <p>
                Connections contribute only the capabilities the workspace has explicitly approved.
              </p>
            </section>

            <section
              className="workflow-panel workflow-brain workflow-reveal"
              aria-label="Context brain"
            >
              <div className="workflow-panel-heading">
                <Sparkles size={17} />
                <span>Context brain</span>
              </div>
              <div className="workflow-lattice" aria-hidden="true">
                {Array.from({ length: 16 }, (_, index) => (
                  <i key={index} />
                ))}
              </div>
              <strong>Deciding the next safe step</strong>
              <p>
                Current page, approved business profile, grounded knowledge, and policy are kept
                separate.
              </p>
            </section>

            <section
              className="workflow-panel workflow-flywheel workflow-reveal"
              aria-label="Agent flywheel"
            >
              <div className="workflow-panel-heading">
                <Workflow size={17} />
                <span>Agent flywheel</span>
              </div>
              <div className="workflow-orbit" aria-hidden="true">
                <svg viewBox="0 0 360 210" focusable="false">
                  <ellipse className="workflow-orbit-ring" cx="180" cy="105" rx="156" ry="76" />
                  <ellipse className="workflow-orbit-dash" cx="180" cy="105" rx="156" ry="76" />
                </svg>
                <span className="workflow-orbit-node workflow-orbit-node--top">
                  <Target size={14} />
                </span>
                <span className="workflow-orbit-node workflow-orbit-node--right">
                  <Bot size={14} />
                </span>
                <span className="workflow-orbit-node workflow-orbit-node--bottom">
                  <Activity size={14} />
                </span>
                <span className="workflow-orbit-node workflow-orbit-node--left">
                  <ShieldCheck size={14} />
                </span>
                <div className="workflow-orbit-core">{scenario.workflow}</div>
              </div>
              <p>{scenario.focus}</p>
            </section>

            <section
              className="workflow-panel workflow-impact workflow-reveal"
              aria-label="Business impact"
            >
              <div className="workflow-panel-heading">
                <Activity size={17} />
                <span>Business impact</span>
              </div>
              <div className="workflow-metrics">
                {scenario.metrics.map((metric) => (
                  <div className="workflow-metric" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                    <small>{metric.detail}</small>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="workflow-stage-list workflow-reveal" aria-label="Execution stages">
            {scenario.stages.map((stage, index) => (
              <article
                className={activeStage === index ? 'workflow-stage is-running' : 'workflow-stage'}
                key={stage.event}
              >
                <span className="workflow-stage-number">0{index + 1}</span>
                <div>
                  <strong>{stage.title}</strong>
                  <p>{stage.detail}</p>
                </div>
                {activeStage !== null && index <= activeStage ? (
                  <Check size={16} />
                ) : (
                  <ArrowRight size={16} />
                )}
              </article>
            ))}
          </div>

          <div className="workflow-controls workflow-reveal">
            <button
              className="workflow-simulate"
              type="button"
              onClick={() => {
                setInspectorOpen(true);
                setSimulation((value) => value + 1);
              }}
            >
              Simulate the workflow
            </button>
            <button
              className="workflow-inspector-toggle"
              type="button"
              aria-expanded={inspectorOpen}
              aria-controls="workflow-inspector"
              onClick={() => setInspectorOpen((value) => !value)}
            >
              {inspectorOpen ? 'Hide telemetry inspector' : 'Inspect the telemetry'}
            </button>
          </div>

          {inspectorOpen && (
            <div id="workflow-inspector" className="workflow-inspector" aria-live="polite">
              <div>
                <span>Demonstration payload</span>
                <strong>{scenario.workflow}</strong>
              </div>
              <pre>
                {JSON.stringify(
                  {
                    channel: scenario.id === 'voice' ? 'voice' : 'web',
                    context: ['current_page', 'approved_profile', 'tenant_knowledge'],
                    policy: 'named_capabilities_only',
                    stages: scenario.stages.map(({ event }) => event),
                    result: 'simulated_verified_receipt',
                  },
                  null,
                  2,
                )}
              </pre>
              <p>
                Illustrative flow only. Actual timings, costs, and outcomes are recorded in
                workspace logs.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
