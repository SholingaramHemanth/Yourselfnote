const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User');
const Note = require('./models/Note');
const Task = require('./models/Task');
const { requireAuth } = require('./middleware/auth');

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, '..');
const isPreview = Boolean(process.env.MANUS_PROJECT_ID || process.env.PREVIEW_ORIGIN);
let dbReady = false;
let dbError = null;

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.static(path.join(ROOT, 'public')));

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isPreview,
    sameSite: isPreview ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 14,
    path: '/',
  };
}

function sendError(res, status, error, details) {
  return res.status(status).json({ ok: false, error, ...(details ? { details } : {}) });
}

function dbGuard(req, res, next) {
  if (!dbReady) return sendError(res, 503, 'Database is not connected. Configure MONGO_URI and restart the server.', dbError);
  next();
}

function normalizeTags(tags) {
  const list = Array.isArray(tags) ? tags : String(tags || '').split(',');
  return [...new Set(list.map((tag) => String(tag).trim().replace(/^#/, '').toLowerCase()).filter(Boolean))].slice(0, 8);
}

function validateNoteInput(body, partial = false) {
  const errors = {};
  if (!partial || body.title !== undefined) {
    const title = String(body.title || '').trim();
    if (!title) errors.title = 'Give this note a title.';
    if (title.length > 140) errors.title = 'Titles must be 140 characters or fewer.';
  }
  if (body.content !== undefined && String(body.content).length > 12000) errors.content = 'Content must be 12,000 characters or fewer.';
  if (body.tags !== undefined && !Array.isArray(body.tags) && typeof body.tags !== 'string') errors.tags = 'Tags must be a list of labels.';
  return errors;
}

function safeNote(note) {
  const item = note.toObject ? note.toObject() : note;
  return {
    id: item._id?.toString?.() || item.id,
    title: item.title,
    content: item.content,
    tags: item.tags || [],
    isPinned: Boolean(item.isPinned),
    isArchived: Boolean(item.isArchived),
    isTrashed: Boolean(item.isTrashed),
    coverTheme: item.coverTheme || 'violet',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function signUser(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, process.env.JWT_SECRET, { expiresIn: '14d' });
}

function publicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, createdAt: user.createdAt };
}

function issueSession(res, user) {
  res.cookie('notely_token', signUser(user), cookieOptions());
}

function notesQuery(req) {
  const query = { user: req.user._id };
  const view = String(req.query.view || 'all');
  if (view === 'trash') query.isTrashed = true;
  else if (view === 'archive') Object.assign(query, { isArchived: true, isTrashed: false });
  else if (view === 'pinned') Object.assign(query, { isPinned: true, isArchived: false, isTrashed: false });
  else Object.assign(query, { isTrashed: false, isArchived: false });

  const search = String(req.query.search || '').trim();
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ title: regex }, { content: regex }, { tags: regex }];
  }
  if (req.query.tag) query.tags = String(req.query.tag).toLowerCase();
  return query;
}

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'notely', database: dbReady, error: dbReady ? null : dbError }));

app.post('/api/auth/register', dbGuard, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const errors = {};
    if (name.length < 2) errors.name = 'Use at least 2 characters for your name.';
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address.';
    if (password.length < 8) errors.password = 'Use at least 8 characters for your password.';
    if (Object.keys(errors).length) return sendError(res, 422, 'Please check the highlighted fields.', errors);
    if (await User.exists({ email })) return sendError(res, 409, 'An account with this email already exists.');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    const token = signUser(user);
    issueSession(res, user);
    return res.status(201).json({ ok: true, user: publicUser(user) });
  } catch (error) { next(error); }
});

app.post('/api/auth/login', dbGuard, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return sendError(res, 422, 'Email and password are required.');
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return sendError(res, 401, 'That email and password combination was not found.');
    issueSession(res, user);
    return res.json({ ok: true, user: publicUser(user) });
  } catch (error) { next(error); }
});

