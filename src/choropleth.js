class World_Map {

    constructor(svg_element_id) {
        this.initSVG(svg_element_id);
        this.loadData();
    }

    initSVG(svg_element_id) {
        this.svg = d3.select(`#${svg_element_id}`);
        const svg_viewbox = this.svg.node().viewBox.animVal;
        this.svg_width = svg_viewbox.width || 960;
        this.svg_height = svg_viewbox.height || 500;

        this.projection = d3.geoEqualEarth()
            .fitExtent([[2, 2], [this.svg_width - 2, this.svg_height]], {type: "Sphere"});
        this.path = d3.geoPath(this.projection);

        // Zoom and pan configuration
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on('zoom', (event) => {
                this.svg.attr('transform', event.transform);
            });

        this.svg.call(zoom);
    }

    loadData() {
        const data_promise = d3.csv("declaration_per_country.csv").then(data => {
            return new Map(data.map(d => [d.Country, +d.Percentage]));
        });

        const map_promise = d3.json("countries-50m.json");

        Promise.all([data_promise, map_promise]).then(values => {
            this.dataMap = values[0];
            this.map = values[1];
            this.drawMap();
        });
    }

    drawMap() {
        const countries = topojson.feature(this.map, this.map.objects.countries).features;
        const colorScale = d3.scaleSequentialLog(d3.interpolateLab("steelblue", "brown"))
            .domain([1, d3.max(Array.from(this.dataMap.values()))]);

        // Country paths
        this.svg.selectAll("path")
            .data(countries)
            .enter().append("path")
            .attr("d", this.path)
            .attr("fill", d => this.getCountryColor(d, colorScale))
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .on("mouseover", (event, d) => this.onMouseOver(event, d))
            .on("mouseout", (event, d) => this.onMouseOut(event, d))
            .append("title")
            .text(d => { const percentage = this.dataMap.get(d.properties.name) ;
            return `${d.properties.name}\n${percentage !== undefined ? percentage + "%" : "No data"}`});

        this.createLegend(colorScale);
    }

    getCountryColor(d, colorScale) {
        const percentage = this.dataMap.get(d.properties.name);
        if (percentage === undefined) {
            return "black"; // No information available
        } else if (percentage === 0) {
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
        const legendWidth = 300;
        const legendHeight = 10;
        const maxPercentage = d3.max(Array.from(this.dataMap.values()));
        const numTicks = Math.min(Math.floor(maxPercentage / 10), 10);
    
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
        const range = logspace(1, maxPercentage, numTicks);
        range.forEach((value, index) => {
            gradient.append("stop")
                .attr("offset", `${(index / (range.length - 1)) * 100}%`)
                .attr("stop-color", colorScale(value));
        });
    
        // Append the legend bar
        const legend = this.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${this.svg_width - legendWidth - 20}, ${this.svg_height - 30})`);
    
        legend.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#legend-gradient)");

        // Create the title for the legend
        legend.append("text")
        .attr("class", "legend-title")
        .attr("x", legendWidth / 2) // Center the title
        .attr("y", -10) // Position above the color bar
        .attr("text-anchor", "middle") // Center the text horizontally
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Data Value (%)"); // Text of the title
            
    
        // Create scale and axis for legend
        const x = d3.scaleLog()
            .domain([1, maxPercentage])
            .range([0, legendWidth]);
    
        const xAxis = d3.axisBottom(x)
            .tickValues(logspace(1, maxPercentage, numTicks))
            .tickFormat(d3.format(".0f"));
    
        legend.append("g")
            .attr("transform", `translate(0, ${legendHeight})`)
            .call(xAxis)
            .select(".domain").remove();  // Remove the axis line for a cleaner look
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
    new World_Map('choropleth_map');
});
