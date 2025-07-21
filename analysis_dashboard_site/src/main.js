import './style.css';
import Chart from 'chart.js/auto';

async function fetchData() {
  const response = await fetch('/data/rent-prices.json');
  return await response.json();
}

function getUniqueProvinces(data) {
  return [...new Set(data.map(d => d.Province))].sort();
}

function translateQuarter(quarter) {
  return quarter
    .replace('Q1', 'T1')
    .replace('Q2', 'T2')
    .replace('Q3', 'T3')
    .replace('Q4', 'T4');
}

const frenchGeographyNames = {
  "Victoria, Census metropolitan area (CMA)": "Victoria, région métropolitaine de recensement (RMR)",
  "Vancouver, Census metropolitan area (CMA)": "Vancouver, région métropolitaine de recensement (RMR)",
  "Nanaimo, Census metropolitan area (CMA)": "Nanaimo, région métropolitaine de recensement (RMR)",
  "Kelowna, Census metropolitan area (CMA)": "Kelowna, région métropolitaine de recensement (RMR)",
  "Kamloops, Census metropolitan area (CMA)": "Kamloops, région métropolitaine de recensement (RMR)",
  "Chilliwack, Census metropolitan area (CMA)": "Chilliwack, région métropolitaine de recensement (RMR)",
  "Abbotsford - Mission, Census metropolitan area (CMA)": "Abbotsford - Mission, région métropolitaine de recensement (RMR)",
  "Red Deer, Census metropolitan area (CMA)": "Red Deer, région métropolitaine de recensement (RMR)",
  "Lethbridge, Census metropolitan area (CMA)": "Lethbridge, région métropolitaine de recensement (RMR)",
  "Calgary, Census metropolitan area (CMA)": "Calgary, région métropolitaine de recensement (RMR)",
  "Saskatoon, Census metropolitan area (CMA)": "Saskatoon, région métropolitaine de recensement (RMR)",
  "Regina, Census metropolitan area (CMA)": "Regina, région métropolitaine de recensement (RMR)",
  "Winnipeg, Census metropolitan area (CMA)": "Winnipeg, région métropolitaine de recensement (RMR)",
  "Windsor, Census metropolitan area (CMA)": "Windsor, région métropolitaine de recensement (RMR)",
  "Toronto, Census metropolitan area (CMA)": "Toronto, région métropolitaine de recensement (RMR)",
  "Thunder Bay, Census metropolitan area (CMA)": "Thunder Bay, région métropolitaine de recensement (RMR)",
  "St. Catharines - Niagara, Census metropolitan area (CMA)": "St. Catharines - Niagara, région métropolitaine de recensement (RMR)",
  "Peterborough, Census metropolitan area (CMA)": "Peterborough, région métropolitaine de recensement (RMR)",
  "Ottawa - Gatineau (Ontario part), Census metropolitan area (CMA)": "Ottawa - Gatineau (partie ontarienne), région métropolitaine de recensement (RMR)",
  "Oshawa, Census metropolitan area (CMA)": "Oshawa, région métropolitaine de recensement (RMR)",
  "London, Census metropolitan area (CMA)": "London, région métropolitaine de recensement (RMR)",
  "Kitchener - Cambridge - Waterloo, Census metropolitan area (CMA)": "Kitchener - Cambridge - Waterloo, région métropolitaine de recensement (RMR)",
  "Kingston, Census metropolitan area (CMA)": "Kingston, région métropolitaine de recensement (RMR)",
  "Hamilton, Census metropolitan area (CMA)": "Hamilton, région métropolitaine de recensement (RMR)",
  "Guelph, Census metropolitan area (CMA)": "Guelph, région métropolitaine de recensement (RMR)",
  "Greater Sudbury, Census metropolitan area (CMA)": "Grand Sudbury, région métropolitaine de recensement (RMR)",
  "Brantford, Census metropolitan area (CMA)": "Brantford, région métropolitaine de recensement (RMR)",
  "Belleville - Quinte West, Census metropolitan area (CMA)": "Belleville - Quinte West, région métropolitaine de recensement (RMR)",
  "Barrie, Census metropolitan area (CMA)": "Barrie, région métropolitaine de recensement (RMR)",
  "Trois-Rivières, Census metropolitan area (CMA)": "Trois-Rivières, région métropolitaine de recensement (RMR)",
  "Sherbrooke, Census metropolitan area (CMA)": "Sherbrooke, région métropolitaine de recensement (RMR)",
  "Saguenay, Census metropolitan area (CMA)": "Saguenay, région métropolitaine de recensement (RMR)",
  "Québec, Census metropolitan area (CMA)": "Québec, région métropolitaine de recensement (RMR)",
  "Ottawa - Gatineau (Quebec part), Census metropolitan area (CMA)": "Ottawa - Gatineau (partie québécoise), région métropolitaine de recensement (RMR)",
  "Montréal, Census metropolitan area (CMA)": "Montréal, région métropolitaine de recensement (RMR)",
  "Drummondville, Census metropolitan area (CMA)": "Drummondville, région métropolitaine de recensement (RMR)",
  "Saint John, Census metropolitan area (CMA)": "Saint John, région métropolitaine de recensement (RMR)",
  "Moncton, Census metropolitan area (CMA)": "Moncton, région métropolitaine de recensement (RMR)",
  "Fredericton, Census metropolitan area (CMA)": "Fredericton, région métropolitaine de recensement (RMR)",
  "Halifax, Census metropolitan area (CMA)": "Halifax, région métropolitaine de recensement (RMR)",
  "St. John's, Census metropolitan area (CMA)": "St. John's, région métropolitaine de recensement (RMR)"
};


