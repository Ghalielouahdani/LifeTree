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
- Marks multiple traits or diseases with gray, red, blue, green, half-fill, cross, and horizontal-bar styles.
- Combines fill/color, cross, and bar on the same person to represent up to three traits at once.
- Adds common structures quickly: couple, child, sibling, parents, and 3-generation blocks.
- Keeps diagrams neat with snapping, generation labels, alignment, and arrow-key movement.
- Selects multiple members by dragging a box in cursor mode.
- Labels members only when you use the `Label` button or `L` shortcut.
- Supports tracing from a reference image overlay.
- Exports diagrams as PNG, SVG, JSON, or print.

## Fast keys

| Key | Action |
| --- | --- |
| `F` | Add or convert to female / circle |
| `M` | Add or convert to male / square |
| `U` | Add or convert to unknown / diamond |
| `V` | Cursor mode / drag a selection box |
| `L` | Label the selected member, or click a member to label |
| `0` | Clear trait, cross, and bar |
| `A` | Gray affected trait |
| `R` | Red disease trait |
| `B` | Blue disease trait |
| `G` | Green disease trait |
| `H` | Half-fill carrier trait |
| `X` | Toggle cross mark |
| `T` | Toggle horizontal bar mark |
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
4. Convert symbols with `F`, `M`, `U`, and mark traits with `A`, `R`, `B`, `G`, `H`, `X`, or `T`.
5. Press `V` and drag a box around several members when you need to move or edit them together.
6. Use `Label` or `L`, then click a member to name it.
7. Export or print the result.
