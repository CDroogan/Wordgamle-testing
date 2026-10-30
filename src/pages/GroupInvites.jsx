import React, { useState, useEffect, useRef } from 'react';
import { Col, Dropdown, Button, ListGroup, Badge } from 'react-bootstrap';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { FaTrashRestore } from "react-icons/fa";
import dayjs from "dayjs";
import moment from 'moment-timezone';

const GroupInvites = () => {

  const baseURL = import.meta.env.VITE_BASE_URL;
  const USER_AUTH_DATA = JSON.parse(localStorage.getItem('auth'));
  const userId = USER_AUTH_DATA?.id;
  const [groupMessages, setGroupMessages] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const messageIntervalRef = useRef(null);
  const messageCountRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const [unreadcount, setunReadCount]= useState(0);
  const currentUserName = USER_AUTH_DATA?.username;
  const [allGroup, setAllGroup] = useState(null);
  const [notificationModes, setNotificationModes] = useState({});
  const [isUnreadCount, setisUnreadCount] = useState();
  // "Mark All Read" previews the read/grey state locally (no server call)
  // so a curious Gamler can see what it'll look like before committing -
  // only confirming actually calls handleMarkAllRead().
  const [previewAllRead, setPreviewAllRead] = useState(false);

  // GameFeed @mention polling - completely separate from Groups, so it
  // has its own fetch, but shows up in the same bell dropdown/badge.
  const mentionIntervalRef = useRef(null);
  useEffect(() => {
    fetchMentions();
    mentionIntervalRef.current = setInterval(fetchMentions, 8000);
    return () => clearInterval(mentionIntervalRef.current);
  }, []);

  const fetchMentions = async () => {
    try {
      const response = await axios.get(`${baseURL}/gamefeed/get-mentions.php?user_id=${userId}`);
      const newMentions = Array.isArray(response.data.mentions) ? response.data.mentions : [];
      setMentions(newMentions);
    } catch (error) {
      console.error('Error fetching mentions:', error);
    }
  };

  const getUnseenMentionCount = (list) => {
    if (!Array.isArray(list)) return 0;
    return list.filter((m) => !m.seen_at).length;
  };

  // GamleFriend requests - completely separate from Groups and from
  // GameFeed mentions (its own table, own fetch/poll), so it has no
  // group_id handling to worry about, but shows up in the same bell
  // dropdown/badge. Clicking one sends the Gamler to the Profile page,
  // same as a group invite does, since that's where requests are
  // actually accepted/declined.
  const [friendRequests, setFriendRequests] = useState([]);
  const friendRequestIntervalRef = useRef(null);
  useEffect(() => {
    fetchFriendRequests();
    friendRequestIntervalRef.current = setInterval(fetchFriendRequests, 8000);
    return () => clearInterval(friendRequestIntervalRef.current);
  }, []);

  const fetchFriendRequests = async () => {
    try {
      const response = await axios.get(`${baseURL}/friends/get-pending-requests.php?user_id=${userId}`);
      const newRequests = Array.isArray(response.data.requests) ? response.data.requests : [];
      setFriendRequests(newRequests);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const getUnseenFriendRequestCount = (list) => {
    if (!Array.isArray(list)) return 0;
    return list.filter((r) => !r.seen_at).length;
  };

  const handleClickFriendRequest = async (request) => {
    setShowDropdown(false);
    try {
      await axios.post(`${baseURL}/friends/mark-requests-seen.php`, {
        user_id: userId,
        request_id: request.id,
      });
      setFriendRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, seen_at: 'seen' } : r)));
      navigate('/edit-profile');
    } catch (error) {
      console.error('Error marking friend request seen:', error);
    }
  };

  // Private Messages - another completely separate table/poll, same
  // bell-dropdown pattern as friend requests and mentions. Unlike
  // mentions (one row per mention), the "item" here is a whole
  // conversation - unseen_count>0 is what makes one unread, same
  // granularity a friend request already uses (one request = one item,
  // regardless of how many rows it actually took to get there).
  const [conversations, setConversations] = useState([]);
  const conversationsIntervalRef = useRef(null);
  useEffect(() => {
    fetchConversations();
    conversationsIntervalRef.current = setInterval(fetchConversations, 8000);
    return () => clearInterval(conversationsIntervalRef.current);
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${baseURL}/messages/get-conversations.php?user_id=${userId}`);
      const newConversations = Array.isArray(response.data.conversations) ? response.data.conversations : [];
      setConversations(newConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const unreadConversations = conversations.filter((c) => c.unseen_count > 0);

  const handleClickConversation = async (conversation) => {
    setShowDropdown(false);
    try {
      await axios.post(`${baseURL}/messages/mark-conversation-seen.php`, {
        user_id: userId,
        conversation_id: conversation.conversation_id,
      });
      setConversations((prev) => prev.map((c) => (c.conversation_id === conversation.conversation_id ? { ...c, unseen_count: 0 } : c)));
      navigate(`/private-messages?conversation=${conversation.conversation_id}`);
    } catch (error) {
      console.error('Error marking conversation seen:', error);
    }
  };

  const handleClickMention = async (mention) => {
    setShowDropdown(false);
    try {
      await axios.post(`${baseURL}/gamefeed/mark-mentions-seen.php`, {
        user_id: userId,
        mention_id: mention.id,
      });
      setMentions((prev) => prev.map((m) => (m.id === mention.id ? { ...m, seen_at: 'seen' } : m)));
      navigate(`/?post=${mention.post_id}`);
    } catch (error) {
      console.error('Error marking mention seen:', error);
    }
  };

  // Without this, a notification that arrives while the Gamler already
  // has the site open (e.g. a group invite sent to them just now) would
  // never show up in the bell until they reload the page or click
  // something else that happens to refetch it - mentions already poll
  // this way, this just brings group_messages (invites included) in
  // line with that.
  const groupMessagesIntervalRef = useRef(null);
  useEffect(() => {
    fetchGroupMessages();
    groupMessagesIntervalRef.current = setInterval(fetchGroupMessages, 8000);
    return () => clearInterval(groupMessagesIntervalRef.current);
  }, []);
  useEffect(() => {
    if (Object.keys(notificationModes).length) {
      fetchGroupMessages();
    }
  }, [notificationModes]);


  //get all group id
  useEffect(() => {
  const fetchUserGroups = async () => {
      try {
      const response = await axios.get(`${baseURL}/groups/get-user-groups-data.php`, {
          params: { user_id: userId },
      });
      setAllGroup(response.data);
      
      } catch (error) {
      console.error("Error fetching user joined groups:", error);
      }
  };

  if (userId) fetchUserGroups();
  }, [userId]);
  
  
  // Fetch group invites
  
  useEffect(() => {
  const fetchNotificationPreferences = async () => {
    if (!Array.isArray(allGroup) || !allGroup.length) return;

    try {
      const groupIds = allGroup.map(g => g.id);

      const res = await axios.get(`${baseURL}/groups/get-notification-preference-message.php`, {
      params: {
        user_id: userId,
        group_ids: groupIds, // becomes ?group_ids[]=108&group_ids[]=144
      },
    });
      setNotificationModes(res.data.modes);
      //console.log('notification response', res.data.modes);

    } catch (err) {
      console.error("Notification preference error:", err);
    }
  };

  fetchNotificationPreferences();
}, [allGroup, userId]);



const applyMessageFilters = (messages) => {
  return messages.filter(msg => {
    const mode = notificationModes[String(msg.group_id)] || "";

    // 🔕 Hide everything for this group
    if (mode === "MUTE_ALL") {
      return false;
    }

    // 🎮 Show ONLY game_winner messages
    if (mode === "EXCEPT_GAME_COMPLETE") {
      return msg.msg_from === 'game_winner';
    }

    // ✅ Default: show all messages for this group
    return true;
  });
};


const getUnreadCount = (messages, userId) => {
  if (!Array.isArray(messages)) return 0;

  return messages.filter(msg => {
    if (!msg.seen_ids) return true;

    return !msg.seen_ids
      .split(',')
      .includes(String(userId));
  }).length;
};


const fetchGroupMessages = async () => {
  try {
    const timeZone = moment.tz.guess();
    const today = moment().tz(timeZone).format("YYYY-MM-DD");
    const current_period = moment().tz(timeZone).format("A");
    const response = await axios.get(`${baseURL}/groups/get-group-messages.php?user_id=${userId}&today=${today}&current_period=${current_period}`);
    const newMessages = Array.isArray(response.data.messages) ? response.data.messages : [];
    
    const filteredMessages = applyMessageFilters(newMessages);
    
    //console.log(newMessages);
    //console.log('filteredMessages',filteredMessages);
    // setGroupMessages(filteredMessages);
    // const unreadCount = getUnreadCount(filteredMessages, userId);
    // setunReadCount(unreadCount);

    setGroupMessages(filteredMessages);
  } catch (error) {
    console.error('Error fetching group messages:', error);
  }
};

// The bell badge should count every kind of pending notification, not
// just unread group messages - a pending group invitation has no
// "seen" concept of its own (it's resolved by Accept/Decline, not by
// opening the dropdown), so it counts as pending for as long as it's
// in the list.
useEffect(() => {
  setunReadCount(
    getUnreadCount(groupMessages, userId) + getUnseenMentionCount(mentions) + getUnseenFriendRequestCount(friendRequests) + unreadConversations.length
  );
}, [groupMessages, mentions, friendRequests, unreadConversations.length, userId]);

  // const handleClickGroup = async (e, groupId, game, userId, msgId, msgFrom, msgReportDate, msgPeriod) => {
  //   e.preventDefault();
  //   setShowDropdown(false);
    

  //   try {
  //     await axios.post(`${baseURL}/groups/update-seen-ids.php`, {
  //       group_id: groupId,
  //       msg_from: 'group',
  //       game_name: game,
  //       user_id: userId,
  //     });
      
      

  //     navigate(`/group/${groupId}?msg_id=${msgId}`);

  //   } catch (error) {
  //     console.error("Axios error:", error);
  //   }
  // };

  const handleClickGroup = async (
    e,
    groupId,
    game,
    userId,
    msgId
  ) => {
    e.preventDefault();
    setShowDropdown(false);

    try {
      await axios.post(`${baseURL}/groups/update-seen-ids.php`, {
        group_id: groupId,
        msg_from: 'group',
        game_name: game,
        user_id: userId,
      });

      // 🔥 Immediately refresh messages
      await fetchGroupMessages();

      // Then navigate
      navigate(`/group/${groupId}?msg_id=${msgId}`);

    } catch (error) {
      console.error("Axios error:", error);
    }
  };

  // A message posted to the group's general/leaderboard chat (as opposed
  // to a specific game's chat) - lands on the group's stats/leaderboard
  // page, where that chat lives, rather than a specific game's page.
  const handleClickGeneralChat = async (e, groupId, userId, msgId) => {
    e.preventDefault();
    setShowDropdown(false);

    try {
      await axios.post(`${baseURL}/groups/update-seen-ids.php`, {
        group_id: groupId,
        game_name: 'general_chat',
        user_id: userId,
      });

      await fetchGroupMessages();
      navigate(`/group/${groupId}/stats?msg_id=${msgId}`);
    } catch (error) {
      console.error("Axios error:", error);
    }
  };

  // A group invitation notification - accept/decline now live on the
  // Profile page's "Pending Invitations" section, not here, so this just
  // marks the notification seen (same as opening any other notification
  // would) and sends the Gamler there.
  const handleClickInvite = async (e, groupId, userId) => {
    e.preventDefault();
    setShowDropdown(false);

    try {
      await axios.post(`${baseURL}/groups/update-seen-ids.php`, {
        group_id: groupId,
        game_name: 'invite',
        user_id: userId,
      });

      await fetchGroupMessages();
      navigate('/edit-profile');
    } catch (error) {
      console.error("Axios error:", error);
    }
  };

  // "Group deleted" and "you were removed from the group" both mean the
  // group's own page is no longer somewhere this user can (or should) land -
  // for a deleted group it's gone entirely, and for a removed member they're
  // no longer part of it. Send them home instead.
  const handleClickHome = async (e, groupId, game, userId) => {
    e.preventDefault();
    setShowDropdown(false);

    try {
      await axios.post(`${baseURL}/groups/update-seen-ids.php`, {
        group_id: groupId,
        msg_from: 'group',
        game_name: game,
        user_id: userId,
      });

      await fetchGroupMessages();
      navigate('/');
    } catch (error) {
      console.error("Axios error:", error);
    }
  };

//   const handleClick = async (
//   e,
//   groupId,
//   game,
//   userId,
//   msgId,
//   msgFrom,
//   msgReportDate,
//   msgPeriod
// ) => {
//   e.preventDefault();
//   setShowDropdown(false);

//   try {
//     await axios.post(`${baseURL}/groups/update-seen-ids.php`, {
//       group_id: groupId,
//       msg_from: 'game',
//       game_name: game,
//       user_id: userId,
//     });
    
//     const timeZone = moment.tz.guess();
//     const today = moment().tz(timeZone).format("YYYY-MM-DD");
//     const current_period = moment().tz(timeZone).format("A");
//     //const today = new Date().toISOString().split("T")[0];

//     let url = `/group/${groupId}/stats/${game}?msg_id=${msgId}&msg_from=${msgFrom}`;

//     /* -----------------------------------------
//       🟢 DATE + PERIOD HANDLING
//     ----------------------------------------- */
//     if (game === "phrazle") {
//       // Always pass date for phrazle
//       url += `&msgReportDate=${msgReportDate}`;

//       // Pass period ONLY if:
//       // - not today OR
//       // - today but period mismatch
//       if(msgReportDate !== today){
//         url += `&msgPeriod=${msgPeriod}`;
//       }
//       else{
//         if(current_period !== msgPeriod){
//           url += `&msgPeriod=${msgPeriod}`;
//         }
//       }
//     }
//     else {
//       if (msgReportDate !== today) {
//         url += `&msgReportDate=${msgReportDate}&msgPeriod=${msgPeriod}`;
//       }
//     }

//     navigate(url);
//     /* -----------------------------------------
//        🟢 SCROLL HANDLING (date + period)
//     ----------------------------------------- */
//     setTimeout(() => {
//       if (game === "phrazle") {
//         const el = document.getElementById(
//           `report-${msgReportDate}-${msgPeriod}`
//         );
//         if (el) el.scrollIntoView({ behavior: "smooth" });
//       } else if (msgReportDate && msgReportDate !== today) {
//         const el = document.getElementById(`report-${msgReportDate}`);
//         if (el) el.scrollIntoView({ behavior: "smooth" });
//       }
//     }, 800);

//   } catch (error) {
//     console.error("Axios error:", error);
//   }
// };


const handleClick = async (
  e,
  groupId,
  game,
  userId,
  msgId,
  msgFrom,
  msgReportDate,
  msgPeriod
) => {
  e.preventDefault();
  setShowDropdown(false);

  try {
    await axios.post(`${baseURL}/groups/update-seen-ids.php`, {
      group_id: groupId,
      msg_from: 'game',
      game_name: game,
      user_id: userId,
    });

    // 🔥 Refresh before navigation
    await fetchGroupMessages();

    const timeZone = moment.tz.guess();
    const today = moment().tz(timeZone).format("YYYY-MM-DD");

    let url = `/group/${groupId}/stats/${game}?msg_id=${msgId}&msg_from=${msgFrom}`;

    if (game === "phrazle") {
      // Always pass msgPeriod explicitly - the destination page has no
      // "use whatever the current period is" fallback, so omitting it
      // (even when it happens to match the current period right now)
      // makes it default to AM regardless of which period this actually is.
      url += `&msgReportDate=${msgReportDate}&msgPeriod=${msgPeriod}`;
    } else {
      if (msgReportDate !== today) {
        url += `&msgReportDate=${msgReportDate}&msgPeriod=${msgPeriod}`;
      }
    }

    navigate(url);

  } catch (error) {
    console.error("Axios error:", error);
  }
};

// "Award" notifications (Deuces, One Hit Wordler, One Hit Phrazler, and
// anything added later under the same convention) can reach a Gamler
// across EVERY group they share with the winner for that game, not just
// one - so where this click should land has to be worked out for THIS
// viewer's own groups, not from a single group_id baked into the
// message row (see groups/get-landing-group.php for the full reasoning).
const AWARD_MSG_FROM_TYPES = ['deuces_award', 'one_hit_wordler', 'one_hit_phrazler'];

const PERSONAL_STATS_ROUTE = {
  wordle: '/wordlestats',
  phrazle: '/phrazlestats',
};

const handleClickAward = async (e, groupId, game, userId, msgId, msgFrom, winnerId) => {
  e.preventDefault();
  setShowDropdown(false);

  try {
    // Marks the whole notification thread (every row sharing this
    // group_id + game_name) seen, exactly like every other click handler
    // here - unrelated to which page this particular viewer ends up on.
    await axios.post(`${baseURL}/groups/update-seen-ids.php`, {
      group_id: groupId,
      game_name: game,
      user_id: userId,
    });
    await fetchGroupMessages();

    // winner_id restricts the landing group to ones actually shared with
    // the winner (see get-landing-group.php) - omitted when the viewer
    // IS the winner, since every one of their own groups already
    // qualifies by definition.
    const res = await axios.get(`${baseURL}/groups/get-landing-group.php`, {
      params: { user_id: userId, game, winner_id: winnerId || undefined },
    });

    if (res.data.destination === 'group' && res.data.group_id) {
      navigate(`/group/${res.data.group_id}/stats/${game}?msg_id=${msgId}&msg_from=${msgFrom}`);
    } else {
      navigate(PERSONAL_STATS_ROUTE[game] || '/');
    }
  } catch (error) {
    console.error("Axios error:", error);
  }
};



  // function timeAgo(dateString) {
  //   const date = new Date(dateString);
  //   const now = new Date();
  //   const seconds = Math.floor((now - date) / 1000);

  //   const intervals = {
  //     year: 31536000,
  //     month: 2592000,
  //     week: 604800,
  //     day: 86400,
  //     hour: 3600,
  //     minute: 60
  //   };

  //   for (const key in intervals) {
  //     const value = Math.floor(seconds / intervals[key]);
  //     if (value > 0) {
  //       return value + key.charAt(0);   // 1d, 2h, 5m, 3w
  //     }
  //   }

  //   return "Just now";
  // }

  // Every group_messages notification type now stamps a true UTC instant
  // at insert time, EXCEPT game_played ("X has played, Y still yet to
  // play") - that one still keeps the submitter's local-wall-clock value
  // because its own duplicate-prevention logic matches on DATE(created_at)
  // to find "today's" row for a group+game. Shared here so both the
  // relative "time ago" text and the Bell dropdown's sort order agree on
  // which notifications are UTC and which aren't.
  const isGroupMessageUtc = (msg) => msg.msg_from !== 'game_played';

  // A string with no "Z"/offset suffix is ambiguous - the Date
  // constructor reads it as local time, which is only correct for the
  // one remaining non-UTC notification type above.
  const parseTimestamp = (dateString, isUtc) =>
    (isUtc ? new Date(dateString.replace(" ", "T") + "Z") : new Date(dateString)).getTime();

  function timeAgo(dateString, isUtc = false) {
    // General chat notifications carry a true UTC instant with no "Z"
    // suffix, which the Date constructor would otherwise read as local
    // time - flagging it lets it parse correctly.
    const date = isUtc ? new Date(dateString.replace(" ", "T") + "Z") : new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;

    const weeks = Math.floor(days / 7);
    return `${weeks}w`;
  }

  const handleDeleteMessage = async (msgId) => {
    try {
      await fetch(`${baseURL}/groups/delete-notification.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ msg_id: msgId })
      });

      // setGroupMessages((prev) => prev.filter((m) => m.id !== msgId));
      setGroupMessages(prev =>
        prev.map(msg =>
          msg.group_id === groupId
            ? { ...msg, seen_ids: `${msg.seen_ids || ""},${userId}` }
            : msg
        )
      );
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.post(`${baseURL}/groups/mark-all-seen.php`, {
        user_id: userId,
      });
      await axios.post(`${baseURL}/gamefeed/mark-mentions-seen.php`, {
        user_id: userId,
      });
      await axios.post(`${baseURL}/friends/mark-requests-seen.php`, {
        user_id: userId,
      });
      await Promise.all(unreadConversations.map((c) =>
        axios.post(`${baseURL}/messages/mark-conversation-seen.php`, { user_id: userId, conversation_id: c.conversation_id })
      ));

      const updatedMessages = groupMessages.map((msg) => ({
        ...msg,
        seen_ids: msg.seen_ids
          ? `${msg.seen_ids},${userId}`
          : `${userId}`,
      }));

      setGroupMessages(updatedMessages);
      setMentions((prev) => prev.map((m) => ({ ...m, seen_at: 'seen' })));
      setFriendRequests((prev) => prev.map((r) => ({ ...r, seen_at: 'seen' })));
      setConversations((prev) => prev.map((c) => ({ ...c, unseen_count: 0 })));

    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };
  
  return (
    <Dropdown show={showDropdown} onToggle={async (isOpen) => {
        setShowDropdown(isOpen);
        if (!isOpen) {
          // Closing without confirming shouldn't leave the preview active -
          // otherwise reopening would still show everything as read even
          // though nothing was actually saved.
          setPreviewAllRead(false);
        }
        // if (isOpen) {
        //   // setunReadCount(0);
        //   await axios.post(`${baseURL}/groups/mark-all-seen.php`, { user_id: userId });
        // }
      }}
    >
      <Dropdown.Toggle variant="light" id="group-invites">

        <i className="fas fa-bell"></i>
        {!previewAllRead && unreadcount > 0 && (
          <Badge bg="danger" className="notification-count">
            {unreadcount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu ref={dropdownRef} align="end">
        <Dropdown.Header className="d-flex justify-content-between align-items-center">

          <span>Group Messages</span>

          {previewAllRead ? (
            <div className="d-flex align-items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={async (e) => {
                  e.preventDefault();
                  await handleMarkAllRead();
                  setPreviewAllRead(false);
                  setShowDropdown(false);
                }}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline-secondary"
                onClick={(e) => {
                  e.preventDefault();
                  setPreviewAllRead(false);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="form-check m-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="markAllRead"
                checked={false}
                onChange={(e) => {
                  if (e.target.checked) {
                    // Preview only - grey everything out / hide the unread
                    // dots so the Gamler can see the effect first, without
                    // actually marking anything as read yet.
                    setPreviewAllRead(true);
                  }
                }}
              />
              <label className="form-check-label ms-1" htmlFor="markAllRead">
                Mark All Read
              </label>
            </div>
          )}

        </Dropdown.Header>

          {(Array.isArray(groupMessages) && groupMessages.length > 0) || (Array.isArray(mentions) && mentions.length > 0) || (Array.isArray(friendRequests) && friendRequests.length > 0) || unreadConversations.length > 0 ? (
  <div
    style={{
      maxHeight: "300px",        // adjust height as needed
      overflowY: "auto",
      overflowX: "hidden",
      scrollbarWidth: "thin",
      scrollbarColor: "#ccc #f9f9f9",
    }}
  >
    <ListGroup variant="flush" style={{ minWidth: "300px" }}>
      {/* Four independent notification sources (Private Messages,
          GamleFriend requests, GameFeed mentions, Group Messages), each on
          its own poll/fetch, merged here into one true chronological list
          (most recent first) instead of four stacked blocks - a fresher
          Group Message no longer gets buried below an older Private
          Message just because they're a different notification type. */}
      {(() => {
        const bellItems = [
          ...unreadConversations.map((conversation) => ({
            key: `conversation-${conversation.conversation_id}`,
            timestamp: parseTimestamp(conversation.last_message_at, true),
            render: () => {
              const isUnread = !previewAllRead;
              // In a group DM, name whoever actually sent the newest
              // message, not every participant.
              const sender = conversation.participants.find((p) => p.id === conversation.last_message_sender_id) || conversation.participants[0];
              return (
                <ListGroup.Item
                  action
                  className={`${isUnread ? "unread-msg" : "read-msg"} msg-item`}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleClickConversation(conversation)}
                >
                  <div className="msg-row">
                    <div className="msg-left">
                      <img
                        src={sender.avatar ? `${baseURL}/user/uploads/${sender.avatar}` : `${baseURL}/user/uploads/default_avatar.png`}
                        alt=""
                        className="rounded-circle me-2"
                        style={{ width: '24px', height: '24px', objectFit: 'cover', verticalAlign: 'middle' }}
                      />
                      <strong>{sender.username}</strong> sent you a private message.
                      <div className="time-ago">{timeAgo(conversation.last_message_at, true)}</div>
                    </div>
                    {isUnread && <span className="unread-dot"></span>}
                  </div>
                </ListGroup.Item>
              );
            },
          })),
          ...(Array.isArray(friendRequests) ? friendRequests : []).map((request) => ({
            key: `friend-request-${request.id}`,
            timestamp: parseTimestamp(request.created_at, true),
            render: () => {
              const isUnread = !previewAllRead && !request.seen_at;
              return (
                <ListGroup.Item
                  action
                  className={`${isUnread ? "unread-msg" : "read-msg"} msg-item`}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleClickFriendRequest(request)}
                >
                  <div className="msg-row">
                    <div className="msg-left">
                      <div className="fw-bold mb-1">Friend Request!</div>
                      <strong>{request.sender_first_name} {request.sender_last_name} ({request.sender_username})</strong>{' '}
                      <img
                        src={request.sender_avatar ? `${baseURL}/user/uploads/${request.sender_avatar}` : `${baseURL}/user/uploads/default_avatar.png`}
                        alt=""
                        className="rounded-circle me-2"
                        style={{ width: '24px', height: '24px', objectFit: 'cover', verticalAlign: 'middle' }}
                      />
                      <strong>wants to be your GamleFriend.</strong> Go to your Profile page to Accept or Decline.
                      <div className="time-ago">{timeAgo(request.created_at, true)}</div>
                    </div>
                    {isUnread && <span className="unread-dot"></span>}
                  </div>
                </ListGroup.Item>
              );
            },
          })),
          ...(Array.isArray(mentions) ? mentions : []).map((mention) => ({
            key: `mention-${mention.id}`,
            timestamp: parseTimestamp(mention.created_at, true),
            render: () => {
              const isUnread = !previewAllRead && !mention.seen_at;
              return (
                <ListGroup.Item
                  action
                  className={`${isUnread ? "unread-msg" : "read-msg"} msg-item`}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleClickMention(mention)}
                >
                  <div className="msg-row">
                    <div className="msg-left">
                      <img
                        src={mention.mentioning_avatar ? `${baseURL}/user/uploads/${mention.mentioning_avatar}` : `${baseURL}/user/uploads/default_avatar.png`}
                        alt=""
                        className="rounded-circle me-2"
                        style={{ width: '24px', height: '24px', objectFit: 'cover', verticalAlign: 'middle' }}
                      />
                      <strong>{mention.mentioning_username}</strong> mentioned you in {mention.comment_id ? 'a comment' : 'a post'} in the GameFeed.
                      <div className="time-ago">{timeAgo(mention.created_at, true)}</div>
                    </div>
                    {isUnread && <span className="unread-dot"></span>}
                  </div>
                </ListGroup.Item>
              );
            },
          })),
          ...(Array.isArray(groupMessages) ? groupMessages : []).map((msg) => ({
            key: `msg-${msg.id}`,
            timestamp: parseTimestamp(msg.created_at, isGroupMessageUtc(msg)),
            render: () => {
              const isUnread =
                !previewAllRead &&
                (!msg.seen_ids ||
                !msg.seen_ids.split(",").includes(String(userId)));

              let processedMessage = msg.message || "";

              // Replace the viewer's own name with "You" - but only where the
              // backend actually renders a username (always wrapped in
              // <strong> tags), not any bare occurrence of the name anywhere
              // in the message. Without that scoping, a username that happens
              // to also appear inside a GROUP name (e.g. "Cassandra" inside
              // "Two Cassandras") gets swapped too.
              if (currentUserName) {
                const escapedName = currentUserName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const nameRegex = new RegExp(`<strong>${escapedName}</strong>`, "g");
                processedMessage = processedMessage.replace(
                  nameRegex,
                  "<strong>You</strong>"
                );
              }

              // Fix: If "You" exists, change WINS → WIN
              if (processedMessage.includes("You")) {
                processedMessage = processedMessage.replace(/\bWINS\b/g, "WIN");
              }

              // Deuces Award: the winner's own view uses genuinely
              // different wording (not just a name swap) than everyone
              // else's for the two text lines, so those are rebuilt
              // rather than patched - re-using the same two <img> tags
              // already embedded in the stored message (the winner's
              // small avatar next to their name, and the deuces-award.png
              // banner below), unchanged either way - just moving the
              // avatar up next to "You" and keeping the banner at the end.
              if (msg.msg_from === "deuces_award" && processedMessage.includes("<strong>You</strong>")) {
                const imgTags = msg.message.match(/<img[^>]*>/g) || [];
                const [avatarImg, bannerImg] = imgTags;
                processedMessage =
                  `<strong>DEUCES AWARD – Two 2s for You${avatarImg || ''}!</strong><br>Great Phrazle day, whoop!` +
                  (bannerImg ? `<br>${bannerImg}` : '');
              }

              // One Hit Wordler Award: same "rebuild the whole message for
              // the winner's own view" approach as Deuces Award above.
              if (msg.msg_from === "one_hit_wordler" && processedMessage.includes("<strong>You</strong>")) {
                const imgTags = msg.message.match(/<img[^>]*>/g) || [];
                const [avatarImg, bannerImg] = imgTags;
                processedMessage =
                  `<strong>One Hit Wordler AWARD for You${avatarImg || ''}!</strong><br>You're a Wordle Wiz!  Well played!` +
                  (bannerImg ? `<br>${bannerImg}` : '');
              }

              return (
                <Link
                  onClick={(e) =>
                    (msg.msg_from === "group_deleted" || msg.msg_from === "member_removed")
                      ? handleClickHome(e, msg.group_id, msg.game_name, userId)
                      : msg.msg_from === "invite"
                      ? handleClickInvite(e, msg.group_id, userId)
                      : msg.msg_from === "group"
                      ? handleClickGroup(e, msg.group_id, msg.game_name, userId, msg.msg_id, msg.msg_from, msg.report_date, msg.period )
                      : AWARD_MSG_FROM_TYPES.includes(msg.msg_from)
                      ? handleClickAward(e, msg.group_id, msg.game_name, userId, msg.msg_id, msg.msg_from, msg.winner_id)
                      : msg.game_name === "general_chat"
                      ? handleClickGeneralChat(e, msg.group_id, userId, msg.msg_id)
                      : handleClick(e, msg.group_id, msg.game_name, userId, msg.msg_id, msg.msg_from, msg.report_date, msg.period )
                  }
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <ListGroup.Item
                    className={`${isUnread ? "unread-msg" : "read-msg"} msg-item`}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="msg-row">

                      {/* LEFT SIDE - every notification type's message is
                          backend-built HTML (consistently using <strong>
                          for Gamler/Group names), so all of them render the
                          same way. "group"/"group_deleted"/"member_removed"/
                          "invite" used to render as plain text here, which
                          silently showed literal "<strong>" tags instead of
                          bolding anything for those four types. */}
                      <div className="msg-left">
                        <div
                          className="cwd-group-message"
                          dangerouslySetInnerHTML={{ __html: processedMessage }}
                        />
                          <div className=" d-flex gap-2 time-ago">
                            {timeAgo(msg.created_at, isGroupMessageUtc(msg))}
                            <span
                                className="delete-icon"
                                onClick={(e) => {
                                  e.preventDefault();    // prevent navigation
                                  e.stopPropagation();   // stop click bubble
                                  handleDeleteMessage(msg.id);
                                }}
                              >
                                <FaTrashRestore />
                              </span>
                            </div>
                          </div>

                      {/* RIGHT SIDE — unread dot */}
                      {isUnread && <span className="unread-dot"></span>}
                    </div>
                  </ListGroup.Item>
                </Link>
              );
            },
          })),
        ].sort((a, b) => b.timestamp - a.timestamp);

        return bellItems.map((item) => (
          <React.Fragment key={item.key}>{item.render()}</React.Fragment>
        ));
      })()}

    </ListGroup>
  </div>
) : (
  <Dropdown.Item disabled>No invites or messages</Dropdown.Item>
)}

      </Dropdown.Menu>
    </Dropdown>
  );
};

export default GroupInvites;