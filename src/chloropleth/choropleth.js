class World_Map {
    constructor(svg_element_id) {
        this.svg_element_id = svg_element_id;
        this.tooltip = d3.select("#tooltip"); 
        this.filters = [];
        this.currentMetric = 'Declaration'; // default metric
        this.defaultCategory = 'Declaration'; // default category
        this.defaultDisasterType = 'Meteorological'; // default disaster type
        this.currentViewMode = 'category'; // default view mode
        this.counts = new Map();
        this.initialize();
    }

    async initialize() {
        await this.initSVG();
        await this.loadData(); 
        this.setupEventListeners();
    }

    async initSVG() {
        const element = document.getElementById(this.svg_element_id);
        this.data_file = element.getAttribute('csv-path');
        this.map_file = element.getAttribute('map-path');

        this.svg = d3.select(`#${this.svg_element_id}`);
        const { width, height } = this.svg.node().getBoundingClientRect();
        this.svg_width = width;
        this.svg_height = height;

        this.mapGroup = this.svg.append("g").attr("class", "map-group");
        this.setupProjection();
        this.setupZoom();
    }

    setupProjection() {
        this.projection = d3.geoEqualEarth().fitExtent([[0, 0], [this.svg_width , this.svg_height ]], { type: "Sphere" });
        this.path = d3.geoPath(this.projection);
    }

    setupZoom() {
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .translateExtent([[0, 0], [this.svg_width, this.svg_height]])
            .on('zoom', (event) => this.mapGroup.attr('transform', event.transform));
        this.svg.call(zoom);
    }

    async loadData() {
        try {
            const data = await d3.csv(this.data_file);
            this.processData(data);
        } catch (error) {
            console.error("Failed to load or process data: ", error);
        }
    }

    processData(data) {
        this.counts.clear(); // Reset counts for new data processing
    
        data.forEach(row => {
            if (this.filters.every(filter => row[filter.attribute] >= filter.threshold)) {
                let countryData = this.counts.get(row.Country_json) || { total: 0, count: 0 };
    
                countryData.total += 1; // Always increment total for each valid row
    
                // Check what we're counting based on the mode
                if ((this.currentViewMode === 'category' && row[this.currentMetric] === 'Yes') ||
                    (this.currentViewMode === 'disasterType' && row["Disaster Subgroup"] === this.currentMetric)) {
                    countryData.count += 1;
                }
    
                this.counts.set(row.Country_json, countryData);
            }
        });
    
        // Calculate percentages for visualization
        this.dataMap = new Map(Array.from(this.counts, ([key, { total, count }]) => 
            [key, ((count / total) * 100).toFixed(2)]));
    
        this.fetchMapAndDraw();
    }
    
    async fetchMapAndDraw() {
        try {
            const mapData = await d3.json(this.map_file);
            this.map = mapData;
            this.drawMap();
        } catch (error) {
            console.error("Failed to load map data: ", error);
        }
    }

    drawMap() {
        this.mapGroup.selectAll("path").remove();  // Clear existing paths
        const countries = topojson.feature(this.map, this.map.objects.countries).features;
        const colorScale = this.getColorScale();

        // Country paths
        this.mapGroup.selectAll("path")
            .data(countries)
            .enter().append("path")
            .attr("d", this.path)
            .attr("fill", d => this.getCountryColor(d, colorScale))
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .on("mouseover", (event, d) => this.onMouseOver(event, d))
            .on("mouseout", (event, d) => this.onMouseOut(event, d));

        this.createLegend(colorScale);
    }

    getColorScale() {
        const maxPercentage = d3.max(Array.from(this.dataMap.values(), value => +value));  // Ensure values are numbers
        
        // Define color ranges for each type of disaster
        const colorSchemes = {
            "Meteorological": d3.scaleSequentialLog(d3.interpolateOranges).domain([1, maxPercentage]),
            "Hydrological": d3.scaleSequentialLog(d3.interpolateBlues).domain([1, maxPercentage]),
            "Biological": d3.scaleSequentialLog(d3.interpolateGreens).domain([1, maxPercentage]),
            "Geophysical": d3.scaleSequentialLog(d3.interpolateReds).domain([1, maxPercentage]),
            "Climatological": d3.scaleSequentialLog(d3.interpolatePurples).domain([1, maxPercentage])
        };

        // Choose the appropriate color scale based on the current view mode
        if (this.currentViewMode === 'disasterType' && colorSchemes.hasOwnProperty(this.currentMetric)) {
            return colorSchemes[this.currentMetric];
        } else {
            return d3.scaleSequentialLog(d3.interpolateLab("steelblue", "brown"))
                .domain([1, maxPercentage]);
        }

    }
       

    getCountryColor(d, colorScale) {
        const percentage = this.dataMap.get(d.properties.name);
        if (percentage === undefined) {
            return "black"; // No information available
        } else if (+percentage === 0) {
            return "#ccc"; // Percentage is zero
        } else {
            return colorScale(percentage); // Color based on percentage
        }
    }

    onMouseOver(event, d) {
        const countryName = d.properties.name;
        const percentage = this.dataMap.get(countryName);
        const countryData = this.counts.get(countryName);
        const totalDisasters = countryData ? countryData.total : 'No data';
    
        d3.select(event.currentTarget)
            .attr("stroke", "#f00")
            .attr("stroke-width", 1.5);
    
        this.tooltip
            .html(
                `<strong>Country:</strong> ${countryName}<br>` +
                `<strong>Percentage:</strong> ${percentage ? percentage + "%" : "No data"}<br>` +
                `<strong>Total Disasters:</strong> ${totalDisasters}`
            )
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px")
        .style("opacity", 1)
        .style("visibility", "visible");
    }

    onMouseOut(event, d) {
        // Revert the stroke changes
        d3.select(event.currentTarget)
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5);

        // Hide the tooltip
        this.tooltip
        .style("opacity", 0)
        .style("visibility", "hidden");
    }

    createLegend(colorScale) {
        // Clear existing legend
        this.svg.selectAll(".legend").remove();
        this.svg.selectAll("defs").remove(); // Remove existing defs to clear old gradients

        // Dynamically set the width based on SVG width
        const legendWidth = Math.min(400, this.svg_width * 0.4); // Legend width is at most 50% of the SVG width
        const legendHeight = 10;
        const legendPadding = 18;

        const maxPercentage = d3.max(Array.from(this.dataMap.values(), value => +value));  // Ensure values are numbers
    
        // Logarithmic space function
        function logspace(start, end, num) {
            const scale = (Math.log(end) - Math.log(start)) / (num - 1);
            return Array.from({ length: num }, (_, i) => Math.exp(Math.log(start) + (i * scale)));
        }
    
        // Setup the SVG gradient for the legend
        const defs = this.svg.append("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", "legend-gradient")
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("y1", "0%")
            .attr("y2", "0%");
        
        // Create the gradient stops based on the color scale
        const range = logspace(1, maxPercentage, 10);
        range.forEach((value, index) => {
            gradient.append("stop")
                .attr("offset", `${(index / (range.length - 1)) * 100}%`)
                .attr("stop-color", colorScale(value));  
        });

        const legend = this.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${this.svg_width - legendWidth -15}, ${this.svg_height - legendHeight - 20})`);

        // Append a background rectangle to the legend
        legend.append("rect")
            .attr("class", "legend-background")
            .attr("x", -legendPadding)
            .attr("y", -legendPadding)
            .attr("width", legendWidth + 2 * legendPadding)
            .attr("height", legendHeight + 2 * legendPadding)
            .attr("rx", 5) // Rounded corners
            .attr("ry", 5) // Rounded corners
            .style("fill", "#fff")
            .style("opacity", 0.7);

        // Append the legend bar
        legend.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#legend-gradient)");

        // Create the title for the legend
        legend.append("text")
            .attr("class", "legend-title")
            .attr("x", legendWidth / 2 ) // Center the title
            .attr("y", -5) // Position above the color bar
            .attr("text-anchor", "middle") // Center the text horizontally
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .text(`${this.currentMetric} (%)`); // Text of the title
    
        const x = d3.scaleLog()
            .domain([1, maxPercentage])
            .range([0, legendWidth]);
    
        const xAxis = d3.axisBottom(x)
            .tickValues(logspace(1, maxPercentage, 10))
            .tickFormat(d3.format(".0f"));
    
        legend.append("g")
            .attr("transform", `translate(0, ${legendHeight})`)
            .call(xAxis)
            .select(".domain").remove();
    }

    updateVisualization() {
        this.loadData();
    }

    setupEventListeners() {
        const viewModeSelector = document.getElementById('viewMode');
        const categorySelector = document.getElementById('categorySelect');
        const disasterTypeSelector = document.getElementById('disasterTypeSelect');
        
        viewModeSelector.addEventListener('change', (event) => {
            this.currentViewMode = event.target.value;
            this.currentMetric = this.currentViewMode === 'category' ? this.defaultCategory : this.defaultDisasterType;
            toggleDropdowns(); // Toggle dropdown visibility
            this.updateVisualization();
        });

        categorySelector.addEventListener('change', (event) => {
            if (this.currentViewMode === 'category') {
                this.currentMetric  = event.target.value;
            }
            this.updateVisualization();
        });

        disasterTypeSelector.addEventListener('change', (event) => {
            if (this.currentViewMode === 'disasterType') {
                this.currentMetric  = event.target.value;
            }
            this.updateVisualization();
        });
    }
}

function setupEventListeners(map) {
    document.getElementById('categorySelect').addEventListener('change', function() {
        if (map.currentViewMode === 'category') {
            map.currentMetric = this.value;
            map.updateVisualization();
        }
    });

    document.getElementById('disasterTypeSelect').addEventListener('change', function() {
        if (map.currentViewMode === 'disasterType') {
            map.currentMetric = this.value;
            map.updateVisualization();
        }
    });

    document.getElementById('addFilterBtn').addEventListener('click', function() {
        addFilter(map);
    });
}

function addFilter(map) {
    const template = document.getElementById('filterTemplate').content.firstElementChild.cloneNode(true);
    const container = document.getElementById('filters');
    container.appendChild(template);

    template.querySelector('.removeFilter').addEventListener('click', function() {
        this.closest('div').remove();
        updateFilters(map);
    });

    template.querySelector('.attributeSelect').addEventListener('change', function() {
        updateFilters(map);
    });

    template.querySelector('.thresholdInput').addEventListener('input', function() {
        updateFilters(map);
    });
}

function updateFilters(map) {
    const filterDivs = document.querySelectorAll('#filters > div');
    map.filters = Array.from(filterDivs).map(filterDiv => {
        return {
            attribute: filterDiv.querySelector('.attributeSelect').value,
            threshold: parseInt(filterDiv.querySelector('.thresholdInput').value, 10) || 0
        };
    });
    map.updateVisualization();
}

function toggleDropdowns() {
    const viewMode = document.getElementById('viewMode').value;
    const categoryDiv = document.getElementById('categorySelection');
    const disasterTypeDiv = document.getElementById('disasterTypeSelection');

    if (viewMode === 'category') {
        categoryDiv.style.display = 'block';
        disasterTypeDiv.style.display = 'none';
    } else {
        categoryDiv.style.display = 'none';
        disasterTypeDiv.style.display = 'block';
    }
}

// Ensure DOM is loaded before executing script
function whenDocumentLoaded(action) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", action);
    } else {
        action();
    }
}

whenDocumentLoaded(() => {
    const map = new World_Map('choropleth_map');
    setupEventListeners(map);
});


