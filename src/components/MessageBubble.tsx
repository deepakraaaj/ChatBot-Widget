import React, { useRef, useState } from "react";

import {
  type ChatMessage,
  type DataRow,
  type WorkflowOption,
} from "../chat/chatState";
import { ReactComponent as UserIcon } from "../icons/user-line.svg?react";
import { ReactComponent as BoltIcon } from "../icons/bolt.svg?react";
import { cn } from "../lib/cn";

interface MessageBubbleProps {
  message: ChatMessage;
  onOptionSelect?: (option: string) => void;
}

const numberedOptionRegex = /^\s*\d+[.)]\s+(.+?)\s*$/;

function getFirstNonEmptyOptions(
  ...sources: Array<WorkflowOption[] | undefined>
): WorkflowOption[] {
  return sources.find((source) => Array.isArray(source) && source.length > 0) || [];
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onOptionSelect,
}) => {
  const isUser = message.role === "user";
  const [showAll, setShowAll] = useState(false);
  const [pendingField, setPendingField] = useState<string>("");
  const [pendingValue, setPendingValue] = useState<string>("");
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const normalizeAssistantError = (content: string): string => {
    const text = String(content || "");
    if (
      /request failed safely:/i.test(text) ||
      /mysql\.connector\.errors\.programmingerror/i.test(text) ||
      /you have an error in your sql syntax/i.test(text) ||
      /sqlalche\.me\/e\/20\/f405/i.test(text)
    ) {
      return "This operation is still under development. I will support it soon.";
    }
    return text;
  };

  const displayContent = isUser
    ? message.content
    : normalizeAssistantError(message.content);

  const workflowView = message.metadata?.workflow?.view;
  const workflowUi = message.metadata?.workflow?.ui;

  const options = getFirstNonEmptyOptions(
    message.metadata?.clarification_options,
    workflowUi?.options,
    workflowView?.payload?.options,
    workflowView?.options,
    workflowView?.tasks
  );

  const numberedOptionsFromText = !isUser
    ? displayContent
      .split("\n")
      .map((line) => {
        const match = line.match(numberedOptionRegex);
        return match ? match[1] : null;
      })
      .filter((item): item is string => Boolean(item))
    : [];

  const textWithoutNumberedOptions =
    !isUser && numberedOptionsFromText.length > 0
      ? displayContent
        .split("\n")
        .filter((line) => !numberedOptionRegex.test(line))
        .join("\n")
        .trim()
      : displayContent;

  const effectiveOptions =
    options.length > 0 ? options : numberedOptionsFromText;

  const optionsTotalCount = message.metadata?.options_total_count;
  const optionsShownCount = message.metadata?.options_shown_count;
  const hasMoreOptions =
    typeof optionsTotalCount === "number" &&
    typeof optionsShownCount === "number" &&
    optionsShownCount < optionsTotalCount;

  const sqlData = message.metadata?.sql;
  const rows = sqlData?.rows_preview || [];
  const totalCount =
    typeof sqlData?.row_count === "number" ? sqlData.row_count : rows.length;
  const currentCount = rows.length;
  const hasTableData = rows.length > 0;
  const hasMore = currentCount < totalCount;

  const getMeaningfulColumns = (row: DataRow) =>
    Object.keys(row).filter((key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey === "id") return false;
      if (lowerKey.endsWith("_id")) return false;
      if (lowerKey.includes("uuid") || lowerKey.includes("guid")) return false;
      if (
        lowerKey.endsWith("id") &&
        key.length > 2 &&
        /[A-Z]/.test(key[key.length - 3])
      ) {
        return false;
      }
      return true;
    });

  const columns = hasTableData ? getMeaningfulColumns(rows[0]) : [];

  const isDateField = pendingField.toLowerCase().includes("date");
  const canApplyPending = Boolean(pendingValue.trim());

  const submitPendingValue = () => {
    const field = pendingField.trim();
    const value = pendingValue.trim();
    if (!field || !value) return;
    onOptionSelect?.(`${field}=${value}`);
    setPendingField("");
    setPendingValue("");
  };

  const handleOptionClick = (optionValue: string) => {
    const raw = String(optionValue || "").trim();
    if (!raw) return;

    if (raw.includes("=")) {
      const [field, value] = raw.split("=", 2);
      const key = String(field || "").trim();
      const val = String(value || "").trim();
      if (key && !val) {
        setPendingField(key);
        setPendingValue("");
        return;
      }
    }

    setPendingField("");
    setPendingValue("");
    onOptionSelect?.(raw);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "items-end" : "items-start"
      )}
    >
      <div
        className={cn(
          "flex gap-3 max-w-[96%]",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-sm",
            isUser
              ? "border-brand-200 text-brand-700"
              : "border-slate-200 text-brand-600"
          )}
        >
          {isUser ? (
            <UserIcon className="w-4 h-4" />
          ) : (
            <BoltIcon className="w-4 h-4" />
          )}
        </div>

        <div className="flex flex-col gap-2 min-w-0 overflow-hidden">
          {textWithoutNumberedOptions && (
            <div
              className={cn(
                "py-2.5 px-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm border w-fit",
                isUser
                  ? "bg-brand-100 text-brand-700 border-brand-200 rounded-tr-sm shadow-[0_2px_8px_rgba(25,71,184,0.10)]"
                  : "bg-white text-slate-700 border-slate-200 rounded-tl-sm"
              )}
            >
              <div className="whitespace-pre-wrap">{textWithoutNumberedOptions}</div>
            </div>
          )}

          {!isUser && hasTableData && columns.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-1">
              <div className="bg-slate-50/70 border-b border-slate-200 px-3 py-2 flex justify-between items-center">
                <span className="text-xs font-medium text-slate-600">
                  Showing {currentCount} of {totalCount} records
                </span>
                {sqlData?.cached && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200">
                    Cached
                  </span>
                )}
              </div>

              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      {columns.map((key) => (
                        <th key={key} className="px-3 py-2 whitespace-nowrap">
                          {key.replace(/_/g, " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                        {columns.map((col, j) => (
                          <td
                            key={j}
                            className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate"
                          >
                            {row[col] === null ? (
                              <span className="text-slate-300">null</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {hasMore && (
                <div className="border-t border-slate-200 px-3 py-2 bg-slate-50/70 flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      onOptionSelect?.(
                        `Show the next 15 records for the previous query. (Offset: ${currentCount})`
                      )
                    }
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-all"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!isUser && effectiveOptions.length > 0 && (
        <div className="flex flex-col gap-2 ml-10 mt-1">
          {(workflowUi?.title ||
            workflowView?.title ||
            workflowView?.payload?.title) && (
              <div className="text-[11px] font-semibold text-slate-500 mb-0.5 uppercase tracking-[0.14em]">
                {workflowUi?.title ||
                  workflowView?.title ||
                  workflowView?.payload?.title}
              </div>
            )}

          {hasMoreOptions && (
            <div className="text-xs text-slate-500 mb-1">
              Showing {optionsShownCount} of {optionsTotalCount} options
            </div>
          )}

          <div className="kriti-option-group">
            {effectiveOptions
              .slice(0, showAll ? undefined : 6)
              .map((option, idx) => {
                const label =
                  typeof option === "string"
                    ? option
                    : option.label ??
                    option.name ??
                    String(option.value ?? option.id ?? JSON.stringify(option));
                const value =
                  typeof option === "string"
                    ? option
                    : option.value ?? option.id ?? label;

                return (
                  <button
                    type="button"
                    key={`${idx}-${String(value)}`}
                    onClick={() => handleOptionClick(String(value))}
                    className="kriti-option-chip"
                  >
                    {label}
                  </button>
                );
              })}

            {effectiveOptions.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="kriti-option-chip kriti-option-chip-muted"
              >
                {showAll ? "Show Less" : `+${effectiveOptions.length - 6} More`}
              </button>
            )}
          </div>

          {pendingField && (
            <div className="mt-2 w-full max-w-md bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
              <div className="text-xs font-semibold text-slate-600 mb-2">
                Set value for {pendingField}
              </div>

              {isDateField ? (
                <div className="flex gap-2 items-center">
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={pendingValue}
                    onChange={(e) => setPendingValue(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = dateInputRef.current;
                      if (!el) return;
                      const picker = (
                        el as HTMLInputElement & { showPicker?: () => void }
                      ).showPicker;
                      if (typeof picker === "function") {
                        picker.call(el);
                      } else {
                        el.focus();
                        el.click();
                      }
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-md text-xs font-medium border border-slate-300"
                  >
                    Pick
                  </button>
                </div>
              ) : pendingField.toLowerCase() === "status" ? (
                <select
                  value={pendingValue}
                  onChange={(e) => setPendingValue(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
                >
                  <option value="">Select status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Overdue">Overdue</option>
                </select>
              ) : pendingField.toLowerCase() === "priority" ? (
                <select
                  value={pendingValue}
                  onChange={(e) => setPendingValue(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
                >
                  <option value="">Select priority</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={pendingValue}
                  onChange={(e) => setPendingValue(e.target.value)}
                  placeholder={`Enter ${pendingField}`}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
                />
              )}

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={submitPendingValue}
                  disabled={!canApplyPending}
                  className="px-3 py-1.5 bg-brand-600 text-white rounded-md text-xs font-medium disabled:opacity-50 shadow-[0_4px_10px_rgba(31,83,213,0.24)]"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingField("");
                    setPendingValue("");
                  }}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
