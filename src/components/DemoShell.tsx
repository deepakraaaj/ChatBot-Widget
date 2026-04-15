import { startTransition, useEffect, useState } from "react";

import {
  ChatProvider,
  type ChatRuntimeConfig,
  useChat,
} from "../hooks/useChat";
import ChatWidget from "./ChatWidget";

interface DemoShellProps {
  backendUrl: string;
}

interface DemoAppSummary {
  app_id: string;
  display_name: string;
  description?: string;
  domain_name?: string;
  default_company_id?: string | null;
}

interface DemoCompanySummary {
  company_id: string;
  company_name: string;
  is_active?: boolean | null;
}

const STARTUP_RETRY_DELAYS_MS = [1500, 3000, 5000, 8000];
const RETRYABLE_BACKEND_STATUS_CODES = new Set([502, 503, 504]);

const SAMPLE_PROMPTS: Record<string, string[]> = {
  fits_dev_march_9: [
    "show tasks status=0",
    "show tasks status=2",
    "show tasks",
  ],
  vts: [
    "show trips recent_state_id=3",
    "show trips recent_state_id=5",
    "show trips",
  ],
  ims: [
    "show purchase orders status=4",
    "show purchase orders id=1012",
    "show purchase orders",
  ],
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function waitForRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("The operation was aborted.", "AbortError"));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);

    const handleAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    };

    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

