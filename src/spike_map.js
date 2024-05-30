class SpikeMap {
    constructor(svg_element_id) {
        this.svg_element_id = svg_element_id;
        this.currentMagnitude = 'Total Deaths';
        this.isPlaying = false;
        this.tooltip = d3.select("#tooltip"); 
        this.initialize();
    }

    async initialize() {
        const element = document.getElementById(this.svg_element_id);
        this.data_file = element.getAttribute('csv-path'); // Get the data path from the SVG element
        this.map_file = element.getAttribute('map-path'); // Get the map path from the SVG element

        await this.initSVG();
        await this.loadData();
        this.attachEventListeners();
    }

    async initSVG() {
        return new Promise(resolve => {
            this.svg = d3.select(`#${this.svg_element_id}`)   

            const rect = this.svg.node().getBoundingClientRect();
            this.svg_width = rect.width;
            this.svg_height = rect.height;

            this.projection = d3.geoEqualEarth()
                .fitExtent([[0, 0], [this.svg_width , this.svg_height]], { type: "Sphere" });

            this.path = d3.geoPath(this.projection);

            this.mapGroup = this.svg.append("g").attr("class", "map");
            this.spikesGroup = this.svg.append("g").attr("class", "spikes");

            // Define a color scale for different subgroups
            this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);

            // Example magnitudes structured as expected by `getSpikePath`
            this.sizes = [{magnitude: 500000}, {magnitude: 1000000}, {magnitude: 2000000}, {magnitude: 3000000}, {magnitude: 5000000}]; 

            this.svg.call(d3.zoom()
                .scaleExtent([1, 7]) // Limit zooming out to 1x and zooming in to #x
                .translateExtent([[0, 0], [this.svg_width, this.svg_height ]]) // Limit panning to the dimensions of the SVG
                .on('zoom', event => this.zoomed(event)));

            // Apply a small translation to move the map slightly to the left
            //this.mapGroup.attr("transform", "translate(-100, 0)");
            //this.spikesGroup.attr("transform", "translate(-100, 0)");
            
            resolve();
        });
    }

    zoomed(event) {
        this.mapGroup.attr('transform', event.transform);
        this.spikesGroup.attr('transform', event.transform);
        this.updateLegendValues(event.transform.k);
    }

    async loadData() {
        try {
            const [mapData, data] = await Promise.all([
                d3.json(this.map_file),
                d3.csv(this.data_file)
            ]);
            this.map = mapData;
            this.rawData = data.filter(d => 
                d.Latitude && d.Longitude && // Checks if latitude and longitude exist and are truthy
                d.Latitude.toLowerCase() !== 'none' && d.Longitude.toLowerCase() !== 'none' && // Exclude 'None' values
                !isNaN(parseFloat(d.Latitude)) && !isNaN(parseFloat(d.Longitude)) // Ensure values are not NaN
            );

            this.processData();
            this.setupVisualization();
        } catch (error) {
            console.error("Failed to load data: ", error);
        }
    }

    processData() {
        this.data = this.rawData
            .filter(d => !isNaN(+d[this.currentMagnitude]))  // Check if the current attribute is a valid number
            .map(d => this.formatData(d));
    }

    formatData(d) {
        
        // Default to January 1st if only the year is provided
        const year = +d["Start Year"]; // Always available
        const month = d["Start Month"] ? +d["Start Month"] - 1 : 0; // Subtract 1 because JS months are 0-indexed
        const day = d["Start Day"] ? +d["Start Day"] : 1;
    
        d.date = new Date(year, month, day);
        d.latitude = +d.Latitude;
        d.longitude = +d.Longitude;
        d.magnitude = +d[this.currentMagnitude];  // Dynamic attribute
        d.subgroup = d["Disaster Subgroup"];
        d.type = d["Disaster Type"];
        d.country = d.Country;
        // Event name if available
        d.name = d["Event Name"] ? d["Event Name"] : "Not available";
        return d;
    }

    setupVisualization() {
        this.sizeScale = d3.scaleSqrt()
            .domain([0, d3.max(this.data, d => d.magnitude)])
            .range([0, 100]);  // Adjust the range as needed

        this.drawMap();
        this.createColorLegend();
        this.createSizeLegend();
        this.updateTimeRange();
    }

    drawMap() {
        const countries = topojson.feature(this.map, this.map.objects.countries).features;
        this.mapGroup.selectAll("path")
            .data(countries)
            .join("path")
            .attr("d", this.path)
            .attr("fill", "#eee")
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);

        this.drawSpikes(this.data[0].date);
    }

    drawSpikes(filterDate) {
        const filteredData = this.data.filter(d => d.date <= filterDate);

        this.spikesGroup.selectAll("path")
            .data(filteredData, d => d.id)  // Assuming each data point has a unique id
            .join("path")
            .attr("d", d => this.getSpikePath(d))
            .attr("fill", d => this.colorScale(d.subgroup))
            .attr("fill-opacity", 0.5)
            .attr("stroke", d => this.colorScale(d.subgroup))
            .attr("stroke-width", 0.5)
            .attr("transform", d => `translate(${this.projection([d.longitude, d.latitude])})`)
            .on("mouseover", (event, d) => {
                this.tooltip.html(
                    `<strong>Country:</strong> ${d.country}<br>
                    <strong>Disaster Type:</strong> ${d.type}<br>
                    <strong>${this.currentMagnitude}:</strong> ${d.magnitude.toLocaleString()}<br>
                    <strong>Date:</strong> ${d3.timeFormat("%Y-%m-%d")(d.date)}<br>
                    <strong>Event Name:</strong> ${d.name}<br>
                    `
                )
                .style("left", (event.pageX + 10) + "px")  // Slightly offset from cursor
                .style("top", (event.pageY + 10) + "px")
                .style("opacity", 1)  // Make visible
                .style("visibility", "visible");  // Ensure it's visible
            })
            .on("mousemove", (event) => {
                this.tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY + 10) + "px");
            })
            .on("mouseout", () => {
                this.tooltip.style("opacity", 0)
                    .style("visibility", "hidden");
            });
    }

    getSpikePath(d,width = 1.5) {
        const height = this.sizeScale(d.magnitude)
        return `M${-width / 2},0L0,${-height}L${width / 2},0`; // A Spike
        //return `M0,0 L0,${-height} L1,${-height} L1,0 Z`; // A rectangle
        //return `M${-width / 2},0 L0,${-height} L${width / 2},0 Z`; // A triangle
    }
    
    createColorLegend() {
        const colorLegendContainer = d3.select('#colorLegend');

        // Remove all existing SVG elements from the legend container before appending new ones
        colorLegendContainer.selectAll('*').remove();
    
        const svg = colorLegendContainer.append('svg');
        const subgroups = Array.from(new Set(this.data.map(d => d.subgroup)));  // Unique values using Set

        // Adding a title to the color legend
        svg.append('text')
            .attr('x', 0)
            .attr('y', 20)
            .style('font-weight', 'bold')
            .text('Disaster Subgroups');

        const legend = svg.selectAll('g.legend-entry')
            .data(subgroups)
            .enter()
            .append('g')
            .attr('class', 'legend-entry')
            .attr('transform', (d, i) => `translate(0, ${i * 25 + 40})`);  // Offset by 40 to account for title
    
        legend.append('rect')
            .attr('width', 20)
            .attr('height', 20)
            .attr('fill', d => this.colorScale(d));
    
        legend.append('text')
            .attr('x', 30)  // Adjusted for better alignment
            .attr('y', 15)  // Center text relative to the rectangle
            .text(d => d);
    }

    createSizeLegend() {
        const sizeLegendContainer = d3.select('#sizeLegend');

        // Remove all existing SVG elements from the legend container before appending new ones
        sizeLegendContainer.selectAll('svg').remove();
        const svg = sizeLegendContainer.append('svg');

        const d3Formatter = d3.format(".1s");
        function formatNumberD3(num) {
            return d3Formatter(num).replace('G', 'B'); // Replace 'G' with 'B' for billions
        }
    
        const spikeWidth = 10; // Width of the spike, adjust as needed
        const spacing = 40; // Horizontal spacing between spikes, adjust as needed
    
        // Generate a legend entry for each size
        const legend = svg.selectAll('g.legend-entry')
            .data(this.sizes)
            .enter()
            .append('g')
            .attr('class', 'legend-entry')
            .attr('transform', (d, i) => `translate(${i * spacing}, 20)`); // Horizontal positioning
    
        // Append the spike path for each legend entry
        legend.append('path')  
            .attr('fill', 'red')
            .attr("d", d => this.getSpikePath({magnitude: d.magnitude}, spikeWidth))  // Ensure getSpikePath is adjusted to use the width
            .attr('transform', 'translate(10,0)'); // Adjust translation if necessary
    
        // Append text below each spike
        legend.append('text')
            .attr('x', 4 +  spikeWidth / 2) // Center text under the spike
            .attr('y', 20) // Vertical position below the spike
            .attr('text-anchor', 'middle') // Center text horizontally
            .text(d => formatNumberD3(d.magnitude));
    }

    updateLegendValues(scale) {
        const d3Formatter = d3.format(".1s");

        function formatNumberD3(num) {
            return d3Formatter(num).replace('G', 'B'); // Replace 'G' with 'B' for billions
        }

        const legend = d3.select('#sizeLegend').selectAll('text')
            .data(this.sizes)
            .text(d => formatNumberD3(d.magnitude / scale));
    }    
    
    startAnimation() {
        const slider = document.getElementById('timeSlider');
        const maxDate = new Date(parseInt(slider.max));
        this.isPlaying = true;
        const interval = setInterval(() => {
            let currentDate = new Date(parseInt(slider.value));
            currentDate.setFullYear(currentDate.getFullYear() + 1); // increment year
            if (currentDate > maxDate || !this.isPlaying) {
                clearInterval(interval);
                this.isPlaying = false;
                document.getElementById('playButton').innerHTML = '<i class="fas fa-play"></i>';
            } else {
                slider.value = currentDate.getTime();
                this.updateCurrentYearLabel(currentDate.getFullYear());
                this.drawSpikes(currentDate);
            }
        }, 100); // miliseconds per year
    }

    togglePlayPause() {
        const playButton = document.getElementById('playButton');
        if (this.isPlaying) {
            this.isPlaying = false;
            playButton.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            this.startAnimation();
            playButton.innerHTML = '<i class="fas fa-pause"></i>';
        }
    }

    updateTimeRange() {
        const minDate = this.data[0].date;
        const maxDate = this.data[this.data.length - 1].date;
        const slider = document.getElementById('timeSlider');
        slider.min = minDate.getTime();
        slider.max = maxDate.getTime();
        slider.value = minDate.getTime();  // Initialize slider at the start date
        slider.step = 365.25 * 24 * 60 * 60 * 1000; // Step by one year
        this.updateCurrentYearLabel(minDate.getFullYear());
    }

    updateCurrentYearLabel(year) {
        document.getElementById('currentYear').textContent = year;
    }

    attachEventListeners() {
        const playButton = document.getElementById('playButton');
        const timeSlider = document.getElementById('timeSlider');
        const magnitudeSelect = document.getElementById('magnitudeSelect'); 

        playButton.addEventListener('click', () => this.togglePlayPause());
        timeSlider.addEventListener('input', e => this.handleSliderInput(e));
        magnitudeSelect.addEventListener('change', e => this.handleMagnitudeChange(e)); 
    }

    handleSliderInput(e) {
        const selectedDate = new Date(parseInt(e.target.value));
        this.updateCurrentYearLabel(selectedDate.getFullYear());
        this.drawSpikes(selectedDate);
        this.isPlaying = false;
        document.getElementById('playButton').innerHTML = '<i class="fas fa-play"></i>';
    }

    handleMagnitudeChange(e) {
        this.currentMagnitude = e.target.value;

        // Clear existing spikes or other related visual elements
        this.spikesGroup.selectAll("*").remove();

        // Reprocess data with the new magnitude attribute
        this.processData();
        this.setupVisualization();  // Setup visualization recalculates scales and redraws all elements
        if (this.isPlaying) {
            this.togglePlayPause();  // Pause the animation if it is running
        }
    }
    
}

// Event listeners to manage DOM readiness and user interactions
function whenDocumentLoaded(action) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", action);
    } else {
        action();
    }
}

whenDocumentLoaded(() => {
    new SpikeMap('spike_map');
});

