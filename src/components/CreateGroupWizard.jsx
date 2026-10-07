import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import GroupModal from '../constant/Models/GroupModal';
import AddMembers from '../constant/Models/AddMembers';
import WizardSelectGames from './WizardSelectGames';
import WizardSelectScoringMethod from './WizardSelectScoringMethod';
import WizardSuccess from './WizardSuccess';

// Guides a captain through the full group-setup sequence in one go:
// Create -> Select Games -> Select Scoring Method -> Add Members ->
// Success, instead of leaving games/scoring method to be discovered
// later as separate settings buried on the group's own page. The group
// itself is created (and un-cancelable - see create-group.php) the
// moment "Create" is clicked; every step after that persists immediately
// when its own Save/Send button is clicked, so closing out partway
// through at any point just means "stop here," not "undo everything so
// far." Back is allowed between every step except back into Create
// itself, since that's the one action with no undo short of deleting
// the group from Group Info.
function CreateGroupWizard({ show, onClose, isFirstGroup, onCreated, userId }) {
  const baseURL = import.meta.env.VITE_BASE_URL;
  const navigate = useNavigate();
  const [step, setStep] = useState('create'); // 'create' | 'games' | 'method' | 'members' | 'success'
  const [groupname, setGroupname] = useState('');
  const [creating, setCreating] = useState(false);
  const [groupId, setGroupId] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [leaderboardText, setLeaderboardText] = useState({});
  const [selectedGames, setSelectedGames] = useState([]);
  const [savingGames, setSavingGames] = useState(false);
  const [scoringMethod, setScoringMethod] = useState('');
  const [savingMethod, setSavingMethod] = useState(false);

  useEffect(() => {
    if (!show) return;
    Axios.get(`${baseURL}/user/get-homepage-text.php`)
      .then((res) => setLeaderboardText(res.data || {}))
      .catch(() => {});
  }, [show, baseURL]);

  // Closing before the group exists (step 'create') just closes - there's
  // nothing to land on yet. Closing at any later step (including via
  // "Continue" on the success screen) sends the captain to the group's
  // own Group Info page, since the group is real by that point regardless
  // of how many of the later steps they actually completed.
  const handleExit = () => {
    const idToVisit = groupId;
    setStep('create');
    setGroupname('');
    setGroupId(null);
    setGroupName('');
    setSelectedGames([]);
    setScoringMethod('');
    onClose();
    if (idToVisit) {
      navigate(`/group-info/${idToVisit}`);
    }
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    if (!groupname.trim()) return;
    setCreating(true);
    try {
      const res = await Axios.post(`${baseURL}/groups/create-group.php`, {
        name: groupname,
        captain_id: userId,
        created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      });
      if (res.data.status === 'success') {
        setGroupId(res.data.group_id);
        setGroupName(groupname);
        onCreated(res.data.group_id, groupname);
        setStep('games');
      } else {
        toast.error(res.data.message || 'Failed to create group.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setCreating(false);
    }
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
        setStep('method');
      } else {
        toast.error(res.data.message || 'Failed to save game preferences.');
      }
    } catch (err) {
      toast.error('Error saving game preferences.');
    } finally {
      setSavingGames(false);
    }
  };

  const saveMethod = async () => {
    setSavingMethod(true);
    try {
      const res = await Axios.post(`${baseURL}/groups/update-scoring-method.php`, {
        userId,
        groupId,
        scoringMethod,
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      });
      if (res.data.status === 'success') {
        setStep('members');
      } else {
        toast.error(res.data.message || 'Failed to save scoring method.');
      }
    } catch (err) {
      toast.error('Error saving scoring method.');
    } finally {
      setSavingMethod(false);
    }
  };

  if (!show) return null;

  if (step === 'create') {
    return (
      <GroupModal
        showForm
        handleFormClose={handleExit}
        onSubmit={handleCreateSubmit}
        groupname={groupname}
        setGroupname={setGroupname}
        editMode={false}
        loading={creating}
      />
    );
  }

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
      />
    );
  }

  if (step === 'method') {
    return (
      <WizardSelectScoringMethod
        groupName={groupName}
        leaderboardText={leaderboardText}
        scoringMethod={scoringMethod}
        onSelectMethod={setScoringMethod}
        onSave={saveMethod}
        onBack={() => setStep('games')}
        onClose={handleExit}
        saving={savingMethod}
      />
    );
  }

  if (step === 'members') {
    return (
      <AddMembers
        showForm
        handleFormClose={() => setStep('success')}
        onBack={() => setStep('method')}
        groupName={groupName}
        groupId={groupId}
        existingMembers={[String(userId)]}
      />
    );
  }

  if (step === 'success') {
    return (
      <WizardSuccess
        groupName={groupName}
        isFirstGroup={isFirstGroup}
        onBack={() => setStep('members')}
        onClose={handleExit}
        onContinue={handleExit}
      />
    );
  }

  return null;
}

export default CreateGroupWizard;
