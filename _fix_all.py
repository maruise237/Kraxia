#!/usr/bin/env python3
"""Final pass: replace ASCII apostrophes inside TS literal strings with U+2019
(curly apostrophe) so that French strings like "l'utilisateur" do not break
single-quoted TypeScript string literals."""
import os, re, sys

SUBS = {
    "l'installation": "l\u2019installation",
    "d'installation": "d\u2019installation",
    "l'installations": "l\u2019installations",
    "d'installations": "d\u2019installations",
    "l'utilisateur": "l\u2019utilisateur",
    "d'utilisateur": "d\u2019utilisateur",
    "l'utilisateurs": "l\u2019utilisateurs",
    "d'utilisateurs": "d\u2019utilisateurs",
    "l'agent": "l\u2019agent",
    "d'agent": "d\u2019agent",
    "l'application": "l\u2019application",
    "d'application": "d\u2019application",
    "l'API": "l\u2019API",
    "d'API": "d\u2019API",
    "l'URL": "l\u2019URL",
    "d'URL": "d\u2019URL",
    "l'écoute": "l\u2019écoute",
    "d'écoute": "d\u2019écoute",
    "l'admin": "l\u2019admin",
    "qu'on": "qu\u2019on",
    "qu'il": "qu\u2019il",
    "qu'elle": "qu\u2019elle",
    "qu'ils": "qu\u2019ils",
    "qu'elles": "qu\u2019elles",
    "n'est": "n\u2019est",
    "c'est": "c\u2019est",
    "s'est": "s\u2019est",
    "aujourd'hui": "aujourd\u2019hui",
    "jusqu'à": "jusqu\u2019à",
    "d'accord": "d\u2019accord",
    "d'autres": "d\u2019autres",
    "d'où": "d\u2019où",
}

root = sys.argv[1] if len(sys.argv) > 1 else "."
total = 0
for base, _, files in os.walk(root):
    for fn in files:
        if not fn.endswith((".ts", ".tsx")):
            continue
        p = os.path.join(base, fn)
        with open(p, encoding="utf-8") as f:
            data = f.read()
        out = data
        n = 0
        for k, v in SUBS.items():
            out, k_count = re.subn(re.escape(k), v, out)
            n += k_count
        if n:
            with open(p, "w", encoding="utf-8") as f:
                f.write(out)
            total += n
            print(f"  {n:3d} substitutions in {p}")
print(f"TOTAL: {total}")
