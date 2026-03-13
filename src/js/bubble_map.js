import * as Utils from "./utils.js";

export class BubbleMap {
  ZOOM_SPEED = 1.03;
  MAX_ZOOM = 15;
  MIN_ZOOM = 1;
  DRAG_THRESHOLD = 5;

  constructor(options) {
    // init
    this.container = document.querySelector(options.containerSelector);
    this.items = options.items;
    this.positions = options.positions;

    const years = Object.keys(this.positions).map(Number);
    this.minYear = Math.min(...years);
    this.maxYear = Math.max(...years);

    // DOM elements
    this.viewport = this.container.querySelector(".viewport");
    this.bubblesContainer = this.container.querySelector(".bubbles-container");
    this.measureBubble = this.container.querySelector(".measure-bubble");
    this.stats = this.container.querySelector(".stats");
    this.sliderArea = this.container.querySelector(".slider-area");
    this.slider = this.sliderArea.querySelector(".slider");
    this.sliderLabel = this.container.querySelector(".slider-label");
    this.sliderTicks = this.container.querySelector(".slider-ticks");
    this.sliderPrevious = this.sliderArea.querySelector(".slider-controller:first-child");
    this.sliderNext = this.sliderArea.querySelector(".slider-controller:last-child");

    // state
    this.transform = { scale: 1, x: 0, y: 0 };
    this.dragOrigin = { x: 0, y: 0 };
    this.clickOrigin = { x: 0, y: 0 };
    this.layoutPx = { width: 0, height: 0, maxBubbleSize: 0 };
    this.isDragging = false;
    this.dragHasMoved = false;

    this.init();
  }

  init() {
    this.setupSlider();
    this.createBubbles();
    this.bindEvents();
    this.repositionBubbles();

    // enable bubble transitions after initial layout
    setTimeout(() => {
      this.container
        .querySelectorAll(".bubble:not(.measure-bubble)")
        .forEach((b) => b.classList.add("transition"));
    }, 200);
  }

  updateLayout() {
    const containerStyles = getComputedStyle(this.bubblesContainer);
    this.layoutPx.maxBubbleSize = parseFloat(getComputedStyle(this.measureBubble).width);

    const padLeft = parseFloat(containerStyles.paddingLeft);
    const padRight = parseFloat(containerStyles.paddingRight);
    const padTop = parseFloat(containerStyles.paddingTop);
    const padBottom = parseFloat(containerStyles.paddingBottom);

    this.layoutPx.width = this.bubblesContainer.clientWidth - (padLeft + padRight);
    this.layoutPx.height = this.bubblesContainer.clientHeight - (padTop + padBottom);
  }

  applyTransform() {
    const maxOffsetX = this.viewport.clientWidth * (1 - this.transform.scale);
    const maxOffsetY = this.viewport.clientHeight * (1 - this.transform.scale);

    this.transform.x = Utils.clamp(this.transform.x, maxOffsetX, 0);
    this.transform.y = Utils.clamp(this.transform.y, maxOffsetY, 0);

    this.bubblesContainer.style.transform = `translate(${this.transform.x}px, ${this.transform.y}px) scale(${this.transform.scale})`;
  }

  collisionAvoidance(positions) {
    const placedBubbles = [];
    const realPositions = {};

    const sortedItems = [...this.items].sort((a, b) => {
      return positions[b.id].size - positions[a.id].size;
    });

    sortedItems.forEach((item) => {
      const initialPosition = positions[item.id];
      const size = initialPosition.size;
      const radiusPx = (size * this.layoutPx.maxBubbleSize) / 2;

      let targetX = initialPosition.targetX * this.layoutPx.width;
      let targetY = initialPosition.targetY * this.layoutPx.height;

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
          const isInsideBounds = cx >= 0 && cx <= this.layoutPx.width && cy >= 0 && cy <= this.layoutPx.height;

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

      realPositions[item.id] = {
        size: size,
        x: this.layoutPx.width > 0 ? (finalX / this.layoutPx.width).toFixed(4) : 0,
        y: this.layoutPx.height > 0 ? (finalY / this.layoutPx.height).toFixed(4) : 0,
      };
    });

    return realPositions;
  }

  repositionBubbles() {
    this.bubblesContainer.classList.add("transition");
    this.transform.scale = 1;

    this.applyTransform();
    this.updateLayout();

    const realPositions = this.collisionAvoidance(this.positions[this.slider.value]);

    this.items.forEach((item) => {
      const bubble = document.getElementById(`${this.container.id}-${item.id}`);
      if (!bubble) return;

      bubble.style.setProperty("--x", realPositions[item.id].x);
      bubble.style.setProperty("--y", realPositions[item.id].y);
      bubble.style.setProperty("--size", realPositions[item.id].size);
    });
  }

