import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button, Form } from 'react-bootstrap';
import Axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { FaImage, FaTimes } from 'react-icons/fa';
import ReactionBar from './ReactionBar';
import MemberProfile from '../constant/Models/MemberProfile';
import MentionTextarea from './MentionTextarea';
import SpoilerAlertPicker from './SpoilerAlertPicker';
import { renderWithMentions } from '../utils/mentions';
import { GAME_DISPLAY_NAMES, GAME_PLAY_URLS, getTaggedPeriodGraceEnd, describeSpoilerGameReferences } from '../utils/gracePeriod';
import { markPastePending } from '../utils/pendingPaste';

dayjs.extend(utc);
dayjs.extend(timezone);

// Posts/comments are stored as a true UTC instant, converted here to
// whichever timezone this browser is actually in - so the same post
// shows the correct local time for every Gamler, not just whoever
// happens to share the server's own clock.
const viewerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const formatLocalTime = (utcString) => dayjs.utc(utcString).tz(viewerTimezone).format('MMM D, h:mm A');

// Sent alongside every feed/post/comment read so the backend can gate
// Spoiler Alert posts against this viewer's own play history and own
// local clock - the same "a request carries its own timeZone" approach
// already used by every score submission.
function buildViewerParams(userId) {
  return {
    viewer_id: userId || 0,
    viewer_tz: viewerTimezone,
    viewer_now: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
  };
}

// A locked Spoiler Alert post/comment shows its original post time (the
// only timestamp there is to show before a viewer has unlocked it). Once
// unlocked, the displayed time instead reflects why it unlocked: the
// later of the original post time and this viewer's own moment of
// playing (so a viewer who plays after the post was made sees it land in
// their feed as of when they actually unlocked it, not backdated to
// before they could have seen it) - or, for a viewer who never plays, the
// moment the last tagged game's grace window closed for everyone.
function computeSpoilerDisplayTime(item) {
  if (!Array.isArray(item.spoiler_games) || item.spoiler_games.length === 0 || item.is_locked) {
    return formatLocalTime(item.created_at);
  }
  if (item.viewer_unlock_time) {
    const postMs = dayjs.utc(item.created_at).valueOf();
    const unlockMs = dayjs.utc(item.viewer_unlock_time).valueOf();
    return formatLocalTime(unlockMs > postMs ? item.viewer_unlock_time : item.created_at);
  }
  const graceEndTimes = item.spoiler_games.map((t) => getTaggedPeriodGraceEnd(t.game, t.date, t.period).getTime());
  return dayjs(Math.max(...graceEndTimes)).format('MMM D, h:mm A');
}

// Purple circled "S" badge marking a Spoiler Alert post/comment - shown
// in the same spot (sized and vertically aligned to match the author's
// own avatar circle) whether the viewer is looking at the real content
// or still at its Placeholder Post. Clicking it opens a small popup
// explaining what it means and exactly which game(s) gate it.
function SpoilerBadge({ item, size = 32, top = '1rem' }) {
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

  const gameRefs = describeSpoilerGameReferences(item.spoiler_games);

  return (
    <div ref={containerRef} style={{ position: 'absolute', top, right: '1rem', zIndex: 10 }}>
      <div
        role="button"
        title="Spoiler Alert"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '2px solid #6f42c1',
          background: '#fff',
          color: '#6f42c1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: size * 0.5,
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        S
      </div>
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
            width: '260px',
            padding: '12px',
            fontWeight: 'normal',
            textAlign: 'left',
          }}
        >
          <div className="fw-bold mb-1" style={{ color: '#6f42c1' }}>Spoiler Alert!</div>
          <div style={{ fontSize: '0.85rem' }}>
            {item.is_locked
              ? <>You'll see <strong>{item.username}</strong>'s post when you play {gameRefs}.</>
              : <>This post is only visible to those who have already played {gameRefs}.</>}
          </div>
        </div>
      )}
    </div>
  );
}

