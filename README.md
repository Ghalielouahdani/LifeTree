# LifeTree

LifeTree is a fast static drawing tool for recreating pedigree and family-tree diagrams during exam practice.

## How to run it

Clone the repository:

```bash
git clone https://github.com/Ghalielouahdani/LifeTree.git
cd LifeTree
```

Then open the app directly in your browser:

```text
pedigree-speed-drawer/index.html
```

No install step is required. The app runs fully in the browser.

If your browser blocks local file features, run a local server instead:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/pedigree-speed-drawer/
```

## What it does

- Draws pedigree symbols: circle, square, diamond, and affected fill.
- Adds common structures quickly: couple, child, sibling, parents, and 3-generation blocks.
- Keeps diagrams neat with snapping, generation labels, alignment, and arrow-key movement.
- Supports tracing from a reference image overlay.
- Exports diagrams as PNG, SVG, JSON, or print.

## Fast keys

| Key | Action |
| --- | --- |
| `F` | Add or convert to female / circle |
| `M` | Add or convert to male / square |
| `U` | Add or convert to unknown / diamond |
| `A` | Toggle affected fill |
| `P` | Create or connect a couple |
| `C` | Add a child |
| `S` | Add a sibling |
| `Delete` / `Backspace` | Delete selection |
| Arrow keys | Move selection |
| `Shift` + Arrow keys | Move selection faster |
| `Cmd/Ctrl` + `Z` | Undo |

## Practice workflow

1. Start the timer.
2. Load the exam tree image as a reference if you want to trace first.
3. Use `P`, `C`, and `S` to block out the structure.
4. Convert symbols with `F`, `M`, `U`, and shade affected members with `A`.
5. Export or print the result.
