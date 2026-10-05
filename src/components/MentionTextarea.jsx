import React, { useState, useEffect, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import Axios from 'axios';
import { MENTION_MARK, findActiveWord, renderMentionsPreview } from '../utils/mentions';

// A plain textarea plus a mention autocomplete dropdown - shared by
// the GameFeed (post composer and comments) and Group Chat, so both
// work identically. No "@" or other trigger character - typing any
// part of a Gamler's name or GamleName surfaces them above; picking
// one confirms the mention (notifies them, renders blue once posted);
// ignoring the dropdown and continuing to type leaves it as plain text
// with no mention at all.
function MentionTextarea({ value, onChange, placeholder, minRows, maxRows, baseURL, className, showPreview = true }) {
  const textareaRef = useRef(null);
  const wrapperRef = useRef(null);
  const [activeWord, setActiveWord] = useState(null); // { start, end, query }
  const [suggestions, setSuggestions] = useState([]);
  const [backdropBox, setBackdropBox] = useState(null); // {top, left, width, height}

  const handleChange = (e) => {
    const newText = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newText);
    setActiveWord(findActiveWord(newText, cursorPos));
  };

  useEffect(() => {
    if (!activeWord || activeWord.query.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await Axios.get(`${baseURL}/user/search-users.php`, { params: { q: activeWord.query } });
        if (!cancelled && res.data.success) setSuggestions(res.data.users);
      } catch (err) {
        // Autocomplete failing silently is fine - it's a convenience,
        // not something that should block typing a normal word.
      }
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWord?.query, baseURL]);

  const selectMention = (selectedUsername) => {
    if (!activeWord) return;
    const before = value.slice(0, activeWord.start);
    const after = value.slice(activeWord.end);
    const inserted = `${MENTION_MARK}${selectedUsername}${MENTION_MARK} `;
    const newText = `${before}${inserted}${after}`;
    onChange(newText);
    setActiveWord(null);
    setSuggestions([]);
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + inserted.length;
        textareaRef.current.setSelectionRange(pos, pos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Only switch into the overlay rendering once there's an actual
  // confirmed mention to show - the common case (no mention yet) stays
  // a perfectly normal, opaque textarea with zero extra risk.
  const hasConfirmedMention = showPreview && value.includes(MENTION_MARK);
  const backdropRef = useRef(null);
  const boxClassName = className || 'form-control';

  // Rather than trying to predict how the surrounding layout (a plain
  // block, a flex row next to a button, a narrower column, etc.) will
  // size this wrapper - which turned out to differ in ways CSS alone
  // kept guessing wrong - this measures the real textarea's actual
  // on-screen box directly and sizes the backdrop to match exactly,
  // so it's correct regardless of whatever layout it's dropped into.
  useEffect(() => {
    if (!hasConfirmedMention) {
      setBackdropBox(null);
      return;
    }
    const textareaEl = textareaRef.current;
    const wrapperEl = wrapperRef.current;
    if (!textareaEl || !wrapperEl) return;

    const updateBox = () => {
      const taRect = textareaEl.getBoundingClientRect();
      const wrapRect = wrapperEl.getBoundingClientRect();
      setBackdropBox({
        top: taRect.top - wrapRect.top,
        left: taRect.left - wrapRect.left,
        width: taRect.width,
        height: taRect.height,
      });
    };

    updateBox();
    const resizeObserver = new ResizeObserver(updateBox);
    resizeObserver.observe(textareaEl);
    window.addEventListener('resize', updateBox);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateBox);
    };
  }, [hasConfirmedMention]);

  return (
    // textAlign: 'left' guards against pages that wrap their whole
    // layout in a centered-text container (e.g. Group Page's
    // <Container className="text-center">) - that cascades all the way
    // down into a plain textarea's own text, and normal typing mostly
    // hides it, but it's very likely what broke the caret/backdrop
    // alignment once this box's text started being styled specially.
    <div ref={wrapperRef} style={{ position: 'relative', flex: 1, minWidth: 0, textAlign: 'left' }}>
      {hasConfirmedMention && backdropBox && (
        <div
          ref={backdropRef}
          aria-hidden="true"
          className={boxClassName}
          style={{
            position: 'absolute',
            top: backdropBox.top,
            left: backdropBox.left,
            width: backdropBox.width,
            height: backdropBox.height,
            boxSizing: 'border-box',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            overflow: 'hidden',
            pointerEvents: 'none',
            background: 'transparent',
            borderColor: 'transparent',
          }}
        >
          {renderMentionsPreview(value)}
        </div>
      )}
      <TextareaAutosize
        ref={textareaRef}
        minRows={minRows}
        maxRows={maxRows}
        value={value}
        onChange={handleChange}
        onScroll={(e) => { if (backdropRef.current) backdropRef.current.scrollTop = e.target.scrollTop; }}
        placeholder={placeholder}
        className={boxClassName}
        style={hasConfirmedMention ? { position: 'relative', background: 'transparent', color: 'transparent', caretColor: 'var(--wordgamle-accent)' } : undefined}
      />
      {activeWord && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            zIndex: 20,
            maxHeight: '180px',
            overflowY: 'auto',
          }}
        >
          <div className="text-muted px-2 pt-1" style={{ fontSize: '0.7rem' }}>
            Tap a name to mention them:
          </div>
          {suggestions.map((u) => (
            <div
              key={u.id}
              onClick={() => selectMention(u.username)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', cursor: 'pointer' }}
            >
              <img
                src={u.avatar ? `${baseURL}/user/uploads/${u.avatar}` : `${baseURL}/user/uploads/default_avatar.png`}
                alt=""
                style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <span>
                <span className="home-popup-link">{u.username}</span>
                {(u.first_name || u.last_name) && (
                  <span className="text-muted ms-1" style={{ fontSize: '0.75rem' }}>
                    ({u.first_name} {u.last_name})
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MentionTextarea;
