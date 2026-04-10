import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const DB_PATH = join(__dirname, '../data/candidatures.json');

app.use(cors());
app.use(express.json());

// Load DB
function loadDB() {
  try {
    const data = readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { candidatures: [] };
  }
}

// Save DB
function saveDB(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// GET all candidatures
app.get('/api/candidatures', (req, res) => {
  const db = loadDB();
  res.json(db.candidatures);
});

// POST add candidature
app.post('/api/candidatures', (req, res) => {
  const db = loadDB();
  const { company, jobTitle, location, source, notes } = req.body;

  if (!company || !jobTitle) {
    return res.status(400).json({ error: 'company et jobTitle sont requis' });
  }

  const newCandidature = {
    id: uuidv4(),
    company,
    jobTitle,
    location: location || '',
    dateApplied: new Date().toISOString().split('T')[0],
    status: 'pending',
    source: source || 'Direct',
    notes: notes || '',
    lastUpdate: new Date().toISOString()
  };

  db.candidatures.push(newCandidature);
  saveDB(db);

  res.status(201).json(newCandidature);
});

// PATCH update candidature
app.patch('/api/candidatures/:id', (req, res) => {
  const db = loadDB();
  const { id } = req.params;
  const updates = req.body;

  const index = db.candidatures.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Candidature non trouvée' });
  }

  db.candidatures[index] = {
    ...db.candidatures[index],
    ...updates,
    id: db.candidatures[index].id,
    lastUpdate: new Date().toISOString()
  };

  saveDB(db);
  res.json(db.candidatures[index]);
});

// DELETE candidature
app.delete('/api/candidatures/:id', (req, res) => {
  const db = loadDB();
  const { id } = req.params;

  const index = db.candidatures.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Candidature non trouvée' });
  }

  db.candidatures.splice(index, 1);
  saveDB(db);

  res.json({ success: true });
});

// GET stats
app.get('/api/stats', (req, res) => {
  const db = loadDB();
  const candidatures = db.candidatures;

  const total = candidatures.length;
  const byStatus = {
    pending: candidatures.filter(c => c.status === 'pending').length,
    interview: candidatures.filter(c => c.status === 'interview').length,
    rejected: candidatures.filter(c => c.status === 'rejected').length,
    accepted: candidatures.filter(c => c.status === 'accepted').length,
    withdrawn: candidatures.filter(c => c.status === 'withdrawn').length,
  };

  const responded = byStatus.interview + byStatus.rejected + byStatus.accepted + byStatus.withdrawn;
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

  // Candidatures par mois
  const byMonth = {};
  candidatures.forEach(c => {
    const month = c.dateApplied.substring(0, 7); // YYYY-MM
    byMonth[month] = (byMonth[month] || 0) + 1;
  });

  // Source distribution
  const bySource = {};
  candidatures.forEach(c => {
    bySource[c.source] = (bySource[c.source] || 0) + 1;
  });

  res.json({
    total,
    byStatus,
    responseRate,
    byMonth,
    bySource
  });
});

app.listen(PORT, () => {
  console.log(`JobTracker server running on port ${PORT}`);
});
