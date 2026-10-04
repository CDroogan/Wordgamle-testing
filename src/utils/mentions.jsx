import React from 'react';

// Shared by the GameFeed and Group Chat - both use the exact same
// mention mechanism. No "@" or other visible trigger character (the
// site doesn't use that symbol anywhere else): typing any part of a
// Gamler's GamleName, first name, or last name surfaces matches; only
// a name actually picked from that dropdown becomes a real, notified
// mention. A confirmed mention is wrapped in a pair of invisible
// U+2060 WORD JOINER characters so rendering (and the backend, see
// gamefeed/_mentions.php) can tell it apart from someone just typing a
// name that happens to match a real Gamler - which stays plain text,
// un-linked, with no notification.
export const MENTION_MARK = '⁠';
export const MENTION_PATTERN = new RegExp(`${MENTION_MARK}([^${MENTION_MARK}]+)${MENTION_MARK}`, 'g');

// Finds the plain word (letters only, no "@" needed) the cursor is
// currently sitting at the end of, e.g. typing "...hi Cass" with the
// cursor at the end returns { start, end: cursor, query: "Cass" }.
export function findActiveWord(text, cursorPos) {
  const uptoCursor = text.slice(0, cursorPos);
  const match = uptoCursor.match(/[A-Za-z'’-]+$/);
  if (!match) return null;
  const word = match[0];
  return { start: cursorPos - word.length, end: cursorPos, query: word };
}

// Turns a CONFIRMED mention into a clickable, blue span - same styling
// as the other clickable phrases on the homepage. Plain text that
// merely happens to match someone's name, but was never picked from
// the dropdown, is left as ordinary text.
export function renderWithMentions(text, onMentionClick) {
  const parts = text.split(MENTION_PATTERN);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <button
          key={i}
          type="button"
          className="home-popup-link"
          onClick={(e) => { e.stopPropagation(); onMentionClick(part); }}
        >
          {part}
        </button>
      );
    }
    return part;
  });
}

// Non-interactive version of the same rendering, used for the
// "backdrop" that shows a confirmed mention in blue while still
// composing - a static span, not a live-tracked cursor position, so
// it doesn't carry the fragility of trying to highlight text that's
// still actively being typed.
export function renderMentionsPreview(text) {
  const parts = text.split(MENTION_PATTERN);
  return parts.map((part, i) => (
    i % 2 === 1
      ? <span key={i} style={{ color: '#0d6efd', textDecoration: 'underline' }}>{part}</span>
      : <React.Fragment key={i}>{part}</React.Fragment>
  ));
}
