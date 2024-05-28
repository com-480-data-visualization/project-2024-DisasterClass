const csvUrl = "data/emdat_data.csv";
// const csvUrl = "src/race/public_emdat_incl_hist_2024-03-26.csv";
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
    const button = document.getElementById('playPauseButton');
    button.classList.remove('fa-play');
    button.classList.add('fa-pause');
}

// Initialize the chart with default selections on page load
// document.addEventListener('DOMContentLoaded', initChart);

function togglePlayPause() {
    const button = document.getElementById('playPauseButton');
    chart.toggle();
    if (chart.isPlaying) {
        button.classList.remove('fa-play');
        button.classList.add('fa-pause');
    } else {
        button.classList.remove('fa-pause');
        button.classList.add('fa-play');
    }
}

// Add event listener to the play/pause button
document.getElementById('playPauseButton').addEventListener('click', togglePlayPause);

// Update the chart when the button is clicked
document.getElementById('runRaceButton').addEventListener('click', initChart);