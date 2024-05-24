// // Load the data
// d3.csv("data_grouped.csv").then(data => {
//     // Helper function to convert strings to numbers and handle empty values
//     function toNumber(value) {
//         return value === "" ? 0 : +value;
//     }

//     // Parse the data and aggregate by disaster type and year
//     const aggregatedData = d3.rollups(
//         data,
//         v => ({
//             StartYear: +v[0]["Start Year"],
//             DisasterType: v[0]["Disaster Type"],
//             TotalDeaths: d3.sum(v, d => toNumber(d["Total Deaths"])),
//             TotalAffected: d3.sum(v, d => toNumber(d["Total Affected"])),
//             TotalDamageAdjusted: d3.sum(v, d => toNumber(d["Total Damage, Adjusted ('000 US$)"]))
//         }),
//         d => d["Start Year"],
//         d => d["Disaster Type"]
//     ).flatMap(([year, types]) => types.map(([type, values]) => values));

//     const width = 800;
//     const height = 600;
//     const margin = { top: 20, right: 30, bottom: 30, left: 40 };

//     const svg = d3.select("svg")
//         .attr("width", width + margin.left + margin.right)
//         .attr("height", height + margin.top + margin.bottom)
//         .append("g")
//         .attr("transform", `translate(${margin.left},${margin.top})`);

//     // Set up scales
//     const xScale = d3.scaleLinear()
//         .domain([0, d3.max(aggregatedData, d => d.TotalDamageAdjusted)])
//         .range([0, width]);

//     const yScale = d3.scaleLinear()
//         .domain([0, d3.max(aggregatedData, d => d.TotalDeaths)])
//         .range([height, 0]);

//     const sizeScale = d3.scaleSqrt()
//         .domain([0, d3.max(aggregatedData, d => d.TotalAffected)])
//         .range([0, 40]);

//     const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

//     const xAxis = d3.axisBottom(xScale).tickFormat(d => d3.format("$.2s")(d * 1000)); // Format the x-axis labels as currency
//     const yAxis = d3.axisLeft(yScale);

//     svg.append("g")
//         .attr("transform", `translate(0,${height})`)
//         .call(xAxis);

//     svg.append("g")
//         .call(yAxis);

//     // Initial year
//     let currentYear = 1960;
//     const minYear = 1960;
//     const maxYear = d3.max(aggregatedData, d => d.StartYear);

//     // Create the bubbles
//     const circles = svg.selectAll(".bubble")
//         .data(aggregatedData)
//         .enter()
//         .append("circle")
//         .attr("class", "bubble")
//         .attr("cx", d => xScale(d.TotalDamageAdjusted))
//         .attr("cy", d => yScale(d.TotalDeaths))
//         .attr("r", d => sizeScale(d.TotalAffected))
//         .style("fill", d => colorScale(d.DisasterType));

//     // Add labels for disaster types
//     svg.selectAll(".label")
//         .data(aggregatedData)
//         .enter()
//         .append("text")
//         .attr("class", "label")
//         .attr("x", d => xScale(d.TotalDamageAdjusted))
//         .attr("y", d => yScale(d.TotalDeaths))
//         .attr("dy", ".35em")
//         .text(d => d.DisasterType)
//         .style("text-anchor", "middle");

//     // Animation control
//     let isPlaying = false;
//     let intervalId;

//     // Update function to re-render bubbles based on updated data
//     function update(year) {
//         const filteredData = aggregatedData.filter(d => d.StartYear <= year);

//         const circles = svg.selectAll(".bubble")
//             .data(filteredData, d => d.DisasterType);

//         circles.enter()
//             .append("circle")
//             .attr("class", "bubble")
//             .attr("cx", d => xScale(d.TotalDamageAdjusted))
//             .attr("cy", d => yScale(d.TotalDeaths))
//             .attr("r", d => sizeScale(d.TotalAffected))
//             .style("fill", d => colorScale(d.DisasterType))
//             .merge(circles)
//             .transition()
//             .duration(1000)
//             .attr("cx", d => xScale(d.TotalDamageAdjusted))
//             .attr("cy", d => yScale(d.TotalDeaths))
//             .attr("r", d => sizeScale(d.TotalAffected));

//         circles.exit().remove();
//     }

//     // Animation function
//     function animate() {
//         if (isPlaying) {
//             if (currentYear <= maxYear) {
//                 update(currentYear);
//                 currentYear += 1;
//                 intervalId = setTimeout(animate, 2000);
//             } else {
//                 isPlaying = false;
//                 d3.select("#play-button").text("Play");
//             }
//         }
//     }

//     // Play button event listener
//     d3.select("#play-button").on("click", function() {
//         isPlaying = !isPlaying;
//         if (isPlaying) {
//             d3.select(this).text("Pause");
//             animate();
//         } else {
//             d3.select(this).text("Play");
//             clearTimeout(intervalId);
//         }
//     });
// });
