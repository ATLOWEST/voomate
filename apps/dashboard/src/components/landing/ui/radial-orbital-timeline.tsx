'use client';
import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Link as LinkIcon, Zap } from 'lucide-react';

interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: 'completed' | 'in-progress' | 'pending';
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
}

export default function RadialOrbitalTimeline({ timelineData }: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) newState[parseInt(key)] = false;
      });
      newState[id] = !prev[id];
      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);
        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);
        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }
      return newState;
    });
  };

  useEffect(() => {
    let rotationTimer: NodeJS.Timeout;
    if (autoRotate) {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => Number(((prev + 0.3) % 360).toFixed(3)));
      }, 50);
    }
    return () => {
      if (rotationTimer) clearInterval(rotationTimer);
    };
  }, [autoRotate]);

  const centerViewOnNode = (nodeId: number) => {
    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;
    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 185;
    const radian = (angle * Math.PI) / 180;
    const x = radius * Math.cos(radian);
    const y = radius * Math.sin(radian);
    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(0.35, Math.min(1, 0.35 + 0.65 * ((1 + Math.sin(radian)) / 2)));
    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    return getRelatedItems(activeNodeId).includes(itemId);
  };

  const getStatusLabel = (status: TimelineItem['status']): string => {
    if (status === 'completed') return 'Done';
    if (status === 'in-progress') return 'Active';
    return 'Next';
  };

  const getStatusColor = (status: TimelineItem['status']): string => {
    if (status === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (status === 'in-progress') return 'bg-[#FFF4ED] text-[#E8590C] border-[#FFE4CC]';
    return 'bg-[#FAF5EE] text-[#9A8B7A] border-[#EDE0CE]';
  };

  return (
    <div
      className="w-full h-[600px] flex flex-col items-center justify-center overflow-hidden relative"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{ perspective: '1000px' }}
        >
          {/* Center orb — warm ember */}
          <div
            className="absolute w-16 h-16 rounded-full flex items-center justify-center z-10"
            style={{
              background: 'linear-gradient(135deg, #E8590C, #B33208)',
              boxShadow:
                '0 0 0 10px rgba(232,89,12,0.08), 0 0 0 20px rgba(232,89,12,0.04), 0 4px 24px rgba(232,89,12,0.35)',
            }}
          >
            <div className="absolute w-20 h-20 rounded-full border border-[#E8590C]/20 animate-ping opacity-60" />
            <div
              className="absolute w-28 h-28 rounded-full border border-[#E8590C]/10 animate-ping opacity-30"
              style={{ animationDelay: '0.7s' }}
            />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-7 h-7 text-white"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
            </svg>
          </div>

          {/* Orbit ring — warm border */}
          <div
            className="absolute rounded-full"
            style={{
              width: '390px',
              height: '390px',
              border: '1px solid rgba(232,89,12,0.15)',
              background:
                'radial-gradient(ellipse at center, rgba(232,89,12,0.03) 0%, transparent 65%)',
            }}
          />
          {/* Second ring */}
          <div
            className="absolute rounded-full"
            style={{
              width: '460px',
              height: '460px',
              border: '1px dashed rgba(232,89,12,0.08)',
            }}
          />

          {/* Nodes */}
          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                ref={(el) => {
                  nodeRefs.current[item.id] = el;
                }}
                className="absolute transition-all duration-700 cursor-pointer"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(calc(-50% + ${position.x.toFixed(3)}px), calc(-50% + ${position.y.toFixed(3)}px))`,
                  zIndex: isExpanded ? 200 : position.zIndex,
                  opacity: isExpanded ? 1 : position.opacity,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                {/* Glow halo */}
                {(isPulsing || isExpanded) && (
                  <div
                    className="absolute rounded-full animate-pulse"
                    style={{
                      inset: '-12px',
                      background:
                        'radial-gradient(circle, rgba(232,89,12,0.18) 0%, transparent 70%)',
                    }}
                  />
                )}

                {/* Node circle */}
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isExpanded
                      ? 'border-[#E8590C] scale-150 shadow-[0_0_20px_rgba(232,89,12,0.4)]'
                      : isRelated
                        ? 'border-[#E8590C]/60 animate-pulse'
                        : 'border-[#EDE0CE] hover:border-[#E8590C]/50'
                  }`}
                  style={{
                    background: isExpanded
                      ? 'linear-gradient(135deg, #E8590C, #B33208)'
                      : isRelated
                        ? 'rgba(232,89,12,0.1)'
                        : '#FFFFFF',
                    boxShadow: isExpanded
                      ? '0 4px 20px rgba(232,89,12,0.3)'
                      : '0 1px 4px rgba(26,21,16,0.08)',
                  }}
                >
                  <Icon
                    size={17}
                    style={{ color: isExpanded ? '#FFFFFF' : isRelated ? '#E8590C' : '#9A8B7A' }}
                  />
                </div>

                {/* Label below node */}
                <div
                  className={`absolute top-13 left-1/2 -translate-x-1/2 whitespace-nowrap mt-2 text-[11px] font-semibold tracking-wide transition-all duration-300 ${
                    isExpanded ? 'text-[#1A1510] scale-110' : 'text-[#9A8B7A]'
                  }`}
                  style={{ top: '48px' }}
                >
                  {item.title}
                </div>

                {/* Expanded card — warm theme */}
                {isExpanded && (
                  <div
                    className="absolute w-64 rounded-2xl overflow-hidden"
                    style={{
                      top: '68px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#FFFFFF',
                      border: '1px solid #EDE0CE',
                      boxShadow: '0 8px 40px rgba(26,21,16,0.12), 0 2px 8px rgba(26,21,16,0.06)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Top ember stripe */}
                    <div
                      className="h-0.5 w-full"
                      style={{ background: 'linear-gradient(to right, #FFE4CC, #E8590C, #FFE4CC)' }}
                    />

                    {/* Connector dot */}
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-px h-3 bg-[#EDE0CE]" />

                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusColor(item.status)}`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                        <span className="text-[10px] font-mono text-[#9A8B7A]">{item.date}</span>
                      </div>

                      <h4 className="text-[13px] font-bold text-[#1A1510] mb-1.5">{item.title}</h4>
                      <p className="text-[12px] text-[#5A4D40] leading-relaxed">{item.content}</p>

                      {/* Energy bar */}
                      <div className="mt-3 pt-3 border-t border-[#F5EAD8]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-1 text-[10px] text-[#9A8B7A] font-medium">
                            <Zap size={9} />
                            Confidence
                          </span>
                          <span className="text-[10px] font-mono text-[#E8590C] font-bold">
                            {item.energy}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#F5EAD8] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${item.energy}%`,
                              background: 'linear-gradient(to right, #FFB380, #E8590C)',
                            }}
                          />
                        </div>
                      </div>

                      {/* Related items */}
                      {item.relatedIds.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#F5EAD8]">
                          <div className="flex items-center gap-1 mb-2">
                            <LinkIcon size={9} className="text-[#9A8B7A]" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A8B7A]">
                              Connected steps
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.relatedIds.map((relatedId) => {
                              const rel = timelineData.find((i) => i.id === relatedId);
                              return (
                                <button
                                  key={relatedId}
                                  className="flex items-center h-6 px-2.5 text-[10.5px] font-semibold rounded-full border border-[#EDE0CE] bg-[#FAF5EE] text-[#5A4D40] hover:border-[#E8590C]/40 hover:text-[#E8590C] transition-colors gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItem(relatedId);
                                  }}
                                >
                                  {rel?.title}
                                  <ArrowRight size={8} />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
