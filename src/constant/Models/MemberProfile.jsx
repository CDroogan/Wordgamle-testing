import React, { useEffect, useState } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import Axios from 'axios';
import { toast } from 'react-toastify';

// GamleFriends-related props (viewerId, friendshipEnabled) are all
// optional and default to off, so every existing caller (GameFeed,
// Group Chat, Group Stats, Group Info) keeps behaving exactly as before.
// Pass friendshipEnabled + viewerId to also show the Add Friend / Pending
// / Friend+Manage controls - currently only done from the GamleFriends
// page itself.
function MemberProfile({ show, onHide, selectedMember, baseURL, viewerId, friendshipEnabled = false, onRelationshipChange }) {
  const [relationship, setRelationship] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [mutualCount, setMutualCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmingUnfriend, setConfirmingUnfriend] = useState(false);
  const [finalConfirmingUnfriend, setFinalConfirmingUnfriend] = useState(false);

  const canShowFriendControls = friendshipEnabled && viewerId && selectedMember?.id && String(viewerId) !== String(selectedMember.id);

  useEffect(() => {
    setConfirmingUnfriend(false);
    setFinalConfirmingUnfriend(false);
    if (!show || !canShowFriendControls) {
      setRelationship(null);
      return;
    }

    const fetchRelationship = async () => {
      try {
        const res = await Axios.get(`${baseURL}/friends/get-relationship.php`, {
          params: { user_id: viewerId, other_id: selectedMember.id },
        });
        if (res.data.status === 'success') {
          setRelationship(res.data.relationship);
          setRequestId(res.data.request_id);
          setMutualCount(res.data.mutual_count || 0);
        }
      } catch (err) {
        console.error('Error fetching friend relationship:', err);
      }
    };
    fetchRelationship();
  }, [show, selectedMember?.id, viewerId, friendshipEnabled]);

  const notifyChange = () => {
    if (onRelationshipChange) onRelationshipChange();
  };

  const handleAddFriend = async () => {
    setLoading(true);
    try {
      const res = await Axios.post(`${baseURL}/friends/send-request.php`, {
        sender_id: viewerId,
        receiver_id: selectedMember.id,
      });
      if (res.data.status === 'success') {
        setRelationship('pending_sent');
        notifyChange();
      } else {
        toast.error(res.data.message || 'Could not send friend request.');
      }
    } catch (err) {
      toast.error('Failed to send friend request - please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    setLoading(true);
    try {
      const res = await Axios.post(`${baseURL}/friends/cancel-request.php`, {
        user_id: viewerId,
        request_id: requestId,
      });
      if (res.data.status === 'success') {
        setRelationship('none');
        setRequestId(null);
        notifyChange();
      } else {
        toast.error(res.data.message || 'Could not cancel that request.');
      }
    } catch (err) {
      toast.error('Failed to cancel request - please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    setLoading(true);
    try {
      const res = await Axios.post(`${baseURL}/friends/accept-request.php`, {
        user_id: viewerId,
        request_id: requestId,
      });
      if (res.data.status === 'success') {
        setRelationship('friends');
        notifyChange();
      } else {
        toast.error(res.data.message || 'Could not accept that request.');
      }
    } catch (err) {
      toast.error('Failed to accept request - please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    setLoading(true);
    try {
      const res = await Axios.post(`${baseURL}/friends/decline-request.php`, {
        user_id: viewerId,
        request_id: requestId,
      });
      if (res.data.status === 'success') {
        setRelationship('none');
        setRequestId(null);
        notifyChange();
      } else {
        toast.error(res.data.message || 'Could not decline that request.');
      }
    } catch (err) {
      toast.error('Failed to decline request - please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfriend = async () => {
    setLoading(true);
    try {
      const res = await Axios.post(`${baseURL}/friends/unfriend.php`, {
        user_id: viewerId,
        friend_id: selectedMember.id,
      });
      if (res.data.status === 'success') {
        setRelationship('none');
        setConfirmingUnfriend(false);
        setFinalConfirmingUnfriend(false);
        notifyChange();
      } else {
        toast.error(res.data.message || 'Could not unfriend that Gamler.');
      }
    } catch (err) {
      toast.error('Failed to unfriend - please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Member Profile</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {selectedMember ? (
          <>
            <img
              src={
                selectedMember.avatar
                  ? `${baseURL}/user/uploads/${selectedMember.avatar}`
                  : `${baseURL}/user/uploads/defalut_avatar.png`
              }
              alt="Avatar"
              className="rounded-circle mb-3"
              style={{ width: '100px', height: '100px', objectFit: 'cover' }}
            />

            <p className="text-muted">@{selectedMember.username}</p>
            <h5>{selectedMember.first_name} {selectedMember.last_name}</h5>

            {canShowFriendControls && relationship && (
              <div className="mt-3">
                {relationship === 'friends' && !confirmingUnfriend && (
                  <>
                    <p className="text-muted mb-2">Friend - {mutualCount} mutual friend{mutualCount === 1 ? '' : 's'}</p>
                    <Button variant="outline-secondary" size="sm" disabled={loading} onClick={() => setConfirmingUnfriend(true)}>
                      Manage
                    </Button>
                  </>
                )}

                {relationship === 'friends' && confirmingUnfriend && !finalConfirmingUnfriend && (
                  <>
                    <p className="mb-2">Would you like to unfriend {selectedMember.first_name}?</p>
                    <Button variant="secondary" size="sm" className="me-2" onClick={() => setConfirmingUnfriend(false)}>
                      Cancel
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setFinalConfirmingUnfriend(true)}>
                      Unfriend
                    </Button>
                  </>
                )}

                {relationship === 'friends' && finalConfirmingUnfriend && (
                  <>
                    <p className="mb-2">Are you sure you want to unfriend {selectedMember.first_name}?</p>
                    <Button variant="secondary" size="sm" className="me-2" disabled={loading} onClick={() => setFinalConfirmingUnfriend(false)}>
                      Cancel
                    </Button>
                    <Button variant="danger" size="sm" disabled={loading} onClick={handleUnfriend}>
                      {loading ? <Spinner as="span" animation="border" size="sm" /> : 'Yes, Unfriend'}
                    </Button>
                  </>
                )}

                {relationship === 'none' && (
                  <Button variant="primary" size="sm" disabled={loading} onClick={handleAddFriend}>
                    {loading ? <Spinner as="span" animation="border" size="sm" /> : 'Add Friend'}
                  </Button>
                )}

                {relationship === 'pending_sent' && (
                  <>
                    <p className="text-muted mb-2">Friend request sent</p>
                    <Button variant="outline-secondary" size="sm" disabled={loading} onClick={handleCancelRequest}>
                      Cancel Request
                    </Button>
                  </>
                )}

                {relationship === 'pending_received' && (
                  <>
                    <p className="text-muted mb-2">Wants to be your GamleFriend</p>
                    <Button variant="success" size="sm" className="me-2" disabled={loading} onClick={handleAcceptRequest}>
                      Accept
                    </Button>
                    <Button variant="danger" size="sm" disabled={loading} onClick={handleDeclineRequest}>
                      Decline
                    </Button>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <p>No member selected</p>
        )}
      </Modal.Body>
    </Modal>
  );
}

export default MemberProfile;
