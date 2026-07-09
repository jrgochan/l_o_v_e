/**
 * Octonion Demo Journeys — Pre-defined clinical scenarios
 *
 * Three interactive demo journeys that showcase why 8D emotional modeling
 * reveals clinical insights that 3D VAC alone cannot:
 *
 * 1. "I'm Fine" Syndrome — Hidden depression in neutral VAC
 * 2. First-Time vs Chronic Grief — Same VAC, different clinical picture
 * 3. Anxiety → Empowerment Arc — Coping dimension tells the therapy story
 *
 * Each journey is a time-stepped sequence of emotional states with full
 * 7D coordinates (V, A, C, D, P, Ė, N) and narrative commentary.
 */

"use client";

import React, { useState, useCallback } from "react";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";
import { EmotionalFingerprint } from "@/components/admin/clinical/EmotionalFingerprint";
import { ExtendedDimensionBars } from "@/components/admin/clinical/ExtendedDimensionBars";
import type { VAC, ExtendedDimensions } from "@/types/chat";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { ChevronLeft, ChevronRight, Play, RotateCcw } from "lucide-react";

// ---------------------------------------------------------------------------
// Demo Journey Data
// ---------------------------------------------------------------------------

interface JourneyStep {
  label: string;
  speaker: "patient" | "narrator";
  text: string;
  emotion: string;
  vac: VAC;
  extended: ExtendedDimensions;
  /** What VAC alone would conclude */
  vacOnly: string;
  /** What octonion reveals */
  octonionInsight: string;
}

interface DemoJourney {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string; // Tailwind accent
  description: string;
  clinicalQuestion: string;
  steps: JourneyStep[];
}

