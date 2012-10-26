
// init the basic filtering engine
var s = bst.stats("#chart");
// the network map
var maplink = bst.view.mapLink(d3.select("#maplink"));

// THE FILTERS

// add a filter
$("#add").click(add)

// the association property/view is now chosen here
function add(event,ui) {

	switch($("#selection")[0].value) {

		case "Archive" :
		// the property the filter works on
		s.filter("Archive")
		// a title for the filter 
		.title("Archive")
		// the type of view associated
		.view("bubble")

		break;

		case "Author" :
		s.filter("AuthorMPerson")
		.title("Author")
		.view("bubble")

		break;

		case "Recipient" :
		s.filter("RecipientMPerson")
		.title("Recipient")
		.view("bubble")

		break;

		case "Correspondent" :
		s.filter("AuthorMPerson")
		.title("Correspondent")
		.view("correspondent")

		break;


		case "Date" :
		s.filter("Date.year")
		.title("Date")
		.view("barchart")

		break;

		case "Source" :
		s.filter("SourceMPlace")
		.title("Source")
		.view("map", "Coords");

		break;

		case "Destination" :
		s.filter("DestinationMPlace")
		.title("Destination")
		.view("map", "DestinationMPlace");

		break;

		case "nationality" :
		s.filter("authorid")
		.title("Nationality (A)")
		.view("nationality")

		break;

	}

}

// ajax events for the loading indicator...
$(document).ajaxSend( function() {

	d3.select(".ajaxloading").style("background","url('./style/images/ajax-loader.gif') no-repeat")
})

$(document).ajaxStop( function() {

	d3.select(".ajaxloading").style("background","")

})


// THE MAP VIEW
// add the clear button on the map
d3.select("#maplink")
.append("input")
.attr("type","button")
.attr("value","clear")
.style("float","right")
.on("click", function(){ maplink.clear() })

// some listeners on the map
maplink.clicked = function(d) {
	bst.stats.showDataDirect(d,this)
}
// some controls on the map
$( "#maplink" ).droppable({

	drop: function( event, ui ) {
		$( this ).addClass( "ui-state-highlight" )
		$( this ).css("height",800 )
		//console.log($(ui.draggable[0]).data().query);
		
		load(s.url, "action=query&q="+JSON_stringify($(ui.draggable[0]).data().query, false), function(re) { 

			var data = JSON.parse(re).result;
			
			
			var sources = data.map(function(a) {
				if (a.hasOwnProperty("SourceMPlace"))
					return a.SourceMPlace;
			})
			
			var dests = data.map(function(a) {
				if (a.hasOwnProperty("DestinationMPlace"))
					return a.DestinationMPlace;
			})
			
			var list = _.uniq(sources.concat(dests));
			
			var queue = []
			
			var list_array = [];
			var cut = 80;
			var coords = {}
			
			for (var sa = 0; sa<Math.floor((list.length/cut))+1; sa++) {
				list_array[sa] = list.slice(sa*cut,(sa+1)*cut);	
			}
			
			for (var single in list_array) {
			
				var call = {};
				call.type = "GET";
				call.url = s.url;
				call.data = {
					action : "js",
					code : "inquiry/coords.js",
					places : list_array[single].join(";")
				}
				

				call.success = function(result) {
					
					if (result.status == 'error'){
						return;
					} else {
						var c = JSON.parse(result).result;						
						c.forEach(function(el){
							if (el.hasOwnProperty('Coords'))
								coords[el.id] = el.Coords;
						})
						//coords.concat(c);
					}
				}

				call.error = function(mess) {
					console.log(mess.statusText)
				}
				
				queue.push(call)
				
			}
			
			
			startQueue(queue,function(){
				
				data.forEach(function(element){
					
					if (coords[element['SourceMPlace']])
						element['SourceCoords'] = coords[element['SourceMPlace']]
					else element['SourceCoords'] = ""
					
					if (coords[element['DestinationMPlace']])
						element['DestinationCoords'] = coords[element['DestinationMPlace']]
					else element['DestinationCoords'] = ""
					
				})
				
				maplink.update(bst.data.net( data, "SourceMPlace", "DestinationMPlace", "SourceCoords","DestinationCoords"),$(ui.draggable[0]).data().color)
				
				console.log("sfdsdf", coords)
			})

			
			
			
			
			
			
		//	maplink.update(bst.data.net( data, "SourceMPlace", "DestinationMPlace", "SourceCoords","DestinationCoords"),$(ui.draggable[0]).data().color)
	})
	
	
	}
	
	
});




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

function load(url, data, callback) {

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