function hasEmptyBarData(filteredData, quarter) {
  const areas = [...new Set(filteredData.map(d => d.Geography))];
  const types = ["Apartment - 1 bedroom", "Apartment - 2 bedrooms", "Room"];

  return areas.some(area => 
    types.some(type => {
      const record = filteredData.find(d => d.Geography === area && d["Rental unit type"] === type);

      if (!record) return true; // <-- treat missing record as empty data
      
      const val = record[quarter];
      return val === '..' || val?.trim() === '' || val?.trim() === '..';
    })
  );
}


function hasEstimatedBarData(filteredData, quarter) {
  const areas = [...new Set(filteredData.map(d => d.Geography))];
  const types = ["Apartment - 1 bedroom", "Apartment - 2 bedrooms", "Room"];

  return areas.some(area =>
    types.some(type => {
      const record = filteredData.find(d => d.Geography === area && d["Rental unit type"] === type);
      if (!record) return false;
      const val = record[quarter];
      return val?.includes('E');
    })
  );
}


function getUniqueValues(data, key) {
  return [...new Set(data.map(item => item[key]))].sort();
}

function extractTimeSeriesKeys(data) {
  return Object.keys(data[0]).filter(k => /^Q\d \d{4}$/.test(k));
}

function filterAndTransform(data, area, unitType, timeKeys) {
  const match = data.find(
    d => d["Geography"] === area && d["Rental unit type"] === unitType
  );

  if (!match) return { points: [], labels: [] };

  const points = timeKeys.map(k => {
    const raw = match[k]?.trim();
    if (!raw || raw === '..') {
      return { x: k, y: null, label: translateQuarter(k), estimated: false };
    }

    const estimated = raw.includes('E');
    const numeric = parseFloat(raw.replace(/[^0-9.]/g, ''));

    return {
      x: k,                      
      y: isNaN(numeric) ? null : numeric,
      label: translateQuarter(k), 
      estimated,
    };
  });

  return {
    points,
    labels: timeKeys 
  };
}


