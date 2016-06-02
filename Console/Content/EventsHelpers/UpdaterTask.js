
self.onmessage = function (event) {
	//var data = CircularJSON.parse(event.data);

	var filters = event.data.filters;
	var skip = event.data.skip;
	var limit = event.data.limit;
	var fastStatics = event.data.fastStatics;

	if (event.data.lastPage == true) {
		skip = 0;
		if(limit<10000)
			limit = 0;
	}

	// Build and send the request
	var requestUrl = "/Watcher/RequestMessages?skip=" + skip + "&limit=" + (limit) +
	"&statics=" + fastStatics;
	var request = new XMLHttpRequest();
	request.open("POST", requestUrl, true);
	request.responseType = "arraybuffer";
	request.setRequestHeader("Content-type", "application/octet-stream");
	request.onreadystatechange = function () {
		if (request.readyState == 4 && request.status == 200) {
			console.log("RequestMessages complited...");
			self.postMessage({
				error: "",
				response: request.response
			});
		}
	};
	//request.onload = onRequestMessagesComleted(request, "RequestMessages");
	//request.onerror = onRequestFailed(request, "RequestMessages");

	console.log("RequestMessages started...");
	request.send(filters);
};

//Response handling functions
/***********************************************************************************************/
self.onRequestMessagesComleted= function (request, requestName) {
	if (request.status == 200) {
		console.log("RequestMessages complited...");
		self.postMessage({
			error: "",
			response: request
		});
	} else self.postMessage({
		error: requestName + " failed!",
		response: null
	});
};

/***********************************************************************************************/
self.onRequestFailed = function(request, requestName) {
	self.postMessage({
		error: requestName+" failed!",
		response: null
	});
};
