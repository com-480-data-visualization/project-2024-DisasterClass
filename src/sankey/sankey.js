const margin = {top: 10, right: 10, bottom: 10, left: 10};
const width = 960 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

const svg = d3.select("#chart-sankey").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const sankey = d3.sankey()
    .nodeWidth(15)
    .nodePadding(10)
    .extent([[1, 1], [width - 1, height - 5]]);

const color = d3.scaleOrdinal(d3.schemeCategory10);

// Tooltip
const tooltip = d3.select("#tooltip");

// Define the order of the months
const monthOrder = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function updateChart() {
    const checkboxes = document.querySelectorAll('.disaster-checkbox');
    const selectedDisasters = Array.from(checkboxes)
                                   .filter(checkbox => checkbox.checked)
                                   .map(checkbox => checkbox.value);

    const selectedHemisphere = document.querySelector('input[name="hemisphere"]:checked').value;

    d3.csv("src/sankey/disasters.csv").then(data => {
        data = data.filter(d => selectedDisasters.includes(d["Disaster Type"]) && d["Hemisphere"] === selectedHemisphere);

        const graph = {nodes: [], links: []};
        const nodesMap = {};

        // Create a set to track unique months
        const monthsSet = new Set();

        data.forEach(d => {
            if (!nodesMap[d["Disaster Type"]]) {
                nodesMap[d["Disaster Type"]] = {name: d["Disaster Type"]};
                graph.nodes.push(nodesMap[d["Disaster Type"]]);
            }
            if (!nodesMap[d["Start Month"]]) {
                nodesMap[d["Start Month"]] = {name: d["Start Month"]};
                graph.nodes.push(nodesMap[d["Start Month"]]);
            }
            graph.links.push({
                source: nodesMap[d["Disaster Type"]],
                target: nodesMap[d["Start Month"]],
                value: +d["Occurrences"]
            });

            // Add the month to the set
            monthsSet.add(d["Start Month"]);
        });

        // Sort the nodes to ensure months are in the correct order
        graph.nodes.sort((a, b) => {
            if (monthOrder.includes(a.name) && monthOrder.includes(b.name)) {
                return monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name);
            }
            return 0;
        });

        // Sort links to ensure consistent rendering
        graph.links.sort((a, b) => {
            if (monthOrder.includes(a.target.name) && monthOrder.includes(b.target.name)) {
                return monthOrder.indexOf(a.target.name) - monthOrder.indexOf(b.target.name);
            }
            return 0;
        });

        sankey(graph);

        svg.selectAll("*").remove();

        const link = svg.append("g")
            .attr("class", "links")
            .attr("fill", "none")
            .attr("stroke", "#000")
            .attr("stroke-opacity", 0.2)
            .selectAll("path")
            .data(graph.links)
            .enter().append("path")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke-width", d => Math.max(1, d.width))
            .on("mouseover", (event, d) => {
                tooltip.transition()
                       .duration(200)
                       .style("opacity", .9);
                tooltip.html(`${d.source.name} → ${d.target.name}<br>Occurrences: ${d.value}`)
                       .style("left", (event.pageX + 5) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", d => {
                tooltip.transition()
                       .duration(500)
                       .style("opacity", 0);
            });

        const node = svg.append("g")
            .attr("class", "nodes")
            .attr("font-family", "sans-serif")
            .attr("font-size", 10)
            .selectAll("g")
            .data(graph.nodes)
            .enter().append("g");

        node.append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", d => color(d.name.replace(/ .*/, "")))
            .attr("stroke", "#000");

        node.append("text")
            .attr("x", d => d.x0 - 6)
            .attr("y", d => (d.y1 + d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "end")
            .text(d => d.name)
            .filter(d => d.x0 < width / 2)
            .attr("x", d => d.x1 + 6)
            .attr("text-anchor", "start");

        node.append("title")
            .text(d => `${d.name}\n${d.value}`);
    });
}

// Add event listeners to checkboxes and radio buttons
document.querySelectorAll('.disaster-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', updateChart);
});

document.querySelectorAll('input[name="hemisphere"]').forEach(radio => {
    radio.addEventListener('change', updateChart);
});

// Initial chart update
updateChart();
