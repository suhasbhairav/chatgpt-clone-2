import { demoAnswer } from "./demo";

const H = 3_600_000;

const APP_PY = `import sys
from utils import helpers  # ModuleNotFoundError when run as a script


def main():
    data = helpers.load_config("config.yaml")
    # TODO: validate schema before use
    print(helpers.summarise(data))


if __name__ == "__main__":
    sys.exit(main())
`;

const SEEDS = [
  { id: "kyoto-spring-itinerary", title: "Kyoto spring itinerary", ago: 0.2 * H, q: "Plan a 3-day trip to Kyoto in spring on a mid-range budget." },
  {
    id: "fix-python-import-error",
    title: "Fix Python import error",
    ago: 2 * H,
    q: "Why does `from utils import helpers` fail with ModuleNotFoundError when I run my script?",
    file: { name: "app.py", type: "text/x-python", content: APP_PY },
  },
  { id: "weekly-meal-prep-list", title: "Weekly meal prep list", ago: 5 * H, q: "Make me a weekly meal prep list for two people." },
  { id: "explain-vector-databases", title: "Explain vector databases", ago: 26 * H, q: "Explain vector databases like I'm new to ML." },
  {
    id: "rewrite-cover-letter-intro",
    title: "Rewrite cover letter intro",
    ago: 30 * H,
    q: "Rewrite my cover letter intro: \"I am a data analyst who is responsible for making dashboards and reports for the sales team.\"",
  },
  { id: "sql-join-vs-subquery", title: "SQL join vs subquery", ago: 3 * 24 * H, q: "SQL join vs subquery: when should I use each?" },
  { id: "birthday-gift-ideas", title: "Birthday gift ideas", ago: 4 * 24 * H, q: "Birthday gift ideas for my sister who likes cooking and hiking." },
  { id: "startup-pitch-outline", title: "Startup pitch outline", ago: 6 * 24 * H, q: "Give me a startup pitch outline for investors." },
];

export function buildSeed(now = Date.now()) {
  const library = [];
  const chats = SEEDS.map((s, i) => {
    const t = now - s.ago;
    const attachments = [];
    let apiText = s.q;
    if (s.file) {
      const att = { id: `seed-file-${i}`, name: s.file.name, type: s.file.type, size: s.file.content.length, content: s.file.content };
      attachments.push(att);
      library.push({ ...att, chatId: s.id, addedAt: t });
      apiText = `<file name="${s.file.name}">\n${s.file.content}\n</file>\n\n${s.q}`;
    }
    // Seed answers come from the same offline responder the API uses; for the
    // Python chat we answer the question (not a file summary).
    const answer = demoAnswer({ messages: [{ role: "user", content: s.file ? s.q : apiText }] });
    return {
      id: s.id,
      title: s.title,
      createdAt: t,
      updatedAt: t,
      pinned: false,
      model: "assist-5",
      messages: [
        { id: `${s.id}-u`, role: "user", content: s.q, createdAt: t, attachments },
        { id: `${s.id}-a`, role: "assistant", content: answer, createdAt: t + 4000, mode: "demo", model: "assist-5" },
      ],
    };
  });
  return { chats, library };
}
