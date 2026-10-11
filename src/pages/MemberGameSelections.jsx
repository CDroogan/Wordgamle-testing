import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import Axios from "axios";
import { useParams } from "react-router-dom";
import { toast } from 'react-toastify';
import dayjs from "dayjs";

// bare=true skips this component's own outer Container/Row/Col and
// bordered box - used when it's already inside another container that
// provides its own visual boundary (e.g. GroupInfo.jsx's Change
// Preferences modal), so the two don't nest into a "box within a box".
function MemberGameSelections({ leaderboardText, bare = false }) {
    const baseURL = import.meta.env.VITE_BASE_URL;
    const { id: groupId } = useParams(); // Get group ID from URL
    const [selectedGames, setSelectedGames] = useState([]);
    const [Games, setGames] = useState([]); // Store selected games from backend
    const USER_AUTH_DATA = JSON.parse(localStorage.getItem("auth"));
    const userId = USER_AUTH_DATA?.id;

    useEffect(() => {
        const fetchSelectedGames = async () => {
            if (!groupId || !userId) return;
            try {
                const res = await Axios.get(`${baseURL}/groups/get-selected-games.php`, {
                    params: { user_id: userId, group_id: groupId }
                });
    
                if (res.data.status === "success") {
                    let fetchedGames = res.data.selected_games;
    
                    if (typeof fetchedGames === "string") {
                        fetchedGames = fetchedGames.split(",").map(game => game.trim()); // Convert string to array
                    }
    
                    if (Array.isArray(fetchedGames)) {
                        setGames(fetchedGames);
                        setSelectedGames(fetchedGames); // Update checkboxes
                    } else {
                        console.error("Invalid data format for selected games:", fetchedGames);
                    }
                } else {
                    toast.error("Scoring method not found.");
                }
            } catch (err) {
                toast.error("Failed to load group info.");
            }
        };
    
        fetchSelectedGames();
    }, [groupId, userId]);
    

    const handleGameSelection = (game) => {
        setSelectedGames((prevGames) =>
            prevGames.includes(game)
                ? prevGames.filter((g) => g !== game) // Remove if already selected
                : [...prevGames, game] // Add if not selected
        );
    };

    const saveSelectedGames = async () => {
        if (!userId || !groupId) {
            toast.error("Invalid user or group.");
            return;
        }

        try {
            const res = await Axios.post(`${baseURL}/groups/update-games.php`, {
                userId,
                groupId,
                selectedGames,
                // The Gamler's own local time - the server runs on UTC, which
                // would otherwise record an evening opt-in as starting the
                // next calendar day for anyone west of UTC.
                createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss")
            });

            if (res.data.status === "success") {
                toast.success("Game preferences updated!");
            } else {
                toast.error("Failed to update preferences.");
            }
        } catch (err) {
            toast.error("Error updating game preferences.");
        }
    };



    const content = (
        <div className={bare ? '' : 'border p-3 shadow rounded mt-4'}>
            <h5>Select Leaderboard Games:</h5>
            <p dangerouslySetInnerHTML={{ __html: leaderboardText.text4 }}></p>
            <Form className="d-flex flex-wrap justify-content-center">
                {["Wordle", "Connections", "Phrazle", "Quordle", "Octordle"].map((game, index) => (
                    <div key={index} className="form-check mx-2">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id={`game-${game}`}
                            checked={selectedGames.includes(game)}
                            onChange={() => handleGameSelection(game)}
                        />
                        <label className="form-check-label" htmlFor={`game-${game}`}>
                            {game}
                        </label>
                    </div>
                ))}
            </Form>
            <div className="text-center">
                <Button className="mt-3" onClick={saveSelectedGames}>
                    Save Preferences
                </Button>
            </div>
        </div>
    );

    if (bare) {
        return content;
    }

    return (
        <Container>
            <Row className="justify-content-center pt-4">
                <Col md={6}>
                    {content}
                </Col>
            </Row>
        </Container>
    );
}

export default MemberGameSelections;
