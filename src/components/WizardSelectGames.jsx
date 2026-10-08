import React from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const GAMES = ["Wordle", "Connections", "Phrazle", "Quordle", "Octordle"];

// Shared "Select Leaderboard Games" popup step for any group-related
// wizard (creating a group, accepting an invitation, ...) - a wizard-only
// version of the pre-existing standalone MemberGameSelections.jsx page,
// which stays untouched. Starts with every box unchecked rather than
// pre-filling from the backend, since whoever's going through this
// wizard was already defaulted into every game by whatever just added
// them to the group (create-group.php for a new captain, accept-
// invite.php for a joining member) - this screen is the deliberate,
// explicit choice point that overrides that default. No Back button:
// there's no earlier step to return to, since joining/creating the
// group itself already happened. showMemberNote is false for a joining
// member, who doesn't need to be told other members have this same
// option - only the captain's own flow mentions that.
function WizardSelectGames({ groupName, leaderboardText, selectedGames, onToggleGame, onSave, onClose, saving, showMemberNote = true }) {
  return (
    <Modal show backdrop="static" keyboard={false} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title className="w-100 text-center" style={{ color: 'var(--wordgamle-accent)' }}>{groupName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h5>Select Leaderboard Games:</h5>
        <p dangerouslySetInnerHTML={{ __html: leaderboardText.text4 || '' }}></p>
        <p className="text-muted" style={{ fontSize: '0.9rem' }}>
          You will be able to add or remove yourself from any game's Leaderboard at any time.
          {showMemberNote && ' And other Group Members will have the same option.'}
        </p>
        <Form className="d-flex flex-wrap justify-content-center">
          {GAMES.map((game) => (
            <div key={game} className="form-check mx-2">
              <input
                type="checkbox"
                className="form-check-input"
                id={`wizard-game-${game}`}
                checked={selectedGames.includes(game)}
                onChange={() => onToggleGame(game)}
              />
              <label className="form-check-label" htmlFor={`wizard-game-${game}`}>{game}</label>
            </div>
          ))}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onSave} disabled={saving || selectedGames.length === 0}>
          {saving ? 'Saving…' : 'Save Preferences'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default WizardSelectGames;
