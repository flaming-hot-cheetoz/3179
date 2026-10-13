(function () {
  "use strict";

  const csvUrl = "../australia_water_consumption.csv";
  const chartSpecs = [
    { id: "chart-consumption", url: "charts/01-consumption-trend.json" },
    { id: "chart-sectors", url: "charts/02-sector-use.json" },
    { id: "chart-state-ranking", url: "charts/03-household-by-state.json" },
    { id: "chart-heatmap", url: "charts/04-household-heatmap.json" },
    { id: "chart-prices", url: "charts/05-water-prices.json" },
    { id: "chart-state-scatter", url: "charts/06-state-use-price.json" },
    { id: "chart-sector-share", url: "charts/07-distributed-water-share.json" },
    { id: "chart-choropleth", url: "charts/08-household-choropleth.json" },
    { id: "chart-symbol-map", url: "charts/09-household-price-symbol-map.json" },
    { id: "chart-tile-map", url: "charts/10-agricultural-tile-map.json" }
  ];

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
      await vegaEmbed(container, specification, { actions: false, renderer: "svg" });
    } catch (error) {
      console.error("Unable to render " + chart.id + ":", error);
      showError(container, "This chart could not be loaded. Check the browser console for details.");
    }
  }

  async function loadDashboard() {
    const rows = await loadCsv();
    updateSummary(rows);
    await Promise.all(chartSpecs.map(renderChart));
  }

  loadDashboard().catch(function (error) {
    console.error("The water dashboard could not be loaded:", error);
    document.querySelectorAll(".chart").forEach(function (container) {
      showError(container, "Dashboard data could not be loaded. Start this page with a local web server and check the browser console for details.");
    });
    ["kpi-consumption", "kpi-rainfall", "kpi-households"].forEach(function (id) {
      document.getElementById(id).textContent = "Unavailable";
    });
  });
}());
