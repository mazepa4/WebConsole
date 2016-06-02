//Filters control definition
Ext.define("EventsWorker", {

	//Storage for last server query results
	allMessages: {}, //all messages data storage (item's key is messageId)
	treeRootIdList: {},
	//rootMessages: [], //root messages data storage(sorted by ASC time)
	treeViewData: [], //tree data  storage
	treeViewData2: [], //tree data  storage
	msgTypesMap: {
		0: "Empty",
		4294967295: "All",
		1: "Info",
		2: "Warning",
		4: "Error",
		8: "Completion",
		16: "Crash"
	},
	emitters: {}, //emitters data storage
	ipList: {}, //emitters IP data storage

	filteredMessagesQuantity: 0, //count of filtered messages witch were taken from server
	lastMessageTime: 0, //last message time for last messages request
	firstMessageTime: 0, //fisrt message time for last messages request

	//actions statuses flags
	updaterReady: false, //add. autoupdaterflag
	emittersReady: false, //add. emitter getter fl	ag
	eventsReady: false, //add. events getter flag
	responseReady: false, //response status flag
	allowNewQuery: true, //ready status for new autoupdate query

	//Various variables
	msgPerRequest: 1000, //messages per request
	tick: 0, //events duration ticks counter
	limit: 1000, //limit range 
	skip: 0, //skip
	newEvents: 0, //quantity of new events on autoupdate
	responseTick: 0,

	//flags for action
	coldStart: true, //statup action
	afterStart: false, //addition for above flag
	getAll: false, //getAll events actions
	pageNavigation: false, //page nav. action
	getRange: false, //addition for above flag
	autoUpdate: false, //autoupdate action
	filterAction: false, //filtering action
	scrollerFilterAction: false, //scroller filtering action


	//storage for configs like filters,settings...
	eventsFilters: "",
	emittersFilters: "",
	setting: "",

	performanceFrom: 0,
	performanceTo: 0,


	workerTimer: null, //timer for ALL requests,update events
	lastAction:5,
	updaterTimeout: null, //measure timer

	serviceLogObject: null, //object of main UI component(it used for UI callback events(refresh mostly))

	expandedItems: {},
	rootExpanded: [],

	worker: null,
	responseDataReady: false,
	webWorkerTo: 0,
	webWorkerFrom: 0,

	messageCount: 0,
	
	expanded: {},

	scrollerStartTime:0,
	scrollerEndTime:0,

	/**********************************************************************************************/
	constructor: function (serviceLogObject) {
		this.serviceLogObject = serviceLogObject;
		//this.worker = new Worker('/Content/UpdaterTask.js');
		//this.worker.onmessage = this.onWebWorkerComplited.bind(this);
		//this.worker.onerror = this.onWebWorkerFail.bind(this);
	},

	/***********************************************************************************************/
	//sending request to main GUI object to change UI context
	updateUI: function (action) {
		this.serviceLogObject.updateUI(action);
	},

	//"Cold" start
	//checkAction -> onColdStart -> onUpdateStart
	//Change page
	//getEventsByRange -> checkAction ->

	/***********************************************************************************************/
	//1 to run "change page" event
	//2 to reset current messages data && replace with new info(also used when filter is applied)
	//3 to get new info on "autoupdate" event(adding new data to exist storage)
	//4 to perform filtering 
	checkAction: function (action) {
		try {
			this.lastAction = action;
			this.worker.terminate();
			window.clearInterval(this.workerTimer);
			window.clearTimeout(this.workerTimer);
		
		}catch (err){}
		switch (action) {
			case 1://pageNavigation
				this.pageNavigation = true;
				this.autoUpdate = false;
				break;

			case 2://getAll
				this.getAll = true;
				this.getRange = false;
				break;

			case 3://autoUpdate
				this.filterAction = false;
				this.autoUpdate = true;
				break;

			case 4://filterAction
				this.getRange = false;

				this.skip = 0;

				this.filterAction = true;
				this.pageNavigation = false;
				this.updaterReady = false;
				this.autoUpdate = false;
				this.allowNewQuery = false;
				this.getRange = true;
				break;

			case 6:// scroller filterAction
				this.getRange = false;

				this.skip = 0;
				this.scrollerFilterAction = true;
				this.filterAction = true;
				this.pageNavigation = false;
				this.updaterReady = false;
				this.autoUpdate = false;
				this.allowNewQuery = false;
				this.getRange = true;
				break;

			default:
				this.coldStart = true;
				this.skip = 0;

				this.filterAction = false;
				this.pageNavigation = false;
				this.updaterReady = false;
				this.autoUpdate = false;
				this.allowNewQuery = false;
				this.getRange = false;
				break;
			break;
		}

		//reseting ticks for event time spend calculation
		this.tick = 0;
		//updating configs
		this.updateConfigs();
		var isChanged = this.updateFilters();

		if (this.pageNavigation == true || this.filterAction == true)
			this.serviceLogObject.loadingMask.show();
		this.allowNewQuery = false;
		//window.clearInterval(this.workerTimer);
		this.workerTimer = setTimeout(this.waitForEmitters.bind(this), 500);//check for ready state

		//update emitters only if filters was changed or on start
		if (isChanged == true || this.coldStart == true)
			this.getEmitters(this.emittersFilters);
		else this.emittersReady = true;
	},

	//Server request functions
	//getting first event
	//it required for scroller filter
	/**********************************************************************************************/
	getFirstEvent:function(){
		// Build and send the request
		var requestUrl = "/Watcher/RequestMessages?skip=" + 0 + "&limit=" + 1 +
		"&statics=" + 0;
		var messagesResponse = "";
		var request = new XMLHttpRequest();
		request.open("POST", requestUrl, true);
		request.responseType = "arraybuffer";
		request.onload = function (request, requestName) {
			if (request.status == 200) {
				var responseJson = this.responseHandler(request.response);
				if (responseJson != null && (typeof responseJson === "string")) {
					var responseObject = JSON.parse(responseJson);
					if (responseObject.errorMessage == "") {
						this.serviceLogObject.setScrollerStartTicks(responseObject.messageList[0].messageDeliveryTime);
					}
				}
			} else this.reportErrorMessage(request, requestName, true);
		}.bind(this, request, "RequestMessages");
		request.onerror = this.onRequestFailed.bind(this, request, "RequestMessages");
		var tmp= JSON.parse(this.serviceLogObject.getFilters());
		request.send(JSON.stringify(tmp.filters));
	},

	//Server request functions
	//getting last event
	//it required for scroller filter
	/**********************************************************************************************/
	getLastEvent:function(lastIndex){
		if(lastIndex!=undefined){
			// Build and send the request
			var requestUrl = "/Watcher/RequestMessages?skip=" + (lastIndex-1) + "&limit=" + 1 +
			"&statics=" + 0;
			var messagesResponse = "";
			var request = new XMLHttpRequest();
			request.open("POST", requestUrl, true);
			request.responseType = "arraybuffer";
			request.onload = function (request, requestName) {
				if (request.status == 200) {
					var responseJson = this.responseHandler(request.response);
					if (responseJson != null && (typeof responseJson === "string")) {
						var responseObject = JSON.parse(responseJson);
						if (responseObject.errorMessage == "") {
							this.serviceLogObject.setScrollerEndTicks(responseObject.messageList[0].messageDeliveryTime);
						}
					}
				} else this.reportErrorMessage(request, requestName, true);
			}.bind(this, request, "RequestMessages");
			request.onerror = this.onRequestFailed.bind(this, request, "RequestMessages");
			var tmp= JSON.parse(this.serviceLogObject.getFilters());
			request.send(JSON.stringify(tmp.filters));
		}
	},



	//Server request functions
	/**********************************************************************************************/
	getEvents: function (filters, skip, limit, fastStatics) {
		if (filters == undefined) filters = "";

		if (this.getAl == true && this.getRange == false)
			limit = 1;

		if (this.coldStart == true)
			limit = 100;

		this.responseReady = false;
		this.responseTick = 0;

		// Build and send the request
		var requestUrl = "/Watcher/RequestMessages?skip=" + skip + "&limit=" + limit +
		"&statics=" + fastStatics;
		var messagesResponse = "";
		var request = new XMLHttpRequest();
		request.open("POST", requestUrl, true);
		request.responseType = "arraybuffer";
		//request.setRequestHeader("Content-type", "application/octet-stream");
		request.onload = this.onRequestMessagesComleted.bind(this, request, "RequestMessages");
		request.onerror = this.onRequestFailed.bind(this, request, "RequestMessages");

		this.performanceFrom = performance.now();
		//this.measureTimer = setInterval(this.waitForEventsResponse, 1,this);
		//this.measureTimer = setInterval(this.waitForEventsResponse, 1,this);
		console.log("RequestMessages started...");
		//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: RequestEvents started...");
		request.send(filters);
	},

	/**********************************************************************************************/
	getEmitters: function (filters) {

		if (filters == undefined) filters = "";

		// Build and send the request
		var requestUrl = "/Watcher/RequestEmitters?skip=0&limit=0";
		var messagesResponse = "";
		var request = new XMLHttpRequest();
		request.open("POST", requestUrl, true);
		//request.responseText = "text";
		request.responseType = "arraybuffer";
		//request.setRequestHeader("Content-type", "application/octet-stream");
		request.onload = this.onRequestEmittersComleted.bind(this, request, "RequestEmitters");
		request.onerror = this.onRequestFailed.bind(this, request, "RequestEmitters");
		console.log("RequestEmitters started...");
		//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: RequestEmitters started...");
		request.send(filters);
	},


	/**********************************************************************************************/
	waitForFiltersApplied: function () {
		this.responseTick++;
		if (this.readyState3 == true) {// && scope.responseDataReady == true) {
			this.responseDataReady = false;
			this.responseTick = 0;
			window.clearInterval(this.workerTimer);
			window.clearTimeout(this.workerTimer);
			this.readyState3 = false;

			if(this.scrollerFilterAction!=true)
				this.updateUI(4);
			else this.updateUI(6);
			this.getAll = false;
			this.getRange = false;
			if (this.filterAction == true) {
				this.filterAction = false;
			}
			this.scrollerFilterAction = false;
			this.allowNewQuery = true;
			this.setUpUpdater();
		}
	},



	/**********************************************************************************************/
	waitForEventsResponse: function () {
		if (this.eventsReady == true) {//&& scope.responseDataReady == true) {
			this.responseDataReady = false;
			window.clearInterval(this.workerTimer);
			window.clearInterval(this.measureTimer);
			this.eventsReady = false;
		}
	},

	/**********************************************************************************************/
	checkOnreadyState: function () {
		if (this.readyState == true) {//) && scope.responseDataReady == true) {
			this.responseDataReady = false;
			window.clearInterval(this.workerTimer);
			window.clearTimeout(this.workerTimer);
			//scope.performanceTo = performance.now();
			//console.log("Data was prepared in: " + (scope.performanceTo-scope.performanceFrom ) + " miliseconds");
			this.tick = 0;
			this.readyState = false;
			this.onColdStart();
		}
		this.tick++;
	},

	/**********************************************************************************************/
	waitForPageNavCompleted: function () {
		if (this.readyState2 == true) {// && scope.responseDataReady==true) {
			this.responseDataReady = false;
			window.clearInterval(this.workerTimer);
			window.clearTimeout(this.workerTimer);
			this.tick = 0;
			this.readyState2 = false;

			this.updateUI(1);

			window.clearInterval(this.measureTimer);
			window.clearTimeout(this.workerTimer);
			this.tick = 0;

			this.allowNewQuery = true;
			this.setUpUpdater();
			this.pageNavigation = false;
			this.pageNavigation = false;
		}
		this.tick++;
	},


	/**********************************************************************************************/
	waitForEmitters: function () {

		if (this.emittersReady == true) {
			window.clearInterval(this.workerTimer);
			window.clearTimeout(this.workerTimer);
			this.emittersReady = false;

			var limit = 0;
			var skip = 0;
			var fastStatics = 0;
			var refFunction = null;

			var config = this.eventsFilters;

			//setup controller for current task
			if (this.coldStart == true) {
				fastStatics = 1;
				refFunction = this.checkOnreadyState;
				this.coldStart = false;
			} else if (this.pageNavigation == true) {
				fastStatics = 1;
				refFunction = this.waitForPageNavCompleted;
			} else if (this.getAll == true) {
				refFunction = this.onFullUpdate;
			} else if (this.autoUpdate == true) {
				refFunction = this.waitForAutoUpdate;
			} else if (this.filterAction == true) {
				fastStatics = 0;
				refFunction = this.waitForFiltersApplied;
			}

			//setup function for worker
			this.performanceFrom = performance.now();
			this.workerTimer = setInterval(refFunction.bind(this), 500);
			//scope.performanceTo = performance.now();
			//console.log("Data was prepared in: " + (scope.performanceTo - scope.performanceFrom) + " miliseconds");

			var filters = "";
			if (config != undefined && config != "") {
				var params = JSON.parse(config);
				params.filters.deliveryTimeStart *= 1000;
				params.filters.deliveryTimeEnd *= 1000;
				//to get all events

				if(this.scrollerFilterAction==true){
					params.filters.deliveryTimeStart = this.scrollerStartTime;
					params.filters.deliveryTimeEnd = this.scrollerEndTime;
				}
				else if (this.getAll == true) {
					//	params.filters.emissionTimeStart = 0;
					//	params.filters.emissionTimeEnd = 0;
					//	params.filters.emitterIdList = [];
					//	params.filters.emitterIpList = [];
					//	params.filters.messageTypes = "All";
					//	params.filters.priorityMin = 0;
					//	params.filters.priorityMax = 0;
					//	params.filters.titleMatch = "";
					//	params.filters.textMatch = "";
					//	params.filters.mustHaveAttachments = false;
					//params.filters.deliveryTimeEnd = 0;
				}
				else if (this.autoUpdate == true && this.filterAction == false) {
					params.filters.deliveryTimeStart = this.lastMessageTime;
				}
				filters = JSON.stringify(params.filters);
			}
			if (this.setting != undefined && this.setting != "") {
				var params = JSON.parse(this.setting);
				this.msgPerRequest = params.config.messageCount;
			}

			skip = this.skip;
			limit = this.limit;

			if (this.getAll == true && this.getRange == false)
				limit = 1;

			if (this.afterStart == false)
				limit = 2000;//this.msgPerRequest / 2;

			if (this.autoUpdate == true) {
				this.startWebWorker(filters, skip, limit, fastStatics);
			} else {
				this.getEvents(filters, skip, limit, fastStatics);
			}
		}
		this.tick++;
	},

	/***********************************************************************************************/
	onColdStart: function () {

		this.updateUI(5);
		//console.log("UI was updated in: " + this.tick + " ms.");

		window.clearInterval(this.measureTimer);
		window.clearTimeout(this.workerTimer);
		this.tick = 0;

		this.readyState = false;
		if (this.afterStart == false) {
			this.checkAction(2);//execute getAll event after initial stage
		}
		this.afterStart = true;
	},

	/***********************************************************************************************/
	onUpdateStart: function () {
		this.updateUI(3);
		window.clearInterval(this.workerTimer);
		window.clearTimeout(this.workerTimer);
		//this.worker.terminate();
		//this.performanceTo = performance.now();
		//console.log("UI was updated in: " + (this.performanceTo - this.performanceFrom) + " miliseconds");
		//	window.clearInterval(this.measureTimer);
		this.tick = 0;
		this.updaterReady = false;
		this.allowNewQuery = true;
	},

	/***********************************************************************************************/
	getEventsByRange: function (itemsLimits, timeLimits) {
		this.skip = itemsLimits[0];
		this.limit = itemsLimits[1];

		window.clearInterval(this.workerTimer);
		window.clearTimeout(this.workerTimer);
		this.updaterReady = false;

		this.checkAction(1);
	},

	/***********************************************************************************************/
	waitForAutoUpdate: function () {
		if (this.updaterReady == true && this.pageNavigation == false) {
			this.responseDataReady = false;
			this.tick = 0;
			this.worker.terminate();
			window.clearInterval(this.workerTimer);
			window.clearTimeout(this.workerTimer);

			this.performanceFrom = performance.now();
			//scope.measureTimer = setInterval(scope.timeSpend, 0, scope);
			this.updaterReady = false;

			this.onUpdateStart();
			this.setUpUpdater();
		}
		this.tick++;
	},

	/***********************************************************************************************/
	setUpUpdater: function () {
		var params = JSON.parse(this.setting);
		var prevcount = params.config.messageCount;
		this.updateConfigs();
		var period = 5000;

		if (this.setting != "") {
			params = JSON.parse(this.setting);

			var updatePeriod = params.config.updatePeriod;

			if (updatePeriod.indexOf('sec') >= 0) {
				period = parseInt(updatePeriod) * 1000;
			} else if (updatePeriod.indexOf('min') >= 0) {
				period = parseInt(updatePeriod) * 1000 * 60;
			} else
				period = 5 * 1000;
		} else {
			period = 5 * 1000;
		}
		if (params.config.messageCount == prevcount) {
			window.clearInterval(this.workerTimer);
			window.clearTimeout(this.workerTimer);
			this.allowNewQuery = true;
			this.workerTimer = setTimeout(this.runAutoUpdater.bind(this), period);
		} else {
			window.clearInterval(this.workerTimer);
			window.clearTimeout(this.workerTimer);
			this.allowNewQuery = false;
			this.checkAction(4);
		}
	},

	/***********************************************************************************************/
	runAutoUpdater: function () {
		if (this.allowNewQuery == true) {
			this.allowNewQuery = false;
			window.clearInterval(this.workerTimer);
			window.clearTimeout(this.workerTimer);
			//this.workerTimer.terminate();
			this.performanceFrom = performance.now();
			console.log("Autoupdater started... Timestamp: " + (new Date()));
			//scope.serviceLogObject.treeViewObject.statusLabel.setText("Status: Autoupdater started...");
			this.allowNewQuery = false;
			this.checkAction(3);
		}
	},

	/***********************************************************************************************/
	onFullUpdate: function () {
		if (this.readyState3 == true) {//} && scope.responseDataReady == true) {
			window.clearInterval(this.workerTimer);
			window.clearTimeout(this.workerTimer);
			this.readyState3 = false;

			this.updateUI(2);
			this.getAll = false;
			this.getRange = false;
			if (this.filterAction == true) {
				this.filterAction = false;
			}
			this.allowNewQuery = true;
			this.setUpUpdater();
		}
		this.tick++;
	},

	//Filters&settings update functions
	/**********************************************************************************************/
	//Update events&emitters filters
	updateFilters: function () {
		this.eventsFilters = this.getFilters();
		var data = JSON.parse(this.eventsFilters);
		if (this.emittersReady == true) {
			var changed = false;
			//check for emitters avaliability
			for (var i = 0; i < data.filters.emitterIdList.length; i++) {
				var emitter = data.filters.emitterIdList[i];
				var name = this.emitters[emitter];
				if (name == undefined) {
					changed = true;
					var index = data.filters.emitterIdList.indexOf(emitter);
					data.filters.emitterIdList.splice(index, 1);
				}
			}
			//check for Ip avaliability
			for (var i = 0; i < data.filters.emitterIpList.length; i++) {
				var ip = data.filters.emitterIpList[i];
				var name = this.ipList[ip];
				if (name == undefined) {
					changed = true;
					var index = data.filters.emitterIpList.indexOf(ip);
					data.filters.emitterIpList.splice(index, 1);
				}
			}
			if (changed == true) {
				this.setCookie("filtersData", JSON.stringify(data), 99);
			}

		}


		var filter = {}
		filter.timeStart = data.filters.deliveryTimeStart;
		filter.timeEnd = data.filters.deliveryTimeEnd;
		filter.name = "";

		var isChanged = false;
		if (this.emittersFilters != "") {
			var emFilterObj = JSON.parse(this.emittersFilters);
			//checks for changes to update emitters filter
			if ((emFilterObj.timeStart != filter.timeStart) ||
			(emFilterObj.timeEnd != filter.timeEnd)) {
				this.emittersFilters = JSON.stringify(filter);
				isChanged = true;
			}
		}
		return isChanged;
	},

	/**********************************************************************************************/
	//Update setting
	updateConfigs: function () {
		this.setting = this.getConfigs();
		var data = JSON.parse(this.setting);
		this.limit = data.config.messageCount;
		this.msgPerRequest = this.limit;
	},

	/**********************************************************************************************/
	getPageInfo:function() {
		return this.serviceLogObject.getPageInfo();
	},

	//Response results handling functions
	/**********************************************************************************************/
	updateEvents: function (messagesData) {
		if ((this.getAll == true && this.getRange == false) || this.filterAction) {
			this.allMessages = {};
			this.rootMessages = [];
			this.treeViewData = [];
			this.treeViewData2 = [];
			this.expandedItems = {};
			this.treeRootIdList = {};
			this.filteredMessagesQuantity = 0;
			this.messageCount = 0;
			this.expanded = {};
		}
		if (this.pageNavigation == true) {
			this.allMessages = {};
			this.expandedItems = {};
			this.expanded = {};
			this.treeRootIdList = {};
			this.rootMessages = [];
			this.treeViewData = [];
			this.treeViewData2 = [];
			this.messageCount = 0;
		}

		this.newEvents = 0;
		if (this.pageNavigation == false) {
			if(messagesData.filteredMessagesQuantity!=0)
				this.firstMessageTime = messagesData.messageList[0].messageDeliveryTime;
			if (this.autoUpdate == true) {

				if (this.filterAction == false)
					this.filteredMessagesQuantity = parseInt(messagesData.filteredMessagesQuantity) + parseInt(this.filteredMessagesQuantity);
				else this.filteredMessagesQuantity = parseInt(messagesData.filteredMessagesQuantity);
				this.newEvents = parseInt(messagesData.filteredMessagesQuantity);

			} else {
				if (this.filteredMessagesQuantity == 0)
					this.filteredMessagesQuantity = parseInt(messagesData.filteredMessagesQuantity);
			}

			if (messagesData.lastMessageTime > 9999 && this.pageNavigation == false)
				this.lastMessageTime = parseInt(messagesData.lastMessageTime) + 1;
		}
		
		// remove by deliveryTime
		var serverEvents = messagesData.messageList;
		console.log("Message counts: " + messagesData.messageList.length);

		if (this.getAll == true && this.getRange == false && this.filterAction == false) {
			this.updateFilters();
			this.getRange = true;
			var data = JSON.parse(this.eventsFilters);
			data.filters.deliveryTimeStart *= 1000;
			data.filters.deliveryTimeEnd *= 1000;
			this.getEvents(JSON.stringify(data.filters), 0, this.msgPerRequest, 0);
		} else if (this.getAll == true && this.getRange == true) {
			this.getRange = false;
			this.readyState3 = true;
		}
		
		this.performanceFrom = performance.now();

		var configData = JSON.parse(this.setting).config;
		var pageInfo = this.getPageInfo();
		var updateFlag = 0;
		//setup data according to autoupdate results
		if (this.autoUpdate == true) {
			//no changes
			if ((this.messageCount - 1) == configData.messageCount &&
				pageInfo.pageIndex != (pageInfo.pageCount - 1) &&
				pageInfo.pageCount != 1 && this.newEvents == 0) {
				updateFlag = 0;
				this.serviceLogObject.setupTreeView(0);
			}
			//change page count && message count
			else if (pageInfo.pageIndex != (pageInfo.pageCount - 1) &&
				pageInfo.pageCount != 1 && this.newEvents > 0) {
				updateFlag = 1;
				this.serviceLogObject.setupTreeView(1);
			}
			//change page count && message count && update table
			else if (pageInfo.pageIndex == (pageInfo.pageCount - 1)
				&& (this.messageCount - 1 + this.newEvents) <= configData.messageCount) {
				updateFlag = 2;
				this.serviceLogObject.setupTreeView(2);
			}
			//change pageIndex && page count && message count && update table
			else if (pageInfo.pageIndex == (pageInfo.pageCount - 1) &&
			(this.messageCount - 1 + this.newEvents) > configData.messageCount) {
				updateFlag = 3;
				this.serviceLogObject.setupTreeView(3);
			}
		} else updateFlag = -1;

		console.log("Mode: "+updateFlag);

		if (updateFlag != 0 && updateFlag != 1) {
			// Iterate over server messages
			var startIndex = 0;

			

			for (var i = 0; i < serverEvents.length; i++) {

				var event = serverEvents[i];
				//save iplist map
				if (this.ipList[event.emitterIp] == null) {
					this.ipList[event.emitterIp] = this.num2dot(event.emitterIp);
				};
				++this.messageCount;
				if (this.allMessages.hasOwnProperty(event.messageId) != true)
					this.allMessages[event.messageId] = new RowItem(serverEvents[i], this.ipList, this.emitters, this.msgTypesMap);
				//this.serviceLogObject.appendChild(new RowItem(serverEvents[i], this.ipList, this.emitters, this.msgTypesMap));
				//this.treeViewData.push(new RowItem(event, this.ipList, this.emitters, this.msgTypesMap));
			}

			if (updateFlag == 3) {
				startIndex = (this.messageCount - 1 - configData.messageCount);
				//this.allMessages = {};
				this.rootMessages = [];
				this.treeViewData = [];
				this.treeViewData2 = [];
				this.expandedItems = {};
				this.treeRootIdList = {};
				this.messageCount = 0;
			}

			console.log("Overal messages: "+this.messageCount);

			if (updateFlag == 3 || updateFlag == -1 && this.autoUpdate == true) {
				//serverEvents = serverEvents.slice(startIndex - 1, serverEvents.length - 1);
				console.log("New  message count: " + serverEvents.length);
			}
		
			if ((updateFlag == 2 || updateFlag == 3 && this.autoUpdate == true) || (this.autoUpdate == false && updateFlag == -1)) {
				
				for (var i = startIndex; i != serverEvents.length; ++i) {
					var currentitem = this.allMessages[serverEvents[i].messageId];
					if (currentitem.parentId == 0) {
						currentitem.parentEvent = null;
						//currentitem.parentId = "root";
						this.treeViewData.push(currentitem);
						
					} else {
						currentitem.parentEvent = this.allMessages[currentitem.parentId];

						if (currentitem.parentEvent == undefined) {
							this.treeViewData.push(currentitem);
						} else {
							if (currentitem.msgType == "Completion") {
								//var longInput = goog.math.Long.fromString(currentitem.msgTime, 10);
								//var seconds = longInput.div(new goog.math.Long(1000000, 0)).toNumber();
								//var miliseconds = longInput.div(new goog.math.Long(1000, 0)).toNumber();
								//miliseconds = (miliseconds - seconds * 1000) / 1000;
								//seconds = (seconds + miliseconds).toFixed(3);
								//var longInput = goog.math.Long.fromString(currentitem.msgTime, 10);

								var seconds = new Date(currentitem.msgTime / 1000).getSeconds(); //longInput.div(new goog.math.Long(1000000, 0)).toNumber();
								var miliseconds = new Date(currentitem.msgTime / 1000).getMilliseconds(); //longInput.div(new goog.math.Long(1000, 0)).toNumber();

								miliseconds = (miliseconds) / 1000;
								seconds = (seconds + miliseconds).toFixed(3);
								var dispVal = 0;
								if (seconds == 0)
									dispVal = 0;
								else dispVal = seconds;
								var dur = dispVal + " seconds";
								currentitem.parentEvent.durTime = dur;
							}
							currentitem.parentEvent.leaf = false; //setup parent leaf us not last leaf in current branch(becouse this leaf have childs)
							currentitem.parentEvent.children.push(currentitem);
						}
						
					}
				}
			}
		}
		this.performanceTo = performance.now();
		console.log("Data prepared in: " + (this.performanceTo - this.performanceFrom) + " miliseconds");
		this.coldStart = false;

		if (this.autoUpdate == true && this.getAll == false && this.pageNavigation == false) {
			this.updaterReady = true;//this mean that autoupdater is ready for execute autoupdater(new storage is filled in)
			//this.responseDataReady = true;
		}


		this.readyState = true;
		if (this.filterAction == true)
			this.readyState3 = true;//this mean that autoupdater is ready for execute autoupdater
	},

	//Web Worker handling 
	/***********************************************************************************************/
	startWebWorker: function (filters, skip, limit, fastStatics){

		if (filters == undefined) filters = "";

		if (this.getAl == true && this.getRange == false)
			limit = 1;

		if (this.coldStart == true)
			limit = 100;

		this.responseReady = false;
		this.responseTick = 0;

		var pageInfo = this.getPageInfo();
		var lastPage = false;
		if (pageInfo.pageIndex == pageInfo.pageCount-1)
			lastPage = true;
		try {
			//this.webWorkerFrom = performance.now();
			var objData = {
				filters: filters,
				skip: skip,
				limit: limit,
				fastStatics: fastStatics,
				lastPage: lastPage
			};

			//var from = performance.now();
			//var result = CircularJSON.stringify(this.allMessages);
			//var to = performance.now();
			//alert("CircularJSON:" + (to - from));
			this.webWorkerFrom = performance.now();
			this.worker = new Worker('/Content/EventsHelpers/UpdaterTask.js');
			this.worker.onmessage = this.onWebWorkerComplited.bind(this);
			this.worker.onerror = this.onWebWorkerFail.bind(this);
			this.worker.postMessage(objData);//objData);

			// Pako magic
			//output = pako.inflate(binData);
			// Convert zipped byteArray back to utf8 string:
			//	responseObject = new TextDecoder("utf8").decode(output);
		} catch (error) {
			//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: Failed to unpack server response data.");
			console.log("Failed to run autoupdater. Exception: " + error);
		}
	},


	/**********************************************************************************************/
	onWebWorkerComplited: function (event) {
		//var data = JSON.parse(event.data);

		this.worker.terminate();
		var error = event.data.error;
		var response = event.data.response;

		this.webWorkerTo = performance.now();
		console.log("WebWorker complited in: " + (this.webWorkerTo - this.webWorkerFrom) + " miliseconds");


		this.responseWorker(response, "RequestMessages");
	},

	/**********************************************************************************************/


	/**********************************************************************************************/
	onWebWorkerFail: function (e) {
		//Ext.MessageBox.show({
		//	title: 'Error hapened!',
		//	msg: "Web Worker failed.<br>Exception : " + e.message,
		//	buttons: Ext.MessageBox.OK,
		//	animateTarget: this,
		//	fn: this.errorHandling("Web Worker"),
		//	icon: Ext.Msg.ERROR
		//});
		console.log("Web Worker failed. Exception : " + e.message);
	},

	/**********************************************************************************************/
	saveEmitters: function (response) {
		//setting up emittes list
		for (var i = 0; i < response.emitterList.length; i++) {
			if (this.emitters[response.emitterList[i].emitterId] == null) {
				this.emitters[response.emitterList[i].emitterId] = response.emitterList[i].emitterName;
			}
		}
		if (this.coldStart == true)
			this.updateFilters();
		this.emittersReady = true;
	},


	//Response handling functions
	/***********************************************************************************************/
	onRequestMessagesComleted: function (request, requestName) {
		if (request.status == 200) {
			this.responseReady = true;
			this.performanceTo = performance.now();
			console.log("Response time for RequestMessages: " + (this.performanceTo - this.performanceFrom));
			this.responseWorker(request.response, requestName);
		} else this.reportErrorMessage(request, requestName, true);
	},

	responseWorker: function (response, requestName) {
		var responseJson = this.responseHandler(response); //this.eventsResponseHandler(request.response);
		if (responseJson != null && (typeof responseJson === "string")) {
			var responseObject = JSON.parse(responseJson);
			if (responseObject.errorMessage == "") {
				try {
					this.updateEvents(responseObject);
					this.responseReady = false;
					if (this.pageNavigation == true) {
						this.readyState2 = true;

						//this.runner.start(this.pageNavTask);
					}
					console.log("RequestMessages completed.");
					//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: RequestMessages completed.");
				} catch (error) {
					Ext.MessageBox.show({
						title: 'Error hapened!',
						msg: "Uncatch error,failed to process events data.<br>Exception info: " + error.message,
						buttons: Ext.MessageBox.OK,
						animateTarget: this,
						fn: this.errorHandling(requestName),
						icon: Ext.Msg.ERROR
					});
					console.log("Uncatch error,failed to process events data.<br>Exception info: " + error.message);
					//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: Uncatch error,failed to process events data.");
				}
			} else {
				Ext.MessageBox.show({
					title: 'Error hapened!',
					msg: "Bad request : " + responseObject.errorMessage,
					buttons: Ext.MessageBox.OK,
					animateTarget: this,
					fn: this.errorHandling(requestName),
					icon: Ext.Msg.ERROR
				});
				console.log("Bad request : " + responseObject.errorMessage);
				//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: Request status: " + request.statusText + ".</br>" + request.errorMesssage);
			}
		} else {

			Ext.MessageBox.show({
				title: 'Error hapened!',
				msg: "Bad response.<br>Failed to unpack server response data",
				buttons: Ext.MessageBox.OK,
				animateTarget: this,
				fn: this.errorHandling(requestName),
				icon: Ext.Msg.ERROR
			});
			//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: Request status: " + request.statusText + ".</br>" + request.errorMesssage);
		}
	},

	/***********************************************************************************************/
	onRequestEmittersComleted: function (request, requestName) {
		if (request.status == 200) {
			this.responseReady = true;
			var responseJson = this.responseHandler(request.response);
			if (responseJson != null && (typeof responseJson === "string")) {
				var responseObject = JSON.parse(responseJson);
				if (responseObject.errorMessage === "") {
					try {

						this.saveEmitters(responseObject);
						console.log("RequestEmitters completed.");
					} catch (error) {
						Ext.MessageBox.show({
							title: 'Error hapened!',
							msg: "Uncatch error,failed to process emitters data.<br>Exception info: " + error.message,
							buttons: Ext.MessageBox.OK,
							animateTarget: this,
							fn: this.errorHandling(requestName),
							icon: Ext.Msg.ERROR
						});
						console.log("Uncatch error,failed to process emitters data.<br>Exception info: " + error.message);
						//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: Uncatch error,failed to process emitters data.");
					}
				} else {
					Ext.MessageBox.show({
						title: 'Error hapened!',
						msg: "Bad request : " + responseObject.errorMessage,
						buttons: Ext.MessageBox.OK,
						animateTarget: this,
						fn: this.errorHandling(requestName),
						icon: Ext.Msg.ERROR
					});
					console.log("Bad request : " + responseObject.errorMessage);
					//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: Request status: " + request.statusText + ".</br>" + request.errorMesssage);
				}
			} else {

				Ext.MessageBox.show({
					title: 'Error hapened!',
					msg: "Failed to unpack server response data",
					buttons: Ext.MessageBox.OK,
					animateTarget: this,
					fn: this.errorHandling(requestName),
					icon: Ext.Msg.ERROR
				});
			}
		} else this.reportErrorMessage(request, requestName, true);
	},

	/***********************************************************************************************/
	responseHandler: function (charData) {
		var binData = null;
		var output = null;
		var responseObject = null;
		try {
			// Turn number array into byte-array
			binData = new Uint8Array(charData);

			// Pako magic
			output = pako.inflate(binData);
			try {
				// Convert zipped byteArray back to utf8 string:
				responseObject = new TextDecoder("utf8").decode(output);
			} catch (error) {
				try {
					// Convert zipped byteArray back to utf8 string:
					if (output.length > 65000) {
						//var c = Math.round(output.length / 65000) + 1;
						//for (var i = 0; i < c; i++) {
						//	responseObject = responseObject + this.ab2str(output.slice(i * 65000, 65000));
						responseObject = this.arrayBufferToString(output);
						//}
						//responseObject = responseObject + "}";
					} else responseObject = this.ab2str(output);
				} catch (error) {
					console.log(error);
				}
			}
		} catch (error) {
			console.log("Failed to unpack server response.");
		}
		return responseObject;
	},


	arrayBufferToString:function(buffer)
	{
		var bufView = new Uint16Array(buffer);
		var length = bufView.length;
		var result = '';
		for(var i = 0;i<length;i+=65535)
		{
			var addition = 65535;
			if(i + 65535 > length)
			{
				addition = length - i;
			}
			result += String.fromCharCode.apply(null, bufView.subarray(i,i+addition));
		}
		
		return result;
	},

	//Alternative array buffer to string converting
	/**********************************************************************************************/
	ab2str:function(buf) {
		return String.fromCharCode.apply(null, new Uint8Array(buf));
	},

	//Error handling functions
	/**********************************************************************************************/
	reportErrorMessage: function (request, requestName, binaryResponse) {


		// Decode response message
		var responseMessage = null;

		if (binaryResponse) {
			try {
				var textDecoder = new TextDecoder();
				responseMessage = textDecoder.decode(request.response);
			} catch (error) {
				try {
					// Convert zipped byteArray back to utf8 string:
					if (output.length > 65000) {
						responseMessage = this.arrayBufferToString(output);
					} else responseMessage = this.ab2str(output);
				} catch (error) {
					console.log(error);
				}
			}
		}
		else {
			responseMessage = request.response;
		}

		// Decode JSON response
		var decodedResponse = null;

		try {
			decodedResponse = JSON.parse(responseMessage);
			Ext.MessageBox.show({
				title: requestName,
				msg: "Failed to sent request.<br>Exception: " + decodedResponse.errorMessage,
				buttons: Ext.MessageBox.OK,
				icon: Ext.MessageBox.ERROR
			});
		}
		catch (exception) {
			this.requestStatusHandler(request.status, requestName);
		}

		this.errorHandling(requestName);

	},

	/***********************************************************************************************/
	errorHandling: function (requestName) {
		console.log(requestName + " failed.");
		//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: Error occured. Please refresh page.");
		window.clearInterval(this.workerTimer);
		window.clearTimeout(this.workerTimer);
		this.readyState = false;
		this.serviceLogObject.loadingMask.hide();
	},

	/***********************************************************************************************/
	requestStatusHandler: function (status, requestName) {
		if (status == 500) {
			Ext.MessageBox.show({
				title: 'Error hapened!',
				msg: "The server encountered an unexpected condition<br> which prevented it from fulfilling the request.",
				buttons: Ext.MessageBox.OK,
				animateTarget: this,
				fn: this.errorHandling(requestName),
				icon: Ext.Msg.ERROR
			});
			console.log("The server encountered an unexpected condition which prevented it from fulfilling the request.");

		} else if (status == 204) {
			Ext.MessageBox.show({
				title: 'Error hapened!',
				msg: "The server successfully processed the request,<br>  but is not returning any content.",
				buttons: Ext.MessageBox.OK,
				animateTarget: this,
				fn: this.errorHandling(requestName),
				icon: Ext.Msg.ERROR
			});
			console.log("The server successfully processed the request, but is not returning any content.");
		}
		else {
			Ext.MessageBox.show({
				title: requestName,
				msg: "Uncatch exception. Failed to sent request",
				buttons: Ext.MessageBox.OK,
				icon: Ext.MessageBox.ERROR
			});
			console.log("Uncatch exception. Failed to sent request");
		}
		//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: Error occured.Please refresh page.");
	},

	/***********************************************************************************************/
	onRequestFailed: function (request, requestName) {
		this.requestStatusHandler(request.status, requestName);
		this.errorHandling(requestName);
	},


	//Converting operations
	/**********************************************************************************************/
	//numbers to IP
	num2dot: function (num) {
		var d = num % 256;
		for (var i = 3; i > 0; i--) {
			num = Math.floor(num / 256);
			d = d + '.' + num % 256;
		}
		return d;
	},

	/**********************************************************************************************/
	//IP to numbers
	dot2num: function (dot) {
		var d = dot.split('.');
		var part1 = parseInt(d[3]) * 16777216;
		var part2 = parseInt(d[2]) * 65536;
		var part3 = parseInt(d[1]) * 256;
		var part4 = parseInt(d[0]);
		return part1 + part2 + part3 + part4;
		//	return ((((((+d[0]) * 256) + (+d[1])) * 256) + (+d[2])) * 256) + (+d[3]);
	},

	/**********************************************************************************************/
	getMessageType: function (value) {
		return this.msgTypesMap[value];
	},

	/**********************************************************************************************/
	getMessageTypeId: function (value) {

		for (var key in this.msgTypesMap) {
			if (this.msgTypesMap[key] == value) {
				return key;
			}
		}
		return 4294967295;
	},

	getNumByIP: function (value) {
		for (var key in this.ipList) {
			if (this.ipList[key] == value) {
				return key;
			}
		}
		return undefined;
	},

	/**********************************************************************************************/
	getEmitterName: function (emId) {
		var name = this.emitters[id];
		return name;
	},

	/**********************************************************************************************/
	getEmitterId: function (emName) {
		for (var key in this.emitters) {
			if (this.emitters[key] == emName) {
				return key;
			}
		}
	},

	/***********************************************************************************************/
	//ulong to Date
	convertTicksToDate: function (stringnifiedNumber) {

		var microseconds = goog.math.Long.fromString(stringnifiedNumber, 10);	// goog.math.Long
		var milliseconds = microseconds.div(new goog.math.Long(1000, 0));		// goog.math.Long

		return new Date(milliseconds.toNumber());
	},


	//Cookie operation
	/************************************************************************************************/
	setCookie: function (cname, cvalue, exdays) {
		var d = new Date();
		d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
		var expires = "expires=" + d.toUTCString();
		document.cookie = cname + "=" + cvalue + "; " + expires + "path=/ExtendedView";
	},

	/************************************************************************************************/
	getCookie: function (cname) {
		var name = cname + "=";
		var ca = document.cookie.split(';');
		for (var i = 0; i < ca.length; i++) {
			var c = ca[i];
			while (c.charAt(0) == ' ') c = c.substring(1);
			if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
		}
		return "";
	},


	//Filters&Configs operation
	/************************************************************************************************/
	//get filters from saved cookies
	getFilters: function (emitters) {

		var filterData = this.getCookie("filtersData");
		var emitterIdList = [];
		var emitterIpList = [];
		var mesageType = 0;
		var priorityMin = 0;
		var priorityMax = 0;
		var title = "";
		var text = "";
		var attachments = false;
		var timeStart = 0;
		var timeEnd = 0;
		if (filterData.length > 0) {
			var data = JSON.parse(filterData);

			////////////////////////////////////////////////////////////
			if (data.filters.emitterIdList != undefined) {

				var filteredEmittersNames = data.filters.emitterIdList;

				timeStart = data.filters.deliveryTimeStart;
				timeEnd = data.filters.deliveryTimeEnd;

				for (var i = 0; i < filteredEmittersNames.length; i++) {
					var emitter = filteredEmittersNames[i];
					if (this.isNumeric(emitter) == true) {
						emitterIdList.push(emitter);
					} else {
						var id = this.getEmitterId(emitter);
						if (id != undefined)
							emitterIdList.push(id);
					}
				}

				for (var i = 0; i < data.filters.emitterIpList.length; i++) {
					emitterIpList.push(data.filters.emitterIpList[i]);
				}

				for (var i = 0; i < data.filters.messageTypes.length; i++) {
					mesageType = mesageType | data.filters.messageTypes[i];
				}

				priorityMin = data.filters.priorityMin;
				priorityMax = data.filters.priorityMax;

				title = data.filters.titleMatch;
				text = data.filters.textMatch;
				attachments = data.filters.mustHaveAttachments;

			}///////////////////////////////////////////////////////////
			else if (data.filters.ticks != undefined) {
				//get values
				timeStart = data.filters.ticks.start;
				timeEnd = data.filters.ticks.end;

				priorityMin = data.filters.priority.min;
				priorityMax = data.filters.priority.max;

				title = data.filters.title;
				text = data.filters.text;
				attachments = data.filters.attachments;

				var oldEmitters = data.filters.emitters.filtered;
				var oldIPs = data.filters.IPs.filtered;
				var oldMsgTypes = data.filters.msgTypes.filtered;

				for (var j = 0; j < oldEmitters.length; j++) {
					var item = oldEmitters[j];
					if (this.isNumeric(item) == true) {
						emitterIdList.push(item);
					} else {
						var id = this.getEmitterId(item);
						if (id != undefined)
							emitterIdList.push(id);
					}
				}

				for (var j = 0; j < oldIPs.length; j++) {
					var item = oldIPs[j];
					if (this.isNumeric(item) == true) {
						emitterIpList.push(item);
					} else {
						var id = this.dot2num(item);
						if (id != undefined)
							emitterIpList.push(id);
					}	
				}

				var msgTypes = [];
				for (var j = 0; j < oldMsgTypes.length; j++) {
					var item = oldMsgTypes[j];
					if (this.isNumeric(item) == true) {
						mesageType = mesageType | item;
						msgTypes.push(item);
					} else {
						var id = this.getMessageTypeId(item);
						if (id != undefined) {
							mesageType = mesageType | id;
							msgTypes.push(id);
						}
					}
				}
				//set new values
				var tmp = {};
				tmp['deliveryTimeStart'] = timeStart;//this.lastMessagetime + 1;
				tmp['deliveryTimeEnd'] = timeEnd;
				tmp['emitterIdList'] = emitterIdList;
				tmp['emitterIpList'] = emitterIpList;
				tmp['messageTypes'] = msgTypes;
				tmp['priorityMin'] = priorityMin;
				tmp['priorityMax'] = priorityMax;
				tmp['titleMatch'] = title;
				tmp['textMatch'] = text;
				tmp['mustHaveAttachments'] = attachments;

				//replace old cookies with new one
				document.cookie = "filtersData" + "=" + "; expires=Thu, 01 Jan 1970 00:00:01 GMT";
				this.setCookie("filtersData", JSON.stringify({ filters: tmp }),99);
			}
		}

		var filters = {};
		filters['deliveryTimeStart'] = timeStart;//this.lastMessagetime + 1;
		filters['deliveryTimeEnd'] = timeEnd;
		filters['emitterIdList'] = emitterIdList;
		filters['emitterIpList'] = emitterIpList;
		filters['messageTypes'] = mesageType;
		filters['priorityMin'] = priorityMin;
		filters['priorityMax'] = priorityMax;
		filters['titleMatch'] = title;
		filters['textMatch'] = text;
		filters['mustHaveAttachments'] = attachments;

		var resultobject = {};
		resultobject["filters"] = filters;
		return JSON.stringify(resultobject, '\n', null);
	},

	/**********************************************************************************************/
	isNumeric: function (n) {
		return !isNaN(parseFloat(n)) && isFinite(n);
	},


	/************************************************************************************************/
	//get configs from saved cookies
	getConfigs: function () {

		var configData = this.getCookie("config");
		var updatePeriod = "5 sec.";
		var messageCount = 1000;

		if (configData != undefined && configData.length > 0) {
			var data = JSON.parse(configData);
			updatePeriod = data.config.updatePeriod;
			messageCount = data.config.messageCount;
			if (messageCount == "Fit to page") {
				messageCount = this.serviceLogObject.getPagingConfig();
			}
		}
		var config = {};
		config['updatePeriod'] = updatePeriod;
		config["messageCount"] = messageCount;
		var resultobject = {};
		resultobject["config"] = config;
		return JSON.stringify(resultobject, '\n', null);
	},

	/************************************************************************************************/
	updateExpandedItems: function (node, index) {
		if (this.expandedItems.hasOwnProperty(node.raw.itemIndex) != true) {
			var parentId = -1;
			if (node.parentNode.id != "root") {
				parentId = node.parentNode.raw.itemIndex;
			}
			var item = {
				"index": index,
				"parentId": parentId
			};
			this.expandedItems[node.raw.itemIndex] = item;
		}
	},

	/************************************************************************************************/
	startEventsWorker:function(){
		this.checkAction(this.lastAction);
	},

	/************************************************************************************************/
	stopEventsWorker:function(){
		window.clearInterval(this.workerTimer);
		window.clearTimeout(this.workerTimer);
		if (this.worker!=null)
			this.worker.terminate();
	}

});