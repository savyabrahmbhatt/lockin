export const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
export const WEEK_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const todayKey = (d = new Date()) => DAYS[d.getDay()];

export function catColor(name, categories) {
  const hit = categories.find((c) => c.name.toLowerCase() === String(name || '').toLowerCase());
  return hit ? hit.color : '#7a7a84';
}

export function dayLoad(tasks = []) {
  // ponytail: one demanding block ~= 33% of a day. Caps at 100 so the bar stays readable.
  return Math.min(100, Math.round(tasks.length * 18 + tasks.reduce((n, t) => n + (t.subs?.length || 0), 0) * 4));
}

// ponytail: first "H:MM" in the string wins. Plan times look like "07:30 - 09:30",
// so the start time is always first. Add a real parser if we ever accept "7am".
export function parseHM(time) {
  const m = /(\d{1,2}):(\d{2})/.exec(time || '');
  if (!m) return null;
  const h = +m[1];
  const min = +m[2];
  return h < 24 && min < 60 ? { hour: h, minute: min } : null;
}

// expo-notifications weekday: 1 = Sunday ... 7 = Saturday. WEEK_ORDER starts at Monday.
export const weekdayFor = (i) => ((i + 1) % 7) + 1;

export function completion(week = {}) {
  const all = WEEK_ORDER.flatMap((d) => week[d] || []);
  if (!all.length) return 0;
  return Math.round((all.filter((t) => t.state === 'done').length / all.length) * 100);
}

export function normalizeTask(t) {
  return {
    ...t,
    state: t.state || 'pending',
    subs: (t.subs || []).map((s) => (typeof s === 'string' ? { title: s, done: false } : s)),
  };
}

export function normalizeWeek(week = {}) {
  const out = {};
  WEEK_ORDER.forEach((d) => {
    out[d] = (week[d] || []).map(normalizeTask);
  });
  return out;
}
