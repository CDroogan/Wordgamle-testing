import React, { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import HomeInfoPopup from './HomeInfoPopup';
import leaderboardsPopupImg from '../assets/homepage-popups/leaderboards.png';

// Final step of the Create Group wizard. "first" only appears the very
// first time this Gamler has ever created a group as captain - computed
// by the caller from the "Groups Created By Me" list it already fetches,
// before this group existed in it.
function WizardSuccess({ groupName, isFirstGroup, onBack, onContinue, onClose }) {
  const [showLeaderboardsPopup, setShowLeaderboardsPopup] = useState(false);

  return (
    <>
      <Modal show backdrop="static" keyboard={false} onHide={onClose}>
        <Modal.Header closeButton>
          <Modal.Title className="w-100 text-center" style={{ color: 'var(--wordgamle-accent)' }}>{groupName}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <p className="fw-bold">
            Success! Your {isFirstGroup ? 'first ' : ''}WordGAMLE group is created.
          </p>
          <p>
            <button type="button" className="home-popup-link" onClick={() => setShowLeaderboardsPopup(true)}>Leaderboards</button>
            {' '}will begin when other group members accept the invitation and start playing!
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onBack}>Back</Button>
          <Button variant="primary" onClick={onContinue}>Continue</Button>
        </Modal.Footer>
      </Modal>

      <HomeInfoPopup
        show={showLeaderboardsPopup}
        onHide={() => setShowLeaderboardsPopup(false)}
        image={leaderboardsPopupImg}
        alt="Example of Daily, Weekly, Monthly and Yearly group leaderboards"
      />
    </>
  );
}

export default WizardSuccess;
