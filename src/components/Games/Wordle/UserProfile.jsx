import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Form, Button, InputGroup, Modal } from 'react-bootstrap';
import Axios from "axios";
import { toast } from 'react-toastify';
import { useNavigate } from "react-router-dom";
import Logo from '../../../Logo.png';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { FaPencilAlt, FaUpload } from 'react-icons/fa';
import ImageCropModal from './Modals/ImageCropModal';
import AcceptInviteWizard from '../../AcceptInviteWizard';

function UserProfile() {
    const baseURL = import.meta.env.VITE_BASE_URL;
    const [userData, setUserData] = useState({});
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [phone, setPhone] = useState("");
    const [avatar, setAvatar] = useState(null); // cropped blob
    const [previewUrl, setPreviewUrl] = useState('');
    const [showCropModal, setShowCropModal] = useState(false);
    const [rawImage, setRawImage] = useState(null); // original file preview
    const [password, setPassword] = useState("");
    const [confirmpassword, setConfirmpassword] = useState("");
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const cropperRef = useRef(null);
    const [errors, setErrors] = useState({});
    const [isPaused, setIsPaused] = useState(false);
    const [showPauseConfirm, setShowPauseConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [showDeletePassword, setShowDeletePassword] = useState(false);

    const USER_AUTH_DATA = JSON.parse(localStorage.getItem('auth'));
    const loginuserEmail = USER_AUTH_DATA?.email;
    const userId = USER_AUTH_DATA?.id;

    const togglePasswordVisibility = () => setShowPassword(!showPassword);
    const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

    const [showManage, setShowManage] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [showAcceptWizard, setShowAcceptWizard] = useState(false);
    const [acceptedInvite, setAcceptedInvite] = useState(null);
    const [showNotificationsSoon, setShowNotificationsSoon] = useState(false);
    const [pendingFriendRequests, setPendingFriendRequests] = useState([]);

    const [registrationformText, setRegistrationFormText] = useState({
            firstname_label: '',
            firstname_desc: '',
            firstname_placeholder: '',
            lastname_label: '',
            lastname_desc: '',
            lastname_placeholder: '',
            username_label: '',
            username_desc: '',
            username_placeholder: '',
            email_label: '',
            email_desc: '',
            email_placeholder: '',
            phone_label: '',
            phone_desc: '',
            phone_placeholder: '',
            password_label: '',
            password_desc: '',
            password_placeholder: '',
            confirm_password_label: '',
            confirm_password_desc: '',
            confirm_password_placeholder: '',
            profile_picture_label: '',
            profile_picture_desc: '',
            profile_picture_placeholder: '',
    });

    useEffect(() => {
        Axios.get(`${baseURL}/user/get-homepage-text.php`)
          .then((res) => {
            if (res.status === 200) {
              setRegistrationFormText(res.data);
            } else {
              console.warn('No homepage text found');
            }
          })
          .catch((err) => {
            console.error('Error fetching homepage text:', err);
          });
    }, [baseURL]);
        
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await Axios.get(`${baseURL}/user/get-user.php?useremail=${loginuserEmail}`);
                if (res.data) {
                    setUserData(res.data.user);
                    setFirstName(res.data.user.first_name || "");
                    setLastName(res.data.user.last_name || "");
                    setUsername(res.data.user.username || "");
                    setPhone(res.data.user.phone || "");
                    setPreviewUrl(res.data.user.avatar || "");
                    setIsPaused(res.data.user.is_paused === 1);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };
        if (loginuserEmail) fetchUserData();
    }, [loginuserEmail]);

    // Pending Invitations: accept/decline now live here instead of the
    // bell dropdown, so a Gamler always has one obvious place to deal
    // with them - polled lightly so one that arrives while this page is
    // already open still shows up without a manual refresh.
    const fetchPendingInvites = async () => {
        try {
            const res = await Axios.get(`${baseURL}/groups/get-invites.php?user_id=${userId}`);
            setPendingInvites(Array.isArray(res.data.invitations) ? res.data.invitations : []);
        } catch (error) {
            console.error("Error fetching pending invitations:", error);
        }
    };

    useEffect(() => {
        if (!userId) return;
        fetchPendingInvites();
        const interval = setInterval(fetchPendingInvites, 15000);
        return () => clearInterval(interval);
    }, [userId]);

    // Pending GamleFriend Requests - same "always one obvious place to
    // deal with it" rationale as Pending Invitations above, polled the
    // same way. Kept completely separate (own table, own endpoints) since
    // friend requests aren't tied to a group.
    const fetchPendingFriendRequests = async () => {
        try {
            const res = await Axios.get(`${baseURL}/friends/get-pending-requests.php?user_id=${userId}`);
            setPendingFriendRequests(Array.isArray(res.data.requests) ? res.data.requests : []);
        } catch (error) {
            console.error("Error fetching pending friend requests:", error);
        }
    };

    useEffect(() => {
        if (!userId) return;
        fetchPendingFriendRequests();
        const interval = setInterval(fetchPendingFriendRequests, 15000);
        return () => clearInterval(interval);
    }, [userId]);

    const handleAcceptFriendRequest = async (request) => {
        try {
            await Axios.post(`${baseURL}/friends/accept-request.php`, {
                user_id: userId,
                request_id: request.id,
            });
            setPendingFriendRequests((prev) => prev.filter((r) => r.id !== request.id));
        } catch (error) {
            toast.error("Failed to accept friend request.");
        }
    };

    const handleDeclineFriendRequest = async (request) => {
        try {
            await Axios.post(`${baseURL}/friends/decline-request.php`, {
                user_id: userId,
                request_id: request.id,
            });
            setPendingFriendRequests((prev) => prev.filter((r) => r.id !== request.id));
        } catch (error) {
            toast.error("Failed to decline friend request.");
        }
    };

    const handleAcceptInvite = async (invite) => {
        const date = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const formattedDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        try {
            await Axios.post(`${baseURL}/groups/accept-invite.php`, {
                user_id: userId,
                invite_id: invite.id,
                group_id: invite.group_id,
                formattedDate,
            });
            setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id));
            setAcceptedInvite(invite);
            setShowAcceptWizard(true);
        } catch (error) {
            toast.error("Failed to accept invitation.");
        }
    };

    const handleDeclineInvite = async (invite) => {
        try {
            await Axios.post(`${baseURL}/groups/decline-invite.php`, {
                user_id: userId,
                invite_id: invite.id,
            });
            setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id));
        } catch (error) {
            toast.error("Failed to decline invitation.");
        }
    };

    // A modern phone photo's file SIZE can be small (a 140KB JPG) while
    // its PIXEL dimensions are still huge (4000x3000+), since that's just
    // JPEG compression. Handing that straight to the cropper's canvas can
    // exceed mobile Safari's canvas memory limit, which doesn't throw a
    // catchable JS error - it just silently reloads the page, wiping all
    // state, which looks exactly like "the whole thing disappears and I'm
    // back on the Profile page with no image showing". Downscaling to a
    // safe max dimension here, before the image ever reaches the cropper,
    // avoids that regardless of the original photo's dimensions.
    const MAX_UPLOAD_DIMENSION = 1600;

    // Picking from the full Gallery/Photos library (as opposed to the
    // phone's quick "Recent" strip) hands off to a much heavier Android
    // system picker - it browses/generates thumbnails for the whole
    // library and can take noticeably longer, which raises the odds
    // Android/Chrome decide to reclaim memory by discarding this
    // backgrounded tab while that picker is open. When that happens,
    // Chrome silently reloads the page once focus returns - the crop
    // screen (already drawn onscreen before the discard) briefly stays
    // visible, then the fresh reload replaces it with a plain Profile
    // page, which looks exactly like "the function just closes." That's
    // an OS-level memory decision this app can't prevent, but stashing
    // the already-downscaled photo here means a reload can recover it:
    // the mount effect below reopens the crop screen with the same photo
    // instead of the user losing their selection entirely.
    const PENDING_AVATAR_CROP_KEY = 'wg_pending_avatar_crop';

    useEffect(() => {
        try {
            const saved = sessionStorage.getItem(PENDING_AVATAR_CROP_KEY);
            if (saved) {
                setRawImage(saved);
                setShowCropModal(true);
            }
        } catch (err) {
            // Ignore - sessionStorage can be unavailable (private
            // browsing, blocked site data); worst case is just no
            // auto-recovery, not a broken page.
        }
    }, []);

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // A photo picked from Gallery is the original, full-resolution
        // file (often 5-15MB+) - a phone's "Recent" shots are frequently
        // much smaller (e.g. a screenshot), which is why this only ever
        // failed for Gallery photos. Reading it via FileReader first would
        // hold the entire file as a base64 JS string (~1.33x its size) in
        // memory before any downscaling ever happens - on a memory-limited
        // phone that allocation alone can crash the tab/WebView, which
        // looks exactly like "the picker just closes." An object URL is
        // just a lightweight reference the browser's own (native, far more
        // memory-efficient) image decoder resolves directly, so the
        // original file's bytes never have to go through JS as a string at
        // all before being downscaled into the small canvas below.
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setRawImage(dataUrl); // show in cropper
            setShowCropModal(true);
            URL.revokeObjectURL(objectUrl);
            try {
                sessionStorage.setItem(PENDING_AVATAR_CROP_KEY, dataUrl);
            } catch (err) {
                // Quota or unavailable storage - fine, just no auto-recovery.
            }
        };
        img.onerror = () => {
            toast.error("Could not read that image. Please try a different photo.");
            URL.revokeObjectURL(objectUrl);
        };
        img.src = objectUrl;
    };

    // Left as a direct URL (not run through loadScaledImageDataUrl) - that
    // helper draws the image into a canvas, which the browser blocks
    // ("tainted canvas") for a cross-origin image unless the server sends
    // matching CORS headers on that static file request, which a plain
    // Apache-served /user/uploads/ file isn't guaranteed to do. This path
    // already worked before, so it's left alone rather than risking that
    // regression for a case that wasn't reported as broken.
    const handleAvatarClick = () => {
        if (previewUrl && !previewUrl.startsWith("blob:")) {
            setRawImage(`${baseURL}/user/uploads/${previewUrl}`);
            setShowCropModal(true);
        }
    };

    // Crop Image is the one and only save action for a new photo - nothing
    // else on this page persists it, so it must save immediately rather
    // than waiting for a separate "Update Profile" click buried in the
    // Profile Settings modal. That disconnect (introduced when Profile
    // Settings was split into its own modal) is what caused newly cropped
    // photos to silently never actually save.
    const clearPendingAvatarCrop = () => {
        try {
            sessionStorage.removeItem(PENDING_AVATAR_CROP_KEY);
        } catch (err) {
            // Ignore - nothing to clean up if storage isn't available.
        }
    };

    const cropImage = () => {
        const cropper = cropperRef.current?.cropper;
        if (cropper && cropper.getCroppedCanvas()) {
            cropper.getCroppedCanvas().toBlob(async (blob) => {
                if (!blob) return;

                const objectUrl = URL.createObjectURL(blob);
                setAvatar(blob);
                setPreviewUrl(objectUrl);
                setRawImage(null);
                setShowCropModal(false);
                clearPendingAvatarCrop();

                try {
                    const formData = new FormData();
                    formData.append("id", userData.id);
                    formData.append("firstName", firstName);
                    formData.append("lastName", lastName);
                    formData.append("username", username);
                    formData.append("phone", phone);
                    formData.append("avatar", blob);

                    const response = await Axios.post(`${baseURL}/user/edit-user.php`, formData);

                    if (response.data.status === "success") {
                        toast.success("Profile picture updated!");
                        // Re-read localStorage fresh here rather than reusing
                        // the USER_AUTH_DATA captured when this page last
                        // rendered - the upload can take a few seconds, and
                        // this callback keeps running even if the Gamler
                        // navigates away before it finishes (unmounting the
                        // component doesn't cancel an in-flight request).
                        // Merging onto a stale snapshot instead of whatever
                        // is actually in localStorage by the time this
                        // resolves risked clobbering a newer, legitimate
                        // value with old data.
                        const currentAuth = JSON.parse(localStorage.getItem('auth')) || {};
                        localStorage.setItem("auth", JSON.stringify({
                            ...currentAuth,
                            avatar: `${response.data.avatar || objectUrl}?t=${Date.now()}`,
                        }));
                    } else {
                        toast.error(response.data.message || "Failed to update profile picture");
                    }
                } catch (error) {
                    toast.error("Failed to update profile picture");
                }
            });
        }
    };

    const updateUser = async (e) => {
        e.preventDefault();
         
        if (password && password !== confirmpassword) {
            toast.error("Passwords do not match");
            return;
        }

        const newErrors = {};

        if (!firstName.trim()) newErrors.firstName = "First name is required";
        if (!lastName.trim()) newErrors.lastName = "Last name is required";
        if (!username.trim()) {
            newErrors.username = "Username is required";
        } else if (!/^[A-Za-z0-9.-]{2,25}$/.test(username.trim())) {
            newErrors.username = "GamleName must be 2-25 characters: letters, numbers, periods, and hyphens only (no spaces).";
        }
        if (password && password !== confirmpassword) {
            newErrors.confirmpassword = "Passwords do not match";
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        
        try {
            const formData = new FormData();
            formData.append("id", userData.id);
            formData.append("firstName", firstName);
            formData.append("lastName", lastName);
            formData.append("username", username);
            formData.append("phone", phone);
            if (password) formData.append("password", password);
            if (avatar) formData.append("avatar", avatar);

            const response = await Axios.post(
                `${baseURL}/user/edit-user.php`,
                formData
            );

            if (response.data.status === "success") {
                toast.success("Profile updated successfully!");
                // Same fresh-read fix as cropImage's save above.
                const currentAuth = JSON.parse(localStorage.getItem('auth')) || {};
                localStorage.setItem("auth", JSON.stringify({
                ...currentAuth,
                firstName,
                lastName,
                username,
                avatar: `${response.data.avatar || previewUrl}?t=${Date.now()}`
                }));
            } else {
                toast.error(response.data.message || "Failed to update profile");
            }
        } catch (error) {
            toast.error("Failed to update profile");
        }
    };

   const handlePauseToggle = async () => {
        try {
            const newPausedState = !isPaused;
            await Axios.post(`${baseURL}/user/pause-user.php`, {
                user_id: userData.id,
                is_paused: newPausedState ? 1 : 0,
            });
            setIsPaused(newPausedState);
            // toast.success(newPausedState ? "Paused Play" : "Unpaused Play");
        } catch (error) {
            toast.error("Failed to update pause state.");
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteError('');
        try {
            const response = await Axios.post(`${baseURL}/user/delete-user.php`, {
                user_id: userData.id,
                password: deletePassword,
            });
            if (!response.data.success) {
                setDeleteError(response.data.message || "Failed to delete account.");
                return;
            }
            localStorage.removeItem('auth');
            navigate('/');
        } catch (error) {
            setDeleteError("Failed to delete account.");
        }
    };

    return (
        <Container>
            <Row className="align-content-center justify-content-center">
                <Col md={5} className="d-flex flex-column" style={{ minHeight: 'calc(100vh - 160px)' }}>
                    <div className="mb-3 text-center">
                        <div className="profile-pic-wrapper">
                            <label className="profile-pic-label" onClick={handleAvatarClick}>
                                <img
                                    src={
                                        previewUrl?.startsWith("blob:")
                                            ? previewUrl
                                            : previewUrl
                                                ? `${baseURL}/user/uploads/${previewUrl}`
                                                : Logo
                                    }
                                    alt="Profile"
                                    className="profile-pic-img"
                                />
                            </label>
                            <label htmlFor="existingprofilePicInput" className="edit-icon-label" onClick={handleAvatarClick}>
                                <FaPencilAlt size={18} color="#ffffff" />
                            </label>
                             <label htmlFor="profilePicInput" className="upload-icon-label">
                                <FaUpload  size={18} color="#ffffff" />
                            </label>
                            <input
                                type="file"
                                id="profilePicInput"
                                className="profile-pic-input"
                                onChange={handleUpload}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    <div className='text-center'>
                        <h2>{username || "User"}</h2>
                        <h4>{firstName} {lastName}</h4>
                    </div>

                    {pendingInvites.length > 0 && (
                        <div className="my-4" style={{ background: '#330072', borderRadius: '1rem', padding: '1rem' }}>
                            <div className="border rounded p-3 bg-white">
                                <h5 className="mb-3">Pending Group Invitations:</h5>
                                {pendingInvites.map((invite) => (
                                    <div key={invite.id} className="mb-3">
                                        <div><strong>Group Name:</strong> {invite.group_name}</div>
                                        <div className="mb-2">
                                            <strong>Group Captain:</strong> {invite.first_name} {invite.last_name} ({invite.captain_name})
                                        </div>
                                        <Button size="sm" variant="success" className="me-2" onClick={() => handleAcceptInvite(invite)}>
                                            Accept
                                        </Button>
                                        <Button size="sm" variant="danger" onClick={() => handleDeclineInvite(invite)}>
                                            Decline
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {pendingFriendRequests.length > 0 && (
                        <div className="my-4" style={{ background: '#330072', borderRadius: '1rem', padding: '1rem' }}>
                            <div className="border rounded p-3 bg-white">
                                <h5 className="mb-3">Pending GamleFriend Requests:</h5>
                                {pendingFriendRequests.map((request) => (
                                    <div key={request.id} className="mb-3 d-flex align-items-center">
                                        <img
                                            src={request.sender_avatar ? `${baseURL}/user/uploads/${request.sender_avatar}` : `${baseURL}/user/uploads/defalut_avatar.png`}
                                            alt=""
                                            className="rounded-circle me-2"
                                            style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                                        />
                                        <div className="flex-grow-1">
                                            <strong>{request.sender_first_name} {request.sender_last_name}</strong> ({request.sender_username})
                                        </div>
                                        <Button size="sm" variant="success" className="me-2" onClick={() => handleAcceptFriendRequest(request)}>
                                            Accept
                                        </Button>
                                        <Button size="sm" variant="danger" onClick={() => handleDeclineFriendRequest(request)}>
                                            Decline
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Placeholder for now - a real per-Gamler notification
                        management page is a planned future feature. */}
                    <Button className="btn btn-block btn-hero-lg btn-hero-success mt-2 w-100" onClick={() => setShowNotificationsSoon(true)}>
                        Manage Notifications
                    </Button>
                    <Button className="btn btn-block btn-hero-lg btn-hero-success mt-2 w-100" onClick={() => setShowSettings(true)}>
                        Profile Settings
                    </Button>
                    <Button className="btn btn-block btn-hero-lg btn-hero-success mt-2 w-100" onClick={() => navigate('/gamle-friends')}>
                        Gamle Friends
                    </Button>

                    {/* Pinned to the bottom of the page, same layout as the
                        mockup - Manage Account and PMs sit in their own
                        footer row instead of stacking with the buttons
                        above, since both are more "exit the profile page"
                        actions than profile-editing ones. */}
                    <div className="mt-auto d-flex justify-content-between gap-2 pt-4">
                        <Button className="btn btn-hero-lg btn-hero-success" onClick={() => setShowManage(true)}>
                            Manage Account
                        </Button>
                        <Button className="btn btn-hero-lg btn-hero-success" onClick={() => navigate('/private-messages')}>
                            Private Messages
                        </Button>
                    </div>
                </Col>
            </Row>

            <Modal show={showNotificationsSoon} onHide={() => setShowNotificationsSoon(false)} centered>
                <Modal.Header closeButton></Modal.Header>
                <Modal.Body className="text-center">
                    Notification Preferences Coming Soon
                </Modal.Body>
            </Modal>

            <Modal show={showSettings} onHide={() => setShowSettings(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Profile Settings</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={updateUser}>
                        <Form.Group className="mt-3">
                            <Form.Label
                                dangerouslySetInnerHTML={{
                                __html: `${registrationformText.firstname_label} <span style="color:red">*</span>`
                                }}
                            />

                            {/* Description with HTML */}
                            <div
                                style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem' }}
                                dangerouslySetInnerHTML={{
                                __html: registrationformText.firstname_desc
                                }}
                            />
                            <Form.Control type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                            {errors.firstName && <div style={{ color: "red" }}>{errors.firstName}</div>}
                        </Form.Group>

                        <Form.Group className="mt-3">
                           <Form.Label
                                dangerouslySetInnerHTML={{
                                __html: `${registrationformText.lastname_label} <span style="color:red">*</span>`
                                }}
                            />

                            {/* Description with HTML */}
                            <div
                                style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem' }}
                                dangerouslySetInnerHTML={{
                                __html: registrationformText.lastname_desc
                                }}
                            />
                            <Form.Control type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                            {errors.lastName && <div style={{ color: "red" }}>{errors.lastName}</div>} {/* ✅ Fix here */}
                        </Form.Group>

                        <Form.Group className="mt-3">
                            <Form.Label
                                dangerouslySetInnerHTML={{
                                __html: `${registrationformText.username_label} <span style="color:red">*</span>`
                                }}
                            />

                            {/* Description with HTML */}
                            <div
                                style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem' }}
                                dangerouslySetInnerHTML={{
                                __html: registrationformText.username_desc
                                }}
                            />
                            <Form.Control type="text" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={25} />
                            {errors.username && <div style={{ color: "red" }}>{errors.username}</div>} {/* ✅ Fix here */}
                        </Form.Group>

                        <Form.Group className="mt-3">
                            <Form.Label
                                dangerouslySetInnerHTML={{
                                __html: `${registrationformText.phone_label}`
                                }}
                            />

                            {/* Description with HTML */}
                            <div
                                style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem' }}
                                dangerouslySetInnerHTML={{
                                __html: registrationformText.phone_desc
                                }}
                            />
                        <Form.Control
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, ''); // Digits only
                            if (value.length <= 10) setPhone(value);
                            }}
                            placeholder="Enter your phone number"
                            maxLength={10}
                        />
                        {errors.phone && <div style={{ color: "red" }}>{errors.phone}</div>}
                        </Form.Group>

                        <Form.Group className="mt-3">
                            <Form.Label
                                dangerouslySetInnerHTML={{
                                __html: `${registrationformText.password_label}`
                                }}
                            />

                            {/* Description with HTML */}
                            <div
                                style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem' }}
                                dangerouslySetInnerHTML={{
                                __html: registrationformText.password_desc
                                }}
                            />
                            <InputGroup>
                                <Form.Control
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <InputGroup.Text>
                                    <i className={showPassword ? "fa fa-eye-slash" : "fa fa-eye"} onClick={togglePasswordVisibility}></i>
                                </InputGroup.Text>
                            </InputGroup>
                        </Form.Group>

                        <Form.Group className="mt-3">
                            <Form.Label
                                dangerouslySetInnerHTML={{
                                __html: `${registrationformText.confirm_password_label}`
                                }}
                            />

                            {/* Description with HTML */}
                            <div
                                style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem' }}
                                dangerouslySetInnerHTML={{
                                __html: registrationformText.confirm_password_desc
                                }}
                            />
                            <InputGroup>
                                <Form.Control
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm Password"
                                    value={confirmpassword}
                                    onChange={(e) => setConfirmpassword(e.target.value)}
                                />
                                <InputGroup.Text>
                                    <i className={showConfirmPassword ? "fa fa-eye-slash" : "fa fa-eye"} onClick={toggleConfirmPasswordVisibility}></i>
                                </InputGroup.Text>
                            </InputGroup>
                        </Form.Group>

                        <Button className="btn btn-block btn-hero-lg btn-hero-success mt-4 w-100" type="submit">
                            Update Profile
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>

            <Modal show={showManage} onHide={() => setShowManage(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Manage Account</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className='mb-4'>
                        <h6>{isPaused ? "Your account is Paused" : "Your account is Active"}</h6>
                        <p className="small">
                         {isPaused ? "Your account is active, but Paused. You are not visible to other Gamlers, unable to be invited into groups and will not appear in Leaderboards." : "Pausing your account will make it invisible to other Gamlers – for invitations into groups and Leaderboards."}
                         </p>
                        <Button
                        variant={isPaused ? "success" : "warning"}
                        className="w-100"
                        onClick={() => {
                            if (isPaused) {
                                handlePauseToggle();
                            } else {
                                setShowManage(false);
                                setShowPauseConfirm(true);
                            }
                        }}
                        >
                        {isPaused ? "Re-activate Account" : "Pause Account"}
                        </Button>
                    </div>
                    <div>
                        <p className="small">Deleting your account will permanently remove your account and game-related information from WordGAMLE.</p>
                        <Button
                        variant="danger"
                        className="w-100" 
                        onClick={() => {
                            setShowManage(false);         
                            setShowDeleteConfirm(true);   
                        }}
                        >
                        Delete Account
                        </Button>
                    </div>              
                    

                </Modal.Body>
            </Modal>
            <Modal
            show={showPauseConfirm}
            onHide={() => {
                setShowPauseConfirm(false);
                setShowManage(true);
            }}
            centered
            >
            <Modal.Header closeButton>
                <Modal.Title>Confirm Pause</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>Are you sure you want to pause your account? You'll be hidden from group invitations and Leaderboards until you unpause.</p>
            </Modal.Body>
            <Modal.Footer>
                <Button
                variant="secondary"
                onClick={() => {
                    setShowPauseConfirm(false);
                    setShowManage(true);
                }}
                >
                Cancel
                </Button>
                <Button
                variant="warning"
                onClick={() => {
                    handlePauseToggle();
                    setShowPauseConfirm(false);
                }}
                >
                Yes, Pause
                </Button>
            </Modal.Footer>
            </Modal>
            <Modal
            show={showDeleteConfirm}
            onHide={() => {
                setShowDeleteConfirm(false);
                setShowManage(true);
                setDeletePassword('');
                setDeleteError('');
            }}
            centered
            >
            <Modal.Header closeButton>
                <Modal.Title>Confirm Delete</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                <Form.Group>
                    <Form.Label>Enter your password to confirm</Form.Label>
                    <InputGroup>
                        <Form.Control
                            type={showDeletePassword ? "text" : "password"}
                            value={deletePassword}
                            onChange={(e) => {
                                setDeletePassword(e.target.value);
                                setDeleteError('');
                            }}
                            isInvalid={!!deleteError}
                        />
                        <InputGroup.Text>
                            <i className={showDeletePassword ? "fa fa-eye-slash" : "fa fa-eye"} onClick={() => setShowDeletePassword(!showDeletePassword)}></i>
                        </InputGroup.Text>
                        <Form.Control.Feedback type="invalid">
                            {deleteError}
                        </Form.Control.Feedback>
                    </InputGroup>
                </Form.Group>
            </Modal.Body>
            <Modal.Footer>
                <Button
                variant="secondary"
                onClick={() => {
                    setShowDeleteConfirm(false);
                    setShowManage(true);
                    setDeletePassword('');
                    setDeleteError('');
                }}
                >
                Cancel
                </Button>
                <Button variant="danger" onClick={handleDeleteAccount} disabled={!deletePassword}>
                Yes, Delete
                </Button>
            </Modal.Footer>
            </Modal>


            <ImageCropModal
                show={showCropModal}
                handleClose={() => { setShowCropModal(false); clearPendingAvatarCrop(); }}
                rawImage={rawImage}
                cropperRef={cropperRef}
                cropImage={cropImage}
            />

            <AcceptInviteWizard
                show={showAcceptWizard}
                onClose={() => setShowAcceptWizard(false)}
                groupId={acceptedInvite?.group_id}
                groupName={acceptedInvite?.group_name}
                userId={userId}
            />
        </Container>
    );
}

export default UserProfile;
