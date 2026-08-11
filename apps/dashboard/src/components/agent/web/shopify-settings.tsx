'use client';

import { useState } from 'react';
import {
  Mic,
  Palette,
  MessageSquare,
  Zap,
  CheckCircle2,
  Play,
  Menu,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export function ShopifySettings() {
  const [activeTab, setActiveTab] = useState('identity');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form State
  const [agentName, setAgentName] = useState('Voomate AI');
  const [greeting, setGreeting] = useState(
    "Hi! I'm your AI shopping assistant. How can I help you today?",
  );
  const [persona, setPersona] = useState(
    'You are a helpful, enthusiastic customer support agent for a premium clothing brand.',
  );
  const [colorTheme, setColorTheme] = useState('blue');
  const [voiceVoice, setVoiceVoice] = useState('Joanna');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setHasChanges(false);
    }, 1000);
  };

  const markChanged = () => setHasChanges(true);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Manage Voice Agent</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Configure your agent's identity, voice, and widget appearance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={!hasChanges || isSaving}
            onClick={handleSave}
            className={cn(
              'px-5 py-2.5 text-[13px] font-bold rounded-xl transition-colors flex items-center gap-2',
              hasChanges && !isSaving
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                : 'bg-black/5 dark:bg-white/5 text-muted-foreground cursor-not-allowed',
            )}
          >
            {isSaving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border/50 pb-px overflow-x-auto">
        <TabButton
          active={activeTab === 'identity'}
          onClick={() => setActiveTab('identity')}
          icon={<MessageSquare className="w-4 h-4" />}
          label="Identity & Persona"
        />
        <TabButton
          active={activeTab === 'appearance'}
          onClick={() => setActiveTab('appearance')}
          icon={<Palette className="w-4 h-4" />}
          label="Widget Appearance"
        />
        <TabButton
          active={activeTab === 'voice'}
          onClick={() => setActiveTab('voice')}
          icon={<Mic className="w-4 h-4" />}
          label="Voice Settings"
        />
        <TabButton
          active={activeTab === 'promos'}
          onClick={() => setActiveTab('promos')}
          icon={<Zap className="w-4 h-4" />}
          label="Promotions & Upsells"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'identity' && (
            <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-6">
              <div>
                <label className="block text-[13px] font-bold text-foreground mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => {
                    setAgentName(e.target.value);
                    markChanged();
                  }}
                  className="w-full px-4 py-2.5 bg-background border border-border/50 rounded-xl text-[14px] focus:outline-none focus:border-blue-500/50"
                />
                <p className="text-[12px] text-muted-foreground mt-1.5">
                  This name appears in the chat widget header.
                </p>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-foreground mb-2">
                  Welcome Greeting
                </label>
                <textarea
                  value={greeting}
                  onChange={(e) => {
                    setGreeting(e.target.value);
                    markChanged();
                  }}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-background border border-border/50 rounded-xl text-[14px] focus:outline-none focus:border-blue-500/50 resize-none"
                />
                <p className="text-[12px] text-muted-foreground mt-1.5">
                  The first thing the agent says when a user calls.
                </p>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-foreground mb-2">
                  Base Persona (System Prompt)
                </label>
                <textarea
                  value={persona}
                  onChange={(e) => {
                    setPersona(e.target.value);
                    markChanged();
                  }}
                  rows={5}
                  className="w-full px-4 py-2.5 bg-background border border-border/50 rounded-xl text-[14px] focus:outline-none focus:border-blue-500/50 font-mono"
                />
                <p className="text-[12px] text-muted-foreground mt-1.5">
                  Define the agent's tone, boundaries, and primary goal.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-6">
              <div>
                <label className="block text-[13px] font-bold text-foreground mb-3">
                  Color Theme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['blue', 'emerald', 'purple', 'orange'].map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setColorTheme(color);
                        markChanged();
                      }}
                      className={cn(
                        'p-4 rounded-xl border flex flex-col items-center gap-2 transition-all',
                        colorTheme === color
                          ? `border-${color}-500 bg-${color}-500/10`
                          : 'border-border/50 bg-background hover:border-border',
                      )}
                    >
                      <div className={cn(`w-6 h-6 rounded-full bg-${color}-500`)} />
                      <span className="text-[12px] font-bold capitalize">{color}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-6">
              <div>
                <label className="block text-[13px] font-bold text-foreground mb-2">
                  Voice Model
                </label>
                <select
                  value={voiceVoice}
                  onChange={(e) => {
                    setVoiceVoice(e.target.value);
                    markChanged();
                  }}
                  className="w-full px-4 py-2.5 bg-background border border-border/50 rounded-xl text-[14px] focus:outline-none focus:border-blue-500/50"
                >
                  <option value="Joanna">Joanna (US English - Female)</option>
                  <option value="Matthew">Matthew (US English - Male)</option>
                  <option value="Amy">Amy (UK English - Female)</option>
                  <option value="Brian">Brian (UK English - Male)</option>
                </select>

                <button className="mt-3 flex items-center gap-2 text-[12px] font-bold text-blue-500 hover:text-blue-600 transition-colors">
                  <Play className="w-3 h-3 fill-current" /> Hear sample
                </button>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-foreground mb-2">
                  Speaking Speed ({voiceSpeed}x)
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={voiceSpeed}
                  onChange={(e) => {
                    setVoiceSpeed(parseFloat(e.target.value));
                    markChanged();
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Fast</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'promos' && (
            <div className="p-12 rounded-2xl border border-border/50 bg-card text-center flex flex-col items-center justify-center">
              <Zap className="w-10 h-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">Pro Feature</h3>
              <p className="text-[14px] text-muted-foreground max-w-sm mb-6">
                Upgrade to Growth plan to enable AI-driven upsells and cart recovery discounts.
              </p>
              <button className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-bold rounded-xl transition-colors">
                Upgrade Plan
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Live Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <h3 className="text-[13px] font-bold text-foreground uppercase tracking-widest mb-4">
              Live Preview
            </h3>

            <div className="rounded-[32px] border-[6px] border-black/10 dark:border-white/10 bg-background overflow-hidden aspect-[9/16] relative shadow-2xl flex flex-col">
              {/* Realistic mock website header */}
              <div className="h-12 border-b border-border/50 flex items-center justify-between px-4 bg-background z-10 relative">
                <Menu className="w-4 h-4 text-foreground" />
                <span className="text-[12px] font-black tracking-widest uppercase">My Store</span>
                <ShoppingBag className="w-4 h-4 text-foreground" />
              </div>

              <div className="flex-1 bg-background flex flex-col overflow-hidden relative">
                {/* Hero Image Area */}
                <div
                  className="h-32 relative flex flex-col items-center justify-center p-4 text-center bg-cover bg-center"
                  style={{
                    backgroundImage:
                      'url("https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=500&q=80")',
                  }}
                >
                  <div className="absolute inset-0 bg-black/40 z-0" />
                  <div className="relative z-10 space-y-1 text-white">
                    <div className="text-[14px] font-bold">Summer Collection</div>
                    <div className="text-[10px] text-white/90">Up to 40% off select styles</div>
                    <div className="mt-2 px-3 py-1 bg-white text-black text-[10px] font-bold rounded-full w-fit mx-auto">
                      Shop Now
                    </div>
                  </div>
                </div>

                {/* Mock Products */}
                <div className="p-4 grid grid-cols-2 gap-3 relative z-10 bg-background flex-1 overflow-y-auto">
                  <div className="space-y-2">
                    <div
                      className="aspect-[3/4] bg-black/5 rounded-lg bg-cover bg-center"
                      style={{
                        backgroundImage:
                          'url("https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=80")',
                      }}
                    />
                    <div className="text-[10px] font-medium leading-tight">Classic White Tee</div>
                    <div className="text-[10px] font-bold">$24.00</div>
                  </div>
                  <div className="space-y-2">
                    <div
                      className="aspect-[3/4] bg-black/5 rounded-lg bg-cover bg-center"
                      style={{
                        backgroundImage:
                          'url("https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=300&q=80")',
                      }}
                    />
                    <div className="text-[10px] font-medium leading-tight">Denim Jacket</div>
                    <div className="text-[10px] font-bold">$89.00</div>
                  </div>
                </div>
              </div>

              {/* Floating Widget Preview */}
              <div className="absolute bottom-4 right-4 flex flex-col items-end gap-3">
                <div className="bg-card border border-border/50 rounded-2xl shadow-xl w-64 overflow-hidden origin-bottom-right animate-in fade-in zoom-in duration-300">
                  <div className={cn('p-4 text-white', `bg-${colorTheme}-500`)}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-bold">{agentName}</span>
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    </div>
                    <p className="text-[12px] opacity-90 leading-relaxed">{greeting}</p>
                  </div>
                  <div className="p-3 bg-card border-t border-border/50 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Listening...
                    </span>
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center',
                        `bg-${colorTheme}-500/10 text-${colorTheme}-500`,
                      )}
                    >
                      <Mic className="w-3 h-3" />
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    'w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white cursor-pointer',
                    `bg-${colorTheme}-500`,
                  )}
                >
                  <Mic className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-3 text-[13px] font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap',
        active
          ? 'border-blue-500 text-blue-500'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-t-xl',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
