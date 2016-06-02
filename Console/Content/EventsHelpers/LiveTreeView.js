/**************************************************************************************************
*** MessageModel
**************************************************************************************************/
Ext.define('MessageModel', {
	extend: 'Ext.data.TreeModel',
	fields: [
		{
			name: 'msgTitleAttch', type: 'string',
			convert: function (v, record) {
				var title = record.get('msgTitle');
				if (record.get('attachCount') > 0)
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
Ext.define("Ext.LiveTreeView", {
	extend: "Ext.tree.Panel",
	xtype: "livetreeview",
	requires: [
		'Ext.data.*',
		'Ext.grid.*',
		'Ext.tree.*',
		'Ext.ux.CheckColumn',
		'Ext.data.TreeStore',
		'Ext.data.TreeModel'
	],

	//controls
	serviceLog: null,
	treeViewObject: null,
	updatePeriodEl: null,
	msgCountEl: null,
	pagingToolbarEl: null,
	//used on mouse hover over title
	titleWindow: null,
	titleTimeout: null,

	//others
	newTab: false,
	columnWidth: 0,
	viewCount: 0,
	titleColumnWidth: 0,
	textColumnWidth: 0,
	openedItemsQuatntity: 0,
	enterHited: false,
	textColumnLeft: 0,
	allow: false,
	hoverIndex: 0,
	lastScrollPos: 0,
	allowAttachmentWindow: false,
	attachmentWorker:null,

	constructor: function () {

		Ext.apply(arguments[0], {
			xtype: "treepanel",
			title: '',
			id: 'treeViewId4',
			flex: 1,
			clickFrom: -1,
			clickTimer: null,
			//tree settings
			//autoScroll: false,
			stateful: true,
			mouseWheelEnabled: true,
			animCollapse: true,
			infoColor: "#00A9FF",
			warnColor: "#FFFF14",
			errColor: "#FF1000",
			autoHeight: false,
			shadowOffset: 3,
			loadMask: true,
			loadingText: "QQQQQ",
			overflowX: 'hidden',
			overflowY: 'auto',
			autoRender: false,
			useArrows: true,
			rootVisible: false,
			multiSelect: true,
			shadow: true,
			lines: true,
			stripeRows: false,
			selModel: {
				enableKeyNav: false
			},

			height: 900,
			width: 1340,
			store: Ext.data.TreeStore({
				extend: 'Ext.data.TreeStore	',
				model: "MessageModel",
				root: {
					text: 'Root',
					expanded: true,
					children: null
				},
				pageSize: 100,
				clearOnLoad: true,
				lazyFill: true,
				autoSync: true,
				autoLoad: true,
				rootVisible: false
			}),
			columns: [
				{
					xtype: 'treecolumn',
					text: 'Message title',
					dataIndex: 'msgTitleAttch',
					width: 140,
					sortable: false
				}, {
					text: 'Msg. time',
					dataIndex: 'msgEmTime',
					width: 160,
					sortable: true
				}, {
					text: 'Duration',
					dataIndex: 'durTime',
					width: 110,
					sortable: false
				}, {
					text: 'Message type',
					dataIndex: 'msgType',
					width: 90,
					sortable: false
				}, {
					text: 'Priority',
					dataIndex: 'priority',
					width: 60,
					sortable: false
				}, {
					text: 'Emitter name',
					dataIndex: 'emId',
					width: 110,
					sortable: false
				}, {
					text: 'Emitter IP',
					dataIndex: 'emIp',
					width: 110,
					sortable: false
				}, {
					text: 'Message text',
					dataIndex: 'msgText',
					flex: 0.5,
					sortable: false
				}
			]
		});
		this.callParent(arguments);

		this.on("afterrender", function () {
			this.on("activate", this.onActivate.bind(this));
			this.serviceLog = Ext.getCmp('servicelogTabId');
			this.scrollBarEl = Ext.getCmp("sliderElId4");
			//this.attachmentWorker = new AttachmentWorker(this.serviceLog);

			//init paging controls
			this.initNavigationButtons();
			this.pagingToolbarEl = Ext.getCmp('pagingToolbarId4');
			this.pagingToolbarEl.on("ChangeViewConfig", this.onChangeViewConfig.bind(this));
			this.pagingToolbarEl.on("ChangeMsgCount", this.onChangeMesageCount2.bind(this));
			this.pagingToolbarEl.on("Show", this.showTree.bind(this));

			this.on("afteritemexpand", this.afterItemExpand.bind(this));
			this.on("afteritemcollapse", this.afterItemCollapse.bind(this));

			this.on("beforeitemclick", this.onBeforeItemClick.bind(this));

			this.on("itemclick", this.onItemClick.bind(this));
			this.on("itemdblclick", this.onItemDbClick.bind(this));

			this.on("itemmouseenter", this.onItemMouseEnter.bind(this));
			this.on("itemmouseleave", this.onItemMouseLeave.bind(this));

			this.on("columnresize", this.onColumnResize.bind(this));
			this.on("columnschanged", this.onColumnResize.bind(this));
			this.getEl().on('keydown', function (e) {
				if (e.keyCode == 13 && this.allowAttachmentWindow == true)//Enter was pressed and get
				{
					var selItems = this.getSelectionModel().selected.items;
					var selIdArr = [];
					for (var i = 0; i < selItems.length; i++) {
						selIdArr.push(selItems[i].data.messageId);
					}
					this.attachmentWorker.extractAttachmentsIdList(selIdArr);
					window.open("/Attachments/?id=" + selIdArr.toString(), "_blank");
				}
			}.bind(this));
			this.on("itemkeydown", this.onKeyDown.bind(this));
		});
	},
	/**********************************************************************************************/
	onActivate: function (scope, eOpts) {


	},

	//Server request functions
	/**********************************************************************************************/
	getAttachmentList: function (messageId) {

		var skip = 0;
		var limit = 0;
		var fastStatics = 0;
		var filters = {};
		filters.messageIdList = [messageId];
		filters.deliveryTimeStart = 0;
		filters.deliveryTimeEnd = 0;
		filters.nameMatch = "";

		filters.attachmentFormats = 0;

		// Build and send the request
		var requestUrl = "/Watcher/QueryAttachments?skip=" + skip + "&limit=" + limit +
		"&statics=" + fastStatics;
		var messagesResponse = "";
		var request = new XMLHttpRequest();
		request.open("POST", requestUrl, true);
		request.responseType = "arraybuffer";
		//request.setRequestHeader("Content-type", "application/octet-stream");
		request.onload = this.onQueryAttachmentsComleted.bind(this, request, "QueryAttachments");
		request.onerror = this.onRequestFailed.bind(this, request, "QueryAttachments");

		this.performanceFrom = performance.now();
		console.log("QueryAttachments started...");
		request.send(JSON.stringify(filters));
	},

	//Response handling functions
	/***********************************************************************************************/
	onQueryAttachmentsComleted: function (request, requestName) {
		if (request.status == 200) {
			this.responseReady = true;
			this.performanceTo = performance.now();
			console.log("Response time for QueryAttachments: " + (this.performanceTo - this.performanceFrom));
			this.queryAttachmentsWorker(request.response, requestName);
		} else this.reportErrorMessage(request, requestName, true);
	},

	/**********************************************************************************************/
	queryAttachmentsWorker: function (response, requestName) {
		var responseJson = this.responseHandler(response); //this.eventsResponseHandler(request.response);
		if (responseJson != null && (typeof responseJson === "string")) {
			var responseObject = JSON.parse(responseJson);
			if (responseObject.errorMessage == "") {
				try {
					var attachmentList = responseObject.attachmentList;
					var idList = [];
					for (var i = 0; i < attachmentList.length; i++) {
						idList.push(attachmentList[i].attachmentId);
					}
					//var attachmentWorker = new AttachmentWorker({attachmentId:idList[0]});
					//	window.open(window.location.origin + "/Attachments/?id=" + idList.toString(), "_blank");
					console.log("QueryAttachments completed.");

				} catch (error) {
					Ext.MessageBox.show({
						title: 'Error hapened!',
						msg: "Uncatch error,failed to process attachments data.<br>Exception info: " + error.message,
						buttons: Ext.MessageBox.OK,
						animateTarget: this,
						fn: this.errorHandling(requestName),
						icon: Ext.Msg.ERROR
					});
					console.log("Uncatch error,failed to process attachments data.Exception info: " + error.message);
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
		}
	},

	/**********************************************************************************************/
	initNavigationButtons: function () {
		this.addDocked(
		{
			xtype: 'toolbar',
			padding: 0,
			dock: "top",
			items: [
				/*{
					xtype: "button",
					text: "Collapse All",
					margin: "0 5 0 0",
					handler: function() {
						this.collapseAll();
					}.bind(this)
				}, {
					xtype: "button",
					text: "Expand All",
					margin: "0 5 0 0",
					handler: function() {
						this.expandAll();
					}.bind(this)
				}, */'->',
				{
					xtype: 'pagingToolbar',
					height: 30,
					id: "pagingToolbarId4",
					margin: "0 5 0 5",
					padding: 0,
					border: false,
				}
			]
		});
	},

	/**********************************************************************************************/
	setUpPageController: function (update) {
		//this.setCookie("config", this.getConfigData(), 10);
		//????????????
		//this.rootEment = this.serviceLog.rootMessages;
		var json = this.getConfigs();

		if (json !== undefined && json.length > 0) {
			var data = JSON.parse(json);
			//this.msgCountEl.setValue(data.config.messageCount);
			//this.updatePeriodEl.setValue(data.config.updatePeriod);
			this.pagingToolbarEl.initialSetup(data);
			this.pagingToolbarEl.afterColdStart = true;
		}
	},

	/**********************************************************************************************/
	onBeforeItemClick: function (scope, record, item, index, e, eOpts) {
		if (this.enterHited == true) {
			//this.suspendEvents();
			this.enterHited = false;
		}
	},

	/**********************************************************************************************/
	onItemClick: function (scope, record, item, index, e, eOpts) {

		if (this.clickFrom != -1) {
			var tmp = performance.now();
			var r = tmp - this.clickFrom;
			if (r < 500) {
				if (record.data.attachCount > 0) {
					this.newTab = true;
					this.fireEventArgs("itemdblclick", [scope, record, item, index, e, eOpts]);
				}
			}
			this.clickFrom = -1;
		}
		else
			this.clickFrom = performance.now();

		if (!record.isExpanded()) {

			record.expand();
		} else {
			record.collapse();
		}
	},

	/************************************************************************************************/
	onItemMouseEnter: function (scope, record, item, index, e, eOpts) {

		if (this.titleWindow != null) {
			this.titleWindow.hide();
			window.clearTimeout(this.titleTimeout);
		}

		var htmlContent = "";
		this.allow = false;
		var width = "auto";
		index = this.hoverIndex;

		this.titleTimeout = window.setTimeout(function () {
			if (this.titleWindow != null) {
				this.titleWindow.hide();
				window.clearTimeout(this.titleTimeout);
			}
			if (e.pageX < this.titleColumnWidth /* && record.data.msgTitle.length > 15*/) {
				htmlContent = "<div style='margin:3px;'>Title: <b>" + record.data.msgTitle + "</b><br>" + "Attachments quantity: <b>" + record.data.attachCount + "</div>";
				index = 0;
				this.allow = true;
			} else if (e.pageX > this.textColumnLeft && e.pageX < this.textColumnLeft + this.textColumnWidth) {
				htmlContent = "<div style='margin:3px;'>Text: <b>" + record.data.msgText.substring(0, 400) + "</b></div>";
				this.allow = true;
				width = 400;
			}

			if (this.allow == true) {

				this.titleWindow = Ext.create('Ext.window.Window', {
					layout: 'fit',
					closable: false,
					frame: false,
					constrainHeader: false,
					header: false,
					resizable: false,
					border: false,
					animateTarget: item.firstChild.firstChild.cells[index],
					bodyStyle: {
						background: 'white',
						padding: 0,
					},
					maxWidth: width,
					minHeight: 18,
					maxHeight: "auto",
					x: e.pageX + 20,
					y: e.pageY - 23,
					html: htmlContent,
				});
				this.titleTimeout = window.setTimeout(function () {
					this.titleWindow.hide();

				}.bind(this), 2000);
				this.titleWindow.show();
				this.allow = false;
			}
		}.bind(this), 1000);
	},

	/************************************************************************************************/
	onItemMouseLeave: function (scope, record, item, index, e, eOpts) {
		if (this.titleWindow != null) {
			this.titleWindow.hide();
			window.clearTimeout(this.titleTimeout);
		}
	},

	/************************************************************************************************/
	onItemDbClick: function (scope, record, item, index, e, eOpts) {
		if (record.data.attachCount > 0 && this.newTab == true && this.allowAttachmentWindow == true)//Enter was pressed and get attachment action was allowed) 
		{
			var messageId = record.data.messageId;
			window.open("/Attachments/?id=" + messageId, "_blank");
			this.newTab = false;
		}
	},

	/************************************************************************************************/
	onChangeMesageCount2: function () {
		this.fireEventArgs("RefreshView", [4]);
	},

	/************************************************************************************************/
	onChangeViewConfig: function () {
		this.fireEventArgs("setUpUpdater", [4]);
	},

	/*********************************************************************************************/
	afterItemExpand: function (node, index, item, eOpts) {
		if (this.newTab == true && node.isExpanded()) {
			this.newTab = false;
		}
		//else
		//{
		//	this.scrollTop = this.getView().getScrollY();
		//	console.log(this.scrollTop);
		//	var count = node.childNodes.length - 5;
		//	var scrollPeritem = this.scrollHeight / this.getStore().getRootNode().childNodes.length;
		//	//this.getView().setScrollY(this.scrollTop + scrollPeritem * count);
		//	if (this.serviceLog.eventWorker.expandedItems.hasOwnProperty(index) != true)
		//	{
		//		this.serviceLog.eventWorker.expandedItems[index] = node.getPath(); //this.getStore().getNodeById(node.id);
		//	}
		//}
		//var value = node.childNodes.length * 32;
		//this.changeSliderHeight(node.childNodes.length, 1, node);
	},

	/*********************************************************************************************/
	afterItemCollapse: function (node, index, item, eOpts) {
		//this.scrollTop = this.getView().getScrollY();
		//var value = node.childNodes.length * 31;

		//if (this.serviceLog.eventWorker.expandedItems.hasOwnProperty(index) == true)
		//{
		//	delete this.serviceLog.eventWorker.expandedItems[index];
		//}

		//this.changeSliderHeight(node.childNodes.length, -1, node);
		//this.getView().collapse(index, 1);
	},

	genStore: function (nodes, data, counter, root, top) {

		if (this.serviceLog.eventWorker.autoUpdate == false) {
			for (var i = 0; i < nodes.length; i++) {
				var node = nodes[i];
				var result = this.worker(node, data, counter, root, top);
				data = result[0];
				counter = result[1];
			}
		} else {
			for (var i = nodes.length - 1; i > 0; i--) {
				var node = nodes[i];
				var result = this.worker(node, data, counter, root, top);
				data = result[0];
				counter = result[1];
			}
		}
		return [data, counter];
	},

	worker: function (node, data, counter, root, top) {

		var isExpanded = this.serviceLog.eventWorker.expanded[node.messageId];
		if (isExpanded == true) {
			var childs = node.children;
			if (childs != undefined && childs.length != 0) {

				var dataArray = this.genStore(childs, [], counter, false, top);
				childs = dataArray[0];
				counter = dataArray[1];

				var isExpanded = this.serviceLog.eventWorker.expanded[node.messageId];

				if (isExpanded == undefined) isExpanded = false;
				var isExpandable = node.children.length > 0;
				var tmp = {};
				tmp['msgEmTime'] = node.msgEmTime;
				tmp['msgType'] = node.msgType;
				tmp['durTime'] = node.durTime;
				tmp['priority'] = node.priority;
				tmp['emId'] = node.emId;
				tmp['emIp'] = node.emIp;
				tmp['msgTitle'] = node.msgTitle;
				tmp['msgText'] = node.msgText;

				/*if (counter == this.viewCount - 1)
				childs = [];*/

				tmp['children'] = childs;
				tmp['parentEvent'] = node.parentEvent;
				tmp['messageId'] = node.messageId;
				tmp['parentId'] = node.parentId;
				tmp['attachCount'] = node.attachCount;
				tmp['msgTime'] = node.msgTime;
				tmp['expandable'] = isExpandable;
				tmp['expanded'] = isExpanded;

				counter = (dataArray[1] + 1);
				data.push(tmp);
			}
		} else {
			var isExpanded = this.serviceLog.eventWorker.expanded[node.messageId];
			if (isExpanded == undefined) isExpanded = false;
			var isExpandable = node.children.length > 0;
			var tmp = {};
			tmp['msgEmTime'] = node.msgEmTime;
			tmp['msgType'] = node.msgType;
			tmp['durTime'] = node.durTime;
			tmp['priority'] = node.priority;
			tmp['emId'] = node.emId;
			tmp['emIp'] = node.emIp;
			var title = node.msgTitle;
			if (title == "" || title == null || title == " " || title == undefined)
				title = "<Global service message>";
			tmp['msgTitle'] = title;
			tmp['msgText'] = node.msgText;
			tmp['leaf'] = node.leaf;

			var childs = node.children;

			tmp['children'] = childs;
			tmp['parentEvent'] = node.parentEvent;
			tmp['messageId'] = node.messageId;
			tmp['parentId'] = node.parentId;
			tmp['attachCount'] = node.attachCount;
			tmp['msgTime'] = node.msgTime;
			tmp['expandable'] = isExpandable;
			tmp['expanded'] = false;

			data.push(tmp);
			counter++;

			if (counter > this.viewCount)
				return [data, counter];
		}
		return [data, counter];
	},

	/***********************************************************************************************/
	changeSliderHeight: function (count, value, node) {
		this.expOrColAction = true;

		var max = this.scrollBarEl.maxValue;
		var curPos = this.scrollBarEl.getValue();
		if (value < 0) {
			this.openedItemsQuatntity -= count;
			this.count = -11;
			this.serviceLog.eventWorker.expanded[node.data.messageId] = false;
			var newVal = max - count;
			this.scrollBarEl.setMaxValue(newVal);
			console.error("PrevMax: " + max + " | CurrMax:" + this.scrollBarEl.maxValue);
			newVal = curPos - count;
			if (newVal == this.viewCount || newVal < this.viewCount) newVal = this.viewCount + 1;
			this.scrollBarEl.setValue(newVal);
			console.error("Prev: " + curPos + " | Curr:" + this.scrollBarEl.getValue());
		}
		else {
			this.openedItemsQuatntity += count;
			this.count = -1;
			this.serviceLog.eventWorker.expanded[node.data.messageId] = true;
			var newVal = max + count;
			this.scrollBarEl.setMaxValue(newVal);
			console.error("PrevMax: " + max + " | CurrMax:" + this.scrollBarEl.maxValue);
			newVal = curPos + count;
			if (newVal == this.viewCount || newVal < this.viewCount) newVal = this.viewCount + 1;
			this.scrollBarEl.setValue(newVal);
			console.error("Prev: " + curPos + " | Curr:" + this.scrollBarEl.getValue());
		}
	},

	/***********************************************************************************************/
	onKeyDown: function (scope, record, item, index, e, eOpts) {
		if (e.keyCode == 13 && this.allowAttachmentWindow == true)//Enter was pressed and get attachment action was allowed
		{
			this.enterHited = true;
			var selItems = this.getSelectionModel().selected.items;
			var selIdArr = [];
			for (var i = 0; i < selItems.length; i++) {
				selIdArr.push(selItems[i].data.messageId)
			}
			window.open("/Attachments/?id=" + selIdArr.toString(), "_blank");
			this.resumeEvents();
		}
		return;
	},

	/***********************************************************************************************/
	onColumnResize: function (colIndex, newSize) {
		if (newSize.dataIndex == "canvas") {
			//this.drawTimeBars();
		} else {
			var column = this.findColumnIndex(this.columns, 'canvas');
			this.titleColumnWidth = this.columns[0].width;

			var text_column = this.findColumnIndex(this.columns, 'msgText');

			//this.textColumnWidth = this.columns[7].width;
			this.textColumnLeft = 0;

			if (text_column != null) {
				for (var j = 0; j < text_column.fullColumnIndex - 1; j++) {
					this.textColumnLeft += this.columns[j].cellWidth;
				}
				this.textColumnWidth = text_column.cellWidth;
				this.hoverIndex = text_column.fullColumnIndex;
			}

			if (column != null) {
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

	/*********************************************************************************************/
	findColumnIndex: function (columns, dataIndex) {
		var index;
		var idx = -1;
		for (index = 0; index < columns.length; ++index) {
			if (columns[index].dataIndex == dataIndex) {
				idx = index;
				break;
			}
		}
		var column = null;
		if (idx != -1) column = columns[idx];
		return column;
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
		var messageCount = 1000;

		if (configData != undefined && configData.length > 0) {
			var data = JSON.parse(configData);
			updatePeriod = data.config.updatePeriod;
			messageCount = data.config.messageCount;
		}
		var config = {};
		config['updatePeriod'] = updatePeriod;
		config["messageCount"] = messageCount;
		var resultobject = {};
		resultobject["config"] = config;
		return JSON.stringify(resultobject, '\n', null);
	},

	/************************************************************************************************/
	getConfigData: function () {

		var updatePeriod = this.updatePeriodEl.getValue();
		var messageCount = this.msgCountEl.getValue();

		var config = {};
		config['updatePeriod'] = updatePeriod;
		config["messageCount"] = messageCount;

		var resultobject = {};
		resultobject["config"] = config;
		return JSON.stringify(resultobject, '\n', null);
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

	/**********************************************************************************************/
	//actionFlag: 
	//1: page navigation
	//2: grab all events
	//3: update action
	//4: filter action
	//5: cold start
	setupScrollbar: function (dataReady, actionFlag, key) {

		this.viewCount = Math.floor((this.getHeight() - 110) / 33);//Math.ceil
		console.log(this.serviceLog.eventWorker.treeViewData.length);

		this.allowAttachmentWindow = false;

		var filtersStr = this.serviceLog.eventWorker.eventsFilters;
		if (filtersStr.length > 0 && filtersStr != null) {
			var filtersObject = JSON.parse(filtersStr);
			if (filtersObject.filters.mustHaveAttachments == true)
				this.allowAttachmentWindow = true;
		}

		if (dataReady == true) {
			if (actionFlag == 1) {//pageNav
				this.openedItemsQuatntity = 0;
				//setting up min position  of scrollbar,it's performs scrolling up to first record
				//this.scrollBarEl.setValue(this.serviceLog.eventWorker.treeViewData.length);
				this.setRootNode({
					text: 'Root',
					expanded: true,
					children: this.serviceLog.eventWorker.treeViewData
				});
				this.resetScrollPos();
			}
			else if (actionFlag == 2) {//grabAll
				this.openedItemsQuatntity = 0;
				this.pagingToolbarEl.scrollToFirstPage();
				this.pagingToolbarEl.setItemsPerPage(this.serviceLog.eventWorker.msgPerRequest);
				this.pagingToolbarEl.setItemsCount(this.serviceLog.eventWorker.filteredMessagesQuantity, true);
				this.resetScrollPos();
			}
			else if (actionFlag == 3) {//update
				//key
				//0 no changes (0 new events)
				//1 change page count && message count(a few new events && not last page)
				//2 change page count && message count && update table
				//(a few new events && last page && overal events < MAX)
				//3 change pageIndex && page count && message count && update table
				//(a few new events && last page && overal events > MAX)

				if (this.serviceLog.eventWorker.newEvents != 0 && (key == 3 || key == 2)) {
					//if(key==3)
					this.pagingToolbarEl.setItemsPerPage(this.serviceLog.eventWorker.msgPerRequest, false);
					this.pagingToolbarEl.setItemsCount(this.serviceLog.eventWorker.filteredMessagesQuantity, true, key);
				}
				if (key == 1) {
					this.pagingToolbarEl.setItemsCount(this.serviceLog.eventWorker.filteredMessagesQuantity, false);
				}
				this.serviceLog.eventWorker.performanceTo = performance.now();

				console.log("Autoupdate colpleted in " + (this.serviceLog.eventWorker.performanceTo - this.serviceLog.eventWorker.performanceFrom) + " ms, you have " + this.serviceLog.eventWorker.newEvents + " new events.  Timestamp: " + (new Date()));
			}
			else if (actionFlag == 4) {//filter
				this.openedItemsQuatntity = 0;
				this.pagingToolbarEl.scrollToFirstPage();
				this.pagingToolbarEl.setItemsPerPage(this.serviceLog.eventWorker.msgPerRequest);
				this.pagingToolbarEl.setItemsCount(this.serviceLog.eventWorker.filteredMessagesQuantity, true);
			}
			else if (actionFlag == 5) {//coldStart
				this.openedItemsQuatntity = 0;
				//this is initial tree setup, it should move cursor to first record
				this.pagingToolbarEl.setItemsPerPage(this.serviceLog.eventWorker.msgPerRequest);
				this.pagingToolbarEl.setItemsCount(this.serviceLog.eventWorker.filteredMessagesQuantity, true);
			}
			else if (actionFlag == 6) {//scroller filter
				this.openedItemsQuatntity = 0;
				this.pagingToolbarEl.scrollToFirstPage();
				this.pagingToolbarEl.setItemsPerPage(this.serviceLog.eventWorker.msgPerRequest);
				this.pagingToolbarEl.setItemsCount(this.serviceLog.eventWorker.filteredMessagesQuantity, true);
			}
		}
	},

	/**********************************************************************************************/
	showTree: function (skip, limit, pageNav, newPage) {
		if (this.serviceLog.eventWorker != undefined) {
			if (pageNav == true) {//performs preparation for page navigation
				this.serviceLog.pageNavigation = true;
				if (newPage == true) {
					this.pagingToolbarEl.scrollToLastPage();
				}
				this.serviceLog.eventWorker.getEventsByRange([skip, limit], [0, 0] /*[this.startTicks, this.endTicks]*/);
			}
			else if (this.serviceLog.eventWorker.getAll == true || this.serviceLog.eventWorker.filterAction == true) {
				//setUp scroll bar start position to maxValue, it should move cursor to first record
				this.setRootNode({
					text: 'Root',
					expanded: true,
					children: this.serviceLog.eventWorker.treeViewData
				});
			}
			else if (this.serviceLog.eventWorker.autoUpdate == true) {
				for (var i = 0; i < this.serviceLog.eventWorker.treeViewData.length; i++) {
					if (this.serviceLog.eventWorker.treeViewData[i].children.length > 0) {
						if (this.serviceLog.eventWorker.treeViewData[i].loaded != undefined) {
							this.serviceLog.eventWorker.treeViewData[i].loaded = false;
						}
					} else {
						this.serviceLog.eventWorker.treeViewData[i].loaded = false;
					}
				}


				this.setRootNode({
					text: 'Root',
					expanded: true,
					children: this.serviceLog.eventWorker.treeViewData
				});
				//if(key==2)
				this.scrollPageToBottom();

			}
			else if (this.serviceLog.eventWorker.afterStart == false) {

				var store = Ext.create('Ext.data.TreeStore', {
					model: "MessageModel",
					root: {
						text: 'Root',
						expanded: true,
						children: this.serviceLog.eventWorker.treeViewData
					}
				});

				this.bindStore(store);
			}
		}
	},

	/***********************************************************************************************/
	onRequestFailed: function (request, requestName) {
		this.requestStatusHandler(request.status, requestName);
		this.errorHandling(requestName);
	},
	/***********************************************************************************************/
	responseHandler: function (charData) {
		var binData = null;
		var output = null;
		var responseObject = "";
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
					responseObject = this.arrayBufferToString(output);
				} catch (error) {
					console.log(error);
				}
			}
		} catch (error) {
			console.log("Failed to unpack server response.");
		}
		return responseObject;
	},

	/***********************************************************************************************/
	restoreScrollPos: function () {
		this.getView().setScrollY(this.lastScrollPos, true);
	},

	/***********************************************************************************************/
	saveScrollPos: function () {
		this.lastScrollPos = this.getView().getScrollY();
	},

	/***********************************************************************************************/
	resetScrollPos: function () {
		this.getView().setScrollY(0, true);
	},

	/***********************************************************************************************/
	scrollPageToBottom: function () {
		var maxScrollY = (this.serviceLog.eventWorker.treeViewData.length * 31) / this.body.dom.scrollHeight;
		this.getView().setScrollY(this.serviceLog.eventWorker.treeViewData.length * 31, true);
	}
});
