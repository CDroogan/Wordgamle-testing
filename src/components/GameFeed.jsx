import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button, Form } from 'react-bootstrap';
import TextareaAutosize from 'react-textarea-autosize';
import Axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { toast } from 'react-toastify';
import { FaImage, FaTimes } from 'react-icons/fa';
import ReactionBar from './ReactionBar';
import MemberProfile from '../constant/Models/MemberProfile';

dayjs.extend(utc);
dayjs.extend(timezone);

// Posts/comments are stored as a true UTC instant, converted here to
// whichever timezone this browser is actually in - so the same post
// shows the correct local time for every Gamler, not just whoever
// happens to share the server's own clock.
const viewerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const formatLocalTime = (utcString) => dayjs.utc(utcString).tz(viewerTimezone).format('MMM D, h:mm A');

// Invisible in every browser/font - see _mentions.php on the backend
// for why a confirmed mention is wrapped in a pair of these instead of
// using a visible symbol like "@".
const MENTION_MARK = '⁠';
const MENTION_PATTERN = new RegExp(`${MENTION_MARK}([^${MENTION_MARK}]+)${MENTION_MARK}`, 'g');

// Finds the plain word (letters only, no "@" needed) the cursor is
// currently sitting at the end of, e.g. typing "...hi Cass" with the
// cursor at the end returns { start, end: cursor, query: "Cass" }.
function findActiveWord(text, cursorPos) {
  const uptoCursor = text.slice(0, cursorPos);
  const match = uptoCursor.match(/[A-Za-z'’-]+$/);
  if (!match) return null;
  const word = match[0];
  return { start: cursorPos - word.length, end: cursorPos, query: word };
}

// Turns a CONFIRMED mention (one actually picked from the autocomplete,
// marked with the invisible MENTION_MARK pair) into a clickable, blue
// span - same styling as the other clickable phrases on the homepage.
// Plain text that merely happens to match someone's name, but was never
// picked from the dropdown, is left as ordinary text.
function renderWithMentions(text, onMentionClick) {
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

// A plain textarea plus a mention autocomplete dropdown - shared by the
// post composer and every comment box so both work identically. No "@"
// or other trigger character - typing any part of a Gamler's name or
// GamleName surfaces them above; picking one confirms the mention
// (notifies them, renders blue once posted); ignoring the dropdown and
// continuing to type leaves it as plain text with no mention at all.
function MentionTextarea({ value, onChange, placeholder, minRows, maxRows, baseURL }) {
  const textareaRef = useRef(null);
  const [activeWord, setActiveWord] = useState(null); // { start, end, query }
  const [suggestions, setSuggestions] = useState([]);

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

  return (
    <div style={{ position: 'relative' }}>
      <TextareaAutosize
        ref={textareaRef}
        minRows={minRows}
        maxRows={maxRows}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="form-control"
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

// A small "add a photo" control: a button that opens the file picker,
// and once a file is chosen, a thumbnail preview with a way to remove
// it before posting.
function ImagePicker({ image, onChange }) {
  const inputRef = useRef(null);
  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  return (
    <div className="d-flex align-items-center gap-2 mb-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => inputRef.current?.click()}>
        <FaImage className="me-1" /> Add photo
      </button>
      {previewUrl && (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={previewUrl} alt="Preview" style={{ height: '48px', borderRadius: '6px' }} />
          <button
            type="button"
            className="btn btn-sm btn-danger"
            style={{ position: 'absolute', top: '-8px', right: '-8px', borderRadius: '50%', padding: '2px 6px' }}
            onClick={() => onChange(null)}
          >
            <FaTimes size={10} />
          </button>
        </div>
      )}
    </div>
  );
}

// The GameFeed: a global, chronological feed any Gamler can post to and
// see, completely separate from Groups. Posting mirrors the same
// copy/paste flow already used for personal stats - the pasted text is
// stored and shown verbatim (it already contains the real score-grid
// characters), not re-parsed into a custom grid component.
function GameFeed({ userId, baseURL, focusPostId }) {
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [expandedComments, setExpandedComments] = useState({}); // postId -> comments[]
  const [commentDrafts, setCommentDrafts] = useState({}); // postId -> text
  const [commentImages, setCommentImages] = useState({}); // postId -> File
  const [selectedMember, setSelectedMember] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const sentinelRef = useRef(null);

  const fetchFeed = useCallback(async (beforeId) => {
    setLoading(true);
    try {
      const params = beforeId ? { before_id: beforeId } : {};
      const res = await Axios.get(`${baseURL}/gamefeed/get-feed.php`, { params });
      if (res.data.success) {
        setPosts((prev) => (beforeId ? [...prev, ...res.data.posts] : res.data.posts));
        setHasMore(res.data.has_more);
      }
    } catch (err) {
      console.error('Failed to load GameFeed:', err);
    } finally {
      setLoading(false);
    }
  }, [baseURL]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Arriving from a mention notification - jump straight to that post
  // (even if the paginated feed hasn't loaded back that far yet) and
  // open its comments.
  useEffect(() => {
    if (!focusPostId) return;
    (async () => {
      try {
        const res = await Axios.get(`${baseURL}/gamefeed/get-post.php`, { params: { post_id: focusPostId } });
        if (res.data.success) {
          const post = res.data.post;
          setPosts((prev) => (prev.some((p) => p.id === post.id) ? prev : [post, ...prev]));
          setTimeout(() => {
            const el = document.getElementById(`gamefeed-post-${post.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
          toggleComments(post.id, true);
        }
      } catch (err) {
        console.error('Failed to load mentioned post:', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPostId, baseURL]);

  // Infinite scroll: load the next page once the sentinel at the bottom
  // of the list comes into view.
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading && posts.length > 0) {
        fetchFeed(posts[posts.length - 1].id);
      }
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchFeed, hasMore, loading, posts]);

  const handleMentionClick = async (clickedUsername) => {
    try {
      const res = await Axios.get(`${baseURL}/user/get-user-by-username.php`, { params: { username: clickedUsername } });
      if (res.data.success) {
        setSelectedMember(res.data.user);
        setShowProfile(true);
      } else {
        toast.error(res.data.error || 'Gamler not found.');
      }
    } catch (err) {
      toast.error('Could not load that profile.');
    }
  };

  const handleSubmitPost = async (event) => {
    event.preventDefault();
    if (!postText.trim() && !postImage) return;
    if (!userId) {
      toast.error("Couldn't tell who you are - try logging in again.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('content', postText.trim());
      if (postImage) formData.append('image', postImage);

      const res = await Axios.post(`${baseURL}/gamefeed/create-post.php`, formData);
      if (res.data.success) {
        setPostText('');
        setPostImage(null);
        fetchFeed();
      } else {
        toast.error(res.data.error || 'Something went wrong while posting.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post - please try again.');
    }
  };

  const handleReact = async (postId, emoji) => {
    try {
      const res = await Axios.post(`${baseURL}/gamefeed/react-post.php`, { post_id: postId, user_id: userId, emoji });
      if (res.data.success) {
        fetchFeed();
      } else {
        toast.error(res.data.error || 'Something went wrong while reacting.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to react - please try again.');
    }
  };

  const toggleComments = async (postId, forceOpen = false) => {
    if (expandedComments[postId] && !forceOpen) {
      setExpandedComments((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      return;
    }
    try {
      const res = await Axios.get(`${baseURL}/gamefeed/get-comments.php`, { params: { post_id: postId } });
      if (res.data.success) {
        setExpandedComments((prev) => ({ ...prev, [postId]: res.data.comments }));
      } else {
        toast.error(res.data.error || 'Could not load comments.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load comments - please try again.');
    }
  };

  const handleAddComment = async (postId) => {
    const text = (commentDrafts[postId] || '').trim();
    const image = commentImages[postId];
    if (!text && !image) return;
    if (!userId) {
      toast.error("Couldn't tell who you are - try logging in again.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append('post_id', postId);
      formData.append('user_id', userId);
      formData.append('text', text);
      if (image) formData.append('image', image);

      const res = await Axios.post(`${baseURL}/gamefeed/add-comment.php`, formData);
      if (res.data.success) {
        setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
        setCommentImages((prev) => ({ ...prev, [postId]: null }));
        const commentsRes = await Axios.get(`${baseURL}/gamefeed/get-comments.php`, { params: { post_id: postId } });
        if (commentsRes.data.success) {
          setExpandedComments((prev) => ({ ...prev, [postId]: commentsRes.data.comments }));
        }
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p)));
      } else {
        toast.error(res.data.error || 'Something went wrong while commenting.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to comment - please try again.');
    }
  };

  return (
    <div className="text-start">
      {/* Post composer - a Gamler can type freely, paste a game result
          (inserted at the cursor, same as any normal paste), attach a
          photo, or mix all of it in one post. */}
      <Form onSubmit={handleSubmitPost} className="border rounded p-3 mb-4">
        <div className="mb-2">
          <MentionTextarea
            value={postText}
            onChange={setPostText}
            minRows={2}
            maxRows={12}
            placeholder="Share something with other Gamlers... (type a name to mention someone)"
            baseURL={baseURL}
          />
        </div>
        <ImagePicker image={postImage} onChange={setPostImage} />
        <div className="text-end">
          <Button type="submit" variant="primary">Post</Button>
        </div>
      </Form>

      {/* Feed */}
      {posts.map((post) => (
        <div key={post.id} id={`gamefeed-post-${post.id}`} className="border rounded p-3 mb-3">
          <div className="d-flex align-items-center mb-2">
            <img
              src={post.avatar ? `${baseURL}/user/uploads/${post.avatar}` : `${baseURL}/user/uploads/default_avatar.png`}
              alt="avatar"
              className="rounded-circle me-2"
              style={{ width: '32px', height: '32px', objectFit: 'cover', border: '2px solid #0d6efd' }}
            />
            <div>
              <div className="fw-bold">{post.username}</div>
              <div className="text-muted" style={{ fontSize: '0.7rem' }}>{formatLocalTime(post.created_at)}</div>
            </div>
          </div>

          {post.content && (
            <div className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>
              {renderWithMentions(post.content, handleMentionClick)}
            </div>
          )}

          {post.image && (
            <div className="mb-2">
              <img src={`${baseURL}/gamefeed/uploads/${post.image}`} alt="" className="img-fluid rounded" style={{ maxHeight: '400px' }} />
            </div>
          )}

          <ReactionBar
            reactions={post.reactions}
            reactionIdPrefix={`post-${post.id}`}
            canAddReaction={true}
            onReact={(emoji) => handleReact(post.id, emoji)}
          />

          <div className="mt-2">
            <button
              type="button"
              className="btn btn-sm text-muted p-0"
              onClick={() => toggleComments(post.id)}
            >
              💬 {post.comment_count > 0 ? `${post.comment_count} comment${post.comment_count === 1 ? '' : 's'}` : 'Comment'}
            </button>
          </div>

          {expandedComments[post.id] && (
            <div className="mt-2 ps-2 border-start">
              {expandedComments[post.id].map((c) => (
                <div key={c.id} className="d-flex mb-2">
                  <img
                    src={c.avatar ? `${baseURL}/user/uploads/${c.avatar}` : `${baseURL}/user/uploads/default_avatar.png`}
                    alt="avatar"
                    className="rounded-circle me-2 flex-shrink-0"
                    style={{ width: '24px', height: '24px', objectFit: 'cover', border: '2px solid #0d6efd' }}
                  />
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    <span className="fw-bold me-1">{c.username}</span>
                    <span>{renderWithMentions(c.text, handleMentionClick)}</span>
                    {c.image && (
                      <div className="mt-1">
                        <img src={`${baseURL}/gamefeed/uploads/${c.image}`} alt="" className="img-fluid rounded" style={{ maxHeight: '200px' }} />
                      </div>
                    )}
                    <div className="text-muted" style={{ fontSize: '0.65rem' }}>{formatLocalTime(c.created_at)}</div>
                  </div>
                </div>
              ))}
              <div className="d-flex gap-2 align-items-end">
                <MentionTextarea
                  value={commentDrafts[post.id] || ''}
                  onChange={(text) => setCommentDrafts((prev) => ({ ...prev, [post.id]: text }))}
                  minRows={1}
                  maxRows={8}
                  placeholder="Write a comment..."
                  baseURL={baseURL}
                />
                <Button size="sm" onClick={() => handleAddComment(post.id)}>Send</Button>
              </div>
              <ImagePicker
                image={commentImages[post.id] || null}
                onChange={(file) => setCommentImages((prev) => ({ ...prev, [post.id]: file }))}
              />
            </div>
          )}
        </div>
      ))}

      {posts.length === 0 && !loading && (
        <p className="text-center text-muted">No posts yet - be the first to share something!</p>
      )}

      <div ref={sentinelRef} />

      <MemberProfile
        show={showProfile}
        onHide={() => setShowProfile(false)}
        selectedMember={selectedMember}
        baseURL={baseURL}
      />
    </div>
  );
}

export default GameFeed;