function renderGraph(ctx, points, labels) {
  if (window.myChart) window.myChart.destroy();

  const hasEstimated = points.some(p => p.estimated);

  window.myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels, // Use raw labels like "Q1 2021"
      datasets: [{
        label: 'Prix du Loyer ($)',
        data: points, // Each point has { x: 'Q1 2021', y: value }
        parsing: false, // Important to handle {x, y}
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        spanGaps: true,
        tension: 0.2,
        segment: {
          borderDash: ctx => {
            const idx = ctx.p0DataIndex;
            return points[idx]?.estimated ? [6, 6] : [];
          },
          borderColor: ctx => {
            const idx = ctx.p0DataIndex;
            return points[idx]?.estimated ? 'orange' : 'rgb(75, 192, 192)';
          }
        },
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          usePointStyle: false,
          callbacks: {
            label: ctx => {
              const pt = points[ctx.dataIndex];
              if (pt.y === null) return 'Données non disponibles';
              let label = `${pt.label}: $${pt.y.toFixed(0)}`;
              if (pt.estimated) label += ' (estimé)';
              return label;
            }
          }
        },
        legend: {
          position: 'bottom',
          labels: {
            generateLabels: chart => {
              const baseLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
              if (hasEstimated) {
                baseLabels.push({
                  text: 'Données estimées (à utiliser avec prudence ⚠️)',
                  fillStyle: 'transparent',
                  strokeStyle: 'orange',
                  lineWidth: 3,
                  lineDash: [4, 4],
                  pointStyle: 'rect',
                });
              }
              return baseLabels;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          title: { display: true, text: 'Loyer moyen demandé ($)' }
        },
        x: {
          title: { display: true, text: 'Période de référence (trimestre)' },
          ticks: {
            callback: (val, index) => translateQuarter(labels[index])
          }
        }
      }
    },
    plugins: [
      {
        id: 'customTooltipMarker',
        afterDraw: chart => {
          const tooltip = chart.tooltip;
          if (!tooltip || !tooltip._active || tooltip._active.length === 0) return;

          const ctx = chart.ctx;
          const activePoint = tooltip._active[0];
          const datasetIndex = activePoint.datasetIndex;
          const dataIndex = activePoint.index;
          const dataset = chart.data.datasets[datasetIndex];
          const dataPoint = dataset.data[dataIndex];

          if (!dataPoint) return;

          const x = activePoint.element.x;
          const y = activePoint.element.y;

          if (dataPoint.estimated) {
            const size = 12;
            ctx.save();
            ctx.setLineDash([6, 6]);
            ctx.strokeStyle = 'orange';
            ctx.lineWidth = 3;
            ctx.strokeRect(x - size / 2, y - size / 2, size, size);
            ctx.restore();
          } else {
            const size = 10;
            ctx.save();
            ctx.fillStyle = 'rgb(75, 192, 192)';
            ctx.fillRect(x - size / 2, y - size / 2, size, size);
            ctx.restore();
          }
        }
      },
      {
        id: 'clearTooltipPoint',
        beforeDraw(chart) {
          const tooltip = chart.tooltip;
          if (tooltip && tooltip.getActiveElements().length) {
            const ctx = chart.ctx;
            const active = tooltip.getActiveElements()[0];
            const x = active.element.x;
            const y = active.element.y;
            const r = active.element.options.radius || 5;
            ctx.clearRect(x - r - 1, y - r - 1, 2 * r + 2, 2 * r + 2);
          }
        }
      },
      {
        id: 'customLegendDottedLine',
        afterDraw: chart => {
          const legend = chart.legend;
          if (!legend) return;

          legend.legendItems.forEach((item, index) => {
            if (item.datasetIndex === -1) {
              const ctx = chart.ctx;
              const box = legend.legendHitBoxes[index];
              const x = box.left + 10;
              const y = box.top + box.height / 2;

              ctx.save();
              ctx.strokeStyle = 'orange';
              ctx.lineWidth = 2;
              ctx.setLineDash([6, 6]);
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + 20, y);
              ctx.stroke();
              ctx.restore();
            }
          });
        }
      }
    ]
  });
}


let barChartInstance = null; 

