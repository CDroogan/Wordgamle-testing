// Grace period support for "Paste Result": for up to 3 hours after a game
// period resets, a Gamler can still paste the *previous* period's result
// and have it correctly attributed to that period's date/leaderboard,
// rather than being rejected as "not today's game."
//
// Each game-number function below mirrors that game's own Score Modal
// calculation exactly (same epoch date, same day-count formula) - kept
// here so the modal (which validates a paste) and the submit flow (which
// decides how to file it) can never disagree about what "today's number"
// or "the previous number" actually is.

export const GRACE_PERIOD_MS = 3 * 60 * 60 * 1000; // 3 hours

function daysSinceEpoch(epochYear, epochMonth, epochDay, now) {
  const epochDateOnly = new Date(epochYear, epochMonth, epochDay);
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // A plain subtraction of two local-midnight Dates is off by one whenever
  // the epoch and "now" fall on opposite sides of a DST transition (e.g.
  // Quordle/Octordle's Jan 2022 epoch is standard time, but "now" is
  // daylight time most of the year) - each local midnight is a different
  // number of hours from UTC, so the raw difference isn't an exact 24h
  // multiple. Correct for that offset before dividing, same technique
  // already used in getPhrazlePeriod below.
  const offsetDiffInMs = 60 * (nowDateOnly.getTimezoneOffset() - epochDateOnly.getTimezoneOffset()) * 1000;
  const timeDiff = nowDateOnly.getTime() - epochDateOnly.getTime() - offsetDiffInMs;
  return Math.floor(timeDiff / (24 * 60 * 60 * 1000));
}

export function getWordleGameNumber(now = new Date()) {
  return daysSinceEpoch(2021, 5, 19, now);
}

export function getConnectionsGameNumber(now = new Date()) {
  return daysSinceEpoch(2023, 5, 11, now);
}

export function getQuordleGameNumber(now = new Date()) {
  return daysSinceEpoch(2022, 0, 24, now);
}

export function getOctordleGameNumber(now = new Date()) {
  return daysSinceEpoch(2022, 0, 24, now);
}

// Phrazle resets twice a day (AM/PM), so it has its own period shape -
// mirrors PhrazleScoreModal's calculatePhrazleGameNumber exactly.
export function getPhrazlePeriod(now = new Date()) {
  const firstGameDate = new Date(2025, 10, 18);
  firstGameDate.setHours(0, 0, 0, 0);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setHours(0, 0, 0, 0);

  const offsetDiffInMs = 60 * (today.getTimezoneOffset() - firstGameDate.getTimezoneOffset()) * 1000;
  const timeDiff = today.getTime() - firstGameDate.getTime() - offsetDiffInMs;
  const daysPassed = Math.ceil(timeDiff / (24 * 60 * 60 * 1000));

  const isAM = now.getHours() < 12;
  const number = 2 * daysPassed + (isAM ? 1 : 2);
  return { number, isAM };
}

// --- Grace period math: once-daily games (Wordle/Connections/Quordle/Octordle) ---

function startOfToday(now) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

export function isDailyGraceActive(now = new Date()) {
  return (now.getTime() - startOfToday(now).getTime()) < GRACE_PERIOD_MS;
}

// The last instant of the period immediately before today's - i.e.
// yesterday 23:59:59 - to file a grace-period submission under the
// correct date.
export function getPreviousDailyPeriodEnd(now = new Date()) {
  return new Date(startOfToday(now).getTime() - 1000);
}

// --- Grace period math: Phrazle (twice-daily AM/PM) ---

function startOfCurrentPhrazlePeriod(now) {
  const isAM = now.getHours() < 12;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), isAM ? 0 : 12, 0, 0, 0);
}

export function isPhrazleGraceActive(now = new Date()) {
  return (now.getTime() - startOfCurrentPhrazlePeriod(now).getTime()) < GRACE_PERIOD_MS;
}

export function getPreviousPhrazlePeriodEnd(now = new Date()) {
  return new Date(startOfCurrentPhrazlePeriod(now).getTime() - 1000);
}

