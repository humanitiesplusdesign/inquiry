/* BASIC STATS - THE JS QUERY SYSTEM */

/** A query interface that tries to simulate a MongoDB funcitoning */
/*  Just these MongoDB operators are accepted!!!  */
/*  $or, $ne, $gt, $lt, $gte, $lte 						 */
/*  Just find have been developed so far!!! */

(function(){

	// init with the data
	bst.query = function(data){
		
		var query = {},
			data = data;
		
		// Takes a mongodb query {}
		// executes it on data
		// calls the callback with the results
		 
		query.find = function(q, callback) {
			
			var valids = [];

			for (var o in data) {
				
				val = true;
				
				for (var e in q) {
					if (check(e,q[e],data[o]) == false) {
						val = false;
						break;
					}
				}
				
				if(val) valids.push(data[o])
			}
			
			callback(valids);
		
			return valids;
			
			// the recursive function - the loop
			function check(query, value, object) {
				
				switch (query) {

					// OR case 
					case "$or" :
						for (var i in value) {
							for (var j in value[i]) {
								if (check(j, value[i][j], object) === true)
									return true;
							}
						}
						
						return false;

					break;
					
					default :

					if (typeof value === 'object') {

						for (var v in value) {
							
							valid = true;

						switch(v) {
							
							// greater than...
							case '$gt' :
								valid = object[query] > value[v];
							break;

							// greater than or equal to...
							case '$gte' :
								valid = object[query] >= value[v] || object[query].toLowerCase().search(String(value[v]).toLowerCase()) !== -1;
							break;

							// less than...
							case '$lt' :
								valid = object[query] < value[v];
							break;

							// less than or equal to...
							case '$lte' :
								valid = object[query] <= value[v] || object[query].toLowerCase().search(String(value[v]).toLowerCase()) !== -1;
							break;

							// not equal to...
							case '$ne' :
								valid = !check(query, value[v], object);
							break;

						}

							if (!valid) return valid;

						} return valid;

						 // ATTENTION! in case of "null" as a value,
						 // it considers as valid the following values:
						 // "null", "" or "unknown"
						
						} else if (value == "null" ) {
							return object[query].toLowerCase().search("null") > -1 || object[query].toLowerCase().search("unknown") > -1  || object[query] == "";
					
						} else if (value == "") return true;

							else { return object[query].toLowerCase().search(value.toLowerCase()) > -1; }

						break;

				}
			}
		

		}
	
		return query;
	
	};
		
	
})();