const SVG_NS = "http://www.w3.org/2000/svg";
const STAGE_WIDTH = 1800;
const STAGE_HEIGHT = 2400;
const GRID_SIZE = 20;
const PERSON_RADIUS = 36;
const STORAGE_KEY = "pedigree-sprint-state-v2";
const TRAITS = {
  clear: { name: "Clear", fill: "#ffffff" },
  affected: { name: "Gray", fill: "#858583" },
  red: { name: "Red", fill: "#c94747" },
  blue: { name: "Blue", fill: "#3f73ba" },
  green: { name: "Green", fill: "#4f8a65" },
  carrier: { name: "Half", fill: "#ffffff" }
};
const TRAIT_KEYS = {
  "0": "clear",
  a: "affected",
  r: "red",
  b: "blue",
  g: "green",
  h: "carrier"
};

const state = {
  nodes: [],
  relationships: [],
  selectedNodes: new Set(),
  selectedRelationship: null,
  shape: "female",
  tool: "person",
  affectedMode: false,
  traitMode: "clear",
  crossMode: false,
  barMode: false,
  nextId: 1,
  zoom: 1,
  settings: {
    snap: true,
    grid: true,
    generations: true,
    lineColor: "#477eb9",
    lineWidth: 7
  },
  reference: null,
  history: [],
  future: []
};

const els = {};
let drag = null;
let selectionDrag = null;
let toastTimer = null;
let timerState = {
  running: false,
  startedAt: 0,
  elapsedMs: 0,
  interval: null
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheElements();
  bindControls();
  loadSavedState() || seedSample();
  pushHistory();
  render();
  centerInitialView();
}

