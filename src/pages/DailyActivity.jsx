import React, { useEffect, useState, useCallback } from 'react';
import Axios from 'axios';

const GAME_LABELS = {
  wordle: 'Wordle',
  connections: 'Connections',
  phrazle: 'Phrazle',
  quordle: 'Quordle',
  octordle: 'Octordle',
};

function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function DailyActivity() {
  const baseURL = import.meta.env.VITE_BASE_URL;
  const userId = JSON.parse(localStorage.getItem('auth'))?.id;
  const [date, setDate] = useState(todayLocal());
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Axios.get(`${baseURL}/admin/get-daily-activity.php`, { params: { user_id: userId, date } });
      if (res.data.status === 'success') {
        setPlayers(res.data.players || []);
      } else {
        setPlayers([]);
      }
    } catch (err) {
      console.error('Error fetching daily activity:', err);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, [baseURL, userId, date]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return (
    <div className="container mt-5">
      <h3 className="mb-4">Daily Activity</h3>

      <div className="mb-3 d-flex align-items-center gap-2">
        <label htmlFor="activity-date" className="fw-bold mb-0">Date:</label>
        <input
          id="activity-date"
          type="date"
          className="form-control"
          style={{ maxWidth: '200px' }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <span className="badge bg-primary">Gamlers who played: {players.length}</span>
      </div>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : players.length === 0 ? (
        <p className="text-muted">No results entered on this date.</p>
      ) : (
        players.map((player) => (
          <div key={player.username} className="border rounded p-3 mb-2 bg-white d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-bold">{player.username}</div>
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>{player.useremail}</div>
            </div>
            <div>
              {player.games.map((g) => (
                <span key={g} className="badge bg-secondary ms-1">{GAME_LABELS[g] || g}</span>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default DailyActivity;
