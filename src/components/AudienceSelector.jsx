import React, { useState, useRef, useEffect } from 'react';
import { FaGlobeAmericas, FaUserFriends, FaUser } from 'react-icons/fa';

// Shared by the post composer and the post Edit box - picks who a post
// is visible to. "friends" (GamleFriends) is the default everywhere a
// composer starts fresh, so a Gamler is never required to touch this
// before posting, same requirement as Spoiler Alert being opt-in.
export const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Gamlers', icon: FaGlobeAmericas },
  { value: 'friends', label: 'GamleFriends', icon: FaUserFriends },
  { value: 'self', label: 'Only Yourself', icon: FaUser },
];

export function getAudienceMeta(value) {
  return AUDIENCE_OPTIONS.find((o) => o.value === value) || AUDIENCE_OPTIONS[1];
}

// A button (not a checkbox) that opens a small menu of the three
// audience choices - mirrors SpoilerAlertPicker's click-to-open,
// click-outside-to-close pattern. Deliberately an icon-only circular
// button (not a labeled button like Spoiler Alert's) so it sits to the
// right of the post box without adding any vertical space.
function AudienceSelector({ value, onChange }) {
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

  const current = getAudienceMeta(value);
  const CurrentIcon = current.icon;

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        title={`Posting to: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--wordgamle-accent)',
          border: 'none',
          color: '#fff',
        }}
      >
        <CurrentIcon size={18} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '6px',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            zIndex: 30,
            width: '220px',
            padding: '8px',
          }}
        >
          <div className="fw-bold mb-2" style={{ fontSize: '0.8rem', color: 'var(--wordgamle-accent)' }}>
            Do you want to post to:
          </div>
          {AUDIENCE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className="btn btn-sm w-100 text-start d-flex align-items-center gap-2 mb-1"
                style={isSelected ? { background: 'var(--wordgamle-accent)', color: '#fff' } : {}}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                <Icon /> {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AudienceSelector;