function cacheElements() {
  [
    "stage",
    "stageWrap",
    "referenceLayer",
    "gridLayer",
    "lineLayer",
    "nodeLayer",
    "generationLayer",
    "selectionLayer",
    "diagramStats",
    "selectTool",
    "affectedBtn",
    "coupleBtn",
    "childBtn",
    "siblingBtn",
    "parentsBtn",
    "templateCoupleBtn",
    "templateNuclearBtn",
    "templateThreeGenBtn",
    "labelBtn",
    "snapBtn",
    "gridBtn",
    "generationBtn",
    "alignBtn",
    "referenceInput",
    "refOpacity",
    "clearReferenceBtn",
    "pngBtn",
    "svgBtn",
    "jsonBtn",
    "jsonInput",
    "printBtn",
    "clearBtn",
    "undoBtn",
    "redoBtn",
    "zoomOutBtn",
    "zoomInBtn",
    "zoomLabel",
    "keysBtn",
    "keysDialog",
    "toast",
    "timerText",
    "timerBtn",
    "timerResetBtn"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindControls() {
  document.querySelectorAll("[data-shape]").forEach((button) => {
    button.addEventListener("click", () => activateShape(button.dataset.shape, state.selectedNodes.size > 0));
  });

  document.querySelectorAll("[data-trait]").forEach((button) => {
    button.addEventListener("click", () => setTrait(button.dataset.trait));
  });

  document.querySelectorAll("[data-cross-toggle]").forEach((button) => {
    button.addEventListener("click", () => toggleCross());
  });

  document.querySelectorAll("[data-bar-toggle]").forEach((button) => {
    button.addEventListener("click", () => toggleBar());
  });

  els.selectTool.addEventListener("click", () => {
    state.tool = "select";
    render();
  });

  els.coupleBtn.addEventListener("click", () => insertCouple());
  els.childBtn.addEventListener("click", () => addChild());
  els.siblingBtn.addEventListener("click", () => addSibling());
  els.parentsBtn.addEventListener("click", () => addParents());
  els.templateCoupleBtn.addEventListener("click", () => insertCouple(true));
  els.templateNuclearBtn.addEventListener("click", () => insertNuclearFamily());
  els.templateThreeGenBtn.addEventListener("click", () => insertThreeGenerationBlock());
  els.labelBtn.addEventListener("click", () => activateLabelTool());
  els.snapBtn.addEventListener("click", () => toggleSetting("snap"));
  els.gridBtn.addEventListener("click", () => toggleSetting("grid"));
  els.generationBtn.addEventListener("click", () => toggleSetting("generations"));
  els.alignBtn.addEventListener("click", () => alignActiveFamily());
  els.clearReferenceBtn.addEventListener("click", () => clearReference());
  els.pngBtn.addEventListener("click", () => exportPng());
  els.svgBtn.addEventListener("click", () => exportSvg());
  els.jsonBtn.addEventListener("click", () => exportJson());
  els.printBtn.addEventListener("click", () => window.print());
  els.clearBtn.addEventListener("click", () => clearDiagram());
  els.undoBtn.addEventListener("click", () => undo());
  els.redoBtn.addEventListener("click", () => redo());
  els.zoomOutBtn.addEventListener("click", () => setZoom(state.zoom - 0.1));
  els.zoomInBtn.addEventListener("click", () => setZoom(state.zoom + 0.1));
  els.keysBtn.addEventListener("click", () => els.keysDialog.showModal());
  els.timerBtn.addEventListener("click", () => toggleTimer());
  els.timerResetBtn.addEventListener("click", () => resetTimer());
  els.refOpacity.addEventListener("input", () => setReferenceOpacity(Number(els.refOpacity.value)));
  els.referenceInput.addEventListener("change", handleReferenceUpload);
  els.jsonInput.addEventListener("change", handleJsonUpload);

  els.stage.addEventListener("pointerdown", onStagePointerDown);
  document.addEventListener("keydown", onKeyDown);
}

function seedSample() {
  state.nodes = [
    createNode(490, 150, "female", "clear"),
    createNode(670, 150, "male", "clear"),
    createNode(400, 370, "male", "affected"),
    createNode(845, 370, "female", "clear"),
    createNode(1325, 150, "female", "clear"),
    createNode(1505, 150, "male", "red"),
    createNode(1120, 370, "male", "carrier"),
    createNode(985, 600, "unknown", "blue", true, true)
  ];

  state.relationships = [
    createRelationship(["n1", "n2"], ["n3", "n4"]),
    createRelationship(["n5", "n6"], ["n7"]),
    createRelationship(["n4", "n7"], ["n8"])
  ];

  state.selectedNodes.clear();
  state.selectedRelationship = null;
}

function createNode(x, y, shape = state.shape, trait = state.traitMode, crossed = state.crossMode, barred = state.barMode) {
  const normalizedTrait = normalizeTrait(trait);
  return {
    id: `n${state.nextId++}`,
    x: snap(x),
    y: snap(y),
    shape,
    trait: normalizedTrait,
    status: normalizedTrait,
    crossed: Boolean(crossed),
    barred: Boolean(barred),
    label: ""
  };
}

function createRelationship(parents = [], children = []) {
  return {
    id: `r${state.nextId++}`,
    parents: [...parents],
    children: [...children]
  };
}

function render() {
  renderReference();
  els.gridLayer.style.display = state.settings.grid ? "" : "none";
  renderRelationships();
  renderNodes();
  renderGenerationLabels();
  renderSelectionBox();
  updateControls();
  autosave();
}

function renderReference() {
  els.referenceLayer.replaceChildren();
  if (!state.reference) return;

  const img = svg("image", {
    href: state.reference.src,
    x: state.reference.x,
    y: state.reference.y,
    width: state.reference.width,
    height: state.reference.height,
    opacity: state.reference.opacity,
    preserveAspectRatio: "xMidYMid meet"
  });
  els.referenceLayer.append(img);
}

function renderRelationships() {
  const fragment = document.createDocumentFragment();
  for (const relationship of state.relationships) {
    const paths = relationshipPaths(relationship);
    if (!paths.length) continue;

    const group = svg("g", {
      "data-rel-id": relationship.id
    });

    if (state.selectedRelationship === relationship.id) {
      for (const d of paths) {
        group.append(svg("path", {
          d,
          fill: "none",
          stroke: "#f2b27f",
          "stroke-width": state.settings.lineWidth + 8,
          "stroke-linecap": "square",
          "stroke-linejoin": "miter",
          "pointer-events": "none"
        }));
      }
    }

    for (const d of paths) {
      group.append(svg("path", {
        d,
        fill: "none",
        stroke: state.settings.lineColor,
        "stroke-width": state.settings.lineWidth,
        "stroke-linecap": "square",
        "stroke-linejoin": "miter",
        "pointer-events": "none"
      }));
    }

    for (const d of paths) {
      group.append(svg("path", {
        d,
        fill: "none",
        stroke: "transparent",
        "stroke-width": 26,
        "stroke-linecap": "square",
        "stroke-linejoin": "miter",
        "pointer-events": "stroke"
      }));
    }

    group.addEventListener("pointerdown", onRelationshipPointerDown);
    fragment.append(group);
  }

  els.lineLayer.replaceChildren(fragment);
}

function relationshipPaths(relationship) {
  const parents = relationship.parents.map(findNode).filter(Boolean);
  const children = relationship.children.map(findNode).filter(Boolean);
  if (!parents.length) return [];

  const paths = [];
  const parentLine = getParentLine(parents);
  if (!parentLine) return [];

  if (parents.length > 1) {
    paths.push(`M ${parentLine.x1} ${parentLine.y} L ${parentLine.x2} ${parentLine.y}`);
  }

  if (!children.length) return paths;

  const childTopY = Math.min(...children.map((child) => child.y - shapeOffset(child)));
  const verticalX = parentLine.midX;

  if (children.length === 1) {
    const child = children[0];
    paths.push(`M ${verticalX} ${parentLine.y} L ${verticalX} ${child.y - shapeOffset(child)}`);
    return paths;
  }

  const barY = Math.max(parentLine.y + 70, childTopY - 88);
  const sortedChildren = [...children].sort((a, b) => a.x - b.x);
  const minX = sortedChildren[0].x;
  const maxX = sortedChildren[sortedChildren.length - 1].x;

  paths.push(`M ${verticalX} ${parentLine.y} L ${verticalX} ${barY}`);
  paths.push(`M ${minX} ${barY} L ${maxX} ${barY}`);

  for (const child of children) {
    paths.push(`M ${child.x} ${barY} L ${child.x} ${child.y - shapeOffset(child)}`);
  }

  return paths;
}

function getParentLine(parents) {
  if (parents.length === 1) {
    return {
      x1: parents[0].x,
      x2: parents[0].x,
      midX: parents[0].x,
      y: parents[0].y + PERSON_RADIUS
    };
  }

  const ordered = [...parents].sort((a, b) => a.x - b.x);
  const left = ordered[0];
  const right = ordered[1];
  const y = snap((left.y + right.y) / 2);
  return {
    x1: left.x + shapeOffset(left),
    x2: right.x - shapeOffset(right),
    midX: snap((left.x + right.x) / 2),
    y
  };
}

function renderNodes() {
  const fragment = document.createDocumentFragment();
  for (const node of state.nodes) {
    const group = svg("g", {
      transform: `translate(${node.x} ${node.y})`,
      "data-node-id": node.id,
      role: "button",
      tabindex: "0"
    });

    if (state.selectedNodes.has(node.id)) {
      group.append(drawShape(node, {
        fill: "none",
        stroke: "#cc6b2d",
        strokeWidth: 7,
        radiusPad: 9,
        filter: ""
      }));
    }

    const trait = getNodeTrait(node);
    group.append(drawShape(node, {
      fill: TRAITS[trait].fill,
      stroke: "#111820",
      strokeWidth: 3,
      radiusPad: 0,
      filter: "url(#shapeShadow)"
    }));

    if (trait === "carrier") {
      group.append(drawCarrierOverlay(node));
      group.append(drawShape(node, {
        fill: "none",
        stroke: "#111820",
        strokeWidth: 3,
        radiusPad: 0,
        filter: ""
      }));
    }

    if (node.crossed) {
      group.append(drawCrossOverlay(node));
    }

    if (node.barred) {
      group.append(drawBarOverlay(node));
    }

    if (node.label) {
      group.append(svg("text", {
        x: 0,
        y: PERSON_RADIUS + 28,
        "text-anchor": "middle",
        "font-size": 22,
        "font-weight": 700,
        fill: "#15191f"
      }, node.label));
    }

    group.addEventListener("pointerdown", onNodePointerDown);
    fragment.append(group);
  }

  els.nodeLayer.replaceChildren(fragment);
}

function drawShape(node, options) {
  const fill = options.fill;
  const stroke = options.stroke;
  const strokeWidth = options.strokeWidth;
  const filter = options.filter;
  const pad = options.radiusPad || 0;
  const common = {
    fill,
    stroke,
    "stroke-width": strokeWidth,
    filter
  };

  if (node.shape === "female") {
    return svg("circle", {
      ...common,
      cx: 0,
      cy: 0,
      r: PERSON_RADIUS + pad
    });
  }

  if (node.shape === "unknown") {
    const r = PERSON_RADIUS + pad + 4;
    return svg("path", {
      ...common,
      d: `M 0 ${-r} L ${r} 0 L 0 ${r} L ${-r} 0 Z`
    });
  }

  const r = PERSON_RADIUS + pad;
  return svg("rect", {
    ...common,
    x: -r,
    y: -r,
    width: r * 2,
    height: r * 2
  });
}

function drawCarrierOverlay(node) {
  const r = PERSON_RADIUS;
  const attrs = {
    fill: TRAITS.affected.fill,
    stroke: "none",
    "pointer-events": "none"
  };

  if (node.shape === "female") {
    return svg("path", {
      ...attrs,
      d: `M 0 ${-r} A ${r} ${r} 0 0 0 0 ${r} Z`
    });
  }

  if (node.shape === "unknown") {
    const d = r + 4;
    return svg("path", {
      ...attrs,
      d: `M 0 ${-d} L 0 ${d} L ${-d} 0 Z`
    });
  }

  return svg("rect", {
    ...attrs,
    x: -r,
    y: -r,
    width: r,
    height: r * 2
  });
}

function drawCrossOverlay(node) {
  const r = node.shape === "unknown" ? PERSON_RADIUS + 8 : PERSON_RADIUS + 3;
  const group = svg("g", {
    "pointer-events": "none"
  });
  const common = {
    stroke: "#111820",
    "stroke-width": 5,
    "stroke-linecap": "round"
  };
  group.append(svg("line", {
    ...common,
    x1: -r,
    y1: -r,
    x2: r,
    y2: r
  }));
  group.append(svg("line", {
    ...common,
    x1: r,
    y1: -r,
    x2: -r,
    y2: r
  }));
  return group;
}

function drawBarOverlay(node) {
  const r = node.shape === "unknown" ? PERSON_RADIUS + 4 : PERSON_RADIUS - 6;
  return svg("line", {
    x1: -r,
    y1: 0,
    x2: r,
    y2: 0,
    stroke: "#111820",
    "stroke-width": 6,
    "stroke-linecap": "round",
    "pointer-events": "none"
  });
}

function renderGenerationLabels() {
  els.generationLayer.replaceChildren();
  if (!state.settings.generations || state.nodes.length === 0) return;

  const rows = clusterRows(state.nodes.map((node) => node.y));
  rows.forEach((rowY, index) => {
    els.generationLayer.append(svg("text", {
      x: 70,
      y: rowY + 12,
      "text-anchor": "middle",
      "font-size": 70,
      "font-weight": 800,
      fill: "#06080a",
      "pointer-events": "none"
    }, toRoman(index + 1)));
  });
}

function renderSelectionBox() {
  els.selectionLayer.replaceChildren();
  if (!selectionDrag) return;

  const rect = normalizeRect(selectionDrag.start, selectionDrag.current);
  els.selectionLayer.append(svg("rect", {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    fill: "rgba(204, 107, 45, 0.12)",
    stroke: "#cc6b2d",
    "stroke-width": 2,
    "stroke-dasharray": "9 6",
    "pointer-events": "none"
  }));
}

function onStagePointerDown(event) {
  if (event.button !== 0) return;
  if (event.target.closest("[data-node-id]") || event.target.closest("[data-rel-id]")) return;

  const point = clientToSvg(event);
  if (state.tool === "person") {
    mutate("Person added", () => {
      const node = createNode(point.x, point.y);
      clearSelection();
      state.selectedNodes.add(node.id);
      state.nodes.push(node);
    });
    return;
  }

  startSelectionDrag(event, point);
}

function startSelectionDrag(event, point) {
  event.preventDefault();
  const additive = event.shiftKey || event.metaKey || event.ctrlKey;
  selectionDrag = {
    start: point,
    current: point,
    additive,
    existing: new Set(state.selectedNodes),
    moved: false
  };

  window.addEventListener("pointermove", onSelectionPointerMove);
  window.addEventListener("pointerup", onSelectionPointerUp, { once: true });
  render();
}

function onSelectionPointerMove(event) {
  if (!selectionDrag) return;
  selectionDrag.current = clientToSvg(event);
  selectionDrag.moved = selectionDrag.moved || distance(selectionDrag.start, selectionDrag.current) > 6;
  applySelectionRect();
  render();
}

function onSelectionPointerUp() {
  window.removeEventListener("pointermove", onSelectionPointerMove);
  if (!selectionDrag) return;

  if (!selectionDrag.moved) {
    if (!selectionDrag.additive) clearSelection();
  } else {
    applySelectionRect();
  }

  const count = state.selectedNodes.size;
  selectionDrag = null;
  render();
  if (count > 1) toast(`${count} selected`);
}

function applySelectionRect() {
  if (!selectionDrag) return;

  const rect = normalizeRect(selectionDrag.start, selectionDrag.current);
  const selectedIds = state.nodes
    .filter((node) => nodeIntersectsRect(node, rect))
    .map((node) => node.id);

  state.selectedRelationship = null;
  state.selectedNodes.clear();
  if (selectionDrag.additive) {
    selectionDrag.existing.forEach((id) => state.selectedNodes.add(id));
  }
  selectedIds.forEach((id) => state.selectedNodes.add(id));
}

function onRelationshipPointerDown(event) {
  event.preventDefault();
  event.stopPropagation();
  const relationshipId = event.currentTarget.dataset.relId;

  if (!event.shiftKey && !event.metaKey && !event.ctrlKey) {
    state.selectedNodes.clear();
  }
  state.selectedRelationship = relationshipId;
  render();
}

function onNodePointerDown(event) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();

  const nodeId = event.currentTarget.dataset.nodeId;
  if (state.tool === "label") {
    state.selectedNodes.clear();
    state.selectedRelationship = null;
    state.selectedNodes.add(nodeId);
    render();
    editLabel(nodeId);
    return;
  }

  const additive = event.shiftKey || event.metaKey || event.ctrlKey;
  if (additive && state.selectedNodes.has(nodeId)) {
    state.selectedNodes.delete(nodeId);
    render();
    return;
  }

  if (!state.selectedNodes.has(nodeId)) {
    if (!additive) {
      state.selectedNodes.clear();
      state.selectedRelationship = null;
    }
    state.selectedNodes.add(nodeId);
    render();
  }

  const start = clientToSvg(event);
  const ids = [...state.selectedNodes];
  drag = {
    ids,
    start,
    before: snapshot(),
    initial: new Map(ids.map((id) => {
      const node = findNode(id);
      return [id, { x: node.x, y: node.y }];
    }))
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp, { once: true });
}

function onPointerMove(event) {
  if (!drag) return;
  const current = clientToSvg(event);
  const dx = current.x - drag.start.x;
  const dy = current.y - drag.start.y;

  for (const id of drag.ids) {
    const node = findNode(id);
    const initial = drag.initial.get(id);
    node.x = maybeSnap(initial.x + dx);
    node.y = maybeSnap(initial.y + dy);
  }
  render();
}

function onPointerUp() {
  window.removeEventListener("pointermove", onPointerMove);
  if (!drag) return;

  if (snapshot() !== drag.before) {
    pushHistory();
    toast("Moved");
  }
  drag = null;
  render();
}

function onKeyDown(event) {
  if (isTypingTarget(event.target)) return;

  const key = event.key.toLowerCase();
  const commandKey = event.metaKey || event.ctrlKey;

  if (commandKey && key === "z") {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
    return;
  }

  if (commandKey && key === "y") {
    event.preventDefault();
    redo();
    return;
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    deleteSelection();
    return;
  }

  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
    const amount = event.altKey ? 1 : event.shiftKey ? 40 : 10;
    const delta = {
      ArrowLeft: [-amount, 0],
      ArrowRight: [amount, 0],
      ArrowUp: [0, -amount],
      ArrowDown: [0, amount]
    }[event.key];
    nudgeSelection(delta[0], delta[1]);
    return;
  }

  if (key === "v") {
    event.preventDefault();
    state.tool = "select";
    render();
    return;
  }

  if (key === "f" || key === "1") {
    event.preventDefault();
    activateShape("female", state.selectedNodes.size > 0);
    return;
  }

  if (key === "m" || key === "2") {
    event.preventDefault();
    activateShape("male", state.selectedNodes.size > 0);
    return;
  }

  if (key === "u" || key === "3") {
    event.preventDefault();
    activateShape("unknown", state.selectedNodes.size > 0);
    return;
  }

  if (key === "a") {
    event.preventDefault();
    setTrait("affected");
    return;
  }

  if (key in TRAIT_KEYS) {
    event.preventDefault();
    setTrait(TRAIT_KEYS[key]);
    return;
  }

  if (key === "x") {
    event.preventDefault();
    toggleCross();
    return;
  }

  if (key === "t") {
    event.preventDefault();
    toggleBar();
    return;
  }

  if (key === "p") {
    event.preventDefault();
    insertCouple();
    return;
  }

  if (key === "c") {
    event.preventDefault();
    addChild();
    return;
  }

  if (key === "s") {
    event.preventDefault();
    addSibling();
    return;
  }

  if (key === "l") {
    event.preventDefault();
    activateLabelTool();
    return;
  }

  if (key === "d") {
    event.preventDefault();
    duplicateSelection();
    return;
  }

  if (key === "escape") {
    state.selectedNodes.clear();
    state.selectedRelationship = null;
    render();
  }
}

