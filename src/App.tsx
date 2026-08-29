import { useState, useEffect, useRef } from 'react';
import { translations, type Translation } from './translations';
import { Plus, Minus, Trash2, Sun, Moon, Laptop, Copy, Check, Sparkles, AlertCircle, RotateCcw, ShieldCheck, Zap } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import confetti from 'canvas-confetti';
import { CanvasBackground } from './CanvasBackground';

gsap.registerPlugin(useGSAP);

interface Subject {
  id: number;
  name: string;
  held: number;
  attended: number;
  threshold: number;
}

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const isInitialMount = useRef<boolean>(true);

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');
  const [lang, setLang] = useState<string>('en');
  const [tab, setTab] = useState<'calc' | 'roster'>('calc');

  // Single calculator inputs
  const [held, setHeld] = useState<number>(48);
  const [attended, setAttended] = useState<number>(42);
  const [threshold, setThreshold] = useState<number>(75);

  // Multi subjects
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: 1, name: 'Machine Learning Lab', held: 36, attended: 32, threshold: 75 },
    { id: 2, name: 'Computer Networks', held: 28, attended: 22, threshold: 75 },
    { id: 3, name: 'Database Systems', held: 30, attended: 27, threshold: 80 },
    { id: 4, name: 'Discrete Math', held: 32, attended: 23, threshold: 75 },
  ]);

  const [simDiff, setSimDiff] = useState<{ label: string; text: string; safe: boolean } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const t: Translation = translations[lang] || translations.en;

  // Handle system and user theme
  useEffect(() => {
    const saved = localStorage.getItem('bunkim_theme') as 'light' | 'dark' | 'system' | null;
    if (saved) setTheme(saved);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => {
      if (theme === 'system') {
        setEffectiveTheme(media.matches ? 'dark' : 'light');
      } else {
        setEffectiveTheme(theme);
      }
    };

    updateTheme();
    media.addEventListener('change', updateTheme);
    return () => media.removeEventListener('change', updateTheme);
  }, [theme]);

  const applyTheme = (val: 'light' | 'dark' | 'system') => {
    setTheme(val);
    localStorage.setItem('bunkim_theme', val);
  };

  // Auto-detect browser regional language
  useEffect(() => {
    const uLang = (navigator.language || '').toLowerCase();
    if (uLang.startsWith('hi')) setLang('hi');
    else if (uLang.startsWith('te')) setLang('te');
    else if (uLang.startsWith('ta')) setLang('ta');
    else if (uLang.startsWith('kn')) setLang('kn');
    else if (uLang.startsWith('ml')) setLang('ml');
    else if (uLang.startsWith('bn')) setLang('bn');
    else if (uLang.startsWith('mr')) setLang('mr');
    else if (uLang.startsWith('es')) setLang('es');
    else if (uLang.startsWith('de')) setLang('de');
  }, []);

  // Safe clamping for single calculation
  const safeHeld = Math.max(1, held);
  const safeAttended = Math.max(0, Math.min(attended, safeHeld));
  const safeThreshold = Math.max(50, Math.min(99, threshold));
  const currentPct = safeHeld > 0 ? (safeAttended / safeHeld) * 100 : 100;
  const missed = safeHeld - safeAttended;
  const margin = currentPct - safeThreshold;
  const thresholdRatio = safeThreshold / 100;
  const isSafe = currentPct >= safeThreshold;

  const maxBunk = isSafe
    ? Math.max(0, Math.floor((safeAttended - thresholdRatio * safeHeld) / thresholdRatio))
    : 0;

  const neededClasses = !isSafe
    ? Math.max(0, Math.ceil((thresholdRatio * safeHeld - safeAttended) / (1 - thresholdRatio)))
    : 0;

  // Safe GSAP Page Entrance
  useGSAP(() => {
    gsap.fromTo(
      '.anim-item',
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: 'power2.out', clearProps: 'all' }
    );
  }, { scope: containerRef });

  // Number bump animation on subsequent user value changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (numberRef.current) {
      gsap.killTweensOf(numberRef.current);
      gsap.fromTo(
        numberRef.current,
        { scale: 1.25, y: -4 },
        { scale: 1, y: 0, duration: 0.28, ease: 'back.out(2)', clearProps: 'all' }
      );
    }
  }, [maxBunk, neededClasses, isSafe]);

  const handleHeldStep = (delta: number) => {
    const next = Math.max(1, safeHeld + delta);
    setHeld(next);
    if (safeAttended > next) setAttended(next);
    setSimDiff(null);
  };

  const handleAttendedStep = (delta: number) => {
    const next = Math.max(0, Math.min(safeAttended + delta, safeHeld));
    setAttended(next);
    setSimDiff(null);
  };

  const simulateImpact = (type: 'miss' | 'attend') => {
    const nextHeld = safeHeld + 1;
    const nextAttended = type === 'attend' ? safeAttended + 1 : safeAttended;
    const nextPct = (nextAttended / nextHeld) * 100;
    const diff = nextPct - currentPct;

    if (type === 'miss') {
      setSimDiff({
        label: t.simMissPrompt,
        text: `${nextPct.toFixed(1)}% (${diff.toFixed(1)}%)`,
        safe: nextPct >= safeThreshold,
      });
    } else {
      setSimDiff({
        label: t.simAttendPrompt,
        text: `${nextPct.toFixed(1)}% (+${diff.toFixed(1)}%)`,
        safe: nextPct >= safeThreshold,
      });
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2400);
  };

  const copySnapshot = () => {
    if (tab === 'calc') {
      const statusText = isSafe ? `${t.heroSafePre} ${maxBunk} ${t.heroSafeUnit}` : `${t.heroDangerPre} ${neededClasses} ${t.heroDangerUnit}`;
      const txt = `bunkim Report: ${safeAttended}/${safeHeld} (${currentPct.toFixed(1)}%) | Rule: ${safeThreshold}% | ${statusText}`;
      navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast(t.copiedToast);

      if (isSafe && maxBunk > 0) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#ff5722', '#10b981', '#38bdf8']
        });
      }
    } else {
      const txt = `bunkim Roster: ${totalAttendedSum}/${totalHeldSum} (${rosterAvgPct.toFixed(1)}%) across ${subjects.length} courses.`;
      navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast(t.copiedToast);
    }
  };

  const resetAll = () => {
    setHeld(48);
    setAttended(42);
    setThreshold(75);
    setSimDiff(null);
    showToast("Reset to sample stats");
  };

  // Multi course calculations
  const totalHeldSum = subjects.reduce((a, b) => a + Math.max(1, b.held), 0);
  const totalAttendedSum = subjects.reduce((a, b) => a + Math.max(0, Math.min(b.attended, Math.max(1, b.held))), 0);
  const rosterAvgPct = totalHeldSum > 0 ? (totalAttendedSum / totalHeldSum) * 100 : 100;

  const updateSubject = (id: number, field: keyof Subject, val: any) => {
    setSubjects(prev =>
      prev.map(s => {
        if (s.id === id) {
          const updated = { ...s, [field]: val };
          const sHeld = Math.max(1, updated.held);
          if (field === 'held') {
            updated.held = sHeld;
            if (updated.attended > sHeld) updated.attended = sHeld;
          }
          if (field === 'attended') {
            updated.attended = Math.max(0, Math.min(updated.attended, sHeld));
          }
          if (field === 'threshold') {
            updated.threshold = Math.max(50, Math.min(99, updated.threshold));
          }
          return updated;
        }
        return s;
      })
    );
  };

  const stepSubject = (id: number, field: 'held' | 'attended' | 'threshold', delta: number) => {
    setSubjects(prev =>
      prev.map(s => {
        if (s.id === id) {
          const currentVal = s[field];
          let nextVal = currentVal + delta;
          const updated = { ...s };

          if (field === 'held') {
            updated.held = Math.max(1, nextVal);
            if (updated.attended > updated.held) updated.attended = updated.held;
          } else if (field === 'attended') {
            updated.attended = Math.max(0, Math.min(nextVal, s.held));
          } else if (field === 'threshold') {
            updated.threshold = Math.max(50, Math.min(95, nextVal));
          }
          return updated;
        }
        return s;
      })
    );
  };

  const addSubject = () => {
    setSubjects(prev => [
      ...prev,
      {
        id: Date.now(),
        name: `Course ${prev.length + 1}`,
        held: 24,
        attended: 20,
        threshold: 75,
      },
    ]);
  };

  const deleteSubject = (id: number) => {
    if (subjects.length <= 1) {
      showToast("At least 1 course is required");
      return;
    }
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  const isDark = effectiveTheme === 'dark';

  return (
    <main
      ref={containerRef}
      className={`min-h-screen transition-colors duration-200 flex flex-col items-center justify-start p-4 sm:p-8 pb-24 relative overflow-x-hidden ${
        isDark
          ? 'bg-[#080b10] text-[#f8fafc]'
          : 'bg-[#fafafa] text-[#0f172a]'
      }`}
    >
      {/* Interactive dynamic particle wave background */}
      <CanvasBackground theme={effectiveTheme} />

      <div className="w-full max-w-[520px] flex flex-col gap-4 relative z-10">
        
        {/* TOP BRAND NAV BAR */}
        <header className="anim-item flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-brand font-black text-lg border ${
                isDark
                  ? 'bg-[#ff5722] text-white border-[#ff784e] neo-box-sm-dark'
                  : 'bg-[#ff5722] text-white border-[#0f172a] neo-box-sm-light'
              }`}
            >
              b
            </div>
            <div>
              <span className="font-brand font-black text-2xl tracking-tighter block leading-none">
                bunkim
              </span>
              <span className="text-[10px] text-[#94a3b8] font-mono font-bold tracking-tight">
                attendance cushion
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* THEME SELECTOR */}
            <div
              className={`flex p-1 rounded-2xl border ${
                isDark
                  ? 'bg-[#111722] border-[#1d2738] neo-box-sm-dark'
                  : 'bg-white border-[#0f172a] neo-box-sm-light'
              }`}
            >
              <button
                type="button"
                onClick={() => applyTheme('light')}
                title="Light mode"
                className={`p-1.5 rounded-xl transition-all ${
                  theme === 'light'
                    ? 'bg-[#ff5722] text-white shadow-xs'
                    : isDark ? 'text-[#94a3b8] hover:text-white' : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                <Sun size={14} />
              </button>
              <button
                type="button"
                onClick={() => applyTheme('dark')}
                title="Dark mode"
                className={`p-1.5 rounded-xl transition-all ${
                  theme === 'dark'
                    ? 'bg-[#ff5722] text-white shadow-xs'
                    : isDark ? 'text-[#94a3b8] hover:text-white' : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                <Moon size={14} />
              </button>
              <button
                type="button"
                onClick={() => applyTheme('system')}
                title="System preference"
                className={`p-1.5 rounded-xl transition-all ${
                  theme === 'system'
                    ? 'bg-[#ff5722] text-white shadow-xs'
                    : isDark ? 'text-[#94a3b8] hover:text-white' : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                <Laptop size={14} />
              </button>
            </div>

            {/* LANGUAGE SELECT */}
            <select
              value={lang}
              onChange={e => setLang(e.target.value)}
              className={`text-xs font-mono font-bold px-3 py-2 rounded-2xl border outline-none cursor-pointer transition-colors ${
                isDark
                  ? 'bg-[#111722] border-[#1d2738] text-[#f8fafc] hover:border-[#384863] neo-box-sm-dark'
                  : 'bg-white border-[#0f172a] text-[#0f172a] neo-box-sm-light'
              }`}
            >
              <option value="en">EN</option>
              <option value="hi">हिंदी</option>
              <option value="te">తెలుగు</option>
              <option value="ta">தமிழ்</option>
              <option value="kn">ಕನ್ನಡ</option>
              <option value="ml">മലയാളം</option>
              <option value="bn">বাংলা</option>
              <option value="mr">मराठी</option>
              <option value="es">ES</option>
              <option value="de">DE</option>
            </select>
          </div>
        </header>

        {/* TABS SELECTOR */}
        <div
          className={`anim-item flex p-1 rounded-2xl border ${
            isDark
              ? 'bg-[#111722] border-[#1d2738] neo-box-sm-dark'
              : 'bg-white border-[#0f172a] neo-box-sm-light'
          }`}
        >
          <button
            type="button"
            onClick={() => setTab('calc')}
            className={`flex-1 py-2.5 rounded-xl font-brand font-black text-xs uppercase tracking-wider transition-all ${
              tab === 'calc'
                ? isDark
                  ? 'bg-[#ff5722] text-white shadow-xs'
                  : 'bg-[#0f172a] text-white shadow-xs'
                : isDark ? 'text-[#94a3b8] hover:text-white' : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            {t.tabCalc}
          </button>
          <button
            type="button"
            onClick={() => setTab('roster')}
            className={`flex-1 py-2.5 rounded-xl font-brand font-black text-xs uppercase tracking-wider transition-all ${
              tab === 'roster'
                ? isDark
                  ? 'bg-[#ff5722] text-white shadow-xs'
                  : 'bg-[#0f172a] text-white shadow-xs'
                : isDark ? 'text-[#94a3b8] hover:text-white' : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            {t.tabRoster}
          </button>
        </div>

        {/* TAB 1: QUICK CUSHION */}
        {tab === 'calc' && (
          <div className="flex flex-col gap-4">
            
            {/* HERO OUTCOME BANNER */}
            <section
              className={`anim-item p-6 sm:p-8 rounded-3xl border-2 transition-all relative overflow-hidden ${
                isDark
                  ? isSafe
                    ? 'bg-[#062417] border-[#10b981] text-[#f8fafc] neo-box-dark'
                    : 'bg-[#2e0b12] border-[#f43f5e] text-[#f8fafc] neo-box-dark'
                  : isSafe
                    ? 'bg-[#dcfce7] border-[#0f172a] text-[#0f172a] neo-box-light'
                    : 'bg-[#ffe4e6] border-[#0f172a] text-[#0f172a] neo-box-light'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-black border ${
                    isSafe
                      ? isDark
                        ? 'bg-[#10b981]/25 text-[#34d399] border-[#10b981]/60'
                        : 'bg-[#10b981] text-white border-[#0f172a]'
                      : isDark
                        ? 'bg-[#f43f5e]/25 text-[#fb7185] border-[#f43f5e]/60'
                        : 'bg-[#f43f5e] text-white border-[#0f172a]'
                  }`}
                >
                  {isSafe ? <Sparkles size={13} /> : <AlertCircle size={13} />}
                  <span>{isSafe ? t.heroSafeBadge : t.heroDangerBadge}</span>
                </div>

                <div
                  className={`font-mono font-black text-xs px-2.5 py-1 rounded-lg border ${
                    isDark
                      ? 'bg-[#080b10]/70 text-[#cbd5e1] border-white/10'
                      : 'bg-black/10 text-[#0f172a] border-[#0f172a]/20'
                  }`}
                >
                  {currentPct.toFixed(1)}% / {safeThreshold}% req
                </div>
              </div>

              <div
                className={`text-xs sm:text-sm font-bold mb-1 ${
                  isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
                }`}
              >
                {isSafe ? t.heroSafePre : t.heroDangerPre}
              </div>

              <div className="flex items-baseline gap-2 my-1">
                <span ref={numberRef} className="font-mono font-black text-6xl sm:text-7xl tracking-tighter leading-none inline-block">
                  {isSafe ? maxBunk : neededClasses}
                </span>
                <span className="font-brand font-black text-xl sm:text-2xl uppercase tracking-tight">
                  {isSafe ? t.heroSafeUnit : t.heroDangerUnit}
                </span>
              </div>

              <p
                className={`text-xs sm:text-sm font-medium mt-2 max-w-[380px] leading-relaxed ${
                  isDark ? 'text-[#94a3b8]' : 'text-[#475569]'
                }`}
              >
                {isSafe
                  ? t.heroSafeNote.replace('{t}', String(safeThreshold))
                  : t.heroDangerNote.replace('{t}', String(safeThreshold))}
              </p>

              {/* Real-time visual progress bar */}
              <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10 flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] font-mono font-bold">
                  <span className="opacity-75">Target: {safeThreshold}%</span>
                  <span className={isSafe ? 'text-[#10b981] dark:text-[#34d399]' : 'text-[#f43f5e] dark:text-[#fb7185]'}>
                    Current: {currentPct.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/10 dark:bg-black/40 overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isSafe
                        ? 'bg-[#10b981]'
                        : 'bg-[#f43f5e]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, currentPct))}%` }}
                  />
                </div>
              </div>
            </section>

            {/* CONTROLS CARD */}
            <section
              className={`anim-item p-5 rounded-3xl border flex flex-col gap-4 ${
                isDark
                  ? 'bg-[#111722] border-[#1d2738] neo-box-dark'
                  : 'bg-white border-[#0f172a] neo-box-light'
              }`}
            >
              {/* TWO BIG NUMBER CONTROLLERS */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* CLASSES HELD */}
                <div
                  className={`p-3.5 rounded-2xl border flex flex-col gap-2 ${
                    isDark
                      ? 'bg-[#18202e] border-[#243044]'
                      : 'bg-[#f1f5f9] border-[#cbd5e1]'
                  }`}
                >
                  <span className="text-[11px] font-mono uppercase font-bold text-[#94a3b8]">
                    {t.heldLabel}
                  </span>
                  
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleHeldStep(-1)}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black transition-all active:scale-90 ${
                        isDark
                          ? 'bg-[#111722] border-[#2d3b54] text-white hover:bg-[#ff5722]'
                          : 'bg-white border-[#0f172a] text-[#0f172a] hover:bg-[#ff5722] hover:text-white'
                      }`}
                    >
                      <Minus size={16} />
                    </button>
                    
                    <span className="font-mono font-black text-2xl px-1">
                      {safeHeld}
                    </span>
                    
                    <button
                      type="button"
                      onClick={() => handleHeldStep(1)}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black transition-all active:scale-90 ${
                        isDark
                          ? 'bg-[#111722] border-[#2d3b54] text-white hover:bg-[#ff5722]'
                          : 'bg-white border-[#0f172a] text-[#0f172a] hover:bg-[#ff5722] hover:text-white'
                      }`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* CLASSES ATTENDED */}
                <div
                  className={`p-3.5 rounded-2xl border flex flex-col gap-2 ${
                    isDark
                      ? 'bg-[#18202e] border-[#243044]'
                      : 'bg-[#f1f5f9] border-[#cbd5e1]'
                  }`}
                >
                  <span className="text-[11px] font-mono uppercase font-bold text-[#94a3b8]">
                    {t.attendedLabel}
                  </span>
                  
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleAttendedStep(-1)}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black transition-all active:scale-90 ${
                        isDark
                          ? 'bg-[#111722] border-[#2d3b54] text-white hover:bg-[#ff5722]'
                          : 'bg-white border-[#0f172a] text-[#0f172a] hover:bg-[#ff5722] hover:text-white'
                      }`}
                    >
                      <Minus size={16} />
                    </button>
                    
                    <span className="font-mono font-black text-2xl px-1">
                      {safeAttended}
                    </span>
                    
                    <button
                      type="button"
                      onClick={() => handleAttendedStep(1)}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black transition-all active:scale-90 ${
                        isDark
                          ? 'bg-[#111722] border-[#2d3b54] text-white hover:bg-[#ff5722]'
                          : 'bg-white border-[#0f172a] text-[#0f172a] hover:bg-[#ff5722] hover:text-white'
                      }`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

              </div>

              {/* THRESHOLD SLIDER + TACTILE PRESETS */}
              <div
                className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                  isDark
                    ? 'bg-[#18202e] border-[#243044]'
                    : 'bg-[#f1f5f9] border-[#cbd5e1]'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-brand font-black uppercase tracking-wider text-[#94a3b8]">
                    {t.targetLabel}
                  </span>
                  <span className="font-mono font-black text-lg text-[#ff5722]">
                    {safeThreshold}%
                  </span>
                </div>

                <input
                  type="range"
                  min="50"
                  max="95"
                  value={safeThreshold}
                  onChange={e => {
                    setThreshold(parseInt(e.target.value, 10));
                    setSimDiff(null);
                  }}
                  className="w-full accent-[#ff5722] h-2 bg-[#cbd5e1] dark:bg-[#080b10] rounded-full cursor-pointer"
                />

                <div className="flex gap-2 justify-between">
                  {[75, 80, 85, 65].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setThreshold(p);
                        setSimDiff(null);
                      }}
                      className={`flex-1 py-1.5 text-xs font-mono font-black rounded-xl border transition-all active:scale-95 ${
                        safeThreshold === p
                          ? 'bg-[#ff5722] text-white border-[#ff5722]'
                          : isDark
                            ? 'bg-[#111722] text-[#cbd5e1] border-[#2b3950] hover:text-white hover:border-[#ff5722]'
                            : 'bg-white text-[#475569] border-[#0f172a] hover:text-[#0f172a]'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* THREE SUMMARY CHIPS */}
              <div className="grid grid-cols-3 gap-2">
                <div
                  className={`p-3 rounded-2xl border text-center ${
                    isDark ? 'bg-[#18202e] border-[#243044]' : 'bg-[#f1f5f9] border-[#cbd5e1]'
                  }`}
                >
                  <div className="text-[10px] font-mono uppercase font-bold text-[#94a3b8]">
                    {t.pctLabel}
                  </div>
                  <div className="font-mono font-black text-base sm:text-lg mt-0.5">
                    {currentPct.toFixed(1)}%
                  </div>
                </div>

                <div
                  className={`p-3 rounded-2xl border text-center ${
                    isDark ? 'bg-[#18202e] border-[#243044]' : 'bg-[#f1f5f9] border-[#cbd5e1]'
                  }`}
                >
                  <div className="text-[10px] font-mono uppercase font-bold text-[#94a3b8]">
                    {t.missedLabel}
                  </div>
                  <div className="font-mono font-black text-base sm:text-lg mt-0.5">
                    {missed}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-2xl border text-center ${
                    isDark ? 'bg-[#18202e] border-[#243044]' : 'bg-[#f1f5f9] border-[#cbd5e1]'
                  }`}
                >
                  <div className="text-[10px] font-mono uppercase font-bold text-[#94a3b8]">
                    {t.marginLabel}
                  </div>
                  <div
                    className={`font-mono font-black text-base sm:text-lg mt-0.5 ${
                      margin >= 0
                        ? isDark ? 'text-[#34d399]' : 'text-[#059669]'
                        : isDark ? 'text-[#fb7185]' : 'text-[#e11d48]'
                    }`}
                  >
                    {margin >= 0 ? `+${margin.toFixed(1)}%` : `${margin.toFixed(1)}%`}
                  </div>
                </div>
              </div>
            </section>

            {/* WHAT-IF SIMULATOR DECK */}
            <section
              className={`anim-item p-4 sm:p-5 rounded-3xl border flex flex-col gap-3 ${
                isDark
                  ? 'bg-[#111722] border-[#1d2738] neo-box-dark'
                  : 'bg-white border-[#0f172a] neo-box-light'
              }`}
            >
              <div className="flex justify-between items-center text-xs font-brand font-black uppercase text-[#94a3b8]">
                <span>{t.simTitle}</span>
                <span className="text-[10px] font-mono text-[#64748b]">live test</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => simulateImpact('miss')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold font-mono transition-all active:scale-95 ${
                    isDark
                      ? 'bg-[#18202e] border-[#243044] text-[#f8fafc] hover:border-[#ff5722]'
                      : 'bg-[#f1f5f9] border-[#0f172a] text-[#0f172a] hover:bg-[#ff5722] hover:text-white'
                  }`}
                >
                  {t.simMiss}
                </button>
                <button
                  type="button"
                  onClick={() => simulateImpact('attend')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold font-mono transition-all active:scale-95 ${
                    isDark
                      ? 'bg-[#18202e] border-[#243044] text-[#f8fafc] hover:border-[#10b981]'
                      : 'bg-[#f1f5f9] border-[#0f172a] text-[#0f172a] hover:bg-[#10b981] hover:text-white'
                  }`}
                >
                  {t.simAttend}
                </button>
              </div>

              <div
                className={`px-4 py-3 rounded-2xl border text-xs flex items-center justify-between ${
                  isDark
                    ? 'bg-[#080b10] border-[#1d2738]'
                    : 'bg-[#f8fafc] border-[#cbd5e1]'
                }`}
              >
                <span className={`font-medium ${isDark ? 'text-[#94a3b8]' : 'text-[#64748b]'}`}>
                  {simDiff ? simDiff.label : t.simDefaultPrompt}
                </span>
                <span
                  className={`font-mono font-black ${
                    simDiff
                      ? simDiff.safe
                        ? isDark ? 'text-[#34d399]' : 'text-[#059669]'
                        : isDark ? 'text-[#fb7185]' : 'text-[#e11d48]'
                      : 'text-[#64748b]'
                  }`}
                >
                  {simDiff ? simDiff.text : '--'}
                </span>
              </div>
            </section>

          </div>
        )}

        {/* TAB 2: COURSE ROSTER */}
        {tab === 'roster' && (
          <section
            className={`p-5 rounded-3xl border flex flex-col gap-4 ${
              isDark
                ? 'bg-[#111722] border-[#1d2738] neo-box-dark'
                : 'bg-white border-[#0f172a] neo-box-light'
            }`}
          >
            <div className="flex justify-between items-center pb-2 border-b border-dashed border-[#2b3950]">
              <h2 className="text-xs font-brand font-black uppercase tracking-wider text-[#94a3b8]">
                {t.rosterTitle}
              </h2>
              <div className="font-mono font-black text-sm text-[#ff5722]">
                {rosterAvgPct.toFixed(1)}% {t.rosterTotal}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {subjects.map(s => {
                const sHeld = Math.max(1, s.held);
                const sAttended = Math.max(0, Math.min(s.attended, sHeld));
                const sThreshold = Math.max(50, Math.min(99, s.threshold));
                const sPct = (sAttended / sHeld) * 100;
                const sRatio = sThreshold / 100;
                const sSafe = sPct >= sThreshold;
                const sBunk = sSafe
                  ? Math.max(0, Math.floor((sAttended - sRatio * sHeld) / sRatio))
                  : 0;
                const sNeeded = !sSafe
                  ? Math.max(0, Math.ceil((sRatio * sHeld - sAttended) / (1 - sRatio)))
                  : 0;

                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-2xl border flex flex-col gap-3.5 ${
                      isDark
                        ? 'bg-[#18202e] border-[#243044]'
                        : 'bg-[#f1f5f9] border-[#cbd5e1]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={s.name}
                        onChange={e => updateSubject(s.id, 'name', e.target.value)}
                        className={`flex-1 text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
                          isDark
                            ? 'bg-[#111722] border-[#243044] text-white focus:border-[#ff5722]'
                            : 'bg-white border-[#0f172a] text-[#0f172a]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => deleteSubject(s.id)}
                        className="text-[#f43f5e] hover:bg-[#f43f5e]/10 p-2 rounded-xl transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* REDESIGNED TACTILE COUNTER CELLS */}
                    <div className="grid grid-cols-3 gap-2">
                      
                      {/* HELD COUNTER */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono font-bold text-[#94a3b8] text-center">
                          Held
                        </span>
                        <div
                          className={`flex items-center justify-between rounded-xl border p-1 ${
                            isDark
                              ? 'bg-[#111722] border-[#243044]'
                              : 'bg-white border-[#0f172a]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => stepSubject(s.id, 'held', -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#ff5722] hover:text-white transition-colors active:scale-90"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="font-mono font-black text-xs px-1 text-center">
                            {sHeld}
                          </span>
                          <button
                            type="button"
                            onClick={() => stepSubject(s.id, 'held', 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#ff5722] hover:text-white transition-colors active:scale-90"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      {/* ATTENDED COUNTER */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono font-bold text-[#94a3b8] text-center">
                          Attended
                        </span>
                        <div
                          className={`flex items-center justify-between rounded-xl border p-1 ${
                            isDark
                              ? 'bg-[#111722] border-[#243044]'
                              : 'bg-white border-[#0f172a]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => stepSubject(s.id, 'attended', -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#ff5722] hover:text-white transition-colors active:scale-90"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="font-mono font-black text-xs px-1 text-center">
                            {sAttended}
                          </span>
                          <button
                            type="button"
                            onClick={() => stepSubject(s.id, 'attended', 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#ff5722] hover:text-white transition-colors active:scale-90"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      {/* TARGET % COUNTER */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono font-bold text-[#94a3b8] text-center">
                          Target %
                        </span>
                        <div
                          className={`flex items-center justify-between rounded-xl border p-1 ${
                            isDark
                              ? 'bg-[#111722] border-[#243044]'
                              : 'bg-white border-[#0f172a]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => stepSubject(s.id, 'threshold', -5)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#ff5722] hover:text-white transition-colors active:scale-90"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="font-mono font-black text-xs px-1 text-center text-[#ff5722]">
                            {sThreshold}%
                          </span>
                          <button
                            type="button"
                            onClick={() => stepSubject(s.id, 'threshold', 5)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#ff5722] hover:text-white transition-colors active:scale-90"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-[#243044] text-xs">
                      <span className="font-mono font-black">{sPct.toFixed(1)}%</span>
                      <span
                        className={`font-mono font-bold ${
                          sSafe
                            ? isDark ? 'text-[#34d399]' : 'text-[#059669]'
                            : isDark ? 'text-[#fb7185]' : 'text-[#e11d48]'
                        }`}
                      >
                        {sSafe
                          ? `+${sBunk} bunks left`
                          : `Attend ${sNeeded} in a row`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addSubject}
              className={`w-full py-3 rounded-2xl border-2 border-dashed font-brand font-black text-xs uppercase tracking-wider transition-all active:scale-[0.98] ${
                isDark
                  ? 'border-[#ff5722] text-[#ff5722] hover:bg-[#ff5722]/10'
                  : 'border-[#0f172a] text-[#0f172a] hover:bg-[#ff5722] hover:text-white hover:border-[#ff5722]'
              }`}
            >
              {t.addCourse}
            </button>
          </section>
        )}

        {/* BOTTOM ACTION BAR */}
        <div className="anim-item flex gap-2">
          <button
            type="button"
            onClick={resetAll}
            className={`py-3 px-4 rounded-2xl border font-brand font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
              isDark
                ? 'bg-[#111722] border-[#1d2738] text-[#94a3b8] hover:text-white'
                : 'bg-white border-[#0f172a] text-[#0f172a] hover:bg-[#f1f5f9]'
            }`}
          >
            <RotateCcw size={14} />
            <span>{t.resetBtn}</span>
          </button>
          <button
            type="button"
            onClick={copySnapshot}
            className={`flex-1 py-3 px-4 rounded-2xl border font-brand font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 ${
              isDark
                ? 'bg-[#ff5722] border-[#ff784e] text-white neo-box-dark'
                : 'bg-[#ff5722] border-[#0f172a] text-white neo-box-sm-light'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? "Copied" : t.copyBtn}</span>
          </button>
        </div>

        {/* DESKTOP FOOTER & SHORTCUT BADGES */}
        <footer className="anim-item flex items-center justify-between text-[11px] text-[#64748b] font-mono px-2 pt-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-[#10b981]" />
            <span>100% Client-Side & Private</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap size={13} className="text-[#ff5722]" />
            <span>bunkim v2.0</span>
          </div>
        </footer>

      </div>

      {/* FLOATING TOAST */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 font-mono font-bold text-xs px-5 py-2.5 rounded-2xl shadow-xl z-50 border ${
            isDark
              ? 'bg-[#18202e] text-white border-[#ff5722] neo-box-dark'
              : 'bg-white text-[#0f172a] border-[#0f172a] neo-box-light'
          }`}
        >
          {toastMsg}
        </div>
      )}
    </main>
  );
}

export default App;
