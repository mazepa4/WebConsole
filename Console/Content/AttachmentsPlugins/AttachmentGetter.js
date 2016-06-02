
self.onmessage = function (event) {
	//var data = CircularJSON.parse(event.data);
	var format = event.data.format;
	var attachment = event.data.attachment;
	var attachmentId = attachment.attachmentId;
	var responseFormat = event.data.responseFormat;
	if (responseFormat == undefined || responseFormat == "null")
		responseFormat = "blob";
		
	// Build and send the request
	var requestUrl = "/Watcher/ReadAttachment?id=" + attachmentId + "&format=" + responseFormat;
	var messagesResponse = "";
	var request = new XMLHttpRequest();
	request.open("POST", requestUrl, true);
	request.responseType = "arraybuffer";
	//request.setRequestHeader("Content-type", "application/octet-stream");
	request.onreadystatechange = function ()
	{
		if (request.readyState == 4 && request.status == 200)
		{
			console.log("RequestMessages complited...");
			self.postMessage({
				error: "",
				response: request.response,
				format: format,
				attachment: attachment
			});
		}
	};
	/*request.onreadystatechange = self.onRequestMessagesComleted(request, "RequestAttachment",{
		format: format,
		attachment: attachment
	});*/
	/*request.onerror = self.onRequestFailed(request, "RequestAttachment", {
		format: format,
		attachment: attachment
	});*/
	console.log("ReadAttachment started...");
	request.send();

};

//Response handling functions
/***********************************************************************************************/
self.onRequestMessagesComleted = function (request, requestName,data) {

	if (request.readyState == 4 && request.status == 200) {
		console.log(requestName+" complited...");
		self.postMessage({
			error: "",
			response: request.response,
			format: data.format,
			attachment: data.attachment
		});
	}
};

/***********************************************************************************************/
self.onRequestFailed = function(request, requestName,data) {
	self.postMessage({
		error: requestName+" failed!",
		response: null,
		format: data.format,
		attachment: data.attachment
	});
};
