import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import WizardSelectGames from './WizardSelectGames';
import WizardSuccess from './WizardSuccess';

// Shown right after accepting a group invitation (see UserProfile.jsx's
// handleAcceptInvite, which calls accept-invite.php BEFORE opening this -
// joining the group, like creating one, already happened and is final by
// the time this is on screen) - Select Leaderboard Games, then Success.
// No scoring method or add-members step here: those are the captain's
// job, not a joining member's.
function AcceptInviteWizard({ show, onClose, groupId, groupName, userId }) {
  const baseURL = import.meta.env.VITE_BASE_URL;
  const navigate = useNavigate();
  const [step, setStep] = useState('games'); // 'games' | 'success'
  const [leaderboardText, setLeaderboardText] = useState({});
  const [selectedGames, setSelectedGames] = useState([]);
  const [savingGames, setSavingGames] = useState(false);

  useEffect(() => {
    if (!show) return;
    Axios.get(`${baseURL}/user/get-homepage-text.php`)
      .then((res) => setLeaderboardText(res.data || {}))
      .catch(() => {});
  }, [show, baseURL]);

  const handleExit = () => {
    setStep('games');
    setSelectedGames([]);
    onClose();
    navigate(`/group-info/${groupId}`);
  };

  const toggleGame = (game) => {
    setSelectedGames((prev) => (prev.includes(game) ? prev.filter((g) => g !== game) : [...prev, game]));
  };

  const saveGames = async () => {
    setSavingGames(true);
    try {
      const res = await Axios.post(`${baseURL}/groups/update-games.php`, {
        userId,
        groupId,
        selectedGames,
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      });
      if (res.data.status === 'success') {
        setStep('success');
      } else {
        toast.error(res.data.message || 'Failed to save game preferences.');
      }
    } catch (err) {
      toast.error('Error saving game preferences.');
    } finally {
      setSavingGames(false);
    }
  };

  if (!show) return null;

  if (step === 'games') {
    return (
      <WizardSelectGames
        groupName={groupName}
        leaderboardText={leaderboardText}
        selectedGames={selectedGames}
        onToggleGame={toggleGame}
        onSave={saveGames}
        onClose={handleExit}
        saving={savingGames}
        showMemberNote={false}
      />
    );
  }

  return (
    <WizardSuccess
      groupName={groupName}
      message="You're now a member of one of the very first WordGAMLE groups!"
      onBack={() => setStep('games')}
      onClose={handleExit}
      onContinue={handleExit}
    />
  );
}

export default AcceptInviteWizard;