async function fetchJsonWithStartupRetries<T>({
  url,
  signal,
  onRetry,
}: {
  url: string;
  signal: AbortSignal;
  onRetry?: (attemptNumber: number, delayMs: number) => void;
}): Promise<T> {
  for (let attemptIndex = 0; ; attemptIndex += 1) {
    let response: Response;
    try {
      response = await fetch(url, { signal });
    } catch (error) {
      if (isAbortError(error) || attemptIndex >= STARTUP_RETRY_DELAYS_MS.length) {
        throw error;
      }
      const delayMs = STARTUP_RETRY_DELAYS_MS[attemptIndex];
      onRetry?.(attemptIndex + 1, delayMs);
      await waitForRetry(delayMs, signal);
      continue;
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (
      !RETRYABLE_BACKEND_STATUS_CODES.has(response.status) ||
      attemptIndex >= STARTUP_RETRY_DELAYS_MS.length
    ) {
      throw new Error(`Request failed (${response.status})`);
    }

    const delayMs = STARTUP_RETRY_DELAYS_MS[attemptIndex];
    onRetry?.(attemptIndex + 1, delayMs);
    await waitForRetry(delayMs, signal);
  }
}

function formatCompanyLabel(company: DemoCompanySummary): string {
  const name = String(company.company_name || "").trim();
  const id = String(company.company_id || "").trim();
  return name ? `${name} (${id})` : id;
}

function DemoWorkspace({
  backendUrl,
  apps,
  companies,
  selectedAppId,
  onAppChange,
  selectedCompanyId,
  onCompanyChange,
  loadingApps,
  loadingCompanies,
  errorMessage,
}: {
  backendUrl: string;
  apps: DemoAppSummary[];
  companies: DemoCompanySummary[];
  selectedAppId: string;
  onAppChange: (value: string) => void;
  selectedCompanyId: string;
  onCompanyChange: (value: string) => void;
  loadingApps: boolean;
  loadingCompanies: boolean;
  errorMessage: string;
}) {
  const { clearChat, sendMessage } = useChat();
  const selectedApp =
    apps.find((item) => item.app_id === selectedAppId) || null;
  const promptOptions = SAMPLE_PROMPTS[selectedAppId] || [
    "show tasks",
    "show trips",
    "show purchase orders",
  ];
  const promptsDisabled =
    loadingApps || (!selectedAppId && apps.length === 0) || loadingCompanies;

  return (
    <div className="kriti-widget-root min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start lg:px-6">
        <section className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
              Demo Console
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Multi-App Chatbot
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Select an application and company context, then use the chat widget on
              the bottom-right. The session resets automatically whenever you change
              app or company.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                App ID
              </span>
              <select
                value={selectedAppId}
                onChange={(event) => onAppChange(event.target.value)}
                disabled={loadingApps || apps.length === 0}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              >
                {apps.length === 0 ? (
                  <option value="">No apps available</option>
                ) : null}
                {apps.map((app) => (
                  <option key={app.app_id} value={app.app_id}>
                    {app.display_name} ({app.app_id})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Company ID
              </span>
              <select
                value={selectedCompanyId}
                onChange={(event) => onCompanyChange(event.target.value)}
                disabled={loadingCompanies || companies.length === 0}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              >
                {companies.length === 0 ? (
                  <option value="">
                    {loadingCompanies ? "Loading companies..." : "No company list available"}
                  </option>
                ) : null}
                {companies.map((company) => (
                  <option key={company.company_id} value={company.company_id}>
                    {formatCompanyLabel(company)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Active Backend
              </p>
              <p className="mt-2 break-all text-sm text-slate-700">{backendUrl}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Loaded Companies
              </p>
              <p className="mt-2 text-sm text-slate-700">
                {loadingCompanies ? "Loading..." : `${companies.length} option(s)`}
              </p>
            </div>
          </div>

          {selectedApp ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Selected App
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {selectedApp.display_name}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {selectedApp.description || "Configured demo application."}
              </p>
            </div>
          ) : null}

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Quick Demo Prompts
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Based on the three domain question markdown files.
                </p>
              </div>
              <button
                type="button"
                onClick={clearChat}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Clear Chat
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {promptOptions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={promptsDisabled}
                  onClick={() => {
                    void sendMessage(prompt);
                  }}
                  className="rounded-full border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 transition hover:border-brand-300 hover:bg-brand-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Demo guidance: open the chat widget on the bottom-right, or use the
              quick prompt buttons above to send a tested question instantly.
            </div>
          )}
        </section>

        <aside className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-[0_18px_52px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Notes
          </p>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
            <li>The widget opens with the selected app and company context.</li>
            <li>Changing app or company clears the current session to avoid stale answers.</li>
            <li>FITS and VTS include default tenant company IDs for a reliable demo.</li>
            <li>IMS works even without tenant scoping, but the dropdown is still available.</li>
          </ul>
        </aside>
      </div>

      <ChatWidget />
    </div>
  );
}

export default function DemoShell({ backendUrl }: DemoShellProps) {
  const [apps, setApps] = useState<DemoAppSummary[]>([]);
  const [companies, setCompanies] = useState<DemoCompanySummary[]>([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const loadApps = async () => {
      setLoadingApps(true);
      setErrorMessage("");
      try {
        const payload = await fetchJsonWithStartupRetries<{
          apps?: DemoAppSummary[];
          default_app_id?: string | null;
        }>({
          url: `${backendUrl}/apps`,
          signal: controller.signal,
          onRetry: (attemptNumber) => {
            setErrorMessage(
              `Backend is starting. Retrying app list (${attemptNumber}/${STARTUP_RETRY_DELAYS_MS.length})...`
            );
          },
        });
        const nextApps = Array.isArray(payload.apps) ? payload.apps : [];
        const nextAppId =
          String(payload.default_app_id || "").trim() ||
          String(nextApps[0]?.app_id || "").trim();
        startTransition(() => {
          setApps(nextApps);
          setSelectedAppId(nextAppId);
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Failed to load demo apps", error);
        setApps([]);
        setSelectedAppId("");
        setErrorMessage("Unable to load applications from the backend.");
      } finally {
        if (!controller.signal.aborted) {
          setLoadingApps(false);
        }
      }
    };

    void loadApps();
    return () => controller.abort();
  }, [backendUrl]);

  useEffect(() => {
    if (!selectedAppId) {
      setCompanies([]);
      setSelectedCompanyId("");
      return;
    }

    const controller = new AbortController();
    const loadCompanies = async () => {
      setLoadingCompanies(true);
      setErrorMessage("");
      try {
        const payload = await fetchJsonWithStartupRetries<{
          companies?: DemoCompanySummary[];
          default_company_id?: string | null;
        }>({
          url: `${backendUrl}/apps/${encodeURIComponent(selectedAppId)}/companies?limit=250`,
          signal: controller.signal,
          onRetry: (attemptNumber) => {
            setErrorMessage(
              `Backend is starting. Retrying company list (${attemptNumber}/${STARTUP_RETRY_DELAYS_MS.length})...`
            );
          },
        });
        const nextCompanies = Array.isArray(payload.companies)
          ? payload.companies
          : [];
        const defaultCompanyId = String(payload.default_company_id || "").trim();

        startTransition(() => {
          setCompanies(nextCompanies);
          setSelectedCompanyId((currentValue) => {
            if (
              currentValue &&
              nextCompanies.some((company) => company.company_id === currentValue)
            ) {
              return currentValue;
            }
            if (
              defaultCompanyId &&
              nextCompanies.some((company) => company.company_id === defaultCompanyId)
            ) {
              return defaultCompanyId;
            }
            return String(nextCompanies[0]?.company_id || "").trim();
          });
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Failed to load demo companies", error);
        setCompanies([]);
        setSelectedCompanyId("");
        setErrorMessage("Unable to load companies for the selected app.");
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCompanies(false);
        }
      }
    };

    void loadCompanies();
    return () => controller.abort();
  }, [backendUrl, selectedAppId]);

  const selectedApp =
    apps.find((item) => item.app_id === selectedAppId) || null;
  const selectedCompany =
    companies.find((item) => item.company_id === selectedCompanyId) || null;
  const runtimeConfig: ChatRuntimeConfig = {
    backendUrl,
    appId: selectedAppId || undefined,
    appName: selectedApp?.display_name || undefined,
    context: {
      appId: selectedAppId || undefined,
      appName: selectedApp?.display_name || undefined,
      companyId: selectedCompanyId || undefined,
      companyName: selectedCompany?.company_name || undefined,
    },
  };

  return (
    <ChatProvider initialIsOpen={true} runtimeConfig={runtimeConfig}>
      <DemoWorkspace
        backendUrl={backendUrl}
        apps={apps}
        companies={companies}
        selectedAppId={selectedAppId}
        onAppChange={setSelectedAppId}
        selectedCompanyId={selectedCompanyId}
        onCompanyChange={setSelectedCompanyId}
        loadingApps={loadingApps}
        loadingCompanies={loadingCompanies}
        errorMessage={errorMessage}
      />
    </ChatProvider>
  );
}
