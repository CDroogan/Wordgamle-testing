import React from 'react';
import { Modal } from 'react-bootstrap';

// A small, square-ish, rounded, purple-bordered popup used by the
// PRE-account homepage's clickable phrases ("Share and Chat", "CLICK HERE
// to see how!", etc.) to show a screenshot explaining that feature without
// navigating away from the homepage's Create Account / Log In prompts.
function HomeInfoPopup({ show, onHide, image, alt }) {
  return (
    <Modal show={show} onHide={onHide} centered dialogClassName="home-info-popup">
      <Modal.Body className="text-center p-2">
        <button
          type="button"
          className="btn-close float-end mb-2"
          aria-label="Close"
          onClick={onHide}
        />
        <img src={image} alt={alt} className="img-fluid home-info-popup-img" />
      </Modal.Body>
    </Modal>
  );
}

export default HomeInfoPopup;