function renderBarComparison(ctxBar, data, latestKey, selectedProvince = 'all') {
  if (barChartInstance) {
    barChartInstance.destroy();
  }

  const filteredData = selectedProvince === 'all'
    ? data
    : data.filter(d => d.Province === selectedProvince);

  const areas = [...new Set(filteredData.map(d => d.Geography))];
  const types = ["Apartment - 1 bedroom", "Apartment - 2 bedrooms", "Room"];

  const allValues = []; // Store for tooltip and legend generation

  const newDatasets = types.map((type, i) => {
    const colors = ['#9966ff', '#4bc0c0','#2860eeff'];       
    const borderColors = ['#cc65fe','#36a2eb', '#6536d3ff']; 

    const values = areas.map(area => {
      const match = filteredData.find(d => d.Geography === area && d["Rental unit type"] === type);
      if (!match) return null;

      const raw = match[latestKey] || '';
      const estimated = raw.includes('E');
      const numeric = parseFloat(raw.replace(/[^0-9.]/g, ''));

      return { value: isNaN(numeric) ? null : numeric, estimated };
    });

    allValues.push(values); // Store for later

    return {
      label: type,
      data: values.map(v => (v ? v.value : null)),
      backgroundColor: colors[i], 
      borderColor: context => {
        const idx = context.dataIndex;
        return values[idx]?.estimated ? 'orange' : borderColors[i];
      },
      borderWidth: context => {
        const idx = context.dataIndex;
        return values[idx]?.estimated ? 3 : 1;
      },
      borderDash: context => {
        const idx = context.dataIndex;
        return values[idx]?.estimated ? [6, 6] : [];
      }
    };
  });

  const hasEstimated = allValues.some(values => values.some(v => v && v.estimated));

  barChartInstance = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: areas,
      datasets: newDatasets,
    },
    options: {
      indexAxis: 'y',
      responsive: false,
      scales: {
        y: {
          beginAtZero: false,
          title: { display: true, text: 'Area' }
        },
        x: {
          title: { display: true, text: 'Rent Price ($)' }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            generateLabels: chart => {
              const base = Chart.defaults.plugins.legend.labels.generateLabels(chart);
              const cleaned = base.map(label => {
                if (label.datasetIndex >= 0) {
                  return {
                    ...label,
                    strokeStyle: label.fillStyle,
                    lineDash: [],
                    lineWidth: 0
                  };
                }
                return label;
              });

              if (hasEstimated) {
                cleaned.push({
                  text: 'Estimated Data (Use Caution ⚠️)',
                  fillStyle: 'transparent',
                  strokeStyle: 'orange',
                  lineWidth: 2,
                  lineDash: [6, 6],
                  pointStyle: 'rect',
                  datasetIndex: -1
                });
              }

              return cleaned;
            }
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const datasetIndex = ctx.datasetIndex;
              const dataIndex = ctx.dataIndex;
              const val = allValues[datasetIndex][dataIndex];
              if (!val || val.value === null) return 'No data';
              let label = `$${val.value.toFixed(0)}`;
              if (val.estimated) label += ' (estimated)';
              return label;
            }
          }
        }
      }
    }
  });

  return barChartInstance;
}


function hasMissingData(points) {
  return points.some(point => point.y === null);
}

function hasEstimatedData(points) {
  return points.some(point => point.estimated);
}

document.querySelector('#app').innerHTML = `
  <div class="p-6 max-w-4xl mx-auto">
  <h1 class="text-4xl font-bold mb-4 text-center">Canada Average Asking Rent Price Analysis Dashboard</h1> </br>
   <hr style="border: none; height: 1px; background-color: rgba(128, 128, 128, 0.3); margin: 16px 0;"> </br> 
  <h1 class="text-3xl font-bold mb-4 text-center">Prix moyen des loyers par trimestre dans chaque région</h1>
  
  <div class="flex flex-col md:flex-row gap-4 mb-6 justify-center items-center">
    <select id="areaSelect" class="p-2 border rounded w-full md:w-1/3 max-w-xs"></select>
    <select id="typeSelect" class="p-2 border rounded w-full md:w-1/3 max-w-xs"></select>
  </div>
  
  <canvas id="rentChart" width="600" height="400" class="mx-auto"></canvas>
  
  <div id="missing-data-note" class="text-sm text-red-600 mt-2 text-center"></div>
  <div id="estimated-data-note" class="text-sm text-yellow-700 mt-1 text-center"></div>  

   <hr style="border: none; height: 1px; background-color: rgba(128, 128, 128, 0.3); margin: 16px 0;"> </br>
  
  <h2 class="text-3xl font-bold mb-4 mt-10 text-center">Comparison of rent by Geography</h2>

  <div class="flex flex-col md:flex-row gap-4 mb-6 justify-center items-center">
    <select id="quarterSelect" class="p-2 border rounded w-full md:w-1/3 max-w-xs"></select>
    <select id="provinceSelect" class="p-2 border rounded w-full md:w-1/4 max-w-xs">
    <option disabled selected>Select a province</option>
    </select>
  </div>
  
  <canvas id="barChart" class="mx-auto"></canvas>

  <div id="estimated-bar-note" class="text-sm text-yellow-700 mt-1 text-center"></div>
  <div id="empty-bar-data-note" class="text-sm text-red-600 mt-2 text-center"></div>
</div>
`;



