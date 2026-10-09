import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import Axios from "axios";
import { toast } from 'react-toastify';
import Select from "react-select";
import { shareText } from '../../utils/inviteFriends';

const AddMembers = ({ showForm, handleFormClose, groupName, groupId, existingMembers = [], onBack, allowNewGamlerInvite = false }) => {
  const baseURL = import.meta.env.VITE_BASE_URL;
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedCaptain, setSelectedCaptain] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [newGamlerName, setNewGamlerName] = useState("");
  const [hasSentOnce, setHasSentOnce] = useState(false);
  const userAuthData = JSON.parse(localStorage.getItem('auth')) || {};
  const loggedInUserId = String(userAuthData.id || "");
  const loggedInUsername = userAuthData.username || "";
  const inviterFullName = userAuthData.firstname && userAuthData.lastname
    ? `${userAuthData.firstname} ${userAuthData.lastname}`
    : (loggedInUsername || 'A friend');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await Axios.get(`${baseURL}/groups/get-groups.php`);
        setGroups(res.data.groups || []);
      } catch (err) {
        console.error("Failed to fetch groups");
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await Axios.get(`${baseURL}/groups/get-user.php`);
        setUsers(res.data.users || []);
      } catch (err) {
        console.error("Failed to fetch users");
      }
    };

    fetchGroups();
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedGroupName = groups.find(group => String(group.id) === String(selectedGroup))?.name || "Unknown Group";
    const groupData = {
      group_id: selectedGroup,
      group_name: selectedGroupName,
      captain_id: selectedCaptain,
      members: selectedMembers.map(member => member.value),
    };

    try {
      const res = await Axios.post(`${baseURL}/groups/add-group-members.php`, groupData);
      if (res.data.status === "success") {
        toast.success(res.data.message);
        handleFormClose();
        setSelectedGroup('');
        setSelectedCaptain('');
        setSelectedMembers([]);
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An unexpected error occurred.');
    }
  };

  const frontendBaseUrl = window.location.origin;

  const handleSendInvitation = async () => {
    const trimmedNewGamlerName = newGamlerName.trim();
    const wantsNewGamlerInvite = allowNewGamlerInvite && trimmedNewGamlerName !== '';

    if (selectedMembers.length === 0 && !wantsNewGamlerInvite) {
      toast.error("Please select at least one existing Gamler, or enter a name to invite someone new.");
      return;
    }

    setLoading(true);
    try {
      if (wantsNewGamlerInvite) {
        const res = await Axios.post(`${baseURL}/groups/create-site-invite.php`, {
          group_id: groupId,
          invited_by_user_id: loggedInUserId,
          invited_name: trimmedNewGamlerName,
        });

        if (res.data.status === 'success') {
          // Greet by first word only ("Jay Droogan" -> "Jay") - a full
          // name in a greeting reads like a form letter.
          const firstWord = trimmedNewGamlerName.split(' ')[0];
          const inviteUrl = `${frontendBaseUrl}/register?invite_token=${res.data.token}`;
          // This link already bypasses the site's Casa password gate (see
          // Layout.jsx's always-unlocked routes), so the note below is
          // purely informational - for if this message gets forwarded on
          // its own, without the link.
          const message = `Hi ${firstWord}! ${inviterFullName} has invited you to create an account and join "${groupName}" on WordGAMLE!\n${inviteUrl}\n\n👉 Note that WordGAMLE is password protected. Anyone who logs on without an Invite from an existing Gamler will need to enter ‘Casa’ (case sensitive) to gain access.`;
          await shareText(message);
        } else {
          toast.error(res.data.message || "Failed to create invite link.");
        }
      }

      if (selectedMembers.length > 0) {
        const invitations = selectedMembers.map(member => ({
          group_id: groupId,
          group_name: groupName,
          invited_user_id: member.value,
          invited_user_name: member.label,
          frontendBaseUrl
        }));

        await Promise.all(invitations.map(invite =>
          Axios.post(`${baseURL}/groups/send-invite.php`, invite)
        ));
      }

      toast.success("Invitations sent successfully!");
      setSelectedMembers([]);
      setNewGamlerName('');
      if (allowNewGamlerInvite) {
        setHasSentOnce(true);
      } else {
        handleFormClose();
      }
    } catch (error) {
      toast.error("Failed to send invitations.");
    }
    finally {
      setLoading(false); // stop loading
    }
  };

  const filteredUsers = users.filter(user =>
    // !user.is_paused &&
    String(user.id) !== String(selectedCaptain) &&
    String(user.id) !== String(loggedInUserId) &&
    !existingMembers.includes(String(user.id))
  );
  return (
  <>
    <Modal show={showForm} onHide={handleFormClose}>
      <Modal.Header closeButton>
        <Modal.Title>Add Group Members</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Group</Form.Label>
            <Form.Control type="text" readOnly value={groupName} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Captain</Form.Label>
            <Form.Control type="text" readOnly value={loggedInUsername} />
          </Form.Group>

          {allowNewGamlerInvite && hasSentOnce && (
            <Form.Group className="mb-3">
              <p className="fw-bold mb-2">Do you want to add any additional Group Members?</p>
              <Button variant="primary" onClick={handleFormClose}>
                No, Complete Group Set-Up
              </Button>
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Invite Group Members{allowNewGamlerInvite ? ' - Existing Gamlers' : ''}</Form.Label>
            <Select
              isMulti
              options={filteredUsers
                .filter(user => {
                  const input = searchInput.toLowerCase();
                  return (
                    searchInput.length >= 3 &&
                    (
                      user.first_name?.toLowerCase().includes(input) ||
                      user.last_name?.toLowerCase().includes(input) ||
                      user.username?.toLowerCase().includes(input)
                    )
                  );
                })
                .map(user => ({
                  value: user.id,
                  label: `${user.first_name} ${user.last_name} (${user.username})`,
                }))}
              value={selectedMembers}
              onChange={setSelectedMembers}
              onInputChange={(input) => setSearchInput(input)}
              placeholder="Type at least 3 characters to search..."
              noOptionsMessage={() =>
                searchInput.length < 3 ? "Type at least 3 letters..." : "No users found"
              }
            />
            <div className="alert alert-warning py-2 px-3 mb-2" style={{ fontSize: '0.85rem', marginBottom: '5px' }}>
              * Only active users are shown. Paused users are not available for selection.
            </div>
          </Form.Group>

          {allowNewGamlerInvite && (
            <Form.Group className="mb-3">
              <Form.Label>Invite Someone to Join WordGAMLE and your Group</Form.Label>
              <div className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
                These invitations will need to be sent one at a time.
              </div>
              <Form.Label className="mb-1">Name:</Form.Label>
              <Form.Control
                type="text"
                value={newGamlerName}
                onChange={(e) => setNewGamlerName(e.target.value)}
                placeholder="Enter their name"
              />
              <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>
                Your friend will be able to change this at sign-up.
              </div>
            </Form.Group>
          )}

          <Button variant="primary" onClick={handleSendInvitation} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Sending...
              </>
            ) : (
              "Send Invitations"
            )}
          </Button>

        </Form>
      </Modal.Body>
      <Modal.Footer>
        {onBack && (
          <Button variant="outline-secondary" onClick={onBack}>
            Back
          </Button>
        )}
        <Button variant="secondary" onClick={handleFormClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
   
  </>
);

};

export default AddMembers;
