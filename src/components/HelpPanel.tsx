import React, { useState } from "react";

import { cn } from "../lib/cn";
import { getHelpCards } from "./chatDiscovery";

interface HelpPanelProps {
  onAction: (text: string) => void;
  appId?: string;
}

const HelpPanel: React.FC<HelpPanelProps> = ({ onAction, appId }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const cards = getHelpCards(appId);

  return (
    <section className="kriti-discovery-panel">
      <button
        type="button"
        onClick={() => setIsExpanded((value) => !value)}
        className="kriti-discovery-panel-toggle"
        aria-expanded={isExpanded}
      >
        <span className="text-sm font-semibold text-slate-900">
          What can I help with?
        </span>
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.14em]",
            isExpanded ? "text-brand-700" : "text-slate-500"
          )}
        >
          {isExpanded ? "Hide" : "Show"}
        </span>
      </button>

      {isExpanded ? (
        <div className="kriti-discovery-card-grid">
          {cards.map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => onAction(card.example)}
              className="kriti-discovery-card group"
            >
              <span className="kriti-discovery-card-icon">{card.icon}</span>
              <span className="kriti-discovery-card-title">{card.label}</span>
              <span className="kriti-discovery-card-description">
                {card.description}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default HelpPanel;