function activateShape(shape, convertSelected = false) {
  state.shape = shape;
  state.tool = "person";

  if (convertSelected && state.selectedNodes.size > 0) {
    mutate("Shape changed", () => {
      for (const id of state.selectedNodes) {
        const node = findNode(id);
        if (node) node.shape = shape;
      }
    });
    return;
  }

  render();
}

function toggleAffected() {
  setTrait("affected");
}

function setTrait(trait) {
  const normalizedTrait = normalizeTrait(trait);
  if (state.selectedNodes.size > 0) {
    mutate("Trait changed", () => {
      for (const id of state.selectedNodes) {
        const node = findNode(id);
        if (!node) continue;
        applyNodeTrait(node, normalizedTrait);
        if (normalizedTrait === "clear") {
          node.crossed = false;
          node.barred = false;
        }
      }
    });
    return;
  }

  state.traitMode = normalizedTrait;
  state.affectedMode = normalizedTrait === "affected";
  state.tool = "person";
  if (normalizedTrait === "clear") {
    state.crossMode = false;
    state.barMode = false;
  }
  render();
  toast(`${TRAITS[normalizedTrait].name} brush`);
}

function toggleCross() {
  if (state.selectedNodes.size > 0) {
    mutate("Cross changed", () => {
      const selected = [...state.selectedNodes].map(findNode).filter(Boolean);
      const shouldCross = selected.some((node) => !node.crossed);
      selected.forEach((node) => {
        node.crossed = shouldCross;
      });
    });
    return;
  }

  state.crossMode = !state.crossMode;
  state.tool = "person";
  render();
  toast(state.crossMode ? "Cross brush on" : "Cross brush off");
}

