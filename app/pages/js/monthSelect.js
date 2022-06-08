const monthToStr = (monthNumber, shorthand, locale) =>
  locale.months[shorthand ? "shorthand" : "longhand"][monthNumber];
const defaultConfig = {
  shorthand: false,
  dateFormat: "F Y",
  altFormat: "F Y",
  theme: "light",
};

function getEventTarget(event) {
  try {
    if (typeof event.composedPath === "function") {
      const path = event.composedPath();
      return path[0];
    }
    return event.target;
  } catch (error) {
    return event.target;
  }
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function monthSelectPlugin(pluginConfig) {
  const config = { ...defaultConfig, ...pluginConfig };

  return (fp) => {
    fp.config.dateFormat = config.dateFormat;
    fp.config.altFormat = config.altFormat;
    const self = { monthsContainer: null };

    function clearUnnecessaryDOMElements() {
      if (!fp.rContainer) return;

      clearNode(fp.rContainer);

      for (let index = 0; index < fp.monthElements.length; index++) {
        const element = fp.monthElements[index];
        if (!element.parentNode) continue;

        element.parentNode.removeChild(element);
      }
    }

    function build() {
      if (!fp.rContainer) return;

      self.monthsContainer =
        fp._createElement("div", "flatpickr-monthSelect-months");

      self.monthsContainer.tabIndex = -1;

      buildMonths();

      fp.rContainer.appendChild(self.monthsContainer);

      fp.calendarContainer.classList.add(
        `flatpickr-monthSelect-theme-${config.theme}`
      );
    }

    function buildMonths() {
      if (!self.monthsContainer) return;

      clearNode(self.monthsContainer);

      const frag = document.createDocumentFragment();

      for (let i = 0; i < 12; i++) {
        const month = fp.createDay(
          "flatpickr-monthSelect-month",
          new Date(fp.currentYear, i),
          0,
          i
        );
        if (
          month.dateObj.getMonth() === new Date().getMonth() &&
          month.dateObj.getFullYear() === new Date().getFullYear()
        )
          month.classList.add("today");
        month.textContent = monthToStr(i, config.shorthand, fp.l10n);
        month.addEventListener("click", selectMonth);
        frag.appendChild(month);
      }

      self.monthsContainer.appendChild(frag);
      if (
        fp.config.minDate &&
        fp.currentYear === fp.config.minDate.getFullYear()
      )
        fp.prevMonthNav.classList.add("flatpickr-disabled");
      else fp.prevMonthNav.classList.remove("flatpickr-disabled");

      if (
        fp.config.maxDate &&
        fp.currentYear === fp.config.maxDate.getFullYear()
      )
        fp.nextMonthNav.classList.add("flatpickr-disabled");
      else fp.nextMonthNav.classList.remove("flatpickr-disabled");
    }

    function bindEvents() {
      fp._bind(fp.prevMonthNav, "click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        fp.changeYear(fp.currentYear - 1);
        selectYear();
        buildMonths();
      });

      fp._bind(fp.nextMonthNav, "click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        fp.changeYear(fp.currentYear + 1);
        selectYear();
        buildMonths();
      });

      fp._bind(self.monthsContainer, "mouseover", (e) => {
        if (fp.config.mode === "range")
          fp.onMouseOver(getEventTarget(e), "flatpickr-monthSelect-month");
      });
    }

    function setCurrentlySelected() {
      if (!fp.rContainer) return;
      if (!fp.selectedDates.length) return;

      const currentlySelected = fp.rContainer.querySelectorAll(
        ".flatpickr-monthSelect-month.selected"
      );

      for (let index = 0; index < currentlySelected.length; index++) {
        currentlySelected[index].classList.remove("selected");
      }

      const targetMonth = fp.selectedDates[0].getMonth();
      const month = fp.rContainer.querySelector(
        `.flatpickr-monthSelect-month:nth-child(${targetMonth + 1})`
      );

      if (month) {
        month.classList.add("selected");
      }
    }

    function selectYear() {
      let selectedDate = fp.selectedDates[0];
      if (selectedDate) {
        selectedDate = new Date(selectedDate);
        selectedDate.setFullYear(fp.currentYear);
        if (fp.config.minDate && selectedDate < fp.config.minDate) {
          selectedDate = fp.config.minDate;
        }
        if (fp.config.maxDate && selectedDate > fp.config.maxDate) {
          selectedDate = fp.config.maxDate;
        }
        fp.currentYear = selectedDate.getFullYear();
      }

      fp.currentYearElement.value = String(fp.currentYear);

      if (fp.rContainer) {
        const months = fp.rContainer.querySelectorAll(
          ".flatpickr-monthSelect-month"
        );
        months.forEach((month) => {
          month.dateObj.setFullYear(fp.currentYear);
          if (
            (fp.config.minDate && month.dateObj < fp.config.minDate) ||
            (fp.config.maxDate && month.dateObj > fp.config.maxDate)
          ) {
            month.classList.add("flatpickr-disabled");
          } else {
            month.classList.remove("flatpickr-disabled");
          }
        });
      }
      setCurrentlySelected();
    }

    function selectMonth(e) {
      e.preventDefault();
      e.stopPropagation();

      const eventTarget = getEventTarget(e);

      if (!(eventTarget instanceof Element)) return;
      if (eventTarget.classList.contains("flatpickr-disabled")) return;
      if (eventTarget.classList.contains("notAllowed")) return; // necessary??

      setMonth(eventTarget.dateObj);

      if (fp.config.closeOnSelect) {
        const single = fp.config.mode === "single";
        const range =
          fp.config.mode === "range" && fp.selectedDates.length === 2;

        if (single || range) fp.close();
      }
    }

    function setMonth(date) {
      const selectedDate = new Date(
        fp.currentYear,
        date.getMonth(),
        date.getDate()
      );
      let selectedDates = [];

      switch (fp.config.mode) {
        case "single":
          selectedDates = [selectedDate];
          break;

        case "multiple":
          selectedDates.push(selectedDate);
          break;

        case "range":
          if (fp.selectedDates.length === 2) {
            selectedDates = [selectedDate];
          } else {
            selectedDates = fp.selectedDates.concat([selectedDate]);
            selectedDates.sort((a, b) => a.getTime() - b.getTime());
          }

          break;
      }

      fp.setDate(selectedDates, true);
      setCurrentlySelected();
    }

    const shifts = {
      37: -1,
      39: 1,
      40: 3,
      38: -3,
    };

    function onKeyDown(_, __, ___, e) {
      const shouldMove = shifts[e.keyCode] !== undefined;
      if (!shouldMove && e.keyCode !== 13) {
        return;
      }

      if (!fp.rContainer || !self.monthsContainer) return;

      const currentlySelected = fp.rContainer.querySelector(
        ".flatpickr-monthSelect-month.selected"
      );

      let index = Array.prototype.indexOf.call(
        self.monthsContainer.children,
        document.activeElement
      );

      if (index === -1) {
        const target =
          currentlySelected || self.monthsContainer.firstElementChild;
        target.focus();
        index = target.$i;
      }

      if (shouldMove) {
        self.monthsContainer.children[
          (12 + index + shifts[e.keyCode]) % 12
        ].focus();
      } else if (
        e.keyCode === 13 &&
        self.monthsContainer.contains(document.activeElement)
      ) {
        setMonth(document.activeElement.dateObj);
      }
    }

    function closeHook() {
      if (fp.config?.mode === "range" && fp.selectedDates.length === 1)
        fp.clear(false);

      if (!fp.selectedDates.length) buildMonths();
    }

    // Help the prev/next year nav honor config.minDate (see 3fa5a69)
    function stubCurrentMonth() {
      config._stubbedCurrentMonth = fp._initialDate.getMonth();

      fp._initialDate.setMonth(config._stubbedCurrentMonth);
      fp.currentMonth = config._stubbedCurrentMonth;
    }

    function unstubCurrentMonth() {
      if (!config._stubbedCurrentMonth) return;

      fp._initialDate.setMonth(config._stubbedCurrentMonth);
      fp.currentMonth = config._stubbedCurrentMonth;
      delete config._stubbedCurrentMonth;
    }

    function destroyPluginInstance() {
      if (self.monthsContainer !== null) {
        const months = self.monthsContainer.querySelectorAll(
          ".flatpickr-monthSelect-month"
        );

        for (let index = 0; index < months.length; index++) {
          months[index].removeEventListener("click", selectMonth);
        }
      }
    }

    return {
      onParseConfig() {
        fp.config.enableTime = false;
      },
      onValueUpdate: setCurrentlySelected,
      onKeyDown,
      onReady: [
        stubCurrentMonth,
        clearUnnecessaryDOMElements,
        build,
        bindEvents,
        setCurrentlySelected,
        () => {
          fp.config.onClose.push(closeHook);
          fp.loadedPlugins.push("monthSelect");
        },
      ],
      onDestroy: [
        unstubCurrentMonth,
        destroyPluginInstance,
        () => {
          fp.config.onClose = fp.config.onClose.filter(
            (hook) => hook !== closeHook
          );
        },
      ],
    };
  };
}
