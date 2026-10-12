import React, { useEffect, useState, useCallback } from 'react';
import { Container, Row, Col, Form, ListGroup } from 'react-bootstrap';
import Axios from 'axios';
import MemberProfile from '../constant/Models/MemberProfile';

function GamleFriends() {
  const baseURL = import.meta.env.VITE_BASE_URL;
  const userId = JSON.parse(localStorage.getItem('auth'))?.id;

  const [friends, setFriends] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await Axios.get(`${baseURL}/friends/get-friends.php`, { params: { user_id: userId } });
      if (res.data.status === 'success') {
        setFriends(res.data.friends || []);
      }
    } catch (err) {
      console.error('Error fetching GamleFriends:', err);
    }
  }, [baseURL, userId]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const runSearch = useCallback(async (query) => {
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }
    try {
      const res = await Axios.get(`${baseURL}/friends/search-users.php`, {
        params: { user_id: userId, q: query.trim() },
      });
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

  const openProfile = (member) => {
    setSelectedMember({
      id: member.friend_id ?? member.id,
      username: member.username,
      first_name: member.first_name,
      last_name: member.last_name,
      avatar: member.avatar,
    });
    setShowProfile(true);
  };

  const relationshipLabel = (user) => {
    switch (user.relationship) {
      case 'friends': return 'Friend';
      case 'pending_sent': return 'Request Sent';
      case 'pending_received': return 'Wants to be Friends';
      default: return null;
    }
  };

  return (
    <Container>
      <Row className="justify-content-center pt-4">
        <Col md={8} lg={6}>
          <h4 className="mb-3">GamleFriends</h4>

          <Form.Control
            type="text"
            placeholder="Search Gamlers"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="mb-3"
          />

          {searchInput.trim() !== '' && (
            <ListGroup className="mb-4">
              {searchResults.length === 0 ? (
                <ListGroup.Item className="text-muted">No Gamlers found</ListGroup.Item>
              ) : (
                searchResults.map((user) => (
                  <ListGroup.Item
                    key={user.id}
                    action
                    onClick={() => openProfile(user)}
                    className="d-flex align-items-center"
                  >
                    <img
                      src={user.avatar ? `${baseURL}/user/uploads/${user.avatar}` : `${baseURL}/user/uploads/defalut_avatar.png`}
                      alt=""
                      className="rounded-circle me-2"
                      style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                    />
                    <span>{user.first_name} {user.last_name} ({user.username})</span>
                    {relationshipLabel(user) && (
                      <span className="text-muted ms-2" style={{ fontSize: '0.85rem' }}>
                        - {relationshipLabel(user)}
                      </span>
                    )}
                  </ListGroup.Item>
                ))
              )}
            </ListGroup>
          )}

          <h6 className="text-muted mb-2">Your GamleFriends</h6>
          <ListGroup>
            {friends.length === 0 ? (
              <ListGroup.Item className="text-muted">No GamleFriends yet - search above to add some!</ListGroup.Item>
            ) : (
              friends.map((friend) => (
                <ListGroup.Item
                  key={friend.request_id}
                  action
                  onClick={() => openProfile(friend)}
                  className="d-flex align-items-center"
                >
                  <img
                    src={friend.avatar ? `${baseURL}/user/uploads/${friend.avatar}` : `${baseURL}/user/uploads/defalut_avatar.png`}
                    alt=""
                    className="rounded-circle me-2"
                    style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                  />
                  <span>{friend.first_name} {friend.last_name} ({friend.username})</span>
                  <span className="text-muted ms-2" style={{ fontSize: '0.85rem' }}>
                    - Friend - {friend.mutual_count} mutual friend{friend.mutual_count === 1 ? '' : 's'}
                  </span>
                </ListGroup.Item>
              ))
            )}
          </ListGroup>
        </Col>
      </Row>

      <MemberProfile
        show={showProfile}
        onHide={() => setShowProfile(false)}
        selectedMember={selectedMember}
        baseURL={baseURL}
        viewerId={userId}
        friendshipEnabled
        onRelationshipChange={() => {
          fetchFriends();
          runSearch(searchInput);
        }}
      />
    </Container>
  );
}

export default GamleFriends;
