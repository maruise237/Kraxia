import os, re, sys

# French apostrophe patterns that need U+2019 (') to avoid breaking TS single-quoted strings
PATTERNS = [
    "l'installation", "l'installations",
    "d'installation", "d'installations",
    "l'utilisateur", "l'utilisateurs", "d'utilisateur", "d'utilisateurs",
    "l'agent", "l'agents", "d'agent", "d'agents",
    "l'application", "l'applications",
    "l'API", "d'API", "l'URL", "d'URL",
    "l'écoute", "d'écoute",
    "l'admin",
    "qu'on", "d'on", "l'on",
    "c'est", "n'est", "s'est", "m'est",
    "qu'il", "qu'elle", "qu'ils", "qu'elles",
    "n'a", "n'y", "d'y",
    "aujourd'hui", "d'hui",
    "jusqu'à", "d'à",
]

def fix(text: str) -> tuple[str, int]:
    n = 0
    for pat in PATTERNS:
        src = "'" + pat.split("'", 1)[1]  # reconstruct pattern with ASCII apostrophe
        repl = "\u2019" + pat.split("'", 1)[1]  # same with U+2019
        text, k = re.subn(re.escape(src), repl, text)
        n += k
    return text, n

root = sys.argv[1] if len(sys.argv) > 1 else 'src'
total = 0
for base, _, files in os.walk(root):
    for fn in files:
        if not fn.endswith(('.ts', '.tsx')):
            continue
        p = os.path.join(base, fn)
        data = open(p, encoding='utf-8').read()
        out, k = fix(data)
        if k:
            open(p, 'w', encoding='utf-8').write(out)
            total += k
            print(f'  fixed {k:3d} aperie(s) en {p}')
print(f'TOTAL: {total}')
