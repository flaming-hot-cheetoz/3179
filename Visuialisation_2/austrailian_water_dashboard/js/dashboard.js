(function () {
  "use strict";

  const csvUrl = "../australia_water_consumption.csv";
  const chartSpecs = [
    {
      id: "chart-consumption",
      url: "charts/01-consumption-trend.json",
      title: "Australia’s water consumption",
      fields: [{ key: "year", label: "Year" }, { key: "consumption", label: "Total consumption", unit: "GL" }]
    },
    {
      id: "chart-sectors",
      url: "charts/02-sector-use.json",
      title: "Distributed water by sector",
      fields: [{ key: "year", label: "Year" }, { key: "sector", label: "Sector" }, { key: "use_GL", label: "Distributed water", unit: "GL" }]
    },
    {
      id: "chart-state-ranking",
      url: "charts/03-household-by-state.json",
      title: "Household water use by state",
      fields: [{ key: "region", label: "State or territory" }, { key: "use_kL", label: "Average household use", unit: "kL", digits: 1 }]
    },
    {
      id: "chart-heatmap",
      url: "charts/04-household-heatmap.json",
      title: "Household water use over time",
      fields: [{ key: "region", label: "State or territory" }, { key: "year", label: "Year" }, { key: "use_kL", label: "Average household use", unit: "kL", digits: 1 }]
    },
    {
      id: "chart-prices",
      url: "charts/05-water-prices.json",
      title: "Household and industry water prices",
      fields: [{ key: "year", label: "Year" }, { key: "sector", label: "Sector" }, { key: "price_per_kL", label: "Average price", unit: "$/kL", digits: 2 }]
    },
    {
      id: "chart-state-scatter",
      url: "charts/06-state-use-price.json",
      title: "Household use and price by state",
      fields: [
        { key: "region", label: "State or territory" },
        { key: "household_use_kL", label: "Average household use", unit: "kL", digits: 1 },
        { key: "household_price_per_kL", label: "Average water price", unit: "$/kL", digits: 2 }
      ]
    },
    {
      id: "chart-sector-share",
      url: "charts/07-distributed-water-share.json",
      title: "Distributed water by sector · 2023–24",
      fields: [{ key: "sector", label: "Sector" }, { key: "use_GL", label: "Distributed water", unit: "GL" }]
    },
    {
      id: "chart-choropleth",
      url: "charts/08-household-choropleth.json",
      title: "Household water use across states",
      fields: [{ key: "properties.shapeName", label: "State or territory" }, { key: "household_use_kL", label: "Average household use", unit: "kL", digits: 1 }]
    },
    {
      id: "chart-tile-map",
      url: "charts/09-agricultural-tile-map.json",
      title: "Agricultural water by state",
      fields: [{ key: "region", label: "State or territory" }, { key: "agriculture_water_GL", label: "Agricultural water consumption", unit: "GL" }]
    },
    {
      id: "chart-symbol-map",
      url: "charts/10-household-price-symbol-map.json",
      title: "Household water prices across states",
      fields: [{ key: "region", label: "State or territory" }, { key: "household_price_per_kL", label: "Average water price", unit: "$/kL", digits: 2 }]
    }
  ];
  const selectableRoles = new Set(["bar", "point", "circle", "rect mark", "arc mark", "area mark", "geoshape", "line mark"]);

  function showError(container, message) {
    const error = document.createElement("p");
    error.className = "chart-error";
    error.textContent = message;
    container.replaceChildren(error);
  }

  function formatNumber(value, digits) {
    return Number(value).toLocaleString("en-AU", {
      maximumFractionDigits: digits === undefined ? 0 : digits
    });
  }

  function getField(datum, path) {
    return path.split(".").reduce(function (value, key) {
      return value && value[key];
    }, datum);
  }

  function setSelectionDetails(chart, datum, sourceCard) {
    const title = document.getElementById("selection-title");
    const message = document.getElementById("selection-message");
    const facts = document.getElementById("selection-facts");
    const clearButton = document.getElementById("clear-selection");
    const primaryValue = getField(datum, "region") || getField(datum, "properties.shapeName") || getField(datum, "sector") || getField(datum, "year") || "Selected data";

    title.textContent = primaryValue + (getField(datum, "year") && primaryValue !== getField(datum, "year") ? " · " + getField(datum, "year") : "");
    message.textContent = chart.title + " — values from the selected mark:";
    facts.replaceChildren();
    chart.fields.forEach(function (field) {
      const value = getField(datum, field.key);
      if (value === undefined || value === null || value === "") {
        return;
      }
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = field.label;
      description.textContent = (field.digits === undefined && typeof value === "number" ? formatNumber(value) : field.digits === undefined ? String(value) : formatNumber(value, field.digits)) + (field.unit ? " " + field.unit : "");
      facts.append(term, description);
    });
    facts.hidden = false;
    clearButton.disabled = false;
    document.querySelectorAll(".chart-card.is-selection-source").forEach(function (card) {
      card.classList.remove("is-selection-source");
    });
    if (sourceCard) {
      sourceCard.classList.add("is-selection-source");
    }
    document.getElementById("selection-panel").classList.remove("selection-updated");
    requestAnimationFrame(function () {
      document.getElementById("selection-panel").classList.add("selection-updated");
    });
  }

  function addKeyboardSelection(container, chart) {
    const marks = container.querySelectorAll("svg [aria-roledescription]");
    marks.forEach(function (mark) {
      const role = mark.getAttribute("aria-roledescription");
      if (!selectableRoles.has(role)) {
        return;
      }
      mark.setAttribute("tabindex", "0");
      mark.setAttribute("role", "button");
      mark.setAttribute("aria-pressed", "false");
      if (!mark.getAttribute("aria-label")) {
        mark.setAttribute("aria-label", "Select a mark from " + chart.title);
      }
      mark.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          mark.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        }
      });
    });
  }

  function observeOnScroll() {
    const revealItems = document.querySelectorAll(".summary-card, .story-step, .selection-panel, .chart-card, .method-section");
    revealItems.forEach(function (item, index) {
      item.classList.add("reveal-on-scroll");
      item.style.setProperty("--reveal-order", index % 4);
    });

    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      revealItems.forEach(function (item) {
        item.classList.add("is-visible");
      });
      return;
    }

    const observer = new IntersectionObserver(function (entries, activeObserver) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          activeObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach(function (item) { observer.observe(item); });
  }

  function clearSelection() {
    document.getElementById("selection-title").textContent = "Click a chart mark to pin its details";
    document.getElementById("selection-message").textContent = "Select a bar, line point, heatmap cell, pie slice, state or map tile. Keyboard users can Tab to marks and press Enter or Space.";
    document.getElementById("selection-facts").replaceChildren();
    document.getElementById("selection-facts").hidden = true;
    document.getElementById("clear-selection").disabled = true;
    document.querySelectorAll(".chart-card.is-selection-source").forEach(function (card) {
      card.classList.remove("is-selection-source");
    });
    document.querySelectorAll(".chart svg [role='button'].is-selected-mark").forEach(function (mark) {
      mark.classList.remove("is-selected-mark");
      mark.setAttribute("aria-pressed", "false");
    });
  }

  function updateSummary(rows) {
    const latest = rows.filter(function (row) {
      return row.dataset === "national_timeseries" && row.year === "2023-24";
    });
    const consumption = latest.find(function (row) {
      return row.metric === "Total water consumption (industries + households)";
    });
    const rainfall = latest.find(function (row) {
      return row.metric === "Area-average rainfall";
    });
    const householdUse = latest.find(function (row) {
      return row.metric === "Average water use per household";
    });

    if (!consumption || !rainfall || !householdUse) {
      throw new Error("The CSV is missing one or more 2023–24 national summary measures.");
    }

    document.getElementById("kpi-consumption").textContent = formatNumber(consumption.value) + " GL";
    document.getElementById("kpi-rainfall").textContent = formatNumber(rainfall.value) + " mm";
    document.getElementById("kpi-households").textContent = formatNumber(householdUse.value, 1) + " kL";
  }

  async function loadCsv() {
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error("Could not load the ABS water CSV (" + response.status + ").");
    }
    return vega.read(await response.text(), { type: "csv", parse: "auto" });
  }

  async function renderChart(chart) {
    const container = document.getElementById(chart.id);
    try {
      const response = await fetch(chart.url);
      if (!response.ok) {
        throw new Error("Could not load chart specification " + chart.url + " (" + response.status + ").");
      }
      const specification = await response.json();
      const result = await vegaEmbed(container, specification, { actions: false, renderer: "svg" });
      result.view.addEventListener("click", function (event, item) {
        if (!item || !item.datum || !chart.fields.some(function (field) {
          return getField(item.datum, field.key) !== undefined;
        })) {
          return;
        }
        document.querySelectorAll(".chart svg [role='button'].is-selected-mark").forEach(function (mark) {
          mark.classList.remove("is-selected-mark");
          mark.setAttribute("aria-pressed", "false");
        });
        if (event.target instanceof Element) {
          const selectedMark = event.target.closest(".chart svg [role='button']");
          if (selectedMark) {
            selectedMark.classList.add("is-selected-mark");
            selectedMark.setAttribute("aria-pressed", "true");
          }
        }
        setSelectionDetails(chart, item.datum, container.closest(".chart-card"));
      });
      addKeyboardSelection(container, chart);
      container.classList.add("chart-loaded");
    } catch (error) {
      console.error("Unable to render " + chart.id + ":", error);
      showError(container, "This chart could not be loaded. Check the browser console for details.");
    }
  }

  async function loadDashboard() {
    const rows = await loadCsv();
    updateSummary(rows);
    await Promise.all(chartSpecs.map(renderChart));
    observeOnScroll();
  }

  document.getElementById("clear-selection").addEventListener("click", clearSelection);
  document.body.classList.add("motion-ready");
  loadDashboard().catch(function (error) {
    console.error("The water dashboard could not be loaded:", error);
    document.querySelectorAll(".chart").forEach(function (container) {
      showError(container, "Dashboard data could not be loaded. Start this page with a local web server and check the browser console for details.");
    });
    ["kpi-consumption", "kpi-rainfall", "kpi-households"].forEach(function (id) {
      document.getElementById(id).textContent = "Unavailable";
    });
    observeOnScroll();
  });
}());
