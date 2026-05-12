import React from "react";

import { getQuickActionSections } from "./chatDiscovery";

interface QuickActionsProps {
  onAction: (text: string) => void;
  appId?: string;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onAction, appId }) => {
  const sections = getQuickActionSections(appId);
  const showSectionTitles = sections.length > 1;

  return (
    <div className="flex flex-col gap-3 p-1">
      <div className="ml-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Quick Access
      </div>
      {sections.map((section) => (
        <section key={section.title} className="space-y-2">
          {showSectionTitles ? (
            <div className="kriti-discovery-section-title">{section.title}</div>
          ) : null}
          <div className="kriti-option-group">
            {section.prompts.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onAction(action)}
                className="kriti-option-chip kriti-option-chip-discovery"
              >
                {action}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default QuickActions;
