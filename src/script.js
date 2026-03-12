const ZOOM_SPEED = 1.03;
const MAX_ZOOM = 15;
const MIN_ZOOM = 1;

const viewport = document.querySelector("#teams .viewport");
const bubblesContainer = document.querySelector("#teams .bubbles-container");
const measureBubble = document.querySelector("#teams .measure-bubble");
const stats = document.querySelector("#teams .stats");

const transform = { scale: 1, x: 0, y: 0 };
const dragOrigin = { x: 0, y: 0 };
let isDragging = false;
let dragHasMoved = false;

const DRAG_THRESHOLD = 5;
const clickOrigin = { x: 0, y: 0 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function applyTransform() {
  const maxOffsetX = viewport.clientWidth * (1 - transform.scale);
  const maxOffsetY = viewport.clientHeight * (1 - transform.scale);

  transform.x = clamp(transform.x, maxOffsetX, 0);
  transform.y = clamp(transform.y, maxOffsetY, 0);

  bubblesContainer.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
}

viewport.addEventListener("mousedown", (e) => {
  bubblesContainer.classList.remove("transition");
  e.preventDefault();

  isDragging = true;
  dragHasMoved = false;

  clickOrigin.x = e.clientX;
  clickOrigin.y = e.clientY;

  dragOrigin.x = e.clientX - transform.x;
  dragOrigin.y = e.clientY - transform.y;
});

viewport.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  const distanceMoved = Math.hypot(
    e.clientX - clickOrigin.x,
    e.clientY - clickOrigin.y,
  );

  if (distanceMoved > DRAG_THRESHOLD) {
    dragHasMoved = true;
  }

  viewport.classList.add("panning");

  transform.x = e.clientX - dragOrigin.x;
  transform.y = e.clientY - dragOrigin.y;

  applyTransform();
});

function endDrag() {
  isDragging = false;
  viewport.classList.remove("panning");
}

viewport.addEventListener("mouseup", endDrag);
viewport.addEventListener("mouseleave", endDrag);

viewport.addEventListener(
  "wheel",
  (e) => {
    bubblesContainer.classList.remove("transition");
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? ZOOM_SPEED : 1 / ZOOM_SPEED;
    const newScale = clamp(transform.scale * zoomFactor, MIN_ZOOM, MAX_ZOOM);

    const originX = (e.clientX - transform.x) / transform.scale;
    const originY = (e.clientY - transform.y) / transform.scale;

    transform.x = e.clientX - originX * newScale;
    transform.y = e.clientY - originY * newScale;
    transform.scale = newScale;

    applyTransform();
  },
  { passive: false },
);

