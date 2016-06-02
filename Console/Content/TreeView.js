/**************************************************************************************************
*** MessageModel
**************************************************************************************************/
Ext.define('MessageModel', {
	extend: 'Ext.data.TreeModel',
	//extend: 'Ext.data.Model',
	fields: [
		{
			name: 'msgTitleAttch', type: 'string',
			convert: function (v, record)
			{
				var title = record.get('msgTitle');
				if (title == "" || title == null || title == " " || title == undefined)
					title = "<Global service message>";

				if (record.get('attachCount')>0)
					return title + '(' + record.get('attachCount') + ')';
				else
					return title;
			}
		},
		{ name: 'msgEmTime', type: 'string' },
		{ name: 'durTime', type: 'string' },
		{ name: 'msgType', type: 'string' },
		{ name: 'priority', type: 'string' },
		{ name: 'emId', type: 'string' },
		{ name: 'emIp', type: 'string' },
		{ name: 'msgText', type: 'string' },
		{ name: 'canvas', type: 'string' },
	],
});
 
/**************************************************************************************************
*** 
**************************************************************************************************/
Ext.define('Ext.EventsTreeView', {
	extend: 'Ext.tree.Panel',

	requires: [
		'Ext.data.*',
		'Ext.grid.*',
		'Ext.tree.*',
		'Ext.ux.CheckColumn',
		'Ext.data.TreeStore',
		'Ext.data.TreeModel'
	],
	xtype: 'tree-grid',

	//!!!!!
	diffTicks: 0,

	//using in tree fill
	startTicks: 0,
	endTicks: 0,
	rootEment: null,

	viewCount:0,

	


	serviceLog: null,
	rootLength: 0,

	//tree configure
	//autoScroll: false,
	stateful: true,
	mouseWheelEnabled: true,
	animCollapse: true,
	infoColor: "#00A9FF",
	warnColor: "#FFFF14",
	errColor: "#FF1000",
	autoHeight: false,
	shadowOffset:3,
	loadMask: true,
	loadingText:"QQQQQ",	
	overflowY: 'hidden',
	autoRender: false,
	useArrows: true,
	rootVisible: false,
	//multiSelect: false,
	shadow: true,
	lines: true,
	stripeRows: false,
	//animate: true,
	//singleExpand: false,
	height: 900,

	//others
	columnWidth: 0,
	attachmentsWindow: null,
	prevScrollPos:0,
	mouseHover: false,
	scrollTop: 0,
	scrollHeight: 0,
	updatePeriodEl: null,
	msgCountEl: null,
	expandedItems: {},
	
	loadingMask: null,
	pagingToolbarEl: null,
	titleWindow: null,
	titleTimeout: null,

	clickFrom: 0,
	newTab: false,


	//baseCls: "no-scrollbars",
	//baseCls: "no-scrollbars",
	//cls: "no-scrollbars",
	//componentCls: "no-scrollbars",
	//selectedItemCls: "no-scrollbars",

	listeners: {
		itemmouseenter: function(view, record, item, index, e, options)
		{
			if (this.titleWindow != null) {
				this.titleWindow.hide();
				window.clearTimeout(this.titleTimeout);
			}
			if (e.pageX < 139/* && record.data.msgTitle.length > 15*/) {
				this.titleWindow = Ext.create('Ext.window.Window', {
					layout: 'fit',
					closable: false,
					frame:false,
					constrainHeader: false,
					header: false,
					resizable:false,
					padding: 2,
					minHeight:20,
					height:"auto",
					x: e.pageX+20,
					y: e.pageY - 23,
					html: "Title: <b>" + record.data.msgTitle + "</b><br>" + "Attachments quantity: <b>" + record.data.attachCount,
				});
				this.titleTimeout = window.setTimeout(function () {
					this.titleWindow.hide();
				}.bind(this), 2000);
				this.titleWindow.show();
			}
		}.bind(this),
		itemmouseleave: function(view, record, item, index, e, options)
		{
			if (this.titleWindow != null) {
				this.titleWindow.hide();
				window.clearTimeout(this.titleTimeout);
			}
			//console.log(record);
		}.bind(this)
	},

	/**********************************************************************************************/
	constructor: function() {
	

		this.callParent(arguments);
		this.initNavigationButtons();

		this.on("afterrender", function () {

			this.serviceLog = Ext.getCmp('servicelogTabId');

			this.pagingToolbarEl = Ext.getCmp('pagingToolbarId');
			this.pagingToolbarEl.on("ChangeViewConfig", this.onChangeViewConfig.bind(this));
			this.pagingToolbarEl.on("ChangeMsgCount", this.onChangeMesageCount2.bind(this));
			this.pagingToolbarEl.on("Show", this.showTree.bind(this));


			this.on("itemclick", this.onItemClick.bind(this));

			this.on("itemdblclick", this.onItemDbClick.bind(this));


			this.on("columnresize", this.onColumnResize.bind(this));

			this.on("columnschanged", this.onColumnResize.bind(this));


			//this.view.getEl().on("mouseenter", function () {
			//	Ext.getCmp("treeViewId").mouseHover = true;
			//});
			//this.view.getEl().on("mouseleave", function () {
			//	Ext.getCmp("treeViewId").mouseHover = false;
			//});
			this.scrollFlags.overflowX = "hidden";
			this.scrollFlags.overflowY = "hidden";
			//console.log(this);
			//this.setScrollable(null);

			this.view.getEl().on('scroll', function (e, t) {
				//console.log(e);
				//console.log(t);
			//	console.log(this.getStore());
				//this.getStore().getPageFromRecordIndex
				//var input = t.getElementsByTagName("canvas");
				//var inputList = Array.prototype.slice.call(input);

				//console.log("scroll", t.scrollTop, t.scrollHeight);
				this.scrollTop = this.getView().getScrollY();;
				this.scrollHeight = t.scrollHeight;
				var top = t.scrollTop;

				//if (Math.abs(this.prevScrollPos - top) > 2000)
				//	top = this.prevScrollPos;
				//scope.drawTimeBars(null, inputList);
				
			}.bind(this));

			this.setUpComponent();

		});

		this.on("afteritemexpand", this.afterItemExpand.bind(this));
		this.on("afteritemcollapse", this.afterItemCollapse.bind(this));
		//this.on("append", this.onApend.bind(this));
		this.on("beforeitemexpand", this.beforeItemExpand.bind(this));
	},

	/**********************************************************************************************/
	initNavigationButtons: function () {
		this.addDocked(
		{
			xtype: 'toolbar',
			padding: 0,
			dock: "top",
			items: [{
				xtype: "button",
				text: "Collapse All",
				margin: "0 5 0 0",
				handler: function () {
					this.collapseAll();
				}.bind(this)
			}, {
				xtype: "button",
				text: "Expand All",
				margin: "0 5 0 0",
				handler: function () {
					this.expandAll();
				}.bind(this)
			}, '->',
					{
						xtype: 'pagingToolbar',
						height: 30,
						id: "pagingToolbarId",
						margin: "0 5 0 5",
						padding: 0,
						border: false,
					}
			]
		});
	},



	/*********************************************************************************************/
	onApend:function( thisNode, newChildNode, index, eOpts ) {
			
		// If the node that's being appended isn't a root node, then we can 
		// assume it's one of our UserModel instances that's been "dressed 
		// up" as a node
		//if( !newChildNode.isRoot() ) {
				
		//	// The node is a UserModel instance with NodeInterface
		//	// properties and methods added. We want to customize those 
		//	// node properties  to control how it appears in the TreePanel.
				
		//	// A user "item" shouldn't be expandable in the tree
		//	newChildNode.set('leaf', true);
				
		//	// Use the model's "name" value as the text for each tree item
		//	newChildNode.set('text', newChildNode.get('name'));
				
		//	// Use the model's profile url as the icon for each tree item
		//	newChildNode.set('icon', newChildNode.get('profile_image_url'));
		//	newChildNode.set('cls', 'demo-userNode');
		//	newChildNode.set('iconCls', 'demo-userNodeIcon');
		//}
	},

/*********************************************************************************************/
	beforeItemExpand: function (scope, eOpts) {
		
	},


	/*********************************************************************************************/
	afterItemExpand: function (node, index, item, eOpts) {
		//console.log("---EXPAND START---");
		//console.log("Node: " + node);
		//console.log(node);
		//console.log("Index: " + index);
		//console.log("Item: ");
		//console.log(item);
		//console.log("eOpts: " + eOpts);
		//console.log("---EXPAND END---");
		if (this.newTab == true && node.isExpanded()) {
			//if (!node.isExpanded())
			//	node.expand();
			//else node.collapse();
			this.newTab = false;
		}
		else {
			this.scrollTop = this.getView().getScrollY();
			console.log(this.scrollTop);
			var count = node.childNodes.length - 5;
			var scrollPeritem = this.scrollHeight / this.getStore().getRootNode().childNodes.length;
			//this.getView().setScrollY(this.scrollTop + scrollPeritem * count);
			if (this.serviceLog.eventWorker.expandedItems.hasOwnProperty(index) != true) {
				this.serviceLog.eventWorker.expandedItems[index] = node.getPath(); //this.getStore().getNodeById(node.id);
			}
		}
		var value=node.childNodes.length*32;
		this.serviceLog.changeSliderHeight(node.childNodes.length, 1, node);
		//console.log(this.serviceLog.eventWorker.expandedItems);
	},

	/*********************************************************************************************/
	afterItemCollapse: function ( node, index, item, eOpts ) {
		//console.log("---COLLAPSE START---");
		//console.log("Node: " + node);
		//console.log(node);
		//console.log("Index: " + index);
		//console.log("Item: ");
		//console.log(item);
		//console.log("eOpts: " + eOpts);
		//console.log("---COLLAPSE END---");
		this.scrollTop = this.getView().getScrollY();
		var value = node.childNodes.length * 31;

		if (this.serviceLog.eventWorker.expandedItems.hasOwnProperty(index) == true)
		{
			delete this.serviceLog.eventWorker.expandedItems[index];
					}

		this.serviceLog.changeSliderHeight(node.childNodes.length, -1,node);
		//this.getView().collapse(index, 1);
		
	
		//console.log(this.serviceLog.eventWorker.expandedItems);
	},

	/*********************************************************************************************/
	initComponent: function () {
		this.width = 600;

		Ext.applyIf(this, {
			singleExpand: false,
			store: Ext.data.TreeStore({
				extend: 'Ext.data.TreeStore	',
				model: "MessageModel",
				root: {
					text: 'Root',
					expanded: true,
					children: null
				},
				//pageSize: 100,
				//purgePageCount:3,
				//	clearOnLoad:true,
				lazyFill: true,
				autoSync: false,
				autoLoad: false,
				//autoDestroy: true,
				//sortOnLoad:true,
				//autoSort: true,
				//folderSort: true,
				rootVisible: false
			}),
			columns: [
				{
					xtype: 'treecolumn',
					text: 'Message title',
					dataIndex: 'msgTitleAttch',
					width: 140,
					sortable: false,
					//expanded: false,

				}, {
					//xtype: 'treecolumn',
					text: 'Msg. time',
					dataIndex: 'msgEmTime',
					width: 160,
					//flex: 1,
					sortable: true
				}, {
					//xtype: 'treecolumn',
					text: 'Duration',
					dataIndex: 'durTime',
					width: 110,
					//flex: 1,
					sortable: false
				}, {
					//xtype: 'treecolumn',
					text: 'Message type',
					dataIndex: 'msgType',
					width: 90,
					//flex: 1,
					sortable: false
				}, {
					//xtype: 'treecolumn',
					text: 'Priority',
					dataIndex: 'priority',
					width: 60,
					//flex: 1,
					sortable: false
				}, {
					//xtype: 'treecolumn',
					text: 'Emitter name',
					dataIndex: 'emId',
					width: 110,
					//flex: 1,
					sortable: false
				}, {
					//xtype: 'treecolumn',
					text: 'Emitter IP',
					dataIndex: 'emIp',
					width: 110,
					//flex: 1,

					sortable: false
				}, {
					//xtype: 'treecolumn',
					text: 'Message text',
					dataIndex: 'msgText',
					flex: 1,
					sortable: false
				}/*, {
					//xtype: 'treecolumn',
					text: 'Time line',
					dataIndex: 'canvas',
					//flex: 1,
					width: 300,
					sortable: false
				}*/
			],
			plugins: {
				ptype: 'bufferedrenderer',
				trailingBufferZone: 0, // Keep 20 rows rendered in the table behind scroll
				leadingBufferZone: 0 // Keep 50 rows rendered in the table ahead of scroll
			}
			/*bbar: ['->', {
				
			}],  plugins: {
				ptype: 'bufferedrenderer',
				trailingBufferZone: 50, // Keep 20 rows rendered in the table behind scroll
				leadingBufferZone: 50 // Keep 50 rows rendered in the table ahead of scroll
			}, sorters: [{
				property: 'msgEmTime',
				direction: 'ASC'
			}]*/
		});



		this.callParent(arguments);
	},

	/************************************************************************************************/
	afterRefresh:function( scope, eOpts ) {

		//this.setScrollY(this.scrollTop+200,true);
	},

	/************************************************************************************************/
	beforeRefresh: function (scope, eOpts) {

		//this.scrollTop = this.getScrollY();
	},

	/************************************************************************************************/
	onChangeMesageCount: function (scope, newValue, oldValue, eOpts) {
		this.setCookie("config", this.getConfigData(), 10);
		this.pagingController.setItemsPerPage(this.msgCountEl.getValue(), true);
		this.fireEventArgs("RefreshView", [4]);
	},

	/************************************************************************************************/
	onChangeMesageCount2: function () {
		this.fireEventArgs("RefreshView", [4]);
	},

	/************************************************************************************************/
	onChangeViewConfig: function () {
		this.fireEventArgs("setUpUpdater", [4]);
	},

	/************************************************************************************************/
	onSetupAutoUpdatePeriod: function (scope, newValue, oldValue, eOpts) {
		//update coockies
		this.setCookie("config", this.getConfigData(), 10);
		this.fireEventArgs("setUpUpdater", []);
	},

	///**********************************************************************************************/
	//onItemDbClick: function ( scope, record, item, index, e, eOpts ) {
	//	//console.log(r);
	//	if (r.data.attachCount > 0) {
	//		var messageId = record.data.messageId;
	//		window.open(window.location.origin + "/Attachments/?id=" + messageId);
	//	}
	//},

    /**********************************************************************************************/
	onItemClick: function (scope, record, item, index, e, eOpts) {
		
		if (this.clickFrom == 0 || this.clickFrom < 0) {
			this.clickFrom = performance.now();
		} else {
			var tmp = performance.now();
			var r=tmp-this.clickFrom;
			if (r < 500) {
				if (record.data.attachCount > 0) {
					
						this.clickFrom = -1;
						this.newTab = true;
						this.fireEventArgs("itemdblclick", [scope, record, item, index, e, eOpts]);
				}
			}
			this.clickFrom = -1;
			
		}
		if (!record.isExpanded()) {
			record.expand();
		}
		else {
			record.collapse();
		}
	    //console.log(r);
	    
	},
	
	
	onItemDbClick:function (scope, record, item, index, e, eOpts) {
		//console.log(r);
		if (record.data.attachCount > 0 && this.newTab == true) {
			
			var messageId = record.data.messageId;
			window.open(window.location.origin + "/Attachments/?id=" + messageId, "_blank");
			this.newTab = false;
		}
		
		//scope.callOverridden();
	},

	/**********************************************************************************************/
	onItemExpand: function(node, index, item, eOpts) {
		//this.drawTimeBars();
	},

	/***********************************************************************************************/
	onColumnResize: function(colIndex, newSize) {
		if (newSize.dataIndex == "canvas") {
			//this.drawTimeBars();
		} else {

			
			var column = this.findColumnIndex(this.columns, 'canvas');
			if (column != null) {
				//this.columnWidth = 0;

				var summaryWidth = 0;
				var tmpWidth = 0;
				for (var i = 0; i < this.columns.length; i++) {
					var curColumn = this.columns[i];
					var tmp = 0;

					if (curColumn.dataIndex != "canvas") {
						if (curColumn.width != undefined)
							tmp = curColumn.width;
						else tmp = curColumn.cellWidth;
					}
					summaryWidth = summaryWidth + tmp;
				}
				this.columnWidth = this.getEl().dom.scrollWidth - summaryWidth - 20;
			}
		}
	},

	/**********************************************************************************************/
	getMaxItemPerPage: function() {
		var Data = "";
		// Build and send the request
		var requestUrl = "/Watcher/GetMaxMessagesPerPage";
		var request = new XMLHttpRequest();
		request.open("GET", requestUrl, false);
		request.responseText = "json";
		request.setRequestHeader("Accept", "application/text");
		request.onreadystatechange = function() {
			if (request.readyState == 4) {
				if (request.status == 200) {
					Data = request.response;
					return parseInt(Data);
				} else
				// Error handling here
					alert("Unexpected error:  " + request.statusText + ".\nPlease try again");
			}
		};
		request.send();
		var count = 200;
		if (request.response != "")
			count = parseInt(request.response);
		return count;
	},

	/**********************************************************************************************/
	setUpComponent: function (update) {
		//this.setCookie("config", this.getConfigData(), 10);
		this.rootEment = this.serviceLog.rootMessages;
		var json = this.getConfigs();

		if (json !== undefined && json.length > 0) {
			var data = JSON.parse(json);
			//this.msgCountEl.setValue(data.config.messageCount);
			//this.updatePeriodEl.setValue(data.config.updatePeriod);
			this.pagingToolbarEl.msgCountEl.setValue(data.config.messageCount);
			this.pagingToolbarEl.updatePeriodEl.setValue(data.config.updatePeriod);
		}	
	},

	/**********************************************************************************************/
	configureTreeGrid: function (startTicks, endTicks, onlyPageData) {

		this.startTicks = startTicks;
		this.endTicks = endTicks;
		this.diffTicks = endTicks - startTicks;

		//var date = this.serviceLog.convertTicksToDate(startTicks);
		//var from = date.getFullYear() + "-" + this.fixDate(date.getMonth()) + "-" + this.fixDate(date.getDay()) + " " + this.fixDate(date.getHours()) + ":" + this.fixDate(date.getMinutes()) + ":" + this.fixDate(date.getSeconds());

		//date = this.serviceLog.convertTicksToDate(endTicks);
		//var to = date.getFullYear() + "-" + this.fixDate(date.getMonth()) + "-" + this.fixDate(date.getDay()) + " " + this.fixDate(date.getHours()) + ":" + this.fixDate(date.getMinutes()) + ":" + this.fixDate(date.getSeconds());

		var timerange = Ext.getCmp("timeRange");
		//timerange.setText("Current time range: from " + from + " to " + to);
		
		//get events by timerange
		this.rootLength = this.serviceLog.eventWorker.filteredMessagesQuantity;

		if (onlyPageData == false) {
			this.pagingToolbarEl.setItemsPerPage(this.getItemsPerPage());
		//	this.pagingController.setItemsPerPage(this.getItemsPerPage());
			//this.setItemsCount(this.itemsCount);
			this.pagingToolbarEl.setItemsCount(this.rootLength);
			//this.pagingController.setItemsCount(this.rootLength); //this.serviceLog.filteredMessagesQuantity
		}
		//this.fireEventArgs("getEventsByRange", [skip, limit]);
	},
	/**********************************************************************************************/
	saveRootData:function(root) {
		this.rootEment = root;
	},

	/**********************************************************************************************/
	showTree: function (skip,limit,pageNav,newPage) {
		//if (this.serviceLog.serverMessagesReady == false && this.serviceLog.getAll==false) {
		//var sliceRoot = .slice(skip, limit + skip);
		if (this.serviceLog.eventWorker != undefined) {
			if (pageNav == true) {
				this.serviceLog.pageNavigation = true;
				this.serviceLog.eventWorker.getEventsByRange([skip, limit], [this.startTicks, this.endTicks]);
			} else if (this.serviceLog.eventWorker.getAll == true || this.serviceLog.eventWorker.filterAction == true ||
				this.serviceLog.eventWorker.autoUpdate == true ||
				this.serviceLog.eventWorker.afterStart == false) {
				this.updateTree(this.rootEment,false, newPage);
			}
		}
	},

	/*********************************************************************************************/
	findColumnIndex :function(columns, dataIndex) {
		var index;
		var idx = -1;
		for (index = 0; index < columns.length; ++index) {
			if (columns[index].dataIndex == dataIndex) {
				idx = index;
				break;
			}
		}
		var column = null;
		if (idx != -1) column=columns[idx];
		return column;
	},

	/**********************************************************************************************/
	fixTimeBug: function(start, end) {
		var endtime = end;
		if (endtime > start) {
			end = end - start;
			endtime = end;
		}
		return endtime;
	},

	/**********************************************************************************************/
	drawTimeBars: function (sliceRoot, activeItems) {

		//console.log("TREEEEE");
		var ref = 0;

		var style = null;
		if (sliceRoot == null)
			sliceRoot = this.getRootNode().data.children;
		var me = this;
		var scrollStarted = 0;
		//var columnName = me.columnManager.headerCt.gridDataColumns[7].id; //me.columnManager.columns[7].el.id;
		//var obj = document.getElementById(columnName);
		var column = this.findColumnIndex(this.columns, 'canvas');
		if (column != null && sliceRoot.length > 0 && scrollStarted==0) {

			//if (scrollTop != undefined) {
			//	ref = (scrollTop / scrollHeight);
			//}
			var countPerView = this.getHeight() / 44;
			//var curFirstItem = sliceRoot.length * ref;

			//if (curFirstItem == undefined) curFirstItem = 0;
			

			var startIndex = 0;
			var endIndex = 0;


			var width = 0; //column.width-13; 
			if (this.columnWidth > 0) 
				width = this.columnWidth-15;
			else{
				if (column.width != undefined)
					width = column.width - 32;
				else width = column.cellWidth - 32;
			}
			var canvasNameTpl = "myCanvas";

			var diffTicks = 0;//this.diffTick+5000000;

			var endtime = 0;

			//if (sliceRoot[sliceRoot.length - 1].children != null && sliceRoot[sliceRoot.length - 1].children.length==0) {
			//	var start = (sliceRoot[sliceRoot.length - 1].msgTime);
			//	var end = (sliceRoot[sliceRoot.length - 1].msgTime);
			//	endtime = start + this.fixTimeBug(start, end);
			//	//if (endtime > this.serviceLog.lastMessageTime) {
			//	//	end = end - start;
			//	//	endtime = start + end;
			//	//}
			//} else endtime = (sliceRoot[sliceRoot.length - 1].msgTime);

			//diffTicks = this.serviceLog.lastMessageTime / 1000 - this.serviceLog.firstMessageTime / 1000+5000000; //endtime - timestart;
		

				
			var tickDetail = Ext.getCmp('scrollerId').getTickDetail(this.diffTicks);
			var tickCount = tickDetail[1];
			var tick = width / (this.diffTicks);

			
				//for (var i = 0; i < countPerView; i++) {


				//	i = parseInt(i);
				//	var rootItem = sliceRoot[i];

				
				//	if (rootItem != undefined && activeItems == undefined) {

				//		if (rootItem.children.length > 0) { //('children' in rootItem)==true ) {
				//			var child = rootItem.children;
				//			//for first we drawing parent
				//			var start = (rootItem.msgTime);
				//			var end = (child.msgTime);
				//			var startX = (start - this.serviceLog.firstMessageTime) * tick;
				//			//if (startX < 15) alert("!!!!!!");
				//			console.log(this.startTicks + "(" + start + ")" + ";" + this.endTicks + "(" + endtime + ")");

				//			//if (this.startTicks <= start && this.endTicks >= endtime) {

				//				var endX = end * tick;
				//				if (endX != NaN)
				//					endX = 3;

				//				if (rootItem.msgType == "Info") style = this.infoColor;
				//				else if (rootItem.msgType == "Warning") style = this.warnColor;
				//				else if (rootItem.msgType == "Error") {
				//					style = this.errColor;;
				//					//alert("ERROR");
				//				}

				//				var name = canvasNameTpl + rootItem.itemIndex;
				//				var object = document.getElementById(name); //Ext.getCmp(name);
							
							
				//				if (object != null) {
				//					var drContext = object.getContext("2d");
				//					object.width = width;
				//					drContext.canvas.width = width;
				//					drContext.canvas.height = 22;

				//					drContext.fillStyle = "RGB(229,229,229)";
				//					drContext.fillRect(0, 0, width, 20);

				//					drContext.fillStyle = style;
				//					drContext.fillRect(startX, 1, 3, 18);


				//					//if (endX > 1) {
				//					//	drContext.fillStyle = style;
				//					//	drContext.fillRect(startX, 1, endX, 21);
				//					//} else {
				//					//	//drContext.beginPath();
				//					//	//drContext.strokeStyle = style;
				//					//	//drContext.moveTo(startX, 1);
				//					//	//drContext.lineTo(startX, 21);
				//					//	//drContext.stroke();
				//					//	drContext.fillStyle = style;
				//					//	drContext.fillRect(startX, 1, 3, 21);
				//					//}
				//					//and second, we dwawing child
				//					name = canvasNameTpl + child.itemIndex;
				//					object = document.getElementById(name); //Ext.getCmp(name);
				//					if (object != null) {
				//						var drContext = object.getContext("2d");
				//						object.width = width;
				//						drContext.canvas.width = width;
				//						drContext.canvas.height = 20;

				//						if (child.msgType == "Info") style = this.infoColor;
				//						else if (child.msgType == "Warning") style = style = this.warnColor;
				//						else if (child.msgType == "Error") {
				//							style = this.errColor;;
				//							//alert("ERROR");
				//						}


				//						drContext.fillStyle = "RGB(229,229,229)";
				//						drContext.fillRect(0, 0, width, 20);

				//						drContext.fillStyle = style;
				//						drContext.fillRect(startX, 1, 3, 18);
				//						//drContext.strokeStyle = style;
				//						//drContext = object.getContext("2d");
				//						//drContext.moveTo(startX + endX, 1);
				//						//drContext.lineTo(startX + endX, 21);
				//						//drContext.stroke();
				//					}
				//				}
				//		} else {
				//			var start = (rootItem.msgTime);
				//			var startX = (start - this.serviceLog.firstMessageTime) * tick;
				//			var name = canvasNameTpl + rootItem.itemIndex;
				//			var object = document.getElementById(name); //Ext.getCmp(name);

				//			//console.log(this.startTicks + "(" + start + ")" + ";" + this.endTicks + "(" + start + ")");

				//			//if (this.startTicks <= start && this.endTicks >= start) {
				//				if (object != null) {
				//					var drContext = object.getContext("2d");
				//					object.width = width;
				//					drContext.canvas.width = width;
				//					drContext.canvas.height = 20;

				//					if (rootItem.msgType == "Info") style = this.infoColor;
				//					else if (rootItem.msgType == "Warning") style = this.warnColor;
				//					else if (rootItem.msgType == "Error") {
				//						style = this.errColor;;
				//						//alert("ERROR");
				//					}

				//					drContext.fillStyle = "RGB(229,229,229)";
				//					drContext.fillRect(0, 0, width, 20);

				//					drContext.fillStyle = style;
				//					drContext.fillRect(startX, 1, 3, 18);
				//					//drContext.strokeStyle = style;
				//					//drContext.moveTo(startX, 1);
				//					//drContext.lineTo(startX, 21);
				//					//drContext.stroke();

				//				}
				//			//}
				//		}
				//	}
				//}
			}
		},

	/**********************************************************************************************/
	getRootData: function (id) {
		var emTime = 0;
		var durTime = 0;
		var msgType = 0;

		var item = this.serviceLog.allMessages[id];
		durTime = item.messageEmissionTime;
		msgType = item.messageType;

		if (item.parentId != 0) {
			var parent = this.serviceLog.allMessages[item.parentId];
			emTime = parent.messageEmissionTime;
		}
		return [emTime, durTime, msgType];
	},
	
	/**********************************************************************************************/
	rootWorker: function (rootItem,msgTime,itemIndex) {

		var exit = false;
		var childs = [];
		var durTime = 0;

		if (rootItem.itemIndex == itemIndex)
			exit = true;

		if (rootItem.children.length > 0) {
			var i = 0;
			while (i < rootItem.children.length) {
				var Item = rootItem.children[i];
				var retChild = this.rootWorker(Item);
				if (retChild.length >=0) {
					for (var j = 0; j < childs.length; j++) {
						if (childs[j].children == null && childs[j].msgTime < 30000000)
							durTime = durTime + childs[j].msgTime;
					}
				}
				if (retChild != null && retChild.messageType != 8)
					exit=this.rootWorker(Item,msgTime+durTime);
				i++;
			}
		}


		if (childs.length > 0) {
			for (var j = 0; j < childs.length; j++) {
				if (childs[j].children == null && childs[j].msgTime < 30000000)
					durTime = durTime + childs[j].msgTime;
			}
		}
		var tmp = durTime / 1000;

		var start = (msgTime / 1000);
		var end = (durTime/ 1000);
		var startX = (start - this.serviceLog.firstMessageTime / 1000) * tick;
		var endX = end * tick;
		if (endX != NaN)
			endX = 3;
		
		var drContext = object.getContext("2d");
		object.width = width;
		drContext.canvas.width = width;
		drContext.canvas.height = 20;

		var style = "";
		if (rootItem.msgType === "Info") style = this.infoColor;
		else if (rootItem.msgType === "Warning") style = this.warnColor;
		else if (rootItem.msgType === "Error") style = this.errColor;

		

		drContext.fillStyle = "RGB(229,229,229)";
		drContext.fillRect(0, 0, width, 20);

		drContext.fillStyle = style;
		drContext.fillRect(startX, 1, 3, 18);
		return exit;
	},

	/**********************************************************************************************/
	onScrollActtion: function (e, t) {
		//alert("ololo");
		//if (this.getRootNode().data.children.length > 0)
			//this.drawTimeBars(this.getRootNode().data.children);

		////-this.drawTimeBars();
		//if (t.scrollTop >= 0 && this.flag != 0) {
		//	var treeGrid = Ext.getCmp('treeViewId');
		//	var height = treeGrid.getHeight();
		//	var diff = t.scrollHeight - t.scrollTop;
		//	var messagesPerPixel = this.store.root.childNodes.length / diff;
		//	var messagesPerView = parseInt(height / 41);

		//	var firstIndex = parseInt(t.scrollTop * messagesPerPixel);
		//} else this.flag = 1;
	},


	/**********************************************************************************************/
	updateTree: function(data,scrollToBegin,newPage) {
		//var tick1 = performance.now();
		//console.log(this.saveScrollState());
		////var path = this.getStore().getRootNode().firstChild.getPath();
		//this.expandNode(this.getStore().getRootNode().firstChild,1);
		//var tick2 = performance.now();
		//console.log("expandPath:" + (tick2 - tick1));
		
	
		//if (data.length > 10000) {
		//	var partCount = data.length / 5;
		//	for (var i = 0; i <= 1; i++) {
		//		var end = (i + 1) * partCount;
		//		if (end > data.length) end = data.length - 1;
		//		var part = data.slice(i * partCount, end);
		//		this.getStore().loadData(part, true);
		//	}
		//} else {
		//	//var tick4 = performance.now();
		//	//console.log("loadData:" + (tick4 - tick3));
		//	//var tick3 = performance.now();
		//	this.getStore().setData(data);
		////	this.getStore().data = data; //loadData(data, false); //.setData(data);
		//	this.getStore().reload();
		//}
	//	this.getStore().reload();
		
		//var tick3 = performance.now();
		//var tick3 = performance.now();
		//this.getStore().setData(data);
		//var		tick4 = performance.now();
		//console.log("setData:" + (tick4 - tick3));
		var loadingMask = new Ext.LoadMask({ msg: "Please wait for tree update...", target: this });
		loadingMask.show();
		//console.log(this.getStore());
		var tick3 = performance.now();
		
		if (this.serviceLog.eventWorker.autoUpdate == true && (this.serviceLog.eventWorker.pageNavigation == false ||
			this.serviceLog.eventWorker.filterAction == false))
			for (var i = 0; i < data.length; i++) {
				if (data[i].children.length > 0) {
					if (data[i].loaded != undefined) {
						data[i].loaded = false;
						//data[i].loading = false;
					}
				} else {
					data[i].loaded = false;
					//data[i].loading = false;
				}
			}
		

		

		this.viewCount = Math.floor((this.getHeight()-54) / 33);//Math.ceil
		var part = data.slice(0, this.viewCount - 2);

		//this.setRootNode({
		//		text: 'Root',
		//		expanded: true,
		//		children: part
		//	});


		var store = Ext.create('Ext.data.TreeStore', {
			model: "MessageModel",
			root: {
				text: 'Root',
				expanded: true,
				children: part
			},
		});

		this.getView().bindStore(store);

		//if (this.serviceLog.eventWorker.messageCount > 5000) {
		//	var index = parseInt(data.length / 5);
		//	var part = data.slice(0, index);
		//	this.setRootNode({
		//		text: 'Root',
		//		expanded: true,
		//		children: part
		//	});
			
		//	this.getStore().loadData(data.slice(index, data.length), true);
		//	//this.getStore().load();
		//}else
		//	this.setRootNode({
		//		text: 'Root',
		//		expanded: true,
		//		children: data
		//	});

		//this.fireEventArgs("sortchange", [this.headerCt, this.columns[1], "ASC"]);
		//this.getStore().loadData(data);
		//this.getStore().sync();
		//this.render();
		var tick4 = performance.now();
		console.log("setRootNode:" + (tick4 - tick3));
	//	console.log(this.getStore());
		//console.log(this.getStore());
		//this.el.setScrollTop(9999999);
		//this.getStore().setData(data);
		loadingMask.hide();

		loadingMask = new Ext.LoadMask({ msg: "Please wait for tree expand...", target: this});
		loadingMask.show();

		//restoreTree expanded statuses
		//for (var key in this.serviceLog.eventWorker.expandedItems) {
		//	this.serviceLog.eventWorker.expandedItems[key].expand();
		//}
		loadingMask.hide();
		if (scrollToBegin == true) {
			this.scrollTop = 0;
			this.getView().setScrollY(this.scrollTop);
		}
		if (newPage == true) {
			this.pagingToolbarEl.scrollToLastPage();
			this.scrollTop = 0;
			this.getView().setScrollY(this.scrollTop);
		}

		if (scrollToBegin == false && newPage == false) {
			this.getView().setScrollY(this.scrollTop);
		}
	},

	/**********************************************************************************************/
	getItemsPerPage: function () {
		//var skip = (this.pagingController.pageIndex) * this.maxItemsPerPage;
		var skip = (this.pagingToolbarEl.pageIndex) * this.maxItemsPerPage;
		var limit = this.maxItemsPerPage;
		var diff = this.rootLength - skip;
		if (diff < this.maxItemsPerPage)
			limit = diff  - skip;
		return limit;
	},

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

	/************************************************************************************************/
	getConfigs: function () {

		var configData = this.getCookie("config");
		var updatePeriod = "5 sec.";
		var messageCount = 20000;

		if (configData!=undefined && configData.length > 0) {
			var data = JSON.parse(configData);
			updatePeriod=data.config.updatePeriod;			
			messageCount=data.config.messageCount;
			//toString(16)
		}
		var config = {};
		config['updatePeriod'] = updatePeriod;
		config["messageCount"] = messageCount;
		var resultobject = {};
		resultobject["config"] = config;
		return JSON.stringify(resultobject, '\n', null);
	},

	getConfigData: function () {

		var updatePeriod = this.updatePeriodEl.getValue();
		var messageCount =this.msgCountEl.getValue();

		var config = {};
		config['updatePeriod'] = updatePeriod;
		config["messageCount"] = messageCount;

		var resultobject = {};

		resultobject["config"] = config;

		return JSON.stringify(resultobject, '\n', null);
		//toString(16)
	},

	/**********************************************************************************************/
	fixDate: function (value) {
		if (value < 10) value = "0" + value;
		return value;
	},

	/**********************************************************************************************/
	onExpandAllClick: function () {
		var me = this,
			toolbar = me.down('toolbar');
		
		me.getEl().mask('Expanding tree...');
		//toolbar.disable();

		this.expandAll(function () {
			me.getEl().unmask();
			toolbar.enable();
		});
	},

	/**********************************************************************************************/
	onCollapseAllClick: function () {
		var toolbar = this.down('toolbar');

		toolbar.disable();
		this.collapseAll(function () {
			toolbar.enable();
		});
	},

//	/************************************************************************************************/
//	updateExpandedItems:function(node,index) {
//	if (this.expandedItems.hasOwnProperty(node.raw.itemIndex) != true) {
//		var parentId = -1;
//		if (node.parentNode.id != "root") {
//			parentId = node.parentNode.raw.itemIndex;
//		}
//		var item = {
//			"index":index,
//			"parentId":parentId
//		};
//		this.expandedItems[node.raw.itemIndex] = item;
//	}
//}
});