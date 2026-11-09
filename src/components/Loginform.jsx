import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, InputGroup } from 'react-bootstrap';
import Axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import Logo from '../Logo.png';

function Loginform() {
    const baseURL = import.meta.env.VITE_BASE_URL;
    const userAuthData = JSON.parse(localStorage.getItem('auth')); // Change here
    const navigate = useNavigate();
    const location = useLocation();
    const [validated, setValidated] = useState(false);
    // Arriving fresh from a successful password reset (see
    // Resetpwdform.jsx) prefills the account that was actually just
    // reset, so the browser's own saved-password autofill doesn't get to
    // fill this in with a different, previously-saved account on this
    // device instead.
    const [emailOrUsername, setEmailOrUsername] = useState(location.state?.prefillEmail || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showLoginForm, setShowLoginForm] = useState(false);
    
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const showLoginformClick = () => {
        setShowLoginForm(!showLoginForm);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        if (form.checkValidity() === false) {
            setValidated(true);
        } else {
            setEmailOrUsername('');
            setPassword('');
            // Persisted server-side so scheduled reminders (group invites
            // today, other reminder types later) know what "8am this
            // Gamler's local time" actually means - the site has no other
            // way to learn a Gamler's timezone outside of this.
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const userObject = { email: emailOrUsername, password, timezone }; // Use a single field for both email and username
            Axios.post(`${baseURL}/auth/login.php`, userObject)
                .then(res => {
                    if (res.data.status === 'success') {
                        localStorage.setItem('auth', JSON.stringify(res.data));
                        navigate("/");
                    } else {
                        toast.error("Invalid username/email or password!");
                    }
                })
                .catch(() => {
                    toast.error("Invalid User Details");
                });
        }
    };

    const isEmptyObject = userAuthData && Object.keys(userAuthData).length === 0;
    
    return (
        <>
            
            <Container className="login-section">
                <Row className="align-content-center justify-content-center">
                    <Col md={4} className='bg-white px-5 py-3 text-center'>
                        {!userAuthData || isEmptyObject ? (
                                        <div>
                                        <h4 className='my-4'>Login</h4>
                                        <Form noValidate validated={validated} onSubmit={handleSubmit}>
                                            <Row className="mb-3">
                                                <Col>
                                                    <Form.Group controlId="login-email">
                                                        <InputGroup hasValidation>
                                                        <Form.Control
                                                            type="text"
                                                            placeholder="Email or Username"
                                                            required
                                                            onChange={(e) => setEmailOrUsername(e.target.value)}
                                                            value={emailOrUsername}
                                                            name="login-identifier"
                                                            autoComplete="username"
                                                        />
                                                            <Form.Control.Feedback type="invalid">
                                                                Please enter an email.
                                                            </Form.Control.Feedback>
                                                        </InputGroup>
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                            <Row className="mb-3">
                                                <Col>
                                                    <Form.Group controlId="login-password">
                                                        <InputGroup>
                                                            <Form.Control
                                                                type={showPassword ? "text" : "password"}
                                                                placeholder="Password"
                                                                required
                                                                onChange={(e) => setPassword(e.target.value)}
                                                                value={password}
                                                                name="login-password"
                                                                autoComplete="current-password"
                                                            />
                                                            <InputGroup.Text>
                                                                <i className={showPassword ? "fa fa-eye-slash" : "fa fa-eye"} onClick={togglePasswordVisibility}></i>
                                                            </InputGroup.Text>
                                                            <Form.Control.Feedback type="invalid">
                                                                Please enter a password.
                                                            </Form.Control.Feedback>
                                                        </InputGroup>
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                            <Button type="submit">
                                                <i className="fa fa-fw fa-sign-in-alt mr-1"></i>Login
                                            </Button>
                                        </Form>
                                        <div className='btn-section my-3'>
                                            <Link className="btn btn-sm btn-light d-block d-lg-inline-block mb-1 float-right" to="/reset-password">
                                                <i className="fa fa-exclamation-triangle text-muted mr-1"></i> Forgot password
                                            </Link>
                                        </div>
                                        </div> 
                        ) : (
                            <div>
                                <h2 className='my-2'>{"Welcome "+userAuthData.username+"!"}</h2>
                                <p className='my-3'>You are successfully logged in.</p>
                                <Link className="btn btn-primary btn-lg my-3" to="/" style={{width:"60%"}}>Home</Link>
                            </div>
                        )}
                    </Col>
                </Row>
            </Container>
        </>
    );
}

export default Loginform;