// Format a Date using its own local wall-clock fields as "YYYY-MM-DD
// HH:mm:ss" - matches what create-score.php expects for createdAt (a
// naive local timestamp, paired with a separate timeZone field).
export function formatLocalDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatDateOnly(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// --- Grace period "jump to this date" signal ---
//
// A grace-period submission gets filed under the *previous* period's date,
// so "Today's Result" has nothing new to show - the Gamler gets no visible
// confirmation their paste worked. Both submit flows (the embedded "Play"
// button and the "Enter Result" page, which navigates to the stats page on
// success) land on the same Stats page either way, so a one-time signal
// left here lets that page's "Go To Date" section pick up the correct date
// and scroll itself into view, regardless of which flow was used.
const GRACE_JUMP_KEY_PREFIX = 'wordgamle_grace_jump_';

export function markGracePeriodJump(gameKey, dateStr) {
  try {
    sessionStorage.setItem(GRACE_JUMP_KEY_PREFIX + gameKey, dateStr);
  } catch (e) {
    // sessionStorage unavailable (private browsing, etc.) - the result is
    // still saved correctly, the Gamler just won't get auto-scrolled to it.
  }
}

export function consumeGracePeriodJump(gameKey) {
  try {
    const key = GRACE_JUMP_KEY_PREFIX + gameKey;
    const value = sessionStorage.getItem(key);
    if (value) {
      sessionStorage.removeItem(key);
    }
    return value;
  } catch (e) {
    return null;
  }
}

// --- Spoiler Alert (GameFeed) ---

export const GAME_DISPLAY_NAMES = {
  wordle: 'Wordle',
  connections: 'Connections',
  phrazle: 'Phrazle',
  quordle: 'Quordle',
  octordle: 'Octordle',
};

function formatLongDate(date) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatGameNumber(n) {
  return n.toLocaleString('en-US');
}

// Builds the Spoiler Alert dropdown's checklist: each game's own
// specific current period, computed the same way its own Score Modal
// would right now - a tag records exactly this period so other
// Gamlers are gated against the correct game/date, no matter when they
// later view the post.
export function getSpoilerGameOptions(now = new Date()) {
  const dateStr = formatDateOnly(now);
  const longDate = formatLongDate(now);
  const phrazle = getPhrazlePeriod(now);
  const phrazlePeriod = phrazle.isAM ? 'AM' : 'PM';

  return [
    {
      game: 'wordle',
      period: null,
      date: dateStr,
      number: getWordleGameNumber(now),
      label: `Wordle game #${formatGameNumber(getWordleGameNumber(now))} (${longDate})`,
    },
    {
      game: 'connections',
      period: null,
      date: dateStr,
      number: getConnectionsGameNumber(now),
      label: `Connections game #${formatGameNumber(getConnectionsGameNumber(now))} (${longDate})`,
    },
    {
      game: 'phrazle',
      period: phrazlePeriod,
      date: dateStr,
      number: phrazle.number,
      label: `Phrazle game #${formatGameNumber(phrazle.number)} (${longDate} ${phrazlePeriod})`,
    },
    {
      game: 'quordle',
      period: null,
      date: dateStr,
      number: getQuordleGameNumber(now),
      label: `Quordle game #${formatGameNumber(getQuordleGameNumber(now))} (${longDate})`,
    },
    {
      game: 'octordle',
      period: null,
      date: dateStr,
      number: getOctordleGameNumber(now),
      label: `Octordle game #${formatGameNumber(getOctordleGameNumber(now))} (${longDate})`,
    },
  ];
}

// The instant a tagged game/period's own spoiler protection fully
// closes, using the viewer's own local clock. This is NOT "3 hours
// after the tagged period starts" - that would barely protect anything,
// since most Gamlers play well after their day begins. It's the same
// rule already used everywhere else in this file for "is a period still
// gracable": a period isn't considered fully over until 3 hours into
// the *next* period (isDailyGraceActive/isPhrazleGraceActive both treat
// the first 3 hours of a new period as grace time for the one before
// it) - so a tagged Connections post from today isn't safe to reveal to
// everyone until 3am tomorrow, a tagged AM Phrazle post until 3pm today,
// and a tagged PM Phrazle post until 3am tomorrow.
export function getTaggedPeriodGraceEnd(game, date, period) {
  const [y, m, d] = date.split('-').map(Number);
  let nextPeriodStart;
  if (game === 'phrazle' && period === 'AM') {
    nextPeriodStart = new Date(y, m - 1, d, 12, 0, 0, 0); // PM, same day
  } else {
    nextPeriodStart = new Date(y, m - 1, d + 1, 0, 0, 0, 0); // next calendar day
  }
  return new Date(nextPeriodStart.getTime() + GRACE_PERIOD_MS);
}

export function isTaggedPeriodGraceExpired(game, date, period, now = new Date()) {
  return now.getTime() >= getTaggedPeriodGraceEnd(game, date, period).getTime();
}

// e.g. "Wordle, Connections, PM Phrazle, Quordle and Octordle" - Phrazle
// specifically gets its AM/PM prefix since the game name alone doesn't
// say which of its two daily periods was tagged.
export function describeSpoilerGames(tags) {
  const names = tags.map((t) => {
    if (t.game === 'phrazle') return `${t.period === 'AM' ? 'AM' : 'PM'} Phrazle`;
    return GAME_DISPLAY_NAMES[t.game] || t.game;
  });
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
