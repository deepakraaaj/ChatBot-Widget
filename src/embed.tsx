import { StrictMode } from "react";
import { createRoot, Root } from "react-dom/client";

import ChatWidget from "./components/ChatWidget";
import {
  ChatProvider,
  setChatRuntimeConfig,
} from "./hooks/useChat";
import type { ChatRuntimeConfig, ChatRuntimeContext } from "./hooks/useChat";
import widgetStyles from "./widget.css?inline";

declare const __KRITIBOT_WIDGET_VERSION__: string;

type EmbedTarget = string | HTMLElement;

interface EmbedInitConfig {
  target?: EmbedTarget;
  backendUrl?: string;
  userId?: string;
  userName?: string;
  companyId?: string;
  companyName?: string;
  requestHeaders?: Record<string, string>;
  openOnLoad?: boolean;
  autoInit?: boolean;
}

type KritiBotQueuedCommand =
  | ["init", EmbedInitConfig?]
  | ["update", Partial<EmbedInitConfig>]
  | ["destroy"];

interface KritiBotApi {
  init: (config?: EmbedInitConfig) => void;
  update: (config: Partial<EmbedInitConfig>) => void;
  destroy: () => void;
  version: string;
  apiVersion: number;
  q?: KritiBotQueuedCommand[];
}

interface WidgetMountRef {
  hostElement: HTMLDivElement;
  targetElement: HTMLElement;
  root: Root;
  render: (config: EmbedInitConfig) => void;
  moveTo: (target: HTMLElement) => void;
}

interface KritiBotGlobalState {
  activeMount: WidgetMountRef | null;
  currentConfig: EmbedInitConfig;
  scriptConfig: EmbedInitConfig;
}

const ROOT_ATTR = "data-kritibot-root";
const API_VERSION = 1;
const initialScriptTag =
  typeof document !== "undefined"
    ? (document.currentScript as HTMLScriptElement | null)
    : null;

function normalizeString(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function parseBoolean(value?: string): boolean | undefined {
  if (value === undefined) return undefined;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;

  return undefined;
}

function parseHeaders(value?: string): Record<string, string> | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }

    return Object.entries(parsed).reduce<Record<string, string>>(
      (acc, [key, entryValue]) => {
        if (typeof entryValue === "string") {
          acc[key] = entryValue;
        }
        return acc;
      },
      {}
    );
  } catch {
    console.error(
      "KritiBot: failed to parse data-request-headers JSON. Ignoring it."
    );
    return undefined;
  }
}

function normalizeHeaderConfig(
  value?: Record<string, string>
): Record<string, string> | undefined {
  if (!value) return undefined;

  const entries = Object.entries(value).filter(
    ([key, entryValue]) => key.trim() && typeof entryValue === "string"
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function isHTMLElement(target: EmbedTarget | undefined): target is HTMLElement {
  return typeof HTMLElement !== "undefined" && target instanceof HTMLElement;
}

function resolveTarget(target: EmbedTarget | undefined): HTMLElement {
  if (isHTMLElement(target)) {
    return target;
  }

  if (typeof target === "string") {
    const selector = target.trim();

    if (selector) {
      try {
        const found = document.querySelector<HTMLElement>(selector);
        if (found) return found;
        console.error(
          `KritiBot: target selector "${selector}" was not found. Falling back to document.body.`
        );
      } catch (error) {
        console.error(
          `KritiBot: target selector "${selector}" is invalid. Falling back to document.body.`,
          error
        );
      }
    }
  }

  if (document.body) {
    return document.body;
  }

  return document.documentElement;
}

function extractContext(config: EmbedInitConfig): ChatRuntimeContext | undefined {
  const context: ChatRuntimeContext = {
    userId: config.userId,
    userName: config.userName,
    companyId: config.companyId,
    companyName: config.companyName,
  };

  if (
    !context.userId &&
    !context.userName &&
    !context.companyId &&
    !context.companyName
  ) {
    return undefined;
  }

  return context;
}

function normalizeEmbedConfig(
  config: Partial<EmbedInitConfig>
): EmbedInitConfig {
  return {
    ...config,
    target:
      typeof config.target === "string"
        ? normalizeString(config.target)
        : config.target,
    backendUrl: normalizeString(config.backendUrl),
    userId: normalizeString(config.userId),
    userName: normalizeString(config.userName),
    companyId: normalizeString(config.companyId),
    companyName: normalizeString(config.companyName),
    requestHeaders: normalizeHeaderConfig(config.requestHeaders),
  };
}

function hasBackendUrl(config: EmbedInitConfig): boolean {
  return Boolean(normalizeString(config.backendUrl));
}

function toRuntimeConfig(config: EmbedInitConfig): ChatRuntimeConfig {
  return {
    backendUrl: config.backendUrl,
    context: extractContext(config),
    requestHeaders: config.requestHeaders,
  };
}

function mergeConfig(
  base: EmbedInitConfig,
  patch: Partial<EmbedInitConfig>
): EmbedInitConfig {
  const mergedHeaders =
    patch.requestHeaders === undefined
      ? base.requestHeaders
      : {
          ...(base.requestHeaders || {}),
          ...(patch.requestHeaders || {}),
        };

  return normalizeEmbedConfig({
    ...base,
    ...patch,
    requestHeaders: mergedHeaders,
  });
}

function toEmbedConfig(value: unknown): EmbedInitConfig | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return normalizeEmbedConfig(value as EmbedInitConfig);
}

function toEmbedPatchConfig(
  value: unknown
): Partial<EmbedInitConfig> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return normalizeEmbedConfig(value as Partial<EmbedInitConfig>);
}

