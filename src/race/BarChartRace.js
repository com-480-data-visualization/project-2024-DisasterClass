class BarChartRace {
  // Heavily inspired by : https://observablehq.com/@d3/bar-chart-race-explained
  constructor(container, dataUrl, onlyNonHistoric, onlyNaturalDisasters, xVariable, yVariable) {
      this.container = container;
      this.dataUrl = dataUrl;
      
      this.n = 12;
      this.k = 10;
      this.barSize = 70;
      this.dateFontSize = 100;
      this.margin = { top: 40, right: 6, bottom: 6, left: 0 };
      this.width = 800*2; // Set appropriate width for your container
      this.height = this.margin.top + this.barSize * this.n + this.margin.bottom;

      this.onlyNonHistoric = onlyNonHistoric
      this.onlyNaturalDisasters = onlyNaturalDisasters
      this.xVariable = xVariable
      this.yVariable = yVariable

      if (onlyNonHistoric) {
        this.duration = 250;
      } else {
        this.duration = 50;
      }

      if (this.yVariable == 'Disaster Subtype') {
        this.hueVariable = 'Disaster Subgroup';
      } else if (this.yVariable == 'Country') {
        this.hueVariable = 'Subregion';
      }

      this.initChart();
  }

  async initChart() {
      // const data = await d3.csv(this.dataUrl, d3.autoType);
      const data = await this.preProcessCsvData(this.dataUrl)
      this.names = new Set(data.map(d => d.name));
      this.datevalues = Array.from(d3.rollup(data, ([d]) => d.value, d => +d.date, d => d.name))
          .map(([date, data]) => [new Date(date), data])
          .sort(([a], [b]) => d3.ascending(a, b));
      this.setCategoryValues(data)

      this.keyframes = this.getKeyframes();
      this.nameframes = d3.groups(this.keyframes.flatMap(([, data]) => data), d => d.name);
      this.prev = new Map(this.nameframes.flatMap(([, data]) => d3.pairs(data, (a, b) => [b, a])));
      this.next = new Map(this.nameframes.flatMap(([, data]) => d3.pairs(data)));

      this.x = d3.scaleLinear([0, 1], [this.margin.left, this.width - this.margin.right]);
      this.y = d3.scaleBand()
          .domain(d3.range(this.n + 1))
          .rangeRound([this.margin.top, this.margin.top + this.barSize * (this.n + 1 + 0.1)])
          .padding(0.1);

      this.color = this.getColorScale(data);

      this.svg = d3.select(this.container).append("svg")
          .attr("viewBox", [0, 0, this.width, this.height])
          .attr("width", this.width)
          .attr("height", this.height)
          .attr("style", "max-width: 100%; height: auto;");

      this.updateBars = this.bars(this.svg);
      this.updateAxis = this.axis(this.svg);
      this.updateLabels = this.labels(this.svg);
      this.updateTicker = this.ticker(this.svg);

      this.createLegend(this.svg); // Add this line to create the legend

      this.tooltip = d3.select(this.container).append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background-color", "white")
          .style("padding", "5px")
          .style("border", "1px solid #ccc")
          .style("border-radius", "4px")
          .style("pointer-events", "none")
          .style("opacity", 0);

      this.runChart();
  }

  async preProcessCsvData(csvUrl) {
    let data = await d3.csv(csvUrl);
  
    // Filtering data based on conditions
    if (this.onlyNonHistoric) {
      data = data.filter(d => d["Historic"] === 'No');
    }
  
    if (this.onlyNaturalDisasters) {
      data = data.filter(d => d['Disaster Group'] === 'Natural');
    }
  
    // Mapping data and filtering out invalid entries
    let subData = data.map(d => ({
      date: new Date(`${d['Start Year']}-01-01`), // Adjusted to include January 1st
      value: +d[this.xVariable],
      name: d[this.yVariable],
      category: d[this.hueVariable]
    })).filter(d => !isNaN(d.date) && !isNaN(d.value) && d.name && d.category);
  
    // Grouping data and calculating mean values
    const nestedData = d3.groups(subData, d => d.name, d => d.date)
      .map(([name, valuesByDate]) => {
        return valuesByDate.map(([date, values]) => {
          return {
            name: name,
            date: date,
            value: d3.sum(values, v => v.value),
            category: values[0].category
          };
        });
      }).flat();
  
    // Step 1: Calculate the minimum and maximum years in the data
    const years = nestedData.map(d => d.date.getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
  
    // Step 2: Get unique names
    const names = [...new Set(nestedData.map(d => d.name))];
  
    // Step 3: Create a complete list of all possible year entries for each name
    const completeData = [];
  
    names.forEach(name => {
      const nameEntries = nestedData.filter(d => d.name === name);
      const category = nameEntries[0].category; // Assuming category is the same for a name
  
      for (let year = minYear; year <= maxYear; year++) {
        const date = new Date(`${year}-01-01`);
        const entry = nameEntries.find(d => d.date.getTime() === date.getTime());
        if (entry) {
          completeData.push(entry);
        } else {
          completeData.push({ name, date: date, value: 0, category });
        }
      }
    });
  
    // Step 4: Sort the complete data by name and date
    completeData.sort((a, b) => a.name.localeCompare(b.name) || a.date - b.date);
  
    // Step 5: Calculate the cumulative sum and update the value field
    completeData.reduce((acc, current) => {
      if (acc.length === 0 || acc[acc.length - 1].name !== current.name) {
        acc.push(current);
      } else {
        const prev = acc[acc.length - 1];
        current.value += prev.value;
        acc.push(current);
      }
      return acc;
    }, []);
  
    return completeData;
  }

  getColorScale(data) {
      let scale
      if (this.hueVariable == 'Disaster Subgroup') {
        scale = d3.scaleOrdinal(d3.schemeTableau10);
      } else if (this.hueVariable === 'Subregion') {
        const customColors = ["#a35ac7",
        "#5fbe50",
        "#d3479a",
        "#539141",
        "#686cc5",
        "#a9b64b",
        "#cf87c1",
        "#d99d36",
        "#5e99d3",
        "#c7572a",
        "#54c3a8",
        "#d53f53",
        "#3a8961",
        "#a34967",
        "#72752e",
        "#dd8071",
        "#ae7f45"];
        
        scale = d3.scaleOrdinal(customColors);
      }
      
      if (data.some(d => d.category !== undefined)) {
          const categoryByName = new Map(data.map(d => [d.name, d.category]));
          scale.domain(Array.from(categoryByName.values()));
          return d => scale(categoryByName.get(d.name));
      }
      return d => scale(d.name);
  }

  getKeyframes() {
      const keyframes = [];
      let ka, a, kb, b;
      for ([[ka, a], [kb, b]] of d3.pairs(this.datevalues)) {
          for (let i = 0; i < this.k; ++i) {
              const t = i / this.k;
              keyframes.push([
                  new Date(ka * (1 - t) + kb * t),
                  this.rank(name => (a.get(name) || 0) * (1 - t) + (b.get(name) || 0) * t)
              ]);
          }
      }
      keyframes.push([new Date(kb), this.rank(name => b.get(name) || 0)]);
      return keyframes;
  }

  setCategoryValues(data) {
    // Extract unique categories from data
    const uniqueCategories = [...new Set(data.map(d => d.category))];

    // Create an array to store a data point for each unique category
    this.categoryvalues = [];

    // Iterate over unique categories
    uniqueCategories.forEach(category => {
        // Find the first data point with the current category
        const dataPoint = data.find(d => d.category === category);
        // If a data point is found, push it to categoryvalues
        if (dataPoint) {
            this.categoryvalues.push(dataPoint);
        }
    });
  }

  rank(value) {
      const data = Array.from(this.names, name => ({ name, value: value(name) }));
      data.sort((a, b) => d3.descending(a.value, b.value));
      for (let i = 0; i < data.length; ++i) data[i].rank = Math.min(this.n, i);
      return data;
  }

  bars(svg) {
      let bar = svg.append("g")
          .attr("fill-opacity", 0.6)
          .selectAll("rect");

      return ([date, data], transition) => bar = bar
          .data(data.slice(0, this.n), d => d.name)
          .join(
              enter => enter.append("rect")
                  .attr("fill", d => this.color(d)) // Use color function
                  .attr("height", this.y.bandwidth())
                  .attr("x", this.x(0))
                  .attr("y", d => this.y((this.prev.get(d) || d).rank))
                  .attr("width", d => this.x((this.prev.get(d) || d).value) - this.x(0)),
                  // .on("mouseover", (event, d) => this.showTooltip(event, d))
                  // // .on("mousemove", (event, d) => this.showTooltip(event, d))
                  // .on("mouseout", () => this.hideTooltip()),
              update => update,
              exit => exit.transition(transition).remove()
                  .attr("y", d => this.y((this.next.get(d) || d).rank))
                  .attr("width", d => this.x((this.next.get(d) || d).value) - this.x(0))
          )
          .call(bar => bar.transition(transition)
              .attr("y", d => this.y(d.rank))
              .attr("width", d => this.x(d.value) - this.x(0)));
              // .on("mousemove", (event, d) => {
              //     // Get the current interpolated value
              //     const interpolatedValue = this.x.invert(d3.select(event.target).attr("width"));
              //     this.moveTooltip(event, d, interpolatedValue);
              // });
  }

  labels(svg) {
      let label = svg.append("g")
          .style("font", "bold 12px var(--sans-serif)")
          .style("font-variant-numeric", "tabular-nums")
          .attr("text-anchor", "end")
          .selectAll("text");

      return ([date, data], transition) => label = label
          .data(data.slice(0, this.n), d => d.name)
          .join(
              enter => enter.append("text")
                  .attr("transform", d => `translate(${this.x((this.prev.get(d) || d).value)},${this.y((this.prev.get(d) || d).rank)})`)
                  .attr("y", this.y.bandwidth() / 2)
                  .attr("x", -6)
                  .attr("dy", "-0.25em")
                  .text(d => d.name)
                  .call(text => text.append("tspan")
                    .attr("fill-opacity", 0.7)
                    .attr("font-weight", "normal")
                    .attr("x", -6)
                    .attr("dy", "1.15em"))
                  // Add event listeners for tooltips
                  .on("mouseover", (event, d) => this.showTooltip(event, d))
                  // .on("mousemove", (event, d) => this.moveTooltip(event, d))
                  .on("mouseout", () => this.hideTooltip()),
              update => update,
                // // Add event listeners for tooltips
                // .on("mouseover", (event, d) => this.showTooltip(event, d))
                // .on("mousemove", (event, d) => this.moveTooltip(event, d))
                // .on("mouseout", () => this.hideTooltip()),
              exit => exit.transition(transition).remove()
                  .attr("transform", d => `translate(${this.x((this.next.get(d) || d).value)},${this.y((this.next.get(d) || d).rank)})`)
                  .call(g => g.select("tspan").tween("text", d => this.textTween(d.value, (this.next.get(d) || d).value)))
          )
          .call(bar => bar.transition(transition)
          .attr("transform", d => `translate(${this.x(d.value)},${this.y(d.rank)})`)
          .call(g => g.select("tspan").tween("text", d => this.textTween((this.prev.get(d) || d).value, d.value)))
          
        );
  }

  textTween(a, b) {
    const i = d3.interpolateNumber(a, b);
    return function (t) {
        this.textContent = d3.format(",d")(i(t));
    };
  }

  axis(svg) {
    const g = svg.append("g")
        .attr("transform", `translate(0,${this.margin.top})`);

    const axis = d3.axisTop(this.x)
        .ticks(4)
        .tickSizeOuter(0)
        .tickSizeInner(-this.barSize * (this.n + this.y.padding()));

    return (_, transition) => {
        g.transition(transition).call(axis);
        g.select(".tick:first-of-type text").remove();
        g.selectAll(".tick:not(:first-of-type) line").attr("stroke", "white");
        g.select(".domain").remove();

        g.selectAll(".tick text")
            .style("font-size", "20px");  // Change the font size here
    };
  }

  ticker(svg) {
    const now = svg.append("text")
        .style("font", `bold ${this.barSize}px var(--sans-serif)`)
        .style("font-variant-numeric", "tabular-nums")
        .style("font-size", `${this.dateFontSize}`)
        .attr("text-anchor", "middle")
        .attr("x", (this.width) /2)
        .attr("y", this.margin.top + this.barSize * (this.n - 0.45))
        .attr("dy", "0.32em")
        .text(d3.utcFormat("%Y")(this.keyframes[0][0]));

    return ([date], transition) => {
        transition.end().then(() => now.text(d3.utcFormat("%Y")(date)));
    };
  }

  async runChart() {
    for (const keyframe of this.keyframes) {
        const transition = this.svg.transition()
            .duration(this.duration)
            .ease(d3.easeLinear);

        this.x.domain([0, keyframe[1][0].value]);

        this.updateAxis(keyframe, transition);
        this.updateBars(keyframe, transition);
        this.updateLabels(keyframe, transition);
        this.updateTicker(keyframe, transition);

        await transition.end();
    }
  }

  createLegend(svg) {
    const legendHeight = this.categoryvalues.length * 30;
    const legend = svg.append("g")
        .attr("text-anchor", "end")
        .attr("transform", `translate(${this.width-20},${this.margin.top + this.margin.bottom + this.barSize*this.n - legendHeight})`)
        .attr("class", "legend");

    legend.selectAll("rect")
        .data(this.categoryvalues)
        .enter()
        .append("rect")
        .attr("y", (d, i) => i * 30)
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", d => this.color(d))
        .attr("fill-opacity", 0.6);

    legend.selectAll("text")
        .data(this.categoryvalues)
        .enter()
        .append("text")
        .attr("x", -6)
        .attr("y", (d, i) => i * 30 + 10)
        .text(d => d.category)
        .style("font-size", "20px")
        .attr("alignment-baseline", "middle");
  }

  showTooltip(event, d) {
    const tooltipColor = this.color(d);
    // Convert tooltipColor to RGBA with lower opacity
    const rgbColor = d3.color(tooltipColor).rgb();
    const rgbaColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.6)`; // 0.8 for 80% opacity

    this.tooltip
        .style("opacity", 1)
        .html(`${d.name}<br>${d3.format(",")(d.value)}`)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 28}px`)
        .style("background-color", rgbaColor);
  }

  // moveTooltip(event, d, value) {
  //     console.log(value)
  //     console.log(d)
  //     console.log(event)
  //     this.tooltip
  //         .html(`${d.name}<br>${d3.format(",")(value)}`)
  //         .style("left", `${event.pageX + 10}px`)
  //         .style("top", `${event.pageY - 28}px`);
  // }

  hideTooltip() {
      this.tooltip.style("opacity", 0);
  }

}

// // Instantiate the BarChartRace class
// document.addEventListener("DOMContentLoaded", function () {
// const container = document.body;
// // const dataUrl = "category-brands.csv"; // Replace with your CSV file path
// const chart = new BarChartRace(container, csvUrl, onlyNonHistoric, onlyNaturalDisasters, xVariable, yVariable, hueVariable);
// });    