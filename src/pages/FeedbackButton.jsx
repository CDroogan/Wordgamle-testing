import { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';

function FeedbackButton({ locked = false }) {
  const [show, setShow] = useState(false);

  return (
    <>
      <Button className="custom-btn m-2" onClick={() => { if (!locked) setShow(true); }} style={{ pointerEvents: locked ? 'none' : 'auto' }}>
        Feedback
      </Button>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Send Feedback</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            <a href="mailto:contact@pysis.com">Click here</a> to send your valuable feedback to <a href="mailto:contact@pysis.com">contact@pysis.com</a>.
            <br />
            Please include your phone number if you're open to being contacted for further discussion.
          </p>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="primary" onClick={() => setShow(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default FeedbackButton;