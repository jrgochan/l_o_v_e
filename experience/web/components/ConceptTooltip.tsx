import React, { useState } from "react";
import { GLOSSARY } from "../data/educationalData";

interface ConceptTooltipProps {
  termKey: keyof typeof GLOSSARY;
  children?: React.ReactNode;
  className?: string;
}

export const ConceptTooltip: React.FC<ConceptTooltipProps> = ({
  termKey,
  children,
  className = "",
}) => {
  const [show, setShow] = useState(false);
  const data = GLOSSARY[termKey];

  if (!data) return <>{children}</>;

  return (
    <span
      className={`relative inline-block cursor-help group ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)} // For mobile/touch
    >
      <span className="border-b border-dotted border-white/40 hover:border-cyan-400 hover:text-cyan-300 transition-colors">
        {children || data.title}
        <span className="ml-1 text-[10px] opacity-70">?</span>
      </span>

      {/* Tooltip Popup */}
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 border border-white/10 rounded-lg shadow-2xl backdrop-blur-xl text-left pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{data.icon}</span>
            <span className="font-bold text-cyan-400 text-sm">{data.title}</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">{data.definition}</p>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </span>
  );
};