app.post('/api/auth/demo', dbGuard, async (req, res, next) => {
  try {
    const email = 'demo@notely.local';
    let user = await User.findOne({ email }).select('+passwordHash');
    if (!user) user = await User.create({ name: 'Demo Explorer', email, passwordHash: await bcrypt.hash('notely-demo-account', 12) });
    if (!await Note.exists({ user: user._id })) {
      await Note.insertMany([
        { user: user._id, title: 'Welcome to Notely', content: 'A calm place to collect thoughts, plans, and bright little sparks.', tags: ['welcome', 'ideas'], isPinned: true, coverTheme: 'violet' },
        { user: user._id, title: 'Weekend reset', content: 'Walk, read, make something warm, and leave room for a new idea.', tags: ['personal', 'ritual'], coverTheme: 'cyan' },
        { user: user._id, title: 'Project constellation', content: 'Three small steps: define the shape, make the first version, share it.', tags: ['work', 'ideas'], coverTheme: 'amber' },
      ]);
    }
    issueSession(res, user);
    return res.json({ ok: true, user: publicUser(user), demo: true });
  } catch (error) { next(error); }
});

app.post('/api/auth/logout', (req, res) => res.clearCookie('notely_token', cookieOptions()).json({ ok: true }));
app.get('/api/auth/me', dbGuard, requireAuth, (req, res) => res.json({ ok: true, user: publicUser(req.user) }));

app.get('/api/notes', dbGuard, requireAuth, async (req, res, next) => {
  try {
    const sortMap = { newest: { updatedAt: -1 }, oldest: { updatedAt: 1 }, title: { title: 1 } };
    const sort = sortMap[String(req.query.sort || 'newest')] || sortMap.newest;
    const notes = await Note.find(notesQuery(req)).sort(sort).limit(200).lean();
    res.json({ ok: true, notes: notes.map(safeNote) });
  } catch (error) { next(error); }
});

app.post('/api/notes', dbGuard, requireAuth, async (req, res, next) => {
  try {
    const errors = validateNoteInput(req.body);
    if (Object.keys(errors).length) return sendError(res, 422, 'Please check the note fields.', errors);
    const note = await Note.create({
      user: req.user._id,
      title: String(req.body.title).trim(),
      content: String(req.body.content || '').trim(),
      tags: normalizeTags(req.body.tags),
      isPinned: Boolean(req.body.isPinned),
      coverTheme: ['violet', 'cyan', 'amber', 'rose', 'emerald'].includes(req.body.coverTheme) ? req.body.coverTheme : 'violet',
    });
    res.status(201).json({ ok: true, note: safeNote(note) });
  } catch (error) { next(error); }
});

app.put('/api/notes/:id', dbGuard, requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 400, 'That note id is not valid.');
    const errors = validateNoteInput(req.body, true);
    if (Object.keys(errors).length) return sendError(res, 422, 'Please check the note fields.', errors);
    const updates = {};
    if (req.body.title !== undefined) updates.title = String(req.body.title).trim();
    if (req.body.content !== undefined) updates.content = String(req.body.content).trim();
    if (req.body.tags !== undefined) updates.tags = normalizeTags(req.body.tags);
    for (const key of ['isPinned', 'isArchived', 'isTrashed']) if (req.body[key] !== undefined) updates[key] = Boolean(req.body[key]);
    if (req.body.coverTheme && ['violet', 'cyan', 'amber', 'rose', 'emerald'].includes(req.body.coverTheme)) updates.coverTheme = req.body.coverTheme;
    const note = await Note.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, updates, { new: true, runValidators: true });
    if (!note) return sendError(res, 404, 'Note not found in your workspace.');
    res.json({ ok: true, note: safeNote(note) });
  } catch (error) { next(error); }
});

app.delete('/api/notes/:id', dbGuard, requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 400, 'That note id is not valid.');
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return sendError(res, 404, 'Note not found in your workspace.');
    if (String(req.query.permanent) === 'true') {
      if (!note.isTrashed) return sendError(res, 400, 'Only notes already in Trash can be permanently deleted.');
      await note.deleteOne();
      return res.json({ ok: true, permanentlyDeleted: true });
    }
    note.isTrashed = true;
    note.isArchived = false;
    await note.save();
    res.json({ ok: true, note: safeNote(note) });
  } catch (error) { next(error); }
});

