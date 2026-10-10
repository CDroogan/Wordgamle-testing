import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, InputGroup } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { SITE_PASSWORD } from '../config/sitePassword';

// Shown in place of the real page content for anyone who hasn't already
// unlocked the site (see Layout.jsx) - everything except the two login
// routes stays hidden behind this until "Casa" is entered correctly, or
// the person logs into an existing account instead.
function CasaGate({ onUnlock }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === SITE_PASSWORD) {
      localStorage.setItem('pageUnlocked', 'true');
      onUnlock();
    } else {
      toast.error('Incorrect password!');
    }
  };

  return (
    <Container className="login-section">
      <Row className="align-content-center justify-content-center">
        <Col md={6} className="bg-white px-3 py-3 text-center">
          <p className="fs-4 text-center">Enter Password to Access</p>
          <Form onSubmit={handleSubmit}>
            <InputGroup className="my-3">
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter Password for Site Access"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <InputGroup.Text
                onClick={() => setShowPassword(!showPassword)}
                style={{ cursor: 'pointer' }}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </InputGroup.Text>
            </InputGroup>
            <Button variant="primary" type="submit">Submit</Button>
          </Form>
          <Button
            variant="primary"
            className="mt-3 w-100"
            onClick={() => navigate('/login')}
          >
            Already have an account?<br />Log in HERE
          </Button>
        </Col>
      </Row>
    </Container>
  );
}

export default CasaGate;
