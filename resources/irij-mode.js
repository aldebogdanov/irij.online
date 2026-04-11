// irij-mode.js — CodeMirror 5 syntax highlighting for Irij
// Ported from editors/emacs/irij-mode.el

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
    var keywords = new Set([
      'fn', 'do', 'if', 'else', 'match', 'spec', 'newtype',
      'mod', 'use', 'pub', 'with', 'scope', 'effect', 'role',
      'cap', 'handler', 'impl', 'proto', 'pre', 'post', 'law',
      'contract', 'select', 'enclave', 'forall', 'par-each',
      'on-failure', 'in', 'out'
    ]);

    var builtins = new Set([
      'print', 'println', 'to-str', 'dbg',
      'div', 'abs', 'min', 'max',
      'head', 'tail', 'length', 'reverse', 'sort',
      'concat', 'take', 'drop', 'to-vec',
      'contains?', 'keys', 'vals', 'get',
      'nth', 'last', 'fold', 'map', 'filter',
      'identity', 'const', 'not', 'empty?',
      'spawn', 'sleep', 'try', 'apply', 'await',
      'timeout', 'par', 'race', 'verify-laws',
      'error', 'type-of',
      'assoc', 'dissoc', 'merge',
      'split', 'join', 'trim', 'upper-case', 'lower-case',
      'starts-with?', 'ends-with?', 'replace', 'substring',
      'char-at', 'index-of',
      'sqrt', 'floor', 'ceil', 'round', 'sin', 'cos', 'tan',
      'log', 'exp', 'pow',
      'random-int', 'random-float',
      'parse-int', 'parse-float', 'char-code', 'from-char-code',
      'read-file', 'write-file', 'file-exists?',
      'json-parse', 'json-encode', 'json-encode-pretty',
      'time-ms', 'url-encode', 'url-decode',
      'resume', 'true', 'false'
    ]);

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
        if (stream.match(/^[a-z][a-z0-9-]*/)) {
          return 'atom';
        }
        // :: or ::: operator
        if (stream.match(/^:{1,2}/)) return 'operator';
        return null;
      }

      // Numbers
      if (ch >= '0' && ch <= '9') {
        // Hex
        if (stream.match(/^0x[0-9a-fA-F][0-9a-fA-F_]*/)) return 'number';
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
      if (stream.match('~>') || stream.match('<~')) return 'operator';
      if (stream.match('~*>') || stream.match('~/')) return 'operator';
      if (stream.match('==') || stream.match('/=')) return 'operator';
      if (stream.match('<=') || stream.match('>=')) return 'operator';
      if (stream.match('&&') || stream.match('||')) return 'operator';
      if (stream.match('**') || stream.match('++')) return 'operator';
      if (stream.match('..') || stream.match('..<')) return 'operator';

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
