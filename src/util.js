export const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
export const WEEK_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const todayKey = (d = new Date()) => DAYS[d.getDay()];

export function catColor(name, categories) {
  const hit = categories.find((c) => c.name.toLowerCase() === String(name || '').toLowerCase());
  return hit ? hit.color : '#7a7a84';
}

// A full day is total weight 12 (see the planner rules). Load is a share of that.
export const MAX_DAY_WEIGHT = 12;

export const taskWeight = (t) => Math.min(5, Math.max(1, Number(t?.weight) || 3));

export const dayWeight = (tasks = []) => tasks.reduce((n, t) => n + taskWeight(t), 0);

export function dayLoad(tasks = []) {
  return Math.min(100, Math.round((dayWeight(tasks) / MAX_DAY_WEIGHT) * 100));
}

export function removeTask(week, day, i) {
  return { ...week, [day]: (week[day] || []).filter((_, k) => k !== i) };
}

export function moveTask(week, from, i, to) {
  const task = (week[from] || [])[i];
  if (!task || from === to) return week;
  return {
    ...week,
    [from]: week[from].filter((_, k) => k !== i),
    [to]: [...(week[to] || []), task],
  };
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

export function startMinutes(time) {
  const hm = parseHM(time);
  return hm ? hm.hour * 60 + hm.minute : null;
}

// Untimed tasks sink to the bottom rather than scrambling the order of timed ones.
export function byTime(a, b) {
  const x = startMinutes(a.time);
  const y = startMinutes(b.time);
  if (x === null && y === null) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  return x - y;
}

// Drives the "happening now" highlight and the dimming of blocks whose window has gone.
export function taskPhase(task, nowMin) {
  const start = startMinutes(task.time);
  if (start === null) return 'untimed';
  const endHm = /(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/.exec(task.time || '');
  const end = endHm ? +endHm[3] * 60 + +endHm[4] : start + 60;
  if (nowMin >= start && nowMin < end) return 'now';
  if (nowMin < start) return nowMin >= start - 30 ? 'soon' : 'later';
  return 'past';
}

export function subProgress(task) {
  const subs = task?.subs || [];
  return { done: subs.filter((s) => s.done).length, total: subs.length };
}

// expo-notifications weekday: 1 = Sunday ... 7 = Saturday. WEEK_ORDER starts at Monday.
export const weekdayFor = (i) => ((i + 1) % 7) + 1;

export function completion(week = {}) {
  const all = WEEK_ORDER.flatMap((d) => week[d] || []);
  if (!all.length) return 0;
  return Math.round((all.filter((t) => t.state === 'done').length / all.length) * 100);
}

// One pass over the week producing everything Progress shows. Kept pure so the
// self-check can assert on it without a device.
export function weekStats(week = {}, categories = []) {
  const all = WEEK_ORDER.flatMap((d) => (week[d] || []).map((t) => ({ ...t, day: d })));
  const pctOf = (list) => {
    const closed = list.filter((t) => t.state === 'done' || t.state === 'missed');
    return closed.length ? Math.round((list.filter((t) => t.state === 'done').length / closed.length) * 100) : 0;
  };

  const byDay = WEEK_ORDER.map((d) => {
    const t = week[d] || [];
    return { day: d, pct: pctOf(t), weight: dayWeight(t), count: t.length, done: t.filter((x) => x.state === 'done').length };
  });

  const names = [...new Set([...categories.map((c) => c.name), ...all.map((t) => t.category).filter(Boolean)])];
  const byCategory = names
    .map((name) => {
      const items = all.filter((t) => (t.category || '').toLowerCase() === name.toLowerCase());
      return {
        name,
        count: items.length,
        done: items.filter((t) => t.state === 'done').length,
        missed: items.filter((t) => t.state === 'missed').length,
        weight: dayWeight(items),
        pct: pctOf(items),
      };
    })
    .filter((c) => c.count)
    .sort((a, b) => b.weight - a.weight);

  const loaded = byDay.filter((d) => d.count);
  const ranked = [...loaded].sort((a, b) => b.pct - a.pct);
  const spread = loaded.length ? Math.max(...loaded.map((d) => d.weight)) - Math.min(...loaded.map((d) => d.weight)) : 0;

  // Longest run of days where everything scheduled got done.
  let streak = 0;
  let best = 0;
  for (const d of byDay) {
    if (d.count && d.done === d.count) best = Math.max(best, ++streak);
    else if (d.count) streak = 0;
  }

  return {
    total: all.length,
    done: all.filter((t) => t.state === 'done').length,
    missed: all.filter((t) => t.state === 'missed').length,
    open: all.filter((t) => (t.state || 'pending') === 'pending').length,
    pct: pctOf(all),
    totalWeight: dayWeight(all),
    heaviestDay: loaded.length ? loaded.reduce((a, b) => (b.weight > a.weight ? b : a)).day : null,
    spread,
    streak: best,
    strongest: ranked[0] || null,
    weakest: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    byDay,
    byCategory,
  };
}

export function normalizeTask(t) {
  return {
    ...t,
    state: t.state || 'pending',
    weight: taskWeight(t),
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
