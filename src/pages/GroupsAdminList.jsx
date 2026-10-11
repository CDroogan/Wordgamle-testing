import React, { useEffect, useState } from 'react';
import Axios from 'axios';
import { Button } from 'react-bootstrap';
import { toast } from 'react-toastify';

function GroupsAdminList() {
  const baseURL = import.meta.env.VITE_BASE_URL;
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    Axios.get(`${baseURL}/groups/get-all-groups-with-members.php`)
      .then((response) => {
        setGroups(response.data.groups || []);
      })
      .catch((error) => {
        console.error('Error fetching groups:', error);
      });
  }, [baseURL]);

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Delete "${group.name}"? This cannot be undone.`)) return;
    try {
      const res = await Axios.post(`${baseURL}/groups/delete-group.php`, { group_id: group.id });
      if (res.data.status === 'success') {
        setGroups((prev) => prev.filter((g) => g.id !== group.id));
      } else {
        toast.error(res.data.message || 'Could not delete that group.');
      }
    } catch (err) {
      toast.error('Failed to delete that group - please try again.');
    }
  };

  return (
    <div className="container mt-5">
      <h3 className="mb-4">Groups List</h3>
      <div className="mb-3">
        <span className="badge bg-primary">Groups: {groups.length}</span>
      </div>
      {groups.map((group) => (
        <div key={group.id} className="border rounded p-3 mb-3 bg-white">
          <div className="d-flex justify-content-between align-items-start">
            <h5 className="mb-1">{group.name}</h5>
            <Button size="sm" variant="outline-danger" onClick={() => handleDeleteGroup(group)}>
              Delete Group
            </Button>
          </div>
          <div className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
            Captain: {group.captain_first_name} {group.captain_last_name} ({group.captain_username})
          </div>
          <div className="fw-bold mb-1" style={{ fontSize: '0.85rem' }}>
            Members ({group.members.length}):
          </div>
          <ul className="mb-0">
            {group.members.map((member) => (
              <li key={member.user_id}>
                {member.first_name} {member.last_name} ({member.username})
                {member.is_paused && <span className="badge bg-danger ms-2">Inactive</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default GroupsAdminList;
