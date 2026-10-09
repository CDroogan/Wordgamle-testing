import React from 'react';
import { Modal, Button } from 'react-bootstrap';

// Shared final "Success!" step for any group-related wizard (creating a
// group, accepting an invitation, ...) - only the middle message differs
// per caller; "Success!" and the Leaderboards explanation are identical
// everywhere this is used.
function WizardSuccess({ groupName, message, onBack, onContinue, onClose }) {
  return (
    <Modal show backdrop="static" keyboard={false} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title className="w-100 text-center" style={{ color: 'var(--wordgamle-accent)' }}>{groupName}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        <p className="fw-bold mb-1">Success!</p>
        <p className="fw-bold">{message}</p>
        <p>
          Leaderboards will begin when other group members accept the invitation and start playing!
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onBack}>Back</Button>
        <Button variant="primary" onClick={onContinue}>Continue</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default WizardSuccess;
