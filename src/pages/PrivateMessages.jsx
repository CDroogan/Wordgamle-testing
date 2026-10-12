import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Container, Row, Col, Form, Button, ListGroup } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import Axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { FaArrowLeft } from 'react-icons/fa';

dayjs.extend(utc);
dayjs.extend(timezone);

const viewerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const formatMessageTime = (utcString) => dayjs.utc(utcString).tz(viewerTimezone).format('MMM D, h:mm A');
const formatLastDate = (utcString) => dayjs.utc(utcString).tz(viewerTimezone).format('M/D/YY');

function PrivateMessages() {
  const baseURL = import.meta.env.VITE_BASE_URL;
  const userId = JSON.parse(localStorage.getItem('auth'))?.id;
  const location = useLocation();

  const [conversations, setConversations] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedOtherUser, setSelectedOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
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

  const openConversation = useCallback(async (otherId) => {
    try {
      const res = await Axios.get(`${baseURL}/messages/get-conversation.php`, { params: { user_id: userId, other_id: otherId } });
      if (res.data.status === 'success') {
        setSelectedOtherUser(res.data.other_user);
        setMessages(res.data.messages || []);
        setSearchInput('');
        setSearchResults([]);
        await Axios.post(`${baseURL}/messages/mark-conversation-seen.php`, { user_id: userId, other_id: otherId });
        fetchConversations();
      }
    } catch (err) {
      console.error('Error opening conversation:', err);
    }
  }, [baseURL, userId, fetchConversations]);

  // Arriving from the bell notification with ?user=<id> - jump straight
  // into that conversation, same approach the GameFeed uses for
  // ?post=<id> from a mention notification.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetUser = params.get('user');
    if (targetUser) {
      openConversation(targetUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);

  const runSearch = useCallback(async (query) => {
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }
    try {
      const res = await Axios.get(`${baseURL}/messages/search-users.php`, { params: { user_id: userId, q: query.trim() } });
      if (res.data.status === 'success') {
        setSearchResults(res.data.users || []);
      }
    } catch (err) {
      console.error('Error searching Gamlers:', err);
    }
  }, [baseURL, userId]);

  useEffect(() => {
    const timeout = setTimeout(() => runSearch(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput, runSearch]);

  const handleSend = async () => {
    const text = draftText.trim();
    if (!text || !selectedOtherUser) return;
    setSending(true);
    try {
      const res = await Axios.post(`${baseURL}/messages/send-message.php`, {
        sender_id: userId,
        receiver_id: selectedOtherUser.id,
        message: text,
      });
      if (res.data.status === 'success') {
        setMessages((prev) => [...prev, res.data.message_row]);
        setDraftText('');
        fetchConversations();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const backToList = () => {
    setSelectedOtherUser(null);
    setMessages([]);
  };

  const avatarUrl = (avatar) => (avatar ? `${baseURL}/user/uploads/${avatar}` : `${baseURL}/user/uploads/default_avatar.png`);

  if (selectedOtherUser) {
    return (
      <Container>
        <Row className="justify-content-center pt-4">
          <Col md={8} lg={6}>
            <div className="d-flex align-items-center mb-3">
              <Button variant="link" className="p-0 me-2 text-dark" onClick={backToList}>
                <FaArrowLeft size={18} />
              </Button>
              <img src={avatarUrl(selectedOtherUser.avatar)} alt="" className="rounded-circle me-2" style={{ width: '36px', height: '36px', objectFit: 'cover' }} />
              <div className="fw-bold">{selectedOtherUser.first_name} {selectedOtherUser.last_name} ({selectedOtherUser.username})</div>
            </div>

            <div
              className="border rounded p-3 mb-2"
              style={{ height: '50vh', overflowY: 'auto', background: '#f8f9fa' }}
            >
              {messages.length === 0 ? (
                <p className="text-muted text-center mt-3">Send {selectedOtherUser.first_name} a message to start the conversation.</p>
              ) : (
                messages.map((m) => {
                  const isMine = Number(m.sender_id) === Number(userId);
                  return (
                    <div key={m.id} className={`d-flex mb-2 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}>
                      <div style={{ maxWidth: '75%' }}>
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
              className="d-flex gap-2"
            >
              <Form.Control
                type="text"
                placeholder={`Send ${selectedOtherUser.first_name} a message...`}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                disabled={sending}
              />
              <Button type="submit" variant="primary" disabled={sending || !draftText.trim()}>Send</Button>
            </Form>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container>
      <Row className="justify-content-center pt-4">
        <Col md={8} lg={6}>
          <h4 className="mb-3">Private Messages</h4>

          <Form.Control
            type="text"
            placeholder="Search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="mb-3"
          />

          {searchInput.trim() !== '' ? (
            <ListGroup>
              {searchResults.length === 0 ? (
                <ListGroup.Item className="text-muted">No Gamlers found</ListGroup.Item>
              ) : (
                searchResults.map((user) => (
                  <ListGroup.Item key={user.id} action onClick={() => openConversation(user.id)} className="d-flex align-items-center">
                    <img src={avatarUrl(user.avatar)} alt="" className="rounded-circle me-2 flex-shrink-0" style={{ width: '32px', height: '32px', objectFit: 'cover' }} />
                    <div>{user.first_name} {user.last_name} ({user.username})</div>
                  </ListGroup.Item>
                ))
              )}
            </ListGroup>
          ) : (
            <ListGroup>
              {conversations.length === 0 ? (
                <ListGroup.Item className="text-muted">No conversations yet - search above to message a Gamler!</ListGroup.Item>
              ) : (
                conversations.map((c) => (
                  <ListGroup.Item key={c.other_id} action onClick={() => openConversation(c.other_id)} className="d-flex align-items-center">
                    <img src={avatarUrl(c.avatar)} alt="" className="rounded-circle me-2 flex-shrink-0" style={{ width: '32px', height: '32px', objectFit: 'cover' }} />
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className={c.unseen_count > 0 ? 'fw-bold' : ''}>
                        {c.first_name} {c.last_name} ({c.username})
                      </div>
                    </div>
                    <div className="text-muted ms-2" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {formatLastDate(c.last_message_at)}
                    </div>
                  </ListGroup.Item>
                ))
              )}
            </ListGroup>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default PrivateMessages;
