import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const statusLabels = {
  pending: 'En attente',
  interview: 'Entretien',
  rejected: 'Refusé',
  accepted: 'Accepté',
  withdrawn: 'Retiré',
};

const statusColors = {
  pending: 'status-pending',
  interview: 'status-interview',
  rejected: 'status-rejected',
  accepted: 'status-accepted',
  withdrawn: 'status-withdrawn',
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [candidatures, setCandidatures] = useState([]);
  const [stats, setStats] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ company: '', jobTitle: '', location: '', source: 'Direct', notes: '', jobUrl: '' });

  // Check session on mount
  useEffect(() => {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      fetch(`${API}/auth/me`, { headers: { 'x-session-id': sessionId } })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then(userData => {
          setUser(userData);
          localStorage.setItem('sessionId', sessionId);
        })
        .catch(() => {
          localStorage.removeItem('sessionId');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch data when user is logged in
  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const sessionId = localStorage.getItem('sessionId');
    try {
      const [candsRes, statsRes] = await Promise.all([
        fetch(`${API}/api/candidatures`, { headers: { 'x-session-id': sessionId } }),
        fetch(`${API}/api/stats`, { headers: { 'x-session-id': sessionId } }),
      ]);
      setCandidatures(await candsRes.json());
      setStats(await statsRes.json());
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const handleLogin = () => {
    window.location.href = `${API}/auth/discord`;
  };

  const handleLogout = async () => {
    const sessionId = localStorage.getItem('sessionId');
    await fetch(`${API}/auth/logout`, { method: 'POST', headers: { 'x-session-id': sessionId } });
    localStorage.removeItem('sessionId');
    setUser(null);
    setCandidatures([]);
    setStats(null);
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    const userData = urlParams.get('user');

    if (sessionId && userData) {
      localStorage.setItem('sessionId', sessionId);
      setUser(JSON.parse(userData));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.company || !form.jobTitle) return;

    const sessionId = localStorage.getItem('sessionId');
    await fetch(`${API}/api/candidatures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
      body: JSON.stringify(form),
    });
    setForm({ company: '', jobTitle: '', location: '', source: 'Direct', notes: '' });
    setShowAddForm(false);
    fetchData();
  };

  const handleStatusChange = async (id, newStatus) => {
    const sessionId = localStorage.getItem('sessionId');
    await fetch(`${API}/api/candidatures/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette candidature ?')) return;
    const sessionId = localStorage.getItem('sessionId');
    await fetch(`${API}/api/candidatures/${id}`, {
      method: 'DELETE',
      headers: { 'x-session-id': sessionId },
    });
    fetchData();
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-dim)' }}>Chargement...</p>
      </div>
    );
  }

  // Login screen
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: 400 }}>
          <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>JobTracker</h1>
          <p style={{ color: 'var(--color-text-dim)', marginBottom: 32 }}>
            Connecte-toi avec Discord pour accéder à ton dashboard de candidatures.
          </p>
          <button onClick={handleLogin} className="btn btn-primary" style={{ width: '100%' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            Connexion avec Discord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
              JobTracker
              <span style={{ color: 'var(--color-accent)', fontSize: '1rem' }}>@{user.username}</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary">
              {showAddForm ? 'Fermer' : '+ Ajouter'}
            </button>
            <button onClick={handleLogout} className="btn btn-outline">Déconnexion</button>
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleAdd} className="card" style={{ marginBottom: 32 }}>
            <h3 style={{ marginBottom: 20 }}>Nouvelle candidature</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <input
                className="input"
                placeholder="Entreprise *"
                value={form.company}
                onChange={e => setForm({ ...form, company: e.target.value })}
                required
              />
              <input
                className="input"
                placeholder="Intitulé du poste *"
                value={form.jobTitle}
                onChange={e => setForm({ ...form, jobTitle: e.target.value })}
                required
              />
              <input
                className="input"
                placeholder="Lieu"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
              />
              <select
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value })}
              >
                <option>Direct</option>
                <option>LinkedIn</option>
                <option>Indeed</option>
                <option>Email</option>
                <option>Other</option>
              </select>
              <input
                className="input"
                placeholder="URL de l'annonce (optionnel)"
                value={form.jobUrl}
                onChange={e => setForm({ ...form, jobUrl: e.target.value })}
              />
            </div>
            <textarea
              className="input"
              placeholder="Notes..."
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              style={{ marginBottom: 16 }}
            />
            <button type="submit" className="btn btn-primary">Ajouter</button>
          </form>
        )}

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 48 }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>{stats.total}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-display)' }}>{stats.byStatus.pending}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>En attente</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#3b82f6', fontFamily: 'var(--font-display)' }}>{stats.byStatus.interview}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Entretiens</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-display)' }}>{stats.byStatus.rejected}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Refusés</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#22c55e', fontFamily: 'var(--font-display)' }}>{stats.byStatus.accepted}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Acceptés</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>{stats.responseRate}%</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Taux réponse</div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="card">
          <h3 style={{ marginBottom: 24 }}>Candidatures</h3>
          {candidatures.length === 0 ? (
            <p style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: 40 }}>Aucune candidature. Ajoute-en une !</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Entreprise</th>
                    <th>Poste</th>
                    <th>Lieu</th>
                    <th>Date</th>
                    <th>Source</th>
                    <th>Annonce</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {candidatures.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.company}</td>
                      <td>{c.job_title}</td>
                      <td style={{ color: 'var(--color-text-dim)' }}>{c.location || '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-dim)' }}>{c.date_applied}</td>
                      <td><span className="tag">{c.source}</span></td>
                      <td>
                        {c.job_url ? (
                          <a href={c.job_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>Lien</a>
                        ) : '—'}
                      </td>
                      <td>
                        <select
                          value={c.status}
                          onChange={e => handleStatusChange(c.id, e.target.value)}
                          style={{ padding: '4px 8px', background: 'transparent', borderWidth: 1, borderStyle: 'solid' }}
                          className={statusColors[c.status]}
                        >
                          <option value="pending">En attente</option>
                          <option value="interview">Entretien</option>
                          <option value="rejected">Refusé</option>
                          <option value="accepted">Accepté</option>
                          <option value="withdrawn">Retiré</option>
                        </select>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(c.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18 }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;