viewport.addEventListener(
  "click",
  (e) => {
    if (dragHasMoved) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  true,
);

const teams = [
  { id: "ATL", name: "Atlanta Hawks", color: "#C1272D" },
  { id: "BOS", name: "Boston Celtics", color: "#007A33" },
  { id: "BKN", name: "Brooklyn Nets", color: "#000000" },
  { id: "CHA", name: "Charlotte Hornets", color: "#1D1160" },
  { id: "CHI", name: "Chicago Bulls", color: "#CE1141" },
  { id: "CLE", name: "Cleveland Cavaliers", color: "#860038" },
  { id: "DAL", name: "Dallas Mavericks", color: "#00538C" },
  { id: "DEN", name: "Denver Nuggets", color: "#0E2240" },
  { id: "DET", name: "Detroit Pistons", color: "#C8102E" },
  { id: "GSW", name: "Golden State Warriors", color: "#1D428A" },
  { id: "HOU", name: "Houston Rockets", color: "#CE1141" },
  { id: "IND", name: "Indiana Pacers", color: "#002D62" },
  { id: "LAC", name: "LA Clippers", color: "#C8102E" },
  { id: "LAL", name: "Los Angeles Lakers", color: "#552583" },
  { id: "MEM", name: "Memphis Grizzlies", color: "#5D76A9" },
  { id: "MIA", name: "Miami Heat", color: "#98002E" },
  { id: "MIL", name: "Milwaukee Bucks", color: "#00471B" },
  { id: "MIN", name: "Minnesota Timberwolves", color: "#0C2340" },
  { id: "NOP", name: "New Orleans Pelicans", color: "#0C2340" },
  { id: "NYK", name: "New York Knicks", color: "#006BB6" },
  { id: "OKC", name: "Oklahoma City Thunder", color: "#007AC1" },
  { id: "ORL", name: "Orlando Magic", color: "#0077C0" },
  { id: "PHI", name: "Philadelphia 76ers", color: "#006BB6" },
  { id: "PHX", name: "Phoenix Suns", color: "#1D1160" },
  { id: "POR", name: "Portland Trail Blazers", color: "#E03A3E" },
  { id: "SAC", name: "Sacramento Kings", color: "#5A2D81" },
  { id: "SAS", name: "San Antonio Spurs", color: "#C4CED4" },
  { id: "TOR", name: "Toronto Raptors", color: "#CE1141" },
  { id: "UTA", name: "Utah Jazz", color: "#002B5C" },
  { id: "WAS", name: "Washington Wizards", color: "#002B5C" },
];

const minYear = 1990;
const maxYear = 2025;

const positions = {};
for (let year = minYear; year <= maxYear; year++) {
  positions[year] = {};
  teams.forEach((team) => {
    positions[year][team.id] = {
      size: Math.random() * 0.7 + 0.2,
      targetX: Math.random(),
      targetY: Math.random(),
    };
  });
}

const sliderArea = document.querySelector("#teams .slider-area");
const slider = sliderArea.querySelector(".slider");
const step = parseFloat(slider.step);

slider.min = minYear;
slider.max = maxYear;
slider.value = maxYear;

let layoutPx = {
  width: 0,
  height: 0,
  maxBubbleSize: 0,
};

function updateLayout() {
  const containerStyles = getComputedStyle(bubblesContainer);

  layoutPx.maxBubbleSize = parseFloat(getComputedStyle(measureBubble).width);

  const padLeft = parseFloat(containerStyles.paddingLeft);
  const padRight = parseFloat(containerStyles.paddingRight);
  const padTop = parseFloat(containerStyles.paddingTop);
  const padBottom = parseFloat(containerStyles.paddingBottom);

  layoutPx.width = bubblesContainer.clientWidth - (padLeft + padRight);
  layoutPx.height = bubblesContainer.clientHeight - (padTop + padBottom);
}

function getTeamsPosition() {
  const positions = {};

  teams.forEach((team) => {
    positions[team.id] = {
      size: Math.random() * 0.7 + 0.2,
      targetX: Math.random(),
      targetY: Math.random(),
    };
  });

  return positions;
}

function collisionAvoidance(positions) {
  const placedBubbles = [];
  const realPositions = {};

  const sortedTeams = [...teams].sort((a, b) => {
    return positions[b.id].size - positions[a.id].size;
  });

  sortedTeams.forEach((team) => {
    const initialPosition = positions[team.id];
    const size = initialPosition.size;
    const radiusPx = (size * layoutPx.maxBubbleSize) / 2;

    let targetX = initialPosition.targetX * layoutPx.width;
    let targetY = initialPosition.targetY * layoutPx.height;

    let finalX = targetX;
    let finalY = targetY;

    let theta = 0;
    let found = false;
    while (!found) {
      let searchRadius = 1 * theta;
      let cx = targetX + searchRadius * Math.cos(theta);
      let cy = targetY + searchRadius * Math.sin(theta);

      let hasOverlap = false;
      for (const b of placedBubbles) {
        const dx = cx - b.x;
        const dy = cy - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < radiusPx + b.radius) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        const isInsideBounds =
          cx >= 0 && cx <= layoutPx.width && cy >= 0 && cy <= layoutPx.height;

        if (isInsideBounds || searchRadius > 3000) {
          finalX = cx;
          finalY = cy;
          found = true;
        }
      }

      if (!found) {
        theta += 0.1;
      }
    }

    placedBubbles.push({ x: finalX, y: finalY, radius: radiusPx });

    realPositions[team.id] = {
      size: size,
      x: layoutPx.width > 0 ? (finalX / layoutPx.width).toFixed(4) : 0,
      y: layoutPx.height > 0 ? (finalY / layoutPx.height).toFixed(4) : 0,
    };
  });

  return realPositions;
}

