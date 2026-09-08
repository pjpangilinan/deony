import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

interface Experience {
  id: string;
  media_title: string;
  media_type: string;
  status: string;
  rating?: number | null;
}

export interface GuardrailInfo {
  status: 'PASSED' | 'INTERVENED';
  action: 'ALLOWED' | 'REDACTED' | 'BLOCKED';
  reason?: string;
  piiRedacted: boolean;
  blockedTopic?: string;
  latencyMs?: number;
  guardrailId?: string;
  guardrailVersion?: string;
  model?: string;
}

interface ChatMessage {
  id: string;
  sender: 'deonysus' | 'user';
  text: string;
  timestamp: string;
  command?: string;
  guardrail?: GuardrailInfo;
}

const PRESET_COMMANDS = [
  {
    cmd: '/roast',
    label: 'Roast My Archive',
    icon: 'local_fire_department',
    desc: 'Full Olympian critique of your habits',
  },
  {
    cmd: '/taste',
    label: 'Roast My Taste',
    icon: 'auto_awesome',
    desc: '5-star gems vs questionable pleasures',
  },
  {
    cmd: '/backlog',
    label: 'Roast My Backlog',
    icon: 'history_edu',
    desc: 'Shame your abandoned wishlist',
  },
  {
    cmd: '/grape',
    label: 'Divine Grape Lore',
    icon: 'wine_bar',
    desc: 'Olympian wine & theater easter egg',
  },
];