function toggleBar() {
  if (state.selectedNodes.size > 0) {
    mutate("Bar changed", () => {
      const selected = [...state.selectedNodes].map(findNode).filter(Boolean);
      const shouldBar = selected.some((node) => !node.barred);
      selected.forEach((node) => {
        node.barred = shouldBar;
      });
    });
    return;
  }

  state.barMode = !state.barMode;
  state.tool = "person";
  render();
  toast(state.barMode ? "Bar brush on" : "Bar brush off");
}

function insertCouple(forceTemplate = false) {
  if (!forceTemplate && state.selectedNodes.size === 2) {
    mutate("Couple connected", () => {
      const ids = [...state.selectedNodes];
      alignParents(ids);
      ensureRelationship(ids);
    });
    return;
  }

  if (!forceTemplate && state.selectedNodes.size === 1) {
    addPartnerToSelected();
    return;
  }

  mutate("Couple added", () => {
    const center = insertionPoint();
    const left = createNode(center.x - 90, center.y, "female", "clear");
    const right = createNode(center.x + 90, center.y, "male", "clear");
    state.nodes.push(left, right);
    const relationship = createRelationship([left.id, right.id], []);
    state.relationships.push(relationship);
    clearSelection();
    state.selectedNodes.add(left.id);
    state.selectedNodes.add(right.id);
    state.selectedRelationship = relationship.id;
  });
}

