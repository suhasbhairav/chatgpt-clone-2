// Offline demo responder. Used by /api/chat when ANTHROPIC_API_KEY is not set.
// It produces a useful, topic-aware markdown answer from simple heuristics so
// every part of the UI (streaming, markdown, code blocks, tables, stop,
// regenerate) can be exercised without a model.

const FILE_RE = /<file name="([^"]+)">\n?([\s\S]*?)<\/file>/g;

function extractFiles(text) {
  const files = [];
  let m;
  FILE_RE.lastIndex = 0;
  while ((m = FILE_RE.exec(text))) files.push({ name: m[1], content: m[2] });
  const question = text.replace(FILE_RE, "").trim();
  return { files, question };
}

function langOf(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const map = {
    js: "javascript", jsx: "javascript", mjs: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java", kt: "kotlin", sql: "sql",
    md: "markdown", json: "json", yml: "yaml", yaml: "yaml", css: "css", html: "html", sh: "bash",
    csv: "csv", txt: "text",
  };
  return map[ext] || "text";
}

function summariseFile(f) {
  const lines = f.content.split("\n");
  const lang = langOf(f.name);
  const words = f.content.split(/\s+/).filter(Boolean).length;
  const symbols = [];
  for (const line of lines) {
    const s =
      line.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/) ||
      line.match(/^\s*def\s+([A-Za-z0-9_]+)/) ||
      line.match(/^\s*class\s+([A-Za-z0-9_]+)/) ||
      line.match(/^\s*(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(/) ||
      line.match(/^#{1,3}\s+(.+)/);
    if (s && symbols.length < 8) symbols.push(s[1].trim());
  }
  const todo = lines.filter((l) => /TODO|FIXME|XXX/.test(l)).length;
  return { lang, lines: lines.length, words, symbols, todo };
}

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function topicFrom(q) {
  const cleaned = q
    .replace(/[?.!]+$/g, "")
    .replace(/^(please\s+)?(can you|could you|would you|help me|i want to|i need to|tell me|explain|what is|what are|how do i|how to|how can i|why does|why is)\s+/i, "")
    .trim();
  return cleaned.length > 80 ? cleaned.slice(0, 77) + "..." : cleaned || "this";
}

const ANSWERS = [
  {
    test: /kyoto|itinerar|trip|travel|vacation|holiday|weekend in/i,
    answer: () => `Here is a relaxed three-day plan built around cherry-blossom season.

**Day 1 — Eastern Kyoto**

- Morning walk up to Kiyomizu-dera before the crowds
- Lunch along Sannenzaka and Ninenzaka
- Evening stroll through Gion and Shirakawa canal

**Day 2 — Arashiyama**

- Bamboo grove at opening time
- Tenryū-ji garden and a riverside lunch

**Day 3 — Philosopher's Path**

- Ginkaku-ji at opening, then walk the path south to Nanzen-ji
- Snacks at Nishiki Market before your train

Budget: roughly ¥22,000–28,000 per person per day for a mid-range hotel, meals, buses and temple entries. Book refundable rooms, since blossom forecasts shift every year.`,
  },
  {
    test: /python|import|module|traceback|exception|error|bug|stack ?trace/i,
    answer: () => `A \`ModuleNotFoundError\` almost always means Python is resolving imports from a different directory or interpreter than you expect.

### Quick checks

1. Print the interpreter and search path:

\`\`\`python
import sys
print(sys.executable)
print("\\n".join(sys.path))
\`\`\`

2. Make sure the package is installed **into that interpreter**:

\`\`\`bash
python -m pip install requests   # not plain \`pip\`, which may point elsewhere
\`\`\`

3. Run your project as a module from the repo root so relative imports work:

\`\`\`bash
python -m app.main   # instead of: python app/main.py
\`\`\`

### Common causes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Works in terminal, fails in IDE | IDE uses another venv | Select the venv interpreter |
| \`from . import x\` fails | Script run directly | Use \`python -m package.module\` |
| Import works once, then fails | Name shadowing (\`random.py\`) | Rename your file |

If you paste the full traceback I can point at the exact line.`,
  },
  {
    test: /sql|join|subquer|query|postgres|database index/i,
    answer: () => `Both can express the same logic; the difference is readability and how the planner executes them.

### Rule of thumb

- Use a **JOIN** when you need columns from both tables in the result.
- Use a **subquery** (\`EXISTS\` / \`IN\`) when you only need to *filter* by the other table.

\`\`\`sql
-- JOIN: return order data together with the customer name
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.created_at >= now() - interval '30 days';

-- EXISTS: customers who ordered in the last 30 days (no duplicates)
SELECT c.id, c.name
FROM customers c
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.customer_id = c.id
    AND o.created_at >= now() - interval '30 days'
);
\`\`\`

| | JOIN | EXISTS subquery |
| --- | --- | --- |
| Returns columns from both tables | Yes | No |
| Duplicates when one-to-many | Yes, needs DISTINCT | No |
| Stops at first match | No | Yes (semi-join) |

An index on \`orders (customer_id, created_at)\` makes both versions fast.`,
  },
  {
    test: /vector|embedding|rag|retrieval|semantic search/i,
    answer: () => `A **vector database** stores items as lists of numbers (embeddings) so you can find things that *mean* the same, not just things that share keywords.

### How it works

1. An embedding model turns text, images or code into a vector, e.g. 1,024 floats.
2. Similar meaning lands close together, so "cheap flights" sits near "budget airfare".
3. At query time you embed the question and fetch the nearest neighbours with an index such as **HNSW**.

\`\`\`sql
-- pgvector: the five chunks closest to the query embedding
SELECT id, content
FROM chunks
ORDER BY embedding <=> $1   -- cosine distance
LIMIT 5;
\`\`\`

| Option | Good for |
| --- | --- |
| pgvector (Postgres) | You already run Postgres, under ~50M vectors |
| Qdrant / Weaviate | Dedicated service, filtering at scale |
| FAISS | In-process, offline batch jobs |

In a chat app this powers **RAG**: retrieve the top chunks from your files and put them in the prompt.`,
  },
  {
    test: /rewrite|cover letter|email|tone|polish|proofread|intro/i,
    answer: () => `Here is a tighter, more confident version:

> I build data products that people actually use. Over the last four years I have shipped analytics dashboards used by 300+ account managers and cut report turnaround from two days to two hours. I would love to bring that same focus on outcomes to your team.

**What changed**

- Opened with what you *do*, not who you are
- Replaced "responsible for" with concrete results and numbers
- Ended with a forward-looking line instead of "I look forward to hearing from you"

Want a more formal or a more playful variant?`,
  },
  {
    test: /meal|recipe|cook|grocery|diet|prep/i,
    answer: () => `A simple weekly meal-prep plan that takes about two hours on Sunday.

### Cook once

- **Grains:** a big pot of brown rice or quinoa
- **Protein:** a tray of roasted chickpeas and one of baked tofu or chicken thighs
- **Veg:** roast broccoli, peppers and sweet potato on two sheets
- **Sauce:** tahini-lemon and a peanut-lime dressing

### Assemble all week

| Day | Lunch | Dinner |
| --- | --- | --- |
| Mon | Grain bowl + tahini | Stir-fry with peanut sauce |
| Tue | Wrap with roasted veg | Lentil soup |
| Wed | Grain bowl + chickpeas | Pasta with roasted peppers |
| Thu | Leftover soup | Fried rice |
| Fri | Salad + tofu | Eat out |

### Shopping list

- Rice or quinoa, red lentils, canned chickpeas
- Tofu or chicken, eggs
- Broccoli, peppers, sweet potatoes, spinach, lemons
- Tahini, peanut butter, soy sauce, limes`,
  },
  {
    test: /gift|birthday|present|anniversary/i,
    answer: () => `Some birthday gift ideas grouped by budget:

### Under ₹1,500 / $20

- A good notebook and pen set
- Specialty coffee or tea sampler
- A plant in a nice pot

### ₹1,500–5,000 / $20–60

- Cooking or pottery class for two
- Noise-cancelling earbuds
- A framed print of a place that matters to them

### Splurge

- A weekend trip
- A quality chef's knife or a mechanical keyboard, depending on the hobby

**Tip:** an experience you do *together* is usually remembered longer than an object.`,
  },
  {
    test: /pitch|startup|investor|deck|business plan/i,
    answer: () => `A 10-slide startup pitch outline:

1. **Problem** — one painful, specific moment your customer has
2. **Solution** — what you do, shown in one screenshot
3. **Why now** — the shift that makes this possible today
4. **Market** — bottom-up sizing: customers × price
5. **Product** — the three things it does best
6. **Traction** — growth chart, retention, notable logos
7. **Business model** — pricing and unit economics
8. **Competition** — a 2×2 that is honest about trade-offs
9. **Team** — why you are the people to build this
10. **Ask** — how much, for what milestones, by when

> Keep each slide to one idea and one number. If a slide needs a paragraph, it is two slides.`,
  },
  {
    test: /vllm|sglang|gpu|self.?host|inference|token|llm|serving|latency/i,
    answer: () => `Short answer: start on a hosted API, and self-host only the traffic that is steady, high-volume and tolerant of a smaller open model.

### Compare

| | Hosted API | Self-hosted (vLLM / SGLang) |
| --- | --- | --- |
| Time to launch | Hours | Weeks |
| Quality ceiling | Frontier models | Best open-weight models |
| Cost shape | Per token | Per GPU-hour (fixed) |
| Ops burden | None | Drivers, batching, autoscaling, on-call |

### Back-of-envelope (estimate)

- One 96 GB GPU running a quantised ~30B model with continuous batching might sustain roughly 1,500–3,000 output tokens/s across all streams.
- At 2,000 tok/s × 86,400 s × 50% utilisation ≈ **86M tokens/day** per GPU.
- Compare that with your hosted per-token price to find the break-even.

### Architecture

1. API gateway authenticates, meters tokens and enforces quotas
2. Router sends each request to hosted or self-hosted backends
3. Tokens stream back to the browser over SSE`,
  },
  {
    test: /^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/i,
    answer: () => `Hi! I'm Assist. I can help you write, plan, code, learn and analyse.

A few things to try:

- **Plan** a 3-day trip on a budget
- **Debug** an error message (paste the traceback)
- **Explain** a concept like vector databases
- **Attach** a text or code file with the **+** button and ask about it`,
  },
];

function genericAnswer(q) {
  const topic = topicFrom(q);
  const h = hash(q);
  const opener = pick(
    [
      `Here's a structured way to think about **${topic}**.`,
      `Good question. Let's break **${topic}** down into parts.`,
      `Here is a practical overview of **${topic}**.`,
    ],
    h
  );
  return `${opener}

### The core idea

Start by being precise about the goal: what does "done" look like, who is it for, and what constraints (time, budget, tools) apply? Most problems around ${topic} get easier once the success criteria are written down.

### A step-by-step approach

1. **Clarify** the outcome and the one metric that tells you it worked
2. **List options**, including the boring default
3. **Compare** them on cost, effort, risk and reversibility
4. **Try the cheapest reversible option first** and measure
5. **Iterate** based on what you learn

| Option | Effort | Risk | When it fits |
| --- | --- | --- | --- |
| Do the simple default | Low | Low | You need a result this week |
| Adapt an existing solution | Medium | Low | Something close already exists |
| Build something custom | High | Medium | It is core to what you do |

If you share more detail — your context, constraints and what you've tried — I can make this specific.`;
}

export function demoAnswer({ messages, think, search, assistant }) {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const raw = typeof last?.content === "string" ? last.content : "";
  const { files, question } = extractFiles(raw);
  const parts = [];

  if (think) {
    parts.push(
      `> **Thinking** (demo): identified the request type, checked earlier turns for context, chose a structure (steps, then a comparison table), and kept the answer self-contained.`
    );
  }

  if (files.length) {
    const blocks = files.map((f) => {
      const s = summariseFile(f);
      const firstLines = f.content.split("\n").slice(0, 12).join("\n");
      return `### ${f.name}

- **Type:** ${s.lang}
- **Size:** ${s.lines} lines, ${s.words} words
- **Notable symbols / headings:** ${s.symbols.length ? s.symbols.map((x) => "`" + x + "`").join(", ") : "none detected"}
- **TODO / FIXME markers:** ${s.todo}

\`\`\`${s.lang}
${firstLines}${f.content.split("\n").length > 12 ? "\n..." : ""}
\`\`\``;
    });
    parts.push(
      `I read ${files.length === 1 ? "the attached file" : `the ${files.length} attached files`}. Here's what's in ${files.length === 1 ? "it" : "them"}:\n\n${blocks.join("\n\n")}`
    );
    if (question) parts.push(`**About your question** — "${question.slice(0, 160)}": the outline above shows where to look first. With a live model connected, I would answer it line by line using the file contents as context.`);
  } else {
    const hit = ANSWERS.find((a) => a.test.test(question));
    parts.push(hit ? hit.answer(question) : genericAnswer(question || "your request"));
  }

  if (assistant) {
    parts.unshift(`*${assistant.name} mode*`);
  }

  if (search) {
    parts.push(
      `---\n\n**Search** was on. Offline demo mode does not browse the web, so no live sources were fetched. With an API key set, Assist enables the web search tool for this message.`
    );
  }

  return parts.join("\n\n");
}

export function heuristicTitle(text) {
  const { question } = extractFiles(text || "");
  const base = (question || text || "New chat")
    .replace(/\s+/g, " ")
    .replace(/^(hi|hello|hey)[,!. ]+/i, "")
    .replace(/[?.!]+$/g, "")
    .trim();
  const FILLER = /^(please\s+|can you\s+|could you\s+|would you\s+|help me( to)?\s+|i want to\s+|i need to\s+|tell me( about)?\s+|give me\s+)/i;
  let t = base;
  for (let i = 0; i < 4 && FILLER.test(t); i++) t = t.replace(FILLER, "");
  const words = t.split(" ").slice(0, 6).join(" ");
  if (!words) return "New chat";
  return words.charAt(0).toUpperCase() + words.slice(1);
}
