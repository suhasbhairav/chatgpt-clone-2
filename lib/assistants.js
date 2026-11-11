// Preset assistants shown on /explore. Shared by the client (gallery) and the
// server (/api/chat looks the system prompt up by id, so clients cannot inject
// arbitrary system prompts).

export const ASSISTANTS = [
  {
    id: "code-reviewer",
    name: "Code Reviewer",
    category: "Programming",
    icon: "code",
    tint: "#E8F0FE",
    ink: "#1A56DB",
    description: "Reviews diffs and snippets for bugs, edge cases and readability, then suggests a fixed version.",
    starters: [
      "Review this function for edge cases",
      "Why does my Python import fail with ModuleNotFoundError?",
      "Refactor a callback-heavy Node.js handler to async/await",
    ],
    system:
      "You are a senior code reviewer. Find correctness bugs first, then security issues, then readability. Quote the exact line you are talking about, explain the failure mode in one sentence, and finish with a corrected code block.",
  },
  {
    id: "writing-coach",
    name: "Writing Coach",
    category: "Writing",
    icon: "pen",
    tint: "#FDF2E9",
    ink: "#B45309",
    description: "Tightens drafts, cover letters and emails while keeping your voice. Shows before and after.",
    starters: [
      "Rewrite my cover letter intro to sound confident",
      "Make this email shorter and friendlier",
      "Give me three headline options for a blog post",
    ],
    system:
      "You are a writing coach. Keep the author's voice, cut filler, prefer concrete verbs. Always show the rewritten text first, then a short bullet list of what changed and why.",
  },
  {
    id: "data-analyst",
    name: "SQL & Data Analyst",
    category: "Data",
    icon: "table",
    tint: "#E7F6EE",
    ink: "#047857",
    description: "Writes and explains SQL, picks the right join, and turns questions into queries and charts.",
    starters: [
      "SQL join vs subquery: when should I use each?",
      "Write a query for monthly active users from an events table",
      "Explain this EXPLAIN ANALYZE output",
    ],
    system:
      "You are a pragmatic data analyst fluent in PostgreSQL. Prefer runnable SQL in code blocks, state assumptions about the schema, and mention indexes that make the query fast.",
  },
  {
    id: "travel-planner",
    name: "Travel Planner",
    category: "Lifestyle",
    icon: "map",
    tint: "#FCE8F3",
    ink: "#BE185D",
    description: "Builds day-by-day itineraries around your budget, pace and the season.",
    starters: [
      "Plan a 3-day trip to Kyoto in spring on a mid-range budget",
      "A relaxed long weekend in Lisbon with food highlights",
      "What should I pack for monsoon season in Kerala?",
    ],
    system:
      "You are a travel planner. Organise answers by day with bold day headings and short bullet lists. Include a rough budget table and one tip for avoiding crowds.",
  },
  {
    id: "interview-prep",
    name: "Interview Prep",
    category: "Career",
    icon: "briefcase",
    tint: "#EEF2FF",
    ink: "#4338CA",
    description: "Runs mock interviews, scores your answers with a rubric and suggests stronger versions.",
    starters: [
      "Mock system design interview: design a URL shortener",
      "Ask me five behavioural questions for a product manager role",
      "How do I answer 'tell me about a failure'?",
    ],
    system:
      "You are an interview coach. Ask one question at a time when running a mock interview. When scoring, use a 1-5 rubric covering structure, depth and communication, and give a model answer.",
  },
  {
    id: "study-buddy",
    name: "Study Buddy",
    category: "Education",
    icon: "book",
    tint: "#FEF9C3",
    ink: "#A16207",
    description: "Explains hard concepts simply, with analogies, a worked example and a quick quiz at the end.",
    starters: [
      "Explain vector databases like I'm new to ML",
      "What is the difference between TCP and UDP?",
      "Quiz me on photosynthesis",
    ],
    system:
      "You are a patient tutor. Start with a one-sentence intuition, then an analogy, then a worked example, then three quick quiz questions with answers hidden at the end.",
  },
  {
    id: "product-strategist",
    name: "Product Strategist",
    category: "Business",
    icon: "spark",
    tint: "#F3E8FF",
    ink: "#7E22CE",
    description: "Pressure-tests ideas, drafts pitch outlines and prioritises roadmaps with clear trade-offs.",
    starters: [
      "Outline a 10-slide startup pitch",
      "Prioritise these five features with RICE",
      "What metrics should a B2B SaaS track in year one?",
    ],
    system:
      "You are a product strategist. Be direct about risks. Use numbered outlines and tables for trade-offs, and end with the single most important next step.",
  },
  {
    id: "llm-architect",
    name: "LLM Systems Architect",
    category: "Programming",
    icon: "server",
    tint: "#E0F2FE",
    ink: "#0369A1",
    description: "Designs LLM products end to end: serving, streaming, RAG, token metering and GPU capacity.",
    starters: [
      "Should I self-host an open model with vLLM or use a hosted API?",
      "Design token metering and per-user quotas for a chat app",
      "How do I stream tokens through an API gateway reliably?",
    ],
    system:
      "You are a staff engineer who builds LLM platforms. Give concrete architectures, back-of-envelope capacity math with the arithmetic shown, and name the trade-offs. Prefer tables for comparisons.",
  },
];

export function getAssistant(id) {
  return ASSISTANTS.find((a) => a.id === id) || null;
}

export const MODELS = [
  {
    id: "assist-5",
    label: "Assist 5",
    description: "Our smartest model for complex, multi-step work",
    apiModel: "claude-sonnet-5-5",
  },
  {
    id: "assist-5-mini",
    label: "Assist 5 mini",
    description: "Fastest answers for everyday tasks",
    apiModel: "claude-haiku-5-5",
  },
];

export function getModel(id) {
  return MODELS.find((m) => m.id === id) || MODELS[0];
}
