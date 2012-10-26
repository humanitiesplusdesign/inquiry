/* BASIC STATS - THE VIEWS
* Using d3 and polymaps lybraries by M Bostock
*/

(function(){

	bst.view = {};

	//----- THE BUBBLE VIEW ------/

	bst.view.bubble = function(t) {

		var bubble = {}
		t = t,
		p = 5,
		w = parseInt(t.style("width")) - p*2,
		h = parseInt(t.style("height")) - p*2

		bubble.update = function(data, color) {

			var valuesArray = []

			for (var e in data)
			valuesArray.push({"name":e,"value":data[e]})

			bst.data.sortOn(valuesArray,"value", -1)

			var data = {}

			for (var i in valuesArray)
			data[valuesArray[i].name] = valuesArray[i].value

			t.selectAll("svg").remove();


			var format = d3.format(",d"),
			fill = d3.scale.category20c();

			var b = d3.layout.pack()
			.sort(null)
			.size([w, h]);

			var vis = t.append("svg:svg")
			.attr("width", w)
			.attr("height", h)
			.attr("class", "bubble");


			var node = vis.selectAll("g.node")
			.data(b(classes(data))
			.filter(function(d) { return !d.children; }))
			.enter().append("svg:g")
			.attr("class", "node")
			.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

			node.append("svg:title")
			.text(function(d) { return d.data.className + ": " + format(d.value); });

			node.append("svg:circle")
			.attr("r", function(d) { return d.r; })
			.style("fill", color)
			.on("click", clickFactory(d.data.className))
			.on("mouseover", function(){ d3.select(event.target).style("stroke", "#000") })
			.on("mouseout", function(){ d3.select(event.target).style("stroke", color) })


			node.append("svg:text")
			.attr("text-anchor", "middle")
			.attr("dy", ".3em")
			.text(function(d) { return d.data.className.substring(0, d.r / 3); })
			.on("click", clickFactory(d.data.className))//clickFactory(d.data.className)})

			bubble.updated()

			return bubble;

			function clickFactory(d) {

				return function(d) {
					bubble.clicked(d)
				}
			}

		}

		bubble.updated = function() {}

		bubble.clicked = function() {}

		// Returns a flattened hierarchy containing all leaf nodes under the root.
		function classes(root) {
			var classes = [];

			function recurse(name, node) {
				for (var childName in node) {
					var child = node[childName];
					if (isNaN(child)) {
						recurse(childName, child);
					} else {
						classes.push({
							className: childName,
							packageName: name,
							value: child
						});
					}
				}
			}

			recurse(null, root);
			return {children: classes};
		}

		bubble.updated()

		return bubble;
	}


	//----- THE MAP VIEW ------/

	bst.view.map = function(t) {

		var map = {

			m : {},
			elements : {}
		},

		p = 5,
		cloudmadeURL = "http://tile.cloudmade.com/1a1b06b230af4efdbb989ea99e9841af/20760/256/{Z}/{X}/{Y}.png",
		po = org.polymaps,
		t = t,
		w = parseInt(t.style("width")) - p*2,
		h = parseInt(t.style("height")) - p*2



		map.update = function(data,color) {

			var siz = data.length > 1 ? d3.scale.linear().domain([bst.data.minOf(data,"properties.count"), bst.data.maxOf(data,"properties.count")]).range([3, 50]) : function(d) {return 50}

			if(t.selectAll("svg")[0].length == 0) {


				var svg = po.svg("svg")
				d3.select(svg)
				.attr("width",w)
				.attr("height",h);

				t[0][0].appendChild(svg);

				// create our map
				map.m = po.map()
				.container(svg)
				.center( { 
					lat: 48.856667,
					lon: 2.350833 
				})
				.add(po.drag())
				.add(po.wheel())
				.zoom(3)
				//.add(po.hash());

				map.m.add(po.image()
				.url(po.url(cloudmadeURL)));

				// add the compass for navigation
				map.m.add(po.compass()
				.pan("none"));


				map.elements = po.geoJson()
				.features(data)
				.on("load", mah)
				//	.on("load",load)
				//    .zoom(5)
				.clip(false)

				map.m.add(map.elements)

			} else {
				map.m.remove(map.elements)
				map.elements = {}
				map.elements = po.geoJson()
				.features(data)
				.on("load", mah)
				.clip(false)

				map.m.add(map.elements)
			}	


			function mah(e){

				for (var i = 0; i < e.features.length; i++) {
					var feature = e.features[i];

					feature.element.setAttribute("r",siz(feature.data.properties.count));

					var c = feature.element.appendChild(po.svg("circle"))
					c.setAttribute("cx", 20)
					c.setAttribute("cy", 20)
					c.setAttribute("r",feature.data.properties.count);
					feature.element.appendChild(po.svg("title")
					.appendChild(document.createTextNode(feature.data.properties.name+": "+feature.data.properties.count))
					.parentNode);

					feature.element.setAttribute("fill",color)

					d3.select(feature.element).on("mouseover", function(){ d3.select(event.target).style("fill", "#000") })
					d3.select(feature.element).on("mouseout", function(){ d3.select(event.target).style("fill", color) })
					d3.select(feature.element).on("click", clickFactory(feature.data.properties.name))

				}
				map.updated();

			}

			function clickFactory(d) {

				return function() {
					console.log(d)
					map.clicked(d)
				}
			}


			function load(e) {
				var cluster = e.tile.cluster || (e.tile.cluster = kmeans()
				.iterations(16)
				.size(64));

				for (var i = 0; i < e.features.length; i++) {
					cluster.add(e.features[i].data.geometry.coordinates);
				}

				var tile = e.tile, g = tile.element;
				while (g.lastChild) g.removeChild(g.lastChild);

				var means = cluster.means();
				means.sort(function(a, b) { return b.size - a.size; });
				for (var i = 0; i < means.length; i++) {
					var mean = means[i], point = g.appendChild(po.svg("circle"));
					point.setAttribute("cx", mean.x);
					point.setAttribute("cy", mean.y);
					point.setAttribute("r", 10*Math.pow(2, tile.zoom - 10) * Math.sqrt(mean.size));
				}

				map.updated();
			}

			return map;
		}

		map.updated = function() {

		}

		map.clicked = function() {

		}

		return map;

	}



		//----- THE BARCHART VIEW ------/

		bst.view.barChart = function(t) {

			var barChart = {},
			data = null,
			p = 10,
			w = parseInt(t.style("width")) - p*2,
			h = parseInt(t.style("height")) - p*2,
			t = t;

			var select = {};

			barChart.update = function(data,color) {
				

				t.selectAll("svg").remove();

				var x = d3.scale.linear().domain([getFirst(), getLast()]).range([0, w-w/data.length]),
				y = d3.scale.linear().domain([0, 1]).range([0,h]),
				s = d3.scale.linear().domain([0,w-w/data.length]).range([getFirst(),getLast()]),
				begin = x(getFirst()),
				end = x(getLast());

				var gigi = t.append("div")
				//	.style("width","100px")
				.attr("class","rounded")
				.style("position","absolute")
				.style("display","none")
				.style("font-weight","bold")
				.style("color","#f4f4f4")
				.style("padding","5px 7px")
				.style("margin-top","-25px")
				.style("background-color","#555")
				//	.style("text-align","center")
				.html("----")

				var vis = t
				.append("svg:svg")
				.data([data])
				.append("svg:g");

				vis.append("svg:rect")
				.attr("width",w)
				.attr("height",h);

				vis.append("svg:rect")
				.attr("width",w)
				.attr("height",h-1)
				.attr("class","back")

				var rules = vis.selectAll("g.rule")
				.data(x.ticks(10))
				.enter().append("svg:g")
				.attr("class", "rule");

				rules.append("svg:line")
				.attr("x1", x)
				.attr("x2", x)
				.attr("y1", 0)
				.attr("y2", h - 1);

				rules.append("svg:line")
				.attr("class", function(d) { return d ? null : "axis"; })
				.attr("y1", y)
				.attr("y2", y)
				.attr("x1", 0)
				.attr("x2", w);

				rules.append("svg:text")
				.attr("x", x)
				.attr("y", h + 3)
				.attr("dy", ".71em")
				.attr("text-anchor", "left")
				.text(function(d) {return d});

				rules.append("svg:text")
				.attr("y", y)
				.attr("x", 0)
				.attr("dy", ".35em")
				.attr("text-anchor", "end")
				.text(y.tickFormat());
	/*
				var area = vis.append("svg:path")
				.attr("class", "area")
				.style("fill",color)
				.attr("d", d3.svg.area()
				.x(function(d) { return x(d.x); })
				.y0(h - 1)
				.y1(function(d) { return y(d.y); }))

	*/
				var bars = vis.selectAll("rect")
					.data(data)
					.enter()
					.append("svg:rect")
					.attr("x", function(d){ return x(d.x); })
					.attr("y", function(d){ return h-y(d.y); })
					.attr("width",w/data.length-1)
					.attr("height", function(d){ return y(d.y); })
					.style("fill",color)
					.append("svg:title")
						.text(function(d) { return d.x+": "+d.real; });


				var leftArea = vis.append("svg:rect")
				.attr("x",0)
				.attr("height", h)
				.attr("width", begin)


				var leftBar = vis.append("svg:line")
				.attr("x1",begin)
				.attr("x2",begin)
				.attr("y1",0)
				.attr("y2",h-1)
				.on("mousedown",mousedown)


				var rightArea = vis.append("svg:rect")
				.attr("x",end+w/data.length)
				.attr("height", h)
				.attr("width", w-end)

				var rightBar = vis.append("svg:line")
				.attr("x1",end+w/data.length)
				.attr("x2",end+w/data.length)
				.attr("y1",0)
				.attr("y2",h-1)
				.on("mousedown",mousedown)

				leftArea.attr("width", leftBar.attr("x1"))
				rightArea
				.attr("width", w-rightBar.attr("x1"))
				.attr("x", rightBar.attr("x1"))

				d3.select(window)
				.on("mousemove", mousemove)
				.on("mouseup", mouseup);



				var target, x1;

				function mousedown() {
					target = this;
					d3.event.preventDefault();

				}

				function mousemove() {

					if(!target)
					return; 

					x1 = d3.svg.mouse(target);

					x1[0] = Math.max(p/2, Math.min(w - p/2, x1[0]));

					d3.select(target)
					.attr("x1",x1[0])
					.attr("x2",x1[0])

					leftArea.attr("width", leftBar.attr("x1"))
					rightArea
					.attr("width", w-rightBar.attr("x1"))
					.attr("x", rightBar.attr("x1"))

					gigi.style("left", (x1[0]-11)+"px")
					.style("display","block")
					.html(Math.round(s(x1[0]-w/data.length/2)))


				}

				function mouseup() {

					if(!target) return;
					target = null;
					
					barChart.updated({"range" : [Math.round(s(leftBar.attr("x1")-w/data.length/2)),Math.round(s(rightBar.attr("x1")-w/data.length/2))]});
					gigi.style("display","none")

					// clear

				}

				function getFirst() {

					for(var i in data) {
						if(data[i].y > 0) {
							return data[i].x;
						}
					}	
				}

				function getLast() {

					for(var i=data.length-1; i>0; i--) {
						if(data[i].y > 0) {
							return data[i].x;
						}
					}
				}

				barChart.updated({"range" : [Math.round(s(leftBar.attr("x1")-w/data.length/2)),Math.round(s(rightBar.attr("x1")-w/data.length/2))]});
				return barChart;

			}

			barChart.updated = function() {
				//
			}

			barChart.data = function(d) {

				if(!d) return data;
				data = d;

				return barChart;

			}

			return barChart;
		}





	//----- THE AREA VIEW ------/

	bst.view.areaChart = function(t) {

		var areaChart = {},
		data = null,
		p = 10,
		w = parseInt(t.style("width")) - p*2,
		h = parseInt(t.style("height")) - p*2,
		t = t;

		var select = {};

		areaChart.update = function(data,color) {

			t.selectAll("svg").remove();

			var x = d3.scale.linear().domain([getFirst(), getLast()]).range([0, w]),
			y = d3.scale.linear().domain([0, 1]).range([h, 0]),
			s = d3.scale.linear().domain([p,w]).range([getFirst(),getLast()]),
			begin = x(getFirst()),
			end = x(getLast());

			var gigi = t.append("div")
			//	.style("width","100px")
			.attr("class","rounded")
			.style("position","absolute")
			.style("display","none")
			.style("font-weight","bold")
			.style("color","#f4f4f4")
			.style("padding","5px 7px")
			.style("margin-top","-25px")
			.style("background-color","#555")
			//	.style("text-align","center")
			.html("----")

			var vis = t
			.append("svg:svg")
			.data([data])
			.append("svg:g");

			vis.append("svg:rect")
			.attr("width",w)
			.attr("height",h);

			vis.append("svg:rect")
			.attr("width",w)
			.attr("height",h-1)
			.attr("class","back")


			var rules = vis.selectAll("g.rule")
			.data(x.ticks(10))
			.enter().append("svg:g")
			.attr("class", "rule");



			rules.append("svg:line")
			.attr("x1", x)
			.attr("x2", x)
			.attr("y1", 0)
			.attr("y2", h - 1);

			rules.append("svg:line")
			.attr("class", function(d) { return d ? null : "axis"; })
			.attr("y1", y)
			.attr("y2", y)
			.attr("x1", 0)
			.attr("x2", w);

			rules.append("svg:text")
			.attr("x", x)
			.attr("y", h + 3)
			.attr("dy", ".71em")
			.attr("text-anchor", "middle")
			.text(function(d) {return d});

			rules.append("svg:text")
			.attr("y", y)
			.attr("x", -3)
			.attr("dy", ".35em")
			.attr("text-anchor", "end")
			.text(y.tickFormat());

			var area = vis.append("svg:path")
			.attr("class", "area")
			.style("fill",color)
			.attr("d", d3.svg.area()
			.x(function(d) { return x(d.x); })
			.y0(h - 1)
			.y1(function(d) { return y(d.y); }))


			var leftArea = vis.append("svg:rect")
			.attr("x",0)
			.attr("height", h)
			.attr("width", begin)


			var leftBar = vis.append("svg:line")
			.attr("x1",begin)
			.attr("x2",begin)
			.attr("y1",0)
			.attr("y2",h-1)
			.on("mousedown",mousedown)


			var rightArea = vis.append("svg:rect")
			.attr("x",end)
			.attr("height", h)
			.attr("width", w-end)

			var rightBar = vis.append("svg:line")
			.attr("x1",end)
			.attr("x2",end)
			.attr("y1",0)
			.attr("y2",h-1)
			.on("mousedown",mousedown)

			leftArea.attr("width", leftBar.attr("x1"))
			rightArea
			.attr("width", w-rightBar.attr("x1"))
			.attr("x", rightBar.attr("x1"))

			d3.select(window)
			.on("mousemove", mousemove)
			.on("mouseup", mouseup);



			var target, x1;

			function mousedown() {
				target = this;
				d3.event.preventDefault();

			}

			function mousemove() {

				if(!target)
				return; 

				x1 = d3.svg.mouse(target);

				x1[0] = Math.max(p/2, Math.min(w - p/2, x1[0]));

				d3.select(target)
				.attr("x1",x1[0])
				.attr("x2",x1[0])

				leftArea.attr("width", leftBar.attr("x1"))
				rightArea
				.attr("width", w-rightBar.attr("x1"))
				.attr("x", rightBar.attr("x1"))

				gigi.style("left", (x1[0]-11)+"px")
				.style("display","block")
				.html(Math.round(s(x1[0])))


			}

			function mouseup() {

				if(!target) return;
				target = null;

				areaChart.updated({"range" : [Math.round(s(leftBar.attr("x1"))),Math.round(s(rightBar.attr("x1")))]});
				gigi.style("display","none")

				// clear

			}

			function getFirst() {

				for(var i in data) {
					if(data[i].y > 0) {
						return data[i].x;
					}
				}	
			}

			function getLast() {

				for(var i=data.length-1; i>0; i--) {
					if(data[i].y > 0) {
						return data[i].x;
					}
				}
			}

			areaChart.updated({"range" : [Math.round(s(leftBar.attr("x1"))),Math.round(s(rightBar.attr("x1")))]});
			return areaChart;

		}

		areaChart.updated = function() {
			//
		}

		areaChart.data = function(d) {

			if(!d) return data;
			data = d;

			return areaChart;

		}

		return areaChart;
	}


	//----- THE NET ON MAP VIEW ------/

	bst.view.mapLink = function(t) {

		var map = {

			m : {},
			elements : {},
			layers : []
		},

		p = 5,
		cloudmadeURL = "http://tile.cloudmade.com/1a1b06b230af4efdbb989ea99e9841af/20760/256/{Z}/{X}/{Y}.png",
		po = org.polymaps,
		t = t


		map.update = function(data, color) {

			var w = parseInt(t.style("width")) - p*2,
			h = parseInt(t.style("height")) - p*2


			var stroke = d3.scale.linear().domain([bst.data.minOf(data.links,"value"), bst.data.maxOf(data.links,"value")]).range([1, 50])

			var siz = data.length > 1 ? d3.scale.linear().domain([bst.data.minOf(data,"properties.count"), bst.data.maxOf(data,"properties.count")]).range([3, 50]) : function(d) {return 50}

			var lines = {}
			lines.map = function(m) {}

			if(t.selectAll("svg")[0].length == 0) {

				//	t.selectAll("svg").remove();
				// attach a svg object to the #map div
				var svg = po.svg("svg")
				d3.select(svg)
				.attr("width",w)
				.attr("height",h);
				// mah... da rivedere
				t[0][0].appendChild(svg);

				// create our map
				map.m = po.map()
				.container(svg)
				.center( { 
					lat: 48.856667,
					lon: 2.350833 
				})
				.add(po.drag())
				.add(po.wheel())
				.zoom(3)
				//.add(po.hash());

				map.m.add(po.image()
				.url(po.url(cloudmadeURL)));

				// add the compass for navigation
				map.m.add(po.compass()
				.pan("none"));


				map.elements = po.geoJson()
				.features(bst.data.geo(data.nodes,"coordinates","name"))
				.on("load", mah)
				//	.on("load",load)
				//    .zoom(5)
				.clip(false)

				map.layers.push(map.elements)

				map.m.add(map.elements)


			} else {

				//	map.m.remove(map.elements)

				map.elements = {}
				map.elements = po.geoJson()
				.features(bst.data.geo(data.nodes,"coordinates","name"))
				.on("load", mah)
				.clip(false)
				map.layers.push(map.elements)

				map.m.add(map.elements)
			}	




			function mah(e){

				var totals = []

				for (var i = 0; i < e.features.length; i++) {
					totals.push(0)
				}


				for ( j = 0; j < data.links.length; j++) {

					var source = e.features[data.links[j].source].data.geometry.coordinates;
					var target = e.features[data.links[j].target].data.geometry.coordinates;

					var left = source.x > target.x ? target : source
					var right = source.x < target.x ? target : source


					var path = e.features[data.links[j].source].element.parentNode.appendChild(po.svg("path"))


					path.setAttribute("d", "M" + left.x + "," + left.y
					+ " C" + (left.x) + "," + (left.y) + " "
					+ (right.x ) + "," + (right.y) + " "
					+ right.x + "," + right.y )

					d3.select(path).style("stroke-width", stroke(data.links[j].value))
					d3.select(path).style("stroke-opacity", .5)
					d3.select(path).style("stroke", color)
					d3.select(path).style("vector-effect", "non-scaling-stroke")
					d3.select(path).style("stroke-linecap", "round")
					d3.select(path).style("fill", "none")

					d3.select(path).on("mouseover", function(){ d3.select(event.target).style("stroke", "#000") })
					d3.select(path).on("mouseout", function(){ d3.select(event.target).style("stroke", color) })
					d3.select(path).on("click", clickFactory(data.links[j].data))


					path.appendChild(po.svg("title")
					.appendChild(document.createTextNode(e.features[data.links[j].source].data.properties.name + " <-> " + e.features[data.links[j].target].data.properties.name + ": "+data.links[j].value))
					.parentNode);

					totals[data.links[j].source] += data.links[j].value;
					totals[data.links[j].target] += data.links[j].value;
				}

				var radius = d3.scale.linear().domain([0, d3.max(totals)]).range([1, 50])


				for (var i = 0; i < e.features.length; i++) {
					var feature = e.features[i];

					feature.element.setAttribute("r", 0)//siz(feature.data.properties.count));
					feature.element.setAttribute("fill", "#fff");

					var c = feature.element.parentNode.appendChild(po.svg("circle"))
					c.setAttribute("cx", feature.data.geometry.coordinates.x)
					c.setAttribute("cy", feature.data.geometry.coordinates.y)
					c.setAttribute("r", radius(totals[i]))//stroke(feature.data.properties.count));
					c.setAttribute("fill", "#fff");
					c.appendChild(po.svg("title")
					.appendChild(document.createTextNode(feature.data.properties.name + ": " + feature.data.properties.data.length))
					.parentNode);

					d3.select(c).on("mouseover", function(){ d3.select(event.target).style("fill", "#000") })
					d3.select(c).on("mouseout", function(){ d3.select(event.target).style("fill", "#fff") })
					d3.select(c).on("click", clickFactory(feature.data.properties.data))

				}

				map.updated();

			}

			function clickFactory(d) {

				return function() {
					map.clicked(d)
				}
			}

			function load(e) {
				var cluster = e.tile.cluster || (e.tile.cluster = kmeans()
				.iterations(16)
				.size(64));

				for (var i = 0; i < e.features.length; i++) {
					cluster.add(e.features[i].data.geometry.coordinates);
				}

				var tile = e.tile, g = tile.element;
				while (g.lastChild) g.removeChild(g.lastChild);

				var means = cluster.means();
				means.sort(function(a, b) { return b.size - a.size; });
				for (var i = 0; i < means.length; i++) {
					var mean = means[i], point = g.appendChild(po.svg("circle"));
					point.setAttribute("cx", mean.x);
					point.setAttribute("cy", mean.y);
					point.setAttribute("r", 10*Math.pow(2, tile.zoom - 10) * Math.sqrt(mean.size));
				}

				map.updated();
			}

			return map;
		}

		map.updated = function() {

		}

		map.clicked = function() {
			
		}

		map.clear = function() {

			for(var l in map.layers)
			map.m.remove(map.layers[l])
		}

		return map;

	}


	//----- THE NET VIEW ------/

	bst.view.net = function(t) {

		var net = {},
		t = t,
		p = 20


		net.update = function(data, color) {
			w = parseInt(t.style("width")) - p*2,
			h = parseInt(t.style("height")) - p*2
			console.log(data)


			var links = data.links;
			var nodes = data.nodes;


			var fill = d3.scale.category20();

			var vis = t.append("svg:svg")
			.attr("width", w)
			.attr("height", h);


			var force = d3.layout.force()
			.charge(-120)
			.distance(30)
			.nodes(nodes)
			.links(links)
			.size([w, h])
			.start();

			var link = vis.selectAll("line.link")
			.data(links)
			.enter().append("svg:line")
			.attr("class", "link")
			.style("stroke-width", function(d) { return Math.sqrt(d.value); })
			.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; });

			var node = vis.selectAll("circle.node")
			.data(nodes)
			.enter().append("svg:circle")
			.attr("class", "node")
			.attr("cx", function(d) { return d.x; })
			.attr("cy", function(d) { return d.y; })
			.attr("r", 5)
			.call(force.drag);

			node.append("svg:title")
			.text(function(d) { return d.name; });

			vis.style("opacity", 1e-6)
			.transition()
			.duration(1000)
			.style("opacity", 1);

			force.on("tick", function() {
				link.attr("x1", function(d) { return d.source.x; })
				.attr("y1", function(d) { return d.source.y; })
				.attr("x2", function(d) { return d.target.x; })
				.attr("y2", function(d) { return d.target.y; });

				node.attr("cx", function(d) { return d.x; })
				.attr("cy", function(d) { return d.y; });
			});


		}

		net.updated = function() {}

		return net;
	}

	})();