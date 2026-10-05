import React, { useState, useRef, useEffect } from 'react';
import { getSpoilerGameOptions } from '../utils/gracePeriod';

// A button (not a checkbox) that opens a multi-select checklist of every
// game's own current period - picking one or more tags this post/comment
// so other Gamlers who haven't played those specific periods yet get a
// Placeholder Post instead of the real content. Shared by the post
// composer and the comment box.
function SpoilerAlertPicker({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Computed fresh each time the dropdown opens, so the game numbers/
  // dates it shows are always current - not stale from whenever the
  // composer first mounted.
  const options = open ? getSpoilerGameOptions() : [];

  const isChecked = (opt) => selected.some((s) => s.game === opt.game && s.period === opt.period);

  const toggle = (opt) => {
    if (isChecked(opt)) {
      onChange(selected.filter((s) => !(s.game === opt.game && s.period === opt.period)));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className={`btn btn-sm ${selected.length > 0 ? 'text-white' : 'btn-outline-secondary'}`}
        style={selected.length > 0 ? { background: '#6f42c1', borderColor: '#6f42c1' } : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        Does your post contain a Spoiler?{selected.length > 0 ? ` (${selected.length})` : ''}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            zIndex: 30,
            width: '300px',
            padding: '12px',
            marginBottom: '6px',
          }}
        >
          <div className="fw-bold mb-1" style={{ color: '#6f42c1' }}>Spoiler Alert!</div>
          <div className="text-muted mb-2" style={{ fontSize: '0.75rem' }}>
            If you plan to post something that will include a hint to a current game's answer, choose the appropriate game(s) and those who haven't played yet won't see your post until they play.
          </div>
          {options.map((opt) => (
            <label
              key={`${opt.game}-${opt.period || ''}`}
              className="d-flex align-items-center gap-2 mb-1"
              style={{ fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <input type="checkbox" checked={isChecked(opt)} onChange={() => toggle(opt)} />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default SpoilerAlertPicker;
