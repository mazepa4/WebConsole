/**************************************************************************************************
*** Service log tab
**************************************************************************************************/
Ext.define("Ext.tab.ServiceLog", {
	extend: "Ext.container.Container",
	xtype: "serviceLogTab",
	title: 'Event Log',
	//id:"ServiceLog",
	//Controllers
	scrollerObject: null, //scroller controller object
	filterPanelObject: null, //filter panel controller object
	treeViewObject: null, //tree view controller object
	scrollBarEl: null,
	expOrColAction: false,


	liveTreeViewEl:null,

	curCountDisplayed: 0,
	selData: null,
	count: 0,
	curPos:0,

	rootNode: null,
	loadingMask:null,
	key:0,

	scrollerStartTicks:0,
	scrollerEndTicks:0,
	scrollerAction:false,

	/**********************************************************************************************/
	constructor: function () {

		Ext.apply(arguments[0], {
			items: [
				{
					xtype: 'panel',
					title: 'Filters',
					collapsed: false,
					bodyStyle: {
						background: '#EDEDED',
					},
					layout: {
						type: 'vbox',
						align: 'stretch'
					}, 
					items: [
						{
							xtype: 'filterPanel',
							maxHeight: "auto",
							id: "filterPanelId",
							bodyStyle: {
								background: '#EDEDED',
								
							}
						}
					]
				},
				{
					xtype: 'scroller',
					title: 'Revisions selector',
					id: "scrollerId",
					minHeight: 110,
					height: 110
				},
				{
					xtype: 'splitter',
					style: {
						
						borderColor: '#99bce8',
						borderStyle: 'solid',
						//listeners: {
						//	move: this.updateTreeSize()
						//}
					},
					height: 3
				},{
					xtype: 'livetreeview',
					title: 'Events viewer',
					id: 'treeViewPanelId',
					layout: {
						type: 'fit',
						//align: 'stretch'
					},
					
					items: [
					{
						xtype: '',
						title: '',
						//cls: "no-scrollbars"
					}]
				}
			]}
		);
		
		this.callParent(arguments);
		this.initComponents();

		this.on("afterrender", function () {

			this.liveTreeViewEl = Ext.getCmp("treeViewId4");
			this.eventWorker = new EventsWorker(this);

			this.filterPanelObject = Ext.getCmp("filterPanelId");
			
			this.scrollerObject = Ext.getCmp("scrollerId");
			this.scrollerObject.on("RefreshView", this.eventWorker.checkAction.bind(this.eventWorker));

			

			this.filterPanelObject.on("RefreshView", this.eventWorker.checkAction.bind(this.eventWorker));
			this.filterPanelObject.on("updateTreeSize", this.updateTreeSize.bind(this));
			this.liveTreeViewEl.on("getEventsByRange", this.eventWorker.getEventsByRange.bind(this.eventWorker));
			this.liveTreeViewEl.on("setUpUpdater", this.eventWorker.setUpUpdater.bind(this.eventWorker));
			this.liveTreeViewEl.on("RefreshView", this.eventWorker.checkAction.bind(this.eventWorker));

			this.on("resize", this.onResize.bind(this));
			//this.scrollerObject.on("resize", this.onResize.bind(this));
			this.on("activate", this.onActivate.bind(this));

			this.on("hide", function (scope, eOpts) {
				this.eventWorker.stopEventsWorker();
			}.bind(this));

			this.on("show", function (scope, eOpts) {
				this.eventWorker.startEventsWorker();
				
			}.bind(this));


			this.loadingMask = new Ext.LoadMask({ msg: "Please wait for server response...", target: this});
			this.loadingMask.show();

			this.updateLayout(true);
		});
	},


	/**********************************************************************************************/
	onResize: function ( scope, width, height, oldWidth, oldHeight, eOpts ) {
		this.updateTreeSize();
	},
	
	//"Cold" start
	//onActivate -> onColdStart -> onUpdateStart
	//Change page
	//getEventsByRange -> onActivate ->

	/***********************************************************************************************/
	onActivate: function (scope, eOpts) {
		//execute starter function form EventsWorker class
		//this.updateTreeSize();
		
		//this.eventWorker.checkAction(5);
	},

	/**********************************************************************************************/
	updateTreeSize: function () {
		//try{
			//var top = parseInt(Ext.getCmp("treeViewPanelId").getEl().dom.style.top);
			//var bodyWidth = this.getWidth();
			//var bodyHeight = this.getHeight();
			//Ext.getCmp("liveTreeViewId").setHeight(bodyHeight - top - 28);
			////Ext.getCmp("treeViewId4").setWidth(bodyWidth - 50);
			//Ext.getCmp("sliderElId4").setHeight(bodyHeight - top - 77);
		//} catch (Err) {

		//}
		//Ext.getCmp("customScrollBarElId").height = (bodyHeight - top - 28);
	},

	/**********************************************************************************************/
	initComponents: function () {
		
	},
	
	/**********************************************************************************************/
	//0 no changes (0 new events)
	//1 change page count && message count(a few new events && not last page)
	//2 change page count && message count && update table (a few new events && last page && overal events < MAX)
	//3 change pageIndex && page count && message count && update table (a few new events && last page && overal events > MAX)
	setupTreeView:function(key) {
		this.key = key;
	},
	
	/**********************************************************************************************/
	getPageInfo:function() {
		var pageIndex = this.liveTreeViewEl.pagingToolbarEl.pageIndex;
		var pageCount = this.liveTreeViewEl.pagingToolbarEl.pageCount;
		return {pageIndex:pageIndex,
			pageCount: pageCount
		};
	},

	/***********************************************************************************************/
	appendChild: function (node,parentId) {
		//var root = this.treeViewObject.getStore().getRootNode();//getNodeById(parentId);//.getPath(); 
		var rez = this.rootNode.appendChild(node);
	//	var last = root.lastChild;
		//console.log(last);
		//this.treeViewObject.expandPath(this.treeViewObject.getStore().getNodeById(last.id).getPath());
	},

	/***********************************************************************************************/
	getLastChild: function () {
		var root = this.treeViewObject.getStore().getRootNode(); 
		var last = root.lastChild;
		return last;
	},

	/***********************************************************************************************/
	updateUI: function (action) {
		//this.scrollBarEl.setMaxValue(this.eventWorker.treeViewData.length - this.treeViewObject.viewCount);
		
		this.count = 0;
		this.startIndex = -1;
		
		switch (action) {
			case 1://pageNavigation
				//just call updateTree func in TreeView control
				var performanceFrom = performance.now();
				this.liveTreeViewEl.setupScrollbar(true, 1);
				//this.treeViewObject.updateTree(this.eventWorker.treeViewData,true);
				var performanceTo = performance.now();
				console.log("UI was updated in : " + (performanceTo - performanceFrom) + " miliseconds");
				console.log("-------------------------------------------------------------------------");

				break;
			case 2://getAll
				//setup UI
				var performanceFrom = performance.now();
				this.liveTreeViewEl.setupScrollbar(true, 2);
				var performanceTo = performance.now();
				//this.treeViewObject.suspendLayout = false;
				console.log("UI(TREE) was updated in : " + (performanceTo - performanceFrom) + " miliseconds");
				
				performanceFrom = performance.now();
				//this.filterPanelObject.suspendLayout = true;
				this.filterPanelObject.setUpComponents(
				this.eventWorker.emitters,
				this.eventWorker.ipList,
				this.eventWorker.msgTypesMap,
				this.eventWorker.lastMessageTime + 1);
				//this.filterPanelObject.suspendLayout = false;
				performanceTo = performance.now();
				console.log("UI(FILTERS) was updated in : " + (performanceTo - performanceFrom) + " miliseconds");
				console.log("-------------------------------------------------------------------------");
				this.scrollerObject.resetScroller();
				this.updateScroller();
			break;

			case 3://autoUpdate
				var performanceFrom = performance.now();
				this.liveTreeViewEl.setupScrollbar(true, 3, this.key);
				if (this.key == 3)
					this.eventWorker.allMessages = {};
				//this.loadingMask.hide();
				var performanceTo = performance.now();
			//	this.treeViewObject.suspendLayout = false;
				console.log("UI was updated in : " + (performanceTo - performanceFrom) + " miliseconds");
				
				///this.filterPanelObject.suspendLayout = true;
				this.filterPanelObject.setUpComponents(this.eventWorker.emitters,
								this.eventWorker.ipList,
								this.eventWorker.msgTypesMapt,
								this.eventWorker.lastMessageTime + 1, true);
				////////////////////////////////////////////////////////////////////////////////////

				
				//this.filterPanelObject.suspendLayout = false;
				//this.treeViewObject.statusLabel.setText("Status: Autoupdate completed.");
				console.log("-------------------------------------------------------------------------");
				this.updateScroller();
				break;

			case 4://filterAction
				//setup UI
				var performanceFrom = performance.now();
				//this.loadingMask.show();
				this.liveTreeViewEl.setupScrollbar(true, 4);

				//update emitters and ip instead of full control refresh
				
			
			
				
				//this.filterPanelObject.suspendLayout = true;
				//this.filterPanelObject.setUpComponents(this.eventWorker.emitters,
				//				this.eventWorker.ipList,
				//				this.eventWorker.msgTypesMapt,
				//				this.eventWorker.lastMessageTime + 1);
				//this.filterPanelObject.suspendLayout = false;
				var performanceTo = performance.now();
				console.log("UI was updated in : " + (performanceTo - performanceFrom) + " miliseconds");
				console.log("-------------------------------------------------------------------------");
				//this.treeViewObject.suspendLayout = false;
				this.scrollerObject.resetScroller();
				this.updateScroller();
				break;
			case 6:// filterAction
				//setup UI
				var performanceFrom = performance.now();
				//this.loadingMask.show();
				this.liveTreeViewEl.setupScrollbar(true, 6);

				//update emitters and ip instead of full control refresh
				
			
			
				
				//this.filterPanelObject.suspendLayout = true;
				//this.filterPanelObject.setUpComponents(this.eventWorker.emitters,
				//				this.eventWorker.ipList,
				//				this.eventWorker.msgTypesMapt,
				//				this.eventWorker.lastMessageTime + 1);
				//this.filterPanelObject.suspendLayout = false;
				var performanceTo = performance.now();
				console.log("UI was updated in : " + (performanceTo - performanceFrom) + " miliseconds");
				console.log("-------------------------------------------------------------------------");
				//this.treeViewObject.suspendLayout = false;

				
				break;

			case 5://coldStart
				var performanceFrom = performance.now();
				this.liveTreeViewEl.setUpPageController();
				this.liveTreeViewEl.setupScrollbar(true, 5);
				var performanceTo = performance.now();
				//this.treeViewObject.suspendLayout = false;
				console.log("UI was updated in : " + (performanceTo - performanceFrom) + " miliseconds");
				
				//this.filterPanelObject.suspendLayout = true;
				this.filterPanelObject.setUpComponents(
				this.eventWorker.emitters,
				this.eventWorker.ipList,
				this.eventWorker.msgTypesMap,
				this.eventWorker.lastMessageTime + 1);
				//var startTime=this.eventWorker.firstMessageTime;
				//var lastTIme=this.eventWorker.lastMessageTime;
				//this.filterPanelObject.suspendLayout = false;
				console.log("-------------------------------------------------------------------------");
				this.updateScroller();
				break;

			default:
				
			break;
		}
		this.loadingMask.hide();
	},

	/***********************************************************************************************/
	updateScroller:function(){
		
		var fromTicks=this.filterPanelObject.from_date.getValue();
		var untilTicks=this.filterPanelObject.to_date.getValue();
		var startTicks=0;
		var endTicks=0;

		if(fromTicks!=null && untilTicks!=null){
			this.scrollerObject.scrollerStartTicks = fromTicks.getTime()* 1000;
			this.scrollerObject.scrollerEndTicks = untilTicks.getTime() * 1000 + 1;
			this.scrollerObject.initScroller();
		}else{
			this.scrollerObject.loadingMask.show();
			if(untilTicks==null && fromTicks==null){
				this.scrollerObject.scrollerStartTicks = this.eventWorker.firstMessageTime;
				this.scrollerObject.scrollerEndTicks = this.eventWorker.lastMessageTime;
				this.scrollerObject.initScroller();
			}
			else if(fromTicks!=null){
				this.scrollerObject.scrollerStartTicks = fromTicks.getTime()* 1000;
				this.scrollerObject.scrollerEndTicks = this.eventWorker.lastMessageTime;
				this.scrollerObject.initScroller();
			}else if(untilTicks!=null){
				this.scrollerObject.scrollerStartTicks = this.eventWorker.firstMessageTime;
				this.scrollerObject.scrollerEndTicks = untilTicks.getTime() * 1000 + 1;
				this.scrollerObject.initScroller();
			}		
		}
	},

//Server request functions
	//getting first event
	//it required for scroller filter
	/**********************************************************************************************/
	getEdgeEvents:function(getFirst,getLast){
		// Build and send the request
		var requestUrl = "/Watcher/RequestMessages?skip=" + 0 + "&limit=" + 1 +
		"&statics=" + 0;
		var messagesResponse = "";
		var request = new XMLHttpRequest();
		request.open("POST", requestUrl, true);
		request.responseType = "arraybuffer";
		request.onload = function (request, requestName) {
			if (request.status == 200) {
				var responseJson = this.eventWorker.responseHandler(request.response);
				if (responseJson != null && (typeof responseJson === "string")) {
					var responseObject = JSON.parse(responseJson);
					if (responseObject.errorMessage == "") {
						if (responseObject.filteredMessagesQuantity != 0) {
							var ticks = parseFloat(responseObject.messageList[0].messageDeliveryTime);
							if (getFirst == true) {
								if (ticks != this.scrollerObject.scrollerStartTicks) {
									this.scrollerObject.scrollerStartTicks = ticks;
									if (getLast == false)
										this.scrollerObject.initScroller();
								}
								if (getLast == true) {
									this.getLastEvent(parseInt(responseObject.filteredMessagesQuantity) - 1);
								}
							} else {
								this.getLastEvent(parseInt(responseObject.filteredMessagesQuantity) - 1);
							}
						} else this.scrollerObject.loadingMask.hide();
					}
				}
			} else this.reportErrorMessage(request, requestName, true);
		}.bind(this, request, "RequestMessages");
		request.onerror = this.eventWorker.onRequestFailed.bind(this.eventWorker, request, "RequestMessages");
		var params = JSON.parse(this.eventWorker.getFilters());
		params.filters.deliveryTimeStart *= 1000;
		params.filters.deliveryTimeEnd *= 1000;
		request.send(JSON.stringify(params.filters));
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
					var responseJson = this.eventWorker.responseHandler(request.response);
					if (responseJson != null && (typeof responseJson === "string")) {
						var responseObject = JSON.parse(responseJson);
						if (responseObject.errorMessage == "") {
							var ticks=parseFloat(responseObject.messageList[0].messageDeliveryTime);
							if(ticks!=this.scrollerObject.scrollerEndTicks){
								this.scrollerObject.scrollerEndTicks = ticks;
								this.scrollerObject.initScroller();
							}
						}
					}
				} else this.reportErrorMessage(request, requestName, true);
			}.bind(this, request, "RequestMessages");
			request.onerror = this.eventWorker.onRequestFailed.bind(this.eventWorker, request, "RequestMessages");
			var params = JSON.parse(this.eventWorker.getFilters());
			params.filters.deliveryTimeStart *= 1000;
			params.filters.deliveryTimeEnd *= 1000;
			request.send(JSON.stringify(params.filters));
		}
	},


	/***********************************************************************************************/
	setScrollerEdges:function(start,end){
		this.eventWorker.scrollerStartTime=start;
		this.eventWorker.scrollerEndTime=end;
	},

	/***********************************************************************************************/
	setScrollerStartTicks:function(ticks){
		if(ticks!=this.scrollerObject.scrollerStartTicks){
			this.scrollerObject.scrollerStartTicks = parseFloat(ticks);
			if(this.scrollerObject.scrollerEndTicks != 0)
				this.scrollerObject.initScroller();
		}
	},

	/***********************************************************************************************/
	setScrollerEndTicks:function(ticks){

		if(ticks!=this.scrollerObject.scrollerEndTicks){
			this.scrollerObject.scrollerEndTicks = parseFloat(ticks);
			if(this.scrollerObject.scrollerStartTicks != 0)
				this.scrollerObject.initScroller();
		}
	},

	/***********************************************************************************************/
	getFilters:function(){
		return this.filterPanelObject.getCookie("filtersData");
	},

	/***********************************************************************************************/
	getPagingConfig:function() {
		return parseInt(this.liveTreeViewEl.getView().getHeight() / 31);
	}
});