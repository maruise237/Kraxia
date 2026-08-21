import os, re, sys

SUBS = {
    '\u2018': "'", '\u2019': "'", '\u201a': "'", '\u201b': "'",
    '\u201c': '"', '\u201d': '"', '\u201e': '"', '\u201f': '"',
    '\u2013': '-', '\u2014': '-', '\u2010': '-', '\u2011': '-',
    '\u00a0': ' ', '\u2026': '...',
}

root = sys.argv[1] if len(sys.argv) > 1 else 'src'
fixed = 0
for base, _, files in os.walk(root):
    for fn in files:
        if not fn.endswith(('.ts', '.tsx', '.html', '.md', '.css')):
            continue
        p = os.path.join(base, fn)
        with open(p, encoding='utf-8') as f:
            data = f.read()
        out = data
        for k, v in SUBS.items():
            out = out.replace(k, v)
        if out != data:
            with open(p, 'w', encoding='utf-8') as f:
                f.write(out)
            fixed += 1
print(f'normalised {fixed} file(s)')
