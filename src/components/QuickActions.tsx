import React from "react";

interface QuickActionsProps {
  onAction: (text: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onAction }) => {
  const actions = ["Task status", "Schedule a Task", "Update task status"];

  return (
    <div className="flex flex-col gap-2 p-1">
      <div className="text-[11px] font-semibold text-slate-400 mb-1 ml-1 uppercase tracking-[0.16em]">
        Quick Access
      </div>
      {actions.map((action) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          className="group text-left px-3 py-2.5 bg-white/95 hover:bg-white border border-slate-200 hover:border-brand-200 rounded-xl text-sm text-slate-700 hover:text-brand-700 transition-all shadow-sm hover:shadow-md active:scale-[0.99]"
        >
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 group-hover:bg-brand-500 transition-colors" />
            {action}
          </span>
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
