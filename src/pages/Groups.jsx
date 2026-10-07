import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import Axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import CreateGroupWizard from '../components/CreateGroupWizard';

function Groups() {
    const baseURL = import.meta.env.VITE_BASE_URL;
    const USER_AUTH_DATA = JSON.parse(localStorage.getItem('auth')) || {};

    const { id: userId, username: loginUsername, email: loginUserEmail } = USER_AUTH_DATA;

    const [groups, setGroups] = useState([]); // Groups created by the user
    const [memberGroups, setMemberGroups] = useState([]); // Groups where the user is a member
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [isFirstGroup, setIsFirstGroup] = useState(false);
    const [userData, setUserData] = useState({});

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const resCreated = await Axios.post(`${baseURL}/groups/get-groups.php`, { user_id: userId });
                setGroups(resCreated.data.groups || []);

                const resMember = await Axios.post(`${baseURL}/groups/get-groups.php`, { member_id: userId });
                setMemberGroups(resMember.data.groups || []);
            } catch (err) {
                toast.error("Failed to load groups.");
            }
        };

        const fetchUserData = async () => {
            try {
                const res = await Axios.get(`${baseURL}/user/get-user.php`, {
                    params: { useremail: loginUserEmail }
                });
                setUserData(res.data.user || {});
            } catch (err) {
                toast.error("Failed to load user data.");
            }
        };

        fetchGroups();
        fetchUserData();
    }, [userId, loginUserEmail]);

    const handleCreateFormClose = () => {
        setShowCreateForm(false);
    };

    // Lets a link elsewhere in the app (e.g. the homepage's "create
    // groups") land here with the Create Group popup already open,
    // instead of making the person find and click the button themselves.
    useEffect(() => {
        if (new URLSearchParams(location.search).get('create') === '1') {
            handleShowCreateForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleShowCreateForm = () => {
        if (!loginUsername || !loginUserEmail) {
            toast.error("Please log in to create a group.");
            return;
        }
        // "Your first WordGAMLE group" on the wizard's success screen
        // only applies if this Gamler has never captained one before -
        // captured here, before the wizard creates anything, so it can't
        // be thrown off by the new group landing in this same list a
        // moment later.
        setIsFirstGroup(groups.length === 0);
        setShowCreateForm(true);
    };

    const handleGroupCreated = (newGroupId, newGroupName) => {
        setGroups((prev) => [...prev, { id: newGroupId, name: newGroupName }]);
    };

    return (
        <>
            <Container>
                <Row className="justify-content-center">
                    <Col md={6} className="border p-3 shadow rounded text-center">
                        <h4>Groups Created By Me</h4>
                        <div className="row justify-content-center py-3">
                            {groups.length > 0 ? (
                                groups.map((group, index) => (
                                <div key={index} className="col-6 col-sm-4 col-md-3 mb-3 d-flex justify-content-center">
                                    <Button
                                    variant="outline-primary"
                                    className="w-100 text-wrap"
                                    onClick={() =>
                                        navigate(
                                        `/group/${group.id}/`
                                        )
                                    }
                                    >
                                    {group.name}
                                    </Button>
                                </div>
                                ))
                            ) : (
                                <p>No groups available.</p>
                            )}
                        </div>

                        {userData.is_paused === 0 && (
                            <Row>
                                <Col>
                                <Button className="px-5 mt-3" onClick={handleShowCreateForm}>
                                    Create Group
                                </Button>
                                </Col>
                            </Row>
                        )}

                    </Col>
                </Row>

                {/* Groups where the user is a member */}
                <Row className="justify-content-center pt-4">
                    <Col md={6} className="border p-3 shadow rounded text-center">
                        <h4>Member in Groups</h4>

                        <div className="row justify-content-center py-3">
                            {(() => {
                                const visibleGroups = memberGroups.filter(
                                    group => userId !== Number(group.captain_id)
                                );

                                return visibleGroups.length > 0 ? (
                                    visibleGroups.map(group => (
                                        <div
                                            key={group.id}
                                            className="col-6 col-sm-4 col-md-3 mb-3 d-flex justify-content-center"
                                        >
                                            <Button
                                                variant="outline-primary"
                                                className="w-100 text-wrap"
                                                onClick={() => navigate(`/group/${group.id}`)}
                                            >
                                                {group.name}
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted text-center w-100 mb-0">
                                        Group not found
                                    </p>
                                );
                            })()}
                        </div>
                    </Col>
                </Row>


                {/* Create Group wizard: name -> games -> scoring method ->
                    add members -> success, one guided sequence instead of
                    a single name-only popup. */}
                <CreateGroupWizard
                    show={showCreateForm}
                    onClose={handleCreateFormClose}
                    onCreated={handleGroupCreated}
                    isFirstGroup={isFirstGroup}
                    userId={userId}
                />
            </Container>
        </>
    );
}

export default Groups;
