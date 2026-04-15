(function() {
  var SURL = 'https://tsxlshijuzvaueszmyze.supabase.co';
  var SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeGxzaGlqdXp2YXVlc3pteXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MjQ3NDMsImV4cCI6MjA5MTQwMDc0M30.iF9pkDPeph3hTV-_7lPyVlO50r9bm8jd_MJEZeIfBDY';
  var _db = null, _sess = null, _mode = 'signin';

  function db() {
    if (!_db) _db = window.supabase.createClient(SURL, SKEY);
    return _db;
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function(_, reject) { setTimeout(function() { reject(new Error('timeout')); }, ms); })
    ]);
  }

  function refresh() {
    window.renderStats && window.renderStats();
    window.renderList && window.renderList();
    window.renderNotes && window.renderNotes();
    window.renderHome && setTimeout(window.renderHome, 100);
    window.checkDailyAlerts && setTimeout(window.checkDailyAlerts, 200);
  }

  // ── AUTH MODAL ────────────────────────────────────────────────
  var modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.88);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML =
    '<div style="background:#1a1b1e;border:1px solid #333;border-radius:20px;padding:28px 24px;width:100%;max-width:360px">' +
    '<div style="text-align:center;margin-bottom:24px"><div style="font-size:20px;font-weight:800;color:#fff">NQ Terminal</div>' +
    '<div style="font-size:13px;color:#888;margin-top:4px">Connecte-toi pour synchroniser tes trades</div></div>' +
    '<div id="auth-err" style="display:none;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:10px;font-size:12px;color:#ef4444;margin-bottom:14px"></div>' +
    '<div style="margin-bottom:12px"><div style="font-size:11px;color:#888;margin-bottom:6px">EMAIL</div>' +
    '<input type="email" id="auth-email" style="width:100%;background:#252629;border:1px solid #333;border-radius:8px;padding:10px 12px;color:#fff;font-size:14px;outline:none;box-sizing:border-box" placeholder="ton@email.com"/></div>' +
    '<div style="margin-bottom:16px"><div style="font-size:11px;color:#888;margin-bottom:6px">MOT DE PASSE</div>' +
    '<input type="password" id="auth-pwd" style="width:100%;background:#252629;border:1px solid #333;border-radius:8px;padding:10px 12px;color:#fff;font-size:14px;outline:none;box-sizing:border-box" placeholder="6+ caracteres"/></div>' +
    '<button id="auth-btn" onclick="window._nqAuth()" style="width:100%;background:#3b82f6;border:none;border-radius:10px;padding:13px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:8px">Se connecter</button>' +
    '<button onclick="window._nqSkip()" style="width:100%;background:none;border:1px solid #333;border-radius:10px;padding:10px;color:#888;font-size:12px;cursor:pointer;margin-bottom:8px">Continuer sans compte</button>' +
    '<div style="text-align:center"><button onclick="window._nqToggle()" style="background:none;border:none;color:#60a5fa;font-size:12px;cursor:pointer" id="auth-tog">Pas de compte ? Creer un compte</button></div>' +
    '</div>';
  document.body.appendChild(modal);

  // ── SKIP: ferme le modal, NE touche PAS aux données ───────────
  window._nqSkip = function() { modal.style.display = 'none'; };

  window._nqToggle = function() {
    _mode = _mode === 'signin' ? 'signup' : 'signin';
    document.getElementById('auth-btn').textContent = _mode === 'signin' ? 'Se connecter' : 'Creer le compte';
    document.getElementById('auth-tog').textContent = _mode === 'signin' ? 'Pas de compte ? Creer un compte' : 'Deja un compte ? Se connecter';
  };

  window._nqAuth = async function() {
    var email = document.getElementById('auth-email').value.trim();
    var pwd   = document.getElementById('auth-pwd').value;
    var errEl = document.getElementById('auth-err');
    var btn   = document.getElementById('auth-btn');
    errEl.style.display = 'none';
    if (!email || !pwd) { errEl.textContent = 'Email et mot de passe requis'; errEl.style.display = 'block'; return; }
    btn.textContent = '...'; btn.disabled = true;
    try {
      var res = _mode === 'signin'
        ? await db().auth.signInWithPassword({ email: email, password: pwd })
        : await db().auth.signUp({ email: email, password: pwd });
      btn.disabled = false;
      btn.textContent = _mode === 'signin' ? 'Se connecter' : 'Creer le compte';
      if (res.error) { errEl.textContent = res.error.message; errEl.style.display = 'block'; return; }
      if (_mode === 'signup' && !res.data.session) {
        errEl.style.background = 'rgba(34,197,94,.1)';
        errEl.style.borderColor = 'rgba(34,197,94,.3)';
        errEl.style.color = '#22c55e';
        errEl.textContent = 'Compte cree ! Verifie ton email puis connecte-toi.';
        errEl.style.display = 'block';
        _mode = 'signin';
        btn.textContent = 'Se connecter';
        return;
      }
      _sess = res.data.session;
      modal.style.display = 'none';
      await _nqLoad();
    } catch(e) {
      btn.disabled = false;
      btn.textContent = 'Se connecter';
      errEl.textContent = 'Erreur: ' + e.message;
      errEl.style.display = 'block';
    }
  };

  // ── LOAD FROM SUPABASE (avec fallback local) ──────────────────
  async function _nqLoad() {
    try {
      // Vérifie si Supabase a déjà des trades
      var existing = await withTimeout(db().from('trades').select('id').limit(1), 5000);

      // Migration localStorage → Supabase seulement si Supabase est vide
      if (!existing.data || existing.data.length === 0) {
        var local = localStorage.getItem('nqt-v8') || localStorage.getItem('nqt-v7');
        if (local) {
          var d = JSON.parse(local);
          if (d.trades && d.trades.length > 0) {
            var rows = d.trades.map(function(t) {
              return {
                id: t.id, ts: t.ts, date: t.date, session: t.session,
                direction: t.direction, status: t.status, entry: t.entry,
                sl: t.sl||null, tp: t.tp||null, pnl: t.pnl,
                maxhold: t.maxhold||null, size: t.size, rr: t.rr||null,
                strategy: t.strategy, note: t.note||null,
                disc: t.disc != null ? t.disc : null,
                disc_details: t.discDetails||null
              };
            });
            await withTimeout(db().from('trades').insert(rows), 10000);
          }
          if (d.notes && d.notes.length > 0) {
            await withTimeout(db().from('notes').insert(d.notes.map(function(n) {
              return { id: n.id, ts: n.ts, date: n.date, title: n.title, body: n.body };
            })), 5000);
          }
        }
      }

      // Charge depuis Supabase
      var results = await withTimeout(Promise.all([
        db().from('trades').select('*').order('ts', { ascending: false }),
        db().from('notes').select('*').order('ts', { ascending: false })
      ]), 10000);

      var t = results[0], n = results[1];
      if (t.data && t.data.length > 0) {
        window.S.trades = t.data.map(function(x) {
          return {
            id: x.id, ts: x.ts, date: x.date, session: x.session,
            direction: x.direction, status: x.status, entry: x.entry,
            sl: x.sl, tp: x.tp, pnl: x.pnl, maxhold: x.maxhold,
            size: x.size, rr: x.rr, strategy: x.strategy, note: x.note,
            disc: x.disc, discDetails: x.disc_details
          };
        });
      }
      if (n.data && n.data.length > 0) {
        window.S.notes = n.data.map(function(x) {
          return { id: x.id, ts: x.ts, date: x.date, title: x.title, body: x.body };
        });
      }
      // Sauvegarde en local comme backup
      try { localStorage.setItem('nqt-v8', JSON.stringify({ trades: window.S.trades, notes: window.S.notes })); } catch(e) {}
    } catch(e) {
      console.error('Supabase load error:', e.message);
      // En cas d'erreur/timeout → les données localStorage restent intactes, on continue
    }
    addSignOutBtn();
    refresh();
  }

  // ── PATCH SAVE / EDIT / DELETE ────────────────────────────────
  function patch() {
    var oST = window.saveTrade;
    window.saveTrade = async function() {
      oST && oST();
      if (!_sess || !window.S.trades.length) return;
      var t = window.S.trades[window.S.trades.length - 1];
      try {
        await db().from('trades').upsert({
          id: t.id, ts: t.ts, date: t.date, session: t.session,
          direction: t.direction, status: t.status, entry: t.entry,
          sl: t.sl||null, tp: t.tp||null, pnl: t.pnl, maxhold: t.maxhold||null,
          size: t.size, rr: t.rr||null, strategy: t.strategy, note: t.note||null,
          disc: t.disc != null ? t.disc : null, disc_details: t.discDetails||null
        });
      } catch(e) {}
    };

    var oSE = window.saveEdit;
    window.saveEdit = async function() {
      var id = document.getElementById('e-id') ? document.getElementById('e-id').value : null;
      oSE && oSE();
      if (!_sess || !id) return;
      var t = window.S.trades.find(function(x) { return x.id === id; });
      if (!t) return;
      try {
        await db().from('trades').upsert({
          id: t.id, ts: t.ts, date: t.date, session: t.session,
          direction: t.direction, status: t.status, entry: t.entry,
          sl: t.sl||null, tp: t.tp||null, pnl: t.pnl, maxhold: t.maxhold||null,
          size: t.size, rr: t.rr||null, strategy: t.strategy, note: t.note||null,
          disc: t.disc != null ? t.disc : null, disc_details: t.discDetails||null
        });
      } catch(e) {}
    };

    var oDT = window.deleteTrade;
    window.deleteTrade = async function(id) {
      oDT && oDT(id);
      if (!_sess) return;
      try { await db().from('trades').delete().eq('id', id); } catch(e) {}
    };

    var oSN = window.saveNote;
    window.saveNote = async function() {
      oSN && oSN();
      if (!_sess || !window.S.notes.length) return;
      var n = window.S.notes[0];
      try { await db().from('notes').upsert({ id: n.id, ts: n.ts, date: n.date, title: n.title, body: n.body }); } catch(e) {}
    };

    var oDN = window.deleteNote;
    window.deleteNote = async function() {
      var cid = window.curNote;
      oDN && oDN();
      if (!_sess || !cid) return;
      try { await db().from('notes').delete().eq('id', cid); } catch(e) {}
    };
  }

  // ── SIGN OUT — NE SUPPRIME JAMAIS LES DONNÉES LOCALES ────────
  function addSignOutBtn() {
    var existing = document.getElementById('supa-signout');
    if (existing) return;
    var btn = document.createElement('button');
    btn.id = 'supa-signout';
    btn.textContent = 'Deconnexion';
    btn.style.cssText = 'position:fixed;bottom:80px;right:16px;z-index:999;background:#1a1b1e;border:1px solid #333;border-radius:8px;color:#888;font-size:11px;padding:6px 10px;cursor:pointer;font-family:inherit';
    btn.onclick = async function() {
      if (!confirm('Se deconnecter ?')) return;
      try { await db().auth.signOut(); } catch(e) {}
      // Supprime UNIQUEMENT les clés de session Supabase — PAS les trades
      Object.keys(localStorage).forEach(function(k) {
        if (k.startsWith('sb-') || (k.includes('supabase') && !k.startsWith('nqt-'))) {
          localStorage.removeItem(k);
        }
      });
      _sess = null;
      _db   = null;
      // ✅ On NE vide PAS S.trades et S.notes — les données locales restent intactes
      modal.style.display = 'flex';
      btn.remove();
    };
    document.body.appendChild(btn);
  }

  // ── INIT ──────────────────────────────────────────────────────
  async function init() {
    patch();
    try {
      var r = await withTimeout(db().auth.getSession(), 5000);
      if (r.data && r.data.session) {
        _sess = r.data.session;
        modal.style.display = 'none';
        await _nqLoad();
        return;
      }
    } catch(e) {
      console.error('Session check failed:', e.message);
      // Timeout ou erreur Supabase → on affiche juste le modal (user peut skip)
    }
    // Pas de session active → modal d'auth (l'user peut cliquer "Continuer sans compte")
  }

  init();
})();
