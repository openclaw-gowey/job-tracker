import { useState, useEffect } from 'react';

const API = '';

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
  const [candidatures, setCandidatures] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ company: '', jobTitle: '', location: '', source: 'Direct', notes: '' });

  const fetchData = async () => {
    try {
      const [candsRes, statsRes] = await Promise.all([
        fetch(`${API}/api/candidatures`),
        fetch(`${API}/api/stats`),
      ]);
      setCandidatures(await candsRes.json());
      setStats(await statsRes.json());
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.company || !form.jobTitle) return;
    await fetch(`${API}/api/candidatures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ company: '', jobTitle: '', location: '', source: 'Direct', notes: '' });
    setShowAddForm(false);
    fetchData();
  };

  const handleStatusChange = async (id, newStatus) => {
    await fetch(`${API}/api/candidatures/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette candidature ?')) return;
    await fetch(`${API}/api/candidatures/${id}`, { method: 'DELETE' });
    fetchData();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-dim)' }}>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 4 }}>JobTracker</h1>
            <p style={{ color: 'var(--color-text-dim)', fontSize: 14 }}>Arthur Laisney — Recherche d'alternance</p>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary">
            {showAddForm ? 'Fermer' : '+ Ajouter'}
          </button>
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
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {candidatures.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.company}</td>
                      <td>{c.jobTitle}</td>
                      <td style={{ color: 'var(--color-text-dim)' }}>{c.location || '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-dim)' }}>{c.dateApplied}</td>
                      <td><span className="tag">{c.source}</span></td>
                      <td>
                        <select
                          value={c.status}
                          onChange={e => handleStatusChange(c.id, e.target.value)}
                          style={{ 
                            padding: '4px 8px',
                            background: 'transparent',
                            borderWidth: 1,
                            borderStyle: 'solid',
                          }}
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
