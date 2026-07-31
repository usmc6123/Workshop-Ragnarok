/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// "School" tab inside The Office — a personal progress tracker for the
// Sophia Learning -> Study.com -> WGU BS Computer Science credit-transfer
// plan. Deliberately backed by the real database (school_tracker table,
// GET/PUT /api/school-tracker) rather than plain localStorage, so progress
// survives across devices/browsers the same way every other page in this
// app does — same offline-simulated-fallback pattern as ShopSettings
// (see api.ts) if the backend is unreachable.
//
// The course list/credit values below are a static plan, not something a
// user edits in the UI — if the plan ever changes, edit COURSE_DATA here.
// checked_courses in the DB just stores whichever of these ids are checked.

import React, { useEffect, useState, useCallback } from 'react';
import { GraduationCap, RotateCcw, Lock } from 'lucide-react';
import { api } from '../lib/api';
import type { SchoolTracker } from '../types';

type Course = { id: string; name: string; cu: number; lock?: string };
type Phase = { key: 'sophia' | 'study' | 'wgu'; label: string; sub: string; courses: Course[] };

const PHASES: Phase[] = [
  {
    key: 'sophia',
    label: 'Phase 1 — Sophia Learning',
    sub: '~$99/mo — do this first',
    courses: [
      { id: 's1', name: 'Composition: Successful Self-Expression', cu: 3 },
      { id: 's2', name: 'Introduction to Communication: Connecting with Others', cu: 3 },
      { id: 's3', name: 'American Politics and the US Constitution', cu: 3 },
      { id: 's4', name: 'Calculus I', cu: 4 },
      { id: 's5', name: 'Applied Probability and Statistics', cu: 3 },
      { id: 's6', name: 'Health, Fitness, and Wellness', cu: 4 },
      { id: 's7', name: 'Natural Science Lab', cu: 2 },
      { id: 's8', name: 'Data Management – Foundations', cu: 3 },
      { id: 's9', name: 'Network and Security – Foundations', cu: 3 },
      { id: 's10', name: 'Web Development Foundations', cu: 3 },
      { id: 's11', name: 'Java Fundamentals', cu: 3 },
    ],
  },
  {
    key: 'study',
    label: 'Phase 2 — Study.com',
    sub: '~$235/mo — only what Sophia doesn’t cover',
    courses: [
      { id: 't1', name: 'Ethics in Technology', cu: 3 },
      { id: 't2', name: 'Scripting and Programming – Foundations', cu: 3 },
      { id: 't3', name: 'Data Management – Applications', cu: 4 },
      { id: 't4', name: 'Fundamentals of Information Security', cu: 3 },
      { id: 't5', name: 'Introduction to AI for Computer Scientists', cu: 2 },
      { id: 't6', name: 'Software Engineering', cu: 4 },
    ],
  },
  {
    key: 'wgu',
    label: 'Phase 3 — WGU',
    sub: 'the remaining 64 credits',
    courses: [
      { id: 'w1', name: 'Introduction to Computer Science', cu: 4 },
      { id: 'w2', name: 'Introduction to Systems Thinking and Applications', cu: 3 },
      { id: 'w3', name: 'Business of IT - Applications', cu: 4 },
      { id: 'w4', name: 'Practical Applications of Prompt', cu: 2 },
      { id: 'w5', name: 'Version Control', cu: 1 },
      { id: 'w6', name: 'Linux Foundations', cu: 3 },
      { id: 'w7', name: 'Software Design and Quality Assurance', cu: 3 },
      { id: 'w8', name: 'Operating Systems for Computer Scientists', cu: 3 },
      { id: 'w9', name: 'Computer Architecture', cu: 3 },
      { id: 'w10', name: 'Discrete Mathematics I', cu: 4 },
      { id: 'w11', name: 'Discrete Mathematics II', cu: 4, lock: 'needs Discrete Math I' },
      { id: 'w12', name: 'Scripting and Programming – Applications', cu: 4 },
      { id: 'w13', name: 'Java Frameworks', cu: 3 },
      { id: 'w14', name: 'Advanced Java', cu: 3 },
      { id: 'w15', name: 'Back-End Programming', cu: 3 },
      { id: 'w16', name: 'Data Structures and Algorithms I', cu: 4 },
      { id: 'w17', name: 'Data Structures and Algorithms II', cu: 4, lock: 'needs DS&A I + Discrete Math II' },
      { id: 'w18', name: 'Artificial Intelligence Optimization for Computer Scientists', cu: 3, lock: 'needs Intro to AI (transferred)' },
      { id: 'w19', name: 'Advanced AI and ML', cu: 3, lock: 'needs AI Optimization' },
      { id: 'w20', name: 'Computer Science Project Development with a Team', cu: 3, lock: 'needs Advanced AI and ML — do this LAST' },
    ],
  },
];

