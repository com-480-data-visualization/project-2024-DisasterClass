// Load the JSON data
d3.json('src/bubble/disasters.json').then(data => {
    const margin = {top: 20, right: 30, bottom: 80, left: 80}, // Increased bottom margin
          width = 1000 - margin.left - margin.right,
          height = 600 - margin.top - margin.bottom;

    const svg = d3.select("#chart-bubble")
                  .append("svg")
                  .attr("width", width + margin.left + margin.right)
                  .attr("height", height + margin.top + margin.bottom)
                  .append("g")
                  .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLog().range([0, width]).base(10).domain([1, 326545776.0]); // Adjusted x domain
    const y = d3.scaleLog().range([height, 0]).base(10).domain([1, 227290.0]); // Adjusted y domain
    const z = d3.scaleLog().range([5, 70]).base(10).domain([1, 293662685.0]); // Adjusted z domain

    const disasterColors = {
        'Earthquake': 'brown',
        'Flood': 'blue',
        'Storm': 'gray',
        'Drought': 'yellow',
        'Wildfire': 'red',
        'Volcanic activity': 'orange',
        'Extreme temperature': 'purple',
    };

    const xAxis = d3.axisBottom(x).ticks(10, d3.format(",d")); // Increased number of ticks
    const yAxis = d3.axisLeft(y).ticks(10, d3.format(",d"));

    svg.append("g")
       .attr("class", "x-axis")
       .attr("transform", `translate(0, ${height})`);

    svg.append("g")
       .attr("class", "y-axis");

    svg.append("text")
       .attr("class", "axis-label")
       .attr("text-anchor", "end")
       .attr("x", width - 10) // Adjusted x position for axis label
       .attr("y", height + 60) // Adjusted y position for axis label
       .append("tspan")
       .attr("x", width - 10)
       .attr("dy", "1em")
       .text("Total Damage, Adjusted ('000 US$)");

    svg.append("text")
       .attr("class", "axis-label")
       .attr("text-anchor", "end")
       .attr("transform", "rotate(-90)")
       .attr("y", -60)  // Adjusted y position
       .attr("x", -margin.top)
       .text("Total Deaths");

    // Add the year text element
    const yearText = svg.append("text")
                        .attr("class", "year-text")
                        .attr("x", width / 2)
                        .attr("y", height / 2)
                        .text("1980");

    const tooltip = d3.select("body").append("div")   
                      .attr("class", "tooltip")               
                      .style("position", "absolute")
                      .style("text-align", "center")
                      .style("width", "120px")
                      .style("height", "auto")
                      .style("padding", "5px")
                      .style("font", "12px sans-serif")
                      .style("background", "lightsteelblue")
                      .style("border", "0px")
                      .style("border-radius", "8px")
                      .style("pointer-events", "none")
                      .style("opacity", 0);

    function parseData(data) {
        const parsedData = [];
        const disasterTypes = new Set();

        data.forEach(disaster => {
            const type = disaster.name;
            disasterTypes.add(type);
            const damageData = disaster["Total Damage, Adjusted ('000 US$)"];
            const affectedData = disaster["Total Affected"];
            const deathsData = disaster["Total Deaths"];

            damageData.forEach((d, i) => {
                const year = d[0];
                const damage = d[1] || 1;  // Replace zero with a small positive number
                const affected = affectedData[i][1] || 1;
                const deaths = deathsData[i][1] || 1;

                parsedData.push({
                    type: type,
                    year: year,
                    damage: damage,
                    affected: affected,
                    deaths: deaths
                });
            });
        });

        createLegend(disasterTypes);
        return parsedData;
    }

    const parsedData = parseData(data);

    // Find the maximum affected value across all years for the z scale domain
    const maxAffected = d3.max(parsedData, d => d.affected);

    function createLegend(disasterTypes) {
        const legendContent = d3.select("#legend-content");
        disasterTypes.forEach(type => {
            legendContent.append("div")
                         .html(`<span class="legend-color" style="background-color: ${disasterColors[type]}; opacity: 0.8;"></span>${type}`);
        });
    }

    function updateChart(year) {
        const yearData = parsedData.filter(d => d.year === year);

        z.domain([1, maxAffected]); // Use the maximum affected value across all years

        svg.select(".x-axis")
           .transition()
           .duration(1000) // Slower transition duration
           .call(xAxis)
           .selectAll("text") // Rotate x-axis labels
           .style("text-anchor", "end")
           .attr("dx", "-0.8em")
           .attr("dy", "0.15em")
           .attr("transform", "rotate(-65)");

        svg.select(".y-axis")
           .transition()
           .duration(1000) // Slower transition duration
           .call(yAxis);

        const bubbles = svg.selectAll(".bubble")
                           .data(yearData, d => d.type);

        bubbles.enter()
               .append("circle")
               .attr("class", "bubble")
               .attr("cx", d => x(d.damage))
               .attr("cy", d => y(d.deaths))
               .attr("r", d => z(d.affected))
               .style("fill", d => disasterColors[d.type] || 'black')
               .style("fill-opacity", 0.8) // Make the fill semi-transparent
               .style("stroke", "#000") // Add stroke to the bubbles
               .style("stroke-width", 1) // Set stroke width
               .on("mouseover", (event, d) => {
                   d3.select(event.currentTarget).raise(); // Bring the hovered bubble to the front
                   tooltip.transition()        
                          .duration(200)      
                          .style("opacity", .9);      
                   tooltip.html(`<strong>Type:</strong> ${d.type}<br>
                                 <strong>Damage:</strong> $${(d.damage - 1).toLocaleString()}<br>
                                 <strong>Deaths:</strong> ${(d.deaths - 1).toLocaleString()}<br>
                                 <strong>Affected:</strong> ${(d.affected - 1).toLocaleString()}`)  
                          .style("left", (event.pageX + 10) + "px")     
                          .style("top", (event.pageY - 28) + "px");    
               })
               .on("mousemove", (event) => {
                   tooltip.style("left", (event.pageX + 10) + "px")
                          .style("top", (event.pageY - 20) + "px");
               })
               .on("mouseout", () => {
                   tooltip.transition()        
                          .duration(500)      
                          .style("opacity", 0); 
               })
               .merge(bubbles)
               .transition()
               .duration(1500) // Slower transition duration
               .attr("cx", d => x(d.damage))
               .attr("cy", d => y(d.deaths))
               .attr("r", d => z(d.affected))
               .style("fill", d => disasterColors[d.type] || 'black')
               .style("fill-opacity", 0.8) // Make the fill semi-transparent
               .style("stroke", "#000") // Add stroke to the bubbles
               .style("stroke-width", 1); // Set stroke width

        bubbles.exit().remove();

        // Update the year text
        yearText.text(year);
    }

    let currentYear = 1980;
    let interval;
    let isPlaying = false;

    function animateChart() {
        updateChart(currentYear);
        d3.select("#yearSlider").property("value", currentYear);
        d3.select("#yearLabel").text(currentYear);
        currentYear++;
        if (currentYear > 2022) {
            clearInterval(interval);
            isPlaying = false;
            d3.select("#playButton-bubble").html('<i class="fas fa-play"></i>');
            currentYear = 1980;  // Reset year to the beginning
        }
    }

    d3.select("#playButton-bubble").on("click", function() {
        if (isPlaying) {
            clearInterval(interval);
            d3.select(this).html('<i class="fas fa-play"></i>');
        } else {
            if (currentYear > 2022) {
                currentYear = 1980; // Reset year if it's past the end
            }
            interval = setInterval(animateChart, 2000); // Set interval for continuous animation
            d3.select(this).html('<i class="fas fa-pause"></i>');
        }
        isPlaying = !isPlaying;
    });

    d3.select("#yearSlider").on("input", function() {
        clearInterval(interval);
        isPlaying = false;
        d3.select("#playButton-bubble").html('<i class="fas fa-play"></i>');
        currentYear = +this.value;
        d3.select("#yearLabel").text(currentYear);
        updateChart(currentYear);
    });

    updateChart(currentYear);
});