function repositionBubbles() {
  bubblesContainer.classList.add("transition");
  transform.scale = 1;
  applyTransform();
  updateLayout();
  const realPositions = collisionAvoidance(positions[slider.value]);

  teams.forEach((team) => {
    const bubble = document.getElementById(`team-${team.id}`);
    if (!bubble) return;

    bubble.style.setProperty("--x", realPositions[team.id].x);
    bubble.style.setProperty("--y", realPositions[team.id].y);
    bubble.style.setProperty("--size", realPositions[team.id].size);
  });
}

teams.forEach((team) => {
  const bubble = document.createElement("button");

  bubble.className = "bubble";
  bubble.id = `team-${team.id}`;
  bubble.title = team.name;

  bubble.style.background = team.color;
  bubble.textContent = team.id;

  bubble.addEventListener("click", (e) => {
    if (dragHasMoved) return;
    e.preventDefault();

    const rect = bubble.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    stats.style.backgroundColor = team.color;
    stats.innerHTML = `<h1>${team.name} Stats</h1><p style="margin-top: 20px; font-size: 0.8rem; cursor: pointer;">Click anywhere to close</p>`;

    stats.style.clipPath = `circle(0px at ${cx}px ${cy}px)`;
    stats.style.transition = "none";

    void stats.offsetWidth;
    stats.style.transition = "clip-path 0.8s ease-out, opacity 0.2s ease-out";
    stats.style.clipPath = `circle(150vmax at ${cx}px ${cy}px)`;
    stats.classList.add("active");
  });

  bubblesContainer.appendChild(bubble);
});

stats.addEventListener("click", (e) => {
  const statDiv = e.currentTarget;
  statDiv.classList.remove("active");
});

repositionBubbles();
window.addEventListener("resize", () => {repositionBubbles(); });
slider.addEventListener("input", () => { repositionBubbles(); });

setTimeout(() => {
  document
    .querySelectorAll(".bubble:not(.measure-bubble)")
    .forEach((b) => b.classList.add("transition"));
}, 200);

const sliderLabel = document.querySelector("#teams .slider-label");
const sliderTicks = document.querySelector("#teams .slider-ticks");

for (let year = minYear; year <= maxYear; year++) {
  if (year % 5 === 0) {
    const span = document.createElement("span");
    const pct = ((year - minYear) / (maxYear - minYear)) * 100;
    span.style.left = `${pct}%`;
    span.textContent = year;
    sliderTicks.appendChild(span);
  }
}

function updateThumbLabel() {
  sliderLabel.textContent = slider.value;

  const percent = (slider.value - slider.min) / (slider.max - slider.min);
  const trackWidth = slider.offsetWidth;
  const thumbSize = parseFloat(getComputedStyle(slider).getPropertyValue("--thumb-size"));
  const offset = percent * (trackWidth - thumbSize);

  sliderLabel.style.left = `${offset}px`;
}

const sliderObserver = new ResizeObserver(() => {
  updateThumbLabel();
});
sliderObserver.observe(slider);

slider.addEventListener("input", updateThumbLabel);

window.addEventListener("keydown", (e) => {
  if (["input", "textarea"].includes(document.activeElement.tagName.toLowerCase())) {
    return;
  }

  if (e.key === "Escape") {
    stats.classList.remove("active");
  }

  let currentValue = parseFloat(slider.value);

  if (e.key === "ArrowRight") {
    slider.value = currentValue + step;
    slider.dispatchEvent(new Event("input"));
  } else if (e.key === "ArrowLeft") {
    slider.value = currentValue - step;
    slider.dispatchEvent(new Event("input"));
  }
});

sliderArea.querySelector(".slider-controller:first-child").addEventListener("click", () => {
    slider.value = parseFloat(slider.value) - step;
    slider.dispatchEvent(new Event("input"));
});

sliderArea.querySelector(".slider-controller:last-child").addEventListener("click", () => {
    slider.value = parseFloat(slider.value) + step;
    slider.dispatchEvent(new Event("input"));
});