const DEMO_JOURNEYS: DemoJourney[] = [
  {
    id: "hidden-crisis",
    title: '"I\'m Fine" Syndrome',
    subtitle: "Hidden depression in neutral VAC",
    icon: "🎭",
    color: "rose",
    description:
      "A patient presents as calm and neutral. Traditional VAC analysis sees nothing alarming. But the octonion extended dimensions reveal profound depth, collapsed coping, frozen velocity, and deeply familiar patterns — classic masked depression.",
    clinicalQuestion: "How do you detect distress when someone has learned to appear 'fine'?",
    steps: [
      {
        label: "Opening",
        speaker: "patient",
        text: "\"Yeah, I'm doing okay. Everything's been pretty normal.\"",
        emotion: "Contentment",
        vac: { valence: 0.1, arousal: -0.2, connection: 0.1 },
        extended: { depth: 0.2, coping: 0.1, velocity: 0.0, novelty: -0.1 },
        vacOnly: "Neutral-positive. Low arousal. Calm and content. ✅",
        octonionInsight: "Shallow engagement, neutral coping. Nothing unusual yet.",
      },
      {
        label: "Mid-session",
        speaker: "patient",
        text: '"Work is fine. Friends are fine. Just... same as always, you know?"',
        emotion: "Resignation",
        vac: { valence: 0.0, arousal: -0.3, connection: 0.05 },
        extended: { depth: 0.5, coping: -0.3, velocity: -0.5, novelty: -0.6 },
        vacOnly: "Still neutral. Slightly lower energy. Normal variation.",
        octonionInsight:
          '⚠️ Depth rising → feelings are more significant than words suggest. Velocity frozen → stuck. Novelty low → "same as always" is literally true — habitual pattern.',
      },
      {
        label: "Key moment",
        speaker: "patient",
        text: "\"I guess nothing really changes. But that's fine. I'm used to it.\"",
        emotion: "Numbness",
        vac: { valence: -0.05, arousal: -0.35, connection: 0.0 },
        extended: {
          depth: 0.8,
          coping: -0.7,
          velocity: -0.9,
          novelty: -0.8,
        },
        vacOnly: "Barely negative. Low energy. Looks like mild tiredness. No alert triggered.",
        octonionInsight:
          '🔴 CRISIS INDICATORS: Depth +0.8 (profoundly felt), Coping -0.7 (helpless), Velocity -0.9 (completely frozen), Novelty -0.8 (deeply habitual). This is clinical depression hiding behind a "fine" mask.',
      },
      {
        label: "After intervention",
        speaker: "narrator",
        text: "Clinician gently names the pattern: 'It sounds like you've been carrying something heavy for a long time.'",
        emotion: "Vulnerability",
        vac: { valence: -0.2, arousal: 0.3, connection: 0.4 },
        extended: {
          depth: 0.9,
          coping: -0.4,
          velocity: 0.2,
          novelty: 0.5,
        },
        vacOnly:
          "Slightly negative, moderate arousal, higher connection. Normal emotional response.",
        octonionInsight:
          "📈 THERAPEUTIC MOVEMENT: Depth peaks (profound engagement), Velocity unfreezes (+0.2), Novelty jumps to +0.5 (this is a new emotional experience). Coping still low but improving. The intervention created motion.",
      },
    ],
  },
  {
    id: "grief-comparison",
    title: "First-Time vs Chronic Grief",
    subtitle: "Same VAC, different clinical reality",
    icon: "💔",
    color: "blue",
    description:
      "Two patients present with identical VAC coordinates — both deeply sad with low energy and high connection. But one is experiencing acute loss for the first time, and the other has been stuck in chronic grief for years. The octonion dimensions reveal completely different clinical pictures requiring opposite interventions.",
    clinicalQuestion: "When two patients look identical in 3D, how do you tell them apart?",
    steps: [
      {
        label: "Patient A: Acute Loss",
        speaker: "patient",
        text: '"My mother passed away last week. I\'ve never felt anything like this."',
        emotion: "Acute Grief",
        vac: { valence: -0.8, arousal: -0.3, connection: 0.7 },
        extended: { depth: 0.9, coping: -0.4, velocity: 0.3, novelty: 0.8 },
        vacOnly: "Deep sadness, low energy, high connection. Grief response. Standard protocol.",
        octonionInsight:
          "NOVEL GRIEF: Novelty +0.8 → this is entirely new territory. Velocity +0.3 → emotions are actively shifting (processing). Coping -0.4 → struggling but not collapsed. Needs: acute support, normalization, space to process.",
      },
      {
        label: "Patient B: Chronic Grief",
        speaker: "patient",
        text: "\"It's been three years since she passed. I still can't... I'm still here.\"",
        emotion: "Chronic Grief",
        vac: { valence: -0.8, arousal: -0.3, connection: 0.7 },
        extended: {
          depth: 0.9,
          coping: -0.4,
          velocity: -0.8,
          novelty: -0.9,
        },
        vacOnly: "Deep sadness, low energy, high connection. Grief response. Same as Patient A.",
        octonionInsight:
          "⚠️ FROZEN GRIEF: Identical VAC but Novelty -0.9 → this is deeply familiar, worn groove. Velocity -0.8 → frozen, no emotional movement. Same coping score but completely different context. Needs: pattern-breaking, meaning-making, and potentially complicated grief therapy.",
      },
      {
        label: "The Difference",
        speaker: "narrator",
        text: "Same position in emotional space. Completely different clinical trajectories.",
        emotion: "Insight",
        vac: { valence: 0.0, arousal: 0.2, connection: 0.5 },
        extended: { depth: 0.7, coping: 0.3, velocity: 0.4, novelty: 0.6 },
        vacOnly: "N/A — this is a teaching moment, not a patient state.",
        octonionInsight:
          "Without extended dimensions, these patients receive the same treatment. With them, Patient A gets acute support and Patient B gets stuck-pattern intervention. The treatment difference could be months of misguided therapy.",
      },
    ],
  },
  {
    id: "empowerment-arc",
    title: "Anxiety → Empowerment",
    subtitle: "The coping dimension tells the therapy story",
    icon: "🦋",
    color: "emerald",
    description:
      "A patient moves from paralyzing anxiety to genuine empowerment over a session. While VAC shows a positive trajectory, it's the Coping dimension that reveals the real therapeutic arc — from helpless to agency to empowered.",
    clinicalQuestion: "How do you measure whether therapy is actually building agency?",
    steps: [
      {
        label: "Anxiety onset",
        speaker: "patient",
        text: "\"I can't do this presentation. I'll freeze. Everyone will see I'm a fraud.\"",
        emotion: "Anxiety",
        vac: { valence: -0.6, arousal: 0.8, connection: -0.2 },
        extended: {
          depth: 0.4,
          coping: -0.8,
          velocity: 0.3,
          novelty: 0.2,
        },
        vacOnly: "High negative arousal, low valence. Anxiety pattern. Not unusual.",
        octonionInsight:
          "Coping -0.8 → feels completely helpless. This is the baseline. The key question is: can we move this number?",
      },
      {
        label: "Exploration",
        speaker: "patient",
        text: '"I keep thinking... what\'s the worst that could actually happen?"',
        emotion: "Apprehension",
        vac: { valence: -0.3, arousal: 0.5, connection: 0.1 },
        extended: {
          depth: 0.5,
          coping: -0.3,
          velocity: 0.5,
          novelty: 0.4,
        },
        vacOnly: "Still anxious but less intense. Expected de-escalation.",
        octonionInsight:
          "📈 Coping jumped from -0.8 to -0.3 → agency emerging! Velocity +0.5 → rapid emotional movement. They're actively processing, not just calming down.",
      },
      {
        label: "Reframing",
        speaker: "patient",
        text: '"Actually, I\'ve done this before. I prepared well. I know this material."',
        emotion: "Determination",
        vac: { valence: 0.2, arousal: 0.6, connection: 0.3 },
        extended: {
          depth: 0.5,
          coping: 0.4,
          velocity: 0.4,
          novelty: 0.1,
        },
        vacOnly: "Positive shift, moderate arousal. Valence improved. Good progress.",
        octonionInsight:
          "🎯 Coping crossed zero → now POSITIVE at +0.4. They've moved from helpless to agentic. Novelty dropped (familiar competence returning). This is the therapeutic turning point.",
      },
      {
        label: "Integration",
        speaker: "patient",
        text: "\"I'm going to do this. And if I stumble, I'll handle it.\"",
        emotion: "Confidence",
        vac: { valence: 0.7, arousal: 0.3, connection: 0.8 },
        extended: {
          depth: 0.4,
          coping: 0.8,
          velocity: -0.2,
          novelty: -0.3,
        },
        vacOnly: "Positive, calm, connected. Great session outcome. ✅",
        octonionInsight:
          '🏆 Coping +0.8 → EMPOWERED. Velocity settling (-0.2) → emotional state stabilizing. Novelty -0.3 → this confidence feels familiar (they\'re reconnecting with existing competence, not performing). This is genuine integration, not just "feeling better."',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Demo Journey Page
// ---------------------------------------------------------------------------

export default function OctonionDemoPage() {
  const theme = useAdminTheme();
  const [selectedJourney, setSelectedJourney] = useState<DemoJourney | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const handleSelectJourney = useCallback((journey: DemoJourney) => {
    setSelectedJourney(journey);
    setCurrentStep(0);
    setIsAutoPlaying(false);
  }, []);

  const handleNext = useCallback(() => {
    if (!selectedJourney) return;
    if (currentStep < selectedJourney.steps.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [selectedJourney, currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsAutoPlaying(false);
  }, []);

  // Auto-play
  React.useEffect(() => {
    if (!isAutoPlaying || !selectedJourney) return;
    if (currentStep >= selectedJourney.steps.length - 1) {
      // Use setTimeout to avoid synchronous setState in effect
      const stopTimer = setTimeout(() => setIsAutoPlaying(false), 0);
      return () => clearTimeout(stopTimer);
    }
    const timer = setTimeout(() => {
      setCurrentStep((s) => s + 1);
    }, 4000);
    return () => clearTimeout(timer);
  }, [isAutoPlaying, currentStep, selectedJourney]);

  const step = selectedJourney?.steps[currentStep];

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className={`text-2xl font-bold ${theme.colors.text.primary} flex items-center gap-3`}>
            <span className="text-3xl">🔮</span>
            Octonion Demo Journeys
          </h1>
          <p className={`text-sm mt-2 ${theme.colors.text.secondary} max-w-2xl`}>
            Three clinical scenarios demonstrating why 8-dimensional emotional modeling reveals
            insights that 3D VAC alone cannot. Each journey shows the same data through both lenses.
          </p>
        </div>

        {/* Journey Selector */}
        {!selectedJourney ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {DEMO_JOURNEYS.map((journey) => (
              <button
                key={journey.id}
                onClick={() => handleSelectJourney(journey)}
                className={`text-left p-6 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-${journey.color}-600 hover:bg-${journey.color}-950/10 transition-all group`}
              >
                <div className="text-4xl mb-3">{journey.icon}</div>
                <h3
                  className={`text-lg font-bold ${theme.colors.text.primary} mb-1 group-hover:text-${journey.color}-300 transition-colors`}
                >
                  {journey.title}
                </h3>
                <p className={`text-xs ${theme.colors.text.muted} mb-3`}>{journey.subtitle}</p>
                <p className={`text-sm ${theme.colors.text.secondary} mb-4`}>
                  {journey.description}
                </p>
                <div
                  className={`p-3 rounded-lg border border-${journey.color}-800/50 bg-${journey.color}-950/20`}
                >
                  <p className={`text-xs font-medium text-${journey.color}-400`}>
                    Clinical Question
                  </p>
                  <p className={`text-sm italic ${theme.colors.text.secondary} mt-1`}>
                    {journey.clinicalQuestion}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className={`text-xs ${theme.colors.text.muted}`}>
                    {journey.steps.length} steps
                  </span>
                  <span className={`text-xs text-${journey.color}-400`}>→ Start Journey</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Back + Journey Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedJourney(null)}
                className={`p-2 rounded-lg border ${theme.colors.border} ${theme.colors.hover} transition`}
              >
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              <div>
                <h2
                  className={`text-xl font-bold ${theme.colors.text.primary} flex items-center gap-2`}
                >
                  <span>{selectedJourney.icon}</span>
                  {selectedJourney.title}
                </h2>
                <p className={`text-xs ${theme.colors.text.muted}`}>
                  {selectedJourney.clinicalQuestion}
                </p>
              </div>
            </div>

            {/* Step Timeline */}
            <div className="flex items-center gap-2">
              {selectedJourney.steps.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    i <= currentStep
                      ? i === currentStep
                        ? "bg-violet-500 shadow-lg shadow-violet-500/50"
                        : "bg-violet-500/50"
                      : "bg-gray-800"
                  }`}
                />
              ))}
            </div>

            {/* Step Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className={`p-2 rounded-lg border ${theme.colors.border} transition disabled:opacity-30`}
                >
                  <ChevronLeft className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className={`p-2 rounded-lg border transition ${
                    isAutoPlaying
                      ? "border-violet-500 bg-violet-500/20 text-violet-300"
                      : `${theme.colors.border} text-gray-400`
                  }`}
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentStep === selectedJourney.steps.length - 1}
                  className={`p-2 rounded-lg border ${theme.colors.border} transition disabled:opacity-30`}
                >
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={handleReset}
                  className={`p-2 rounded-lg border ${theme.colors.border} transition text-gray-400`}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              <span className={`text-xs font-mono ${theme.colors.text.muted}`}>
                Step {currentStep + 1} / {selectedJourney.steps.length}:{" "}
                <span className={theme.colors.text.secondary}>{step?.label}</span>
              </span>
            </div>

            {step && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
                {/* Left: Narrative + Analysis */}
                <div className="space-y-4">
                  {/* Quote / Text */}
                  <div
                    className={`p-5 rounded-xl border ${
                      step.speaker === "patient"
                        ? "border-violet-800/50 bg-violet-950/20"
                        : "border-gray-700/50 bg-gray-900/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                        {step.speaker === "patient" ? "🗣️ Patient" : "📋 Narrator"}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300`}
                      >
                        {step.emotion}
                      </span>
                    </div>
                    <p
                      className={`text-lg leading-relaxed ${
                        step.speaker === "patient" ? "italic text-gray-200" : "text-gray-300"
                      }`}
                    >
                      {step.text}
                    </p>
                  </div>

                  {/* VAC-Only vs Octonion side-by-side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* VAC-Only reading */}
                    <div className={`p-4 rounded-xl border border-gray-700/50 bg-gray-900/30`}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                        <span>📐</span> 3D VAC Analysis
                      </h4>
                      <p className={`text-sm ${theme.colors.text.secondary}`}>{step.vacOnly}</p>
                    </div>

                    {/* Octonion reading */}
                    <div className={`p-4 rounded-xl border border-violet-700/50 bg-violet-950/20`}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400 mb-2 flex items-center gap-1.5">
                        <span>🔮</span> 8D Octonion Insight
                      </h4>
                      <p className="text-sm text-violet-100/80">{step.octonionInsight}</p>
                    </div>
                  </div>

                  {/* Extended Dimensions Bars (full layout) */}
                  <div className={`p-4 rounded-xl border ${theme.colors.border} bg-black/20`}>
                    <h4
                      className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme.colors.text.muted}`}
                    >
                      Extended Dimensions
                    </h4>
                    <ExtendedDimensionBars
                      extended={step.extended}
                      layout="full"
                      showValues={true}
                    />
                  </div>
                </div>

                {/* Right: Emotional Fingerprint Radar */}
                <div
                  className={`p-4 rounded-xl border ${theme.colors.border} bg-black/20 flex flex-col items-center justify-start`}
                >
                  <h4
                    className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme.colors.text.muted}`}
                  >
                    🔮 Emotional Fingerprint
                  </h4>
                  <EmotionalFingerprint
                    vac={step.vac}
                    extended={step.extended}
                    size={240}
                    showLabels={true}
                    showValues={true}
                    animated={true}
                  />
                  <div className={`mt-4 text-center text-xs ${theme.colors.text.muted}`}>
                    <span className="text-violet-400 font-semibold">{step.emotion}</span>
                    <br />
                    Step {currentStep + 1}: {step.label}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
