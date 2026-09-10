#!/usr/bin/env python3
"""Extract mermaid blocks from DIAGRAMAS_CASOS_DE_USO.md and render as PNG."""
import re, subprocess, os, sys

MD_FILE = "docs/DIAGRAMAS_CASOS_DE_USO.md"
OUT_DIR = "docs/diagramas"

# Read the markdown
with open(MD_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Extract all mermaid blocks with their section context
blocks = []
pattern = r'```mermaid\n(.*?)```'
matches = list(re.finditer(pattern, content, re.DOTALL))

# Build section mapping by looking at headings before each block
lines = content.split("\n")
block_starts = []
for m in matches:
    block_starts.append(m.start())

current_section = "general"
section_map = {}
for i, line in enumerate(lines):
    if line.startswith("## "):
        current_section = line[3:].strip()
    if i * len("\n") + len(line) in [content[:m.start()].count("\n") for m in matches]:
        pass

for idx, m in enumerate(matches):
    mermaid_code = m.group(1).strip()
    
    # Determine type
    if mermaid_code.startswith("useCaseDiagram"):
        diagram_type = "uml"
    elif mermaid_code.startswith("flowchart") or mermaid_code.startswith("graph"):
        diagram_type = "flujo"
    else:
        diagram_type = "other"
    
    # Find the heading before this block
    before = content[:m.start()]
    heading_match = list(re.finditer(r'^###?\s+(\d+\.\d+\s+.+)$', before, re.MULTILINE))
    if heading_match:
        name = heading_match[-1].group(1).strip()
    else:
        heading_match = list(re.finditer(r'^##\s+(.+)$', before, re.MULTILINE))
        if heading_match:
            name = heading_match[-1].group(1).strip()
        else:
            name = f"diagram-{idx}"
    
    # Clean name for filename
    safe_name = re.sub(r'[^a-zA-Z0-9\-]', '-', name.lower())
    safe_name = re.sub(r'-+', '-', safe_name).strip('-')
    
    blocks.append({
        "index": idx,
        "type": diagram_type,
        "name": name,
        "filename": f"{idx:02d}-{safe_name}",
        "code": mermaid_code
    })

print(f"Found {len(blocks)} mermaid blocks")

# Fix quotes in flowchart nodes - replace inner " with #quot;
def fix_mermaid_quotes(code):
    """Fix double quotes inside flowchart node labels."""
    if not (code.startswith("flowchart") or code.startswith("graph")):
        return code
    
    # Replace " inside [...], (...), {...} node labels with #quot;
    # but keep the outer delimiters intact
    result = []
    i = 0
    in_node = False
    node_char = None
    depth = 0
    
    while i < len(code):
        c = code[i]
        if c in '[({' and not in_node:
            in_node = True
            node_char = '])}'['[({'  .index(c)]
            depth = 1
            result.append(c)
        elif in_node and c == node_char:
            depth -= 1
            if depth == 0:
                in_node = False
                result.append(c)
            else:
                result.append(c)
        elif in_node and c in '[({':
            depth += 1
            result.append(c)
        elif in_node and c == '"':
            result.append('#quot;')
        else:
            result.append(c)
        i += 1
    
    return ''.join(result)

# Render each block
rendered = 0
failed = 0

for block in blocks:
    code = fix_mermaid_quotes(block["code"])
    
    # Write temp .mmd file
    mmd_path = os.path.join(OUT_DIR, block["type"], f"{block['filename']}.mmd")
    png_path = os.path.join(OUT_DIR, block["type"], f"{block['filename']}.png")
    
    os.makedirs(os.path.dirname(mmd_path), exist_ok=True)
    
    with open(mmd_path, "w", encoding="utf-8") as f:
        f.write(code)
    
    # Render with mmdc
    try:
        result = subprocess.run(
            ["mmdc.cmd", "-i", mmd_path, "-o", png_path, "-w", "2400", "-b", "white"],
            capture_output=True, text=True, timeout=30,
            shell=True
        )
        if result.returncode == 0 and os.path.exists(png_path):
            rendered += 1
            print(f"  OK: {block['filename']}.png")
        else:
            failed += 1
            err = result.stderr[:200] if result.stderr else "unknown error"
            print(f"  FAIL: {block['filename']} - {err}")
    except subprocess.TimeoutExpired:
        failed += 1
        print(f"  TIMEOUT: {block['filename']}")
    except Exception as e:
        failed += 1
        print(f"  ERROR: {block['filename']} - {e}")

print(f"\nDone: {rendered} rendered, {failed} failed out of {len(blocks)} total")