const TOTAL_CU = PHASES.reduce((s, p) => s + p.courses.reduce((s2, c) => s2 + c.cu, 0), 0);

const PHASE_COLORS: Record<Phase['key'], { text: string; bg: string; bar: string; chip: string }> = {
  sophia: { text: 'text-blue-400', bg: 'bg-blue-500/10', bar: 'bg-blue-500', chip: 'bg-blue-500/15 text-blue-300' },
  study: { text: 'text-orange-400', bg: 'bg-orange-500/10', bar: 'bg-orange-500', chip: 'bg-orange-500/15 text-orange-300' },
  wgu: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500', chip: 'bg-emerald-500/15 text-emerald-300' },
};

function phaseDoneCU(phase: Phase, checked: Set<string>): number {
  return phase.courses.reduce((s, c) => s + (checked.has(c.id) ? c.cu : 0), 0);
}
function phaseTotalCU(phase: Phase): number {
  return phase.courses.reduce((s, c) => s + c.cu, 0);
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export default function SchoolView() {
  const [tracker, setTracker] = useState<SchoolTracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    api.getSchoolTracker().then((t) => {
      if (!cancelled) setTracker(t);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const persist = useCallback((next: Partial<SchoolTracker>) => {
    api.updateSchoolTracker(next).catch((err) => console.error('Failed to save school tracker progress:', err));
  }, []);

  const toggleCourse = (id: string) => {
    if (!tracker) return;
    const has = tracker.checkedCourses.includes(id);
    const checkedCourses = has
      ? tracker.checkedCourses.filter((c) => c !== id)
      : [...tracker.checkedCourses, id];
    const next = { ...tracker, checkedCourses };
    setTracker(next);
    persist({ checkedCourses });
  };

  const changeStartDate = (value: string) => {
    if (!tracker) return;
    const next = { ...tracker, startDate: value };
    setTracker(next);
    persist({ startDate: value });
  };

  const resetAll = () => {
    if (!confirm('Reset all checked courses and your start date? This can’t be undone.')) return;
    const startDate = new Date().toISOString().slice(0, 10);
    const next: SchoolTracker = { startDate, checkedCourses: [] };
    setTracker(next);
    persist(next);
  };

  if (loading || !tracker) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Loading your progress...
      </div>
    );
  }

  const checked = new Set<string>(tracker.checkedCourses);
  const done = PHASES.reduce((s, p) => s + phaseDoneCU(p, checked), 0);
  const pct = TOTAL_CU > 0 ? Math.round((done / TOTAL_CU) * 1000) / 10 : 0;
  const start = new Date(tracker.startDate + 'T00:00:00');
  const daysElapsed = Math.max(daysBetween(start, now), 0);
  const target = new Date(start.getTime() + 365 * 86400000);
  const daysRemaining = Math.max(daysBetween(now, target), 0);
  const pacePerDay = daysElapsed > 0 ? done / daysElapsed : 0;
  const neededPerDay = (TOTAL_CU - done) / Math.max(daysRemaining, 1);
  const onPace = done >= TOTAL_CU || pacePerDay >= neededPerDay;
  let projectedText = 'start logging';
  if (done > 0 && pacePerDay > 0.001) {
    const daysToFinish = (TOTAL_CU - done) / pacePerDay;
    const finishDate = new Date(now.getTime() + daysToFinish * 86400000);
    projectedText = finishDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="h-full overflow-y-auto bg-bg-theme px-6 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="w-5 h-5 text-primary-theme" />
          <h1 className="text-lg font-bold text-text-theme">WGU BS Computer Science — Progress Tracker</h1>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Sophia &rarr; Study.com &rarr; WGU. {TOTAL_CU} total credits. Check things off as you finish them.
        </p>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="rounded-lg border border-border-theme bg-surface-theme p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Credits done</div>
            <div className="text-xl font-bold text-text-theme mt-0.5">{done} / {TOTAL_CU}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{pct}% complete</div>
          </div>
          <div className="rounded-lg border border-border-theme bg-surface-theme p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Days since start</div>
            <div className="text-xl font-bold text-text-theme mt-0.5">{daysElapsed}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              started {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <div className="rounded-lg border border-border-theme bg-surface-theme p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">1-year target</div>
            <div className="text-sm font-bold text-text-theme mt-1">
              {target.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{daysRemaining} days left</div>
          </div>
          <div className="rounded-lg border border-border-theme bg-surface-theme p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Projected finish</div>
            <div className={`text-sm font-bold mt-1 ${done === 0 ? 'text-slate-500' : onPace ? 'text-emerald-400' : 'text-orange-400'}`}>
              {projectedText}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {done === 0 ? 'at your current pace' : onPace ? 'on pace for 1 year ✓' : 'behind 1-year pace'}
            </div>
          </div>
        </div>

        {/* Overall bar */}
        <div className="rounded-lg border border-border-theme bg-surface-theme p-4 mb-3">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-bold text-text-theme">Overall progress</span>
            <span className="text-sm font-bold text-text-theme">{pct}%</span>
          </div>
          <div className="h-3 rounded-full bg-black/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-orange-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-5 text-xs text-slate-500">
          <span>Start date:</span>
          <input
            type="date"
            value={tracker.startDate}
            onChange={(e) => changeStartDate(e.target.value)}
            className="bg-surface-theme border border-border-theme rounded px-2 py-1 text-text-theme text-xs"
          />
          <button
            onClick={resetAll}
            className="flex items-center gap-1 border border-border-theme rounded px-2 py-1 text-xs text-slate-500 hover:text-red-400 hover:border-red-400/40 transition-colors ml-auto"
          >
            <RotateCcw className="w-3 h-3" /> Reset all progress
          </button>
        </div>

        {/* Phases */}
        <div className="space-y-4 pb-8">
          {PHASES.map((phase) => {
            const colors = PHASE_COLORS[phase.key];
            const pDone = phaseDoneCU(phase, checked);
            const pTotal = phaseTotalCU(phase);
            const pPct = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;
            const isCollapsed = !!collapsed[phase.key];

            return (
              <div key={phase.key} className="rounded-lg border border-border-theme overflow-hidden">
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [phase.key]: !c[phase.key] }))}
                  className={`w-full flex items-center justify-between px-4 py-3 ${colors.bg}`}
                >
                  <div className="text-left">
                    <div className={`text-sm font-bold ${colors.text}`}>{phase.label}</div>
                    <div className="text-[11px] text-slate-500">{phase.sub}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{pDone}/{pTotal} CU</span>
                    <div className="w-20 h-1.5 rounded-full bg-black/20 overflow-hidden">
                      <div className={`h-full ${colors.bar}`} style={{ width: `${pPct}%` }} />
                    </div>
                    <span className={`text-xs text-slate-500 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}>&#9660;</span>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="bg-surface-theme">
                    {phase.key === 'wgu' && (
                      <div className="mx-4 mt-3 mb-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
                        The last 4 courses (Data Structures II, AI Optimization, Advanced AI and ML, and the
                        Team Project) are chained together and have to be done in that order, last — the
                        Team Project reuses the project you build in Advanced AI and ML. Everything else in
                        this phase can be done in any order.
                      </div>
                    )}
                    {phase.courses.map((c) => {
                      const isChecked = checked.has(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-3 px-4 py-2 border-t border-border-theme/60 cursor-pointer hover:bg-black/10"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCourse(c.id)}
                            className="w-4 h-4 shrink-0 accent-current"
                            style={{ color: undefined }}
                          />
                          <span className={`flex-1 text-[13px] ${isChecked ? 'line-through text-slate-500' : 'text-text-theme'}`}>
                            {c.name}
                          </span>
                          {c.lock && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 rounded px-1.5 py-0.5 whitespace-nowrap shrink-0">
                              <Lock className="w-2.5 h-2.5" /> {c.lock}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 shrink-0 ${colors.chip}`}>
                            {c.cu} CU
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center text-[10.5px] text-slate-600 pb-4">
          Saved to your account — syncs across devices. Based on the WGU BS Computer Science, Catalog
          12-2024 transfer plan, excluding the ITIL certification option.
        </div>
      </div>
    </div>
  );
}
