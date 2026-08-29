import { useState, useEffect, useRef } from 'react';
import { translations, type Translation } from './translations';
import { Plus, Minus, Trash2, Sun, Moon, Laptop, Copy, Check, Sparkles, AlertCircle, RotateCcw, ShieldCheck, Zap } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import confetti from 'canvas-confetti';

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
  const safeHeld = Math.max(1, Math.min(999, held));
  const safeAttended = Math.max(0, Math.min(attended, safeHeld));
  const safeThreshold = Math.max(50, Math.min(95, threshold));
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
    const next = Math.max(1, Math.min(999, safeHeld + delta));
    setHeld(next);
    if (safeAttended > next) setAttended(next);
    setSimDiff(null);
  };

  const handleAttendedStep = (delta: number) => {
    const next = Math.max(0, Math.min(safeAttended + delta, safeHeld));
    setAttended(next);
    setSimDiff(null);
  };

  const handleHeldDirectChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 3);
    const parsed = parseInt(cleaned, 10);
    if (isNaN(parsed) || parsed < 1) {
      setHeld(1);
      return;
    }
    const next = Math.min(999, parsed);
    setHeld(next);
    if (safeAttended > next) setAttended(next);
    setSimDiff(null);
  };

  const handleAttendedDirectChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 3);
    const parsed = parseInt(cleaned, 10);
    if (isNaN(parsed)) {
      setAttended(0);
      return;
    }
    const next = Math.max(0, Math.min(parsed, safeHeld));
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
          const updated = { ...s };

          if (field === 'name') {
            updated.name = String(val).slice(0, 40);
          }
          if (field === 'held') {
            const parsed = typeof val === 'number' ? val : parseInt(String(val).replace(/\D/g, '').slice(0, 3), 10) || 1;
            const sHeld = Math.max(1, Math.min(999, parsed));
            updated.held = sHeld;
            if (updated.attended > sHeld) updated.attended = sHeld;
          }
          if (field === 'attended') {
            const parsed = typeof val === 'number' ? val : parseInt(String(val).replace(/\D/g, '').slice(0, 3), 10) || 0;
            updated.attended = Math.max(0, Math.min(parsed, updated.held));
          }
          if (field === 'threshold') {
            const parsed = typeof val === 'number' ? val : parseInt(String(val).replace(/\D/g, '').slice(0, 2), 10) || 75;
            updated.threshold = Math.max(50, Math.min(95, parsed));
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
            updated.held = Math.max(1, Math.min(999, nextVal));
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
    if (subjects.length >= 12) {
      showToast("Maximum 12 courses allowed");
      return;
    }
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

  // Slider progress fill calculation (range 50 to 95)
  const sliderFillPercent = ((safeThreshold - 50) / (95 - 50)) * 100;

  return (
    <main
      ref={containerRef}
      className={`min-h-screen transition-colors duration-200 flex flex-col items-center justify-start px-3 py-4 sm:p-8 pb-20 ${
        isDark
          ? 'bg-[#080b10] text-[#f8fafc] bg-notebook-dark'
          : 'bg-[#f8fafc] text-[#0f172a] bg-notebook-light'
      }`}
    >
      <div className="w-full max-w-[500px] flex flex-col gap-3.5 sm:gap-4">
        
        {/* TOP BRAND NAV BAR */}
        <header className="anim-item flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-brand font-black text-lg ${
                isDark ? 'hybrid-button-dark text-white' : 'hybrid-button-light text-white'
              }`}
            >
              b
            </div>
            <div>
              <span className="font-brand font-black text-xl sm:text-2xl tracking-tighter block leading-none">
                bunkim
              </span>
              <span className={`text-[10px] sm:text-[11px] font-mono font-bold tracking-tight block ${isDark ? 'text-[#94a3b8]' : 'text-[#475569]'}`}>
                attendance cushion
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* THEME SELECTOR - HYBRID INSET */}
            <div
              className={`flex p-1 rounded-2xl ${
                isDark ? 'hybrid-inset-dark' : 'hybrid-inset-light'
              }`}
            >
              <button
                type="button"
                onClick={() => applyTheme('light')}
                title="Light mode"
                className={`p-1.5 rounded-xl transition-all ${
                  theme === 'light'
                    ? isDark ? 'hybrid-button-dark text-white' : 'hybrid-button-light text-white'
                    : isDark ? 'text-[#94a3b8] hover:text-white' : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                <Sun size={13} />
              </button>
              <button
                type="button"
                onClick={() => applyTheme('dark')}
                title="Dark mode"
                className={`p-1.5 rounded-xl transition-all ${
                  theme === 'dark'
                    ? isDark ? 'hybrid-button-dark text-white' : 'hybrid-button-light text-white'
                    : isDark ? 'text-[#94a3b8] hover:text-white' : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                <Moon size={13} />
              </button>
              <button
                type="button"
                onClick={() => applyTheme('system')}
                title="System preference"
                className={`p-1.5 rounded-xl transition-all ${
                  theme === 'system'
                    ? isDark ? 'hybrid-button-dark text-white' : 'hybrid-button-light text-white'
                    : isDark ? 'text-[#94a3b8] hover:text-white' : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                <Laptop size={13} />
              </button>
            </div>

            {/* LANGUAGE SELECT */}
            <select
              value={lang}
              onChange={e => setLang(e.target.value)}
              className={`text-xs font-mono font-bold px-3 py-1.5 sm:py-2 rounded-2xl outline-none cursor-pointer transition-colors ${
                isDark
                  ? 'hybrid-card-dark text-[#f8fafc] hover:border-white/20'
                  : 'hybrid-card-light text-[#0f172a]'
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

        {/* TABS SELECTOR - HYBRID SEGMENTED CONTROL */}
        <div
          className={`anim-item flex p-1 rounded-2xl ${
            isDark ? 'hybrid-inset-dark' : 'hybrid-inset-light'
          }`}
        >
          <button
            type="button"
            onClick={() => setTab('calc')}
            className={`flex-1 py-2 sm:py-2.5 rounded-xl font-brand font-black text-xs uppercase tracking-wider transition-all ${
              tab === 'calc'
                ? isDark
                  ? 'hybrid-button-dark text-white'
                  : 'bg-[#0f172a] text-white shadow-sm'
                : isDark ? 'text-[#94a3b8] hover:text-white' : 'text-[#475569] hover:text-[#0f172a]'
            }`}
          >
            {t.tabCalc}
          </button>
          <button
            type="button"
            onClick={() => setTab('roster')}
            className={`flex-1 py-2 sm:py-2.5 rounded-xl font-brand font-black text-xs uppercase tracking-wider transition-all ${
              tab === 'roster'
                ? isDark
                  ? 'hybrid-button-dark text-white'
                  : 'bg-[#0f172a] text-white shadow-sm'
                : isDark ? 'text-[#94a3b8] hover:text-white' : 'text-[#475569] hover:text-[#0f172a]'
            }`}
          >
            {t.tabRoster}
          </button>
        </div>

        {/* TAB 1: QUICK CUSHION */}
        {tab === 'calc' && (
          <div className="flex flex-col gap-3.5 sm:gap-4">
            
            {/* HERO OUTCOME BANNER - HYBRID NEO-APPLE REALISM */}
            <section
              className={`anim-item p-5 sm:p-7 rounded-3xl transition-all relative overflow-hidden ${
                isDark
                  ? isSafe ? 'hero-safe-dark text-[#f8fafc]' : 'hero-danger-dark text-[#f8fafc]'
                  : isSafe ? 'hero-safe-light text-[#064e3b]' : 'hero-danger-light text-[#881337]'
              }`}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-mono font-black border ${
                    isSafe
                      ? isDark
                        ? 'bg-[#10b981]/25 text-[#34d399] border-[#10b981]/60'
                        : 'bg-[#10b981] text-white border-[#0f172a]'
                      : isDark
                        ? 'bg-[#f43f5e]/25 text-[#fb7185] border-[#f43f5e]/60'
                        : 'bg-[#f43f5e] text-white border-[#0f172a]'
                  }`}
                >
                  {isSafe ? <Sparkles size={12} /> : <AlertCircle size={12} />}
                  <span>{isSafe ? t.heroSafeBadge : t.heroDangerBadge}</span>
                </div>

                <div
                  className={`font-mono font-black text-[11px] sm:text-xs px-2.5 py-1 rounded-lg border ${
                    isDark
                      ? 'bg-[#080b10]/70 text-[#cbd5e1] border-white/10'
                      : 'bg-white/80 text-[#0f172a] border-[#0f172a]/30'
                  }`}
                >
                  {currentPct.toFixed(1)}% / {safeThreshold}% req
                </div>
              </div>

              <div
                className={`text-xs sm:text-sm font-bold ${
                  isDark ? 'text-[#cbd5e1]' : 'text-[#1e293b]'
                }`}
              >
                {isSafe ? t.heroSafePre : t.heroDangerPre}
              </div>

              <div className="flex items-baseline gap-2 my-0.5">
                <span ref={numberRef} className="font-mono font-black text-5xl sm:text-7xl tracking-tighter leading-none inline-block">
                  {isSafe ? maxBunk : neededClasses}
                </span>
                <span className="font-brand font-black text-lg sm:text-2xl uppercase tracking-tight">
                  {isSafe ? t.heroSafeUnit : t.heroDangerUnit}
                </span>
              </div>

              <p
                className={`text-xs sm:text-sm font-medium mt-1.5 max-w-[380px] leading-relaxed ${
                  isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
                }`}
              >
                {isSafe
                  ? t.heroSafeNote.replace('{t}', String(safeThreshold))
                  : t.heroDangerNote.replace('{t}', String(safeThreshold))}
              </p>

              {/* Real-time visual progress bar */}
              <div className="mt-3.5 pt-3 border-t border-black/10 dark:border-white/10 flex flex-col gap-1">
                <div className="flex justify-between text-[10px] sm:text-[11px] font-mono font-bold">
                  <span className={isDark ? 'text-[#94a3b8]' : 'text-[#475569]'}>Target: {safeThreshold}%</span>
                  <span className={isSafe ? 'text-[#10b981] dark:text-[#34d399]' : 'text-[#f43f5e] dark:text-[#fb7185]'}>
                    Current: {currentPct.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2.5 sm:h-3 rounded-full bg-black/15 dark:bg-black/50 overflow-hidden relative shadow-inner">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isSafe ? 'bg-[#10b981]' : 'bg-[#f43f5e]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, currentPct))}%` }}
                  />
                </div>
              </div>
            </section>

            {/* CONTROLS CARD - HYBRID CARD */}
            <section
              className={`anim-item p-4 sm:p-5 rounded-3xl flex flex-col gap-3.5 sm:gap-4 ${
                isDark ? 'hybrid-card-dark' : 'hybrid-card-light'
              }`}
            >
              {/* TWO HYBRID NUMBER CONTROLLERS */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                
                {/* CLASSES HELD */}
                <div
                  className={`p-3 sm:p-3.5 rounded-2xl flex flex-col gap-1.5 sm:gap-2 ${
                    isDark ? 'hybrid-inset-dark' : 'hybrid-inset-light'
                  }`}
                >
                  <span className={`text-[10px] sm:text-[11px] font-mono uppercase font-bold ${isDark ? 'text-[#94a3b8]' : 'text-[#475569]'}`}>
                    {t.heldLabel}
                  </span>
                  
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleHeldStep(-1)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center font-black transition-all active:scale-90 ${
                        isDark
                          ? 'bg-[#111722] border-[#2d3b54] text-white hover:bg-[#ff5722]'
                          : 'bg-white border-[#0f172a] text-[#0f172a] hover:bg-[#ff5722] hover:text-white shadow-2xs'
                      }`}
                    >
                      <Minus size={14} />
                    </button>
                    
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={3}
                      value={safeHeld}
                      onChange={e => handleHeldDirectChange(e.target.value)}
                      className={`w-12 sm:w-16 text-center font-mono font-black text-xl sm:text-2xl bg-transparent outline-none border-b-2 border-transparent focus:border-[#ff5722] transition-colors ${
                        isDark ? 'text-white' : 'text-[#0f172a]'
                      }`}
                    />
                    
                    <button
                      type="button"
                      onClick={() => handleHeldStep(1)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center font-black transition-all active:scale-90 ${
                        isDark
                          ? 'bg-[#111722] border-[#2d3b54] text-white hover:bg-[#ff5722]'
                          : 'bg-white border-[#0f172a] text-[#0f172a] hover:bg-[#ff5722] hover:text-white shadow-2xs'
                      }`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* CLASSES ATTENDED */}
                <div
                  className={`p-3 sm:p-3.5 rounded-2xl flex flex-col gap-1.5 sm:gap-2 ${
                    isDark ? 'hybrid-inset-dark' : 'hybrid-inset-light'
                  }`}
                >
                  <span className={`text-[10px] sm:text-[11px] font-mono uppercase font-bold ${isDark ? 'text-[#94a3b8]' : 'text-[#475569]'}`}>
                    {t.attendedLabel}
                  </span>
                  
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleAttendedStep(-1)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center font-black transition-all active:scale-90 ${
                        isDark
                          ? 'bg-[#111722] border-[#2d3b54] text-white hover:bg-[#ff5722]'
                          : 'bg-white border-[#0f172a] text-[#0f172a] hover:bg-[#ff5722] hover:text-white shadow-2xs'
                      }`}
                    >
                      <Minus size={14} />
                    </button>
                    
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={3}
                      value={safeAttended}
                      onChange={e => handleAttendedDirectChange(e.target.value)}
                      className={`w-12 sm:w-16 text-center font-mono font-black text-xl sm:text-2xl bg-transparent outline-none border-b-2 border-transparent focus:border-[#ff5722] transition-colors ${
                        isDark ? 'text-white' : 'text-[#0f172a]'
                      }`}
                    />
                    
                    <button
                      type="button"
                      onClick={() => handleAttendedStep(1)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center font-black transition-all active:scale-90 ${
                        isDark
                          ? 'bg-[#111722] border-[#2d3b54] text-white hover:bg-[#ff5722]'
                          : 'bg-white border-[#0f172a] text-[#0f172a] hover:bg-[#ff5722] hover:text-white shadow-2xs'
                      }`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

              </div>

              {/* REFINED TACTILE THRESHOLD SLIDER */}
              <div
                className={`p-3.5 sm:p-4 rounded-2xl flex flex-col gap-2.5 sm:gap-3.5 ${
                  isDark ? 'hybrid-inset-dark' : 'hybrid-inset-light'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-brand font-black uppercase tracking-wider ${isDark ? 'text-[#cbd5e1]' : 'text-[#1e293b]'}`}>
                    {t.targetLabel}
                  </span>
                  <span className="font-mono font-black text-base sm:text-lg text-[#ff5722]">
                    {safeThreshold}%
                  </span>
                </div>

                {/* Custom Dual-Tone Track Slider */}
                <div className="relative flex items-center w-full my-0.5">
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={safeThreshold}
                    onChange={e => {
                      setThreshold(parseInt(e.target.value, 10));
                      setSimDiff(null);
                    }}
                    style={{
                      background: isDark
                        ? `linear-gradient(to right, #ff5722 0%, #ff5722 ${sliderFillPercent}%, #080b10 ${sliderFillPercent}%, #080b10 100%)`
                        : `linear-gradient(to right, #ff5722 0%, #ff5722 ${sliderFillPercent}%, #cbd5e1 ${sliderFillPercent}%, #cbd5e1 100%)`
                    }}
                    className="bunkim-slider w-full h-2 rounded-full border border-black/10 dark:border-white/10"
                  />
                </div>

                <div className="flex gap-1.5 sm:gap-2 justify-between">
                  {[75, 80, 85, 65].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setThreshold(p);
                        setSimDiff(null);
                      }}
                      className={`flex-1 py-1.5 sm:py-2 text-xs font-mono font-black rounded-xl border transition-all active:scale-95 ${
                        safeThreshold === p
                          ? isDark ? 'hybrid-button-dark text-white' : 'hybrid-button-light text-white'
                          : isDark
                            ? 'bg-[#111722] text-[#cbd5e1] hover:text-white hover:bg-[#18202e] border-[#2b3950]'
                            : 'bg-white text-[#1e293b] border-[#0f172a] hover:bg-[#ff5722] hover:text-white'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* THREE SUMMARY CHIPS WITH HIGH CONTRAST */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <div
                  className={`p-2.5 sm:p-3 rounded-2xl text-center ${
                    isDark ? 'hybrid-inset-dark' : 'hybrid-inset-light'
                  }`}
                >
                  <div className={`text-[9px] sm:text-[10px] font-mono uppercase font-bold ${isDark ? 'text-[#94a3b8]' : 'text-[#475569]'}`}>
                    {t.pctLabel}
                  </div>
                  <div className="font-mono font-black text-sm sm:text-lg mt-0.5">
                    {currentPct.toFixed(1)}%
                  </div>
                </div>

                <div
                  className={`p-2.5 sm:p-3 rounded-2xl text-center ${
                    isDark ? 'hybrid-inset-dark' : 'hybrid-inset-light'
                  }`}
                >
                  <div className={`text-[9px] sm:text-[10px] font-mono uppercase font-bold ${isDark ? 'text-[#94a3b8]' : 'text-[#475569]'}`}>
                    {t.missedLabel}
                  </div>
                  <div className="font-mono font-black text-sm sm:text-lg mt-0.5">
                    {missed}
                  </div>
                </div>

                <div
                  className={`p-2.5 sm:p-3 rounded-2xl text-center ${
                    isDark ? 'hybrid-inset-dark' : 'hybrid-inset-light'
                  }`}
                >
                  <div className={`text-[9px] sm:text-[10px] font-mono uppercase font-bold ${isDark ? 'text-[#94a3b8]' : 'text-[#475569]'}`}>
                    {t.marginLabel}
                  </div>
                  <div
                    className={`font-mono font-black text-sm sm:text-lg mt-0.5 ${
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
              className={`anim-item p-3.5 sm:p-5 rounded-3xl flex flex-col gap-2.5 sm:gap-3 ${
                isDark ? 'hybrid-card-dark' : 'hybrid-card-light'
              }`}
            >
              <div className="flex justify-between items-center text-xs font-brand font-black uppercase">
                <span className={isDark ? 'text-[#cbd5e1]' : 'text-[#1e293b]'}>{t.simTitle}</span>
                <span className={`text-[10px] font-mono ${isDark ? 'text-[#94a3b8]' : 'text-[#475569]'}`}>live test</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => simulateImpact('miss')}
                  className={`py-2 px-2.5 sm:py-2.5 sm:px-3 rounded-xl text-xs font-bold font-mono transition-all active:scale-95 ${
                    isDark
                      ? 'hybrid-inset-dark text-[#f8fafc] hover:border-[#ff5722]'
                      : 'hybrid-inset-light text-[#0f172a] hover:bg-[#ff5722] hover:text-white'
                  }`}
                >
                  {t.simMiss}
                </button>
                <button
                  type="button"
                  onClick={() => simulateImpact('attend')}
                  className={`py-2 px-2.5 sm:py-2.5 sm:px-3 rounded-xl text-xs font-bold font-mono transition-all active:scale-95 ${
                    isDark
                      ? 'hybrid-inset-dark text-[#f8fafc] hover:border-[#10b981]'
                      : 'hybrid-inset-light text-[#0f172a] hover:bg-[#10b981] hover:text-white'
                  }`}
                >
                  {t.simAttend}
                </button>
              </div>

              <div
                className={`px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-xs flex items-center justify-between ${
                  isDark ? 'hybrid-inset-dark' : 'hybrid-inset-light'
                }`}
              >
                <span className={`font-semibold text-[11px] sm:text-xs ${isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'}`}>
                  {simDiff ? simDiff.label : t.simDefaultPrompt}
                </span>
                <span
                  className={`font-mono font-black ${
                    simDiff
                      ? simDiff.safe
                        ? isDark ? 'text-[#34d399]' : 'text-[#059669]'
                        : isDark ? 'text-[#fb7185]' : 'text-[#e11d48]'
                      : isDark ? 'text-[#94a3b8]' : 'text-[#475569]'
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
            className={`p-4 sm:p-5 rounded-3xl flex flex-col gap-3.5 sm:gap-4 ${
              isDark ? 'hybrid-card-dark' : 'hybrid-card-light'
            }`}
          >
            <div className="flex justify-between items-center pb-2 border-b border-dashed border-[#2b3950]">
              <h2 className={`text-xs font-brand font-black uppercase tracking-wider ${isDark ? 'text-[#cbd5e1]' : 'text-[#1e293b]'}`}>
                {t.rosterTitle}
              </h2>
              <div className="font-mono font-black text-sm text-[#ff5722]">
                {rosterAvgPct.toFixed(1)}% {t.rosterTotal}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {subjects.map(s => {
                const sHeld = Math.max(1, Math.min(999, s.held));
                const sAttended = Math.max(0, Math.min(s.attended, sHeld));
                const sThreshold = Math.max(50, Math.min(95, s.threshold));
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
                    className={`p-3.5 rounded-2xl flex flex-col gap-3 ${
                      isDark ? 'hybrid-inset-dark' : 'hybrid-inset-light'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={40}
                        value={s.name}
                        placeholder="Subject name"
                        onChange={e => updateSubject(s.id, 'name', e.target.value)}
                        className={`flex-1 text-xs font-bold px-3 py-1.5 sm:py-2 rounded-xl border outline-none ${
                          isDark
                            ? 'bg-[#111722] border-[#243044] text-white focus:border-[#ff5722]'
                            : 'bg-white border-[#0f172a] text-[#0f172a]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => deleteSubject(s.id)}
                        className="text-[#f43f5e] hover:bg-[#f43f5e]/10 p-1.5 sm:p-2 rounded-xl transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* TACTILE + DIRECT TYPEABLE COUNTER CELLS */}
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      
                      {/* HELD COUNTER */}
                      <div className="flex flex-col gap-1">
                        <span className={`text-[9px] sm:text-[10px] font-mono font-bold text-center ${isDark ? 'text-[#94a3b8]' : 'text-[#475569]'}`}>
                          Held
                        </span>
                        <div
                          className={`flex items-center justify-between rounded-xl border p-0.5 sm:p-1 ${
                            isDark ? 'bg-[#111722] border-[#243044]' : 'bg-white border-[#0f172a]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => stepSubject(s.id, 'held', -1)}
                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg hover:bg-[#ff5722] hover:text-white transition-colors active:scale-90"
                          >
                            <Minus size={11} />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={3}
                            value={sHeld}
                            onChange={e => updateSubject(s.id, 'held', e.target.value)}
                            className="w-8 sm:w-10 text-center font-mono font-black text-xs bg-transparent outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => stepSubject(s.id, 'held', 1)}
                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg hover:bg-[#ff5722] hover:text-white transition-colors active:scale-90"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>

                      {/* ATTENDED COUNTER */}
                      <div className="flex flex-col gap-1">
                        <span className={`text-[9px] sm:text-[10px] font-mono font-bold text-center ${isDark ? 'text-[#94a3b8]' : 'text-[#475569]'}`}>
                          Attended
                        </span>
                        <div
                          className={`flex items-center justify-between rounded-xl border p-0.5 sm:p-1 ${
                            isDark ? 'bg-[#111722] border-[#243044]' : 'bg-white border-[#0f172a]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => stepSubject(s.id, 'attended', -1)}
                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg hover:bg-[#ff5722] hover:text-white transition-colors active:scale-90"
                          >
                            <Minus size={11} />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={3}
                            value={sAttended}
                            onChange={e => updateSubject(s.id, 'attended', e.target.value)}
                            className="w-8 sm:w-10 text-center font-mono font-black text-xs bg-transparent outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => stepSubject(s.id, 'attended', 1)}
                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg hover:bg-[#ff5722] hover:text-white transition-colors active:scale-90"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>

                      {/* TARGET % COUNTER */}
                      <div className="flex flex-col gap-1">
                        <span className={`text-[9px] sm:text-[10px] font-mono font-bold text-center ${isDark ? 'text-[#94a3b8]' : 'text-[#475569]'}`}>
                          Target %
                        </span>
                        <div
                          className={`flex items-center justify-between rounded-xl border p-0.5 sm:p-1 ${
                            isDark ? 'bg-[#111722] border-[#243044]' : 'bg-white border-[#0f172a]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => stepSubject(s.id, 'threshold', -5)}
                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg hover:bg-[#ff5722] hover:text-white transition-colors active:scale-90"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="font-mono font-black text-xs px-0.5 text-center text-[#ff5722]">
                            {sThreshold}%
                          </span>
                          <button
                            type="button"
                            onClick={() => stepSubject(s.id, 'threshold', 5)}
                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg hover:bg-[#ff5722] hover:text-white transition-colors active:scale-90"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>

                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-[#243044]/40 text-xs">
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
              className={`w-full py-2.5 sm:py-3 rounded-2xl border-2 border-dashed font-brand font-black text-xs uppercase tracking-wider transition-all active:scale-[0.98] ${
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
            className={`py-2.5 px-3 sm:py-3 sm:px-4 rounded-2xl font-brand font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
              isDark
                ? 'hybrid-card-dark text-[#cbd5e1] hover:text-white'
                : 'hybrid-card-light text-[#0f172a] hover:bg-[#f1f5f9]'
            }`}
          >
            <RotateCcw size={13} />
            <span>{t.resetBtn}</span>
          </button>
          <button
            type="button"
            onClick={copySnapshot}
            className={`flex-1 py-2.5 px-3 sm:py-3 sm:px-4 rounded-2xl font-brand font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 ${
              isDark
                ? 'hybrid-button-dark text-white'
                : 'hybrid-button-light text-white'
            }`}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? "Copied" : t.copyBtn}</span>
          </button>
        </div>

        {/* FOOTER */}
        <footer className="anim-item flex items-center justify-between text-[10px] sm:text-[11px] font-mono px-2 pt-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-[#10b981]" />
            <span className={isDark ? 'text-[#94a3b8]' : 'text-[#475569]'}>100% Client-Side &amp; Private</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap size={12} className="text-[#ff5722]" />
            <span className={isDark ? 'text-[#94a3b8]' : 'text-[#475569]'}>bunkim v2.0</span>
          </div>
        </footer>

      </div>

      {/* FLOATING TOAST */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 font-mono font-bold text-xs px-5 py-2.5 rounded-2xl shadow-2xl z-50 ${
            isDark
              ? 'bg-[#18202e] text-white border border-[#ff5722] hybrid-button-dark'
              : 'bg-white text-[#0f172a] border-2 border-[#0f172a] hybrid-card-light'
          }`}
        >
          {toastMsg}
        </div>
      )}
    </main>
  );
}

export default App;
