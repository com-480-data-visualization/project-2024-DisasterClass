class World_Map {
    constructor(svg_element_id) {

        this.svg = d3.select('#' + svg_element_id);

		const svg_viewbox = this.svg.node().viewBox.animVal;
		this.svg_width = svg_viewbox.width;
		this.svg_height = svg_viewbox.height;

        // Fit the projection.
        this.projection = d3.geoEqualEarth().fitExtent([[2, this.marginTop + 2], [this.width - 2, this.height]], { type: "Sphere" });
        this.path = d3.geoPath(this.projection);

        // Index the values and create the color scale.
        this.valuemap = new Map(hale.map(d => [d.name, d.hale]));
        this.color = d3.scaleSequential(d3.extent(this.valuemap.values()), d3.interpolateYlGnBu);

        // Append the legend.
        this.svg.append("g")
            .attr("transform", "translate(20,0)")
            .append(() => Legend(this.color, { title: "Healthy life expectancy (years)", width: 260 }));

        // Add a white sphere with a black border.
        this.svg.append("path")
            .datum({ type: "Sphere" })
            .attr("fill", "white")
            .attr("stroke", "currentColor")
            .attr("d", this.path);

        // Add a path for each country and color it according to this data.
        this.svg.append("g")
            .selectAll("path")
            .data(countries.features)
            .join("path")
            .attr("fill", d => this.color(this.valuemap.get(d.properties.name)))
            .attr("d", this.path)
            .append("title")
            .text(d => `${d.properties.name}\n${this.valuemap.get(d.properties.name)}`);

        // Add a white mesh.
        this.svg.append("path")
            .datum(countrymesh)
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("d", this.path);

        return this.svg.node();
    }
}

function whenDocumentLoaded(action) {
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", action);
} else {
    // `DOMContentLoaded` already fired
    action();
}
}

whenDocumentLoaded(() => {
	plot_object = new World_Map('choropleth_map');
	// plot object is global, you can inspect it in the dev-console
});

/*Plot.plot({
projection: "equal-earth",
width: 928,
height: 928 / 2,
color: {scheme: "YlGnBu", unknown: "#ccc", label: "Healthy life expectancy (years)", legend: true},
marks: [
    Plot.sphere({fill: "white", stroke: "currentColor"}),
    Plot.geo(countries, {
    fill: (map => d => map.get(d.properties.name))(new Map(hale.map(d => [d.name, d.hale]))),
    }),
    Plot.geo(countrymesh, {stroke: "white"}),
]
})
*/