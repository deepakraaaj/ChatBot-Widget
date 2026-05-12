import type { ChatMessage } from "../chat/chatState";

export interface QuickActionSection {
  title: string;
  prompts: string[];
}

export interface HelpCard {
  icon: string;
  label: string;
  description: string;
  example: string;
}

const FITS_APP_ID = "fits_dev_march_9";

const FITS_WELCOME_COPY = {
  greeting: "Hi! I'm KritiBot, your FITS maintenance assistant.",
  summary:
    "I can help you query tasks, facilities, assets, schedules, and checklists.",
  prompt: "Use the quick actions below to get started.",
};

const GENERIC_WELCOME_COPY = {
  greeting: "Hi! I'm KritiBot.",
  summary:
    "I can help you query data, check status, and manage supported workflows.",
  prompt: "Use the quick actions below to get started.",
};

const FITS_QUICK_ACTION_SECTIONS: QuickActionSection[] = [
  {
    title: "Tasks",
    prompts: [
      "Show me all pending maintenance tasks",
      "How many tasks are overdue?",
      "Show tasks due today",
    ],
  },
  {
    title: "Facilities",
    prompts: [
      "List all facilities",
      "Which facility has the most open tasks?",
    ],
  },
  {
    title: "Assets",
    prompts: [
      "Count assets by facility",
      "Show assets with no scheduled maintenance",
    ],
  },
  {
    title: "Schedules",
    prompts: [
      "Show this week's maintenance schedule",
      "Create a maintenance task",
    ],
  },
  {
    title: "Checklists",
    prompts: [
      "Show checklist compliance status for this week",
      "Which tasks have incomplete checklists?",
    ],
  },
];

const GENERIC_QUICK_ACTION_SECTIONS: QuickActionSection[] = [
  {
    title: "Quick Access",
    prompts: ["Task status", "Schedule a Task", "Update task status"],
  },
];

const FITS_HELP_CARDS: HelpCard[] = [
  {
    icon: "🛠️",
    label: "Maintenance Tasks",
    description: "Query, create, update, assign tasks",
    example: "Show me all pending maintenance tasks",
  },
  {
    icon: "🏢",
    label: "Facilities",
    description: "Status reports, workload distribution",
    example: "Which facility has the most open tasks?",
  },
  {
    icon: "📦",
    label: "Assets",
    description: "Count, list, filter by facility",
    example: "Count assets by facility",
  },
  {
    icon: "🗓️",
    label: "Schedules",
    description: "View and create maintenance schedules",
    example: "Show this week's maintenance schedule",
  },
  {
    icon: "✅",
    label: "Checklists",
    description: "Compliance status, completion tracking",
    example: "Show checklist compliance status for this week",
  },
];

const GENERIC_HELP_CARDS: HelpCard[] = [
  {
    icon: "🧾",
    label: "Task Status",
    description: "Check open, pending, or completed tasks",
    example: "Task status",
  },
  {
    icon: "🗓️",
    label: "Scheduling",
    description: "Create or review maintenance schedules",
    example: "Schedule a Task",
  },
  {
    icon: "🔁",
    label: "Updates",
    description: "Change task status or add progress notes",
    example: "Update task status",
  },
];

function normalizeAppId(appId?: string): string {
  return String(appId || "").trim();
}

function isFitsApp(appId?: string): boolean {
  return normalizeAppId(appId) === FITS_APP_ID;
}

function buildWelcomeCopy(appId?: string, appName?: string) {
  if (isFitsApp(appId)) {
    return FITS_WELCOME_COPY;
  }

  const label = String(appName || "").trim();
  if (label) {
    return {
      greeting: `Hi! I'm KritiBot, your ${label} assistant.`,
      summary:
        "I can help you query data, check status, and manage supported workflows.",
      prompt: "Use the quick actions below to get started.",
    };
  }

  return GENERIC_WELCOME_COPY;
}

export function buildWelcomeMessage({
  appId,
  appName,
}: {
  appId?: string;
  appName?: string;
}): ChatMessage {
  const copy = buildWelcomeCopy(appId, appName);

  return {
    id: "welcome-message",
    role: "assistant",
    content: [copy.greeting, copy.summary, copy.prompt].join("\n\n"),
    timestamp: 0,
  };
}

export function getEmptyStateDescription(
  appId?: string,
  appName?: string
): string {
  if (isFitsApp(appId)) {
    return "I'm your FITS maintenance assistant. Ask me about tasks, facilities, assets, schedules, or checklists.";
  }

  const label = String(appName || "").trim();
  if (label) {
    return `Ask about ${label} data, status, or recent activity.`;
  }

  return "Ask about tasks, status updates, or recent activity.";
}

export function getQuickActionSections(
  appId?: string
): QuickActionSection[] {
  return isFitsApp(appId)
    ? FITS_QUICK_ACTION_SECTIONS
    : GENERIC_QUICK_ACTION_SECTIONS;
}

export function getHelpCards(appId?: string): HelpCard[] {
  return isFitsApp(appId) ? FITS_HELP_CARDS : GENERIC_HELP_CARDS;
}
