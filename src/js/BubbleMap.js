import * as Utils from "./utils.js";
import * as Data from "./data.js";

export class BubbleMap {
  ZOOM_SPEED = 1.03;
  MAX_ZOOM = 15;
  MIN_ZOOM = 1;
  DRAG_THRESHOLD = 5;

  constructor(options) {
    // init
    this.container = document.querySelector(options.containerSelector);
    this.seasonsLoader = options.seasonsLoader;
    this.containerIdPrefix = `${this.container.id}-`;
    this.statsUpdate = options.statsUpdate;

    // DOM elements
    this.viewport = this.container.querySelector(".viewport");
    this.bubblesContainer = this.container.querySelector(".bubbles-container");
    this.measureBubble = this.container.querySelector(".measure-bubble");
    this.stats = this.container.querySelector(".stats");
    this.statsArea = this.stats.querySelector(".stats-area");
    this.statsClose = this.statsArea.querySelector(".stats-close");
    this.overlay = this.container.querySelector(".overlay");

    this.axisX = this.container.querySelector(".axis.x");
    this.axisY = this.container.querySelector(".axis.y");
    this.axisSize = this.container.querySelector(".axis.size");
    this.selectorX = this.container.querySelector(".selector.x");
    this.selectorY = this.container.querySelector(".selector.y");
    this.selectorSize = this.container.querySelector(".selector.size");
    this.selectors = [this.selectorX, this.selectorY, this.selectorSize];
    this.axisSelectors = [[this.axisX, this.selectorX], [this.axisY, this.selectorY], [this.axisSize, this.selectorSize]];

    // state
    this.transform = { scale: 1, x: 0, y: 0 };
    this.dragOrigin = { x: 0, y: 0 };
    this.clickOrigin = { x: 0, y: 0 };
    this.layoutPx = { width: 0, height: 0, maxBubbleSize: 0 };
    this.isDragging = false;
    this.dragHasMoved = false;

    this.attributes = options.attributes;
    const initialAttributes = Utils.getRandomThree(this.attributes);
    this.attributeX = initialAttributes[0];
    this.attributeY = initialAttributes[1];
    this.attributeSize = initialAttributes[2];

    this.statsItem = null;
    this.currentYear = null;

    this.ready = this.init();
  }

  async init() {
    await this.seasonsLoader.load();

    this.bindMapEvents();
    this.updateSelectors();
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

  updateYear(year) {
    if (year === this.currentYear) return;

    this.currentYear = year;
    this.updateBubbles();
  }

  updateBubbles() {
    this.bubblesContainer.classList.add("transition");
    this.transform.scale = 1;
    this.updateLayout();

    let data = Data.filter_error_values(this.seasonsLoader.getData(this.currentYear,
      this.attributeX[1], this.attributeY[1], this.attributeSize[1]));
    // rank filter
    // data = Data.applyData(
    //   data,
    //   [
    //     null,
    //     null,
    //     [
    //       (values) => [...values].sort((a, b) => b - a),
    //       (sortedValues, value) => [sortedValues.indexOf(value), value]
    //     ],
    //   ],
    //   (newValues) => newValues[0] < 10
    // );
    data = Data.applyData(
      data, [
      Data.min_max_norm_shaper,
      Data.min_max_norm_shaper,
      Data.min_max_norm_shaper,
    ], null);

    const items = [...data.keys()];
    // console.log(JSON.stringify(Object.fromEntries(data)));

    this.createBubbles(items);

    const positions = {}
    data.forEach((values, itemId) => {
      positions[itemId] = {
        targetX: values[0],
        targetY: values[1],
        size: values[2] * 0.7 + 0.2,
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

      bubble.addEventListener("click", (e) => {
        if (this.dragHasMoved) return;
        e.preventDefault();

        this.statsItem = item;
        this.statsUpdate(this.stats, this.seasonsLoader, this.currentYear, item);

        this.stats.classList.add("active");
      });

      this.bubblesContainer.appendChild(bubble);
    });
  }

  updateSelectors() {
    const selectorAttributes = [
      [this.selectorX, this.attributeX, (v) => this.attributeX = v],
      [this.selectorY, this.attributeY, (v) => this.attributeY = v],
      [this.selectorSize, this.attributeSize, (v) => this.attributeSize = v],
    ];

    selectorAttributes.forEach(([selector, attribute, setter]) => {
      selector.innerHTML = "";
      this.attributes.forEach((a) => {
        const span = document.createElement("span");
        span.innerText = a[0];
        if (attribute[0] === a[0]) {
          span.classList.add("selected");
          span.addEventListener("click", (_) => {
            this.selectors.forEach((sel) => sel.classList.remove("active"));
          });
        } else {
          span.addEventListener("click", (_) => {
            this.selectors.forEach((sel) => sel.classList.remove("active"));
            setter(a);

            // if selected one that was already selected by another axis, pick a random one for the other axis
            selectorAttributes.forEach(([_, attribute, setter]) => {
              if (attribute[0] === a[0]) {
                const currentlyActive = [this.attributeX[0], this.attributeY[0], this.attributeSize[0]];
                const unselected = this.attributes.filter(attr => !currentlyActive.includes(attr[0]));
                const randomNewAttr = unselected[Math.floor(Math.random() * unselected.length)];
                setter(randomNewAttr);
              }
            });

            this.updateSelectors();
            this.updateBubbles();
          });
        }
        selector.appendChild(span);
      });
    });

    const axisAttributes = [[this.axisX, this.attributeX], [this.axisY, this.attributeY], [this.axisSize, this.attributeSize]];
    axisAttributes.forEach(([axis, attribute]) => {
      axis.querySelector("span").innerText = attribute[0];
    });
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

      const rect = this.viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? this.ZOOM_SPEED : 1 / this.ZOOM_SPEED;
      const newScale = Utils.clamp(this.transform.scale * zoomFactor, this.MIN_ZOOM, this.MAX_ZOOM);

      const originX = (mouseX - this.transform.x) / this.transform.scale;
      const originY = (mouseY - this.transform.y) / this.transform.scale;

      this.transform.x = mouseX - originX * newScale;
      this.transform.y = mouseY - originY * newScale;
      this.transform.scale = newScale;

      this.applyTransform();
    }, { passive: false });

    // avoid opening bubble when dragging
    this.viewport.addEventListener("click", (e) => {
      this.selectors.forEach((sel) => sel.classList.remove("active"));

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

    // selectors
    this.axisSelectors.forEach(([axis, selector]) => axis.addEventListener("click", (_) => {
      const wasActive = selector.classList.contains("active");
      this.selectors.forEach((sel) => sel.classList.remove("active"));
      if (!wasActive) {
        selector.classList.add("active");
      }
    }));

    // window listeners
    window.addEventListener("resize", () => {
      if (this.currentYear != null) {
        this.updateBubbles();
      }
    });
  }
}
