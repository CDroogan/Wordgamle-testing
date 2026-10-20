import React, { useState } from "react";
import { Modal, Button, Form, Spinner  } from "react-bootstrap";

// Shared by Create Group and Update Group (rename) - enforced here once
// rather than duplicated in each caller's own submit handler. The
// backend (create-group.php / update-group.php) enforces the same rule
// regardless, so this is purely for immediate feedback.
const GROUP_NAME_PATTERN = /^[A-Za-z0-9. -]{2,30}$/;

const GroupModal = ({ showForm, handleFormClose, onSubmit, groupname, setGroupname, editMode, loading }) => {
  const [nameError, setNameError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!GROUP_NAME_PATTERN.test(groupname.trim())) {
      setNameError('Group Name must be 2-30 characters: letters, numbers, periods, hyphens, and spaces only.');
      return;
    }
    setNameError('');
    onSubmit(e);
  };

  return (
    <Modal show={showForm} onHide={handleFormClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{editMode ? "Update Group" : "Create Group"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group>
            <Form.Label>Group Name</Form.Label>
            <Form.Control
              type="text"
              value={groupname}
              onChange={(e) => { setGroupname(e.target.value); if (nameError) setNameError(''); }}
              placeholder="Enter Group Name (this can be changed later)"
              autoFocus
              maxLength={30}
            />
            {nameError && <div className="text-danger mt-1" style={{ fontSize: '0.85rem' }}>{nameError}</div>}
          </Form.Group>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleFormClose}>
              Close
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" /> Updating...
                </>
              ) : (
                editMode ? "Update" : "Create"
              )}
            </Button>

          </Modal.Footer>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default GroupModal;