  createBubbles() {
    this.items.forEach((item) => {
      const bubble = document.createElement("button");
      bubble.className = "bubble";
      bubble.id = `${this.container.id}-${item.id}`;
      bubble.title = item.name;
      bubble.style.background = item.color;
      bubble.textContent = item.id;

      bubble.addEventListener("click", (e) => {
        if (this.dragHasMoved) return;
        e.preventDefault();

        const rect = bubble.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        this.stats.style.backgroundColor = item.color;
        this.stats.innerHTML = `<h1>${item.name} Stats</h1><p style="margin-top: 20px; font-size: 0.8rem; cursor: pointer;">Click anywhere to close</p>`;

        this.stats.style.clipPath = `circle(0px at ${cx}px ${cy}px)`;
        this.stats.style.transition = "none";

        void this.stats.offsetWidth;
        this.stats.style.transition = "clip-path 0.8s ease-out, opacity 0.2s ease-out";
        this.stats.style.clipPath = `circle(150vmax at ${cx}px ${cy}px)`;
        this.stats.classList.add("active");
      });

      this.bubblesContainer.appendChild(bubble);
    });
  }

  setupSlider() {
    this.slider.min = this.minYear;
    this.slider.max = this.maxYear;
    this.slider.value = this.maxYear;

    for (let year = this.minYear; year <= this.maxYear; year++) {
      if (year % 5 === 0) {
        const span = document.createElement("span");
        const percent = ((year - this.minYear) / (this.maxYear - this.minYear)) * 100;
        span.style.left = `${percent}%`;
        span.textContent = year;
        this.sliderTicks.appendChild(span);
      }
    }

    this.updateThumbLabel();
  }

  updateThumbLabel() {
    this.sliderLabel.textContent = this.slider.value;
    const percent = (this.slider.value - this.slider.min) / (this.slider.max - this.slider.min);
    const trackWidth = this.slider.offsetWidth;
    const thumbSize = parseFloat(getComputedStyle(this.slider).getPropertyValue("--thumb-size"));
    const offset = percent * (trackWidth - thumbSize);

    this.sliderLabel.style.left = `${offset}px`;
  }

  bindEvents() {
    this.viewport.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.bubblesContainer.classList.remove("transition");

      this.isDragging = true;
      this.dragHasMoved = false;

      this.clickOrigin.x = e.clientX;
      this.clickOrigin.y = e.clientY;

      this.dragOrigin.x = e.clientX - this.transform.x;
      this.dragOrigin.y = e.clientY - this.transform.y;
    });

    this.viewport.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;

      const distanceMoved = Math.hypot(e.clientX - this.clickOrigin.x, e.clientY - this.clickOrigin.y);
      if (distanceMoved > this.DRAG_THRESHOLD) {
        this.dragHasMoved = true;
      }

      this.viewport.classList.add("panning");
      this.transform.x = e.clientX - this.dragOrigin.x;
      this.transform.y = e.clientY - this.dragOrigin.y;
      this.applyTransform();
    });

    const endDrag = () => {
      this.isDragging = false;
      this.viewport.classList.remove("panning");
    };

    this.viewport.addEventListener("mouseup", endDrag);
    this.viewport.addEventListener("mouseleave", endDrag);

    this.viewport.addEventListener("wheel", (e) => {
      this.bubblesContainer.classList.remove("transition");
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? this.ZOOM_SPEED : 1 / this.ZOOM_SPEED;
      const newScale = Utils.clamp(this.transform.scale * zoomFactor, this.MIN_ZOOM, this.MAX_ZOOM);

      const originX = (e.clientX - this.transform.x) / this.transform.scale;
      const originY = (e.clientY - this.transform.y) / this.transform.scale;

      this.transform.x = e.clientX - originX * newScale;
      this.transform.y = e.clientY - originY * newScale;
      this.transform.scale = newScale;

      this.applyTransform();
    }, { passive: false });

    // avoid opening bubble when dragging
    this.viewport.addEventListener("click", (e) => {
      if (this.dragHasMoved) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);

    // close stats
    this.stats.addEventListener("click", (e) => {
      e.currentTarget.classList.remove("active");
    });

    // slider
    this.slider.addEventListener("input", () => {
      this.updateThumbLabel();
      this.repositionBubbles();
    });

    const step = parseFloat(this.slider.step);

    this.sliderPrevious.addEventListener("click", () => {
      this.slider.value = parseFloat(this.slider.value) - step;
      this.slider.dispatchEvent(new Event("input"));
    });
    this.sliderNext.addEventListener("click", () => {
      this.slider.value = parseFloat(this.slider.value) + step;
      this.slider.dispatchEvent(new Event("input"));
    });

    const sliderObserver = new ResizeObserver(() => this.updateThumbLabel());
    sliderObserver.observe(this.slider);

    // window listeners
    window.addEventListener("resize", () => this.repositionBubbles());

    window.addEventListener("keydown", (e) => {
      if (["input", "textarea"].includes(document.activeElement.tagName.toLowerCase())) return;

      if (e.key === "Escape") {
        this.stats.classList.remove("active");
      }

      // TODO: will update all instances, need logic to check which section is currently in the viewport
      let currentValue = parseFloat(this.slider.value);
      if (e.key === "ArrowRight") {
        this.slider.value = currentValue + step;
        this.slider.dispatchEvent(new Event("input"));
      } else if (e.key === "ArrowLeft") {
        this.slider.value = currentValue - step;
        this.slider.dispatchEvent(new Event("input"));
      }
    });
  }
}
