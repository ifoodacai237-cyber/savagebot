---
name: Edit tool corrupts text containing $'
description: A literal $' sequence in old_string/new_string passed to the Edit tool gets silently mangled (truncates everything after it), corrupting the file without an error.
---

When using the Edit tool, a literal `$'` sequence (dollar sign immediately followed by a single quote — e.g. `ctx.fillText('$', x, y)`) inside `old_string` or `new_string` gets swallowed/truncated, silently corrupting the file (often duplicating large chunks of surrounding content on retry).

**Why:** `$'` is a special token in JS `String.prototype.replace()` replacement patterns (means "insert everything after the match"). The Edit tool's underlying implementation apparently passes the replacement string through a plain `.replace()` call, so any `$'`, `$&`, `` $` ``, `$$`, or `$1`-`$9` in the text is interpreted as a replacement pattern instead of literal text.

**How to apply:** Before editing a file where the diff will contain a string literal ending in `$` right next to a quote (e.g. drawing a `'$'` currency glyph in canvas code), rewrite that literal with a different quote style (e.g. `"$"` instead of `'$'`) to break the `$'` sequence, or otherwise avoid `$$`, `$&`, `` $` ``, `$'`, `$<digit>` appearing in old_string/new_string. If a file balloons in line count after an Edit and `node --check`/build fails right after such a literal, suspect this bug first — `git checkout` the file back to a clean state and redo the edit with the quote style changed, rather than trying to patch forward.