function addPartnerToSelected() {
  const base = findNode([...state.selectedNodes][0]);
  if (!base) return;

  mutate("Partner added", () => {
    const direction = base.x < STAGE_WIDTH - 220 ? 1 : -1;
    const partnerShape = base.shape === "female" ? "male" : "female";
    const partner = createNode(base.x + direction * 180, base.y, partnerShape, "clear");
    state.nodes.push(partner);
    const relationship = ensureRelationship(direction === 1 ? [base.id, partner.id] : [partner.id, base.id]);
    clearSelection();
    state.selectedNodes.add(base.id);
    state.selectedNodes.add(partner.id);
    state.selectedRelationship = relationship.id;
  });
}

function addChild() {
  mutate("Child added", () => {
    let relationship = getActiveRelationship();
    if (!relationship && state.selectedNodes.size === 2) {
      const ids = [...state.selectedNodes];
      alignParents(ids);
      relationship = ensureRelationship(ids);
    }
    if (!relationship && state.selectedNodes.size === 1) {
      const baseId = [...state.selectedNodes][0];
      const base = findNode(baseId);
      const partnerShape = base.shape === "female" ? "male" : "female";
      const partner = createNode(base.x + 180, base.y, partnerShape, "clear");
      state.nodes.push(partner);
      relationship = ensureRelationship([baseId, partner.id]);
    }
    if (!relationship) {
      const center = insertionPoint();
      const left = createNode(center.x - 90, center.y, "female", "clear");
      const right = createNode(center.x + 90, center.y, "male", "clear");
      state.nodes.push(left, right);
      relationship = createRelationship([left.id, right.id], []);
      state.relationships.push(relationship);
    }

    const parentNodes = relationship.parents.map(findNode).filter(Boolean);
    const parentLine = getParentLine(parentNodes);
    const existingChildren = relationship.children.map(findNode).filter(Boolean);
    const y = existingChildren.length
      ? average(existingChildren.map((node) => node.y))
      : (parentLine ? parentLine.y + 210 : insertionPoint().y + 210);
    const x = existingChildren.length
      ? Math.max(...existingChildren.map((node) => node.x)) + 170
      : (parentLine ? parentLine.midX : insertionPoint().x);

    const child = createNode(x, y, state.shape);
    state.nodes.push(child);
    relationship.children.push(child.id);
    reflowChildren(relationship);
    clearSelection();
    state.selectedNodes.add(child.id);
    state.selectedRelationship = relationship.id;
    revealNode(child);
  });
}

function addSibling() {
  if (state.selectedNodes.size !== 1) {
    addChild();
    return;
  }

  const selectedId = [...state.selectedNodes][0];
  const relationship = state.relationships.find((item) => item.children.includes(selectedId));
  if (!relationship) {
    addChild();
    return;
  }

  mutate("Sibling added", () => {
    const selected = findNode(selectedId);
    const child = createNode(selected.x + 170, selected.y, state.shape);
    state.nodes.push(child);
    relationship.children.push(child.id);
    reflowChildren(relationship);
    clearSelection();
    state.selectedNodes.add(child.id);
    state.selectedRelationship = relationship.id;
    revealNode(child);
  });
}

function addParents() {
  if (state.selectedNodes.size !== 1) {
    insertCouple();
    return;
  }

  const child = findNode([...state.selectedNodes][0]);
  if (!child) return;

  const existing = state.relationships.find((relationship) => relationship.children.includes(child.id));
  if (existing) {
    state.selectedRelationship = existing.id;
    render();
    toast("Parents already linked");
    return;
  }

  mutate("Parents added", () => {
    const parentY = child.y - 220;
    const mother = createNode(child.x - 90, parentY, "female", "clear");
    const father = createNode(child.x + 90, parentY, "male", "clear");
    state.nodes.push(mother, father);
    const relationship = createRelationship([mother.id, father.id], [child.id]);
    state.relationships.push(relationship);
    clearSelection();
    state.selectedNodes.add(mother.id);
    state.selectedNodes.add(father.id);
    state.selectedRelationship = relationship.id;
  });
}

function insertNuclearFamily() {
  mutate("Family added", () => {
    const center = insertionPoint();
    const mother = createNode(center.x - 90, center.y, "female", "clear");
    const father = createNode(center.x + 90, center.y, "male", "clear");
    const childA = createNode(center.x - 85, center.y + 220, "male");
    const childB = createNode(center.x + 85, center.y + 220, "female", "clear");
    state.nodes.push(mother, father, childA, childB);
    const relationship = createRelationship([mother.id, father.id], [childA.id, childB.id]);
    state.relationships.push(relationship);
    clearSelection();
    state.selectedRelationship = relationship.id;
    revealNode(childB);
  });
}

function insertThreeGenerationBlock() {
  mutate("3-generation block added", () => {
    const center = insertionPoint();
    const grandmother = createNode(center.x - 220, center.y - 10, "female", "clear");
    const grandfather = createNode(center.x - 40, center.y - 10, "male", "clear");
    const parent = createNode(center.x - 130, center.y + 210, "female", "clear");
    const aunt = createNode(center.x - 310, center.y + 210, "male", "affected");
    const partner = createNode(center.x + 100, center.y + 210, "male", "clear");
    const child = createNode(center.x - 15, center.y + 430, "unknown", "clear");
    state.nodes.push(grandmother, grandfather, aunt, parent, partner, child);
    const relA = createRelationship([grandmother.id, grandfather.id], [aunt.id, parent.id]);
    const relB = createRelationship([parent.id, partner.id], [child.id]);
    state.relationships.push(relA, relB);
    clearSelection();
    state.selectedRelationship = relB.id;
    revealNode(child);
  });
}

function ensureRelationship(parentIds) {
  const existing = state.relationships.find((relationship) => sameMembers(relationship.parents, parentIds));
  if (existing) return existing;

  const relationship = createRelationship(parentIds, []);
  state.relationships.push(relationship);
  return relationship;
}

function getActiveRelationship() {
  if (state.selectedRelationship) {
    const relationship = state.relationships.find((item) => item.id === state.selectedRelationship);
    if (relationship) return relationship;
  }

  if (state.selectedNodes.size === 2) {
    const ids = [...state.selectedNodes];
    return state.relationships.find((relationship) => sameMembers(relationship.parents, ids)) || null;
  }

  if (state.selectedNodes.size === 1) {
    const id = [...state.selectedNodes][0];
    return state.relationships.find((relationship) => relationship.parents.includes(id)) || null;
  }

  return null;
}

