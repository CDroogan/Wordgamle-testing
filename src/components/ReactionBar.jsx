import React, { useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { FaRegSmile } from 'react-icons/fa';

// Shared by Group Chat and the GameFeed: any number of people can each
// leave their own reaction (one active emoji per person) on the same
// message/post. Shows one pill per distinct emoji with a count, and
// tapping a pill shows who left it - matching Facebook/Instagram.
function groupReactions(reactions) {
  if (!reactions || reactions.length === 0) return [];
  const byEmoji = {};
  reactions.forEach((r) => {
    if (!byEmoji[r.emoji]) byEmoji[r.emoji] = [];
    byEmoji[r.emoji].push(r);
  });
  return Object.entries(byEmoji).map(([emoji, users]) => ({ emoji, count: users.length, users }));
}

function ReactionBar({ reactions, onReact, canAddReaction = true, reactionIdPrefix }) {
  const [showPicker, setShowPicker] = useState(false);
  const [expandedEmoji, setExpandedEmoji] = useState(null);

  const grouped = groupReactions(reactions);

  return (
    <div className="d-flex align-items-center" style={{ gap: '6px' }}>
      {grouped.map(({ emoji, count, users }) => {
        const key = `${reactionIdPrefix}-${emoji}`;
        return (
          <div key={key} style={{ position: 'relative' }}>
            <div
              onClick={() => setExpandedEmoji(expandedEmoji === key ? null : key)}
              style={{
                background: '#ffffff',
                border: '1px solid #ddd',
                borderRadius: '10px',
                padding: '1px 5px',
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                cursor: 'pointer',
              }}
            >
              {emoji}{count > 1 && <span style={{ fontSize: '0.65rem', color: '#555' }}>{count}</span>}
            </div>
            {expandedEmoji === key && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  background: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  zIndex: 10,
                }}
              >
                {users.map((u) => u.username).join(', ')}
              </div>
            )}
          </div>
        );
      })}

      {canAddReaction && (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn-sm text-muted p-0"
            onClick={() => setShowPicker(!showPicker)}
          >
            <FaRegSmile size={16} />
          </button>
          {showPicker && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999,
              }}
              onClick={() => setShowPicker(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '15px',
                  width: '90%',
                  maxWidth: '350px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                }}
              >
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    onReact(emojiData.emoji);
                    setShowPicker(false);
                  }}
                  autoFocusSearch={false}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReactionBar;
