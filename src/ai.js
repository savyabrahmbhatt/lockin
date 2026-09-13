export const PROVIDERS = {
  anthropic: { label: 'Claude', defaultModel: 'claude-sonnet-5', keyHint: 'sk-ant-...' },
  openai: { label: 'OpenAI', defaultModel: 'gpt-4o', keyHint: 'sk-...' },
  google: { label: 'Gemini', defaultModel: 'gemini-2.0-flash', keyHint: 'AIza...' },
};

export const SYSTEM = `You are the coach inside Lock In, a life-operating-system app.

Phase 1 - interview. The user speaks in plain language. Ask ONE short question at a time
until you know: every goal, its deadline, the user's starting point, their real working
hours, their non-negotiables, and which goal they sacrifice first on a bad week.
Never ask more than 7 questions. Never present forms or lists of options.

Phase 2 - plan. When you know enough, reply with a short paragraph naming the total hours
of work the user just signed up for, then output ONE json object inside a \`\`\`json fence:

{"goals":[{"title":"","deadline":"","metric":""}],
 "week":{"mon":[task],"tue":[],"wed":[],"thu":[],"fri":[],"sat":[],"sun":[]}}

task = {"title":"","time":"07:30 - 09:30","category":"Work","subs":["",""],
        "impact_done":"","impact_miss":""}

Rules for the plan:
- Split every goal into concrete daily blocks with real sub-tasks. A gym block lists the
  actual exercises with sets. A study block lists the actual topics. A reading block names
  the book and pages.
- Spread load across mon-sun. No day gets more than 3 demanding blocks. Keep one day light
  and leave the rest day genuinely light. Respect stated non-negotiables and work hours.
- impact_done states what finishing buys, in concrete units: dates pulled forward, kilos,
  hours banked. impact_miss states what skipping costs, just as concretely. Both are blunt
  and motivating. Never shaming, never merely consoling.`;

export function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  let candidate = fenced ? fenced[1] : null;
  if (!candidate) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    candidate = text.slice(start, end + 1);
  }
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

export function extractPlan(text) {
  const parsed = extractJSON(text);
  return parsed && parsed.week ? parsed : null;
}

export function stripPlan(text) {
  return text.replace(/```json[\s\S]*?```/, '').trim();
}

// ponytail: the whole point of this prompt is that it is short. A spoken tweak sends
// ONE task (~120 tokens) instead of the 7-day week (~3k), so an edit costs cents-of-a-cent.
const EDIT_SYSTEM = `Apply the user's spoken instruction to the one JSON task they send.
Reply with ONLY the updated task as raw JSON. No fence, no prose, no explanation.
Keep every key: title, time, category, subs, impact_done, impact_miss, state.
subs is an array of {"title":"","done":false}. Preserve subs you were not asked to change,
and preserve each sub's done value. Times look like "07:30 - 09:30".
If the instruction changes the work, rewrite impact_done and impact_miss to match it -
concrete units, blunt, motivating, never shaming.`;

export async function editTask({ provider, model, apiKey, task, instruction }) {
  const reply = await chat({
    provider,
    model,
    apiKey,
    system: EDIT_SYSTEM,
    maxTokens: 800,
    messages: [{ role: 'user', content: JSON.stringify(task) + '\n\n' + instruction }],
  });
  const next = extractJSON(reply);
  if (!next || !next.title) throw new Error("Didn't catch that. Say it again.");
  return next;
}

async function post(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || 'Request failed (' + res.status + ')');
  return json;
}

export async function chat({ provider, model, apiKey, messages, system = SYSTEM, maxTokens = 4096 }) {
  const m = model || PROVIDERS[provider].defaultModel;
  if (!apiKey) throw new Error('Add your ' + PROVIDERS[provider].label + ' API key in Profile first.');

  if (provider === 'anthropic') {
    const json = await post(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      { model: m, max_tokens: maxTokens, system, messages }
    );
    return json.content.map((b) => b.text || '').join('');
  }

  if (provider === 'openai') {
    const json = await post(
      'https://api.openai.com/v1/chat/completions',
      { Authorization: 'Bearer ' + apiKey },
      { model: m, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] }
    );
    return json.choices[0].message.content;
  }

  const json = await post(
    'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + apiKey,
    {},
    {
      generationConfig: { maxOutputTokens: maxTokens },
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    }
  );
  return json.candidates[0].content.parts.map((p) => p.text || '').join('');
}
