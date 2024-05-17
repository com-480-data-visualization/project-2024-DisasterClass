class World_Map {

    constructor(svg_element_id) {
        this.svg = d3.select(`#${svg_element_id}`);
        const svg_viewbox = this.svg.node().viewBox.animVal;
        this.svg_width = svg_viewbox.width || 960;
        this.svg_height = svg_viewbox.height || 500;
        
        this.projection = d3.geoEqualEarth()
                                .fitExtent([[2, 2], [this.svg_width - 2, this.svg_height]], {type: "Sphere"});
        this.path = d3.geoPath(this.projection);

        const data_promise = d3.csv("declaration_per_country.csv").then(data => {
            data = new Map(data.map(d => [d.Country, +d.Percentage]));
            console.log("Data Map:", data);
            return data;
        });

        const map_promise = d3.json("countries-50m.json");

        Promise.all([data_promise, map_promise]).then(values => {
            this.dataMap = values[0];
            this.map = values[1];

            console.log("Value of this.map:", this.map); // Add logging

            this.drawMap();
        });
    }
    drawMap() {
        const world = this.map; // Assign the loaded JSON data directly
    
        const countries = topojson.feature(world, world.objects.countries).features;

        const colorScale = d3.scaleSequentialLog(d3.interpolateYlGnBu)
            .domain([1, d3.max(Array.from(this.dataMap.values()))]);
    
        this.svg.selectAll("path")
            .data(countries)
            .enter().append("path")
            .attr("d", this.path)
            .attr("fill", d => {
                const percentage = this.dataMap.get(d.properties.name) ;
                if (percentage === undefined) {
                    return "black"; // No information available
                } else if (percentage === 0) {
                    return "#ccc"; // Percentage is zero
                } else {
                    return colorScale(percentage); // Color based on percentage
                }
            })
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5)
            .append("title")
            .text(d => { const percentage = this.dataMap.get(d.properties.name) ;
                return `${d.properties.name}\n${percentage !== undefined ? percentage + "%" : "No data"}`;
            });
            
        // Create legend
        const legendWidth = 300;
        const legendHeight = 10;
        const maxPercentage = d3.max(Array.from(this.dataMap.values()));
        const numTicks = Math.min(Math.floor(maxPercentage/10), 10); 

        function logspace(start, end, num) {
            const scale = (Math.log(end) - Math.log(start)) / (num - 1);
            return Array.from({length: num}, (_, i) => Math.exp(Math.log(start) + (i * scale)));
        }
    
        const x = d3.scaleLog()
            .domain([1, maxPercentage])
            .range([0, legendWidth]);
    
        const xAxis = d3.axisBottom(x)
            .tickValues(logspace(1, maxPercentage,numTicks)) 
            .tickFormat(d3.format(".0f"));
    
        const legend = this.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${this.svg_width - legendWidth - 20}, ${this.svg_height - 30})`);
    
        legend.append("g")
            .selectAll("rect")
            .data(d3.range(legendWidth))
            .enter().append("rect")
            .attr("x", d => d)
            .attr("y", 0)
            .attr("width", 1)
            .attr("height", legendHeight)
            .attr("fill", d => colorScale(x.invert(d)));
    
        legend.append("g")
            .attr("transform", `translate(0, ${legendHeight})`)
            .call(xAxis);
    }
}

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