// The teaser shown instead of a locked post/comment's real content - the
// tagged game name(s) link straight out to that game's real site (same
// destination, and same "land back on the Enter Result box" behavior,
// as that game's own "Play" button), and the author's name opens their
// profile, both styled like the existing mention links.
function SpoilerPlaceholderBody({ item, navigate, onAuthorClick }) {
  const tags = item.spoiler_games;
  const parts = [];
  tags.forEach((t, idx) => {
    if (idx > 0) {
      parts.push(<span key={`sep-${idx}`}>{idx === tags.length - 1 ? ' and ' : ', '}</span>);
    }
    const label = t.game === 'phrazle' ? `${t.period === 'AM' ? 'AM' : 'PM'} Phrazle` : (GAME_DISPLAY_NAMES[t.game] || t.game);
    parts.push(
      <span
        key={`${t.game}-${t.period || ''}`}
        className="home-popup-link"
        style={{ cursor: 'pointer' }}
        onClick={() => {
          // Same trick that game's own "Play" button uses: flag that a
          // paste is pending before that game's page mounts, so it comes
          // up already showing its Enter Result box, exactly as if the
          // Gamler had clicked Play from that page directly.
          markPastePending(t.game);
          window.open(GAME_PLAY_URLS[t.game], '_blank');
          navigate(`/${t.game}`);
        }}
      >
        {label}
      </span>
    );
  });

  return (
    <div className="fst-italic">
      Play {parts} to see what{' '}
      <span className="home-popup-link" style={{ cursor: 'pointer' }} onClick={() => onAuthorClick(item.username)}>
        {item.username}
      </span>{' '}
      had to say about today's game!
    </div>
  );
}

