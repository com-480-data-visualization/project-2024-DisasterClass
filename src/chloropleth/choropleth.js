class World_Map {
    constructor(svg_element_id) {
        this.svg_element_id = svg_element_id;
        this.initSVG();
        this.loadData('Declaration');  // Default category
    }

    initSVG() {
        const element = document.getElementById(this.svg_element_id);
        this.data_file = element.getAttribute('csv-path'); // Get the data path from the SVG element
        this.map_file = element.getAttribute('map-path'); // Get the map path from the SVG element

        this.svg = d3.select(`#${this.svg_element_id}`);
        const rect = this.svg.node().getBoundingClientRect();
        this.svg_width = rect.width;
        this.svg_height = rect.height;

        // Create a group for the map
        this.mapGroup = this.svg.append("g")
            .attr("class", "map-group");

        // Setup map projection
        this.projection = d3.geoEqualEarth()
            .fitExtent([[0, 0], [this.svg_width , this.svg_height ]], { type: "Sphere" });
        this.path = d3.geoPath(this.projection);

        // Zoom and pan configuration
        const zoom = d3.zoom()
            .scaleExtent([1, 8]) // Limit zooming out to 1x and zooming in to 8x
            .translateExtent([[0, 0], [this.svg_width, this.svg_height]]) // Limit panning to the dimensions of the SVG
            .on('zoom', (event) => {
                this.mapGroup.attr('transform', event.transform);
            });

        this.svg.call(zoom);
    }

    loadData(category) {
        this.current_category = category;

        d3.csv(this.data_file).then(data => {
            // Create a Map to hold the counts for each country
            let counts = new Map();

            data.forEach(row => {
                if (!counts.has(row.Country)) {
                    counts.set(row.Country, { yes: 0, total: 0 });
                }
                let countryData = counts.get(row.Country);
                if (row[category] === 'Yes') {
                    countryData.yes += 1;
                }
                countryData.total += 1;
            });

            // Convert counts to percentages for the "Yes" responses
            let percentageMap = new Map();
            counts.forEach((value, key) => {
                let percentage = value.total > 0 ? (value.yes / value.total) * 100 : 0;
                percentageMap.set(key, percentage.toFixed(2)); // Keep two decimal places
            });

            // Update the data map and redraw the map
            this.dataMap = percentageMap;
            this.map = null; // Reset the map before drawing
            this.fetchMapAndDraw();
        }).catch(error => console.error("Failed to load or process data: ", error));
    }

    fetchMapAndDraw() {
        d3.json(this.map_file).then(mapData => {
            this.map = mapData;
            this.drawMap();
        }).catch(error => console.error("Failed to load map data: ", error));
    }

    drawMap() {
        this.mapGroup.selectAll("path").remove();  // Clear existing paths
        const countries = topojson.feature(this.map, this.map.objects.countries).features;

        const colorScale = d3.scaleSequentialLog(d3.interpolateLab("steelblue", "brown"))
            .domain([1, d3.max(Array.from(this.dataMap.values()))]);

        // Country paths
        this.mapGroup.selectAll("path")
            .data(countries)
            .enter().append("path")
            .attr("d", this.path)
            .attr("fill", d => this.getCountryColor(d, colorScale))
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .on("mouseover", (event, d) => this.onMouseOver(event, d))
            .on("mouseout", (event, d) => this.onMouseOut(event, d))
            .append("title")
            .text(d => {
                const percentage = this.dataMap.get(d.properties.name);
                return `${d.properties.name}\n${percentage !== undefined ? percentage + "%" : "No data"}`;
            });

        this.createLegend(colorScale);
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
        d3.select(event.currentTarget)
            .attr("stroke", "#f00")
            .attr("stroke-width", 1.5);
        // Additional tooltip logic here
    }

    onMouseOut(event, d) {
        d3.select(event.currentTarget)
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5);
    }

    createLegend(colorScale) {
        // Clear existing legend
        this.svg.selectAll(".legend").remove();

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
            .text(`${this.current_category} (%)`); // Text of the title
    
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
    

    updateVisualization(category) {
        this.loadData(category);
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

    document.getElementById('categorySelect').addEventListener('change', function() {
        map.updateVisualization(this.value);
    });
});