function reflowChildren(relationship) {
  const parents = relationship.parents.map(findNode).filter(Boolean);
  const children = relationship.children.map(findNode).filter(Boolean).sort((a, b) => a.x - b.x);
  if (!children.length) return;

  const parentLine = getParentLine(parents);
  const centerX = parentLine ? parentLine.midX : average(children.map((node) => node.x));
  const y = maybeSnap(average(children.map((node) => node.y)));
  const spacing = 170;
  const start = centerX - ((children.length - 1) * spacing) / 2;

  children.forEach((child, index) => {
    child.x = maybeSnap(start + index * spacing);
    child.y = y;
  });
}

function alignActiveFamily() {
  mutate("Aligned", () => {
    if (state.selectedRelationship) {
      const relationship = state.relationships.find((item) => item.id === state.selectedRelationship);
      if (relationship) {
        alignParents(relationship.parents);
        reflowChildren(relationship);
        return;
      }
    }

    if (state.selectedNodes.size) {
      const selected = [...state.selectedNodes].map(findNode).filter(Boolean);
      const y = maybeSnap(average(selected.map((node) => node.y)));
      selected.forEach((node) => {
        node.y = y;
      });
    }
  });
}

function alignParents(parentIds) {
  const parents = parentIds.map(findNode).filter(Boolean);
  if (parents.length < 2) return;
  const y = maybeSnap(average(parents.map((node) => node.y)));
  parents.forEach((node) => {
    node.y = y;
  });
}

function nudgeSelection(dx, dy) {
  if (!state.selectedNodes.size) return;
  mutate("Moved", () => {
    for (const id of state.selectedNodes) {
      const node = findNode(id);
      if (!node) continue;
      node.x = clamp(node.x + dx, PERSON_RADIUS, STAGE_WIDTH - PERSON_RADIUS);
      node.y = clamp(node.y + dy, PERSON_RADIUS, STAGE_HEIGHT - PERSON_RADIUS);
    }
  });
}

function deleteSelection() {
  if (!state.selectedNodes.size && !state.selectedRelationship) return;

  mutate("Deleted", () => {
    if (state.selectedRelationship) {
      state.relationships = state.relationships.filter((relationship) => relationship.id !== state.selectedRelationship);
      state.selectedRelationship = null;
    }

    if (state.selectedNodes.size) {
      const deleted = new Set(state.selectedNodes);
      state.nodes = state.nodes.filter((node) => !deleted.has(node.id));
      state.relationships = state.relationships
        .map((relationship) => ({
          ...relationship,
          parents: relationship.parents.filter((id) => !deleted.has(id)),
          children: relationship.children.filter((id) => !deleted.has(id))
        }))
        .filter((relationship) => relationship.parents.length || relationship.children.length);
      state.selectedNodes.clear();
    }
  });
}

function duplicateSelection() {
  if (!state.selectedNodes.size) return;

  mutate("Duplicated", () => {
    const selected = new Set(state.selectedNodes);
    const idMap = new Map();
    const newNodes = [];

    for (const node of state.nodes) {
      if (!selected.has(node.id)) continue;
      const clone = {
        ...node,
        id: `n${state.nextId++}`,
        x: clamp(node.x + 80, PERSON_RADIUS, STAGE_WIDTH - PERSON_RADIUS),
        y: clamp(node.y + 80, PERSON_RADIUS, STAGE_HEIGHT - PERSON_RADIUS)
      };
      idMap.set(node.id, clone.id);
      newNodes.push(clone);
    }

    const newRelationships = [];
    for (const relationship of state.relationships) {
      const allIds = [...relationship.parents, ...relationship.children];
      if (!allIds.every((id) => idMap.has(id))) continue;
      newRelationships.push(createRelationship(
        relationship.parents.map((id) => idMap.get(id)),
        relationship.children.map((id) => idMap.get(id))
      ));
    }

    state.nodes.push(...newNodes);
    state.relationships.push(...newRelationships);
    clearSelection();
    newNodes.forEach((node) => state.selectedNodes.add(node.id));
  });
}

function labelSelected() {
  if (state.selectedNodes.size !== 1) return;
  editLabel([...state.selectedNodes][0]);
}

function activateLabelTool() {
  if (state.selectedNodes.size === 1) {
    editLabel([...state.selectedNodes][0]);
    return;
  }

  state.tool = "label";
  state.selectedRelationship = null;
  render();
  toast("Click a member to label");
}

function editLabel(nodeId) {
  const node = findNode(nodeId);
  if (!node) return;
  const next = window.prompt("Label", node.label || "");
  if (next === null) return;
  mutate("Label changed", () => {
    node.label = next.trim().slice(0, 18);
  });
}

function toggleSetting(setting) {
  state.settings[setting] = !state.settings[setting];
  render();
}

function setReferenceOpacity(opacity) {
  if (!state.reference) return;
  state.reference.opacity = opacity;
  render();
}

function handleReferenceUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const maxW = 1180;
      const maxH = 820;
      const scale = Math.min(maxW / image.width, maxH / image.height, 1);
      state.reference = {
        src: reader.result,
        x: 260,
        y: 90,
        width: Math.round(image.width * scale),
        height: Math.round(image.height * scale),
        opacity: Number(els.refOpacity.value)
      };
      render();
      toast("Reference loaded");
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
  event.target.value = "";
}

function clearReference() {
  state.reference = null;
  render();
  toast("Reference cleared");
}

function clearDiagram() {
  if (!window.confirm("Clear the diagram?")) return;
  mutate("Cleared", () => {
    state.nodes = [];
    state.relationships = [];
    state.selectedNodes.clear();
    state.selectedRelationship = null;
    state.reference = null;
  });
}

function undo() {
  if (state.history.length <= 1) return;
  const current = state.history.pop();
  state.future.push(current);
  restoreSnapshot(state.history[state.history.length - 1]);
  render();
  toast("Undo");
}

function redo() {
  if (!state.future.length) return;
  const next = state.future.pop();
  state.history.push(next);
  restoreSnapshot(next);
  render();
  toast("Redo");
}

function pushHistory() {
  const current = snapshot();
  if (state.history[state.history.length - 1] === current) return;
  state.history.push(current);
  if (state.history.length > 90) state.history.shift();
  state.future = [];
}

function mutate(message, callback) {
  callback();
  pushHistory();
  render();
  if (message) toast(message);
}

