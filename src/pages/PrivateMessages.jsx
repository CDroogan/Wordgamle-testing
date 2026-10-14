import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Container, Row, Col, Form, Button, ListGroup, Modal, Badge } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import Axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { FaArrowLeft, FaTimes, FaPlus } from 'react-icons/fa';

dayjs.extend(utc);
dayjs.extend(timezone);

const viewerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const formatMessageTime = (utcString) => dayjs.utc(utcString).tz(viewerTimezone).format('MMM D, h:mm A');
const formatLastDate = (utcString) => dayjs.utc(utcString).tz(viewerTimezone).format('M/D/YY');

// "First Last (username)" per participant, comma-joined - matches the
// mockup exactly, including for a group DM with 3+ people.
const participantLabel = (p) => `${p.first_name} ${p.last_name} (${p.username})`;
const displayName = (participants) => participants.map(participantLabel).join(', ');

const avatarUrlFor = (baseURL, avatar) => (avatar ? `${baseURL}/user/uploads/${avatar}` : `${baseURL}/user/uploads/default_avatar.png`);

// Instagram-style overlapping avatars for a group conversation - shows
// up to 3 actual photos, with a "+N" circle for anyone beyond that
// rather than letting the stack grow unbounded.
function StackedAvatars({ participants, baseURL, size = 32 }) {
  const shown = participants.slice(0, 3);
  const extra = participants.length - shown.length;
  const overlap = size * 0.4;

  return (
    <div className="d-flex align-items-center flex-shrink-0" style={{ width: size + (shown.length - 1 + (extra > 0 ? 1 : 0)) * (size - overlap) }}>
      {shown.map((p, idx) => (
        <img
          key={p.id}
          src={avatarUrlFor(baseURL, p.avatar)}
          alt=""
          className="rounded-circle"
          style={{
            width: size,
            height: size,
            objectFit: 'cover',
            border: '2px solid #fff',
            marginLeft: idx === 0 ? 0 : -overlap,
            position: 'relative',
            zIndex: shown.length - idx,
          }}
        />
      ))}
      {extra > 0 && (
        <div
          className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
          style={{ width: size, height: size, fontSize: size * 0.35, marginLeft: -overlap, border: '2px solid #fff' }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

// Membership is fixed once a conversation starts (no adding/removing
// people later), so "does a conversation with exactly these people
// already exist" only ever needs to check the OTHER participants - the
// current viewer is implicitly always in every conversation they can
// see.
function findExistingConversationId(conversations, otherParticipantIds) {
  const targetKey = [...otherParticipantIds].map(Number).sort((a, b) => a - b).join(',');
  const match = conversations.find((c) => {
    const key = c.participants.map((p) => p.id).sort((a, b) => a - b).join(',');
    return key === targetKey;
  });
  return match ? match.conversation_id : null;
}

// Shared by the "New Message" modal and the "add more people" control
// on a not-yet-started thread - picking a result adds them as a
// removable chip rather than acting immediately, letting a Gamler build
// up a group DM's membership before committing. Chips show just the
// GamleName (not the full name) to save space - the Gamler already saw
// the full name in the results list before picking them.
function RecipientPicker({ baseURL, userId, selected, onChange, placeholder }) {
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (searchInput.trim() === '') {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await Axios.get(`${baseURL}/messages/search-users.php`, { params: { user_id: userId, q: searchInput.trim() } });
        if (res.data.status === 'success') {
          setSearchResults(res.data.users || []);
        }
      } catch (err) {
        console.error('Error searching Gamlers:', err);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, baseURL, userId]);

  const addRecipient = (user) => {
    if (selected.some((s) => s.id === user.id)) return;
    onChange([...selected, user]);
    setSearchInput('');
    setSearchResults([]);
  };

  const removeRecipient = (id) => {
    onChange(selected.filter((s) => s.id !== id));
  };

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-2 d-flex flex-wrap gap-2">
          {selected.map((s) => (
            <Badge key={s.id} bg="secondary" className="d-flex align-items-center gap-1 p-2">
              {s.username}
              <FaTimes style={{ cursor: 'pointer' }} onClick={() => removeRecipient(s.id)} />
            </Badge>
          ))}
        </div>
      )}
      <Form.Control
        type="text"
        placeholder={placeholder}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />
      {searchInput.trim() !== '' && (
        <ListGroup className="mt-2">
          {searchResults.length === 0 ? (
            <ListGroup.Item className="text-muted">No Gamlers found</ListGroup.Item>
          ) : (
            searchResults
              .filter((u) => !selected.some((s) => s.id === u.id))
              .map((user) => (
                <ListGroup.Item key={user.id} action onClick={() => addRecipient(user)}>
                  {user.first_name} {user.last_name} ({user.username})
                </ListGroup.Item>
              ))
          )}
        </ListGroup>
      )}
    </div>
  );
}

function NewMessageModal({ show, onHide, baseURL, userId, onStart }) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (!show) {
      setSelected([]);
    }
  }, [show]);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>New Message</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <RecipientPicker
          baseURL={baseURL}
          userId={userId}
          selected={selected}
          onChange={setSelected}
          placeholder="Search Gamlers to add..."
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" disabled={selected.length === 0} onClick={() => onStart(selected)}>
          Start Conversation
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// Only ever opened on a thread that hasn't had its first message sent
// yet (membership locks in at that point) - seeded with whoever's
// already picked, so adding more is additive, not a restart.
function AddRecipientsModal({ show, onHide, baseURL, userId, initialSelected, onSave }) {
  const [selected, setSelected] = useState(initialSelected);

  useEffect(() => {
    if (show) setSelected(initialSelected);
  }, [show, initialSelected]);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add to Conversation</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <RecipientPicker
          baseURL={baseURL}
          userId={userId}
          selected={selected}
          onChange={setSelected}
          placeholder="Search Gamlers to add..."
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={() => { onSave(selected); onHide(); }}>Done</Button>
      </Modal.Footer>
    </Modal>
  );
}

