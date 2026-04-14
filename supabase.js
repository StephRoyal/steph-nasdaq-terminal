// NQ Terminal - Supabase Integration
(function() {
  const SURL = 'https://tsxlshijuzvaueszmyze.supabase.co';
  const SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeGxzaGlqdXp2YXVlc3pteXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MjQ3NDMsImV4cCI6MjA5MTQwMDc0M30.iF9pkDPeph3hTV-_7lPyVlO50r9bm8jd_MJEZeIfBDY';
  let _db = null, _sess = null, _mode = 'signin';

  function db() {
    if (!_db) _db = window.supabase.createClient(SURL, SKEY);
    return _db;
  }

  // ── INJECT AUTH MODAL ───────────────────────────────────────────
  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.88);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = [
    '<div style="background:var(--ink2);border:1px solid var(--border);border-radius:20px;padding:28px 24px;width:100%;max-width:360px">',
    '<div style="text-align:center;margin-bottom:24px">',
    '<div style="font-size:32px;margin-bottom:8px">NQ</div>',
    '<div style="font-size:20px;font-weight:800">NQ Terminal</div>',
    '<div id="auth-sub" style="font-size:13px;color:var(--text3);margin-top:4px">Connecte-toi pour acceder a tes donnees</div>',
    '</div>',
    '<div id="auth-err" style="display:none;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:10px;font-size:12px;color:#ef4444;margin-bottom:14px"></div>',
    '<div style="margin-bottom:12px"><div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.07em">Email</div><input type="email" id="auth-email" style="width:100%;background:var(--ink3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:14px;outline:none" placeholder="ton@email.com"/></div>',
    '<div style="margin-bottom:20px"><div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.07em">Mot de passe</div><input type="password" id="auth-pwd" style="width:100%;background:var(--ink3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:14px;outline:none" placeholder="6+ caracteres"/></div>',
    '<button id="auth-btn" onclick="window._nqAuth()" style="width:100%;background:var(--acc);border:none;border-radius:10px;padding:13px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font)">Se connecter</button>',
    '<div style="text-align:center;margin-top:12px"><button onclick="window._nqToggle()" style="background:none;border:none;color:var(--acc2);font-size:12px;cursor:pointer;font-family:var(--font)" id="auth-tog">Pas de compte ? Creer un compte</button></div>',
    '</div>'
  ].join('');
  document.body.appendChild(modal);

  // ── LOADING OVERLAY ─────────────────────────────────────────────
  const ld = document.createElement('div');
  ld.id = 'supa-ld';
  ld.style.cssText = 'position:fixed;inset:0;background:rgba(10,11,15,.92);z-index:9997;display:none;flex-direction:column;align-items:center;justify-content:center;gap:16px';
  ld.innerHTML = '<div style="width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--acc);border-radius:50%;animation:spin 1s linear infinite"></div><div id="supa-ld-msg" style="font-size:14px;color:var(--text2)">Chargement...</div>';
  document.body.appendChild(ld);

  function showLd(msg) { ld.style.display = 'flex'; document.getElementById('supa-ld-msg').textContent = msg; }
  function hideLd() { ld.style.display = 'none'; }

  // ── AUTH FUNCTIONS ──────────────────────────────────────────────
  window._nqToggle = function() {
    _mode = _mode === 'signin' ? 'signup' : 'signin';
    document.getElementById('auth-btn').textContent = _mode === 'signin' ? 'Se connecter' : 'Creer le compte';
    document.getElementById('auth-tog').textContent = _mode === 'signin' ? 'Pas de compte ? Creer un compte' : 'Deja un compte ? Se connecter';
  };

  window._nqAuth = async function() {
    const email = document.getElementById('auth-email').value.trim();
    const pwd = document.getElementById('auth-pwd').value;
    const errEl = document.getElementById('auth-err');
    const btn = document.getElementById('auth-btn');
    errEl.style.display = 'none';
    if (!email || !pwd) { errEl.textContent = 'Email et mot de passe requis'; errEl.style.display = 'block'; return; }
    btn.textContent = '...'; btn.disabled = true;
    const res = _mode === 'signin'
      ? await db().auth.signInWithPassword({ email, password: pwd })
      : await db().auth.signUp({ email, password: pwd });
    btn.disabled = false;
    btn.textContent = _mode === 'signin' ? 'Se connecter' : 'Creer le compte';
    if (res.error) { errEl.textContent = res.error.message; errEl.style.display = 'block'; return; }
    if (_mode === 'signup' && !res.data.session) {
      errEl.style.cssText += ';background:rgba(34,197,94,.1);border-color:rgba(34,197,94,.3);color:#22c55e';
      errEl.textContent = 'Compte cree ! Verifie ton email puis connecte-toi.';
      errEl.style.display = 'block'; _mode = 'signin'; btn.textContent = 'Se connecter'; return;
    }
    _sess = res.data.session;
    modal.style.display = 'none';
    await _nqLoad();
  };

  // ── LOAD + MIGRATE ──────────────────────────────────────────────
  async function _nqLoad() {
    showLd('Chargement de vos donnees...');
    const existing = await db().from('trades').select('id').limit(1);
    if (!existing.data || existing.data.length === 0) {
      showLd('Migration en cours...');
      await _migrate();
    }
    const [t, n] = await Promise.all([
      db().from('trades').select('*').order('ts', { ascending: false }),
      db().from('notes').select('*').order('ts', { ascending: false })
    ]);
    if (t.data) {
      window.S.trades = t.data.map(function(x) {
        return { id:x.id, ts:x.ts, date:x.date, session:x.session, direction:x.direction,
          status:x.status, entry:x.entry, sl:x.sl, tp:x.tp, pnl:x.pnl, maxhold:x.maxhold,
          size:x.size, rr:x.rr, strategy:x.strategy, note:x.note, disc:x.disc, discDetails:x.disc_details };
      });
    }
    if (n.data) {
      window.S.notes = n.data.map(function(x) {
        return { id:x.id, ts:x.ts, date:x.date, title:x.title, body:x.body };
      });
    }
    try { localStorage.setItem('nqt-v8', JSON.stringify({ trades: window.S.trades, notes: window.S.notes })); } catch(e) {}
    hideLd();
    window.renderStats(); window.renderList(); window.renderNotes();
    setTimeout(window.checkDailyAlerts, 200);
  }

  async function _migrate() {
    const local = localStorage.getItem('nqt-v8') || localStorage.getItem('nqt-v7');
    if (!local) return;
    try {
      const d = JSON.parse(local);
      if (d.trades && d.trades.length > 0) {
        const rows = d.trades.map(function(t) {
          return { id:t.id, ts:t.ts, date:t.date, session:t.session, direction:t.direction,
            status:t.status, entry:t.entry, sl:t.sl||null, tp:t.tp||null, pnl:t.pnl,
            maxhold:t.maxhold||null, size:t.size, rr:t.rr||null, strategy:t.strategy,
            note:t.note||null, disc:t.disc!=null?t.disc:null, disc_details:t.discDetails||null };
        });
        await db().from('trades').insert(rows);
        console.log('Migrated', rows.length, 'trades');
      }
      if (d.notes && d.notes.length > 0) {
        await db().from('notes').insert(d.notes.map(function(n) {
          return { id:n.id, ts:n.ts, date:n.date, title:n.title, body:n.body };
        }));
      }
    } catch(e) { console.error('Migration error:', e); }
  }

  // ── PATCH SAVE FUNCTIONS ────────────────────────────────────────
  function patch() {
    const origSaveTrade = window.saveTrade;
    window.saveTrade = async function() {
      origSaveTrade && origSaveTrade();
      if (!_sess) return;
      const t = window.S.trades[window.S.trades.length - 1];
      if (t) await db().from('trades').upsert({ id:t.id, ts:t.ts, date:t.date, session:t.session,
        direction:t.direction, status:t.status, entry:t.entry, sl:t.sl||null, tp:t.tp||null,
        pnl:t.pnl, maxhold:t.maxhold||null, size:t.size, rr:t.rr||null, strategy:t.strategy,
        note:t.note||null, disc:t.disc!=null?t.disc:null, disc_details:t.discDetails||null });
    };
    const origSaveEdit = window.saveEdit;
    window.saveEdit = async function() {
      const id = document.getElementById('e-id') ? document.getElementById('e-id').value : null;
      origSaveEdit && origSaveEdit();
      if (!_sess || !id) return;
      const t = window.S.trades.find(function(x) { return x.id === id; });
      if (t) await db().from('trades').upsert({ id:t.id, ts:t.ts, date:t.date, session:t.session,
        direction:t.direction, status:t.status, entry:t.entry, sl:t.sl||null, tp:t.tp||null,
        pnl:t.pnl, maxhold:t.maxhold||null, size:t.size, rr:t.rr||null, strategy:t.strategy,
        note:t.note||null, disc:t.disc!=null?t.disc:null, disc_details:t.discDetails||null });
    };
    const origDel = window.deleteTrade;
    window.deleteTrade = async function(id) {
      origDel && origDel(id);
      if (_sess) await db().from('trades').delete().eq('id', id);
    };
    const origSaveNote = window.saveNote;
    window.saveNote = async function() {
      origSaveNote && origSaveNote();
      if (!_sess || !window.S.notes.length) return;
      const n = window.S.notes[0];
      await db().from('notes').upsert({ id:n.id, ts:n.ts, date:n.date, title:n.title, body:n.body });
    };
    const origDelNote = window.deleteNote;
    window.deleteNote = async function() {
      const cid = window.curNote;
      origDelNote && origDelNote();
      if (_sess && cid) await db().from('notes').delete().eq('id', cid);
    };
  }

  // ── INIT ────────────────────────────────────────────────────────
  async function init() {
    patch();
    const r = await db().auth.getSession();
    if (r.data && r.data.session) {
      _sess = r.data.session;
      modal.style.display = 'none';
      await _nqLoad();
    }
  }

  init();
})();
