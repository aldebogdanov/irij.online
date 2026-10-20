// learn.js — the /learn course.
//
// On a lesson page (#lesson-body) it fetches /learn/<slug>.md and renders
// it: prose through marked, every ```irij block as a live editor, and each
// :::exercise container as an editor whose code is checked. On the index
// and in the lesson list it marks the lessons this browser has finished.
//
// Code runs through POST /eval (the playground's stateless sandbox). An
// exercise sends learner code + /learn/harness.irj + its hidden checks;
// the harness prints "@@pass label" / "@@fail label@@want@@got" lines.
// scripts/check-course.irj parses lessons the same way — keep the
// fence vocabulary of the two in step.

(function () {
  'use strict';

  var STORE_KEY = 'irij-learn-v1';
  var DRAFT_PREFIX = 'irij-learn-draft:';
  var harnessSrc = null;

  // ── Progress (this browser only) ────────────────────────────────────

  function loadProgress() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      var data = raw ? JSON.parse(raw) : null;
      if (data && typeof data === 'object' && data.lessons) return data;
    } catch (e) { /* storage blocked or corrupt: start empty */ }
    return { lessons: {} };
  }

  function saveProgress(p) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ }
  }

  function lessonState(p, slug) {
    var l = p.lessons[slug];
    if (!l) return null;
    var solved = Object.keys(l.solved || {}).length;
    return { total: l.total || 0, solved: solved, done: l.total > 0 && solved >= l.total };
  }

  function recordTotal(slug, total) {
    var p = loadProgress();
    var l = p.lessons[slug] || { total: 0, solved: {} };
    l.total = total;
    p.lessons[slug] = l;
    p.last = slug;
    saveProgress(p);
  }

  function recordSolved(slug, id) {
    var p = loadProgress();
    var l = p.lessons[slug] || { total: 0, solved: {} };
    l.solved = l.solved || {};
    l.solved[id] = true;
    p.lessons[slug] = l;
    saveProgress(p);
    paintStatuses();
  }

  function isSolved(slug, id) {
    var l = loadProgress().lessons[slug];
    return !!(l && l.solved && l.solved[id]);
  }

  function loadDraft(slug, id) {
    try { return window.localStorage.getItem(DRAFT_PREFIX + slug + ':' + id); } catch (e) { return null; }
  }

  function saveDraft(slug, id, code) {
    try { window.localStorage.setItem(DRAFT_PREFIX + slug + ':' + id, code); } catch (e) { /* ignore */ }
  }

  function clearDraft(slug, id) {
    try { window.localStorage.removeItem(DRAFT_PREFIX + slug + ':' + id); } catch (e) { /* ignore */ }
  }

  // Marks every [data-slug] .learn-status (index cards, lesson list).
  function paintStatuses() {
    var p = loadProgress();
    var items = document.querySelectorAll('[data-slug]');
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var mark = item.querySelector('.learn-status');
      if (!mark) continue;
      var st = lessonState(p, item.getAttribute('data-slug'));
      item.classList.toggle('is-done', !!(st && st.done));
      mark.textContent = !st || st.total === 0 ? '' : st.done ? '✓' : st.solved + '/' + st.total;
      mark.title = !st || st.total === 0 ? '' : st.done ? 'Finished' : st.solved + ' of ' + st.total + ' exercises solved';
    }
    paintIndexSummary(p);
  }

  function paintIndexSummary(p) {
    var cards = document.querySelectorAll('.learn-card[data-slug]');
    var cont = document.getElementById('learn-continue');
    var summary = document.getElementById('learn-progress');
    if (!cards.length || !cont || !summary) return;
    var done = 0, next = null, started = false;
    for (var i = 0; i < cards.length; i++) {
      var slug = cards[i].getAttribute('data-slug');
      var st = lessonState(p, slug);
      if (st) started = true;
      if (st && st.done) done++;
      else if (!next) next = { slug: slug, n: i + 1 };
    }
    if (!started) return;
    summary.textContent = done + ' of ' + cards.length + ' lessons finished';
    if (next) {
      cont.href = '/learn/' + next.slug;
      cont.textContent = 'Continue with lesson ' + next.n;
    } else {
      cont.href = '/learn/next-steps';
      cont.textContent = 'All done — review the capstone';
    }
  }

  // ── Running code ────────────────────────────────────────────────────

  function evalCode(code) {
    return fetch('/eval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code })
    }).then(function (r) {
      if (!r.ok) throw new Error('the sandbox answered HTTP ' + r.status);
      return r.json();
    });
  }

  function getHarness() {
    if (harnessSrc !== null) return Promise.resolve(harnessSrc);
    return fetch('/learn/harness.irj').then(function (r) {
      if (!r.ok) throw new Error('could not load the exercise harness');
      return r.text();
    }).then(function (t) { harnessSrc = t; return t; });
  }

  function playgroundUrl(code) {
    return '/playground#' + btoa(encodeURIComponent(code));
  }

  // ── Small DOM helpers ───────────────────────────────────────────────

  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  // Each line is its own block span, so a trailing newline would add a gap.
  function line(cls, text) {
    return h('span', { 'class': cls, text: text.replace(/\n$/, '') });
  }

  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
  var runKeyLabel = isMac ? '⌘↵' : 'Ctrl+↵';

  function makeEditor(host, code, opts) {
    var cm = CodeMirror(host, {
      value: code,
      mode: 'irij',
      lineNumbers: false,
      indentUnit: 2,
      tabSize: 2,
      indentWithTabs: false,
      viewportMargin: Infinity,
      readOnly: opts.readOnly ? 'nocursor' : false,
      extraKeys: opts.onRun ? {
        'Ctrl-Enter': opts.onRun,
        'Cmd-Enter': opts.onRun,
        'Shift-Enter': opts.onRun,
        // Irij indents with exactly two spaces; never insert a tab.
        Tab: function (ed) { ed.replaceSelection('  '); }
      } : {}
    });
    return cm;
  }

  // ── Example cell: editor + Run ──────────────────────────────────────

  function exampleCell(code, kind) {
    var out = h('div', { 'class': 'cell-out', hidden: 'hidden' });
    var host = h('div', { 'class': 'cell-editor' });
    var runBtn, cm;

    function run() {
      if (runBtn.disabled) return;
      runBtn.disabled = true;
      out.hidden = false;
      out.innerHTML = '';
      out.appendChild(line('info', 'Running…'));
      evalCode(cm.getValue()).then(function (r) {
        out.innerHTML = '';
        if (r.stdout) out.appendChild(line('out', r.stdout));
        if (r.ok) {
          if (r.value !== null && r.value !== undefined && r.value !== '()') {
            out.appendChild(line('val', '=> ' + r.value));
          }
          if (!r.stdout && (r.value === null || r.value === undefined || r.value === '()')) {
            out.appendChild(line('info', '(no output)'));
          }
        } else {
          out.appendChild(line('err', r.error || 'error'));
        }
      }).catch(function (e) {
        out.innerHTML = '';
        out.appendChild(line('err', 'Could not run: ' + e.message));
      }).then(function () { runBtn.disabled = false; });
    }

    runBtn = h('button', { 'class': 'cell-btn run', type: 'button', onclick: run, title: 'Run (' + runKeyLabel + ')' }, [document.createTextNode('Run')]);
    var resetBtn = h('button', { 'class': 'cell-btn', type: 'button', title: 'Restore the original code', onclick: function () {
      cm.setValue(code);
      out.hidden = true;
    } }, [document.createTextNode('Reset')]);
    var pg = h('a', { 'class': 'cell-link', href: playgroundUrl(code), target: '_blank', rel: 'noopener', title: 'Open this code in the Playground', onclick: function (ev) {
      ev.currentTarget.href = playgroundUrl(cm.getValue());
    } }, [document.createTextNode('Playground ↗')]);

    var tags = [];
    if (kind === 'fails') tags.push(h('span', { 'class': 'cell-tag', text: 'fails on purpose' }));

    var cell = h('div', { 'class': 'cell' + (kind === 'fails' ? ' cell-fails' : '') }, [
      host,
      h('div', { 'class': 'cell-bar' }, [runBtn, resetBtn].concat(tags).concat([h('span', { 'class': 'cell-spacer' }), pg])),
      out
    ]);
    cm = makeEditor(host, code, { onRun: run });
    return { el: cell, cm: cm };
  }

  function staticCell(code) {
    var host = h('div', { 'class': 'cell-editor' });
    var cell = h('div', { 'class': 'cell cell-static' }, [host]);
    var cm = makeEditor(host, code, { readOnly: true });
    return { el: cell, cm: cm };
  }

  // ── Exercise ────────────────────────────────────────────────────────

  function parseChecks(stdout) {
    var results = [], rest = [];
    (stdout || '').split('\n').forEach(function (l) {
      if (l.indexOf('@@pass ') === 0) {
        results.push({ ok: true, label: l.slice(7) });
      } else if (l.indexOf('@@fail ') === 0) {
        var parts = l.slice(7).split('@@');
        results.push({ ok: false, label: parts[0], want: parts[1], got: parts.slice(2).join('@@') });
      } else {
        rest.push(l);
      }
    });
    while (rest.length && rest[rest.length - 1] === '') rest.pop();
    return { results: results, output: rest.join('\n') };
  }

  function exerciseCell(slug, ex) {
    var draft = loadDraft(slug, ex.id);
    var host = h('div', { 'class': 'cell-editor' });
    var out = h('div', { 'class': 'cell-out', hidden: 'hidden' });
    var hintBox = h('div', { 'class': 'ex-hint', hidden: 'hidden' });
    var state = h('span', { 'class': 'ex-state' });
    var section, cm, checkBtn, runBtn;

    function markSolved() {
      section.classList.add('solved');
      state.textContent = '✓ Solved';
    }

    function busy(on) {
      checkBtn.disabled = on;
      runBtn.disabled = on;
    }

    function showOutput(text) {
      if (text) out.appendChild(line('out', text));
    }

    function runOnly() {
      if (runBtn.disabled) return;
      busy(true);
      out.hidden = false;
      out.innerHTML = '';
      out.appendChild(line('info', 'Running…'));
      evalCode(cm.getValue()).then(function (r) {
        out.innerHTML = '';
        showOutput(r.stdout);
        if (!r.ok) out.appendChild(line('err', r.error || 'error'));
        else if (r.value !== null && r.value !== undefined && r.value !== '()') out.appendChild(line('val', '=> ' + r.value));
        else if (!r.stdout) out.appendChild(line('info', '(no output)'));
      }).catch(function (e) {
        out.innerHTML = '';
        out.appendChild(line('err', 'Could not run: ' + e.message));
      }).then(function () { busy(false); });
    }

    function check() {
      if (checkBtn.disabled) return;
      busy(true);
      out.hidden = false;
      out.innerHTML = '';
      out.appendChild(line('info', 'Checking…'));
      var code = cm.getValue();
      var job = ex.check
        ? getHarness().then(function (harness) {
            return evalCode(code + '\n\n' + harness + '\n\n' + ex.check).then(function (r) { return { r: r, mode: 'check' }; });
          })
        : evalCode(code).then(function (r) { return { r: r, mode: 'expect' }; });
      job.then(function (res) {
        out.innerHTML = '';
        var r = res.r, passed = false;
        if (res.mode === 'check') {
          var parsed = parseChecks(r.stdout);
          showOutput(parsed.output);
          if (!r.ok) out.appendChild(line('err', r.error || 'error'));
          parsed.results.forEach(function (c) {
            if (c.ok) out.appendChild(line('pass', '✓ ' + c.label));
            else if (c.got && c.got.indexOf('error: ') === 0) out.appendChild(line('fail', '✗ ' + c.label + ' — ' + c.got));
            else out.appendChild(line('fail', '✗ ' + c.label + ' — expected ' + c.want + ', got ' + c.got));
          });
          passed = r.ok && parsed.results.length > 0 && parsed.results.every(function (c) { return c.ok; });
        } else {
          var got = (r.stdout || '').trim();
          showOutput(r.stdout);
          if (!r.ok) {
            out.appendChild(line('err', r.error || 'error'));
          } else if (got === ex.expect.trim()) {
            passed = true;
          } else {
            if (!got) out.appendChild(line('info', '(your program printed nothing)'));
            out.appendChild(line('fail', '✗ The output should be exactly:'));
            out.appendChild(line('want', ex.expect.trim()));
          }
        }
        if (passed) {
          out.appendChild(line('pass', '✓ All checks pass — well done!'));
          markSolved();
          recordSolved(slug, ex.id);
        }
      }).catch(function (e) {
        out.innerHTML = '';
        out.appendChild(line('err', 'Could not run: ' + e.message));
      }).then(function () { busy(false); });
    }

    checkBtn = h('button', { 'class': 'cell-btn run', type: 'button', onclick: check, title: 'Check your answer (' + runKeyLabel + ')' }, [document.createTextNode('Check')]);
    runBtn = h('button', { 'class': 'cell-btn', type: 'button', onclick: runOnly, title: 'Run without checking' }, [document.createTextNode('Run')]);
    var buttons = [checkBtn, runBtn];
    if (ex.hint) {
      hintBox.innerHTML = marked.parse(ex.hint);
      buttons.push(h('button', { 'class': 'cell-btn', type: 'button', onclick: function () { hintBox.hidden = !hintBox.hidden; } }, [document.createTextNode('Hint')]));
    }
    buttons.push(h('button', { 'class': 'cell-btn', type: 'button', title: 'Replace your code with a worked solution', onclick: function () {
      if (cm.getValue() !== ex.starter && cm.getValue() !== ex.solution &&
          !window.confirm('Replace your code with the solution?')) return;
      cm.setValue(ex.solution);
    } }, [document.createTextNode('Solution')]));
    buttons.push(h('button', { 'class': 'cell-btn', type: 'button', title: 'Start over from the starter code', onclick: function () {
      cm.setValue(ex.starter);
      clearDraft(slug, ex.id);
      out.hidden = true;
    } }, [document.createTextNode('Reset')]));

    var prompt = h('div', { 'class': 'ex-prompt', html: marked.parse(ex.prompt) });
    section = h('section', { 'class': 'exercise', id: 'ex-' + ex.id }, [
      h('div', { 'class': 'ex-head' }, [
        h('span', { 'class': 'ex-tag', text: 'Exercise' }),
        h('h3', { text: ex.title }),
        state
      ]),
      prompt,
      h('div', { 'class': 'cell' }, [host, h('div', { 'class': 'cell-bar' }, buttons), out]),
      hintBox
    ]);
    cm = makeEditor(host, draft !== null ? draft : ex.starter, { onRun: check });
    cm.on('change', function () { saveDraft(slug, ex.id, cm.getValue()); });
    if (isSolved(slug, ex.id)) markSolved();
    return { el: section, cm: cm };
  }

  // ── Lesson Markdown → blocks ────────────────────────────────────────
  //
  // Same grammar as scripts/check-course.irj: ``` fences (an info string
  // after the backticks) and :::exercise <id> <title> … ::: containers
  // whose fences are `irij starter|solution|check`, `text expect`, `hint`.

  function parseLesson(md) {
    var lines = md.split('\n');
    var blocks = [], prose = [], fence = null, buf = [], ex = null;

    function flushProse() {
      if (prose.length) blocks.push({ type: 'md', text: prose.join('\n') });
      prose = [];
    }

    lines.forEach(function (l) {
      if (fence !== null) {
        if (l.trim() === '```') {
          var code = buf.join('\n');
          if (ex) {
            var role = { 'irij starter': 'starter', 'irij solution': 'solution', 'irij check': 'check', 'text expect': 'expect', 'hint': 'hint' }[fence];
            if (role) ex[role] = code;
            else ex.prompt.push('```' + fence + '\n' + code + '\n```');
          } else {
            blocks.push({ type: 'code', info: fence, code: code });
          }
          fence = null;
        } else {
          buf.push(l);
        }
        return;
      }
      if (l.indexOf('```') === 0) {
        if (!ex) flushProse();
        fence = l.slice(3).trim();
        buf = [];
      } else if (l.indexOf(':::exercise') === 0) {
        flushProse();
        var words = l.slice(11).trim().split(/\s+/);
        ex = { type: 'exercise', id: words[0], title: words.slice(1).join(' '), prompt: [], starter: '', solution: '', check: '', expect: '', hint: '' };
      } else if (ex && l.trim() === ':::') {
        ex.prompt = ex.prompt.join('\n');
        blocks.push(ex);
        ex = null;
      } else if (ex) {
        ex.prompt.push(l);
      } else {
        prose.push(l);
      }
    });
    flushProse();
    return blocks;
  }

  function renderLesson(body, slug, md) {
    var blocks = parseLesson(md);
    var editors = [];
    var exercises = 0;
    body.innerHTML = '';
    blocks.forEach(function (b) {
      if (b.type === 'md') {
        body.appendChild(h('div', { 'class': 'prose', html: marked.parse(b.text) }));
      } else if (b.type === 'exercise') {
        exercises++;
        var e = exerciseCell(slug, b);
        body.appendChild(e.el);
        editors.push(e.cm);
      } else if (b.info === 'irij' || b.info === 'irij fails') {
        var c = exampleCell(b.code, b.info === 'irij fails' ? 'fails' : 'ok');
        body.appendChild(c.el);
        editors.push(c.cm);
      } else if (b.info === 'irij static') {
        var s = staticCell(b.code);
        body.appendChild(s.el);
        editors.push(s.cm);
      } else {
        body.appendChild(h('pre', {}, [h('code', { text: b.code })]));
      }
    });
    // CodeMirror measures on attach; refresh once the page has laid out.
    editors.forEach(function (cm) { cm.refresh(); });
    recordTotal(slug, exercises);
    paintStatuses();
  }

  // ── Page wiring ─────────────────────────────────────────────────────

  function initSidebar() {
    var wrap = document.querySelector('.learn-side-wrap');
    if (!wrap) return;
    var wide = window.matchMedia('(min-width: 901px)');
    function sync() { if (wide.matches) wrap.open = true; }
    sync();
    if (wide.addEventListener) wide.addEventListener('change', sync);
  }

  function initLesson() {
    var body = document.getElementById('lesson-body');
    if (!body) return;
    var slug = body.getAttribute('data-slug');
    if (typeof CodeMirror === 'undefined' || typeof marked === 'undefined') {
      body.innerHTML = '<p class="learn-error">The lesson needs CodeMirror and marked from a CDN, and one of them did not load. Check your connection or content blocker, then reload.</p>';
      return;
    }
    fetch('/learn/' + slug + '.md')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (md) { renderLesson(body, slug, md); })
      .catch(function (e) {
        body.innerHTML = '';
        body.appendChild(h('p', { 'class': 'learn-error', text: 'Could not load this lesson (' + e.message + '). Reload to try again.' }));
      });
  }

  function init() {
    initSidebar();
    paintStatuses();
    initLesson();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
