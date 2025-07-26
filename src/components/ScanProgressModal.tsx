"use client";

import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import Logo from "./Logo";
import { CheckCircle, Loader2, X, ChevronDown } from "lucide-react";

interface ScanProgressModalProps {
  open: boolean;
  onClose: () => void;
  videoThumbnail: string;
  videoTitle?: string;
  stepOverrides?: string[][];
  isOwnVideo?: boolean;
}

const DEFAULT_STEPS = [
  // Section 1: Video Preparation
  ["Fetching Video URL", "Retrieving Video Metadata", "Preparing Video for Analysis"],
  // Section 2: Content Extraction
  ["Extracting Transcript", "Summarizing Video Content", "Assessing Channel Context"],
  // Section 3: AI Analysis (split into 3 cards)
  ["Beginning Multi-Modal Analysis", "Analyzing Video Context", "Deep Content Analysis"],
  ["Generating Risk Score", "Policy Compliance Analysis", "AI Detection (if applicable)"],
  ["Highlighting Risky Phrases", "Providing Actionable Suggestions", "Finalizing Results"],
];

const CARD_TITLES = [
  "Video Preparation",
  "Content Extraction",
  "AI Analysis",
  "Risk & Policy Analysis",
  "Results & Suggestions",
];

export default function ScanProgressModal({
  open,
  onClose,
  videoThumbnail,
  videoTitle,
  stepOverrides,
  isOwnVideo = true,
}: ScanProgressModalProps) {
  const steps = stepOverrides || DEFAULT_STEPS;
  const [currentCard, setCurrentCard] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [expandedCards, setExpandedCards] = useState<boolean[]>([true, false, false, false, false]);

  // Per-card step durations (ms per step)
  const CARD_STEP_DURATIONS = [
    3000,    // First card: 9s total (3s per step)
    10667,   // Second card: 32s total (~10.67s per step)
    18333,   // Third card: 55s total (~18.33s per step)
    16000,   // Fourth card: 48s total (16s per step)
    12000,   // Fifth card: 36s total (12s per step)
  ];

  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!open) return;
    setCurrentCard(0);
    setCompletedSteps([]);
    setExpandedCards([true, false, false, false, false]);
    let card = 0;
    let step = 0;
    const totalCards = steps.length;
    function animateCardStep(currentCardIdx: number, currentStepIdx: number) {
      setCurrentCard(currentCardIdx);
      setExpandedCards((prev) => {
        const arr = [false, false, false, false, false];
        arr[currentCardIdx] = true;
        return arr;
      });
      setCompletedSteps((prev) => {
        const newCompleted = [...prev];
        if (!newCompleted[currentCardIdx]) newCompleted[currentCardIdx] = 0;
        if (currentStepIdx > newCompleted[currentCardIdx]) newCompleted[currentCardIdx] = currentStepIdx;
        return newCompleted;
      });
      if (currentStepIdx < steps[currentCardIdx].length) {
        timeoutRef.current = setTimeout(() => {
          animateCardStep(currentCardIdx, currentStepIdx + 1);
        }, CARD_STEP_DURATIONS[currentCardIdx] || 6500);
      } else {
        // Card is done, collapse it and expand the next
        setExpandedCards((prev) => {
          const arr = [...prev];
          arr[currentCardIdx] = false;
          if (currentCardIdx + 1 < totalCards) arr[currentCardIdx + 1] = true;
          return arr;
        });
        setCompletedSteps((prev) => {
          const newCompleted = [...prev];
          newCompleted[currentCardIdx] = steps[currentCardIdx].length;
          return newCompleted;
        });
        if (currentCardIdx + 1 < totalCards) {
          setTimeout(() => {
            animateCardStep(currentCardIdx + 1, 0);
          }, 0);
        }
      }
    }
    animateCardStep(0, 0);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [open, steps]);

  const handleToggleCard = (idx: number) => {
    setExpandedCards((prev) => {
      const arr = [...prev];
      arr[idx] = !arr[idx];
      return arr;
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Modal */}
      <div className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-lg mx-2 overflow-hidden flex flex-col items-center max-h-[80vh]" style={{ fontSize: '0.875rem' }}>
        {/* Header - Fixed */}
        <div className="flex items-center justify-between w-full p-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <span className="font-bold text-base text-gray-900">Yellow Dollar</span>
          </div>
          <button
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Scrollable Content Area */}
        <div className="w-full flex flex-col flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f9fafb' }}>
          {/* Title and Subtitle */}
          <div className="w-full flex flex-col items-center px-3 pt-3 pb-2 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-1">
              Starting New Scan...
            </h2>
            {videoTitle && (
              <p className="text-sm text-gray-600 text-center">
                {videoTitle}
              </p>
            )}
          </div>
          
          {/* Video Thumbnail */}
          <div className="w-full flex flex-col items-center px-3 pt-2 pb-1 flex-shrink-0">
            <img
              src={videoThumbnail}
              alt={videoTitle || "Video thumbnail"}
              className="rounded-lg border border-gray-200 w-full h-auto object-cover mb-1"
              style={{ aspectRatio: '16/9' }}
              draggable={false}
            />
          </div>
          
          {/* Progress Cards */}
          <div className={`w-full flex flex-col px-3 pb-3 flex-1 ${
            // Use smaller gap when most cards are future (not yet started)
            currentCard === 0 ? 'gap-1' : 
            currentCard === 1 ? 'gap-1.5' : 'gap-2'
          }`}>
          {steps.map((cardSteps, cardIdx) => {
            const isDone = completedSteps[cardIdx] >= cardSteps.length;
            const isCurrent = cardIdx === currentCard;
            const isExpanded = expandedCards[cardIdx];
            const isCollapsed = isDone && !isExpanded;
            const isFuture = cardIdx > currentCard;
            
            return (
              <div 
                key={cardIdx} 
                className={`transition-all duration-500 border border-gray-200 rounded-xl bg-white ${
                  isFuture 
                    ? 'p-2 opacity-60' 
                    : isCollapsed 
                    ? 'p-3 opacity-80 scale-95' 
                    : 'p-3 opacity-100 scale-100'
                }`}
              >
                {/* Future card - collapsed, just showing title */}
                {isFuture && (
                  <div className="flex items-center justify-center py-1">
                    <span className="font-semibold text-gray-400 text-center" style={{ fontSize: '0.875rem' }}>
                      {CARD_TITLES[cardIdx]}
                    </span>
                  </div>
                )}
                
                {/* Collapsed summary row */}
                {isCollapsed && (
                  <button
                    className="w-full flex items-center justify-between focus:outline-none"
                    onClick={() => handleToggleCard(cardIdx)}
                    aria-label={`Expand ${CARD_TITLES[cardIdx]}`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="font-semibold text-gray-800" style={{ fontSize: '1rem' }}>
                        {CARD_TITLES[cardIdx]}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500 transition-transform duration-300" />
                  </button>
                )}
                
                {/* Expanded card with steps */}
                {isExpanded && (
                  <>
                    <div className="flex flex-row items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900" style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.2 }}>
                        {CARD_TITLES[cardIdx]}
                      </h3>
                      {/* Collapse button only after card is done */}
                      {isDone && (
                        <button
                          className="ml-2 flex items-center gap-1 text-green-600 hover:text-green-700 focus:outline-none"
                          onClick={() => handleToggleCard(cardIdx)}
                          aria-label={`Collapse ${CARD_TITLES[cardIdx]}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          <ChevronDown className="w-4 h-4 text-gray-500 transition-transform duration-300 rotate-180" />
                        </button>
                      )}
                    </div>
                    <ul className="space-y-1">
                      {cardSteps.map((step, stepIdx) => {
                        const stepDone = completedSteps[cardIdx] > stepIdx;
                        const stepActive = completedSteps[cardIdx] === stepIdx && cardIdx === currentCard;
                        // Only skip AI Detection (card 3, step 2) if isOwnVideo is false
                        const stepSkipped = cardIdx === 3 && stepIdx === 2 && !isOwnVideo;
                        return (
                          <li key={stepIdx} className="flex items-center gap-2 text-sm font-medium">
                            {stepDone ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : stepActive ? (
                              <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                            ) : (
                              <span className="w-4 h-4 inline-block rounded-full border border-gray-300 bg-gray-100" />
                            )}
                            <span className={stepSkipped ? "text-gray-400 line-through" : stepActive ? "text-yellow-700" : "text-gray-800"}>
                              {step}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
          </div>
        </div>
        
        {/* Footer - Fixed */}
        <div className="w-full flex justify-end p-2 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="min-w-[80px] text-xs py-1 px-3">Close</Button>
        </div>
      </div>
    </div>
  );
} 