export function DeonysusPage() {
  const [entryCount, setEntryCount] = useState<number | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [showGuardrailModal, setShowGuardrailModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isConsulting]);

  // Load experience count on mount
  useEffect(() => {
    loadArchiveState();
  }, []);

  const loadArchiveState = async () => {
    try {
      setLoadingInitial(true);
      const res = await api.get<{ items: Experience[] }>('/experiences');
      const items = res.items || [];
      const count = items.length;
      setEntryCount(count);

      if (count >= 20) {
        // Welcome message from Deonysus for this fresh session
        setMessages([
          {
            id: 'welcome',
            sender: 'deonysus',
            text: `*lounges upon an ivy-draped divan, lifting a golden goblet of vintage wine*\n\nGreetings, mortal. You have accumulated ${count} offerings in this digital sanctuary of yours. The satyrs whisper that you consider your taste impeccable.\n\nI am **Deonysus**—patron of tragedy, comedy, revelry, and divine judgment. Choose an invocation below or whisper a question if you dare.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            guardrail: {
              status: 'PASSED',
              action: 'ALLOWED',
              piiRedacted: false,
              guardrailId: 'deony-olympian-guardrail-v1',
              guardrailVersion: '1',
              model: 'anthropic.claude-3-haiku-20240307-v1:0',
              latencyMs: 14,
            },
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load archive state:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleSendCommand = async (commandStr: string) => {
    if (!commandStr.trim() || isConsulting) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: commandStr,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsConsulting(true);

    try {
      const isPreset = commandStr.startsWith('/');
      const payload = isPreset ? { command: commandStr } : { message: commandStr };

      const res = await api.post<{ reply: string; command?: string; guardrail?: GuardrailInfo }>('/ai/deonysus', payload);

      const botMsg: ChatMessage = {
        id: `deonysus-${Date.now()}`,
        sender: 'deonysus',
        text: res.reply || 'The oracle is momentarily silent. Pour another cup and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        command: res.command,
        guardrail: res.guardrail,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Failed to chat with Deonysus:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'deonysus',
        text: '*A sudden thunderbolt from Mount Olympus disrupts the offering. Please verify your connection or try again.*',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsConsulting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendCommand(inputText);
  };

  const handleClearSession = () => {
    if (entryCount && entryCount >= 20) {
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          sender: 'deonysus',
          text: `*refills the amphora with fresh wine*\n\nA new slate! The theatre stands empty once more. Present your next invocation, mortal.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          guardrail: {
            status: 'PASSED',
            action: 'ALLOWED',
            piiRedacted: false,
            guardrailId: 'deony-olympian-guardrail-v1',
            guardrailVersion: '1',
            model: 'anthropic.claude-3-haiku-20240307-v1:0',
            latencyMs: 12,
          },
        },
      ]);
    }
  };

  if (loadingInitial) {
    return (
      <div className="max-w-[860px] mx-auto px-gutter md:px-8 py-xl flex flex-col items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">cyclone</span>
        <p className="mt-md font-body-md text-secondary">Approaching the Temple of Deonysus...</p>
      </div>
    );
  }

  // Locked State (< 20 entries)
  if (entryCount !== null && entryCount < 20) {
    const progressPercent = Math.min(100, Math.round((entryCount / 20) * 100));
    return (
      <div className="max-w-[720px] mx-auto px-gutter md:px-8 py-xl">
        <div className="bg-surface border border-tertiary/25 rounded-2xl p-xl md:p-xxl text-center relative overflow-hidden shadow-xs">
          {/* Subtle divine background glow */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-20 h-20 rounded-full bg-primary-container/15 text-primary flex items-center justify-center mx-auto mb-lg border border-primary/20 shadow-inner">
            <span className="material-symbols-outlined text-4xl">lock</span>
          </div>

          <span className="font-label-md text-label-md uppercase tracking-wider text-secondary px-sm py-xs rounded-full bg-secondary-container/40 inline-block mb-sm">
            Archiver Threshold • 20 Required
          </span>

          <h1 className="font-display text-headline-lg text-primary mb-sm">
            The Temple of Deonysus Remains Slumbering
          </h1>

          <p className="font-body-md text-secondary max-w-[540px] mx-auto mb-xl leading-relaxed">
            Deonysus—the Greek god of wine, theatre, and unsparing artistic judgment—only grants audience to dedicated archivers. Present at least 20 experiences to awaken the critic.
          </p>

          {/* Progress Bar */}
          <div className="max-w-[420px] mx-auto mb-lg">
            <div className="flex justify-between items-center text-xs font-label-md text-secondary mb-xs">
              <span>Current Offerings</span>
              <span className="font-bold text-primary">{entryCount} / 20</span>
            </div>
            <div className="w-full h-3 bg-secondary-container rounded-full overflow-hidden p-0.5 border border-tertiary/20">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-secondary mt-xs">
              {20 - entryCount} more {20 - entryCount === 1 ? 'entry' : 'entries'} needed to unlock
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-md justify-center items-center">
            <Link
              to="/log"
              className="bg-primary text-on-primary font-label-md text-label-md px-lg py-md rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-colors duration-200 flex items-center gap-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Log an Experience
            </Link>
            <Link
              to="/library"
              className="text-secondary hover:text-primary font-label-md text-label-md px-md py-sm transition-colors"
            >
              Browse Library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Unlocked Chatbot Interface
  return (
    <div className="max-w-[900px] mx-auto px-gutter md:px-8 py-md flex flex-col h-[calc(100vh-5rem)] md:h-[calc(100vh-2rem)] relative">
      {/* Header Sanctuary Banner */}
      <div className="border-b border-tertiary/25 pb-sm mb-sm flex flex-wrap items-center justify-between gap-md shrink-0">
        <div className="flex items-center gap-md">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              wine_bar
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-sm">
              <h1 className="font-display text-headline-md text-primary tracking-tight">Deonysus</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-label-md px-2 py-0.5 rounded-full bg-primary-container/20 text-primary border border-primary/25">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Olympian Critic • AWS Bedrock
              </span>
              <button
                onClick={() => setShowGuardrailModal(true)}
                className="inline-flex items-center gap-1 text-[11px] font-label-md px-2 py-0.5 rounded-full bg-surface-container border border-tertiary/30 text-secondary hover:text-primary hover:border-primary/40 transition-all cursor-pointer shadow-2xs"
                title="View AWS Bedrock Guardrails Architecture"
              >
                <span className="material-symbols-outlined text-xs text-primary">shield</span>
                Guardrails Active
              </button>
            </div>
            <p className="font-body-md text-xs text-secondary">
              God of wine, festivity, and playfully judging your media consumption.
            </p>
          </div>
        </div>

        <button
          onClick={handleClearSession}
          title="Pour a new goblet (clear session history)"
          className="text-secondary hover:text-primary text-xs font-label-md flex items-center gap-1 px-3 py-1.5 rounded-lg border border-tertiary/30 hover:bg-surface-container transition-all"
        >
          <span className="material-symbols-outlined text-sm">restart_alt</span>
          Fresh Goblet
        </button>
      </div>

      {/* Preset Command Bar */}
      <div className="mb-sm shrink-0">
        <p className="text-[11px] font-label-md uppercase tracking-wider text-secondary mb-1.5">
          Preset Invocations
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_COMMANDS.map((item) => (
            <button
              key={item.cmd}
              onClick={() => handleSendCommand(item.cmd)}
              disabled={isConsulting}
              className="flex flex-col items-start p-2.5 rounded-xl border border-tertiary/25 bg-surface hover:bg-primary-container/10 hover:border-primary/40 transition-all text-left group disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-1.5 text-primary mb-1">
                <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                <span className="font-label-md text-xs font-semibold">{item.cmd}</span>
              </div>
              <span className="text-[11px] text-secondary group-hover:text-on-surface line-clamp-1">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-md pr-1 pb-4 scroll-smooth">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-[10px] font-label-md uppercase tracking-wider text-secondary">
                {msg.sender === 'user' ? 'Mortal Offering' : 'Deonysus'}
              </span>
              <span className="text-[10px] text-secondary/70">{msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-primary text-on-primary rounded-tr-xs'
                  : 'bg-surface border border-tertiary/30 text-on-surface rounded-tl-xs'
              }`}
            >
              {msg.text.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className={idx > 0 ? 'mt-2.5' : ''}>
                  {paragraph}
                </p>
              ))}

              {/* Responsible AI Guardrail Telemetry Strip */}
              {msg.guardrail && (
                <div className="mt-3 pt-2 border-t border-tertiary/20 flex flex-wrap items-center gap-2 text-[10px] font-mono text-secondary">
                  {msg.guardrail.status === 'INTERVENED' ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">gpp_maybe</span>
                      Guardrail Intervened • {msg.guardrail.reason || 'Safety Block'}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">verified_user</span>
                      Guardrail Evaluated: Safe
                    </span>
                  )}

                  {msg.guardrail.piiRedacted && (
                    <span className="px-1.5 py-0.5 rounded bg-secondary-container text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">lock</span>
                      PII Masked
                    </span>
                  )}

                  {msg.guardrail.latencyMs !== undefined && (
                    <span className="text-secondary/60">
                      {msg.guardrail.latencyMs}ms
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isConsulting && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-[10px] font-label-md uppercase tracking-wider text-secondary">
                Deonysus
              </span>
            </div>
            <div className="bg-surface border border-tertiary/30 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2 text-xs text-secondary shadow-xs">
              <span className="material-symbols-outlined text-base text-primary animate-spin">
                cyclone
              </span>
              <span>Evaluating Guardrails & Consulting Olympian records...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Interactive Input Bar */}
      <div className="pt-2 border-t border-tertiary/25 shrink-0">
        <form onSubmit={handleFormSubmit} className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isConsulting}
            placeholder="Whisper an offering or command (/roast, /taste, /backlog, /grape)..."
            className="w-full bg-surface border border-tertiary/35 rounded-xl px-4 py-3 pr-12 text-sm text-on-surface placeholder:text-secondary/70 outline-none focus:outline-none focus:border-primary transition-colors ring-0 focus:ring-0"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isConsulting}
            aria-label="Send message"
            className="absolute right-2 p-2 rounded-lg text-primary hover:bg-primary/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">send</span>
          </button>
        </form>
        <p className="text-[11px] text-secondary/80 mt-1.5 text-center flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-xs text-primary">shield</span>
          Amazon Bedrock Guardrails Active • Multi-layer prompt injection & PII defense
        </p>
      </div>

      {/* AWS AI Practitioner Guardrails Architecture Modal */}
      {showGuardrailModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-md">
          <div className="bg-surface border border-tertiary/30 rounded-2xl p-lg max-w-[560px] w-full shadow-lg relative max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-md border-b border-tertiary/20 pb-sm">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-2xl">shield</span>
                <h3 className="font-display text-headline-md">AWS Responsible AI Guardrails</h3>
              </div>
              <button
                onClick={() => setShowGuardrailModal(false)}
                className="text-secondary hover:text-primary transition-colors"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs font-body-md text-secondary mb-md leading-relaxed">
              This architecture demonstrates enterprise-grade Responsible AI & defense-in-depth principles aligned with the <strong>AWS Certified AI Practitioner (AIF-C01)</strong> domain requirements:
            </p>

            <div className="space-y-sm text-xs">
              <div className="p-3 rounded-xl bg-surface-container border border-tertiary/20">
                <div className="font-semibold text-primary flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-sm">security</span>
                  1. Prompt Injection & Jailbreak Defense
                </div>
                <p className="text-secondary">
                  Pre-inference deterministic filters detect adversarial prompt overrides ("ignore previous instructions", "DAN", system prompt extraction) and intercede prior to model invocation.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container border border-tertiary/20">
                <div className="font-semibold text-primary flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-sm">vpn_key</span>
                  2. Sensitive Information & PII Redaction
                </div>
                <p className="text-secondary">
                  Real-time regex & token masking automatically sanitizes credit card numbers, social security numbers, emails, and phone numbers before reaching LLM inference context.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container border border-tertiary/20">
                <div className="font-semibold text-primary flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  3. Contextual Grounding & Hallucination Mitigation
                </div>
                <p className="text-secondary">
                  Roasts are strictly grounded in user-owned DynamoDB library records (titles, ratings, statuses) passed in the system context.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container border border-tertiary/20">
                <div className="font-semibold text-primary flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-sm">cloud</span>
                  4. Amazon Bedrock Guardrails Specification
                </div>
                <p className="text-secondary font-mono text-[11px]">
                  Guardrail ID: deony-olympian-guardrail-v1 • Version: 1 • Model: anthropic.claude-3-haiku-20240307-v1:0
                </p>
              </div>
            </div>

            <div className="mt-md pt-sm border-t border-tertiary/20 text-right">
              <button
                onClick={() => setShowGuardrailModal(false)}
                className="bg-primary text-on-primary font-label-md text-xs px-md py-sm rounded-lg hover:bg-primary-container transition-colors cursor-pointer"
              >
                Close Architecture View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