function snapshot() {
  return JSON.stringify({
    nodes: state.nodes,
    relationships: state.relationships,
    nextId: state.nextId,
    shape: state.shape,
    tool: state.tool,
    affectedMode: state.affectedMode,
    traitMode: state.traitMode,
    crossMode: state.crossMode,
    barMode: state.barMode,
    settings: state.settings
  });
}

function restoreSnapshot(serialized) {
  const data = JSON.parse(serialized);
  state.nodes = data.nodes || [];
  state.relationships = data.relationships || [];
  state.nextId = Math.max(data.nextId || 1, computeNextId());
  state.shape = data.shape || "female";
  state.tool = data.tool || "person";
  state.traitMode = normalizeTrait(data.traitMode || (data.affectedMode ? "affected" : "clear"));
  state.crossMode = Boolean(data.crossMode);
  state.barMode = Boolean(data.barMode);
  state.affectedMode = state.traitMode === "affected";
  normalizeNodes();
  state.settings = {
    snap: true,
    grid: true,
    generations: true,
    lineColor: "#477eb9",
    lineWidth: 7,
    ...(data.settings || {})
  };
  clearSelection();
}

function autosave() {
  try {
    const reference = state.reference && state.reference.src.length < 1500000 ? state.reference : null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      nodes: state.nodes,
      relationships: state.relationships,
      nextId: state.nextId,
      shape: state.shape,
      tool: state.tool,
      affectedMode: state.affectedMode,
      traitMode: state.traitMode,
      crossMode: state.crossMode,
      barMode: state.barMode,
      settings: state.settings,
      reference
    }));
  } catch {
    // Local file privacy settings can disable storage.
  }
}

function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;
    const data = JSON.parse(saved);
    if (!Array.isArray(data.nodes) || !Array.isArray(data.relationships)) return false;
    state.nodes = data.nodes;
    state.relationships = data.relationships;
    state.nextId = Math.max(data.nextId || 1, computeNextId());
    state.shape = data.shape || "female";
    state.tool = data.tool || "person";
    state.traitMode = normalizeTrait(data.traitMode || (data.affectedMode ? "affected" : "clear"));
    state.crossMode = Boolean(data.crossMode);
    state.barMode = Boolean(data.barMode);
    state.affectedMode = state.traitMode === "affected";
    normalizeNodes();
    state.settings = {
      snap: true,
      grid: true,
      generations: true,
      lineColor: "#477eb9",
      lineWidth: 7,
      ...(data.settings || {})
    };
    state.reference = data.reference || null;
    if (state.reference) els.refOpacity.value = String(state.reference.opacity);
    return true;
  } catch {
    return false;
  }
}

function exportJson() {
  const data = JSON.stringify({
    nodes: state.nodes,
    relationships: state.relationships,
    nextId: state.nextId,
    traitMode: state.traitMode,
    crossMode: state.crossMode,
    barMode: state.barMode,
    settings: state.settings
  }, null, 2);
  downloadBlob(new Blob([data], { type: "application/json" }), "pedigree-sprint.json");
  toast("JSON saved");
}

function handleJsonUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  file.text().then((text) => {
    const data = JSON.parse(text);
    mutate("JSON loaded", () => {
      state.nodes = Array.isArray(data.nodes) ? data.nodes : [];
      state.relationships = Array.isArray(data.relationships) ? data.relationships : [];
      state.nextId = Math.max(data.nextId || 1, computeNextId());
      state.traitMode = normalizeTrait(data.traitMode || state.traitMode);
      state.crossMode = Boolean(data.crossMode);
      state.barMode = Boolean(data.barMode);
      state.affectedMode = state.traitMode === "affected";
      normalizeNodes();
      state.settings = {
        ...state.settings,
        ...(data.settings || {})
      };
      clearSelection();
    });
  }).catch(() => toast("Could not load JSON"));

  event.target.value = "";
}

function exportSvg() {
  const serialized = getExportSvgString();
  downloadBlob(new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }), "pedigree-sprint.svg");
  toast("SVG saved");
}

function exportPng() {
  const serialized = getExportSvgString();
  const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = STAGE_WIDTH;
    canvas.height = STAGE_HEIGHT;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      downloadBlob(pngBlob, "pedigree-sprint.png");
      toast("PNG saved");
    }, "image/png");
  };
  image.src = url;
}