app.get('/api/stats', dbGuard, requireAuth, async (req, res, next) => {
  try {
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1));
    const active = { user: req.user._id, isTrashed: false };
    const [totalNotes, pinnedNotes, tags, createdThisWeek] = await Promise.all([
      Note.countDocuments(active),
      Note.countDocuments({ ...active, isPinned: true }),
      Note.distinct('tags', active),
      Note.countDocuments({ ...active, createdAt: { $gte: startOfWeek } }),
    ]);
    res.json({ ok: true, stats: { totalNotes, pinnedNotes, totalTags: tags.length, createdThisWeek } });
  } catch (error) { next(error); }
});

function safeTask(task) {
  const item = task.toObject ? task.toObject() : task;
  return { id: item._id?.toString?.() || item.id, title: item.title, details: item.details || '', priority: item.priority || 'medium', dueDate: item.dueDate, completed: Boolean(item.completed), createdAt: item.createdAt, updatedAt: item.updatedAt };
}

app.get('/api/tasks', dbGuard, requireAuth, async (req, res, next) => {
  try {
    const status = String(req.query.status || 'all');
    const query = { user: req.user._id };
    if (status === 'open') query.completed = false;
    if (status === 'completed') query.completed = true;
    const tasks = await Task.find(query).sort({ completed: 1, dueDate: 1, updatedAt: -1 }).limit(200).lean();
    res.json({ ok: true, tasks: tasks.map(safeTask) });
  } catch (error) { next(error); }
});

app.post('/api/tasks', dbGuard, requireAuth, async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    if (!title) return sendError(res, 422, 'Task title is required.');
    if (title.length > 180) return sendError(res, 422, 'Task titles must be 180 characters or fewer.');
    const task = await Task.create({ user: req.user._id, title, details: String(req.body.details || '').trim(), priority: ['low', 'medium', 'high'].includes(req.body.priority) ? req.body.priority : 'medium', dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null });
    res.status(201).json({ ok: true, task: safeTask(task) });
  } catch (error) { next(error); }
});

app.put('/api/tasks/:id', dbGuard, requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 400, 'That task id is not valid.');
    const updates = {};
    if (req.body.title !== undefined) updates.title = String(req.body.title).trim();
    if (req.body.details !== undefined) updates.details = String(req.body.details).trim();
    if (req.body.priority !== undefined && ['low', 'medium', 'high'].includes(req.body.priority)) updates.priority = req.body.priority;
    if (req.body.dueDate !== undefined) updates.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    if (req.body.completed !== undefined) updates.completed = Boolean(req.body.completed);
    const task = await Task.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, updates, { new: true, runValidators: true });
    if (!task) return sendError(res, 404, 'Task not found in your workspace.');
    res.json({ ok: true, task: safeTask(task) });
  } catch (error) { next(error); }
});

app.delete('/api/tasks/:id', dbGuard, requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 400, 'That task id is not valid.');
    const deleted = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) return sendError(res, 404, 'Task not found in your workspace.');
    res.json({ ok: true, deleted: true });
  } catch (error) { next(error); }
});

app.get('/api/activity', dbGuard, requireAuth, async (req, res, next) => {
  try {
    const notes = await Note.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(6).lean();
    res.json({ ok: true, activity: notes.map((note) => ({ id: note._id, title: note.title, updatedAt: note.updatedAt, type: note.isTrashed ? 'trash' : note.isPinned ? 'pin' : 'edit' })) });
  } catch (error) { next(error); }
});

app.use((error, req, res, next) => {
  console.error('[notely]', error.message);
  if (res.headersSent) return next(error);
  return sendError(res, 500, 'Something went wrong on the server.');
});

async function start() {
  if (!process.env.JWT_SECRET) console.warn('[notely] JWT_SECRET is not configured. Auth requests will fail safely.');
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
      dbReady = true;
      console.log('[notely] MongoDB connected');
    } catch (error) {
      dbError = 'MongoDB connection failed. Check MONGO_URI and database availability.';
      console.error('[notely] MongoDB connection failed:', error.message);
    }
  } else {
    dbError = 'MONGO_URI is not configured.';
    console.warn('[notely] MONGO_URI is not configured.');
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({ root: path.join(ROOT, 'client'), server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(ROOT, 'dist')));
    app.get('*', (req, res) => res.sendFile(path.join(ROOT, 'dist', 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`[notely] listening on ${PORT}`));
}

start();
