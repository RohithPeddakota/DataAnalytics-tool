// --- State Management ---
let rawData = [];
let filteredData = [];
let columns = [];
let numericColumns = [];
let categoricalColumns = [];

let currentMetric = "";
let currentCategory = "";

// Pagination State
let currentPage = 1;
const itemsPerPage = 50;

// Chart Instances
let charts = {
    bar: null,
    line: null,
    pie: null,
    doughnut: null
};

// --- Theme Management ---
const themeToggleBtn = document.getElementById('themeToggle');
let isDarkMode = true;

themeToggleBtn.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    themeToggleBtn.innerHTML = isDarkMode ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
    updateChartThemes();
});

// --- Mock Data Generation (Default) ---
function generateMockData() {
    const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books'];
    const regions = ['North', 'South', 'East', 'West'];
    const data = [];
    
    // Generate 500 rows of fake e-commerce data
    let baseDate = new Date('2023-01-01');
    for (let i = 0; i < 500; i++) {
        data.push({
            'Order ID': `ORD-${1000 + i}`,
            'Date': new Date(baseDate.getTime() + Math.random() * 10000000000).toISOString().split('T')[0],
            'Category': categories[Math.floor(Math.random() * categories.length)],
            'Region': regions[Math.floor(Math.random() * regions.length)],
            'Sales': parseFloat((Math.random() * 500 + 10).toFixed(2)),
            'Quantity': Math.floor(Math.random() * 5) + 1,
            'Profit': parseFloat((Math.random() * 200 - 50).toFixed(2)),
        });
    }
    return data;
}

// --- Initialization ---
function init() {
    // Load default data
    rawData = generateMockData();
    processData(rawData, 'Sample Dataset: E-Commerce Sales');

    // Setup event listeners
    document.getElementById('csvUpload').addEventListener('change', handleFileUpload);
    document.getElementById('metricSelect').addEventListener('change', handleFilterChange);
    document.getElementById('categorySelect').addEventListener('change', handleFilterChange);
    document.getElementById('globalSearch').addEventListener('input', handleSearch);
    
    document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));
    
    document.getElementById('exportDataBtn').addEventListener('click', exportToCSV);
    document.getElementById('downloadChartsBtn').addEventListener('click', exportDashboard);
}

// --- Data Processing ---
function processData(data, datasetName) {
    if (!data || data.length === 0) return;
    
    document.getElementById('datasetName').textContent = datasetName;
    rawData = data;
    filteredData = [...rawData];
    
    // Identify columns
    columns = Object.keys(rawData[0]);
    numericColumns = columns.filter(col => typeof rawData[0][col] === 'number' || !isNaN(parseFloat(rawData[0][col])));
    categoricalColumns = columns.filter(col => !numericColumns.includes(col));
    
    // Fallback if type guessing failed
    if(numericColumns.length === 0) numericColumns = columns;
    if(categoricalColumns.length === 0) categoricalColumns = columns;

    // Set defaults
    currentMetric = numericColumns.includes('Sales') ? 'Sales' : numericColumns[0];
    currentCategory = categoricalColumns.includes('Category') ? 'Category' : categoricalColumns[0];
    
    // Populate dropdowns
    populateDropdown('metricSelect', numericColumns, currentMetric);
    populateDropdown('categorySelect', categoricalColumns, currentCategory);
    
    updateDashboard();
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            processData(results.data, `Uploaded: ${file.name}`);
        }
    });
}

function populateDropdown(elementId, options, selectedValue) {
    const select = document.getElementById(elementId);
    select.innerHTML = '';
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === selectedValue) option.selected = true;
        select.appendChild(option);
    });
}

// --- Interactions ---
function handleFilterChange() {
    currentMetric = document.getElementById('metricSelect').value;
    currentCategory = document.getElementById('categorySelect').value;
    updateDashboard();
}

function handleSearch(e) {
    const term = e.target.value.toLowerCase();
    if (!term) {
        filteredData = [...rawData];
    } else {
        filteredData = rawData.filter(row => {
            return Object.values(row).some(val => String(val).toLowerCase().includes(term));
        });
    }
    currentPage = 1;
    updateDashboard();
}

// --- Dashboard Updates ---
function updateDashboard() {
    updateKPIs();
    updateCharts();
    renderTable();
}

function updateKPIs() {
    const totalRows = filteredData.length;
    let sum = 0, max = -Infinity, min = Infinity;
    
    filteredData.forEach(row => {
        const val = parseFloat(row[currentMetric]) || 0;
        sum += val;
        if (val > max) max = val;
        if (val < min) min = val;
    });
    
    const avg = totalRows > 0 ? sum / totalRows : 0;
    
    // Format numbers
    const format = (num) => new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 2 }).format(num);
    
    document.getElementById('kpi-rows').textContent = totalRows.toLocaleString();
    document.getElementById('kpi-sum').textContent = format(sum);
    document.getElementById('kpi-avg').textContent = format(avg);
    document.getElementById('kpi-max').textContent = max === -Infinity ? '0' : format(max);
}

