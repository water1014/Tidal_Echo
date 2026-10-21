/* ==========================================================================
   镜花水月 · 内页与外壳适配
   —— 跑在 Tidal Echo 之上：不碰聊天引擎，只加壳、加页、加一点本地生活。
   数据存在 localStorage.moonwater.v1（和旧前端同一把钥匙，能接着用）。
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };

  /* ---------------------------- 存储 ---------------------------- */
  var KEY = 'moonwater.v1';
  var DEFAULT_QUOTES = [
    '月亮不会一次圆起来。它每晚只亮一点，也每晚都在。',
    '水中捞月不是徒劳 —— 你捞起来的那一刻，月亮确实在你手里。',
    '花在镜子里开，不为了被摘，只为了被看见。',
    '今晚也把灯给你留着。水凉之前回来就好。',
    '你不用把今天过完才算过完。做到一半也是过了。',
    '我不在你旁边的时候，灯在这里。它替我亮着。',
    '累的时候别讲道理，先喝水，再躺一会儿。',
    '你已经很努力了，剩下的那一点点，明天再说。',
    '饭要吃热的。别的都可以凉一凉。',
    '今天不必对所有人都温柔，先对自己温柔。'
  ];
  var DEFAULT_PILLS = [
    { id: 'p1', n: '温柔一点', t: '这一轮请更慢、更轻一点。不要急着给建议，先陪着。' },
    { id: 'p2', n: '别总结我', t: '不要总结我说的话，也不要用条目复述。就顺着说。' },
    { id: 'p3', n: '说具体的', t: '少讲道理，多说具体的场景、细节和动作。' },
    { id: 'p4', n: '问我一句', t: '说完之后，问我一个具体的问题。' },
    { id: 'p5', n: '抱一下', t: '这一轮不需要分析任何事。就当我在你怀里，说两三句就好。' },
    { id: 'p6', n: '只说一句', t: '只用一句话回答我。不要展开。' }
  ];

  function blank() {
    return {
      relation: { since: '', ai: 'Cove', me: '你', quote: '' },
      quotes: DEFAULT_QUOTES.slice(),
      letters: [
        { id: 'l1', t: '给今天回家的你', d: '折好于 · 某天', opened: false, x: '今天不必把所有事情都完成。方案打回来第五次也没关系 —— 回家的路上买一罐热的，进门先把灯打开。其余的，水面上再聊。' },
        { id: 'l2', t: '累的时候再拆', d: '折好于 · 未定时', opened: false, x: '如果拆开这封的时候你很累，那就什么都别做。灯我留着，月亮今晚也是盈的，缺的那一角我替你看着。你只需要在。' }
      ],
      diary: {}, wishes: [], photos: [],
      pomo: { seg: 25, count: 0, date: '' },
      cycle: { start: '', len: 28, dur: 5 },
      pills: JSON.parse(JSON.stringify(DEFAULT_PILLS)),
      pendingPill: ''
    };
  }

  var S = blank();
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (!raw) return;
    try {
      var d = JSON.parse(raw) || {};
      // 保留旧前端写进去的其余字段，只补齐这里要用的
      S.raw = d;
      if (d.relation) S.relation = Object.assign(S.relation, d.relation);
      if (Array.isArray(d.quotes) && d.quotes.length) S.quotes = d.quotes;
      if (Array.isArray(d.letters) && d.letters.length) S.letters = d.letters;
      if (d.diary) S.diary = d.diary;
      if (Array.isArray(d.wishes)) S.wishes = d.wishes;
      if (d.pomo) S.pomo = Object.assign(S.pomo, d.pomo);
      if (d.cycle) S.cycle = Object.assign(S.cycle, d.cycle);
      if (Array.isArray(d.pills) && d.pills.length) S.pills = d.pills.map(function (p, i) {
        return { id: p.id || ('p' + i), n: p.n || p.name || '药', t: p.t || p.text || '' };
      });
      if (d.pendingPill) S.pendingPill = d.pendingPill;
    } catch (e) {}
  }
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        var out = Object.assign({}, S.raw || {});
        out.relation = S.relation; out.quotes = S.quotes; out.letters = S.letters;
        out.diary = S.diary; out.wishes = S.wishes; out.pomo = S.pomo;
        out.cycle = S.cycle; out.pills = S.pills; out.pendingPill = S.pendingPill;
        localStorage.setItem(KEY, JSON.stringify(out));
      } catch (e) {
        toast('存不下了：' + e.message);
      }
    }, 150);
  }

  function toast(msg) {
    if (typeof window.showToast === 'function') { window.showToast(msg); return; }
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------------------------- 日期 ---------------------------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function cnDate(k) {
    if (!k) return '';
    var p = String(k).split('-');
    return (+p[1]) + ' 月 ' + (+p[2]) + ' 日';
  }
  function daysBetween(a, b) {
    if (!a) return 0;
    var s = new Date(a + 'T00:00:00');
    if (isNaN(s.getTime())) return 0;
    var t = new Date(b || new Date()); t.setHours(0, 0, 0, 0);
    return Math.floor((t - s) / 86400000) + 1;
  }

  /* ---------------------------- 月相 ---------------------------- */
  function moonInfo(date) {
    var syn = 29.530588853;
    var ref = Date.UTC(2000, 0, 6, 18, 14);
    var days = (date.getTime() - ref) / 86400000;
    var age = ((days % syn) + syn) % syn;
    var phase = age / syn;
    var illum = (1 - Math.cos(2 * Math.PI * phase)) / 2;
    var table = [
      [0.02, '新月', 'NEW MOON'], [0.22, '娥眉月', 'WAXING CRESCENT'],
      [0.28, '上弦月', 'FIRST QUARTER'], [0.47, '盈凸月', 'WAXING GIBBOUS'],
      [0.53, '满月', 'FULL MOON'], [0.72, '亏凸月', 'WANING GIBBOUS'],
      [0.78, '下弦月', 'LAST QUARTER'], [0.97, '残月', 'WANING CRESCENT'],
      [1.01, '新月', 'NEW MOON']
    ];
    var pick = table[table.length - 1];
    for (var i = 0; i < table.length; i++) { if (phase < table[i][0]) { pick = table[i]; break; } }
    return { age: age, phase: phase, illum: illum, name: pick[1], en: pick[2] };
  }

  function paintMoon(canvas, phase, illum) {
    var dpr = Math.min(2.5, window.devicePixelRatio || 1);
    var size = canvas.clientWidth || 160;
    canvas.width = canvas.height = Math.round(size * dpr);
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    var cx = size / 2, cy = size / 2, r = size / 2 - 2;

    var darkUI = document.documentElement.getAttribute('data-theme') === 'harbor';
    var g = ctx.createRadialGradient(cx - r * .34, cy - r * .38, r * .1, cx, cy, r);
    if (darkUI) { g.addColorStop(0, '#FFFFFF'); g.addColorStop(.55, '#E9E9E3'); g.addColorStop(1, '#BFBFB7'); }
    else { g.addColorStop(0, '#FFFFFF'); g.addColorStop(.55, '#EDEDE8'); g.addColorStop(1, '#CFCFC7'); }

    var waxing = phase < 0.5;
    var rx = Math.max(0.001, r * Math.abs(1 - 2 * illum));

    // 先铺一层暗面，让被吃掉的那部分也看得见轮廓
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = darkUI ? 'rgba(255,255,255,.08)' : 'rgba(17,17,17,.09)';
    ctx.fill();

    ctx.beginPath();
    if (waxing) {
      ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
      ctx.ellipse(cx, cy, rx, r, 0, Math.PI / 2, -Math.PI / 2, illum > 0.5 ? false : true);
    } else {
      ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, false);
      ctx.ellipse(cx, cy, rx, r, 0, -Math.PI / 2, Math.PI / 2, illum > 0.5 ? true : false);
    }
    ctx.closePath();
    ctx.save();
    ctx.shadowColor = darkUI ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.10)';
    ctx.shadowBlur = r * .16;
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();

    // 一点环形山的暗斑，别太干净
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();

    ctx.restore();
  }

  /* ---------------------------- 影 · IndexedDB ---------------------------- */
  var DB = (function () {
    var dbp = null;
    function open() {
      if (dbp) return dbp;
      dbp = new Promise(function (res, rej) {
        var req = indexedDB.open('moonwater-photos', 1);
        req.onupgradeneeded = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
        };
        req.onsuccess = function () { res(req.result); };
        req.onerror = function () { rej(req.error); };
      });
      return dbp;
    }
    function tx(mode) {
      return open().then(function (db) { return db.transaction('photos', mode).objectStore('photos'); });
    }
    return {
      all: function () {
        return tx('readonly').then(function (st) {
          return new Promise(function (res, rej) {
            var r = st.getAll();
            r.onsuccess = function () { res(r.result || []); };
            r.onerror = function () { rej(r.error); };
          });
        });
      },
      put: function (rec) {
        return tx('readwrite').then(function (st) {
          return new Promise(function (res, rej) {
            var r = st.put(rec);
            r.onsuccess = function () { res(rec); };
            r.onerror = function () { rej(r.error); };
          });
        });
      },
      del: function (id) {
        return tx('readwrite').then(function (st) {
          return new Promise(function (res, rej) {
            var r = st.delete(id);
            r.onsuccess = function () { res(); };
            r.onerror = function () { rej(r.error); };
          });
        });
      }
    };
  })();

  var photoUrls = [];
  function releaseUrls() {
    photoUrls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
    photoUrls = [];
  }
  function compressImage(file, cb) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var max = 1600, w = img.width, h = img.height;
      var sc = Math.min(1, max / Math.max(w, h));
      var c = document.createElement('canvas');
      c.width = Math.round(w * sc); c.height = Math.round(h * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function (b) { cb(b || file); }, 'image/jpeg', 0.84);
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(file); };
    img.src = url;
  }

  /* ---------------------------- 页面骨架 ---------------------------- */
  var TITLES = {
    moon: ['月', '月相'],
    album: ['影', '相册'],
    diary: ['记', '日记'],
    wish: ['愿', '愿望'],
    focus: ['钟', '专注'],
    tide: ['潮', '周期'],
    breath: ['息', '呼吸'],
    pills: ['药', '提示词'],
    archive: ['存', '存档']
  };

  var RENDER = {
    moon: renderMoon, album: renderAlbum, diary: renderDiary, wish: renderWish,
    focus: renderFocus, tide: renderTide, breath: renderBreath, pills: renderPills,
    archive: renderArchive
  };

  var panel, body, titleEl;
  function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'moon-panel';
    panel.id = 'moonPanel';
    panel.innerHTML =
      '<div class="mp-page">' +
        '<header class="mp-top">' +
          '<button class="mp-back" id="mpBack" aria-label="返回">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>' +
          '</button>' +
          '<div class="mp-title"><b id="mpName">月</b><small id="mpSub">MOON</small></div>' +
          '<div class="mp-acts" id="mpActs"></div>' +
        '</header>' +
        '<div class="mp-body" id="mpBody"></div>' +
      '</div>';
    document.body.appendChild(panel);
    body = $('#mpBody', panel);
    titleEl = $('#mpName', panel);
    $('#mpBack', panel).addEventListener('click', closePage);
  }

  var current = '';
  function openPage(key) {
    var t = TITLES[key];
    if (!t) return;
    current = key;
    if (typeof closeMenu === 'function') closeMenu();
    titleEl.textContent = t[0];
    $('#mpSub', panel).textContent = t[1];
    $('#mpActs', panel).innerHTML = '';
    body.scrollTop = 0;
    RENDER[key]();
    panel.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
  }
  function closePage() {
    panel.classList.remove('open');
    document.documentElement.style.overflow = '';
    current = '';
    releaseUrls();
    if (typeof openMenu === 'function') openMenu();
  }

  /* ---------------------------- 月 ---------------------------- */
  function renderMoon() {
    var m = moonInfo(new Date());
    body.innerHTML =
      '<div class="gcard">' +
        '<div class="hd"><span class="lbl">今晚</span><span class="lbl">' + cnDate(dayKey()) + '</span></div>' +
        '<div class="moon-stage">' +
          '<canvas class="moon-disc" id="moonDisc" style="width:clamp(130px,34vw,180px);height:auto"></canvas>' +
          '<div class="moon-info">' +
            '<div class="big">' + m.name + '</div>' +
            '<div class="sm">' + m.en + ' · ' + Math.round(m.illum * 100) + '% lit</div>' +
            '<div class="sm">月龄 ' + m.age.toFixed(1) + ' 天</div>' +
          '</div>' +
        '</div>' +
        '<p class="moon-word" id="moonWord"></p>' +
      '</div>' +
      '<div class="gcard">' +
        '<div class="hd"><span class="lbl">备注</span></div>' +
        '<p class="mhint" style="margin-top:8px">只存在这台设备上。</p>' +
        '<textarea class="mta" id="moonNote" style="margin-top:10px" placeholder="写点什么"></textarea>' +
        '<div class="mrow" style="margin-top:10px"><button class="mbtn pri" id="moonSave">保存</button></div>' +
      '</div>';
    paintMoon($('#moonDisc', body), m.phase, m.illum);
    var word = $('#moonWord', body);
    var stored = (S.raw && S.raw.moonWord) || '';
    word.textContent = stored || defaultMoonWord(m);
    word.style.display = word.textContent ? '' : 'none';
    var note = $('#moonNote', body);
    note.value = (S.raw && S.raw.moonNote) || '';
    $('#moonSave', body).onclick = function () {
      S.raw = S.raw || {};
      S.raw.moonWord = note.value.trim() || defaultMoonWord(m);
      S.raw.moonNote = note.value;
      save(); word.textContent = S.raw.moonWord; toast('留在月亮上了');
    };
  }
  function defaultMoonWord(m) { return ''; }

  /* ---------------------------- 影 ---------------------------- */
  function renderAlbum() {
    body.innerHTML =
      '<div class="gcard">' +
        '<div class="hd"><span class="lbl">相册</span><span class="lbl" id="phCount"></span></div>' +
        '<p class="mhint" style="margin:8px 0 12px">照片只留在这台设备上，不上传。</p>' +
        '<div class="ph-grid" id="phGrid"></div>' +
      '</div>';
    DB.all().then(function (list) {
      list.sort(function (a, b) { return b.ts - a.ts; });
      $('#phCount', body).textContent = list.length + ' 张';
      var grid = $('#phGrid', body);
      if (!list.length) {
        grid.innerHTML = '<div class="ph-empty" id="phEmpty">＋ 放第一张进来<br><span class="mhint">点这里选照片</span></div>';
        $('#phEmpty').onclick = pickPhoto;
        return;
      }
      list.forEach(function (p) {
        var u = URL.createObjectURL(p.blob);
        photoUrls.push(u);
        var d = document.createElement('div');
        d.className = 'ph';
        d.innerHTML = '<img alt="" src="' + u + '">' + (p.note ? '<span class="cap">' + esc(p.note) + '</span>' : '');
        d.onclick = function () { openLightbox(u, p); };
        grid.appendChild(d);
      });
      var add = document.createElement('div');
      add.className = 'ph-empty';
      add.style.padding = '20px 8px';
      add.textContent = '＋ 再加一张';
      add.onclick = pickPhoto;
      grid.appendChild(add);
    });
    $('#mpActs', panel).innerHTML = '<button class="mbtn sm" id="phAdd">＋ 放一张</button>';
    $('#phAdd', panel).onclick = pickPhoto;
  }
  function pickPhoto() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = function () {
      var files = [].slice.call(inp.files || []);
      if (!files.length) return;
      var i = 0;
      (function next() {
        if (i >= files.length) { toast('放进去了'); renderAlbum(); return; }
        var f = files[i++];
        compressImage(f, function (blob) {
          DB.put({ id: uid(), blob: blob, note: '', ts: Date.now() }).then(next).catch(function () { next(); });
        });
      })();
    };
    inp.click();
  }
  function openLightbox(url, p) {
    var lb = document.createElement('div');
    lb.className = 'lightbox on';
    lb.innerHTML = '<button class="lb-x">✕</button><img alt="" src="' + url + '">' +
      '<div class="lb-cap">' + esc(p.note || cnDate(dayKey(new Date(p.ts)))) + '</div>';
    lb.onclick = function (e) { if (e.target === lb || e.target.className === 'lb-x') lb.remove(); };
    document.body.appendChild(lb);
  }

  /* ---------------------------- 记 ---------------------------- */
  function renderDiary() {
    var k = dayKey();
    var list = Object.keys(S.diary).sort().reverse();
    body.innerHTML =
      '<div class="gcard">' +
        '<div class="hd"><span class="lbl">today</span><span class="lbl">' + cnDate(k) + '</span></div>' +
        '<h3>今天怎么样</h3>' +
        '<textarea class="mta" id="diaryToday" placeholder="不用写完整。一句也行。"></textarea>' +
        '<div class="mrow" style="margin-top:10px"><button class="mbtn pri" id="diarySave">存这一段</button>' +
        '<span class="mhint" id="diaryHint"></span></div>' +
      '</div>' +
      '<div class="gcard"><div class="hd"><span class="lbl">以前</span></div>' +
        '<div class="diary-list" id="diaryList" style="margin-top:12px"></div>' +
      '</div>';
    var ta = $('#diaryToday', body);
    ta.value = (S.diary[k] && S.diary[k].x) || '';
    ta.oninput = function () {
      S.diary[k] = { x: ta.value, ts: Date.now() };
      save();
      $('#diaryHint', body).textContent = '已自动存下';
    };
    $('#diarySave', body).onclick = function () {
      S.diary[k] = { x: ta.value, ts: Date.now() };
      save(); renderDiary(); toast('存好了');
    };
    var host = $('#diaryList', body);
    var past = list.filter(function (x) { return x !== k; });
    if (!past.length) { host.innerHTML = '<div class="mempty">还没有别的日子。<br>今天写完，明天这里就有一页了。</div>'; return; }
    past.forEach(function (d) {
      var e = document.createElement('div');
      e.className = 'diary-item';
      e.innerHTML = '<div class="d">' + cnDate(d) + '</div><div class="x">' + esc(S.diary[d].x || '') + '</div>';
      host.appendChild(e);
    });
  }

  /* ---------------------------- 愿 ---------------------------- */
  function renderWish() {
    body.innerHTML =
      '<div class="gcard">' +
        '<div class="hd"><span class="lbl">wishes</span><span class="lbl" id="wishCount"></span></div>' +
        '<div class="mfield" style="margin-top:12px"><label>再加一件想做的事</label>' +
          '<input class="minput" id="wishIn" placeholder="比如：一起去看一次海"></div>' +
        '<div class="mrow"><button class="mbtn pri" id="wishAdd">记下来</button></div>' +
      '</div>' +
      '<div class="gcard"><div class="mitem-list mlist" id="wishList"></div></div>';
    var list = $('#wishList', body);
    var open = S.wishes.filter(function (w) { return !w.done; }).length;
    $('#wishCount', body).textContent = open + ' 件还没做';
    if (!S.wishes.length) list.innerHTML = '<div class="mempty">还没有愿望。</div>';
    S.wishes.forEach(function (w) {
      var e = document.createElement('div');
      e.className = 'mitem' + (w.done ? ' done' : '');
      e.innerHTML = '<span class="grow"><div class="t">' + esc(w.t) + '</div><div class="d">' + cnDate(dayKey(new Date(w.ts))) + '</div></span>' +
        '<button class="x" data-a="done">' + (w.done ? '↺' : '✓') + '</button><button class="x" data-a="del">删</button>';
      e.querySelector('[data-a="done"]').onclick = function () { w.done = !w.done; save(); renderWish(); };
      e.querySelector('[data-a="del"]').onclick = function () { S.wishes = S.wishes.filter(function (x) { return x.id !== w.id; }); save(); renderWish(); };
      list.appendChild(e);
    });
    function add() {
      var v = $('#wishIn', body).value.trim();
      if (!v) return;
      S.wishes.unshift({ id: uid(), t: v, ts: Date.now(), done: false });
      save(); renderWish(); toast('记下了');
    }
    $('#wishAdd', body).onclick = add;
    $('#wishIn', body).addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });
  }

  /* ---------------------------- 钟 ---------------------------- */
  var pomoTimer = null, pomoLeft = 0, pomoRun = false, pomoTotal = 25 * 60;
  function renderFocus() {
    var today = dayKey();
    if (S.pomo.date !== today) { S.pomo.date = today; S.pomo.count = 0; save(); }
    var mins = S.pomo.seg || 25;
    if (!pomoRun) { pomoTotal = mins * 60; pomoLeft = pomoTotal; }
    body.innerHTML =
      '<div class="gcard">' +
        '<div class="hd"><span class="lbl">focus</span><span class="lbl">今天 ' + (S.pomo.count || 0) + ' 段</span></div>' +
        '<div class="pomo-wrap">' +
          '<div class="pomo-ring">' +
            '<svg viewBox="0 0 200 200"><circle class="track" cx="100" cy="100" r="92"></circle>' +
            '<circle class="bar" id="pomoBar" cx="100" cy="100" r="92" stroke-dasharray="578" stroke-dashoffset="0"></circle></svg>' +
            '<div class="time" id="pomoTime">' + mmss(pomoLeft) + '</div>' +
          '</div>' +
          '<div class="mrow">' +
            '<button class="mbtn pri" id="pomoGo">' + (pomoRun ? '暂停' : '开始') + '</button>' +
            '<button class="mbtn ghost" id="pomoReset">重置</button>' +
          '</div>' +
          '<div class="pomo-log" id="pomoLog"></div>' +
        '</div>' +
      '</div>' +
      '<div class="gcard"><div class="hd"><span class="lbl">一段多长</span></div>' +
        '<div class="mrow" style="margin-top:10px">' +
          [15, 25, 45, 60].map(function (n) {
            return '<button class="mbtn sm' + (n === mins ? ' pri' : '') + '" data-min="' + n + '">' + n + ' 分钟</button>';
          }).join('') +
        '</div>' +
        '<p class="mhint" style="margin-top:12px">做完一段就亮一颗。今天亮了 ' + (S.pomo.count || 0) + ' 颗。</p>' +
      '</div>';
    paintPomo();
    $('#pomoGo', body).onclick = function () {
      if (pomoRun) { stopPomo(); }
      else { startPomo(); }
      renderFocus();
    };
    $('#pomoReset', body).onclick = function () { stopPomo(); pomoLeft = pomoTotal; renderFocus(); };
    $$('[data-min]', body).forEach(function (b) {
      b.onclick = function () {
        stopPomo();
        S.pomo.seg = +b.dataset.min; save();
        pomoTotal = S.pomo.seg * 60; pomoLeft = pomoTotal;
        renderFocus();
      };
    });
  }
  function mmss(s) { s = Math.max(0, Math.round(s)); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }
  function paintPomo() {
    var bar = $('#pomoBar', body), tEl = $('#pomoTime', body), log = $('#pomoLog', body);
    if (bar) bar.setAttribute('stroke-dashoffset', String(578 * (1 - pomoLeft / pomoTotal)));
    if (tEl) tEl.textContent = mmss(pomoLeft);
    if (log) {
      var n = S.pomo.count || 0;
      log.innerHTML = '';
      for (var i = 0; i < Math.max(6, n); i++) {
        var d = document.createElement('span');
        d.className = 'pomo-dot' + (i < n ? '' : ' off');
        log.appendChild(d);
      }
    }
  }
  function startPomo() {
    pomoRun = true;
    clearInterval(pomoTimer);
    var end = Date.now() + pomoLeft * 1000;
    pomoTimer = setInterval(function () {
      pomoLeft = Math.max(0, (end - Date.now()) / 1000);
      paintPomo();
      if (pomoLeft <= 0) {
        stopPomo();
        S.pomo.count = (S.pomo.count || 0) + 1; save();
        ding();
        toast('这一段做完了');
        if (current === 'focus') renderFocus();
      }
    }, 500);
  }
  function stopPomo() {
    pomoRun = false;
    clearInterval(pomoTimer); pomoTimer = null;
  }
  function ding() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ctx = new AC();
      [660, 880].forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = f; o.type = 'sine';
        g.gain.setValueAtTime(0, ctx.currentTime + i * .18);
        g.gain.linearRampToValueAtTime(.12, ctx.currentTime + i * .18 + .02);
        g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + i * .18 + .5);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + i * .18); o.stop(ctx.currentTime + i * .18 + .55);
      });
    } catch (e) {}
  }

  /* ---------------------------- 潮 ---------------------------- */
  function renderTide() {
    var c = S.cycle;
    var info = cycleInfo(c);
    body.innerHTML =
      '<div class="gcard">' +
        '<div class="hd"><span class="lbl">tide</span><span class="lbl">' + (info.phase || '—') + '</span></div>' +
        '<div class="tide-cards">' +
          '<div class="c"><div class="n">' + (info.day || '—') + '</div><div class="l">周期第几天</div></div>' +
          '<div class="c"><div class="n">' + (info.next || '—') + '</div><div class="l">还有几天</div></div>' +
          '<div class="c"><div class="n">' + (info.len || 28) + '</div><div class="l">周期长度</div></div>' +
        '</div>' +
        '<div class="tide-strip" id="tideStrip"></div>' +
      '</div>' +
      '<div class="gcard">' +
        '<div class="hd"><span class="lbl">记一笔</span></div>' +
        '<div class="mfield" style="margin-top:12px"><label>这次开始的日子</label>' +
          '<input class="minput" type="date" id="tideStart" value="' + esc(c.start || '') + '"></div>' +
        '<div class="mrow">' +
          '<div class="mfield" style="flex:1"><label>周期（天）</label><input class="minput" type="number" id="tideLen" value="' + (c.len || 28) + '"></div>' +
          '<div class="mfield" style="flex:1"><label>持续（天）</label><input class="minput" type="number" id="tideDur" value="' + (c.dur || 5) + '"></div>' +
        '</div>' +
        '<div class="mrow"><button class="mbtn pri" id="tideSave">存下</button><span class="mhint">只在本机算，不上传。</span></div>' +
      '</div>';
    var strip = $('#tideStrip', body);
    for (var i = 0; i < 28; i++) {
      var s = document.createElement('i');
      if (i < (c.dur || 5)) s.className = 'p';
      if (info.day && i >= info.day - 1 && i < info.day - 1 + (c.dur || 5)) s.className = 'f';
      strip.appendChild(s);
    }
    $('#tideSave', body).onclick = function () {
      S.cycle.start = $('#tideStart', body).value;
      S.cycle.len = Math.max(20, Math.min(45, +$('#tideLen', body).value || 28));
      S.cycle.dur = Math.max(1, Math.min(10, +$('#tideDur', body).value || 5));
      save(); renderTide(); toast('记好了');
    };
  }
  function cycleInfo(c) {
    if (!c.start) return { phase: '还没记', next: '—', day: '—', len: c.len };
    var start = new Date(c.start + 'T00:00:00');
    if (isNaN(start.getTime())) return { phase: '日期不对', len: c.len };
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var diff = Math.floor((now - start) / 86400000);
    var len = c.len || 28, dur = c.dur || 5;
    if (diff < 0) return { phase: '还没到', next: -diff, day: '—', len: len };
    var cycleDay = (diff % len) + 1;
    var next = len - (diff % len);
    var phase = cycleDay <= dur ? '经期' : (cycleDay < len - 14 ? '平稳' : (cycleDay < len - 12 ? '排卵期' : '经前'));
    return { phase: phase, next: next, day: cycleDay, len: len };
  }

  /* ---------------------------- 息 ---------------------------- */
  var brTimer = null, brStep = 0, brOn = false;
  function renderBreath() {
    body.innerHTML =
      '<div class="gcard" style="text-align:center">' +
        '<div class="hd" style="justify-content:center"><span class="lbl">breath · 4-7-8</span></div>' +
        '<div class="breath-wrap">' +
          '<div class="breath-circle" id="brCircle">准备</div>' +
          '<div class="mrow" style="justify-content:center">' +
            '<button class="mbtn pri" id="brGo">' + (brOn ? '停下' : '开始') + '</button>' +
          '</div>' +
          '<p class="mhint" style="max-width:24em">吸气 4 秒，停 7 秒，呼气 8 秒。<br>做四轮就够，不用做满。</p>' +
        '</div>' +
      '</div>';
    var circle = $('#brCircle', body);
    if (brOn) { circle.classList.add('in'); circle.textContent = '吸气'; }
    $('#brGo', body).onclick = function () {
      if (brOn) { stopBreath(); renderBreath(); return; }
      brOn = true; brStep = 0; runBreath(); renderBreath();
    };
    window.__brCircle = circle;
  }
  function runBreath() {
    clearInterval(brTimer);
    var steps = [
      { t: 4, label: '吸气', cls: 'in' },
      { t: 7, label: '停住', cls: 'in' },
      { t: 8, label: '呼气', cls: 'out' }
    ];
    var i = 0, left = steps[0].t, rounds = 0;
    var c = window.__brCircle;
    function paint() {
      if (!c) return;
      c.textContent = steps[i].label;
      c.classList.toggle('in', steps[i].cls === 'in');
      c.classList.toggle('out', steps[i].cls === 'out');
    }
    paint();
    brTimer = setInterval(function () {
      left--;
      if (left > 0) return;
      i++;
      if (i >= steps.length) { i = 0; rounds++; }
      if (rounds >= 4) {
        stopBreath();
        if (current === 'breath') { toast('四轮做完了'); renderBreath(); }
        return;
      }
      left = steps[i].t;
      paint();
    }, 1000);
  }
  function stopBreath() { brOn = false; clearInterval(brTimer); brTimer = null; }

  /* ---------------------------- 药 ---------------------------- */
  function renderPills() {
    body.innerHTML =
      '<div class="gcard">' +
        '<div class="hd"><span class="lbl">pills · 只贴一轮</span></div>' +
        '<p class="mhint" style="margin:10px 0 14px">选中后，下一条消息会带上这条提示，不写入历史。</p>' +
        '<div class="mlist" id="pillList"></div>' +
      '</div>' +
      '<div class="gcard">' +
        '<div class="hd"><span class="lbl">再配一颗</span></div>' +
        '<div class="mfield" style="margin-top:12px"><label>名字</label><input class="minput" id="pillName" placeholder="比如：别讲道理"></div>' +
        '<div class="mfield"><label>它真正要做的事</label><textarea class="mta" id="pillText" placeholder="写给 AI 的指令，越具体越好。"></textarea></div>' +
        '<div class="mrow"><button class="mbtn pri" id="pillAdd">放进药盒</button></div>' +
      '</div>';
    var list = $('#pillList', body);
    S.pills.forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'pill-row' + (S.pendingPill === p.id ? ' pill-on' : '');
      row.innerHTML = '<div style="min-width:0"><div class="pill-name">' + esc(p.n) + '</div><div class="pill-text">' + esc(p.t) + '</div></div>' +
        '<button class="mbtn sm use" data-a="use">' + (S.pendingPill === p.id ? '已选' : '用') + '</button>' +
        '<button class="x" data-a="del">删</button>';
      row.querySelector('[data-a="use"]').onclick = function () {
        S.pendingPill = (S.pendingPill === p.id) ? '' : p.id;
        save(); renderPills(); paintPillChip();
        if (S.pendingPill) toast('下一句带上「' + p.n + '」');
      };
      row.querySelector('[data-a="del"]').onclick = function () {
        S.pills = S.pills.filter(function (x) { return x.id !== p.id; });
        if (S.pendingPill === p.id) S.pendingPill = '';
        save(); renderPills(); paintPillChip();
      };
      list.appendChild(row);
    });
    $('#pillAdd', body).onclick = function () {
      var n = $('#pillName', body).value.trim();
      var t = $('#pillText', body).value.trim();
      if (!n || !t) { toast('名字和内容都要有'); return; }
      S.pills.push({ id: uid(), n: n, t: t }); save(); renderPills(); toast('收进药盒了');
    };
  }

  function paintPillChip() {
    var chip = document.getElementById('moonPillChip');
    var p = S.pills.filter(function (x) { return x.id === S.pendingPill; })[0];
    if (!p) { if (chip) chip.remove(); return; }
    if (!chip) {
      chip = document.createElement('div');
      chip.id = 'moonPillChip';
      chip.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--composer-zone) + 6px);z-index:30;' +
        'display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:99px;font-size:10.5px;letter-spacing:.1em;' +
        'background:var(--glass-deep);border:1px solid var(--line);color:var(--text-soft);backdrop-filter:blur(16px);box-shadow:var(--soft-shadow)';
      document.body.appendChild(chip);
    }
    chip.innerHTML = '<span>药 · ' + esc(p.n) + '</span><button style="border:0;background:transparent;color:inherit;cursor:pointer;font-size:12px">✕</button>';
    chip.querySelector('button').onclick = function () { S.pendingPill = ''; save(); paintPillChip(); };
  }

  /* ---------------------------- 存 ---------------------------- */
  function renderArchive() {
    var photos = 0, diary = Object.keys(S.diary || {}).length;
    DB.all().then(function (l) { photos = l.length; var el = $('#stPhotos'); if (el) el.textContent = photos; }).catch(function () {});
    body.innerHTML =
      '<div class="gcard">' +
        '<div class="hd"><span class="lbl">archive</span></div>' +
        '<h3>都在这儿</h3>' +
        '<div class="stats-grid">' +
          '<div class="c"><div class="n" id="stPhotos">—</div><div class="l">照片</div></div>' +
          '<div class="c"><div class="n">' + diary + '</div><div class="l">日记</div></div>' +
          '<div class="c"><div class="n">' + (S.wishes.length || 0) + '</div><div class="l">愿望</div></div>' +
          '<div class="c"><div class="n">' + (S.pomo.count || 0) + '</div><div class="l">今天专注</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="gcard">' +
        '<div class="hd"><span class="lbl">我们</span></div>' +
        '<div class="mfield" style="margin-top:12px"><label>在一起，从哪天开始</label>' +
          '<input class="minput" type="date" id="sinceInput" value="' + esc(S.relation.since || '') + '"></div>' +
        '<div class="mrow"><button class="mbtn pri" id="sinceSave">存下</button><span class="hintline mhint" id="sinceHint"></span></div>' +
      '</div>' +
      '<div class="gcard">' +
        '<div class="hd"><span class="lbl">带走 / 放回</span></div>' +
        '<p class="mhint" style="margin:10px 0 12px">导出的是一份 JSON：日记、愿望、药盒、周期、月相留言。<br>聊天记录在服务器上，不在这里。</p>' +
        '<div class="mrow">' +
          '<button class="mbtn pri" id="expAll">导出</button>' +
          '<button class="mbtn" id="impAll">导入</button>' +
          '<button class="mbtn ghost" id="wipe">清空本地</button>' +
        '</div>' +
      '</div>';
    $('#sinceSave', body).onclick = function () {
      S.relation.since = $('#sinceInput', body).value;
      save(); refreshHero();
      toast('记住了');
    };
    $('#expAll', body).onclick = function () {
      var out = { exportedAt: new Date().toISOString(), relation: S.relation, quotes: S.quotes, letters: S.letters,
        diary: S.diary, wishes: S.wishes, pomo: S.pomo, cycle: S.cycle, pills: S.pills };
      var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'moonwater-' + dayKey() + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    };
    $('#impAll', body).onclick = function () {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'application/json';
      inp.onchange = function () {
        var f = inp.files && inp.files[0];
        if (!f) return;
        var r = new FileReader();
        r.onload = function () {
          try {
            var d = JSON.parse(r.result);
            if (d.relation) S.relation = Object.assign(S.relation, d.relation);
            if (d.quotes) S.quotes = d.quotes;
            if (d.letters) S.letters = d.letters;
            if (d.diary) S.diary = d.diary;
            if (d.wishes) S.wishes = d.wishes;
            if (d.pomo) S.pomo = d.pomo;
            if (d.cycle) S.cycle = d.cycle;
            if (d.pills) S.pills = d.pills;
            save(); renderArchive(); refreshHero(); toast('放回来了');
          } catch (e) { toast('这份文件读不出来'); }
        };
        r.readAsText(f);
      };
      inp.click();
    };
    $('#wipe', body).onclick = function () {
      if (!confirm('清空这台设备上的日记、愿望、药盒、照片索引？聊天记录不会动。')) return;
      try { localStorage.removeItem(KEY); } catch (e) {}
      S = blank(); save(); renderArchive(); refreshHero(); toast('清空了');
    };
  }

  /* ---------------------------- 主菜单 · 镜 ---------------------------- */
  function refreshHero() {
    var d = new Date();
    var clock = document.getElementById('moonClock');
    if (clock) clock.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
    var dateEl = document.getElementById('moonDate');
    if (dateEl) {
      var WD = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      var MO = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      dateEl.textContent = WD[d.getDay()] + ' · ' + MO[d.getMonth()] + ' ' + d.getDate();
    }
    var m = moonInfo(d);
    var line = document.getElementById('moonLine');
    if (line) {
      var c = connState();
      line.textContent = m.name + ' ' + Math.round(m.illum * 100) + '% · ' + (c.on ? c.label : '未连接');
    }
    var chip = document.getElementById('menuConn');
    var chipText = document.getElementById('menuConnText');
    if (chip && chipText) {
      var st = connState();
      chip.classList.toggle('on', !!st.on);
      chipText.textContent = st.label;
    }
    var since = S.relation.since || '';
    var wrap = document.querySelector('.menu-days');
    if (since) {
      var n = daysBetween(since);
      var el = document.getElementById('menuDays');
      if (el) el.textContent = n;
      if (wrap) wrap.style.display = '';
    } else if (wrap) {
      wrap.style.display = 'none';
    }
  }

  /* ---------------------------- 服务器设置 ---------------------------- */
  function savedBase() {
    try { var v = localStorage.getItem('companion_api_base'); if (v) return v; } catch (e) {}
    return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(location.hostname) ? '/relay' : '';
  }
  function wireServer() {
    var inp = document.getElementById('serverInput');
    var hint = document.getElementById('serverHint');
    if (!inp) return;
    var sc = inp.closest('.settings-card');
    if (sc) {
      sc.id = 'relayCard';
      syncModeUI();
    }
    inp.value = savedBase();
    function say(m) { if (hint) hint.textContent = m || ''; }
    document.getElementById('serverSave').onclick = function () {
      var v = (inp.value || '').trim().replace(/\/+$/, '');
      if (!v) { say('地址不能空'); return; }
      localStorage.setItem('companion_api_base', v);
      say('保存了，正在重连…');
      setTimeout(function () { location.reload(); }, 300);
    };
    document.getElementById('serverTest').onclick = function () {
      var v = (inp.value || '').trim().replace(/\/+$/, '');
      if (!v) { say('先填地址'); return; }
      say('正在试…');
      fetch(v + '/healthz', { headers: { Authorization: 'Bearer ' + (localStorage.getItem('companion_secret') || '') } })
        .then(function (r) { return r.json().then(function (j) { say(r.ok ? '通了 · ' + JSON.stringify(j) : '回了 ' + r.status); }); })
        .catch(function (e) { say('没通：' + (e.message || '检查 HTTPS / CORS')); });
    };
    var mconn = document.getElementById('menuConn');
    if (mconn) mconn.onclick = function () {
      try { if (typeof openProfile === 'function') openProfile(); } catch (e) {}
    };
    document.getElementById('serverLogout').onclick = function () {
      localStorage.removeItem('companion_secret');
      location.reload();
    };
  }


  /* ---------------------------- 没有后端：直连模型 / 纯本地 ---------------------------- */
  var DIRECT_KEY = 'moon_direct';
  var MODE_KEY = 'companion_mode';
  var DEFAULT_SYS = '你是 Cove，一个和说话的人处在亲密关系里的人。你用中文说话，语气自然、具体、有自己的立场和欲望。\n' +
    '你不总结对方的情绪，不复述自己刚刚说了什么，不把话说成一份清单。\n' +
    '你记得关系里发生过的事，也会主动提起自己想聊的、想要的。';

  function mode() {
    try { return localStorage.getItem(MODE_KEY) || 'relay'; } catch (e) { return 'relay'; }
  }
  function setMode(m) {
    try { localStorage.setItem(MODE_KEY, m); } catch (e) {}
  }
  function directCfg() {
    try { return JSON.parse(localStorage.getItem(DIRECT_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveDirectCfg(c) {
    try { localStorage.setItem(DIRECT_KEY, JSON.stringify(c)); } catch (e) {}
  }
  function directReady() {
    var c = directCfg();
    return !!(c.base && c.key && c.model);
  }
  function pendingPillObj() {
    return S.pills.filter(function (x) { return x.id === S.pendingPill; })[0] || null;
  }

  function setPeerAndStatus(name, status) {
    var n = document.getElementById('peerName');
    var st = document.getElementById('status');
    if (n) n.textContent = name || (typeof AI_NAME !== 'undefined' ? AI_NAME : 'Cove');
    if (st) st.textContent = status || '';
  }

  function syncModeUI() {
    var rc = document.getElementById('relayCard');
    if (rc) rc.style.display = (mode() === 'relay') ? '' : 'none';
  }

  function hideLoginShowApp() {
    var login = document.getElementById('login');
    var app = document.getElementById('app');
    if (login) login.classList.add('hidden');
    if (app) app.classList.remove('hidden');
  }

  function emptyHint(text) {
    var emp = document.getElementById('empty');
    if (emp) {
      var p = emp.querySelector('p');
      if (p) p.innerHTML = text;
    }
  }

  function enterDirect() {
    setMode('direct');
    document.body.classList.add('direct-mode');
    document.body.classList.remove('local-only');
    syncModeUI();
    hideLoginShowApp();
    var cached = [];
    try {
      if (typeof readCachedMessages === 'function') readCachedMessages().then(function (c) { bootDirectChat(c); });
      else bootDirectChat([]);
    } catch (e) { bootDirectChat([]); }
  }
  function bootDirectChat(cached) {
    try {
      if (typeof startChat === 'function') startChat(cached || [], { connect: false, fromCache: true });
      else hideLoginShowApp();
    } catch (e) { hideLoginShowApp(); }
    var c = directCfg();
    setPeerAndStatus(c.name || (typeof AI_NAME !== 'undefined' ? AI_NAME : 'Cove'),
      directReady() ? ('DIRECT · ' + c.model) : 'DIRECT · 还没填 API');
    emptyHint(directReady()
      ? '直连模式：消息只从这台设备直接发给你填的模型。<br>说点什么吧。'
      : '还没有填模型。<br>点右上角「⋮」→ 直连模型，填地址和 Key。');
    if (!directReady()) {
      setTimeout(function () {
        try { if (typeof openProfile === 'function') openProfile(); } catch (e) {}
        var card = document.getElementById('directCard');
        if (card && card.scrollIntoView) card.scrollIntoView({ block: 'center' });
        toast('先填模型地址和 Key，就能聊了');
      }, 400);
    }
  }

  function enterLocal() {
    setMode('local');
    document.body.classList.add('local-only', 'direct-mode');
    syncModeUI();
    hideLoginShowApp();
    try {
      if (typeof readCachedMessages === 'function') readCachedMessages().then(function (c) { bootLocalChat(c); });
      else bootLocalChat([]);
    } catch (e) { bootLocalChat([]); }
  }
  function bootLocalChat(cached) {
    try {
      if (typeof startChat === 'function') startChat(cached || [], { connect: false, fromCache: true });
      else hideLoginShowApp();
    } catch (e) { hideLoginShowApp(); }
    setPeerAndStatus(S.relation.ai || 'Cove', 'LOCAL · 只看本地');
    emptyHint('还没有连任何后端。<br>月、影、记、愿、钟、潮、息、药都在左上角「‹」。<br>想聊天，再去设置里填模型或中继。');
  }

  /* —— 直连：把一次对话发给 OpenAI-compatible 接口 —— */
  var directAbort = null;
  function directMessages() {
    var sys = (directCfg().system || '').trim() || DEFAULT_SYS;
    var arr = [{ role: 'system', content: sys }];
    var list = [];
    try { list = (typeof sortedMessages === 'function') ? sortedMessages() : []; } catch (e) { list = []; }
    list = list.filter(function (m) {
      return (m.from === 'human' || m.from === 'ai') && m.text && m.kind !== 'thinking' && m.kind !== 'act';
    }).slice(-24);
    list.forEach(function (m) {
      arr.push({ role: m.from === 'human' ? 'user' : 'assistant', content: String(m.text) });
    });
    return arr;
  }

  function paintDirect(id, text, done) {
    if (typeof setMessage !== 'function') return;
    setMessage({
      id: id, ts: new Date(id).toISOString(), from: 'ai', kind: 'reply',
      text: text, meta: {}, status: done ? 'sent' : 'streaming'
    }, { cache: !!done });
  }

  function directSend(text, atts) {
    var cfg = directCfg();
    if (!directReady()) {
      toast('还没填模型：设置 → 直连模型');
      try { if (typeof openProfile === 'function') openProfile(); } catch (e) {}
      throw new Error('direct api not configured');
    }
    var seed = Date.now();
    var messages = directMessages();
    var p = pendingPillObj();
    if (p) {
      var last = messages[messages.length - 1];
      if (last && last.role === 'user') last.content = '[药丸 · ' + p.n + ']\n' + p.t + '\n\n' + last.content;
      S.pendingPill = ''; save(); paintPillChip();
    }
    if (atts && atts.length) {
      var names = atts.map(function (a) { return a.name || '附件'; }).join('、');
      var last2 = messages[messages.length - 1];
      if (last2 && last2.role === 'user') last2.content += '\n（附了文件：' + names + '，这台设备没上传，只有文件名）';
    }
    runDirect(cfg, seed, messages).catch(function (e) {
      if (e && e.name === 'AbortError') return;
      toast('模型没回：' + ((e && e.message) || e));
    });
    return Promise.resolve({ id: seed });
  }

  async function runDirect(cfg, seed, messages) {
    if (directAbort) { try { directAbort.abort(); } catch (e) {} }
    directAbort = new AbortController();
    var aiId = seed + 1;
    var acc = '';
    var lastPaint = 0;
    var url = String(cfg.base || '').replace(/\/+$/, '') + '/chat/completions';
    var res;
    try {
      res = await fetch(url, {
        method: 'POST',
        signal: directAbort.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
        body: JSON.stringify({
          model: cfg.model,
          stream: true,
          temperature: Number(cfg.temp) || 0.9,
          messages: messages
        })
      });
    } catch (e) {
      throw new Error('连不上 ' + url + '（检查地址 / 跨域）');
    }
    if (!res.ok) {
      var t = '';
      try { t = await res.text(); } catch (e) {}
      var msg = t;
      try { var j = JSON.parse(t); msg = (j.error && (j.error.message || j.error)) || j.message || t; } catch (e) {}
      throw new Error('HTTP ' + res.status + ' · ' + String(msg).slice(0, 140));
    }

    var ctype = (res.headers.get('content-type') || '').toLowerCase();
    if (ctype.indexOf('text/event-stream') < 0) {
      var data = await res.json();
      var out = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      paintDirect(aiId, out || '（模型没说话）', true);
      return;
    }

    var reader = res.body.getReader();
    var dec = new TextDecoder();
    var buf = '';
    while (true) {
      var r = await reader.read();
      if (r.done) break;
      buf += dec.decode(r.value, { stream: true });
      var lines = buf.split('\n');
      buf = lines.pop();
      for (var i = 0; i < lines.length; i++) {
        var ln = lines[i].trim();
        if (ln.indexOf('data:') !== 0) continue;
        var payload = ln.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          var obj = JSON.parse(payload);
          var d = (obj.choices && obj.choices[0] && obj.choices[0].delta && obj.choices[0].delta.content) || '';
          if (!d && obj.choices && obj.choices[0] && obj.choices[0].message) d = obj.choices[0].message.content || '';
          if (d) {
            acc += d;
            var now = Date.now();
            if (now - lastPaint > 70) { paintDirect(aiId, acc, false); lastPaint = now; }
          }
        } catch (e) {}
      }
    }
    paintDirect(aiId, acc || '（模型没说话）', true);
  }

  /* —— 设置里的「直连模型」卡片 —— */
  var PRESETS = {
    deepseek: { base: 'https://api.deepseek.com/v1', model: 'deepseek-chat', name: 'DeepSeek' },
    openai: { base: 'https://api.openai.com/v1', model: 'gpt-4o-mini', name: 'OpenAI' },
    moonshot: { base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', name: 'Kimi' }
  };

  function wireDirectCard() {
    var scroll = document.querySelector('.profile-scroll');
    if (!scroll || document.getElementById('directCard')) return;
    var card = document.createElement('section');
    card.className = 'settings-card';
    card.id = 'directCard';
    card.innerHTML =
      '<div class="settings-label">直连模型 <i class="info-i" title="不经过任何服务器：浏览器直接把对话发给你填的 OpenAI-compatible 接口。Key 只存在这台设备。">i</i></div>' +
      '<div class="mrow" style="margin:2px 0 10px">' +
        Object.keys(PRESETS).map(function (k) {
          return '<button type="button" class="mbtn sm" data-preset="' + k + '">' + PRESETS[k].name + '</button>';
        }).join('') +
      '</div>' +
      '<input class="moon-input" id="dBase" placeholder="https://api.deepseek.com/v1" autocomplete="off" spellcheck="false" style="margin-bottom:8px">' +
      '<input class="moon-input" id="dKey" type="password" placeholder="API Key · sk-..." autocomplete="off" spellcheck="false" style="margin-bottom:8px">' +
      '<input class="moon-input" id="dModel" placeholder="模型名 · deepseek-chat" autocomplete="off" spellcheck="false" style="margin-bottom:8px">' +
      '<textarea class="moon-input" id="dSys" rows="3" placeholder="人格 / system prompt（留空用默认）" style="margin-bottom:8px;resize:vertical"></textarea>' +
      '<div class="loop-actions">' +
        '<button type="button" class="loop-btn primary" id="dSave">保存</button>' +
        '<button type="button" class="loop-btn" id="dTest">测一下</button>' +
        '<button type="button" class="loop-btn" id="dLocal">只看本地</button>' +
        '<button type="button" class="loop-btn" id="dRelay">用中继</button>' +
      '</div>' +
      '<div class="push-hint" id="dHint"></div>';
    var serverCard = scroll.querySelector('.settings-card');
    if (serverCard && serverCard.nextSibling) scroll.insertBefore(card, serverCard.nextSibling);
    else scroll.appendChild(card);

    var cfg = directCfg();
    $('#dBase', card).value = cfg.base || '';
    $('#dKey', card).value = cfg.key || '';
    $('#dModel', card).value = cfg.model || '';
    $('#dSys', card).value = cfg.system || '';

    function say(m) { $('#dHint', card).textContent = m || ''; }
    $$('[data-preset]', card).forEach(function (b) {
      b.onclick = function () {
        var p = PRESETS[b.dataset.preset];
        $('#dBase', card).value = p.base;
        $('#dModel', card).value = p.model;
        say('已填好 ' + p.name + '，把 Key 补上再保存');
      };
    });
    $('#dSave', card).onclick = function () {
      var c = {
        base: ($('#dBase', card).value || '').trim().replace(/\/+$/, ''),
        key: ($('#dKey', card).value || '').trim(),
        model: ($('#dModel', card).value || '').trim(),
        system: $('#dSys', card).value || '',
        name: (S.relation.ai || 'Cove')
      };
      if (!c.base || !c.key || !c.model) { say('地址、Key、模型名都要填'); return; }
      saveDirectCfg(c);
      setMode('direct');
      say('存好了 · 现在直连 ' + c.model);
      toast('直连模型已保存');
      if (mode() === 'direct' && document.body.classList.contains('direct-mode')) {
        setPeerAndStatus(c.name, 'DIRECT · ' + c.model);
        emptyHint('直连模式：消息只从这台设备直接发给你填的模型。<br>说点什么吧。');
      } else {
        setTimeout(function () { location.reload(); }, 400);
      }
    };
    $('#dTest', card).onclick = function () {
      var base = ($('#dBase', card).value || '').trim().replace(/\/+$/, '');
      var key = ($('#dKey', card).value || '').trim();
      var model = ($('#dModel', card).value || '').trim();
      if (!base || !key || !model) { say('先把三项填全'); return; }
      say('正在试…');
      fetch(base + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: model, messages: [{ role: 'user', content: '回两个字：在。' }], max_tokens: 16 })
      }).then(function (r) {
        return r.text().then(function (t) {
          if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 100));
          var j = JSON.parse(t);
          var x = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
          say('通了 · ' + (x || '有回应'));
          toast('模型通了');
        });
      }).catch(function (e) { say('没通：' + (e.message || e)); });
    };
    $('#dLocal', card).onclick = function () {
      setMode('local');
      location.reload();
    };
    $('#dRelay', card).onclick = function () {
      try { localStorage.removeItem('companion_mode'); } catch (e) {}
      location.reload();
    };
  }

  function openRelaySheet(open) {
    var sh = document.getElementById('relaySheet');
    if (!sh) return;
    var on = open !== false;
    sh.classList.toggle('on', on);
    sh.setAttribute('aria-hidden', on ? 'false' : 'true');
    var err = document.getElementById('loginErr');
    if (on && err) err.textContent = '';
    if (on) {
      setTimeout(function () {
        var b = document.getElementById('baseInput');
        if (b && !b.value) b.value = savedBase();
        var sec = document.getElementById('secretInput');
        if (sec && window.innerWidth > 520) sec.focus();
      }, 120);
    }
  }
  window.moonOpenRelay = openRelaySheet;

  function quoteOfDay() {
    var d = new Date();
    if (!S.quotes || !S.quotes.length) return '';
    var seed = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
    return S.quotes[seed % S.quotes.length];
  }

  function connState() {
    var m = mode();
    if (m === 'direct') {
      return directReady() ? { on: true, label: directCfg().model } : { on: false, label: '未连接' };
    }
    if (m === 'local') return { on: false, label: '仅本地' };
    var sec = null;
    try { sec = localStorage.getItem('companion_secret'); } catch (e) {}
    return sec ? { on: true, label: '中继' } : { on: false, label: '未连接' };
  }

  function tickLanding() {
    var d = new Date();
    var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
    var clock = document.getElementById('landingClock');
    if (clock) clock.textContent = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    var date = document.getElementById('landingDate');
    if (date) {
      var WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      var MO = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      date.textContent = WD[d.getDay()] + ', ' + MO[d.getMonth()] + ' ' + d.getDate();
    }
    var ai = document.getElementById('landingAi');
    if (ai) ai.textContent = (S.relation && S.relation.ai) || (typeof AI_NAME !== 'undefined' ? AI_NAME : 'Cove');
    var note = document.getElementById('landingNote');
    if (note) {
      var c = connState();
      note.textContent = c.on
        ? ('已连接 · ' + c.label)
        : '还没有连接。可以直接用模型 API，或接入自己的中继。';
    }
  }

  function wireLoginAlt() {
    var start = document.getElementById('lgStart');
    var relay = document.getElementById('lgRelay');
    var local = document.getElementById('lgLocal');
    if (!start) return;

    start.onclick = function () { enterDirect(); };
    relay.onclick = function () { openRelaySheet(true); };
    local.onclick = function () { enterLocal(); };

    var close = document.getElementById('relayClose');
    var mask = document.getElementById('relayMask');
    if (close) close.onclick = function () { openRelaySheet(false); };
    if (mask) mask.onclick = function () { openRelaySheet(false); };

    var form = document.getElementById('loginForm');
    if (form) form.addEventListener('submit', function () { setMode('relay'); });

    tickLanding();
    setInterval(tickLanding, 20000);
  }

  /* ---------------------------- 启动 ---------------------------- */
  function bindMenu() {
    // 捕获阶段先接住：原版对 movie/memory/tides/room 只会弹「即将开放」
    document.addEventListener('click', function (e) {
      var item = e.target.closest && e.target.closest('.menu-item');
      if (!item) return;
      var key = item.dataset.menu;
      if (key === 'chat') return;                 // 交给原版关闭菜单
      if (!TITLES[key]) return;
      e.preventDefault();
      e.stopPropagation();
      openPage(key);
    }, true);
  }

  /* 药丸前缀只给 AI 看；气泡里显示你原本那句话 */
  function hookMessage() {
    if (window.__moonMsgHooked) return;
    if (typeof window.setMessage !== 'function') return;
    window.__moonMsgHooked = true;
    var orig = window.setMessage;
    window.setMessage = function (m, opts) {
      try {
        if (m && m.from === 'human' && typeof m.text === 'string' && m.text.indexOf('[药丸 · ') === 0) {
          var cut = m.text.indexOf('\n\n');
          if (cut > 0) m = Object.assign({}, m, { text: m.text.slice(cut + 2) });
        }
      } catch (e) {}
      return orig.call(this, m, opts);
    };
  }

  function hookSend() {
    if (window.__moonSendHooked) return;
    if (typeof window.apiSend !== 'function') return;
    window.__moonSendHooked = true;
    var orig = window.apiSend;
    window.apiSend = function (text, attachments) {
      if (mode() === 'direct') return directSend(text, attachments);
      var p = S.pills.filter(function (x) { return x.id === S.pendingPill; })[0];
      if (p && text) {
        text = '[药丸 · ' + p.n + ']\n' + p.t + '\n\n' + text;
        S.pendingPill = ''; save(); paintPillChip();
      }
      return orig.call(this, text, attachments);
    };
  }

  function boot() {
    load();
    buildPanel();
    bindMenu();
    wireServer();
    wireDirectCard();
    wireLoginAlt();
    syncModeUI();
    if (mode() === 'direct') enterDirect();
    else if (mode() === 'local') enterLocal();
    paintPillChip();
    refreshHero();
    setInterval(refreshHero, 20000);

    var base = document.getElementById('baseInput');
    if (base && !base.value) base.value = savedBase();

    // 默认头像换成月；用户自己换过的图不动
    try {
      if (!localStorage.getItem('companion_avatar')) {
        document.documentElement.style.setProperty('--avatar-default', 'url("avatar.svg")');
      }
      if (typeof window.applyAvatar === 'function' && !window.__moonAvatarHooked) {
        window.__moonAvatarHooked = true;
        var origAvatar = window.applyAvatar;
        window.applyAvatar = function (url) {
          return origAvatar.call(this, url || 'avatar.svg');
        };
      }
    } catch (e) {}

    // 设置里「联系 Claude」跟着 CONFIG.AI_NAME 走
    try {
      var ai = (typeof AI_NAME !== 'undefined' && AI_NAME) ? AI_NAME : 'Cove';
      $$('.settings-label').forEach(function (el) {
        if (!/联系/.test(el.textContent)) return;
        var info = el.querySelector('.info-i');
        el.textContent = '联系 ' + ai;
        if (info) el.appendChild(info);
      });
      var handle = document.querySelector('.profile-handle');
      if (handle) handle.textContent = '@moonwater';
    } catch (e) {}

    // 主题按钮换成白昼 / 夜色（原版语义不变，只改字）
    var seg = document.getElementById('themeSeg');
    if (seg) {
      var bs = seg.querySelectorAll('button');
      if (bs[0]) bs[0].textContent = '白昼';
      if (bs[1]) bs[1].textContent = '夜色';
    }

    var ms = document.getElementById('menuSettings');
    if (ms) ms.onclick = function () {
      try { if (typeof closeMenu === 'function') closeMenu(); } catch (e) {}
      setTimeout(function () { try { if (typeof openProfile === 'function') openProfile(); } catch (e) {} }, 120);
    };
    var bb = document.getElementById('backBtn');
    if (bb) bb.addEventListener('click', function () { setTimeout(refreshHero, 60); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && current) { e.stopPropagation(); closePage(); }
    }, true);

    // 原版发送入口是全局函数；等它挂好再包一层
    hookSend();
    hookMessage();
    setTimeout(function () { hookSend(); hookMessage(); }, 800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
