class SpikeMap {
    constructor(svg_element_id, data_file) {
        this.svg_element_id = svg_element_id;
        this.data_file = data_file;
        this.initSVG();
        this.loadData(); // Load all disasters
        this.isPlaying = false;
        this.adjustSliderWidth(); // Adjust the slider width initially
    }

    initSVG() {
        this.svg = d3.select(`#${this.svg_element_id}`)            

        this.svg_width = this.svg.node().getBoundingClientRect().width;
        this.svg_height = this.svg.node().getBoundingClientRect().height;

        this.projection = d3.geoEqualEarth()
            .fitExtent([[0, 0], [this.svg_width, this.svg_height]], { type: "Sphere" });
        this.path = d3.geoPath(this.projection);

        this.mapGroup = this.svg.append("g").attr("class", "map");
        this.spikesGroup = this.svg.append("g").attr("class", "spikes");

       // Define a color scale for different subgroups
       this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);

       this.svg.call(d3.zoom()
       .scaleExtent([1, 8])
       .on('zoom', event => this.zoomed(event)));
    }

    zoomed(event) {
        this.mapGroup.attr('transform', event.transform);
        this.spikesGroup.attr('transform', event.transform);
    }

    loadData() {
        Promise.all([
            d3.json("countries-50m.json"),
            d3.csv(this.data_file, this.type)
        ]).then(([mapData, data]) => {
            this.map = mapData;
            this.data = data;
            this.setupVisualization();
        }).catch(error => console.error("Failed to load data: ", error));
    }

    setupVisualization() {
        this.sizeScale = d3.scaleSqrt()
            .domain([0, d3.max(this.data, d => d.magnitude)])
            .range([0, 80]);

        this.drawMap();
        this.createColorLegend();
        this.createSizeLegend();
        this.updateTimeRange();
    }

    type(d) {
        d.date = new Date(d.Date);
        d.latitude = +d.Latitude;
        d.longitude = +d.Longitude;
        d.magnitude = +d.Total_Deaths;
        d.subgroup = d.Disaster_Subgroup;
        return d;
    }

    drawMap() {
        const countries = topojson.feature(this.map, this.map.objects.countries).features;
        this.mapGroup.selectAll("path")
            .data(countries)
            .join("path")
            .attr("d", this.path)
            .attr("fill", "#ccc")
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
            .append("title")
            .text(d => `Date: ${d3.timeFormat("%Y-%m-%d")(d.date)}\nTotal Deaths: ${d.magnitude}`);
    }

    getSpikePath(d,width = 1.5) {
        const height = this.sizeScale(d.magnitude)
        return `M${-width / 2},0L0,${-height}L${width / 2},0`;
        //return `M0,0 L0,${-height} L1,${-height} L1,0 Z`;
        //return `M${-width / 2},0 L0,${-height} L${width / 2},0 Z`; // A triangle
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
    
    createColorLegend() {
        const colorLegendContainer = d3.select('#colorLegend').append('svg');
        const subgroups = Array.from(new Set(this.data.map(d => d.subgroup)));  // Unique values using Set
    
        const legend = colorLegendContainer.selectAll('g')
            .data(subgroups)
            .enter()
            .append('g')
            .attr('transform', (d, i) => `translate(0, ${i * 25})`);
    
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
        const sizeLegendContainer = d3.select('#sizeLegend').append('svg');
        const sizes = [1000, 10000, 50000]; // Example magnitudes for demonstration
    
        const legend = sizeLegendContainer.selectAll('g')
            .data(sizes)
            .enter()
            .append('g')
            .attr('transform', (d, i) => `translate(0, ${i * 50 + 20})`);  // Ensure enough spacing and add top margin
    
        legend.append('circle')  // Using circle for better visual effect
            .attr('cx', 10)
            .attr('cy', d => 10 - this.sizeScale(d)/2)
            .attr('r', d => this.sizeScale(d)/2)
            .attr('fill', 'red');
    
        legend.append('text')
            .attr('x', 30)
            .attr('y', d => 10)  // Align text to be centered with circles
            .text(d => `${d.toLocaleString()} deaths`);
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
        }, 500); // miliseconds per year
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

    adjustSliderWidth() {
        const slider = document.getElementById('timeSlider');
        slider.style.width = `${this.svg_width}px`; // Set slider width to match SVG width
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

    const map = new SpikeMap('spike_map', 'data_spike.csv');
    window.onresize = () => map.adjustSliderWidth(); // Adjust slider width on window resize
    document.getElementById('playButton').addEventListener('click', () => map.togglePlayPause());
    document.getElementById('timeSlider').addEventListener('input', (e) => {
        const selectedDate = new Date(parseInt(e.target.value));
        map.updateCurrentYearLabel(selectedDate.getFullYear());
        map.drawSpikes(selectedDate);
        map.isPlaying = false;
        document.getElementById('playButton').innerHTML = '<i class="fas fa-play"></i>';
    });
});