function readScriptConfig(script: HTMLScriptElement | null): EmbedInitConfig {
  if (!script) return {};

  const {
    target,
    backendUrl,
    userId,
    userName,
    companyId,
    companyName,
    requestHeaders,
    openOnLoad,
    autoInit,
  } = script.dataset;

  return normalizeEmbedConfig({
    target: target?.trim() || undefined,
    backendUrl,
    userId,
    userName,
    companyId,
    companyName,
    requestHeaders: parseHeaders(requestHeaders),
    openOnLoad: parseBoolean(openOnLoad),
    autoInit: parseBoolean(autoInit),
  });
}

function getOrCreateState(): KritiBotGlobalState | null {
  if (typeof window === "undefined") return null;

  if (!window.__KRITIBOT_WIDGET_STATE__) {
    window.__KRITIBOT_WIDGET_STATE__ = {
      activeMount: null,
      currentConfig: {},
      scriptConfig: {},
    };
  }

  return window.__KRITIBOT_WIDGET_STATE__;
}

function createMount(config: EmbedInitConfig): WidgetMountRef {
  const target = resolveTarget(config.target);
  const hostElement = document.createElement("div");
  hostElement.setAttribute(ROOT_ATTR, "true");

  const shadowRoot = hostElement.attachShadow({ mode: "open" });
  const styleTag = document.createElement("style");
  styleTag.textContent = widgetStyles;

  const mountElement = document.createElement("div");
  mountElement.id = "kritibot-mount";

  shadowRoot.appendChild(styleTag);
  shadowRoot.appendChild(mountElement);
  target.appendChild(hostElement);

  const root = createRoot(mountElement);
  const render = (nextConfig: EmbedInitConfig) => {
    const runtimeConfig = toRuntimeConfig(nextConfig);
    setChatRuntimeConfig(runtimeConfig);

    root.render(
      <StrictMode>
        <ChatProvider
          initialIsOpen={Boolean(nextConfig.openOnLoad)}
          runtimeConfig={runtimeConfig}
        >
          <ChatWidget />
        </ChatProvider>
      </StrictMode>
    );
  };

  const mountRef: WidgetMountRef = {
    hostElement,
    targetElement: target,
    root,
    render,
    moveTo: (nextTarget) => {
      if (mountRef.targetElement !== nextTarget) {
        nextTarget.appendChild(hostElement);
        mountRef.targetElement = nextTarget;
      }
    },
  };

  render(config);

  return mountRef;
}

function initWidget(config: EmbedInitConfig = {}) {
  const state = getOrCreateState();

  if (!state || typeof document === "undefined") {
    console.error("KritiBot: document is not available.");
    return;
  }

  if (state.activeMount) {
    state.activeMount.root.unmount();
    state.activeMount.hostElement.remove();
    state.activeMount = null;
  }

  state.currentConfig = normalizeEmbedConfig(config);
  state.activeMount = createMount(state.currentConfig);
}

