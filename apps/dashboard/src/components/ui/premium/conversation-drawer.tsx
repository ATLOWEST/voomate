'use client';

import { Bot, Phone, Code, User, Download, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const TRANSCRIPT = [
  {
    id: 1,
    role: 'agent',
    content: "Hello! Thank you for calling Voomate Support. I'm Sarah, how can I assist you today?",
    time: '14:23:01',
  },
  {
    id: 2,
    role: 'user',
    content: "Hi Sarah. I'm calling because I was double charged for my last invoice.",
    time: '14:23:15',
  },
  {
    id: 3,
    role: 'agent',
    content:
      "I'm so sorry to hear that. I can definitely help you look into this. Could you please provide your account number or the phone number associated with your account?",
    time: '14:23:22',
  },
  { id: 4, role: 'user', content: 'My phone number is 555-019-8234.', time: '14:23:35' },
  {
    id: 5,
    role: 'tool',
    name: 'lookup_customer',
    params: '{ "phone": "+15550198234" }',
    result: '{ "id": "cust_8921", "name": "John Doe", "status": "active" }',
    time: '14:23:38',
  },
  {
    id: 6,
    role: 'tool',
    name: 'fetch_invoices',
    params: '{ "customer_id": "cust_8921" }',
    result:
      '[{ "id": "inv_102", "amount": 49.99, "status": "paid", "date": "2024-05-01" }, { "id": "inv_103", "amount": 49.99, "status": "paid", "date": "2024-05-01" }]',
    time: '14:23:40',
  },
  {
    id: 7,
    role: 'agent',
    content:
      'Thank you, John. I pulled up your account and I do see that two charges of $49.99 were processed on May 1st. That was definitely an error on our end.',
    time: '14:23:45',
  },
  {
    id: 8,
    role: 'tool',
    name: 'process_refund',
    params: '{ "invoice_id": "inv_103", "amount": 49.99 }',
    result: '{ "status": "success", "refund_id": "ref_992" }',
    time: '14:23:50',
  },
  {
    id: 9,
    role: 'agent',
    content:
      'I have just processed a refund for the duplicate charge of $49.99. It should appear back on your original payment method within 3-5 business days.',
    time: '14:23:55',
  },
  { id: 10, role: 'user', content: 'Oh wow, that was fast. Thank you so much!', time: '14:24:05' },
  {
    id: 11,
    role: 'agent',
    content: "You're very welcome! Is there anything else I can help you with today?",
    time: '14:24:10',
  },
  { id: 12, role: 'user', content: "No, that's it. Have a good day.", time: '14:24:15' },
  { id: 13, role: 'agent', content: 'You too! Thank you for choosing Voomate.', time: '14:24:18' },
];

export function ConversationDrawer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const conversationId = searchParams.get('conversation');
  const isOpen = !!conversationId;

  if (!isOpen) return null;

  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('conversation');
    const newPath = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newPath, { scroll: false });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-card border-l border-border/50 shadow-2xl h-full flex flex-col animate-in slide-in-from-right-full duration-300">
        {/* Header */}
        <div className="h-[72px] border-b border-border/50 bg-card flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-[15px] font-bold text-foreground">John Doe (+1 555-019-8234)</h1>
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Voice Call
                </span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>Today at 14:23</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>Duration: 3m 12s</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground border border-border/50 rounded-lg text-[12px] font-medium transition-colors">
              Escalate to human
            </button>
            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-lg text-[12px] font-medium transition-colors shadow-sm">
              Mark resolved
            </button>

            <div className="w-px h-4 bg-border/50 mx-1 hidden sm:block" />

            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground border border-border/50 rounded-lg text-[12px] font-medium transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
          {/* Transcript Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-center">
                <div className="px-3 py-1 rounded-full bg-border/50 text-[11px] font-medium text-muted-foreground">
                  Call started at 14:23:00
                </div>
              </div>

              {TRANSCRIPT.map((msg) => {
                if (msg.role === 'tool') {
                  return (
                    <div key={msg.id} className="flex justify-center my-4">
                      <div className="w-full max-w-lg bg-muted/30 border border-border/50 rounded-xl p-4 font-mono text-[11px]">
                        <div className="flex items-center gap-2 text-[#FF5722] mb-2 font-bold uppercase tracking-wider">
                          <Code className="w-3.5 h-3.5" />
                          Tool Invoked: {msg.name}
                        </div>
                        <div className="grid grid-cols-[80px_1fr] gap-2 mb-2">
                          <span className="text-muted-foreground">Params:</span>
                          <span className="text-foreground break-all">{msg.params}</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] gap-2">
                          <span className="text-muted-foreground">Result:</span>
                          <span className="text-foreground break-all line-clamp-2">
                            {msg.result}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                const isAgent = msg.role === 'agent';
                return (
                  <div
                    key={msg.id}
                    className={cn('flex gap-4', isAgent ? 'justify-start' : 'justify-end')}
                  >
                    {isAgent && (
                      <div className="w-8 h-8 rounded-full bg-[#FF5722]/10 border border-[#FF5722]/20 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-[#FF5722]" />
                      </div>
                    )}

                    <div
                      className={cn(
                        'max-w-[80%] flex flex-col',
                        isAgent ? 'items-start' : 'items-end',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[11px] font-bold text-muted-foreground">
                          {isAgent ? 'Agent' : 'User'}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">{msg.time}</span>
                      </div>
                      <div
                        className={cn(
                          'px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm',
                          isAgent
                            ? 'bg-card border border-border/50 text-foreground rounded-tl-sm'
                            : 'bg-[#FF5722] text-white rounded-tr-sm',
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>

                    {!isAgent && (
                      <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 mt-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center justify-center pt-4">
                <div className="px-3 py-1 rounded-full bg-border/50 text-[11px] font-medium text-muted-foreground">
                  Call ended at 14:24:20
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Sidebar */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border/50 bg-card p-6 overflow-y-auto shrink-0 hidden md:block">
            <h3 className="text-[14px] font-bold text-foreground mb-6">Conversation Details</h3>

            <div className="space-y-8">
              <div>
                <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  Customer Details
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-foreground font-semibold">
                      JD
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-foreground">John Doe</div>
                      <div className="text-[13px] text-muted-foreground">ID: cust_8921</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-foreground">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    +1 555-019-8234
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  Session Info
                </h3>
                <div className="space-y-4 text-[13px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Agent</span>
                    <span className="font-medium flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5" /> Customer Support L1
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Channel</span>
                    <span className="font-medium capitalize flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Voice
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span className="font-medium">14:23:00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">3m 12s</span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <span className="text-muted-foreground">Status</span>
                    <div className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolved
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  Summary
                </h3>
                <div className="text-[13px] text-foreground leading-relaxed bg-black/[0.02] dark:bg-white/[0.02] p-3 rounded-lg border border-border/50">
                  User called regarding a duplicate charge of $49.99. Agent authenticated the user,
                  verified the double charge in the billing system via tools, and processed a refund
                  automatically. User was satisfied.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