fetchData().then(data => {
  const timeKeys = extractTimeSeriesKeys(data);
  const areas = getUniqueValues(data, 'Geography');
  const unitTypes = getUniqueValues(data, 'Rental unit type');
  const provinces = [...new Set(data.map(d => d.Province))].sort();

  const latestKey = timeKeys[timeKeys.length - 1];

  const ctxBar = document.getElementById('barChart').getContext('2d');
  const areaSelect = document.getElementById('areaSelect');
  const typeSelect = document.getElementById('typeSelect');
  const provinceSelect = document.getElementById('provinceSelect'); // new
  const quarterSelect = document.getElementById('quarterSelect');
  const ctx = document.getElementById('rentChart').getContext('2d');

  // Populate Area Select
  areaSelect.innerHTML = '<option disabled selected>Sélectionner une région</option>';
  areas.forEach(area => {
    const opt = document.createElement('option');
    opt.value = area;
    opt.textContent = frenchGeographyNames[area] || area; // Use French if available
    areaSelect.appendChild(opt);
  });


  const typeTranslations = {
  "Apartment - 1 bedroom": "Appartement - 1 chambre",
  "Apartment - 2 bedrooms": "Appartement - 2 chambres",
  "Room": "Chambre"
};

typeSelect.innerHTML = '<option disabled selected>Choisissez un type de logement</option>';
unitTypes.forEach(type => {
  const opt = document.createElement('option');
  opt.value = type;
  opt.textContent = typeTranslations[type] || type;
  typeSelect.appendChild(opt);
});


  // Populate Province Select
  provinceSelect.innerHTML = '<option value="all" selected>All Provinces</option>';
  provinces.forEach(prov => {
    const opt = document.createElement('option');
    opt.value = prov;
    opt.textContent = prov;
    provinceSelect.appendChild(opt);
  });

  // Populate Quarter Select
  quarterSelect.innerHTML = '<option disabled selected>Select a quarter</option>';
  timeKeys.forEach(q => {
    const opt = document.createElement('option');
    opt.value = q;
    opt.textContent = q;
    quarterSelect.appendChild(opt);
  });
  quarterSelect.value = latestKey;

// Update Bar Chart
function updateBarChart() {
  const selectedQuarter = quarterSelect.value;
  const selectedProvince = provinceSelect.value;

  if (!selectedQuarter) return;

  // Filter data ONCE here and pass filteredData around
  const filteredData = selectedProvince === 'all'
    ? data
    : data.filter(d => d.Province === selectedProvince);

  const areas = [...new Set(filteredData.map(d => d.Geography))];

  const canvas = document.getElementById('barChart');

  const baseWidth = 150;
  const baseHeight = 50;
  const maxWidth = 1000;
  const maxHeight = 800;

  const width = Math.min(baseWidth * areas.length, maxWidth);
  const height = Math.min(baseHeight * areas.length, maxHeight);

  canvas.width = width;
  canvas.height = height;

  console.log(`Canvas size set to ${width} x ${height} for ${areas.length} areas`);

  if (barChartInstance) {
    barChartInstance.destroy();
  }

  barChartInstance = renderBarComparison(
    canvas.getContext('2d'),
    data,
    selectedQuarter,
    selectedProvince
  );

  const emptyBarNoteDiv = document.getElementById('empty-bar-data-note');
  const estimatedBarNoteDiv = document.getElementById('estimated-bar-note');

  const hasEmpty = hasEmptyBarData(filteredData, selectedQuarter);
  const hasEstimated = hasEstimatedBarData(filteredData, selectedQuarter);

  emptyBarNoteDiv.textContent = hasEmpty
    ? "Note: Some bars have missing data marked as '..'."
    : "";

  estimatedBarNoteDiv.textContent = hasEstimated
    ? "⚠️ Some bars have estimated data (marked with 'E'). Use with caution."
    : "";
}




  // Update Line Chart
  function updateChart() {
    const area = areaSelect.value;
    const type = typeSelect.value;
    if (!area || !type) return;

    const { points, labels } = filterAndTransform(data, area, type, timeKeys);
    renderGraph(ctx, points, labels);

    document.getElementById('missing-data-note').textContent = hasMissingData(points)
  ? "Remarque : La ligne contient des lacunes en raison de données indisponibles (marquées par '..')."
  : "";

document.getElementById('estimated-data-note').textContent = hasEstimatedData(points)
  ? "⚠️ Certains points de données sont estimés et doivent être utilisés avec prudence (marqués par 'E')."
  : "";
  }

  areaSelect.addEventListener('change', updateChart);
  typeSelect.addEventListener('change', updateChart);
  quarterSelect.addEventListener('change', updateBarChart);
  provinceSelect.addEventListener('change', updateBarChart);

  updateBarChart(); // Initial chart render
});
