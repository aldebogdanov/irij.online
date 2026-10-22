// Renders a seed's README on its /seeds/:name page.
//
// The server puts the README's Markdown in <pre id="seed-readme-src">
// as escaped text, so the page reads fine without JavaScript. Here it
// becomes HTML through marked, then DOMPurify: a README is written by
// whoever published the seed, so nothing in it may run script, style
// the page or post a form.
(function () {
  var src = document.getElementById('seed-readme-src');
  var out = document.getElementById('seed-readme');
  if (!src || !out || !window.marked || !window.DOMPurify) return;
  var html = window.marked.parse(src.textContent);
  out.innerHTML = window.DOMPurify.sanitize(html, {
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
    FORBID_ATTR: ['style']
  });
  out.querySelectorAll('a[href]').forEach(function (a) {
    if (/^https?:/i.test(a.getAttribute('href'))) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener nofollow ugc');
    }
  });
  out.hidden = false;
  src.hidden = true;
})();
