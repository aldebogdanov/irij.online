// Inline-render internals docs at /docs/:slug.
//
// Fetches the raw Markdown from GitHub Raw (CORS-friendly) and
// converts it to HTML via marked.js loaded from CDN. No server-side
// Markdown parser — keeps the irij.online build simple.
(function () {
  const parts = location.pathname.split('/').filter(Boolean);
  const slug = parts[parts.length - 1];
  const url = 'https://raw.githubusercontent.com/aldebogdanov/irij/main/docs/internals/' + slug + '.md';

  fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error('Not found: ' + slug + '.md (HTTP ' + r.status + ')');
      return r.text();
    })
    .then(function (md) {
      const html = window.marked ? window.marked.parse(md) : md;
      document.getElementById('doc-content').innerHTML = html;
      document.getElementById('doc-title').textContent = slug;
      document.title = slug + ' — Irij Docs';
    })
    .catch(function (err) {
      document.getElementById('doc-content').innerHTML =
        '<p style="color:#dc2626">Failed to load doc: ' + err.message + '</p>' +
        '<p>Try <a href="https://github.com/aldebogdanov/irij/tree/main/docs/internals">GitHub</a>.</p>';
    });
})();
