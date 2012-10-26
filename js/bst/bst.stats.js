/* BASIC STATS - THE FILTER ENGINGE */
/** Manages the filters */

(function(){

	bst.stats = function(t, callback){

		var stats = {
			target : d3.select(t),
			/* The property of the json associated */
			properties : {},
			objects : {},
			filters : {},
			filterCount : 0,
			last: null,
			color: "#28bbc5",
			/* The api url */
//			url : "./data/api.php" // the api url works actually on data/letters.json
            url : "http://127.0.0.1:8000/api/" // for mongo db
		}
		queryRender = {}
		tableRender = {}

		init(callback);

		/* Init the stats */
		function init(callback) {

			// load the STATS from the api...
			return load(stats.url, "action=query&q={}&count", function(r) {
				// parse the results
				var data = JSON.parse(r);
				// the properties of the json
				stats.properties = data.result.properties;
				// the # of total objects of the json
				stats.objects = data.result;

				// the basic elements of the interface
				stats.target
				.append("div")
				.attr("class","stats overview")
				.append("div")
				.html("Overview")
				.attr("class","stats title")
				.append("div")
				.attr("class","stats count")
				.html(stats.objects)

				stats.target
				.append("form")
				.attr("id","colorPicker")
				.append("input")
				.attr("class","color")
				.attr("id","color1")
				.attr("type","color")
				.attr("value","#28bbc5")
				.attr("data-hex","true")

				stats.target
				.append("div")
				.attr("class","ajaxloading")

				stats.target
				.append("div")
				.attr("class","stats filters")

				queryRender = stats.target
				.append("input")
				.attr("type","text")
				.attr("class","stats query")
				.attr("disabled","disabled")
				.attr("class","query");

				tableRender = stats.target
				.append("div")
				.attr("id","datatable")
				.attr("class","stats datatable")
				.style("display","none")

				// init the color picker
				initColorPicker()
				// the callback
				if (callback) callback();

			})

		}

		// init the jQuery colorpicker
		function initColorPicker() {

			if ($.fn.mColorPicker.init.replace == '[type=color]') {

				$('input').filter(function(index) {
					return this.getAttribute("type") == 'color';
					}).mColorPicker();

					$(document).bind('ajaxSuccess', function () {

						$('input').filter(function(index) {

							return this.getAttribute("type") == 'color';
							}).mColorPicker();
						});

					} else if ($.fn.mColorPicker.init.replace) {

						$('input' + $.fn.mColorPicker.init.replace).mColorPicker();

						$(document).bind('ajaxSuccess', function () {

							$('input' + $.fn.mColorPicker.init.replace).mColorPicker();
						});
					}

					// init the listener on color change...
					$('#color1').bind("colorpicked",function(){

						stats.color = $(this)[0].value

						var children = d3.select(".stats.filters").node().childNodes;

						for (var i=0; i < children.length; i++) {
							var f = $(children[i]).data().filter;

							f.color = stats.color;
						}

					})

				}

				// update the filters starting from current
				stats.update = function(d, current) {

					if(current) d.update()

				}

				// update the sort and drag & drop things with jQuery
				stats.updateAccordion = function() {

					// sortables...
					var stop = false;

					$(".filters").sortable("destroy");

					$( ".filters" ).sortable({
						axis: "y",
						items: ".filter.container",
						handle: ".filter.handle",

						stop: function( event, ui ) {
							stop = true;

							var children = d3.select(".stats.filters").node().childNodes;

							for (var i=0; i < children.length; i++) {

								var f = $(children[i]).data().filter;

								if(i==0)
								f.prev = null;
								else {
									f.prev = $(children[i-1]).data().filter
								}

								if(i==children.length-1)  {
									f.next = null;
									stats.last = f}
									else {
										f.next = $(children[i+1]).data().filter
									}						
								}

								stats.update($(children[0]).data().filter,true)
							}

						});

						// draggables...
						$(".count").draggable({
							stop: function(event, ui) {

								d3.select(this).style("left",ui.originalPosition.left)
								d3.select(this).style("top",ui.originalPosition.top)
							}
						});

						// draggables...
						$( ".droppamelo" ).droppable({
							drop: function( event, ui ) {
								//		console.log($(ui.draggable[0]).data())
								$( this )
								.addClass( "ui-state-highlight" )
								.html( "Dropped!" );
							}
						});

					}

					//---------- BEGIN OF THE FILTER -----------

					// Add a new filter on property p
					stats.filter = function(p) {

						var filter = {
							id : stats.filterCount,
							property : p,
							query : {},
							data : {},
							dataNull : {},
							prev : stats.last,
							next : null,
							counter : 0,
							color: stats.color
						},	
						view = null, // just one view for now...
						title = "Filter",
						viewTypes = {"area":"","map":"","bubble":"","nationality":"","barchart":"","correspondent":""}; // the list of possible views

						// a main div for the filter
						filter.container = stats.target.select(".stats.filters")
						.append("div")
						.attr("class","filter container")
						.attr("id","filter-"+filter.id)

						// append the filter to its container
						$(filter.container.node()).data({"filter":filter})

						// the bar to move the filter
						filter.container
						.append("div")
						.attr("class","filter handle")
						.attr("title","Move the filter")

						// the title
						filter.titleRender = filter.container
						.append("div")
						.attr("class","left")
						.append("input")
						.attr("type","button")
						.attr("disabled","disabled")
						.attr("class","filter title");

						// the value text input
						filter.valueRender = filter.container
						.append("div")
						.attr("class","right")
						.append("input")
						.attr("type","text")
						.attr("class","filter value")
						.on("change", function(d) { value = this.value; filter.update(this.value) });

						// the value text input
						filter.queryRender = filter.container
						.append("input")	
						.attr("type","text")
						.attr("class","filter query")
						.attr("disabled","disabled")
						.attr("class","query");

						// the remove button
						filter.container
						.append("input")
						.attr("type","button")
						.attr("class","remove")
						.attr("value","remove")
						.on("click", function() { filter.remove()} );

						// the hide/show button
						filter.refresh = filter.container
						.append("div")
						.html("hide")
						.attr("class","filter refresh")
						.on("click",function() {
							if ( $(filter.viewRender.node()).css("display") == "none"	) {
								$(filter.viewRender.node()).show(100)
								$(filter.refresh.node()).html("hide")
							} else {
								$(filter.viewRender.node()).hide(100)
								$(filter.refresh.node()).html("show")
							}
						})

						// the unknown box showing the number of objects with property null
						filter.nullRender = filter.container
						.append("div")
						.attr("class","filter null")
						.on("click",function(){ bst.stats.showData(filter.dataNull,this)} )

						// the counter box showing the number of objects matching the query
						filter.counterRender = filter.container
						.append("div")
						.attr("class","filter count")
						.on("click",function(){ bst.stats.showData(filter.query, this) })

						// a div to clear the float
						filter.container
						.append("div")
						.style("clear","both")

						// a div for the view
						filter.viewRender = filter.container
						.append("div")
						.style("clear","both")

						// Update the filter with value (v) and the view (upv = false)
						filter.update = function(v, upv) {
						
							//get the timefix
							var mint = parseInt(d3.select("#fromtime").property("value"))
							var maxt = parseInt(d3.select("#totime").property("value"))

							// for the first filter !we need to copy the query but not as a reference
							filter.query = filter.prev ? JSON.parse(JSON.stringify(filter.prev.query)) : {"Date.year":{"$gte":mint,"$lte":maxt}}; // {}
							// if not values are passed use the default = not null
							if (!v) v = $(filter.valueRender.node()).attr("value") ? $(filter.valueRender.node()).attr("value") : {"$ne":"null"};
							if (filter.property == "Date.year") v = {"$gte":mint,"$lte":maxt};
							// TO IMPROVE! in case of special fitlers... 
							filter.query[filter.property] = filter.specialUpdate ? filter.specialUpdate(v): v ;
							// the query
							filter.queryRender.attr("value",JSON.stringify(filter.query));


							// loading the results from the query
							// TODO choose if js or php...

							// LOADING THE DATA
							// the current query is sent to the api url (PHP)
							// for an internal query via JS use this and remove the parsing (results from JS are already objects...)
							// loadLocale(filter.query, function(r) {

								load(stats.url, "action=group&group="+filter.property+"&q="+JSON_stringify(filter.query,false), function(r) {

									// replace with filter.data = r for JS loadLocale
									filter.data = JSON.parse(r).result;
		
									// update the counter
									filter.counterRender.html(d3.sum(d3.values(filter.data)));
									// append the new data to the counter (for d&d)
									$(filter.counterRender[0][0]).data(filter)

									// if there's a view update it
									if( view && !upv ) { view.updateView(); }
									else filter.updated(filter);

								})

								// DO THE SAME THING FOR NULL (unknown) VALUES !!

								var queryNull = JSON.parse(JSON.stringify(filter.query));
								queryNull[filter.property] = "null"

								/*load(stats.url, "action=group&group="+filter.property+"$q="+JSON.stringify(queryNull), function(r) {

									filter.dataNull = JSON.parse(r).result;

									filter.nullRender.html(filter.dataNull.length);

								})*/

							}

							// the listener
							// to be overwritten by bst.stats
							filter.updated = function() {

							}

							// Append a view to the filter
							filter.view = function(type, properties) {

								// check if property exists in our data
								if(!viewTypes.hasOwnProperty(type)) return;

								// TODO: controlling view externally
								switch(type) {



									// BAD! AND BAD REMAINS...
									case "correspondent" :

									filter.viewRender
									.style("width","100%")
									.style("height","600px")
									
									view = bst.view.bubble(filter.viewRender);

									// a listener when the view finish the update
									view.updated = function(d) {
										filter.queryRender.attr("value",JSON.stringify(filter.query))
										filter.updated(filter);				
									};

									// a listener when the view finish the update
									view.updateView = function() { 

										var values = {}
										var giusti = [];
										var sbagliati = []
										v = filter.data
										
										
										filter.query["RecipientMPerson"] =  filter.query[filter.property];
										delete filter.query[filter.property] 

										$.ajax({
											type: "GET",
											url: stats.url,
											data : "action=group&group="+"RecipientMPerson"+"&q="+JSON_stringify(filter.query,false),
											
											success: function(result){
												
												console.log(result);
												

											/*	people = JSON.parse(result);

												for (var j in v) {

													var found = false;

													for (var i in people) {
														if(people[i].id == v[j].authorid && people[i].nationality != "" && people[i].nationality.search("unknown") == -1) {
															found = true
															break;
														}

													}

													if(found) {
														values[people[i].nationality] ? values[people[i].nationality]++ : values[people[i].nationality] = 1;
														giusti.push(v[j])
														} else sbagliati.push(v[j])

													}	

													values["unknown"] += values[""]

													view.update(values,filter.color)

													filter.data = giusti;

													filter.counterRender.html(filter.data.length);
													$(filter.counterRender[0][0]).data(filter);

													filter.dataNull = sbagliati

													filter.nullRender.html(filter.dataNull.length);
*/
												}

											});

										}
										
/*										filter.specialAutoCompleteSource = function(request, response) {

											var q = JSON.parse(JSON.stringify(filter.query));
											q[filter.property] = {"$ne":"null"};

											$.ajax({
												type: "GET",
												url: stats.url,
												data : "action=query&q="+JSON.stringify(q),

												success: function(r) {
													var u = bst.data.archive(JSON.parse(r).result, filter.property)
													var items = [];
													for (var i in u)
													if(i.toLowerCase().search(request.term.toLowerCase()) != -1) items.push({"name":i,"value":i,"count":u[i]})

													response( items )
												}
											});

										}

										// TO IMPROVE! use a property as a bridge
										filter.specialUpdate = function(v) {

											if(typeof v === "object") return v
											if("electronic enlightment".search(v.toLowerCase()) != -1)
											return "cor"
											if("the papers of benjamin franklin".search(v.toLowerCase()) != -1)
											return {"$ne":"cor"}
											else return "null"

										}
*/

										break;





									// BAD! TO IMPROVE! not a proper view, an exception, just for nationality
									case "nationality" :

									filter.viewRender
									.style("width","100%")
									.style("height","600px")
									view = bst.view.bubble(filter.viewRender);

									// a listener when the view finish the update
									view.updated = function(d) {
										filter.queryRender.attr("value",JSON.stringify(filter.query))
										filter.updated(filter);				
									};

									// a listener when the view finish the update
									view.updateView = function() { 

										var values = {}
										var giusti = [];
										var sbagliati = []
										v = filter.data

										$.ajax({
											type: "GET",
											url: "./data/voltaire/letters.json",
											success: function(result){

												people = JSON.parse(result);

												for (var j in v) {

													var found = false;

													for (var i in people) {
														if(people[i].id == v[j].authorid && people[i].nationality != "" && people[i].nationality.search("unknown") == -1) {
															found = true
															break;
														}

													}

													if(found) {
														values[people[i].nationality] ? values[people[i].nationality]++ : values[people[i].nationality] = 1;
														giusti.push(v[j])
														} else sbagliati.push(v[j])

													}	

													values["unknown"] += values[""]

													view.update(values,filter.color)

													filter.data = giusti;

													filter.counterRender.html(filter.data.length);
													$(filter.counterRender[0][0]).data(filter);

													filter.dataNull = sbagliati

													filter.nullRender.html(filter.dataNull.length);

												}

											});

										}

										break;


										// the barchart
										case "barchart" :
										
										filter.viewRender
										.style("width","100%")
										.style("height","80px")

										view = bst.view.barChart(filter.viewRender);

										// listeners
										view.updated = function(d) {
											console.log(d)
											filter.query[filter.property] = {"$gte":d.range[0].toString(),"$lte":d.range[1].toString()};
											filter.queryRender.attr("value",JSON.stringify(filter.query))
											filter.update(	filter.query[filter.property], true)
											filter.updated(filter);				
										};

										view.updateView = function() { view.update( bst.data.time(filter.data) ,filter.color) }

										break;



										// the timeline
										case "area" :

										filter.viewRender
										.style("width","100%")
										.style("height","80px")

										view = bst.view.areaChart(filter.viewRender);

										// listeners
										view.updated = function(d) {
											filter.query[filter.property] = {"$gte":d.range[0].toString(),"$lte":d.range[1].toString()};
											filter.queryRender.attr("value",JSON.stringify(filter.query))
											filter.update(	filter.query[filter.property], true)
											filter.updated(filter);				
										};

										view.updateView = function() { view.update( bst.data.time(filter.data) ,filter.color) }

										break;

										// the bubble chart
										case "bubble" :

										filter.viewRender
										.style("width","100%")
										.style("height","600px")
										view = bst.view.bubble(filter.viewRender);

										// listeners
										view.clicked = function(d) {

											$(filter.valueRender.node()).attr("value",d.data.className)
											filter.update(d.data.className,true)

										};

										view.updated = function(d) {

											filter.queryRender.attr("value",JSON.stringify(filter.query))
											filter.updated(filter);				
										};

										view.updateView = function() {
											if(filter.data.length < 1) return;
											if(properties) view.update( bst.data.archive(filter.data, filter.property),filter.color )
											else view.update( filter.data,filter.color )
										}

										if(properties) {

											filter.specialAutoCompleteSource = function(request, response) {

												var q = JSON.parse(JSON.stringify(filter.query));
												q[filter.property] = {"$ne":"null"};

												$.ajax({
													type: "GET",
													url: stats.url,
													data : "action=query&q="+JSON.stringify(q),

													success: function(r) {
														var u = bst.data.archive(JSON.parse(r).result, filter.property)
														var items = [];
														for (var i in u)
														if(i.toLowerCase().search(request.term.toLowerCase()) != -1) items.push({"name":i,"value":i,"count":u[i]})

														response( items )
													}
												});

											}

											// TO IMPROVE! use a property as a bridge
											filter.specialUpdate = function(v) {

												if(typeof v === "object") return v
												if("electronic enlightment".search(v.toLowerCase()) != -1)
												return "cor"
												if("the papers of benjamin franklin".search(v.toLowerCase()) != -1)
												return {"$ne":"cor"}
												else return "null"

											}
										}

										break;

										// geographical map
										case "map" :

										filter.viewRender
										.style("width","100%")
										.style("height","600px");

										view = bst.view.map(filter.viewRender);

										// listeners
										view.updated = function(d) {
											filter.queryRender.attr("value",JSON.stringify(filter.query))
											filter.updated(filter);
										};

										view.clicked = function(d) {
											$(filter.valueRender.node()).attr("value",d)
											filter.update(d,true)
										};

										if (properties)
										view.updateView = function() {
											
											console.log(filter.data)
											
											var coords = []
											var queue = []
											
											
											
											// http://mapping.stanford.edu/data/api.py?action=js&code=inquiry/coords.js&places=Avignon%20[0001],Amsterdam%20[0001]
											var list = d3.entries(filter.data).map(function(i) { return i.key; })//.join(";")
											
											console.log(list.length, Math.floor((list.length/50))+1,list.length % 50);
											
											var list_array = [];
											
											var cut = 80;
											
											var da = d3.entries(filter.data); 
											
											for (var s = 0; s<Math.floor((list.length/cut))+1; s++) {
												list_array[s] = list.slice(s*cut,(s+1)*cut);	
											}
											
											for (var single in list_array) {
											
												var call = {};
												call.type = "GET";
												call.url = stats.url;
												call.data = {
													action : "js",
													code : "inquiry/coords.js",
													places : list_array[single].join(";")
												}

												call.success = function(result) {
													
													if (result.status == 'error'){
														return;
													} else {
														
														var coords = JSON.parse(result).result;
														
														da.forEach(function(i) {
															
															coords.forEach(function(j) {
																
																if (i.key == j.id )
																	if (j.hasOwnProperty('Coords'))
																		i['coords'] = j.Coords;
																	else i['coords'] = "";			
															})
															
														}
														)
														
													}
												}

												call.error = function(mess) {
													console.log(mess.statusText)
												}
												
												queue.push(call)
												
											}
											
											
											startQueue(queue,function(){
												view.update( bst.data.geoCount3(da),filter.color )
											})
											
											//view.update( bst.data.geoCount2(filter.data),filter.color )
										}
										
										else

										view.updateView = function() {

											view.update( bst.data.geoCount2(filter.data) ,filter.color)
										}			

										break;

									}

									return filter;

								}

								// the auroComplete function for the value input text...
								filter.autoComplete = function(target) {

									$( target ).autocomplete({

										// load data with this filter property = the request from the input text
										source: function( request, response ) {
											if (filter.specialAutoCompleteSource) {
												filter.specialAutoCompleteSource(request,response)
												return;
											} 

											var q = JSON.parse(JSON.stringify(filter.query));
											q[filter.property] = request.term;

											$.ajax({
												type: "GET",
												url: stats.url,
												data : "action=query&q="+JSON.stringify(q),

												success: function(r) {

													var u = bst.data.countValues(JSON.parse(r).result,filter.property)
													var items = [];
													for (var i in u)
													items.push({"name":i,"value":i,"count":u[i]})

													response( items )
												}

											});

										},
										minLength: 2,

										close: function(event) {
											filter.update()
										},

										focus: function(event, ui) {
											$(target.node()).attr("value", ui.item.label );
											return false;
										},

										select: function( event, ui ) {

											$(target.node()).attr("value", ui.item.label );
											filter.update(ui.item.value)

										}
									})

									.data( "autocomplete" )._renderItem = function( ul, item ) {
										return $( "<li></li>" )
										.data( "item.autocomplete", item )
										.append( "<a>" + item.label + " (" + item.count + ") " + "</a>" )
										.appendTo( ul );
									}

								}

								// getter/setter for the title
								filter.title = function(t) {

									if(!t) return title;
									title = t;
									filter.titleRender.attr("value",title);
									return filter;
								}

								// remove the filter and update the others
								filter.remove = function() {

									filter.container.remove();
									stats.filters[filter.id] = null;

									if(filter.prev)
									filter.prev.next = filter.next
									if(filter.next)
									filter.next.prev = filter.prev
									if(filter == stats.last)
									stats.last = filter.prev

									d3.select(filter.container).remove()

									var children = d3.select(".stats.filters").node().childNodes;
									if(children.length>0) stats.update($(children[0]).data().filter, true)


								}

								stats.filters[filter.id] = filter;
								stats.filterCount++;

								// a listener for the filter
								filter.updated = function(d) { if(filter.next) filter.next.update() };
								filter.update();

								if(stats.last) stats.last.next = filter;
								stats.last = filter;

								stats.updateAccordion();	
								filter.autoComplete(filter.valueRender)

								return filter;	

							}

							//---------- END OF THE FILTER -----------

							
							// the pop up window showing the actual table data
							bst.stats.showData = function(qu,event,title) {
														
							
							load(stats.url, "action=query&q="+JSON.stringify(qu), function(re) { 
							
									var data = JSON.parse(re).result;
									console.log("mmmm",data);
									
								var closeButton = d3.select(".stats.datatable")
								.append("a")
								.attr("class","close")
								.html("close")
								.on("click", function() {
									$.closeDOMWindow({anchoredClassName:'window'});
								})

								if(title) var titleRender = d3.select(".stats.datatable")
								.append("p")
								.attr("class","windowtitle")
								.html(title)

								var table = d3.select(".stats.datatable")
								.append("table")
								.attr("id","letters")
								.style("display","inline-table")

								var tr = table
								.append("thead")
								.append("tr")
								
								var keys = data.map(function(s){ return d3.keys(s) })
								var maxKeys = []
								
								for (var i=0; i<keys.length; i++) {
									if (keys[i].length > maxKeys.length)
										maxKeys = keys[i]
								}
								
							/*	
								var columns = d3.max(data.map(function(v){ return d3.keys(v).length }));
								var c = 0;
								for (var i in data) {
									for (var j in data[i]) {
										tr.append("th").html(j);
										c++;
										}
										break;
	
								}
								
								for (i in d3.range(columns-c))
									tr.append("th").html("-");*/
								
								for (i in maxKeys)
									tr.append("th").html(maxKeys[i]);
								
								
								var w = parseInt(stats.target.style("width"))-35;

								$(table[0][0]).dataTable( {
									"aaData": bst.data.table2(data,maxKeys),
									"bProcessing": true,
									"bAutoWidth": true,
									"bJQueryUI": false,
									"iDisplayLength": 25,
									"aLengthMenu": [[25, 50, 100, -1], [25, 50, 100, "All"]],
									"sPaginationType": "full_numbers",

								} );
													
								
															
								$.openDOMWindow({ 
									positionType:'anchored', 
									anchoredClassName:'window', 
									anchoredSelector:'.stats.filters', 
									draggable:0,
									overlay:1,
									positionLeft:25,
									width: w,
									positionTop:event.offsetTop,
									windowSourceID:'#datatable' 
								});
								
								
							});

							}
							
							
							bst.stats.showDataDirect = function(d,event,title) {
														
							
							
								var data = d
									
								var closeButton = d3.select(".stats.datatable")
								.append("a")
								.attr("class","close")
								.html("close")
								.on("click", function() {
									$.closeDOMWindow({anchoredClassName:'window'});
								})

								if(title) var titleRender = d3.select(".stats.datatable")
								.append("p")
								.attr("class","windowtitle")
								.html(title)

								var table = d3.select(".stats.datatable")
								.append("table")
								.attr("id","letters")
								.style("display","inline-table")

								var tr = table
								.append("thead")
								.append("tr")
								
								var keys = data.map(function(s){ return d3.keys(s) })
								var maxKeys = []
								
								for (var i=0; i<keys.length; i++) {
									if (keys[i].length > maxKeys.length)
										maxKeys = keys[i]
								}
								
							/*	
								var columns = d3.max(data.map(function(v){ return d3.keys(v).length }));
								var c = 0;
								for (var i in data) {
									for (var j in data[i]) {
										tr.append("th").html(j);
										c++;
										}
										break;
	
								}
								
								for (i in d3.range(columns-c))
									tr.append("th").html("-");*/
								
								for (i in maxKeys)
									tr.append("th").html(maxKeys[i]);
								
								
								var w = parseInt(stats.target.style("width"))-35;

								$(table[0][0]).dataTable( {
									"aaData": bst.data.table2(data,maxKeys),
									"bProcessing": true,
									"bAutoWidth": true,
									"bJQueryUI": false,
									"iDisplayLength": 25,
									"aLengthMenu": [[25, 50, 100, -1], [25, 50, 100, "All"]],
									"sPaginationType": "full_numbers",

								} );
													
								
															
								$.openDOMWindow({ 
									positionType:'anchored', 
									anchoredClassName:'window', 
									anchoredSelector:'.stats.filters', 
									draggable:0,
									overlay:1,
									positionLeft:25,
									width: w,
									positionTop:event.offsetTop,
									windowSourceID:'#datatable' 
								});
								
								

							}
							
							


							/** The LOADING functions */
							/** They simulate! a MongoDB */

							// the external LOAD (PHP)
							// url: the api url
							// data: the mongodb style query as a string
							// callback: function to call when finish

							function load(url, data, callback) {
								
								console.log(url,data)
								
								$.ajax({
									type: "GET",
									url: url,
									data : data,
									success: function(result){
										callback(result);
									}
								});

								return this;

							}


							// the internal LOAD (JS) uses bst.query module!!
							// data: the mongodb style as an object (!)
							// callback: function to call when finish

							function loadLocale(data, callback) {

								d3.json("./data/letters.json",function(d) {
									bst.query(d).find(data, callback)
								});

								return this;

							}
							
							// A rough method for queuing queries
							function startQueue(queue, callback) {
								for (var i=0; i<queue.length-1; i++) {
									queue[i].next = queue[i+1];
									queue[i].complete = function() { $.ajax(this.next) };
								}

								d3.last(queue).complete = callback;     

								$.ajax(queue[0]);

							}
							
							function JSON_stringify(s, emit_unicode)
							{
							   var json = JSON.stringify(s);
							   return emit_unicode ? json : json.replace(/[\u007f-\uffff]/g,
							      function(c) { 
							        return '\\u'+('0000'+c.charCodeAt(0).toString(16)).slice(-4);
							      }
							   );
							}

							return stats;
						}

})();