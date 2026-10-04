import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Form } from 'react-bootstrap';
import Axios from 'axios';
import dayjs from 'dayjs';
import ReactionBar from './ReactionBar';

// The GameFeed: a global, chronological feed any Gamler can post to and
// see, completely separate from Groups. Posting mirrors the same
// copy/paste flow already used for personal stats - the pasted text is
// stored and shown verbatim (it already contains the real score-grid
// characters), not re-parsed into a custom grid component.
function GameFeed({ userId, username, avatar, baseURL }) {
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pastedResult, setPastedResult] = useState('');
  const [expandedComments, setExpandedComments] = useState({}); // postId -> comments[]
  const [commentDrafts, setCommentDrafts] = useState({}); // postId -> text
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

  const handlePasteResult = (event) => {
    event.preventDefault();
    setPastedResult(event.clipboardData.getData('Text'));
  };

  const handleSubmitPost = async (event) => {
    event.preventDefault();
    if (!caption.trim() && !pastedResult.trim()) return;

    try {
      const res = await Axios.post(`${baseURL}/gamefeed/create-post.php`, {
        user_id: userId,
        caption: caption.trim(),
        game_result_text: pastedResult.trim(),
      });
      if (res.data.success) {
        setCaption('');
        setPastedResult('');
        setShowPasteBox(false);
        fetchFeed();
      }
    } catch (err) {
      console.error('Failed to post to GameFeed:', err);
    }
  };

  const handleReact = async (postId, emoji) => {
    try {
      await Axios.post(`${baseURL}/gamefeed/react-post.php`, { post_id: postId, user_id: userId, emoji });
      fetchFeed();
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  const toggleComments = async (postId) => {
    if (expandedComments[postId]) {
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
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const handleAddComment = async (postId) => {
    const text = (commentDrafts[postId] || '').trim();
    if (!text) return;
    try {
      const res = await Axios.post(`${baseURL}/gamefeed/add-comment.php`, { post_id: postId, user_id: userId, text });
      if (res.data.success) {
        setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
        const commentsRes = await Axios.get(`${baseURL}/gamefeed/get-comments.php`, { params: { post_id: postId } });
        if (commentsRes.data.success) {
          setExpandedComments((prev) => ({ ...prev, [postId]: commentsRes.data.comments }));
        }
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p)));
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  return (
    <div>
      {/* Post composer */}
      <Form onSubmit={handleSubmitPost} className="border rounded p-3 mb-4">
        <Form.Control
          as="textarea"
          rows={2}
          placeholder="Share something with other Gamlers..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="mb-2"
        />
        {!showPasteBox ? (
          <Button variant="outline-primary" size="sm" className="mb-2" onClick={() => setShowPasteBox(true)}>
            + Attach a game result
          </Button>
        ) : (
          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Paste your game result below</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={pastedResult}
              onChange={() => {}}
              onPaste={handlePasteResult}
              placeholder="Paste here..."
            />
          </Form.Group>
        )}
        <div className="text-end">
          <Button type="submit" variant="primary">Post</Button>
        </div>
      </Form>

      {/* Feed */}
      {posts.map((post) => (
        <div key={post.id} className="border rounded p-3 mb-3">
          <div className="d-flex align-items-center mb-2">
            <img
              src={post.avatar ? `${baseURL}/user/uploads/${post.avatar}` : `${baseURL}/user/uploads/default_avatar.png`}
              alt="avatar"
              className="rounded-circle me-2"
              style={{ width: '32px', height: '32px', objectFit: 'cover', border: '2px solid #0d6efd' }}
            />
            <div>
              <div className="fw-bold">{post.username}</div>
              <div className="text-muted" style={{ fontSize: '0.7rem' }}>{dayjs(post.created_at).format('MMM D, h:mm A')}</div>
            </div>
          </div>

          {post.caption && <div className="mb-2">{post.caption}</div>}

          {post.game_result_text && (
            <div
              className="border rounded p-2 mb-2"
              style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', background: '#fafafa' }}
            >
              {post.game_result_text}
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
                <div key={c.id} className="mb-2">
                  <span className="fw-bold me-1">{c.username}</span>
                  <span>{c.text}</span>
                </div>
              ))}
              <Form.Group className="d-flex gap-2">
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Write a comment..."
                  value={commentDrafts[post.id] || ''}
                  onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(post.id); } }}
                />
                <Button size="sm" onClick={() => handleAddComment(post.id)}>Send</Button>
              </Form.Group>
            </div>
          )}
        </div>
      ))}

      {posts.length === 0 && !loading && (
        <p className="text-center text-muted">No posts yet - be the first to share something!</p>
      )}

      <div ref={sentinelRef} />
    </div>
  );
}

export default GameFeed;
