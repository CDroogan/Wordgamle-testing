import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, InputGroup, Modal, Carousel } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from "react-router-dom";
import { Link } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { toast } from 'react-toastify';
import Axios from 'axios';
import FeedbackButton from './FeedbackButton';
import { useLocation } from 'react-router-dom';
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation, FreeMode } from "swiper/modules";
import { FaRunning, FaDumbbell, FaTree } from "react-icons/fa"; // Example icons
import GroupScoreByDate from "../pages/GroupLeaderboard/GroupScoreByDate";
import dayjs from "dayjs";
import useDragScroll from "../hooks/useDragScroll";
import HomeInfoPopup from "../components/HomeInfoPopup";
import GameFeed from "../components/GameFeed";
import shareChatPopupImg from "../assets/homepage-popups/share-and-chat.jpg";
import storeHowToPopupImg from "../assets/homepage-popups/store-how-to.png";
import groupsPopupImg from "../assets/homepage-popups/groups.webp";
import leaderboardsPopupImg from "../assets/homepage-popups/leaderboards.png";
import enhancedStatsPopupImg from "../assets/homepage-popups/enhanced-stats.png";
import gamleScorePopupImg from "../assets/homepage-popups/gamle-score.jpg";
import trackResultsPopupImg from "../assets/homepage-popups/track-results.jpg";
import WordGamleLogo from '../WordleTitleLogo.png';

