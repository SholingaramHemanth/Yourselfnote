import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Archive, ArrowDownAZ, ArrowLeft, ArchiveRestore, Bell, CalendarDays, Check, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, FileText, Feather, Grid2X2, LayoutDashboard, List, LogOut, Menu, MoreVertical,
  Moon, Pencil, Pin, Plus, Search, Settings, Sparkles, Tag, Trash2, UserRound, X, Sun, RotateCcw,
  BookOpen, BriefcaseBusiness, Lightbulb, FolderHeart, SlidersHorizontal, ListTodo, CheckCircle2, Circle, Flag, CalendarClock
} from 'lucide-react';
import './styles.css';

const api = async (path, options = {}) => {
  let response;
  try {
    response = await fetch(path, {
      credentials: 'include',
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
      ...options,
    });
  } catch (networkError) {
    throw new Error('Cannot reach the workspace service. Please refresh and try again.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || (response.status >= 500 ? 'The workspace service is unavailable. Please try again.' : 'Request failed.'));
    error.details = payload.details;
    error.status = response.status;
    throw error;
  }
  return payload;
};

const formatDate = (value, options = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  new Intl.DateTimeFormat('en', options).format(new Date(value));
const relativeDate = (value) => {
  const diff = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (diff < 2) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  if (diff < 10080) return `${Math.round(diff / 1440)}d ago`;
  return formatDate(value, { month: 'short', day: 'numeric' });
};
const initials = (name = '') => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'N';
const coverThemes = ['violet', 'cyan', 'amber', 'rose', 'emerald'];
const themeIcons = { violet: Sparkles, cyan: Lightbulb, amber: BookOpen, rose: FolderHeart, emerald: BriefcaseBusiness };

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthScreen mode="login" />} />
        <Route path="/register" element={<AuthScreen mode="register" />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function ProtectedRoute({ children }) {
  const [state, setState] = useState({ loading: true, user: null });
  useEffect(() => {
    api('/api/auth/me').then((data) => setState({ loading: false, user: data.user })).catch(() => setState({ loading: false, user: null }));
  }, []);
  if (state.loading) return <div className="page-loader"><div className="loader-orbit" /><span>Opening your workspace…</span></div>;
  if (!state.user) return <Navigate to="/login" replace />;
  return React.cloneElement(children, { user: state.user });
}

function AuthScreen({ mode }) {
  const navigate = useNavigate();
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [status, setStatus] = useState({ loading: false, error: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const openDemo = async () => {
    setDemoLoading(true); setStatus({ loading: false, error: '' });
    try { await api('/api/auth/demo', { method: 'POST' }); navigate('/dashboard', { replace: true }); }
    catch (error) { setStatus({ loading: false, error: error.message }); }
    finally { setDemoLoading(false); }
  };
  const submit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '' });
    try {
      const payload = isRegister ? form : { email: form.email, password: form.password };
      await api(`/api/auth/${isRegister ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(payload) });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setStatus({ loading: false, error: error.message });
    }
  };
  return (
    <main className="auth-page">
      <div className="auth-skyline" />
      <div className="auth-orb orb-one" /><div className="auth-orb orb-two" />
      <section className="auth-pitch">
        <Link to="/login" className="brand brand-large"><span className="brand-mark"><Feather size={27} /></span><span>notely</span></Link>
        <div className="pitch-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> your thoughts, your world</p>
          <h1>Make space for<br /><em>good ideas.</em></h1>
          <p>Notely is a calm, cinematic home for the notes, plans, and little sparks that move your world forward.</p>
        </div>
        <div className="pitch-quote"><span>“</span><p>A small note today can create a big opportunity tomorrow.</p><span>”</span></div>
      </section>
      <section className="auth-card glass-panel">
        <div className="auth-card-top"><span className="mini-kicker">{isRegister ? 'Start your ritual' : 'Welcome back'}</span><div className="auth-card-icon"><Sparkles size={18} /></div></div>
        <h2>{isRegister ? 'Create your workspace' : 'Good to see you again.'}</h2>
        <p className="auth-subtitle">{isRegister ? 'A quieter place for louder ideas.' : 'Your next great idea might already be here.'}</p>
        <form onSubmit={submit} className="auth-form">
          {isRegister && <label>Full name<input required minLength="2" autoComplete="name" placeholder="e.g. Alex Morgan" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>}
          <label>Email address<input required type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<div className="password-field"><input required minLength="8" type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder="At least 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><button type="button" className="input-action" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
          {status.error && <div className="form-error"><CircleHelp size={16} />{status.error}</div>}
          <button className="button button-primary button-wide" disabled={status.loading}>{status.loading ? <span className="button-spinner" /> : isRegister ? 'Create my Notely' : 'Open my workspace'}<ArrowLeft size={16} className="arrow-right" /></button>
        </form>
        <button type="button" className="button button-demo button-wide" onClick={openDemo} disabled={demoLoading}>{demoLoading ? <span className="button-spinner" /> : <><Sparkles size={16} /> Try Demo Workspace</>}</button>
        <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to Notely?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create one'}</Link></p>
        <div className="auth-footnote"><LockIcon /> Your notes stay yours. Always.</div>
      </section>
    </main>
  );
}
function LockIcon() { return <span className="lock-icon">✦</span>; }

function Dashboard({ user }) {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [view, setView] = useState('all');
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState('newest');
  const [notes, setNotes] = useState([]);
  const [stats, setStats] = useState({ totalNotes: 0, pinnedNotes: 0, totalTags: 0, createdThisWeek: 0 });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [toast, setToast] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [listView, setListView] = useState(false);
  const [dark, setDark] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [taskStatus, setTaskStatus] = useState('open');
  const [taskDraft, setTaskDraft] = useState({ title: '', details: '', priority: 'medium', dueDate: '' });
  const loadTasks = async () => {
    try { const data = await api(`/api/tasks?status=${taskStatus}`); setTasks(data.tasks); }
    catch (err) { showToast(err.message, 'error'); }
  };
  const saveTask = async (event) => {
    event.preventDefault();
    if (!taskDraft.title.trim()) return;
    try { await api('/api/tasks', { method: 'POST', body: JSON.stringify(taskDraft) }); setTaskDraft({ title: '', details: '', priority: 'medium', dueDate: '' }); showToast('Task added.'); await loadTasks(); }
    catch (err) { showToast(err.message, 'error'); }
  };
  const toggleTask = async (task) => { try { await api(`/api/tasks/${task.id}`, { method: 'PUT', body: JSON.stringify({ completed: !task.completed }) }); showToast(task.completed ? 'Task reopened.' : 'Task completed.'); await loadTasks(); } catch (err) { showToast(err.message, 'error'); } };
  const removeTask = async (task) => { if (!window.confirm(`Delete “${task.title}”?`)) return; try { await api(`/api/tasks/${task.id}`, { method: 'DELETE' }); showToast('Task deleted.'); await loadTasks(); } catch (err) { showToast(err.message, 'error'); } };
  const loadData = async () => {
    setLoading(true); setError('');
    try {
      const query = new URLSearchParams({ view, sort });
      if (search.trim()) query.set('search', search.trim());
      if (tag) query.set('tag', tag);
      const [noteData, statData, activityData] = await Promise.all([api(`/api/notes?${query}`), api('/api/stats'), api('/api/activity')]);
      setNotes(noteData.notes); setStats(statData.stats); setActivity(activityData.activity);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { const timer = setTimeout(loadData, search ? 250 : 0); return () => clearTimeout(timer); }, [view, search, tag, sort]);
  useEffect(() => { loadTasks(); }, [taskStatus]);
  useEffect(() => { const handler = (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus(); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, []);
  useEffect(() => { document.body.dataset.theme = dark ? 'dark' : 'light'; return () => delete document.body.dataset.theme; }, [dark]);
  const allTags = useMemo(() => [...new Set(notes.flatMap((note) => note.tags))].slice(0, 10), [notes]);
  const tagCounts = useMemo(() => { const counts = {}; notes.flatMap((note) => note.tags).forEach((item) => { counts[item] = (counts[item] || 0) + 1; }); return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6); }, [notes]);
  const greet = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const showToast = (message, kind = 'success') => { setToast({ message, kind }); setTimeout(() => setToast(null), 3200); };
  const saveNote = async (draft) => {
    try {
      const data = draft.id ? await api(`/api/notes/${draft.id}`, { method: 'PUT', body: JSON.stringify(draft) }) : await api('/api/notes', { method: 'POST', body: JSON.stringify(draft) });
      setEditor(null); showToast(draft.id ? 'Note updated.' : 'Note created.'); await loadData(); return data;
    } catch (err) { showToast(err.message, 'error'); throw err; }
  };
  const updateNote = async (note, patch, message) => { try { await api(`/api/notes/${note.id}`, { method: 'PUT', body: JSON.stringify(patch) }); showToast(message); await loadData(); } catch (err) { showToast(err.message, 'error'); } };
  const deleteNote = async (note, permanent = false) => { try { await api(`/api/notes/${note.id}${permanent ? '?permanent=true' : ''}`, { method: 'DELETE' }); showToast(permanent ? 'Note permanently deleted.' : 'Note moved to Trash.'); await loadData(); } catch (err) { showToast(err.message, 'error'); } };
  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); navigate('/login', { replace: true }); };
  const nav = (nextView) => { setView(nextView); setTag(''); setMobileNav(false); if (nextView === 'search') setTimeout(() => searchRef.current?.focus(), 0); };
  return <div className="app-shell">
    <Sidebar user={user} view={view} onNavigate={nav} onNew={() => setEditor({})} onNotify={showToast} mobileOpen={mobileNav} onClose={() => setMobileNav(false)} onLogout={logout} stats={stats} />
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <main className="main-column">
      <Topbar user={user} search={search} setSearch={setSearch} searchRef={searchRef} dark={dark} setDark={setDark} onMenu={() => setMobileNav(true)} onLogout={logout} onNotify={() => showToast('You are all caught up.')} />
      <div className="content-wrap">
        <Hero user={user} onNew={() => setEditor({})} />
        <div className="stats-grid"><StatCard icon={FileText} label="Total notes" value={stats.totalNotes} tone="violet" delta="Your thinking, in one place" /><StatCard icon={Pin} label="Pinned notes" value={stats.pinnedNotes} tone="emerald" delta="Ideas worth keeping close" /><StatCard icon={Tag} label="Tags in use" value={stats.totalTags} tone="cyan" delta="A little order, a lot of clarity" /><StatCard icon={CalendarDays} label="This week" value={stats.createdThisWeek} tone="amber" delta="New notes since Monday" /></div>
        <div className="workspace-layout">
          <TaskWorkspace visible={view === 'tasks'} tasks={tasks} status={taskStatus} setStatus={setTaskStatus} draft={taskDraft} setDraft={setTaskDraft} onSubmit={saveTask} onToggle={toggleTask} onDelete={removeTask} />
          <section className={`notes-area ${view === 'tasks' ? 'hidden-panel' : ''}`}>
            <div className="section-heading"><div><p className="eyebrow">Your collection</p><h2>{view === 'trash' ? 'Trash' : view === 'archive' ? 'Archive' : view === 'pinned' ? 'Pinned notes' : view === 'tags' ? 'Tags' : view === 'search' ? 'Search notes' : view === 'all-notes' ? 'All notes' : 'Recent notes'}</h2></div><div className="heading-actions"><button className="icon-button desktop-only" title="Grid view" aria-label="Grid view" onClick={() => setListView(false)} data-active={!listView}><Grid2X2 size={17} /></button><button className="icon-button desktop-only" title="List view" aria-label="List view" onClick={() => setListView(true)} data-active={listView}><List size={17} /></button><button className="button button-soft" onClick={() => setEditor({})}><Plus size={16} /> New note</button></div></div>
            <div className="filter-row"><div className="filter-scroll"><button className={`filter-chip ${!tag ? 'active' : ''}`} onClick={() => setTag('')}>All notes <span>{view === 'all' || view === 'all-notes' ? stats.totalNotes : ''}</span></button>{allTags.map((item) => <button className={`filter-chip ${tag === item ? 'active' : ''}`} key={item} onClick={() => setTag(item)}>#{item}</button>)}</div><label className="sort-select"><SlidersHorizontal size={14} /><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort notes"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select></label></div>
            {error && <div className="state-card error-state"><CircleHelp size={22} /><div><strong>We couldn’t load this view</strong><p>{error}</p></div><button className="button button-soft" onClick={loadData}>Try again</button></div>}
            {loading && !error ? <LoadingGrid listView={listView} /> : !error && notes.length === 0 ? <EmptyState view={view} onNew={() => setEditor({})} /> : !error && <div className={listView ? 'note-list' : 'note-grid'}>{notes.map((note) => <NoteCard key={note.id} note={note} listView={listView} onOpen={() => setEditor(note)} onPin={() => updateNote(note, { isPinned: !note.isPinned }, note.isPinned ? 'Unpinned.' : 'Pinned to your collection.')} onArchive={() => updateNote(note, { isArchived: !note.isArchived }, note.isArchived ? 'Restored from Archive.' : 'Archived.')} onRestore={() => updateNote(note, { isTrashed: false }, 'Restored from Trash.')} onDelete={() => deleteNote(note, Boolean(note.isTrashed))} />)}</div>}
          </section>
          <aside className="context-rail"><CalendarWidget /><TagsWidget tagCounts={tagCounts} activeTag={tag} onTag={setTag} /><ActivityTimeline activity={activity} /><button className="rail-create-button" onClick={() => setEditor({})}><Plus size={18} /> Create new note</button></aside>
        </div>
      </div>
    </main>
    {editor && <NoteEditor note={editor} onClose={() => setEditor(null)} onSave={saveNote} />}
    {toast && <div className={`toast toast-${toast.kind}`}><span className="toast-mark">{toast.kind === 'success' ? <Check size={15} /> : <CircleHelp size={15} />}</span>{toast.message}</div>}
  </div>;
}

function TaskWorkspace({ visible, tasks, status, setStatus, draft, setDraft, onSubmit, onToggle, onDelete }) {
  const openCount = tasks.filter((task) => !task.completed).length;
  return <section className={`tasks-area ${visible ? '' : 'hidden-panel'}`}><div className="tasks-hero"><div><p className="eyebrow"><ListTodo size={14} /> Focus mode</p><h2>Tasks that move things forward.</h2><p>Turn the next small step into momentum. Keep priorities visible and progress gentle.</p></div><div className="task-progress"><strong>{openCount}</strong><span>open tasks</span></div></div><form className="task-create glass-panel" onSubmit={onSubmit}><div className="task-create-main"><input aria-label="Task title" required maxLength={180} placeholder="What needs your attention?" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /><input aria-label="Task details" placeholder="Add a little context…" value={draft.details} onChange={(e) => setDraft({ ...draft, details: e.target.value })} /></div><div className="task-create-options"><label><Flag size={14} /> <select aria-label="Task priority" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select></label><label><CalendarClock size={14} /><input aria-label="Task due date" type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} /></label><button className="button button-primary"><Plus size={16} /> Add task</button></div></form><div className="task-list-heading"><div><p className="eyebrow">Your next steps</p><h3>{status === 'open' ? 'Open tasks' : status === 'completed' ? 'Completed tasks' : 'All tasks'}</h3></div><div className="task-filters">{[['open','Open'],['all','All'],['completed','Done']].map(([value,label]) => <button type="button" className={status === value ? 'active' : ''} key={value} onClick={() => setStatus(value)}>{label}</button>)}</div></div>{tasks.length ? <div className="task-list">{tasks.map((task) => <article className={`task-item ${task.completed ? 'task-complete' : ''}`} key={task.id}><button type="button" className="task-check" aria-label={task.completed ? 'Reopen task' : 'Complete task'} onClick={() => onToggle(task)}>{task.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}</button><div className="task-copy"><strong>{task.title}</strong>{task.details && <p>{task.details}</p>}<div className="task-meta"><span className={`priority priority-${task.priority}`}><Flag size={11} /> {task.priority}</span>{task.dueDate && <span><CalendarClock size={11} /> due {formatDate(task.dueDate, { month: 'short', day: 'numeric' })}</span>}</div></div><button type="button" className="task-delete" aria-label={`Delete ${task.title}`} onClick={() => onDelete(task)}><Trash2 size={15} /></button></article>)}</div> : <div className="task-empty"><ListTodo size={30} /><h3>{status === 'completed' ? 'No completed tasks yet.' : 'Your task list is clear.'}</h3><p>Add one small next step above and let the momentum build.</p></div>}</section>;
}

function Sidebar({ user, view, onNavigate, onNew, onNotify, mobileOpen, onClose, onLogout, stats }) {
  const items = [{ id: 'all', label: 'Dashboard', icon: LayoutDashboard }, { id: 'all-notes', label: 'All notes', icon: FileText }, { id: 'pinned', label: 'Pinned', icon: Pin, count: stats.pinnedNotes }, { id: 'tasks', label: 'Tasks', icon: ListTodo }, { id: 'tags', label: 'Tags', icon: Tag }, { id: 'search', label: 'Search', icon: Search }, { id: 'archive', label: 'Archive', icon: Archive }, { id: 'trash', label: 'Trash', icon: Trash2 }];
  const go = (id) => { onNavigate(id); };
  return <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}><div className="sidebar-inner"><div className="sidebar-brand"><Link to="/" className="brand"><span className="brand-mark"><Feather size={21} /></span><span>notely</span></Link><button className="icon-button mobile-only" onClick={onClose} aria-label="Close navigation"><X size={18} /></button></div><p className="brand-tagline">Capture <i>•</i> Organize <i>•</i> Grow</p><nav className="side-nav" aria-label="Primary navigation">{items.map(({ id, label, icon: Icon, count }) => <button key={label} className={`side-nav-item ${(view === id || (id === 'all' && view === 'all')) ? 'active' : ''}`} onClick={() => go(id)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{count ? <b>{count}</b> : null}</button>)}</nav><div className="side-divider" /><div className="side-section-label">Spaces <button className="tiny-plus" aria-label="Add a space" title="Create a note in a new space" onClick={onNew}><Plus size={13} /></button></div><button className="space-item" onClick={() => onNavigate('all-notes')}><span className="space-dot space-purple" />Personal <span className="space-count">{stats.totalNotes}</span></button><button className="space-item" onClick={() => onNavigate('tags')}><span className="space-dot space-cyan" />Ideas <span className="space-count">{stats.totalTags}</span></button><button className="space-item" onClick={() => onNavigate('all-notes')}><span className="space-dot space-amber" />This week <span className="space-count">{stats.createdThisWeek}</span></button><div className="upgrade-card"><div className="upgrade-stars"><Sparkles size={15} /> a small ritual</div><strong>“A small note today<br /><em>can create a big opportunity tomorrow.”</em></strong><p>Keep the thought close until it is ready to grow.</p><button onClick={onNew}>Write a note <ArrowLeft size={15} className="arrow-right" /></button></div><div className="sidebar-bottom"><button className="profile-row" onClick={() => onNotify(`Signed in as ${user.email}.`)} title="View account status"><span className="avatar avatar-small">{initials(user.name)}</span><span className="profile-copy"><strong>{user.name}</strong><small>{user.email}</small></span><Settings size={17} /></button><button className="logout-link" onClick={onLogout}><LogOut size={14} /> Sign out</button></div></div></aside>;
}

function Topbar({ user, search, setSearch, searchRef, dark, setDark, onMenu, onLogout, onNotify }) { return <header className="topbar"><button className="icon-button mobile-only" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button><div className="top-search"><Search size={18} /><input ref={searchRef} placeholder="Search by title, content or tags…" value={search} onChange={(e) => setSearch(e.target.value)} /><kbd>⌘ K</kbd></div><div className="top-actions"><button className="icon-button" aria-label="Toggle theme" onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button><button className="icon-button notification-button" aria-label="Notifications" title="Notifications" onClick={onNotify}><Bell size={18} /><span /></button><button className="top-avatar avatar" onClick={onLogout} title="Sign out">{initials(user.name)}</button></div></header>; }
function Hero({ user, onNew }) { const hour = new Date().getHours(); const timeWord = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'; return <section className="hero"><div className="hero-art" /><div className="hero-content"><p className="eyebrow"><span className="eyebrow-dot" /> a little room to think</p><h1>Good {timeWord},<br /><span>{user.name.split(' ')[0]}</span> <span className="wave">✦</span></h1><p>Capture your thoughts, organize your ideas,<br className="desktop-only" /> and turn small sparks into something real.</p><button className="hero-cta" onClick={onNew}><Plus size={16} /> Capture an idea</button></div><div className="hero-note"><span>Good ideas</span><strong>start with a note.</strong><i /></div></section>; }
function StatCard({ icon: Icon, label, value, tone, delta }) { return <article className={`stat-card stat-${tone}`}><div className="stat-icon"><Icon size={20} /></div><div><span>{label}</span><strong>{value}</strong><small>{delta}</small></div><div className="stat-spark"><i /><i /><i /><i /><i /></div></article>; }

function NoteCard({ note, listView, onOpen, onPin, onArchive, onRestore, onDelete }) { const ThemeIcon = themeIcons[note.coverTheme] || Sparkles; return <article className={`note-card note-${note.coverTheme} ${listView ? 'note-card-list' : ''}`}><button className="note-cover" onClick={onOpen} aria-label={`Open ${note.title}`}><span className="cover-glow" /><ThemeIcon size={listView ? 19 : 25} /></button><div className="note-body"><div className="note-head"><button className="note-title" onClick={onOpen}>{note.title}</button><div className="note-menu"><button className="icon-button tiny" aria-label="Note actions"><MoreVertical size={17} /></button><div className="note-menu-popover"><button onClick={onOpen}><Pencil size={14} /> Edit note</button><button onClick={onPin}><Pin size={14} /> {note.isPinned ? 'Unpin' : 'Pin'}</button>{note.isTrashed ? <button onClick={onRestore}><RotateCcw size={14} /> Restore</button> : <button onClick={onArchive}><Archive size={14} /> {note.isArchived ? 'Restore' : 'Archive'}</button>}<button className="danger-action" onClick={onDelete}><Trash2 size={14} /> {note.isTrashed ? 'Delete forever' : 'Move to trash'}</button></div></div></div>{note.isPinned && <span className="pin-badge"><Pin size={11} fill="currentColor" /></span>}<p className="note-preview">{note.content || 'A blank page is still a beginning.'}</p><div className="note-footer"><div className="tag-list">{note.tags.slice(0, 3).map((item, index) => <span className={`tag tag-${index % 4}`} key={item}>#{item}</span>)}</div><span className="note-date"><Clock3 size={12} />{relativeDate(note.updatedAt)}</span></div></div></article>; }
function LoadingGrid({ listView }) { return <div className={listView ? 'note-list' : 'note-grid'}>{[1, 2, 3, 4].map((item) => <div className="skeleton-note" key={item}><div className="skeleton-cover shimmer" /><div className="skeleton-lines"><span className="shimmer" /><span className="shimmer" /><span className="shimmer short" /></div></div>)}</div>; }
function EmptyState({ view, onNew }) { const labels = { search: ['No matching notes.', 'Try another search phrase or clear the search field.'], tags: ['No tagged notes yet.', 'Add a tag to a note and it will appear in this collection.'], 'all-notes': ['Your first note is waiting.', 'Start with a thought, a question, or the thing you do not want to forget.'], trash: ['Trash is clear.', 'Deleted notes will rest here until you decide their fate.'], archive: ['Nothing archived yet.', 'Give older ideas a quieter corner when you are ready.'], pinned: ['Pin your north stars.', 'The notes you keep close will appear in this little constellation.'], all: ['Your first note is waiting.', 'Start with a thought, a question, or the thing you do not want to forget.'] }; const [title, copy] = labels[view] || labels.all; return <div className="state-card empty-state"><div className="empty-orbit"><Feather size={24} /></div><h3>{title}</h3><p>{copy}</p>{view === 'all' && <button className="button button-primary" onClick={onNew}><Plus size={16} /> Create your first note</button>}</div>; }

function NoteEditor({ note, onClose, onSave }) { const [draft, setDraft] = useState({ title: note.title || '', content: note.content || '', tags: note.tags || [], isPinned: Boolean(note.isPinned), coverTheme: note.coverTheme || coverThemes[Math.floor(Math.random() * coverThemes.length)] }); const [tagInput, setTagInput] = useState(''); const [saving, setSaving] = useState(false); const [dirty, setDirty] = useState(false); useEffect(() => { const handler = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler); }, [dirty]); const close = () => { if (!dirty || window.confirm('Discard your unsaved changes?')) onClose(); }; const addTag = () => { const next = tagInput.trim().replace(/^#/, '').toLowerCase(); if (next && !draft.tags.includes(next)) setDraft({ ...draft, tags: [...draft.tags, next].slice(0, 8) }); setTagInput(''); }; const save = async (e) => { e.preventDefault(); if (!draft.title.trim()) return; setSaving(true); try { await onSave({ ...draft, title: draft.title.trim(), content: draft.content.trim() }); setDirty(false); } finally { setSaving(false); } }; return <div className="modal-layer"><button className="modal-backdrop" onClick={close} aria-label="Close editor" /><section className="editor-modal glass-panel"><div className="editor-top"><div><p className="eyebrow">{note.id ? 'Refine the thought' : 'A fresh page'}</p><h2>{note.id ? 'Edit note' : 'Create a note'}</h2></div><button className="icon-button" onClick={close} aria-label="Close editor"><X size={19} /></button></div><form onSubmit={save}><label className="editor-label">Title<input className="title-input" autoFocus required maxLength="140" value={draft.title} onChange={(e) => { setDirty(true); setDraft({ ...draft, title: e.target.value }); }} placeholder="What is on your mind?" /></label><label className="editor-label">Content<textarea value={draft.content} onChange={(e) => { setDirty(true); setDraft({ ...draft, content: e.target.value }); }} placeholder="Let the thought unfold…" rows="9" maxLength="12000" /></label><div className="editor-options"><div><span className="editor-label">Tags</span><div className="tag-input"><div className="tag-list">{draft.tags.map((item) => <span className="tag tag-purple" key={item}>#{item}<button type="button" onClick={() => setDraft({ ...draft, tags: draft.tags.filter((tag) => tag !== item) })}><X size={11} /></button></span>)}</div><input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} onBlur={addTag} placeholder="Add a tag…" /></div></div><label className="pin-toggle"><input type="checkbox" checked={draft.isPinned} onChange={(e) => { setDirty(true); setDraft({ ...draft, isPinned: e.target.checked }); }} /><span><Pin size={16} /> Pin this note</span></label></div><div className="cover-picker"><span className="editor-label">Cover mood</span><div>{coverThemes.map((theme) => <button type="button" key={theme} className={`mood-dot mood-${theme} ${draft.coverTheme === theme ? 'selected' : ''}`} onClick={() => { setDirty(true); setDraft({ ...draft, coverTheme: theme }); }} aria-label={`Use ${theme} cover`} />)}</div></div><div className="editor-actions"><button type="button" className="button button-ghost" onClick={close}>Cancel</button><button className="button button-primary" disabled={saving || !draft.title.trim()}>{saving ? <span className="button-spinner" /> : <><Check size={16} /> Save note</>}</button></div></form></section></div>; }

function CalendarWidget() { const [offset, setOffset] = useState(0); const current = new Date(); const shown = new Date(current.getFullYear(), current.getMonth() + offset, 1); const monthName = new Intl.DateTimeFormat('en', { month: 'long' }).format(shown); const first = shown.getDay(); const days = new Date(shown.getFullYear(), shown.getMonth() + 1, 0).getDate(); const isToday = (day) => offset === 0 && day === current.getDate(); return <section className="rail-card calendar-card"><div className="rail-card-heading"><div><span className="rail-kicker">Your rhythm</span><h3>{monthName} <span>{shown.getFullYear()}</span></h3></div><div className="calendar-arrows"><button type="button" className="icon-button tiny" aria-label="Previous month" title="Previous month" onClick={() => setOffset(offset - 1)}><ChevronLeft size={14} /></button><button type="button" className="icon-button tiny" aria-label="Next month" title="Next month" onClick={() => setOffset(offset + 1)}><ChevronRight size={14} /></button></div></div><div className="calendar-grid calendar-week"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div><div className="calendar-grid calendar-days">{Array.from({ length: first }).map((_, i) => <span className="calendar-muted" key={`blank-${i}`} />)}{Array.from({ length: days }).map((_, i) => <span className={isToday(i + 1) ? 'calendar-today' : ''} key={i}>{i + 1}</span>)}</div></section>; }
function TagsWidget({ tagCounts, activeTag, onTag }) { return <section className="rail-card"><div className="rail-card-heading"><div><span className="rail-kicker">Organize softly</span><h3>Popular tags</h3></div><Tag size={17} className="rail-icon" /></div>{tagCounts.length ? <div className="popular-tags">{tagCounts.map(([item, count], index) => <button className={`popular-tag popular-${index % 4} ${activeTag === item ? 'selected' : ''}`} key={item} onClick={() => onTag(activeTag === item ? '' : item)}>#{item}<b>{count}</b></button>)}</div> : <p className="rail-empty">Tags will appear as your collection grows.</p>}</section>; }
function ActivityTimeline({ activity }) { return <section className="rail-card activity-card"><div className="rail-card-heading"><div><span className="rail-kicker">A gentle trail</span><h3>Recent activity</h3></div><Clock3 size={17} className="rail-icon" /></div>{activity.length ? <div className="timeline">{activity.slice(0, 4).map((item) => <div className="timeline-item" key={item.id}><span className={`timeline-dot dot-${item.type}`}>{item.type === 'pin' ? <Pin size={11} /> : item.type === 'trash' ? <Trash2 size={11} /> : <Pencil size={11} />}</span><div><strong>{item.type === 'pin' ? 'Pinned a note' : item.type === 'trash' ? 'Moved a note to Trash' : 'Updated a note'}</strong><p>{item.title}</p><small>{relativeDate(item.updatedAt)}</small></div></div>)}</div> : <p className="rail-empty">Your recent note moments will land here.</p>}</section>; }

createRoot(document.getElementById('root')).render(<App />);
