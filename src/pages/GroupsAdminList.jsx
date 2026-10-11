import React, { useEffect, useState } from 'react';
import Axios from 'axios';

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

  return (
    <div className="container mt-5">
      <h3 className="mb-4">Groups List</h3>
      <div className="mb-3">
        <span className="badge bg-primary">Groups: {groups.length}</span>
      </div>
      {groups.map((group) => (
        <div key={group.id} className="border rounded p-3 mb-3 bg-white">
          <h5 className="mb-1">{group.name}</h5>
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