function Home() {
    const baseURL = import.meta.env.VITE_BASE_URL;
    const userAuthData = JSON.parse(localStorage.getItem('auth')) || {};
     const userId = userAuthData?.id;
    const navigate = useNavigate();
    const [show, setShow] = useState(false);
    // Password Protection State
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const correctPassword = "Casa"; // Change this
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const encryptedId = params.get('group_id');
    const groupId = encryptedId;
    const registerPath = groupId ? `/register?group_id=${groupId}` : `/register`;
    const [allGroup, setAllGroup] = useState([]);

    const formattedDate = dayjs().format("YYYY-MM-DD");

    
    // //get all group id
    // useEffect(() => {
    // const fetchUserGroups = async () => {
    //     try {
    //     // 1️⃣ Get all user groups
    //     const res = await Axios.get(`${baseURL}/groups/get-user-groups-data.php`, {
    //         params: { user_id: userId },
    //     });
        
    //     const groups = res.data; // assuming this is an array of groups
       

    //     // 2️⃣ Fetch data for each group individually
    //     const groupDetailsPromises = groups.map(group =>
    //         Axios.get(`${baseURL}/groups/get-all-game-current-group-score.php`, {
    //         params: {
    //             user_id: userId,
    //             groupId: group.id,
    //             game: group.selected_games.toLowerCase(),
    //             today: "2025-12-10"
    //             }
    //         })
    //     );

    //     const groupDetailsResponses = await Promise.all(groupDetailsPromises);

    //     // 3️⃣ Extract data from each response
    //     const detailedGroups = groupDetailsResponses.map(res => res.data);

    //     // 4️⃣ Update state once
    //     setAllGroup(detailedGroups);

    //     } catch (error) {
    //     console.error("Error fetching user joined groups:", error);
    //     }
    // };

    // if (userId) fetchUserGroups();
    // }, [userId]);





    // Check if the user already entered the password
    useEffect(() => {
        if (localStorage.getItem("pageUnlocked") === "true") {
            setIsAuthenticated(true);
        }
    }, []);

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (password === correctPassword) {
            setIsAuthenticated(true);
            localStorage.setItem("pageUnlocked", "true"); // Store authentication
        } else {
            toast.error("Incorrect password!");
        }
    };

    const handleNavigation = (link) => {
        navigate(`/${link}`);
    };
    
    const groupClick = (link) => {
        navigate('/groups');
    };
    
    const loginformClick = () => {
        navigate('/login');
    };
    const handleGamleIntro = () => {
        navigate('/gamleintro');
    };
    const isEmptyObject = userAuthData && Object.keys(userAuthData).length === 0;
    const { dragScrollRef, dragScrollHandlers } = useDragScroll();

    // Prototype of the PRE-account homepage's clickable explainer phrases -
    // only these two are wired up for now so Cassandra can see the look and
    // feel before the rest of the pop-ups (and admin-editable wording) are
    // built out.
    const [activeHomePopup, setActiveHomePopup] = useState(null);

    const [homepageText, setHomepageText] = useState({ heading: '', text1: '', text2: '', text3: '' });
    useEffect(() => {
    // Fetch homepage text
    Axios.get(`${baseURL}/user/get-homepage-text.php`)
            .then((res) => {
                if (res.status === 200) {
                    setHomepageText(res.data);
                } else {
                    console.warn("No homepage text found");
                }
            })
            .catch((err) => {
                console.error("Error fetching homepage text:", err);
            });
    }, [baseURL]);

    const cleanText = (homepageText?.text1 || '')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const parts = cleanText.split('[Invite Friends]');

    const inviteFriends = async () => {
        const frontendURL = window.location.origin;
        const fullName = userAuthData.firstname && userAuthData.lastname
        ? `${userAuthData.firstname} ${userAuthData.lastname}`
        : 'A friend';

        const message = `${fullName} has invited you to create an account on WordGAMLE.com\n\n👉 Enter ‘Casa’ (case sensitive) to get into the site!`;

        const shareData = {
            title: 'Join WordGAMLE!',
            text: message,
            url: frontendURL,
        };

        if (navigator.share) {
            
            try {
            await navigator.share(shareData);
            
            } catch (err) {
            console.error('Share failed:', err);
            }
        } else {
            try {
            await navigator.clipboard.writeText(`${message}\n${shareData.url}`);
            alert('Invite message copied to clipboard!');
            } catch (err) {
            alert('Could not copy. Please share manually.');
            }
        }
    };
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        // Helper
        const formatLocalDateTime = (date) => {
            const pad = (n) => n.toString().padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
                + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        };

        let todayFormatted = "";
        let yesterdayFormatted = "";

       
        //get all group id
        useEffect(() => {
        const fetchUserGroups = async () => {
            try {
            const response = await Axios.get(`${baseURL}/groups/get-user-groups-data.php`, {
                params: { user_id: userId },
            });
            setAllGroup(response.data);
            
            } catch (error) {
            console.error("Error fetching user joined groups:", error);
            }
        };
    
        if (userId) fetchUserGroups();
        }, [userId]);
        
       useEffect(() => {
        if (!userAuthData?.id) return;
        const localDate = new Date();
        const offsetMinutes = localDate.getTimezoneOffset();
        const adjustedDate = new Date(localDate.getTime() - offsetMinutes * 60000);
        const todayFormatted = adjustedDate.toISOString().slice(0, 10);
        const hours = localDate.getHours();
        const groupPeriod = hours < 12 ? "AM" : "PM";

        const groupGameMap = allGroup.map(group => ({
          groupId: group.id,
          selectedGame: group.selected_games
        }));

        const params = { 
            baseURL: baseURL,
            user_id: userAuthData.id,  
            today: todayFormatted,
            period: groupPeriod,
            game: groupGameMap,
            createdat : formatLocalDateTime(today)
        };
        Axios.get(`${baseURL}/user/get-day-winner.php`, { params })
        }, [userAuthData?.id]);

    return isAuthenticated ? (
        <Container className="login-section">
            <Row className="align-content-center justify-content-center text-center">
                <Col md={6} className='bg-white px-3 py-3 text-center'>
                    <Row>
                        <Col>
                            
                            {!userAuthData || isEmptyObject ? (

                                <>
                                    {/* Content for users who have NOT created an account */}
                                    <h5 className="text-center fw-bold" style={{ marginBottom: '2px' }}>Welcome to</h5>
                                    <p className="text-center mb-3">
                                        <img src={WordGamleLogo} alt="WordGAMLE" style={{ maxWidth: '220px' }} />
                                    </p>
                                    <p className="text-center">Your one-stop-shop for all things Word Games.</p>

                                    <p className="text-center">
                                        <button type="button" className="home-popup-link" onClick={() => setActiveHomePopup('shareChat')}>Share and Chat</button>
                                        {' '}with friends &amp; family,<br />
                                        Create <button type="button" className="home-popup-link" onClick={() => setActiveHomePopup('groups')}>Groups</button>
                                        {' '}with <button type="button" className="home-popup-link" onClick={() => setActiveHomePopup('leaderboards')}>Leaderboards</button>,<br />
                                        find <button type="button" className="home-popup-link" onClick={() => navigate('/gametips')}>Tips and Tricks</button>
                                        {' '}and...
                                    </p>

                                    <p className="text-center fw-bold">Get your GAMLE on!</p>

                                    <Row className='custom-button-row pb-3'>
                                        <Col>
                                            <Link className="btn btn-primary my-2 w-100" to={registerPath}>Create Account</Link>
                                        </Col>
                                        <Col>
                                            <Button className="my-2 w-100 white-btn" onClick={loginformClick}>Log In</Button>
                                        </Col>
                                    </Row>

                                    <h5 className="text-center fw-bold mb-4">How it works...</h5>

                                    {/* Step 1 - Play */}
                                    <div className="text-center mb-4">
                                        <div className="home-step-circle mx-auto">1</div>
                                        <p className="fw-bold mb-1" style={{ color: 'var(--wordgamle-accent)' }}>PLAY</p>
                                        <p className="fw-bold mb-1">Play your favorite word games</p>
                                        <p className="mb-2">Currently we feature:</p>
                                        <div className="game-select-row" ref={dragScrollRef} {...dragScrollHandlers}>
                                            <Button className="wordle-btn game-select-btn" onClick={() => handleNavigation('wordle')}>Wordle</Button>
                                            <Button className="connections-btn game-select-btn" onClick={() => handleNavigation('connections')}>Connections</Button>
                                            <Button className="phrazle-btn game-select-btn" onClick={() => handleNavigation('phrazle')}>Phrazle</Button>
                                            <Button className="quordle-btn game-select-btn" onClick={() => handleNavigation('quordle')}>Quordle</Button>
                                            <Button className="octordle-btn game-select-btn" onClick={() => handleNavigation('octordle')}>Octordle</Button>
                                        </div>
                                        <p className="mt-2 mb-0 fw-bold">With more games to come!</p>
                                    </div>

                                    {/* Step 2 - Store */}
                                    <div className="text-center mb-4">
                                        <div className="home-step-circle mx-auto">2</div>
                                        <p className="fw-bold mb-1" style={{ color: 'var(--wordgamle-accent)' }}>STORE</p>
                                        <p className="fw-bold mb-1">Paste your results into WordGAMLE</p>
                                        <p className="mb-1">Copy &amp; paste your game result into the box provided.</p>
                                        <p className="mb-1">
                                            <button type="button" className="home-popup-link" onClick={() => setActiveHomePopup('storeHowTo')}>CLICK HERE to see how!</button>
                                        </p>
                                        <p className="mb-0">
                                            You'll see <button type="button" className="home-popup-link" onClick={() => setActiveHomePopup('enhancedStats')}>enhanced Stats</button>
                                            {' '}and a <button type="button" className="home-popup-link" onClick={() => setActiveHomePopup('gamleScore')}>Gamle Score</button> for each game.
                                        </p>
                                    </div>

                                    {/* Step 3 - Share & Compare */}
                                    <div className="text-center mb-4">
                                        <div className="home-step-circle mx-auto">3</div>
                                        <p className="fw-bold mb-1" style={{ color: 'var(--wordgamle-accent)' }}>SHARE &amp; COMPARE</p>
                                        <p className="fw-bold mb-1">Share and Create Leaderboards</p>
                                        <p className="mb-0">
                                            <button type="button" className="home-popup-link" onClick={() => setActiveHomePopup('shareChat')}>Share</button>
                                            {' '}your results with fellow Gamlers,<br />
                                            Compete with friends in Daily,<br />
                                            Monthly and Yearly{' '}
                                            <button type="button" className="home-popup-link" onClick={() => setActiveHomePopup('leaderboards')}>Group Leaderboards</button>
                                            {' '}and<br />
                                            <button type="button" className="home-popup-link" onClick={() => setActiveHomePopup('trackResults')}>Track your results and stats over time</button>!
                                        </p>
                                    </div>

                                    <Row className='custom-button-row pb-3'>
                                        <Col>
                                            <Link className="btn btn-primary my-2 w-100" to={registerPath}>Create Your Account Today</Link>
                                        </Col>
                                    </Row>
                                    <Row className='custom-button-row pb-3'>
                                        <Col>
                                            <Button className="my-2 w-100 white-btn" onClick={loginformClick}>
                                                Already have an account?<br />Log In Here
                                            </Button>
                                        </Col>
                                    </Row>

                                    <HomeInfoPopup
                                        show={activeHomePopup === 'shareChat'}
                                        onHide={() => setActiveHomePopup(null)}
                                        image={shareChatPopupImg}
                                        alt="Example of a group's shared leaderboard and chat"
                                    />
                                    <HomeInfoPopup
                                        show={activeHomePopup === 'storeHowTo'}
                                        onHide={() => setActiveHomePopup(null)}
                                        image={storeHowToPopupImg}
                                        alt="How to copy and paste your game result into WordGAMLE"
                                    />
                                    <HomeInfoPopup
                                        show={activeHomePopup === 'groups'}
                                        onHide={() => setActiveHomePopup(null)}
                                        image={groupsPopupImg}
                                        alt="Example of a group's member list"
                                    />
                                    <HomeInfoPopup
                                        show={activeHomePopup === 'leaderboards'}
                                        onHide={() => setActiveHomePopup(null)}
                                        image={leaderboardsPopupImg}
                                        alt="Example of Daily, Weekly, Monthly and Yearly group leaderboards"
                                    />
                                    <HomeInfoPopup
                                        show={activeHomePopup === 'enhancedStats'}
                                        onHide={() => setActiveHomePopup(null)}
                                        image={enhancedStatsPopupImg}
                                        alt="Example of enhanced stats for a game"
                                    />
                                    <HomeInfoPopup
                                        show={activeHomePopup === 'gamleScore'}
                                        onHide={() => setActiveHomePopup(null)}
                                        image={gamleScorePopupImg}
                                        alt="Example of a Gamle Score"
                                    />
                                    <HomeInfoPopup
                                        show={activeHomePopup === 'trackResults'}
                                        onHide={() => setActiveHomePopup(null)}
                                        image={trackResultsPopupImg}
                                        alt="Example of tracking your results and stats over time"
                                    />
                                </>
                            ) : (
                                <>
                                    {/* Content for users who HAVE created an account */}
                                    <p className="text-center mb-3">
                                        <img src={WordGamleLogo} alt="WordGAMLE" style={{ maxWidth: '220px' }} />
                                    </p>
                                    <h5 className="text-center fw-bold">Your one-stop-shop for all things Word Games.</h5>
                                    <p className="text-center text-muted">Click on each game button to see how to enter and store your word game results.</p>

                                    <div className="game-select-row" ref={dragScrollRef} {...dragScrollHandlers}>
                                        <Button className="wordle-btn game-select-btn" onClick={() => handleNavigation('wordle')}>Wordle</Button>
                                        <Button className="connections-btn game-select-btn" onClick={() => handleNavigation('connections')}>Connections</Button>
                                        <Button className="phrazle-btn game-select-btn" onClick={() => handleNavigation('phrazle')}>Phrazle</Button>
                                        <Button className="quordle-btn game-select-btn" onClick={() => handleNavigation('quordle')}>Quordle</Button>
                                        <Button className="octordle-btn game-select-btn" onClick={() => handleNavigation('octordle')}>Octordle</Button>
                                    </div>

                                    <h5 className="text-center fw-bold mt-4">Ready to compete?</h5>
                                    <p className="text-center">
                                        <button type="button" className="home-popup-link" onClick={inviteFriends}>Invite friends</button>
                                        {' '}and <Link to="/groups" className="home-popup-link">create groups</Link> for Leaderboards and chatting!
                                    </p>

                                    <h5 className="text-center fw-bold mt-4 mb-3">Share with other Gamlers?</h5>
                                    <GameFeed userId={userId} username={userAuthData?.username} avatar={userAuthData?.avatar} baseURL={baseURL} />
                                </>
                            )}

                        </Col>
                    </Row>
                </Col>
            </Row>
            
        </Container>
        
    ) : (
        <Container className="login-section">
            <Row className="align-content-center justify-content-center">
                <Col md={6} className='bg-white px-3 py-3 text-center'>
                    <p className='fs-4 text-center'>Enter Password to Access</p>
                    <Form onSubmit={handlePasswordSubmit}>
                        <InputGroup className="my-3">
                            <Form.Control
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter password"
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
                </Col>
            </Row>
        </Container>
    );
}

export default Home;
