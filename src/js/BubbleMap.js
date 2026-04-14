import * as Utils from "./utils.js";

export class BubbleMap {
  ZOOM_SPEED = 1.03;
  MAX_ZOOM = 15;
  MIN_ZOOM = 1;
  DRAG_THRESHOLD = 5;

  constructor(options) {
    // init
    this.container = document.querySelector(options.containerSelector);
    this.dataLoader = options.dataLoader;
    this.containerIdPrefix = `${this.container.id}-`;
    this.statsUpdate = options.statsUpdate;

    // DOM elements
    this.viewport = this.container.querySelector(".viewport");
    this.bubblesContainer = this.container.querySelector(".bubbles-container");
    this.measureBubble = this.container.querySelector(".measure-bubble");
    this.stats = this.container.querySelector(".stats");
    this.statsArea = this.stats.querySelector(".stats-area");
    this.statsClose = this.statsArea.querySelector(".stats-close");
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

    this.attributeSize = ["threePointersPercentage_norm", parseFloat];
    this.attributeX = ["win_norm", parseFloat];
    this.attributeY = ["blocks_norm", parseFloat];

    this.statsItem = null;

    this.init();
  }

  async init() {
    await this.dataLoader.load();

    const years = this.dataLoader.getYears();
    this.minYear = Math.min(...years);
    this.maxYear = Math.max(...years);

    this.bindMapEvents();
    this.setupSlider();

    this.updateBubbles();

    // enable bubble transitions after initial layout
    // setTimeout(() => {
    //   this.container
    //     .querySelectorAll(".bubble:not(.measure-bubble)")
    //     .forEach((b) => b.classList.add("transition"));
    // }, 200);
  }

  updateLayout() {
    this.applyTransform();

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

    const sortedItems = [...Object.keys(positions)].sort((a, b) => {
      return positions[b].size - positions[a].size;
    });

    sortedItems.forEach((item) => {
      const initialPosition = positions[item];
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

      realPositions[item] = {
        size: size,
        x: this.layoutPx.width > 0 ? (finalX / this.layoutPx.width).toFixed(4) : 0,
        y: this.layoutPx.height > 0 ? (finalY / this.layoutPx.height).toFixed(4) : 0,
      };
    });

    return realPositions;
  }

  updateBubbles() {
    this.transform.scale = 1;
    this.updateLayout();

    const data = this.dataLoader.getData(parseFloat(this.slider.value), this.attributeSize, this.attributeX, this.attributeY);
    const items = [...data.keys()];
    console.log(JSON.stringify(Object.fromEntries(data)));

    this.bubblesContainer.classList.add("transition");

    this.createBubbles(items);

    const positions = {}
    data.forEach((values, itemId) => {
      positions[itemId] = {
        size: values[0] * 0.7 + 0.2,
        targetX: values[1],
        targetY: values[2],
      };
    });

    const realPositions = this.collisionAvoidance(positions);

    items.forEach((item) => {
      const bubble = document.getElementById(`${this.containerIdPrefix}${item}`);
      if (!bubble) return;

      bubble.style.setProperty("--x", realPositions[item].x);
      bubble.style.setProperty("--y", realPositions[item].y);
      bubble.style.setProperty("--size", realPositions[item].size);
    });

    // bring (back) new bubbles to life
    void this.bubblesContainer.offsetWidth;
    items.forEach((item) => {
      const bubble = document.getElementById(`${this.containerIdPrefix}${item}`);
      if (!bubble) return;

      bubble.classList.add("transition");
      bubble.style.setProperty("--visible", 1);
    });
  }

  createBubbles(items) {
    const itemsSet = new Set(items);

    const existingBubbles = this.bubblesContainer.querySelectorAll(".bubble:not(.measure-bubble)");

    // hide or delete old bubbles
    existingBubbles.forEach(bubble => {
      const itemId = bubble.id.replace(this.containerIdPrefix, "");

      if (itemsSet.has(itemId)) {
        itemsSet.delete(itemId);
        if (bubble.style.getPropertyValue("--visible") === "0") {
          // disable transitioning from past position for ghost bubbles
          bubble.classList.remove("transition");
        }
      } else {
        if (bubble.style.getPropertyValue("--visible") === "0") {
          // already hidden, can be deleted
          bubble.remove();
        } else {
          // was visible, just hide it
          bubble.style.setProperty("--visible", 0);
        }
      }
    });

    // create the new bubbles
    itemsSet.forEach((item) => {
      const bubble = document.createElement("button");
      bubble.className = "bubble";
      bubble.classList.add("transition");
      bubble.id = `${this.containerIdPrefix}${item}`;

      // TODO get metadata
      bubble.textContent = item;
      bubble.title = item;
      bubble.textContent = item;
      bubble.style.background = "#005ce6";

      // TODO bubble open stats screen
      bubble.addEventListener("click", (e) => {
        if (this.dragHasMoved) return;
        e.preventDefault();

        this.statsItem = item;
        this.statsUpdate(this.stats, this.dataLoader, this.slider.value, item);

        this.stats.classList.add("active");
        // const rect = bubble.getBoundingClientRect();
        // const cx = rect.left + rect.width / 2;
        // const cy = rect.top + rect.height / 2;

        // this.stats.style.backgroundColor = item.color;
        // this.stats.innerHTML = `<h1>${item.name} Stats</h1><p style="margin-top: 20px; font-size: 0.8rem; cursor: pointer;">Click anywhere to close</p>`;

        // this.stats.style.clipPath = `circle(0px at ${cx}px ${cy}px)`;
        // this.stats.style.transition = "none";

        // void this.stats.offsetWidth;
        // this.stats.style.transition = "clip-path 0.8s ease-out, opacity 0.2s ease-out";
        // this.stats.style.clipPath = `circle(150vmax at ${cx}px ${cy}px)`;
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

  closeStats() {
    this.stats.classList.remove("active");
    this.statsItem = null;
  }

  bindMapEvents() {
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
    this.statsClose.addEventListener("click", (_) => {
      this.closeStats()
    });
    this.stats.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        this.closeStats()
      }
    });
    this.statsArea.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // slider
    this.slider.addEventListener("input", () => {
      this.updateThumbLabel();
      if (this.statsItem != null) {
        this.statsUpdate(this.stats, this.dataLoader, this.slider.value, this.statsItem);
      }
      this.updateBubbles();
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
    window.addEventListener("resize", () => this.updateBubbles());

    window.addEventListener("keydown", (e) => {
      if (["input", "textarea"].includes(document.activeElement.tagName.toLowerCase())) return;

      if (e.key === "Escape") {
        this.closeStats()
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