function updateWidget(config: Partial<EmbedInitConfig>) {
  const state = getOrCreateState();
  if (!state) return;

  if (!state.activeMount) {
    initWidget(mergeConfig(state.scriptConfig, config));
    return;
  }

  const nextConfig = mergeConfig(state.currentConfig, config);
  const nextTarget = resolveTarget(nextConfig.target);

  state.activeMount.moveTo(nextTarget);
  state.currentConfig = nextConfig;
  state.activeMount.render(nextConfig);
}

function destroyWidget() {
  const state = getOrCreateState();
  if (!state?.activeMount) return;

  state.activeMount.root.unmount();
  state.activeMount.hostElement.remove();
  state.activeMount = null;
  state.currentConfig = {};
  setChatRuntimeConfig();
}

function applyCurrentScriptConfig(script: HTMLScriptElement | null) {
  const state = getOrCreateState();
  if (!state || typeof document === "undefined") return;

  state.scriptConfig = mergeConfig(
    state.scriptConfig,
    readScriptConfig(script)
  );
}

function normalizeQueuedCommands(value: unknown): KritiBotQueuedCommand[] {
  if (!Array.isArray(value)) return [];

  const commands: KritiBotQueuedCommand[] = [];

  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length === 0) continue;

    const [action, payload] = entry;

    if (action === "init") {
      commands.push(["init", toEmbedConfig(payload)]);
      continue;
    }

    if (action === "update") {
      const patch = toEmbedPatchConfig(payload);
      if (patch) {
        commands.push(["update", patch]);
      }
      continue;
    }

    if (action === "destroy") {
      commands.push(["destroy"]);
    }
  }

  return commands;
}

function bindGlobalApi():
  | { api: KritiBotApi; queuedCommands: KritiBotQueuedCommand[] }
  | null {
  if (typeof window === "undefined") return null;

  const existing =
    window.KritiBot && typeof window.KritiBot === "object"
      ? window.KritiBot
      : undefined;
  const queuedCommands = normalizeQueuedCommands(existing?.q);
  const api = existing || ({} as KritiBotApi);

  api.init = (config) => {
    const state = getOrCreateState();
    const defaults = state?.scriptConfig || {};
    initWidget(mergeConfig(defaults, normalizeEmbedConfig(config || {})));
  };
  api.update = updateWidget;
  api.destroy = destroyWidget;
  api.version = __KRITIBOT_WIDGET_VERSION__;
  api.apiVersion = API_VERSION;
  api.q = [];

  window.KritiBot = api;

  return { api, queuedCommands };
}

function flushQueuedCommands(
  api: KritiBotApi,
  commands: KritiBotQueuedCommand[]
) {
  for (const command of commands) {
    if (command[0] === "init") {
      api.init(command[1]);
      continue;
    }

    if (command[0] === "update") {
      api.update(command[1]);
      continue;
    }

    api.destroy();
  }
}

function bootstrapEmbed() {
  const state = getOrCreateState();
  if (!state) return;

  applyCurrentScriptConfig(initialScriptTag);

  const binding = bindGlobalApi();
  if (!binding) return;

  if (
    state.scriptConfig.autoInit !== false &&
    binding.queuedCommands.length === 0 &&
    !state.activeMount
  ) {
    if (!hasBackendUrl(state.scriptConfig)) {
      console.warn(
        "KritiBot: backendUrl is missing. Initializing in offline mode; call KritiBot.update({ backendUrl }) when config is available."
      );
    }

    initWidget(state.scriptConfig);
  }

  flushQueuedCommands(binding.api, binding.queuedCommands);
}

function bootstrapWhenReady() {
  if (typeof document === "undefined") {
    bootstrapEmbed();
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapEmbed, {
      once: true,
    });
    return;
  }

  bootstrapEmbed();
}

declare global {
  interface Window {
    KritiBot?: KritiBotApi;
    __KRITIBOT_WIDGET_STATE__?: KritiBotGlobalState;
  }
}

bootstrapWhenReady();

export type { EmbedInitConfig, KritiBotApi };