// Shrinks a photo on the Gamler's own device before it ever uploads -
// a straight-from-the-phone photo can be 4000x3000+ and several MB,
// which is far more than a feed thumbnail needs. Animated GIFs are
// left untouched (a canvas can only capture one frame, which would
// kill the animation); anything already small enough is also left as-
// is. Falls back to the original file if anything about this fails,
// so a photo can never fail to post just because compression didn't
// work on a particular device/browser.
async function compressImage(file, maxDimension = 1600, quality = 0.8) {
  if (!file || !file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (width <= maxDimension && height <= maxDimension) {
      bitmap.close?.();
      return file;
    }

    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch (err) {
    return file;
  }
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

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      onChange(null);
      return;
    }
    const compressed = await compressImage(file);
    onChange(compressed);
  };

  return (
    <div className="d-flex align-items-center gap-2 mb-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
      <button type="button" className="btn btn-sm btn-outline-secondary text-start" onClick={() => inputRef.current?.click()}>
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
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [postSpoilerGames, setPostSpoilerGames] = useState([]);
  const [expandedComments, setExpandedComments] = useState({}); // postId -> comments[]
  const [commentDrafts, setCommentDrafts] = useState({}); // postId -> text
  const [commentImages, setCommentImages] = useState({}); // postId -> File
  const [commentSpoilerGames, setCommentSpoilerGames] = useState({}); // postId -> tags[]
  const [selectedMember, setSelectedMember] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const sentinelRef = useRef(null);

  // Spoiler Alert makes the feed's order viewer-specific (a tagged post
  // can sit later in one Gamler's feed than in another's), so the
  // backend sorts and pages the whole thing itself - this just asks for
  // "the next 10 after however many I've already got," by position
  // (offset), not by a post id cursor.
  const fetchFeed = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const params = { ...buildViewerParams(userId), offset };
      const res = await Axios.get(`${baseURL}/gamefeed/get-feed.php`, { params });
      if (res.data.success) {
        setPosts((prev) => (offset > 0 ? [...prev, ...res.data.posts] : res.data.posts));
        setHasMore(res.data.has_more);
      }
    } catch (err) {
      console.error('Failed to load GameFeed:', err);
    } finally {
      setLoading(false);
    }
  }, [baseURL, userId]);

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
        const res = await Axios.get(`${baseURL}/gamefeed/get-post.php`, { params: { post_id: focusPostId, ...buildViewerParams(userId) } });
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
  }, [focusPostId, baseURL, userId]);

  // Infinite scroll: load the next page once the sentinel at the bottom
  // of the list comes into view.
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading && posts.length > 0) {
        fetchFeed(posts.length);
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
      if (postSpoilerGames.length > 0) formData.append('spoiler_games', JSON.stringify(postSpoilerGames));

      const res = await Axios.post(`${baseURL}/gamefeed/create-post.php`, formData);
      if (res.data.success) {
        setPostText('');
        setPostImage(null);
        setPostSpoilerGames([]);
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
      const res = await Axios.get(`${baseURL}/gamefeed/get-comments.php`, { params: { post_id: postId, ...buildViewerParams(userId) } });
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
      const spoilerTags = commentSpoilerGames[postId] || [];
      if (spoilerTags.length > 0) formData.append('spoiler_games', JSON.stringify(spoilerTags));

      const res = await Axios.post(`${baseURL}/gamefeed/add-comment.php`, formData);
      if (res.data.success) {
        setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
        setCommentImages((prev) => ({ ...prev, [postId]: null }));
        setCommentSpoilerGames((prev) => ({ ...prev, [postId]: [] }));
        const commentsRes = await Axios.get(`${baseURL}/gamefeed/get-comments.php`, { params: { post_id: postId, ...buildViewerParams(userId) } });
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
    <div className="text-start" style={{ background: '#330072', borderRadius: '1rem', padding: '1rem' }}>
      {/* Post composer - a Gamler can type freely, paste a game result
          (inserted at the cursor, same as any normal paste), attach a
          photo, or mix all of it in one post. */}
      <Form onSubmit={handleSubmitPost} className="border rounded p-3 mb-4 bg-white">
        <div className="mb-2">
          <MentionTextarea
            value={postText}
            onChange={setPostText}
            minRows={2}
            maxRows={12}
            placeholder="Share something with other Gamlers..."
            baseURL={baseURL}
          />
        </div>
        <div className="d-flex align-items-start gap-2 mb-2">
          <ImagePicker image={postImage} onChange={setPostImage} />
          <SpoilerAlertPicker selected={postSpoilerGames} onChange={setPostSpoilerGames} />
        </div>
        <div className="text-end">
          <Button type="submit" variant="primary">Post</Button>
        </div>
      </Form>

      {/* Feed */}
      {posts.map((post) => {
        const isSpoiler = Array.isArray(post.spoiler_games) && post.spoiler_games.length > 0;
        const isLocked = isSpoiler && post.is_locked;
        return (
        <div key={post.id} id={`gamefeed-post-${post.id}`} className="border rounded p-3 mb-3 bg-white" style={{ position: 'relative' }}>
          {isSpoiler && <SpoilerBadge item={post} size={32} top="1rem" />}
          <div className="d-flex align-items-center mb-2" style={{ cursor: 'pointer' }} onClick={() => handleMentionClick(post.username)}>
            <img
              src={post.avatar ? `${baseURL}/user/uploads/${post.avatar}` : `${baseURL}/user/uploads/default_avatar.png`}
              alt="avatar"
              className="rounded-circle me-2"
              style={{ width: '32px', height: '32px', objectFit: 'cover', border: '2px solid #0d6efd' }}
            />
            <div>
              <div className="fw-bold">{post.username}</div>
              <div className="text-muted" style={{ fontSize: '0.7rem' }}>{computeSpoilerDisplayTime(post)}</div>
            </div>
          </div>

          {isLocked ? (
            <div className="mb-2">
              <SpoilerPlaceholderBody item={post} navigate={navigate} onAuthorClick={handleMentionClick} />
            </div>
          ) : (
            <>
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
            </>
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
              {expandedComments[post.id].map((c) => {
                const isCommentSpoiler = Array.isArray(c.spoiler_games) && c.spoiler_games.length > 0;
                const isCommentLocked = isCommentSpoiler && c.is_locked;
                return (
                <div key={c.id} className="d-flex mb-2" style={{ position: 'relative' }}>
                  {isCommentSpoiler && <SpoilerBadge item={c} size={24} top="0" />}
                  <img
                    src={c.avatar ? `${baseURL}/user/uploads/${c.avatar}` : `${baseURL}/user/uploads/default_avatar.png`}
                    alt="avatar"
                    className="rounded-circle me-2 flex-shrink-0"
                    style={{ width: '24px', height: '24px', objectFit: 'cover', border: '2px solid #0d6efd', cursor: 'pointer' }}
                    onClick={() => handleMentionClick(c.username)}
                  />
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    <span className="fw-bold me-1" style={{ cursor: 'pointer' }} onClick={() => handleMentionClick(c.username)}>{c.username}</span>
                    {isCommentLocked ? (
                      <SpoilerPlaceholderBody item={c} navigate={navigate} onAuthorClick={handleMentionClick} />
                    ) : (
                      <>
                        <span>{renderWithMentions(c.text, handleMentionClick)}</span>
                        {c.image && (
                          <div className="mt-1">
                            <img src={`${baseURL}/gamefeed/uploads/${c.image}`} alt="" className="img-fluid rounded" style={{ maxHeight: '200px' }} />
                          </div>
                        )}
                      </>
                    )}
                    <div className="text-muted" style={{ fontSize: '0.65rem' }}>{computeSpoilerDisplayTime(c)}</div>
                  </div>
                </div>
                );
              })}
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
              <div className="d-flex align-items-start gap-2">
                <ImagePicker
                  image={commentImages[post.id] || null}
                  onChange={(file) => setCommentImages((prev) => ({ ...prev, [post.id]: file }))}
                />
                <SpoilerAlertPicker
                  selected={commentSpoilerGames[post.id] || []}
                  onChange={(tags) => setCommentSpoilerGames((prev) => ({ ...prev, [post.id]: tags }))}
                />
              </div>
            </div>
          )}
        </div>
        );
      })}

      {posts.length === 0 && !loading && (
        <p className="text-center text-white">No posts yet - be the first to share something!</p>
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
