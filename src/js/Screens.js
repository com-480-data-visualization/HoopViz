export class Screens {
  constructor(options) {
    // init
    this.container = document.querySelector(options.containerSelector);
    this.minYear = options.minYear;
    this.maxYear = options.maxYear;
    this.leftBubbleMap = options.leftBubbleMap;
    this.rightBubbleMap = options.rightBubbleMap;

    // DOM elements
    this.sliderArea = this.container.querySelector(".slider-area");
    this.slider = this.sliderArea.querySelector(".slider");
    this.sliderLabel = this.sliderArea.querySelector(".slider-label");
    this.sliderTicks = this.sliderArea.querySelector(".slider-ticks");
    this.sliderPrevious = this.sliderArea.querySelector(".slider-controller:first-child");
    this.sliderNext = this.sliderArea.querySelector(".slider-controller:last-child");

    this.screenSelector = document.querySelector(options.screenSelector);
    this.screenTabs = this.screenSelector.querySelectorAll("span");
    this.screens = this.container.querySelectorAll("#screens > section");

    this.init();
  }

  async init() {
    this.setupSlider();
    this.bindMapEvents();

    await this.leftBubbleMap.ready;
    await this.rightBubbleMap.ready;

    this.updateScreens();

    // enable bubble transitions after initial layout
    // setTimeout(() => {
    //   this.container
    //     .querySelectorAll(".bubble:not(.measure-bubble)")
    //     .forEach((b) => b.classList.add("transition"));
    // }, 200);
  }

  updateScreens() {
    const year = parseFloat(this.slider.value);
    this.leftBubbleMap.updateYear(year);
    this.rightBubbleMap.updateYear(year);
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

  bindMapEvents() {
    // slider
    this.slider.addEventListener("input", () => {
      this.updateThumbLabel();
      if (this.statsItem != null) {
        this.statsUpdate(this.stats, this.seasonsLoader, this.slider.value, this.statsItem);
      }
      this.updateScreens();
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

    // tabs switch
    this.screenTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        if (tab.classList.contains("selected")) return;

        this.screenTabs.forEach(t => t.classList.remove("selected"));
        tab.classList.add("selected");

        this.screens.forEach(section => {
          if (section) section.classList.remove("selected");
        });

        const targetId = tab.dataset.targetId;
        document.getElementById(targetId).classList.add("selected");
      });
    });

    window.addEventListener("keydown", (e) => {
      if (["input", "textarea"].includes(document.activeElement.tagName.toLowerCase())) return;

      if (e.key === "Escape") {
        this.closeStats()
      }

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
