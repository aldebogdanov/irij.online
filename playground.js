// playground.js — Irij Playground (nREPL-style persistent sessions)
// Alt+Enter: eval top-level form at cursor (like irij-nrepl-eval-defun)
// Ctrl+Enter: eval entire buffer (like irij-nrepl-eval-buffer)
// Inline ghost results: ;; => 42 (disappears on next edit)

(function() {
  'use strict';

  var editor = null;
  var sessionId = null;
  var ghostWidget = null;
  var ghostEl = null;

  // ── Session lifecycle ─────────────────────────────────────────────

  function createSession() {
    fetch('/api/session', { method: 'POST' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        sessionId = data.id;
        setStatus('ready', 'Session ' + sessionId.substring(0, 8) + '…');
      })
      .catch(function() {
        setStatus('error', 'Failed to connect');
      });
  }

  function destroySession() {
    if (sessionId) {
      navigator.sendBeacon('/api/session/destroy',
        JSON.stringify({ id: sessionId }));
    }
  }

  // ── Eval ──────────────────────────────────────────────────────────

  function evalCode(code, ghostLine) {
    if (!sessionId) {
      appendOutput('err', ';; error: no session — reload the page');
      return;
    }
    if (!code.trim()) return;

    setStatus('running', 'Evaluating…');
    var t0 = performance.now();

    fetch('/api/session/eval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sessionId, code: code })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var ms = Math.round(performance.now() - t0);

      // Show stdout in output panel
      if (data.stdout && data.stdout.trim()) {
        appendOutput('out', data.stdout);
      }

      if (data.ok) {
        if (data.value !== undefined && data.value !== null) {
          appendOutput('val', ';; => ' + data.value);
          if (ghostLine !== undefined) showGhost(ghostLine, data.value, false);
        }
        setStatus('ready', 'Done in ' + ms + 'ms');
      } else {
        appendOutput('err', ';; error: ' + data.error);
        if (ghostLine !== undefined) showGhost(ghostLine, data.error, true);
        setStatus('error', 'Error (' + ms + 'ms)');
      }
    })
    .catch(function(e) {
      appendOutput('err', ';; network: ' + e.message);
      setStatus('error', 'Connection failed');
    });
  }

  // ── Find top-level form at cursor ─────────────────────────────────
  // Port of irij-nrepl--defun-at-point from irij-nrepl.el

  function isCol0Substantive(line) {
    if (!line || line.trim() === '') return false;
    if (line.indexOf(';;') === 0) return false;
    if (line[0] === ' ' || line[0] === '\t') return false;
    return true;
  }

  function getDefunAtCursor() {
    if (!editor) return null;
    var cur = editor.getCursor().line;
    var start = cur;

    // Walk backward to find col-0 substantive line
    while (start > 0 && !isCol0Substantive(editor.getLine(start))) {
      start--;
    }
    if (!isCol0Substantive(editor.getLine(start))) return null;

    // Walk forward: absorb indented + blank lines
    var end = start + 1;
    var total = editor.lineCount();
    while (end < total && !isCol0Substantive(editor.getLine(end))) {
      end++;
    }

    // Collect lines, trim trailing blanks
    var lines = [];
    for (var i = start; i < end; i++) {
      lines.push(editor.getLine(i));
    }
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop();
      end--;
    }

    return { code: lines.join('\n'), endLine: end - 1 };
  }

  // ── Inline ghost result ───────────────────────────────────────────
  // Like Emacs overlays: ";; => 42" in teal, disappears on next edit

  function clearGhost() {
    if (ghostWidget) {
      ghostWidget.clear();
      ghostWidget = null;
    }
    if (ghostEl && ghostEl.parentNode) {
      ghostEl.parentNode.removeChild(ghostEl);
      ghostEl = null;
    }
  }

  function showGhost(line, text, isError) {
    clearGhost();
    if (!editor) return;

    var lineContent = editor.getLine(line);
    var ch = lineContent.length;

    var el = document.createElement('span');
    el.className = isError ? 'ghost-error' : 'ghost-result';
    var display = text.length > 80 ? text.substring(0, 79) + '…' : text;
    el.textContent = '  ;; => ' + display;
    el.style.pointerEvents = 'none';
    el.style.whiteSpace = 'nowrap';
    ghostEl = el;

    // Use bookmark at end of line to anchor the ghost inline
    ghostWidget = editor.setBookmark({line: line, ch: ch}, {
      widget: el, insertLeft: true
    });

    // Dismiss on next edit (like irij-nrepl pre-command-hook)
    function dismiss() {
      clearGhost();
      editor.off('change', dismiss);
    }
    editor.on('change', dismiss);
  }

  // ── Output panel (acts like *irij-nrepl* buffer) ──────────────────

  function appendOutput(cls, text) {
    var out = document.getElementById('pg-out');
    if (!out) return;

    // Remove initial placeholder
    var info = out.querySelector('.info');
    if (info) info.remove();

    var span = document.createElement('span');
    span.className = cls;
    span.textContent = text.endsWith('\n') ? text : text + '\n';
    out.appendChild(span);
    out.scrollTop = out.scrollHeight;
  }

  function clearOutput() {
    var out = document.getElementById('pg-out');
    if (out) out.innerHTML = '';
    setStatus('ready', 'Output cleared');
  }

  // ── Status indicator ──────────────────────────────────────────────

  function setStatus(state, text) {
    var dot = document.getElementById('pg-dot');
    var label = document.getElementById('pg-status-text');
    if (dot) dot.className = 'pg-dot' +
      (state === 'running' ? ' running' : state === 'error' ? ' error' : '');
    if (label) label.textContent = text || '';
  }

  // ── Share ─────────────────────────────────────────────────────────

  function shareCode() {
    if (!editor) return;
    var code = editor.getValue();
    var enc = btoa(encodeURIComponent(code));
    var url = window.location.origin + '/playground#' + enc;
    window.history.replaceState(null, '', '/playground#' + enc);
    prompt('Copy this URL to share:', url);
  }

  // ── Init ──────────────────────────────────────────────────────────

  function init() {
    var textarea = document.getElementById('pg-code');
    if (!textarea || typeof CodeMirror === 'undefined') return;

    editor = CodeMirror.fromTextArea(textarea, {
      lineNumbers: true,
      indentUnit: 2,
      tabSize: 2,
      indentWithTabs: false,
      mode: 'irij',
      theme: 'default',
      viewportMargin: Infinity,
      extraKeys: {
        'Alt-Enter': function() {
          var defun = getDefunAtCursor();
          if (defun) evalCode(defun.code, defun.endLine);
        },
        'Ctrl-Enter': function() {
          var last = editor.lineCount() - 1;
          evalCode(editor.getValue(), last);
        },
        'Shift-Enter': function() {
          var last = editor.lineCount() - 1;
          evalCode(editor.getValue(), last);
        },
        'Cmd-Enter': function() {
          var last = editor.lineCount() - 1;
          evalCode(editor.getValue(), last);
        }
      }
    });

    // Load from URL hash
    var hash = window.location.hash.slice(1);
    if (hash) {
      try { editor.setValue(decodeURIComponent(atob(hash))); } catch(e) {}
    }

    // Examples dropdown
    fetch('/api/examples')
      .then(function(r) { return r.json(); })
      .then(function(exs) {
        var sel = document.getElementById('pg-examples');
        if (!sel) return;
        exs.forEach(function(ex) {
          var o = document.createElement('option');
          o.value = ex.code;
          o.textContent = ex.title;
          sel.appendChild(o);
        });
        sel.addEventListener('change', function() {
          if (this.value) {
            editor.setValue(this.value);
            this.selectedIndex = 0;
            clearGhost();
          }
        });
      })
      .catch(function() {});

    // Create session
    createSession();

    // Cleanup
    window.addEventListener('beforeunload', destroySession);
  }

  // Expose for onclick handlers
  window.runCode = function() {
    if (editor) {
      var last = editor.lineCount() - 1;
      evalCode(editor.getValue(), last);
    }
  };
  window.clearOutput = clearOutput;
  window.shareCode = shareCode;
  window.resetSession = function() {
    destroySession();
    clearOutput();
    createSession();
    appendOutput('info', ';; session reset');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
