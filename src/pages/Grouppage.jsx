import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import Axios from 'axios';
import AddMembers from '../constant/Models/AddMembers';
import { toast } from 'react-toastify';
import MemberGameSelections from './MemberGameSelections';
import SelectScoringMethod from './SelectScoringMethod';
import GameNotificationToggle from './GameNotificationToggle';
import GroupGameChat from './GroupLeaderboard/GroupGameChat';
import dayjs from 'dayjs';
// import InviteGroupAndSite from './InviteGroupAndSite';

// Canonical display order for game leaderboard buttons - matches
// GroupStats.jsx's own ordering, so this page reads the same way.
const GAME_ORDER = ["wordle", "connections", "phrazle", "quordle", "octordle"];
const sortByGameOrder = (games) =>
    [...games].sort((a, b) => GAME_ORDER.indexOf(a.toLowerCase()) - GAME_ORDER.indexOf(b.toLowerCase()));

function GroupPage() {
    const baseURL = import.meta.env.VITE_BASE_URL;
    const { id } = useParams();
    const navigate = useNavigate();
    const USER_AUTH_DATA = JSON.parse(localStorage.getItem('auth')) || {};
    const { id: userId } = USER_AUTH_DATA;
    const usertimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const [group, setGroup] = useState(null);
    const [showMemberForm, setShowMemberForm] = useState(false);
    const [isCaptain, setIsCaptain] = useState(false);
    const [existingMembers, setExistingMembers] = useState([]); // NEW
    const [selectedGames, setSelectedGames] = useState([]);

    useEffect(() => {
        const fetchGroupDetails = async () => {
            try {
                const res = await Axios.get(`${baseURL}/groups/get-groups.php?id=${id}`);
                if (res.data.status === "success" && res.data.groups.length > 0) {
                    const fetchedGroup = res.data.groups[0];
                    setGroup(fetchedGroup);
                    setIsCaptain(fetchedGroup.captain_id === userId);
                } else {
                    setGroup(null);
                    toast.error("Group not found.");
                }
            } catch (err) {
                setGroup(null);
                toast.error("Failed to load group details.");
            }
        };

        const fetchGroupMembers = async () => {
            try {
                const res = await Axios.get(`${baseURL}/groups/get-group-members.php?group_id=${id}`);

                if (res.data.status === "success") {
                   const memberIds = res.data.members.map(m => String(m.member_id));
                    setExistingMembers(memberIds);
                } else {
                    setExistingMembers([]);
                }
            } catch (err) {
                console.error("Failed to fetch group members");
                setExistingMembers([]);
            }
        };

        fetchGroupDetails();
        fetchGroupMembers();
    }, [id, userId]);

    // The game buttons and general chat this page now leads with - the same
    // data GroupStats.jsx (the standalone hub, still used elsewhere and left
    // untouched) fetches for itself.
    useEffect(() => {
        const fetchSelectedGames = async () => {
            try {
                const res = await Axios.get(`${baseURL}/groups/get-selected-games.php`, {
                    params: { user_id: userId, group_id: id }
                });
                let userGames = res.data.selected_games;

                if (typeof userGames === "string") {
                    userGames = userGames.split(",").map(game => game.trim());
                }

                if (Array.isArray(userGames)) {
                    setSelectedGames(sortByGameOrder(userGames));
                } else {
                    console.error("Invalid data format for selected games:", userGames);
                    setSelectedGames([]);
                }
            } catch (error) {
                console.error("Error fetching selected games:", error);
                setSelectedGames([]);
            }
        };

        if (userId) {
            fetchSelectedGames();
        }
    }, [userId, id]);

    const goToGroupInfo = () => {
        navigate(`/group-info/${id}`);
    };

    const [leaderboardText, setLeaderboardText] = useState({ text4: '', text5: '' });
    useEffect(() => {
    // Fetch homepage text
    Axios.get(`${baseURL}/user/get-homepage-text.php`)
            .then((res) => {
                if (res.status === 200) {
                    setLeaderboardText(res.data);
                } else {
                    console.warn("No homepage text found");
                }
            })
            .catch((err) => {
                console.error("Error fetching homepage text:", err);
            });
    }, [baseURL]);

    if (!group) return null;

    return (
        <Container className="text-center">
            {/* Matches GroupStats.jsx's own width (Col md={6}) so the game
                buttons and chat look the same size on desktop whichever
                page led here. */}
            <Row className="justify-content-center">
                <Col md={6} className="text-center mt-4">
                    <h4 className="text-capitalize pb-2">{group.name}</h4>
                    <h5 className="pb-3">Group Leaderboards</h5>

                    <Row>
                        {selectedGames.length > 0 && selectedGames.map((game, index) => (
                            <Col key={index} className="text-center mb-2">
                                <Button
                                    className="btn-lg btn-block w-100"
                                    onClick={() => navigate(`/group/${id}/stats/${game.toLowerCase()}`)}
                                >
                                    {game}
                                </Button>
                            </Col>
                        ))}
                    </Row>

                    <Row>
                        <Col className="mt-2">
                            <GroupGameChat
                                groupId={id}
                                createdAt={dayjs().format("YYYY-MM-DD HH:mm:ss")}
                                userTimezone={usertimezone}
                                generalChat="true"
                                userId={userId}
                                chatBoxHeight="180px"
                            />
                        </Col>
                    </Row>
                </Col>
            </Row>

            <Row>
                <Col>
                    <Button className="px-5 mt-3" onClick={goToGroupInfo}>
                        Group Info
                    </Button>
                </Col>
            </Row>
            {isCaptain && (
                <>
                <Row>
                    <Col>
                        <Button className="px-5 mt-3" onClick={() => setShowMemberForm(true)}>
                            Add Group Members
                        </Button>
                    </Col>
                </Row>
                {/* <Row className='justify-content-center'>
                    <Col md={4} className="px-5 mt-3">
                        <InviteGroupAndSite groupId={group.id} />
                    </Col>
                </Row> */}
                </>
            )}

            <MemberGameSelections leaderboardText={leaderboardText} />
            {isCaptain && <SelectScoringMethod  leaderboardText={leaderboardText}/>}
            <GameNotificationToggle/>
            <AddMembers
                showForm={showMemberForm}
                handleFormClose={() => setShowMemberForm(false)}
                groupName={group.name}
                groupId={group.id}
                existingMembers={existingMembers}
                allowNewGamlerInvite
            />
        </Container>
    );
}

export default GroupPage;