function getExportSvgString() {
  const clone = els.stage.cloneNode(true);
  clone.querySelectorAll("[stroke='transparent']").forEach((node) => node.remove());
  clone.querySelectorAll("[stroke='#f2b27f']").forEach((node) => node.remove());
  clone.querySelectorAll("[stroke='#cc6b2d']").forEach((node) => node.remove());
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", String(STAGE_WIDTH));
  clone.setAttribute("height", String(STAGE_HEIGHT));
  clone.setAttribute("viewBox", `0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setZoom(nextZoom) {
  state.zoom = clamp(nextZoom, 0.55, 1.8);
  els.stage.style.width = `${STAGE_WIDTH * state.zoom}px`;
  els.stage.style.height = `${STAGE_HEIGHT * state.zoom}px`;
  els.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
}

function toggleTimer() {
  if (timerState.running) {
    timerState.elapsedMs += Date.now() - timerState.startedAt;
    timerState.running = false;
    clearInterval(timerState.interval);
    els.timerBtn.textContent = "▶";
    updateTimerText();
    return;
  }

  timerState.running = true;
  timerState.startedAt = Date.now();
  timerState.interval = setInterval(updateTimerText, 250);
  els.timerBtn.textContent = "Ⅱ";
  updateTimerText();
}

function resetTimer() {
  timerState.running = false;
  timerState.elapsedMs = 0;
  clearInterval(timerState.interval);
  els.timerBtn.textContent = "▶";
  updateTimerText();
}

function updateTimerText() {
  const elapsed = timerState.elapsedMs + (timerState.running ? Date.now() - timerState.startedAt : 0);
  const seconds = Math.floor(elapsed / 1000);
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  els.timerText.textContent = `${mins}:${secs}`;
}

function updateControls() {
  document.querySelectorAll("[data-shape]").forEach((button) => {
    button.classList.toggle("is-active", state.tool === "person" && button.dataset.shape === state.shape);
  });
  document.querySelectorAll("[data-trait]").forEach((button) => {
    const trait = normalizeTrait(button.dataset.trait);
    button.classList.toggle("is-active", state.traitMode === trait);
  });
  document.querySelectorAll("[data-cross-toggle]").forEach((button) => {
    const selected = [...state.selectedNodes].map(findNode).filter(Boolean);
    const crossActive = selected.length ? selected.some((node) => node.crossed) : state.crossMode;
    button.classList.toggle("is-hot", crossActive);
  });
  document.querySelectorAll("[data-bar-toggle]").forEach((button) => {
    const selected = [...state.selectedNodes].map(findNode).filter(Boolean);
    const barActive = selected.length ? selected.some((node) => node.barred) : state.barMode;
    button.classList.toggle("is-hot", barActive);
  });
  els.selectTool.classList.toggle("is-active", state.tool === "select");
  els.labelBtn.classList.toggle("is-on", state.tool === "label");
  els.snapBtn.classList.toggle("is-on", state.settings.snap);
  els.snapBtn.setAttribute("aria-pressed", String(state.settings.snap));
  els.gridBtn.classList.toggle("is-on", state.settings.grid);
  els.gridBtn.setAttribute("aria-pressed", String(state.settings.grid));
  els.generationBtn.classList.toggle("is-on", state.settings.generations);
  els.generationBtn.setAttribute("aria-pressed", String(state.settings.generations));
  els.undoBtn.disabled = state.history.length <= 1;
  els.redoBtn.disabled = state.future.length === 0;
  els.diagramStats.textContent = `${state.nodes.length} people · ${state.relationships.length} links`;
}

function clientToSvg(event) {
  const point = els.stage.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(els.stage.getScreenCTM().inverse());
}

function normalizeRect(start, end) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return {
    x,
    y,
    width,
    height,
    x2: x + width,
    y2: y + height
  };
}

function nodeIntersectsRect(node, rect) {
  const radius = shapeOffset(node) + 12;
  return node.x + radius >= rect.x &&
    node.x - radius <= rect.x2 &&
    node.y + radius >= rect.y &&
    node.y - radius <= rect.y2;
}

function distance(start, end) {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function insertionPoint() {
  const rect = els.stageWrap.getBoundingClientRect();
  const x = (els.stageWrap.scrollLeft + rect.width / 2) / state.zoom;
  const y = (els.stageWrap.scrollTop + rect.height / 2) / state.zoom;
  return {
    x: maybeSnap(clamp(x, 160, STAGE_WIDTH - 160)),
    y: maybeSnap(clamp(y, 120, STAGE_HEIGHT - 180))
  };
}

function centerInitialView() {
  requestAnimationFrame(() => {
    els.stageWrap.scrollLeft = Math.max(0, (STAGE_WIDTH * state.zoom - els.stageWrap.clientWidth) / 2);
    els.stageWrap.scrollTop = 0;
  });
}

function revealNode(node) {
  requestAnimationFrame(() => {
    const padding = 150;
    const left = (node.x - padding) * state.zoom;
    const right = (node.x + padding) * state.zoom;
    const top = (node.y - padding) * state.zoom;
    const bottom = (node.y + padding) * state.zoom;

    if (left < els.stageWrap.scrollLeft) {
      els.stageWrap.scrollLeft = Math.max(0, left);
    } else if (right > els.stageWrap.scrollLeft + els.stageWrap.clientWidth) {
      els.stageWrap.scrollLeft = right - els.stageWrap.clientWidth;
    }

    if (top < els.stageWrap.scrollTop) {
      els.stageWrap.scrollTop = Math.max(0, top);
    } else if (bottom > els.stageWrap.scrollTop + els.stageWrap.clientHeight) {
      els.stageWrap.scrollTop = bottom - els.stageWrap.clientHeight;
    }
  });
}

function clearSelection() {
  state.selectedNodes.clear();
  state.selectedRelationship = null;
}

function normalizeNodes() {
  state.nodes.forEach((node) => {
    const trait = normalizeTrait(node.trait || node.status);
    applyNodeTrait(node, trait);
    node.crossed = Boolean(node.crossed);
    node.barred = Boolean(node.barred);
  });
}

function normalizeTrait(trait) {
  const aliases = {
    diseaseRed: "red",
    diseaseBlue: "blue",
    diseaseGreen: "green",
    half: "carrier"
  };
  const normalized = aliases[trait] || trait;
  return Object.prototype.hasOwnProperty.call(TRAITS, normalized) ? normalized : "clear";
}

function applyNodeTrait(node, trait) {
  const normalizedTrait = normalizeTrait(trait);
  node.trait = normalizedTrait;
  node.status = normalizedTrait;
}

function getNodeTrait(node) {
  const trait = normalizeTrait(node.trait || node.status);
  if (node.trait !== trait || node.status !== trait) applyNodeTrait(node, trait);
  return trait;
}

function findNode(id) {
  return state.nodes.find((node) => node.id === id);
}

function computeNextId() {
  const ids = [
    ...state.nodes.map((node) => node.id),
    ...state.relationships.map((relationship) => relationship.id)
  ];
  const highest = ids.reduce((max, id) => {
    const number = Number(String(id).replace(/\D/g, ""));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  return highest + 1;
}

function sameMembers(a, b) {
  if (a.length !== b.length) return false;
  const left = [...a].sort().join("|");
  const right = [...b].sort().join("|");
  return left === right;
}

function shapeOffset(node) {
  return node.shape === "unknown" ? PERSON_RADIUS + 8 : PERSON_RADIUS + 2;
}

function clusterRows(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const rows = [];

  for (const value of sorted) {
    const current = rows[rows.length - 1];
    if (!current || Math.abs(current.average - value) > 95) {
      rows.push({ average: value, count: 1 });
      continue;
    }
    current.average = (current.average * current.count + value) / (current.count + 1);
    current.count += 1;
  }

  return rows.map((row) => snap(row.average));
}

function toRoman(number) {
  const numerals = [
    ["X", 10],
    ["IX", 9],
    ["V", 5],
    ["IV", 4],
    ["I", 1]
  ];
  let remaining = number;
  let result = "";
  for (const [symbol, value] of numerals) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result || "I";
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function maybeSnap(value) {
  return state.settings.snap ? snap(value) : value;
}

function snap(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function svg(name, attrs = {}, text = null) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    element.setAttribute(key, String(value));
  });
  if (text !== null) element.textContent = text;
  return element;
}

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function toast(message) {
  if (!message) return;
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 1400);
}
