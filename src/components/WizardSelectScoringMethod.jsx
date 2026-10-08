import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const METHODS = ["Golf", "World Cup", "Pesce"];

// Step 3 of the Create Group wizard - a wizard-only popup version of
// "Select Scoring Method" (see SelectScoringMethod.jsx for the pre-
// existing standalone page version, which stays untouched). Reuses that
// same page's per-method explanation popup content (golf/world_cup/pesce
// modal title+description from leaderboardText) rather than duplicating
// that copy, so the two stay in sync automatically if it's ever edited.
function WizardSelectScoringMethod({ groupName, leaderboardText, scoringMethod, onSelectMethod, onSave, onBack, onClose, saving }) {
  const [showInfo, setShowInfo] = useState(false);
  const [infoMethod, setInfoMethod] = useState(null);

  // Clicking the actual radio circle only changes the selection - a
  // captain who already knows the methods shouldn't have to dismiss an
  // explanation popup just to pick one and hit Save.
  const handlePick = (method) => {
    onSelectMethod(method);
  };

  // Clicking the method's NAME only shows its explanation - it must not
  // change which radio is selected. e.preventDefault() stops the <label
  // htmlFor=...> from forwarding its click onto the radio it's paired
  // with, which is what would otherwise toggle the selection.
  const handlePickInfoOnly = (e, method) => {
    e.preventDefault();
    setInfoMethod(method);
    setShowInfo(true);
  };

  const methodKey = infoMethod === 'World Cup' ? 'world_cup' : infoMethod === 'Pesce' ? 'pesce' : 'golf';
  const titleHtml = (leaderboardText[`${methodKey}_modal_title`] || '').replace(/\\n/g, '');
  const descHtml = (leaderboardText[`${methodKey}_modal_description`] || '').replace(/\\n/g, '');

  return (
    <>
      <Modal show backdrop="static" keyboard={false} onHide={onClose}>
        <Modal.Header closeButton>
          <Modal.Title className="w-100 text-center" style={{ color: 'var(--wordgamle-accent)' }}>{groupName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5>Select Scoring Method:</h5>
          <p dangerouslySetInnerHTML={{ __html: leaderboardText.text5 || '' }}></p>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>
            As Group Captain, you will be able to change your group's Scoring Method at any time.
          </p>
          <Form className="d-flex flex-wrap justify-content-center scoring-method-form">
            {METHODS.map((method) => (
              <div key={method} className="form-check mx-2">
                <input
                  type="radio"
                  className="form-radio-input"
                  id={`wizard-method-${method}`}
                  checked={scoringMethod === method}
                  onChange={() => handlePick(method)}
                />
                <label
                  className={`form-check-label scoring-label px-2 ${scoringMethod === method ? "text-primary fw-bold" : "text-primary"}`}
                  htmlFor={`wizard-method-${method}`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => handlePickInfoOnly(e, method)}
                >
                  {method}
                </label>
              </div>
            ))}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onBack}>Back</Button>
          <Button variant="primary" onClick={onSave} disabled={saving || !scoringMethod}>
            {saving ? 'Saving…' : 'Save Method'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showInfo} onHide={() => setShowInfo(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {infoMethod && <div dangerouslySetInnerHTML={{ __html: titleHtml }}></div>}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {infoMethod && <div dangerouslySetInnerHTML={{ __html: descHtml }}></div>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInfo(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default WizardSelectScoringMethod;