// --- Charts Logic ---
function aggregateData() {
    const grouped = {};
    filteredData.forEach(row => {
        const cat = row[currentCategory] || 'Unknown';
        const val = parseFloat(row[currentMetric]) || 0;
        if (!grouped[cat]) grouped[cat] = 0;
        grouped[cat] += val;
    });
    
    // Sort by value descending
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    
    // Limit to top 10 for charts
    const top10 = sorted.slice(0, 10);
    
    return {
        labels: top10.map(item => item[0]),
        values: top10.map(item => item[1])
    };
}

// Generate an array of vibrant colors
function getChartColors(count) {
    const colors = [
        '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', 
        '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#0ea5e9'
    ];
    // Return colors with opacity for bg, and full color for borders
    return {
        bg: colors.slice(0, count).map(c => c + 'CC'),
        border: colors.slice(0, count)
    };
}

function getThemeStyles() {
    const root = getComputedStyle(document.documentElement);
    return {
        textColor: root.getPropertyValue('--text-primary').trim(),
        gridColor: root.getPropertyValue('--border-color').trim(),
    };
}

function updateCharts() {
    const data = aggregateData();
    const colors = getChartColors(data.labels.length);
    const theme = getThemeStyles();
    
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: theme.textColor, font: { family: 'Inter' } }
            }
        }
    };
    
    const scaleOptions = {
        scales: {
            x: { 
                ticks: { color: theme.textColor },
                grid: { color: theme.gridColor }
            },
            y: { 
                ticks: { color: theme.textColor },
                grid: { color: theme.gridColor }
            }
        }
    };

    // Bar Chart
    if (charts.bar) charts.bar.destroy();
    charts.bar = new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: currentMetric,
                data: data.values,
                backgroundColor: colors.bg[0],
                borderColor: colors.border[0],
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: { ...commonOptions, ...scaleOptions }
    });

    // Line Chart (Trend - roughly mocking trend by sorting labels alphabetically for continuity)
    const sortedLabels = [...data.labels].sort();
    const sortedValues = sortedLabels.map(l => data.values[data.labels.indexOf(l)]);
    
    if (charts.line) charts.line.destroy();
    charts.line = new Chart(document.getElementById('lineChart'), {
        type: 'line',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: currentMetric,
                data: sortedValues,
                borderColor: '#ec4899',
                backgroundColor: '#ec489922',
                borderWidth: 3,
                tension: 0.4,
                fill: true
            }]
        },
        options: { ...commonOptions, ...scaleOptions }
    });

    // Pie Chart
    if (charts.pie) charts.pie.destroy();
    charts.pie = new Chart(document.getElementById('pieChart'), {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: colors.bg,
                borderColor: isDarkMode ? '#0f172a' : '#ffffff',
                borderWidth: 2
            }]
        },
        options: { ...commonOptions }
    });

    // Doughnut Chart
    if (charts.doughnut) charts.doughnut.destroy();
    charts.doughnut = new Chart(document.getElementById('doughnutChart'), {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: colors.bg,
                borderColor: isDarkMode ? '#0f172a' : '#ffffff',
                borderWidth: 2
            }]
        },
        options: { ...commonOptions, cutout: '70%' }
    });
}

function updateChartThemes() {
    updateCharts();
}

// --- Data Table ---
function renderTable() {
    const headRow = document.getElementById('tableHeadRow');
    const tbody = document.getElementById('tableBody');
    
    // Render Headers
    headRow.innerHTML = '';
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        headRow.appendChild(th);
    });
    
    // Calculate Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
    
    // Render Rows
    tbody.innerHTML = '';
    const startIdx = (currentPage - 1) * itemsPerPage;
    const pageData = filteredData.slice(startIdx, startIdx + itemsPerPage);
    
    pageData.forEach(row => {
        const tr = document.createElement('tr');
        columns.forEach(col => {
            const td = document.createElement('td');
            // Format numbers nicely
            let val = row[col];
            if (typeof val === 'number') {
                // If it looks like a year, don't format with commas
                if(val > 1900 && val < 2100 && col.toLowerCase().includes('year')) {
                     td.textContent = val;
                } else {
                     td.textContent = new Intl.NumberFormat().format(val);
                }
            } else {
                td.textContent = val;
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

function changePage(delta) {
    currentPage += delta;
    renderTable();
}

// --- Exports ---
function exportToCSV() {
    if (filteredData.length === 0) return;
    const csv = Papa.unparse(filteredData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "export_data.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportDashboard() {
    // We can export the main charts container as an image, but the simplest native way is triggering print
    // or downloading a specific chart. Let's download the Bar Chart as an example.
    const canvas = document.getElementById('barChart');
    const link = document.createElement('a');
    link.download = 'chart.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Start App
init();