function PrivateMessages() {
  const baseURL = import.meta.env.VITE_BASE_URL;
  const userId = JSON.parse(localStorage.getItem('auth'))?.id;
  const location = useLocation();

  const [conversations, setConversations] = useState([]);
  const [conversationSearch, setConversationSearch] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showAddRecipients, setShowAddRecipients] = useState(false);
  // thread.conversationId is null for a brand-new conversation that
  // hasn't had its first message sent yet - nothing is persisted until
  // that first send, same as the mockup's "never messaged before" case.
  // Membership can still be edited at this point (see the "+" button
  // below); once conversationId is set, it's fixed.
  const [thread, setThread] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await Axios.get(`${baseURL}/messages/get-conversations.php`, { params: { user_id: userId } });
      if (res.data.status === 'success') {
        setConversations(res.data.conversations || []);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  }, [baseURL, userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const openExistingConversation = useCallback(async (conversationId) => {
    try {
      const res = await Axios.get(`${baseURL}/messages/get-conversation.php`, { params: { user_id: userId, conversation_id: conversationId } });
      if (res.data.status === 'success') {
        setThread({ conversationId: res.data.conversation_id, participants: res.data.participants, messages: res.data.messages });
        await Axios.post(`${baseURL}/messages/mark-conversation-seen.php`, { user_id: userId, conversation_id: conversationId });
        fetchConversations();
      }
    } catch (err) {
      console.error('Error opening conversation:', err);
    }
  }, [baseURL, userId, fetchConversations]);

  // Arriving from the bell notification with ?conversation=<id> - jump
  // straight into that conversation, same approach GameFeed uses for
  // ?post=<id> from a mention notification.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetConversation = params.get('conversation');
    if (targetConversation) {
      openExistingConversation(targetConversation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [thread?.messages]);

  // Opens a thread with these other-participants, continuing an existing
  // conversation with that exact membership if one's already in the
  // list (so history isn't lost), otherwise a "pending" one with no
  // history yet - the first Send is what actually creates it.
  const openOrStartThread = (participants) => {
    const existingId = findExistingConversationId(conversations, participants.map((p) => p.id));
    if (existingId) {
      openExistingConversation(existingId);
      return;
    }
    setThread({ conversationId: null, participants, messages: [] });
  };

  const handleStartFromModal = (selected) => {
    setShowNewMessage(false);
    openOrStartThread(selected);
  };

  // Adding people to a still-pending thread can also land on an already-
  // existing conversation (if the resulting membership happens to match
  // one), same reasoning as starting fresh - reuse its real history
  // instead of sitting in an empty pending thread.
  const handleSaveAddedRecipients = (newParticipants) => {
    const existingId = findExistingConversationId(conversations, newParticipants.map((p) => p.id));
    if (existingId) {
      openExistingConversation(existingId);
      return;
    }
    setThread((prev) => ({ ...prev, participants: newParticipants }));
  };

  const handleSend = async () => {
    const text = draftText.trim();
    if (!text || !thread) return;
    setSending(true);
    try {
      const body = thread.conversationId
        ? { sender_id: userId, conversation_id: thread.conversationId, message: text }
        : { sender_id: userId, recipient_ids: thread.participants.map((p) => p.id), message: text };
      const res = await Axios.post(`${baseURL}/messages/send-message.php`, body);
      if (res.data.status === 'success') {
        setThread((prev) => ({
          ...prev,
          conversationId: res.data.conversation_id,
          messages: [...prev.messages, res.data.message_row],
        }));
        setDraftText('');
        fetchConversations();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const backToList = () => {
    setThread(null);
    setDraftText('');
    setConversationSearch('');
  };

  if (thread) {
    const isGroup = thread.participants.length > 1;
    return (
      <Container>
        <Row className="justify-content-center pt-4">
          <Col md={8} lg={6}>
            <div className="d-flex align-items-center mb-3">
              <Button variant="link" className="p-0 me-2 text-dark" onClick={backToList}>
                <FaArrowLeft size={18} />
              </Button>
              <StackedAvatars participants={thread.participants} baseURL={baseURL} size={36} />
              <div className="fw-bold ms-2 flex-grow-1">{displayName(thread.participants)}</div>
              {!thread.conversationId && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="rounded-circle d-flex align-items-center justify-content-center p-0 ms-2 flex-shrink-0"
                  style={{ width: '28px', height: '28px' }}
                  title="Add someone to this conversation"
                  onClick={() => setShowAddRecipients(true)}
                >
                  <FaPlus size={12} />
                </Button>
              )}
            </div>

            <div
              className="border rounded p-3 mb-2"
              style={{ height: '50vh', overflowY: 'auto', background: '#f8f9fa' }}
            >
              {thread.messages.length === 0 ? (
                <p className="text-muted text-center mt-3">
                  Send {thread.participants.map((p) => p.first_name).join(', ')} a message to start the conversation.
                </p>
              ) : (
                thread.messages.map((m) => {
                  const isMine = Number(m.sender_id) === Number(userId);
                  return (
                    <div key={m.id} className={`d-flex mb-2 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}>
                      <div style={{ maxWidth: '75%' }}>
                        {isGroup && !isMine && (
                          <div className="text-muted fw-bold" style={{ fontSize: '0.75rem' }}>{m.username}</div>
                        )}
                        <div
                          className="p-2 rounded"
                          style={{
                            background: isMine ? 'var(--wordgamle-accent)' : '#e9ecef',
                            color: isMine ? '#fff' : '#000',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {m.message}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.7rem', textAlign: isMine ? 'right' : 'left' }}>
                          {formatMessageTime(m.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <Form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="d-flex gap-2 align-items-end"
            >
              <Form.Control
                as="textarea"
                rows={3}
                placeholder={`Send ${thread.participants.map((p) => p.first_name).join(', ')} a message...`}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                disabled={sending}
              />
              <Button type="submit" variant="primary" disabled={sending || !draftText.trim()}>Send</Button>
            </Form>
          </Col>
        </Row>

        <AddRecipientsModal
          show={showAddRecipients}
          onHide={() => setShowAddRecipients(false)}
          baseURL={baseURL}
          userId={userId}
          initialSelected={thread.participants}
          onSave={handleSaveAddedRecipients}
        />
      </Container>
    );
  }

  const filteredConversations = conversationSearch.trim() === ''
    ? conversations
    : conversations.filter((c) =>
        c.participants.some((p) =>
          `${p.first_name} ${p.last_name} ${p.username}`.toLowerCase().includes(conversationSearch.trim().toLowerCase())
        )
      );

  return (
    <Container>
      <Row className="justify-content-center pt-4">
        <Col md={8} lg={6}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">Private Messages</h4>
            <Button size="sm" variant="primary" onClick={() => setShowNewMessage(true)}>New Message</Button>
          </div>

          <Form.Control
            type="text"
            placeholder="Search existing messages..."
            value={conversationSearch}
            onChange={(e) => setConversationSearch(e.target.value)}
            className="mb-3"
          />

          <h6 className="text-muted mb-2">Your conversations</h6>
          <ListGroup>
            {filteredConversations.length === 0 ? (
              <ListGroup.Item className="text-muted">
                {conversations.length === 0 ? 'No conversations yet - use New Message to start one!' : 'No matching conversations'}
              </ListGroup.Item>
            ) : (
              filteredConversations.map((c) => (
                <ListGroup.Item key={c.conversation_id} action onClick={() => openExistingConversation(c.conversation_id)} className="d-flex align-items-center">
                  <StackedAvatars participants={c.participants} baseURL={baseURL} size={32} />
                  <div className="flex-grow-1 ms-2" style={{ minWidth: 0 }}>
                    <div className={c.unseen_count > 0 ? 'fw-bold' : ''}>
                      {displayName(c.participants)}
                    </div>
                  </div>
                  <div className="text-muted ms-2" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {formatLastDate(c.last_message_at)}
                  </div>
                </ListGroup.Item>
              ))
            )}
          </ListGroup>
        </Col>
      </Row>

      <NewMessageModal
        show={showNewMessage}
        onHide={() => setShowNewMessage(false)}
        baseURL={baseURL}
        userId={userId}
        onStart={handleStartFromModal}
      />
    </Container>
  );
}

export default PrivateMessages;
