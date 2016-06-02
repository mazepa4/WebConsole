Ext.define('AttachmentModel', {
	extend: 'Ext.data.Model',
	fields: [
		{ name: "icon", type: 'string', },
		{ name: "name", type: 'string', },
		{ name: "size", type: 'string' },
		{
			name: "type", type: 'string'
		}
	]
});


Ext.define("Ext.AttachmentWindow", {
	extend: "Ext.container.Container",
	xtype: "attachWindow",
	requires: [
			'Ext.data.*',
			'Ext.grid.*',
			'Ext.window.*'
	],

	attachmentsList: {},
	messageId: 0,

	attachmentFormats: {
		DocumentJson: 16,
		DocumentCbor: 17,

		ImageJpeg: 256,

		AudioWave: 512,
		AudioFlac: 513,
		AudioMpeg: 514,
		AudioOpus: 515,
		AudioVorbis: 516,

		UnknownBlob: 4096
	},

	performanceFrom: 0,
	performanceTo: 0,
	readyState: false,
	loadingMask: null,
	workerTimer: null,
	attachList: null,
	attachmentsMap: {},
	currentFileName: "",
	downloadButton: null,

	selectedId: 0,


	scrollBarEl: null,
	hexView: null,
	imageView: null,
	scrollableAttachPanelEl: null,
	itemsArray: [],

	attchType: "",

	attachCount: 0,
	attachIndex: 0,
	activeAttachments: {},
	loadedIActiveItems: [],
	pairPanel: [],

	attachByMessages: {},
	attachSortedByDate: [],
	tmpAttachList: [],
	scrollHeight: 0,
	scrollTop: 0,
	scrollPanelHeight: 0,
	attachTileSize: {
		width: 760,
		height: 450
	},

	sliderEl: null,
	trackEl: null,
	scrollStep: 0,
	tick: 0,
	alreadyActive: false,

	attachCounter: 0,
	slicedItems: [],
	updateEvent: false,
	visibleItems: [],
	tmpItems: [],

	loadedAttachData: [],
	currentItemIndex: 0,
	itemsPerLoad: 6,
	viewCount: 4,

	lastIndex: 0,
	lastPos: 0,
	itemHoverAction: false,
	tileUpdateTimer:null,

	constructor: function () {

		Ext.apply(arguments[0], {
			xtype: 'panel',
			layout: {
				type: 'fit',
				//pack: 'start',
				//	align: 'stretch'
			},
			autoScroll: false,
			//height: '100%',
			//	width: "100%",
			overflowX: 'hidden',
			items: [{
				layout: {
					type: 'fit'
				},
				autoScroll: false,
				overflowX: 'hidden',
				items: [
					{
						xtype: "panel",

						layout: {
							type: 'vbox',
							pack: 'center',
						},
						id: "scrollPanelElId",
						autoScroll: true,
						overflowX: 'hidden',
						height: "auto",
						bodyCls: "attachBack",
						items: {
							id: "contentPanelElId",
							xtype: "panel",
							width: "90%",
							layout: {
								type: 'anchor',
								align: 'middle	'
							},
							overflowX: 'hidden',
							border: false,
							padding: 2,
							bodyStyle: {
								background: 'transparent',
								width: 200
							}
						}
					}
				],
				dockedItems: {
					xtype: 'toolbar',
					padding: 4,
					dock: "bottom",
					items: [
						'->',
						{
							xtype: 'tbseparator',
							border: 1,
							style: {
								borderColor: '#C5D5EA',
								borderStyle: 'solid'
							},
							height: 20,
							margin: "0 5 0 5"
						},
						{
							xtype: 'fieldcontainer',
							fieldLabel: "<b>Attachment quantity per view</b>",
							labelWidth: 200,
							defaultType: 'radiofield',
							defaults: {
								flex: 1
							},
							layout: 'hbox',
							items: [
								{
									xtype: "radiofield",
									boxLabel: '2',
									name: 'count',
									//inputValue: 'off',
									id: 'radio1',
									margin: "0 5 0 0 ",
									handler: function() {
										var radio = Ext.getCmp("radio1");
										if (radio.checked == true) {
											radio.setBoxLabel('<b>2</b>');
											Ext.getCmp("radio2").setBoxLabel('4');
											Ext.getCmp("radio3").setBoxLabel('6');

											this.loadingMask.hide();
											clearInterval(this.tileUpdateTimer);
											clearTimeout(this.tileUpdateTimer);
											this.updateTileSize(2);
										}
									}.bind(this)
								}, {
									xtype: "radiofield",
									boxLabel: '<b>4</b>',
									name: 'count',
									//value: 'true',
									id: 'radio2',
									margin: "0 5 0 0",
									handler: function() {
										var radio = Ext.getCmp("radio2");
										if (radio.checked == true) {
											radio.setBoxLabel('<b>4</b>');
											Ext.getCmp("radio1").setBoxLabel('2');
											Ext.getCmp("radio3").setBoxLabel('6');

											this.loadingMask.hide();
											clearInterval(this.tileUpdateTimer);
											clearTimeout(this.tileUpdateTimer);
											this.updateTileSize(4);
										}
									}.bind(this)
								}, {
									xtype: "radiofield",
									boxLabel: '6',
									name: 'count',
									//inputValue: 'off',
									id: 'radio3',
									margin: "0 5 0 0 ",
									handler: function(e) {
										var radio = Ext.getCmp("radio3");
										if (radio.checked == true) {
											radio.setBoxLabel('<b>6</b>');
											Ext.getCmp("radio1").setBoxLabel('2');
											Ext.getCmp("radio2").setBoxLabel('4');

											this.loadingMask.hide();
											clearInterval(this.tileUpdateTimer);
											clearTimeout(this.tileUpdateTimer);
											this.updateTileSize(6);

										}
									}.bind(this)
								}
							]
						}
					]
				}
			}]
		});
		this.callParent(arguments);
		this.on("afterrender", function () {
			this.scrollableAttachPanelEl = Ext.getCmp("scrollPanelElId");


			this.loadingMask = new Ext.LoadMask({ msg: "Please wait ...", target: this.scrollableAttachPanelEl });




			var body = document.body,
										html = document.documentElement;
			var _height = Math.max(body.scrollHeight, body.offsetHeight,
						 html.clientHeight, html.scrollHeight, html.offsetHeight);

			this.messagesIds = this.getParameterByName("id");

			this.getAttachmentList(this.messagesIds);
			this.on("resize", this.onResize.bind(this));

			this.scrollableAttachPanelEl.body.el.on("scroll", function (e, t) {
				this.getVisibleItemsOnScroll();
			}.bind(this));
		});
	},


	updateAttachmentList: function (item, id) {
		this.updateEvent = true;
		this.lastPos = this.scrollableAttachPanelEl.getScrollY();
		item.destroy();
		this.scrollToLast();

		var idx = -1;
		var secondId = -1;
		//this.attachSortedByDate.find(function (predicate, index) {
		//	if (predicate.attachmentId == id) {

		//		if (idx_2 == -1 && idx != -1) {
		//			idx_2 = index;
		//			return;
		//		}

		//		if(idx==-1)
		//			idx = index;
		//	}
		//});

		for (var key in this.attachSortedByDate) {

			if (secondId == -1 && idx != -1) {
				secondId = this.attachSortedByDate[key].attachmentId;
				break;
			}
			if (this.attachSortedByDate[key].attachmentId == id) {
				if (idx == -1)
					idx = key;
			}
		}

		if (idx != -1) {
			this.attachSortedByDate.splice(idx, 1);
			delete this.itemsArray[id];
		}
		if (secondId != -1) {
			//this.attachTileSize = {
			//	width: parseInt(this.scrollableAttachPanelEl.getWidth() / 2.5),
			//	height: Math.ceil(this.scrollableAttachPanelEl.getHeight() / (this.viewCount / 1.65))
			//};
			var tmpItem = Ext.getCmp("contentEl" + secondId);
			tmpItem.setSize(this.attachTileSize.width, this.attachTileSize.height);
			Ext.getCmp("actionPanel" + secondId).setWidth(this.attachTileSize.width);
		}
	},


	onCounterSliderChanged: function (slider, newValue, thumb, eOpts) {
		//this.scrollBarEl.setValue(1);
	},

	updateTileSize:function(value) {
		this.loadingMask.show();
		this.attachTileSize = {
			width: (this.scrollableAttachPanelEl.getWidth() / 2.6),
			height: Math.ceil(this.scrollableAttachPanelEl.getHeight() / (value / 1.54))
		};
		this.viewCount = value;

		var elements = Ext.query('*[id^=contentEl]');
		this.tileUpdateTimer= setTimeout(function () {
			for (var i = 0; i < elements.length; i++) {
				var tmpId = elements[i].id;
				if (tmpId.indexOf("-") == -1) {
					var id = tmpId.substring(9, tmpId.length);
					var item = Ext.getCmp(tmpId);
					item.setSize(this.attachTileSize.width, this.attachTileSize.height);
					//var id = tmpId.substring(11, tmpId.length);
					if (navigator.userAgent.toLowerCase().indexOf('edge') == -1)
						Ext.getCmp("actionPanel" + id).setWidth(this.attachTileSize.width - 13);
					else Ext.getCmp("actionPanel" + id).setWidth(this.attachTileSize.width -60);
				}
			}
			this.loadingMask.hide();
		}.bind(this), 100);
	},

	/**********************************************************************************************/
	onResize: function (width, height, oldWidth, oldHeight) {
		//	this.scrollBarEl.setHeight(Ext.getCmp("siteRoot").getHeight() - 52);
		//this.attachTileSize.width = Ext.getCmp("siteRoot").getWidth() / 2.5;

		if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {

			this.scrollableAttachPanelEl.body.dom.style.textAlign = ("-moz-center");
		} else if (navigator.userAgent.toLowerCase().indexOf('edge') > -1) {

			this.scrollableAttachPanelEl.body.dom.style.paddingLeft = "9%";//textAlign = ("center");
		}
		else if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {

			this.scrollableAttachPanelEl.body.dom.style.textAlign = ("-webkit-center");
		} else {

			this.scrollableAttachPanelEl.body.dom.style.paddingLeft = "9%";//textAlign = ("center");
		}
		this.updateTileSize(this.viewCount);
		//margin: "0 0 10 150"
		//var width = this.scrollableAttachPanelEl.getWidth();
		//var paddingLeft = (width - this.attachTileSize.width * 2 - 40) / 2;
		//this.scrollableAttachPanelEl.body.dom.style.padding = "0px 0px 10px " + paddingLeft + "px";
	},

	/**********************************************************************************************/
	onActivate: function (scope, width, height, oldWidth, oldHeight, eOpts) {

	},

	//
	/***********************************************************************************************/
	onMouseUp: function (scope, td, cellIndex, record, tr, rowIndex, e, eOpts) {
		//var loadingMask = new Ext.LoadMask({ msg: "Please wait for server response...", target: this });
		//loadingMask.show();
		//var s = record;
		if (cellIndex != tr.cells.length - 1)
			if (this.selectedId != this.attachmentsMap[record.data.name].id) {
				this.selectedId = this.attachmentsMap[record.data.name].id;
				this.currentFileName = record.data.name;
				Ext.getCmp("attachmentItem").setTitle(record.data.name);
				this.attchType = this.attachmentsMap[record.data.name].type;
				Ext.getBody().mask("Please wait...");
				//	this.readAttachment(this.selectedId);

				Ext.getBody().unmask();
			}
		//loadingMask.hide();
	},

	/***********************************************************************************************/
	deleteAttachment: function (grid, rowIndex, colInde) {
		var record = grid.getStore().getAt(rowIndex);
		Ext.MessageBox.confirm('Confirm', 'Are you sure you want to delete "' + record.data.name + '"?', function (btn) {

			if (btn == "yes") {
				var idList = [];
				idList.push(this.selectedId = this.attachmentsMap[record.data.name].id);

				var requestUrl = "/Watcher/DeleteAttachments";
				var request = new XMLHttpRequest();
				request.open("POST", requestUrl, true);
				request.responseType = "text";
				request.onload = function (request) {
					if (request.readyState == 4 && request.status == 200) {
						if (request.response == "True") {
							console.log("DeleteAttachments complited successfuly");
							var f;
							while (f = Ext.getCmp("attachmentItem").items.first()) {
								Ext.getCmp("attachmentItem").remove(f, true);
							}
							this.getAttachmentList(this.messagesIds);
						} else console.log("DeleteAttachments failed");
					} else if (request.readyState == 4 && request.status == 500) {
						Ext.MessageBox.show({
							title: 'Error hapened!',
							msg: "The server encountered an unexpected condition which prevented it from fulfilling the request.",
							buttons: Ext.MessageBox.OK,
							animateTarget: this,
							fn: function () {
								console.log("DeleteAttachments failed.");
							},
							icon: Ext.Msg.ERROR
						});
						console.log("The server encountered an unexpected condition which prevented it from fulfilling the request.");
					}
				}.bind(this, request);
				request.onerror = function (request) {
					var result = request.response;
					console.log("DeleteAttachments failed. Error: " + result);
				}.bind(this, request);
				request.send(JSON.stringify(idList));
			}
		}.bind(this));



	},


	/***********************************************************************************************/
	downloadAttachment: function (grid, rowIndex, colInde) {

		var record = grid.getStore().getAt(rowIndex);
		var id = this.attachmentsMap[record.data.name].id

		// Build and send the request
		var requestUrl = "/Watcher/ReadAttachment?id=" + id;
		var messagesResponse = "";
		var request = new XMLHttpRequest();
		request.open("POST", requestUrl, true);
		request.responseType = "arraybuffer";
		//request.setRequestHeader("Content-type", "application/octet-stream");
		request.onload = request.onload = function (request) {
			if (request.readyState == 4 && request.status == 200) {

				var type = "unknown";
				var ext = record.data.name.split('.').pop();

				switch (ext) {
					case "jpg":
						type = "image/jpeg";
						break;
					case "jpeg":
						type = "image/jpeg";
						break;
					case "png":
						type = "image/png";
						break;
					case "gif":
						type = "image/gif";
						break;
					case "json":
						type = "application/json";
						break;
					case "wav":
						type = "audio/wave";
						break;
					case "mp3":
						type = "audio/mpeg";
						break;
					case "flac":
						type = "audio/flac";
						break;
					case "ogg":
						type = "audio/vorbis";
						break;
					default:
						break;
				}


				var blob = new Blob([request.response], { type: type });
				var localUrl = (window.URL || window.webkitURL).createObjectURL(blob);

				if (localUrl) {
					var a = document.createElement('a');
					a.download = record.data.name;
					a.href = localUrl;

					a.dataset.downloadurl = [type, a.download, a.href].join(':');
					a.draggable = true; // Don't really need, but good practice.
					a.classList.add('dragout');

					this.getEl().dom.appendChild(a);

					a.onclick = function (e) {
						if ('disabled' in this.dataset) {
							return false;
						}

						a.dataset.disabled = true;
						// Need a small delay for the revokeObjectURL to work properly.
						setTimeout(function () {
							window.URL.revokeObjectURL(a.href);
						}, 1500);
					};
					a.click();


					//window.open(localUrl, "_self")
					//	this.downloadButton.setHref(localUrl);
					//this.downloadButton.getEl().set({ download: record.data.name });
				}
				else {
					this.downloadButton.setHref("");
					console.log("Unable to create local URL.");
				}

			} else if (request.readyState == 4 && request.status == 500) {
				Ext.MessageBox.show({
					title: 'Error hapened!',
					msg: "The server encountered an unexpected condition which prevented it from fulfilling the request.",
					buttons: Ext.MessageBox.OK,
					animateTarget: this,
					fn: function () {
						console.log("Get attachment failed.");
					},
					icon: Ext.Msg.ERROR
				});
				console.log("The server encountered an unexpected condition which prevented it from fulfilling the request.");
			}
		}.bind(this, request);
		request.onerror = this.onRequestFailed.bind(this, request, "QueryAttachments");
		request.send();
	},

	/***********************************************************************************************/
	startWebWorker: function (format, attachment, responseFormat) {
		try {
			//this.webWorkerFrom = performance.now();
			var objData = {
				format: format,
				attachment: attachment,
				responseFormat: responseFormat

			};

			//
			//var result = CircularJSON.stringify(this.allMessages);
			var from = performance.now();
			//alert("CircularJSON:" + (to - from));

			var worker = new Worker('/Content/AttachmentsPlugins/AttachmentGetter.js');
			worker.onmessage = this.onWebWorkerComplited.bind(this);
			worker.onerror = this.onWebWorkerFail.bind(this);

			if (this.activeAttachments[attachment.attachmentId] == undefined) {
				worker.postMessage(objData);//objData);
				this.activeAttachments[attachment.attachmentId] = [from, worker];
			}
			console.log("WebWorker started");

			// Pako magic
			//output = pako.inflate(binData);
			// Convert zipped byteArray back to utf8 string:
			//	responseObject = new TextDecoder("utf8").decode(output);
		} catch (error) {
			//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: Failed to unpack server response data.");
			console.log("Failed to get attachment. Exception: " + error);
		}
	},

	/**********************************************************************************************/
	onWebWorkerComplited: function (event) {
		//var data = JSON.parse(event.data);

		//this.worker.terminate();
		var error = event.data.error;
		var blobResponse = event.data.response;
		var attachment = event.data.attachment;
		var format = event.data.format;




		//var attachName = attachment.attachmentName;
		//var attachId = attachment.attachmentId;
		//var attachmentDeliveryTime = attachment.attachmentDeliveryTime;
		//var messageId = attachment.messageId;
		//var attachFormat = attachment.attachmentFormat;
		//var messageId = attachment.messageId;
		//var attachBlob = blobResponse;

		if (this.activeAttachments[attachment.attachmentId] != undefined)
			if (error == "") {
				//this.loadedAttachData[attachment.attachmentId] = {
				//	blobResponse: blobResponse,
				//	worker: this.activeAttachments[attachment.attachmentId][1]
				//};
				console.log("-----------------------------------");

				//if ( this.activeAttachments.hasOwnProperty( attachment.attachmentId ) == true ) {

				var from = this.activeAttachments[attachment.attachmentId][0];
				var worker = this.activeAttachments[attachment.attachmentId][1];
				worker.terminate();
				var to = performance.now();
				console.log("WebWorker complited in: " + (to - from));

				this.itemsArray[attachment.attachmentId].initAttachment(blobResponse);
				this.itemsArray[attachment.attachmentId].loadingMask.hide();
				delete this.activeAttachments[attachment.attachmentId];
				//}

				console.log("-----------------------------------");
			}
			else {
				console.error(error);

				var from = this.activeAttachments[attachment.attachmentId][0];
				var worker = this.activeAttachments[attachment.attachmentId][1];
				worker.terminate();
				this.itemsArray[attachment.attachmentId].loadingMask.hide();
				var to = performance.now();
				console.log("WebWorker complited in: " + (to - from));
			}

	},

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

	/***********************************************************************************************/
	initAttachmentsList: function (responseObject) {
		var attachmentList = responseObject.attachmentList;


		this.attachSortedByDate = attachmentList.sort(function (x, y) {
			if (x.attachmentDeliveryTime < y.attachmentDeliveryTime) {
				return -1;
			}
			if (x.attachmentDeliveryTime > y.attachmentDeliveryTime) {
				return 1;
			}
			return 0;
		});


		var counts = this.attachSortedByDate.length;//this.itemsArray.length;
		var countsPerView = Math.floor(Ext.getCmp("siteRoot").getHeight() / this.attachTileSize.height) * 2;
		this.attachCount = attachmentList.length;

		this.getVisibleItemsOnScroll();
		Ext.getCmp("radio2").setValue(true);
	},

	addNewAttachTile: function (index) {

		if (index < this.attachCount) {
			var perfomanceFrom = performance.now();
			this.lastIndex += this.itemsPerLoad;
			var tmpBlocks = [];

			for (var i = index; i < this.lastIndex; i++) {//  
				if (this.attachSortedByDate[i] != undefined) {

					var item = Ext.create("Ext.AttachmentItem", {
						attachment: this.attachSortedByDate[i],
						tileSize: this.attachTileSize,
						anchor: '48%'
						//attachBlob:blobResponse
					});

					this.itemsArray[this.attachSortedByDate[i].attachmentId] = (item);
					Ext.getCmp("contentPanelElId").add(item);

				} else break;
			}
			this.alreadyActive = false;
			//this.scrollableAttachPanelEl.add(this.loadedIActiveItems);
			//	this.scrollableAttachPanelEl.updateLayout(true);
			var perfomanceTo = performance.now();
			console.log("Init list: " + (perfomanceTo - perfomanceFrom));
		}
	},

	//Server request functions
	/**********************************************************************************************/
	getAttachmentList: function (messageIdString) {


		var messageIdList = messageIdString.split(",");

		var skip = 0;
		var limit = 0;
		var fastStatics = 0;
		var filters = {};
		filters.messageIdList = messageIdList;
		filters.deliveryTimeStart = 0;
		filters.deliveryTimeEnd = 0;
		filters.nameMatch = "";

		//DocumentJson:16,
		//DocumentCbor:17,

		//ImageJpeg:256,

		//AudioWave:512,
		//AudioFlac:513,
		//AudioMpeg:514,
		//AudioOpus:515,
		//AudioVorbis:516,

		//UnknownBlob:4096

		filters.attachmentFormats = 0;//this.attachmentFormats[DocumentJson] | this.attachmentFormats[ImageJpeg] | this.attachmentFormats[AudioWave];

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
		//this.measureTimer = setInterval(this.waitForEventsResponse, 1,this);
		//this.measureTimer = setInterval(this.waitForEventsResponse, 1,this);
		console.log("QueryAttachments started...");
		//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: RequestEvents started...");
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
					this.initAttachmentsList(responseObject);
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

	//Server request functions
	/**********************************************************************************************/
	readAttachment: function (attachmentId) {

		// Build and send the request
		var requestUrl = "/Watcher/ReadAttachment?id=" + attachmentId;
		var messagesResponse = "";
		var request = new XMLHttpRequest();
		request.open("POST", requestUrl, true);
		request.responseType = "arraybuffer";
		//request.setRequestHeader("Content-type", "application/octet-stream");
		request.onload = this.onReadattachmentComleted.bind(this, request, "QueryAttachments");
		request.onerror = this.onRequestFailed.bind(this, request, "QueryAttachments");

		this.performanceFrom = performance.now();
		//this.measureTimer = setInterval(this.waitForEventsResponse, 1,this);
		//this.measureTimer = setInterval(this.waitForEventsResponse, 1,this);
		console.log("ReadAttachment started...");
		//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: RequestEvents started...");
		request.send();
	},

	//Response handling functions
	/***********************************************************************************************/
	onReadattachmentComleted: function (request, requestName) {
		if (request.status == 200) {
			this.responseReady = true;
			this.performanceTo = performance.now();

			console.log("Response time for ReadAttachment: " + (this.performanceTo - this.performanceFrom));
			this.readAttachmentsWorker(request.response, requestName);


		} else this.reportErrorMessage(request, requestName, true);

	},

	/**********************************************************************************************/
	readAttachmentsWorker: function (response, requestName) {
		var raw = this.attachResponseHandler(response); //this.eventsResponseHandler(request.response);
		try {
			//var loadingMask = new Ext.LoadMask({ msg: "Please wait...", target: this });
			//var startMask = new Ext.LoadMask(document.body, { msg: 'Setting Up...', removeMask: false});
			//startMask.showAt(200, 200);
			var imageView = null;
			var hexView = null;
			var jsonView = null;

			var jsonTab = null;
			var audioTab = null;
			var hexTab = null;
			var imageTab = null;

			//cleaning previous childrens collection 
			var f;
			while (f = Ext.getCmp("attachmentItem").items.first()) {
				Ext.getCmp("attachmentItem").remove(f, true);
			}

			var body = document.body,
				html = document.documentElement;
			var _height = Math.max(body.scrollHeight, body.offsetHeight,
								   html.clientHeight, html.scrollHeight, html.offsetHeight);
			var tabControl = Ext.create({
				xtype: 'tabpanel',
				resizeTabs: true,
				enableTabScroll: true,
				height: _height - 31,
				defaults: {
					//autoScroll: true,
					bodyPadding: 0
				}
			});


			if (this.attchType.indexOf('Image') != -1)
				imageTab = tabControl.add({
					title: "Image Viewer",
					layout: {
						type: 'vbox',
						pack: 'start',
					},
					bodyStyle: {
						background: '#FCFCFC',
						padding: 5,
					},
					autoScroll: true,
					scroll: true,
					border: false,
					items: [{
						xtype: 'image',
						id: "viewer" + this.attachCounter,
					}]

				});

			if (this.attchType == "DocumentJson") {
				jsonView = new Ext.JsonViewer({
					id: "jsonViewerId" + this.attachCounter,
					//	height: _height - 65,
					width: "auto"
				});

				jsonTab = tabControl.add({
					title: "JsonView",
					layout: {
						//type: 'vbox',
						//align: 'stretch',
						//pack: 'start',
					},
					border: false,
					items: [jsonView]

				});
			}

			if (this.attchType.indexOf('Audio') != -1) {
				//var byteNumbers = new TextEncoder().encode(responseObject.fileData);
				var newWaveform = this.createWaveform();
				//var byteArray = new Uint8Array(byteNumbers);
				newWaveform.loadAudio(new AudioPlayer(), response, true, 1);
				audioTab = tabControl.add(newWaveform);
			}

			hexTab = tabControl.add({
				title: "HexView",
				layout: {
					type: 'vbox',
					align: 'stretch',
					pack: 'start',
				},
				border: false,
				items: [Ext.create("Ext.HexViewer", {
					height: '100%',
					width: "100%",
					layout: 'fit',
					id: "hexViewElId"
				})]

			});


			tabControl.add({
				title: "OOOOOO",
				id: "scrollableAttachPanelElId",
				layout: {
					type: 'vbox',
					pack: 'center',
					align: 'middle'
				},
				autoScroll: true,
				items: this.loadedIActiveItems,
			});


			Ext.getCmp("attachmentItem").add(tabControl);
			//this.doLayout();


			this.scrollableAttachPanelEl = Ext.getCmp("scrollableAttachPanelElId");

			this.scrollableAttachPanelEl.on("afterrender", function () {
				var scrollable = this.getScrollable();
				//scrollable.element.dom.offsetHeight = 500;
				console.log(this.getHeight());
				this.body.on("scroll", function (e, t, eOpts) {
					this.scrollPanelHeight = this.body.dom.offsetHeight;
					this.scrollHeight = this.body.dom.scrollHeight - this.scrollPanelHeight;
					this.scrollTop = this.body.dom.scrollTop;

					var start = 0;


				}.bind(this));


				console.log(this);
			}.bind(this.scrollableAttachPanelEl));


			if (this.attchType.indexOf('Image') != -1)
				imageView = Ext.getCmp("viewer" + this.attachCounter);
			hexView = Ext.getCmp("hexViewElId");


			if (this.attchType == "UnknownBlob")
				hexView.setupData(raw);

			hexView.on("afterrender", function () {
				hexView.setupData(raw);
			}.bind(this));


			if (this.attchType.indexOf('Image') != -1) {
				var image = this.getImage(response);
				imageView.setSrc(image);

				tabControl.setActiveTab(imageTab);

			} else tabControl.setActiveTab(hexTab);


			if (this.attchType.indexOf('Audio') != -1) {
				tabControl.setActiveTab(audioTab);
			}


			if (this.attchType == "DocumentJson")
				jsonView.setupData(raw);

			if (this.attchType == "DocumentJson") {
				jsonView.on("afterrender", function () {
					jsonView.setupData(raw);
				}.bind(this));
				//jsonView.setupData(raw);
				tabControl.setActiveTab(jsonTab);
			}

			//startMask.hide();
			console.log("ReadAttachment completed.");

		} catch (error) {
			Ext.MessageBox.show({
				title: 'Error hapened!',
				msg: "Uncatch error,failed to process attachment data.<br>Exception info: " + error.message,
				buttons: Ext.MessageBox.OK,
				animateTarget: this,
				fn: this.errorHandling(requestName),
				icon: Ext.Msg.ERROR
			});
			console.log("Uncatch error,failed to process attachment data.Exception info: " + error.message);
		}
		this.attachCounter++;
	},

	b64ToRaw: function (dataURI) {
		var BASE64_MARKER = ';base64,';
		var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
		var base64 = dataURI.substring(base64Index);
		var raw = atob(dataURI);
		return raw;
	},

	blobToRaw: function (dataURI) {
		var BASE64_MARKER = ';base64,';
		var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
		var base64 = dataURI.substring(base64Index);
		var raw = atob(dataURI);
		return raw;
	},

	//Error handling functions
	/**********************************************************************************************/
	reportErrorMessage: function (request, requestName, binaryResponse) {


		if (binaryResponse) {
			try {
				var textDecoder = new TextDecoder();
				responseMessage = textDecoder.decode(request.response);
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
		}
		else {
			responseMessage = request.response;
		}
		try {
			// Turn number array into byte-array
			var binData = new Uint8Array(request.response);
			try {
				responseObject = new TextDecoder("utf8").decode(request.response);
			} catch (error) {
				try {
					// Convert zipped byteArray back to utf8 string:
					if (binData.length > 65000) {
						responseMessage = this.arrayBufferToString(request.response);
					} else responseObject = this.ab2str(request.response);
				} catch (error) {
					console.log(error);
				}
			}
		} catch (error) {
			console.log("Failed to unpack server response.");
		}



		// Decode response message
		var responseMessage = null;


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


	arrayBufferToString: function (buffer) {
		var bufView = new Uint16Array(buffer);
		var length = bufView.length;
		var result = '';
		for (var i = 0; i < length; i += 65535) {
			var addition = 65535;
			if (i + 65535 > length) {
				addition = length - i;
			}
			result += String.fromCharCode.apply(null, bufView.subarray(i, i + addition));
		}

		return result;
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
	attachResponseHandler: function (charData) {
		var binData = null;
		var output = null;
		var responseObject = "";
		try {
			// Turn number array into byte-array
			binData = new Uint8Array(charData);

			// Pako magic
			//output = pako.inflate(binData);
			try {
				// Convert zipped byteArray back to utf8 string:
				responseObject = new TextDecoder("utf8").decode(binData);
				//	responseObject = this.ab2str(binData.slice(i * 65000, 65000));//new TextDecoder("utf8").decode(binData);
			} catch (error) {
				try {
					responseObject = this.arrayBufferToString(binData);
				} catch (error) {
					console.log(error);
				}
			}
		} catch (error) {
			console.log("Failed to unpack server response.");
		}
		return responseObject;
	},


	//Alternative array buffer to string converting
	/**********************************************************************************************/
	ab2str: function (buf) {
		return String.fromCharCode.apply(null, new Uint8Array(buf));
	},

	/***********************************************************************************************/
	requestStatusHandler: function (status, requestName) {
		if (status == 500) {
			Ext.MessageBox.show({
				title: 'Error hapened!',
				msg: "The server encountered an unexpected condition which prevented it from fulfilling the request.",
				buttons: Ext.MessageBox.OK,
				animateTarget: this,
				fn: this.errorHandling(requestName),
				icon: Ext.Msg.ERROR
			});
			console.log("The server encountered an unexpected condition which prevented it from fulfilling the request.");

		} else if (status == 204) {
			Ext.MessageBox.show({
				title: 'Error hapened!',
				msg: "The server successfully processed the request,<br> but is not returning any content.",
				buttons: Ext.MessageBox.OK,
				animateTarget: this,
				fn: this.errorHandling(requestName),
				icon: Ext.Msg.ERROR
			});
			console.log("The server successfully processed the request,<br> but is not returning any content.");
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
	},

	/***********************************************************************************************/
	errorHandling: function (requestName) {
		console.log(requestName + " failed.");
		//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: Error occured. Please refresh page.");
		window.clearInterval(this.workerTimer);
		window.clearTimeout(this.workerTimer);
		this.readyState = false;
		//this.loadingMask.hide();
	},

	/***********************************************************************************************/
	onRequestFailed: function (request, requestName) {
		this.requestStatusHandler(request.status, requestName);
		this.errorHandling(requestName);
	},

	getImage: function (arrayBuffer) {
		var img = new Image();
		var uintArray = new Uint8Array(arrayBuffer);
		//var base64String = btoa(String.fromCharCode.apply(null, ));
		var base64String = "", chunksize = 0xffff;
		var len = uintArray.length;

		for (var i = 0; i * chunksize < len; i++) {
			base64String += btoa(String.fromCharCode.apply(null, uintArray.subarray(i * chunksize, (i + 1) * chunksize)));
		}
		var src = "data:image/jpeg;base64," + (base64String);
		return src;
	},

	hexToBase64: function (str) {
		return btoa(String.fromCharCode.apply(null, str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(" ")));
	},

	getParameterByName: function (name) {
		name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
		var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		results = regex.exec(location.search);
		return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	},

	/**********************************************************************************************/
	createWaveform: function () {
		var newWaveform = new Waveform({
			closable: false,
			title: "Audio player",
			cls: "noselect",
			height: 500,
		});
		return newWaveform;
	},

	getMimeTypeFromAudioFormat: function (audioFormat) {
		switch (audioFormat) {
			case AudioFormat.AudioWave:
				return "audio/wave";

			case AudioFormat.AudioFlac:
				return "audio/flac";

			case AudioFormat.AudioMpeg:
				return "audio/mpeg";

			case AudioFormat.AudioOpus:
				return "audio/opus";

			case AudioFormat.AudioVorbis:
				return "audio/vorbis";
		}

		return "application/octet-stream";
	},

	getVisibleItemsOnScroll: function () {

		var curPos = this.scrollableAttachPanelEl.getScrollY() + this.scrollableAttachPanelEl.getHeight();
		var maxScrollY = this.scrollableAttachPanelEl.body.dom.scrollHeight;
		if (curPos > maxScrollY) maxScrollY = curPos;

		console.log("Cur pos: " + curPos + "| Max pos: " + maxScrollY);

		var tmp1 = Math.floor((curPos) / (this.attachTileSize.height + 50) - this.viewCount / 2);

		if (maxScrollY <= (curPos) && this.attachSortedByDate.length > this.lastIndex) {
			var tmp = this.scrollableAttachPanelEl.getScrollY();
			this.addNewAttachTile(this.lastIndex);
			this.getVisibleItemsOnScroll();
			//if(tmp!=0)
			//	this.scrollableAttachPanelEl.setScrollY(tmp - this.attachTileSize.height / 3, true);
		} else {
			if (tmp1 < 0) tmp1 = 0;
			tmp1 *= 2;
			if (this.currentItemIndex != tmp1 || this.currentItemIndex == 0) {
				this.currentItemIndex = tmp1;

				this.visibleItems = {}
				for (var i = 0; i < this.visibleItems.length; i++) {
					this.itemsArray[this.visibleItems[i].attachmentId].loadingMask.hide();
				}

				if (this.currentItemIndex != 0) {
					for (var i = this.currentItemIndex - 2; i < this.currentItemIndex + this.viewCount; i++) {
						if (this.attachSortedByDate[i] != undefined)
							this.visibleItems[this.attachSortedByDate[i].attachmentId] = this.attachSortedByDate[i];
					}
				} else {
					for (var i = 0; i < this.viewCount; i++) {
						if (this.attachSortedByDate[i] != undefined)
							this.visibleItems[this.attachSortedByDate[i].attachmentId] = this.attachSortedByDate[i];
					}
				}

				this.tmpItems = this.visibleItems;

				//check if items from previous selection exist in new item selection
				for (var key in this.tmpItems) {
					if (this.visibleItems[key] == undefined && this.activeAttachments[key] != undefined) {
						var from = this.activeAttachments[key][0];
						var worker = this.activeAttachments[key][1];
						worker.terminate();
						//	delete this.activeAttachments[key];
						var to = performance.now();
						this.itemsArray[key].loadingMask.hide();
						console.log("WebWorker complited in: " + (to - from));
					}
				}


				//init attachment preview
				for (var key in this.visibleItems) {
					if (this.lastIndex == 0 || this.checkForAlreadyLodedItems(key) == false) {
						this.startWebWorker("", this.visibleItems[key], "blob");
						//this.itemsArray[key].loadingMask.show();
					}
				}
			}
		}
	},

	checkForAlreadyLodedItems: function (key) {
		//var item = Ext.getCmp("attachPanel" + key);
		//if (item != undefined || item.previewready == true)
		//	return true;
		//else {
		//	return false;
		//}
		if (this.itemsArray[key] == undefined || this.itemsArray[key].previewready == true)
			return true;
		else {
			return false;
		}
	},

	scrollToTop: function () {
		this.scrollableAttachPanelEl.setScrollY(0, true);
	},

	scrollToLast: function () {
		this.scrollableAttachPanelEl.setScrollY(this.lastPos, true);
	},

	arrayBufferToString: function (buffer) {
		var bufView = new Uint16Array(buffer);
		var length = bufView.length;
		var result = '';
		for (var i = 0; i < length; i += 65535) {
			var addition = 65535;
			if (i + 65535 > length) {
				addition = length - i;
			}
			result += String.fromCharCode.apply(null, bufView.subarray(i, i + addition));
		}
		return result;
	},


});