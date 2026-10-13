// irij-mode.js — CodeMirror 5 syntax highlighting for Irij
// Ported from editors/emacs/irij-mode.el in the Irij repo

(function(mod) {
  if (typeof exports === 'object' && typeof module === 'object')
    mod(require('codemirror'));
  else if (typeof define === 'function' && define.amd)
    define(['codemirror'], mod);
  else
    mod(CodeMirror);
})(function(CodeMirror) {
  'use strict';

  CodeMirror.defineMode('irij', function() {
    // Keep in sync with the Irij repo: keywords = the lowercase literal
    // tokens of src/main/antlr/IrijLexer.g4 (`model` is soft, see below);
    // builtins = what a file reaches without an import
    // (IntrinsicsEmitter.NAMES + pi, e, resume). The repo's
    // EditorGrammarSyncTest pins the same lists for Emacs and TextMate.
    var keywords = new Set([
      'fn', 'do', 'if', 'else', 'match', 'spec', 'newtype',
      'mod', 'use', 'pub', 'with', 'scope', 'effect', 'party',
      'cap', 'handler', 'impl', 'proto', 'pre', 'post',
      'contract', 'select', 'enclave', 'par-each',
      'on-failure', 'in', 'out', 'for', 'proof'
    ]);

    var builtins = new Set([
      'pi', 'e',
      'print', 'println', 'to-str', 'dbg', 'type-of', 'error', 'read-line',
      'abs', 'min', 'max', 'quo', 'rem', 'sqrt', 'floor', 'ceil', 'round',
      'sin', 'cos', 'tan', 'log', 'exp', 'pow',
      'parse-int', 'parse-float', 'random-int', 'random-float',
      'head', 'tail', 'length', 'reverse', 'sort', 'concat', 'conj',
      'take', 'drop', 'to-vec', 'to-set', 'to-tuple', 'nth', 'last', 'fold',
      'contains?', 'empty?', 'keys', 'vals', 'get', 'assoc', 'dissoc', 'merge',
      'identity', 'const', 'flip', 'not',
      'split', 'join', 'trim', 'upper-case', 'lower-case',
      'starts-with?', 'ends-with?', 'replace', 'substring', 'char-at', 'index-of',
      'char-code', 'from-char-code',
      'json-parse', 'json-encode', 'json-encode-pretty',
      'url-encode', 'url-decode', 'toml-parse',
      'sha256-hex', 'hmac-sha256-hex', 'pbkdf2-sha256-hex',
      'random-token', 'constant-time-eq?',
      'spawn', 'sleep', 'await', 'timeout', 'par', 'race', 'try',
      'env', 'get-env', 'now-ms', 'program-args',
      'validate', 'validate!',
      'resume'
    ]);

    var constants = new Set(['true', 'false']);

    function tokenBase(stream, state) {
      // Whitespace
      if (stream.eatSpace()) return null;

      // Comments
      if (stream.match(';;')) {
        stream.skipToEnd();
        return 'comment';
      }

      var ch = stream.peek();

      // Strings
      if (ch === '"') {
        stream.next();
        state.inString = true;
        return tokenString(stream, state);
      }

      // Keywords (atoms like :foo)
      if (ch === ':' && !stream.match('::', false) && !stream.match(':=', false) && !stream.match(':!', false)) {
        stream.next();
        if (stream.match(/^[a-z][a-z0-9_-]*/)) {
          return 'atom';
        }
        // :: or ::: operator
        if (stream.match(/^:{1,2}/)) return 'operator';
        return null;
      }

      // Numbers
      if (ch >= '0' && ch <= '9') {
        // Hex
        if (stream.match(/^0[xX][0-9a-fA-F][0-9a-fA-F_]*/)) return 'number';
        // Rational
        if (stream.match(/^[0-9]+\/[0-9]+/)) return 'number';
        // Float or int
        stream.match(/^[0-9][0-9_]*(?:\.[0-9][0-9_]*)?(?:[eE][+-]?[0-9]+)?/);
        return 'number';
      }

      // Negative numbers
      if (ch === '-' && stream.match(/^-[0-9]/, false)) {
        stream.next();
        stream.match(/^[0-9][0-9_]*(?:\.[0-9][0-9_]*)?(?:[eE][+-]?[0-9]+)?/);
        return 'number';
      }

      // Java interop: Class/member, java.pkg.Class/member
      if (stream.match(/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*\/[A-Za-z_][A-Za-z0-9_]*/)) {
        return 'builtin';
      }

      // Uppercase identifiers (types, constructors)
      if (ch >= 'A' && ch <= 'Z') {
        stream.match(/^[A-Za-z0-9_]+/);
        return 'type';
      }

      // Role names $ADMIN
      if (ch === '$') {
        stream.next();
        stream.match(/^[A-Z][A-Z0-9_]*/);
        return 'type';
      }

      // Identifiers (lowercase)
      if ((ch >= 'a' && ch <= 'z') || ch === '_') {
        stream.match(/^[a-z_][a-z0-9_?!-]*/);
        var word = stream.current();
        if (keywords.has(word)) return 'keyword';
        // `model` is a keyword only where a declaration starts
        if (word === 'model' &&
            /^\s*(?:pub\s+)?model$/.test(stream.string.slice(0, stream.pos)) &&
            /^\s+[a-z]/.test(stream.string.slice(stream.pos))) return 'keyword';
        if (constants.has(word)) return 'atom';
        if (builtins.has(word)) return 'builtin';
        return 'variable';
      }

      // Operators
      if (stream.match(':::') || stream.match('::')) return 'operator';
      if (stream.match(':=') || stream.match(':!')) return 'def';
      if (stream.match('<-')) return 'def';
      if (stream.match('->') || stream.match('=>')) return 'operator';
      if (stream.match('|>') || stream.match('<|')) return 'operator';
      if (stream.match('>>') || stream.match('<<')) return 'operator';
      if (stream.match('~*>') || stream.match('~>') || stream.match('<~') || stream.match('~/')) return 'operator';
      if (stream.match('==') || stream.match('/=')) return 'operator';
      if (stream.match('<=') || stream.match('>=')) return 'operator';
      if (stream.match('&&') || stream.match('||')) return 'operator';
      if (stream.match('**') || stream.match('++')) return 'operator';
      if (stream.match('...') || stream.match('..<') || stream.match('..')) return 'operator';

      // Seq operators: /+ /? /! etc
      if (ch === '/') {
        stream.next();
        if (stream.match(/^[+*#&|?!^$]/)) return 'operator';
        return 'operator';
      }

      // @ and @i
      if (ch === '@') {
        stream.next();
        stream.match('i');
        return 'operator';
      }

      // Collection literals
      if (stream.match('#[') || stream.match('#{') || stream.match('#(')) {
        return 'bracket';
      }

      // Single-char operators and punctuation
      if ('~+-*%<>=|.'.indexOf(ch) > -1) {
        stream.next();
        return 'operator';
      }

      // Brackets
      if ('(){}[]'.indexOf(ch) > -1) {
        stream.next();
        return 'bracket';
      }

      // Skip unknown
      stream.next();
      return null;
    }

    function tokenString(stream, state) {
      var escaped = false;
      while (!stream.eol()) {
        var ch = stream.next();
        if (ch === '"' && !escaped) {
          state.inString = false;
          return 'string';
        }
        if (ch === '$' && stream.peek() === '{' && !escaped) {
          // String interpolation — just highlight the whole string as string
        }
        escaped = !escaped && ch === '\\';
      }
      // String continues on next line (shouldn't happen in Irij, but handle it)
      return 'string';
    }

    return {
      startState: function() {
        return { inString: false };
      },
      token: function(stream, state) {
        if (state.inString) return tokenString(stream, state);
        return tokenBase(stream, state);
      },
      lineComment: ';;'
    };
  });

  CodeMirror.defineMIME('text/x-irij', 'irij');
});
