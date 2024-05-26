const csvUrl = "src/race/public_emdat_incl_hist_2024-03-26.csv";
let chart;

// Function to initialize the chart with default values
function initChart() {
    const container = document.getElementById('bar-chart-race-container');
    const onlyNonHistoric = document.getElementById('onlyNonHistoric').value === 'true';
    const onlyNaturalDisasters = document.getElementById('onlyNaturalDisasters').value === 'true';
    const xVariable = document.getElementById('xVariable').value;
    const yVariable = document.getElementById('yVariable').value;
    // const hueVariable = document.getElementById('hueVariable').value;

    if (chart) {
    // Remove the old chart
    d3.select(container).select('svg').remove();
    }

    chart = new BarChartRace(container, csvUrl, onlyNonHistoric, onlyNaturalDisasters, xVariable, yVariable);
}

// Initialize the chart with default selections on page load
document.addEventListener('DOMContentLoaded', initChart);

// // Update the chart when the button is clicked
// document.getElementById('runRaceButton').addEventListener('click', initChart);