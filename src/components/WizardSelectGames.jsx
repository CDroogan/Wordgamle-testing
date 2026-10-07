import React from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const GAMES = ["Wordle", "Connections", "Phrazle", "Quordle", "Octordle"];

// Step 2 of the Create Group wizard - a wizard-only popup version of the
// "Select Leaderboard Games" screen (see MemberGameSelections.jsx for the
// pre-existing standalone page version, which stays untouched). Starts
// with every box unchecked rather than pre-filling from the backend,
// since the captain was already defaulted into every game by
// create-group.php - this screen is the deliberate, explicit choice
// point that overrides that default. No Back button: there's no earlier
// step to return to, since group creation itself already happened.
function WizardSelectGames({ groupName, leaderboardText, selectedGames, onToggleGame, onSave, onClose, saving }) {
  return (
    <Modal show backdrop="static" keyboard={false} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title className="w-100 text-center" style={{ color: 'var(--wordgamle-accent)' }}>{groupName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h5>Select Leaderboard Games:</h5>
        <p dangerouslySetInnerHTML={{ __html: leaderboardText.text4 || '' }}></p>
        <p className="text-muted" style={{ fontSize: '0.9rem' }}>
          You will be able to add or remove yourself from any game's Leaderboard at any time. And other Group Members will have the same option.
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
