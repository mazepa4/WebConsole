/**************************************************************************************************
*** ServerStatusModel
**************************************************************************************************/
Ext.define('ServerStatusModel', {
	extend: 'Ext.data.TreeModel',
	//extend: 'Ext.data.Model',
	fields: [
		{ name: 'info', type: 'string' },
		{ name: 'status', type: 'string' },
		{ name: 'actions', type: 'string' }
	],
});



/**************************************************************************************************
*** Server status tab
**************************************************************************************************/
Ext.define("Ext.tab.NewServerStatus", {
	extend: "Ext.container.Container",
	xtype: "serverStatusTab",
	title: 'Services',
	requires: [
		"Ext.Widget*"
	],

	updatePeriodEl: null,
	treeEl: null,
	propertyGrid: null,

	performanceFrom: 0,
	workerTimer: 0,
	dataStorage: {},
	groupedDataStorage: {},
	updatePeriod:10000,

	expandedItems: [],
	lastIP: 0,
	lastPID: 0,
	updateAction: false,

	selection: null,
	selectionModel: null,
	selectedIndexes: [],
	lastScrollPos: 0,
	ready: false,

	operationSystemMap:{
		0: "Before Vista",
		1: "Windows Vista",
		2: "Windows 7",
		3: " Windows 8",
		4: "Windows 8.1",
		5: "Windows 10",
		6: "Windows Server 2008",
		7: "Windows Server 2008 R2",
		8: "Windows Server 2012",
		9: "Windows Server 2012 R2",
		10: "Windows Server 2016 Technical Preview"
	},

	timeMap: {
		5000:"5 sec.",
		10000: "10 sec.",
		30000: "30 sec.",
		60000: "1 min.",
		300000: "5 min.",
		600000: "10 min.",
		1800000: "30 min."
	},

	allowTimer:false,


	/**********************************************************************************************/
	constructor: function () {

		Ext.apply(arguments[0], {
			id: 'viewerPanel',
			layout: 'border',
			items: [{
				xtype: "treepanel",
				//title: 'Server status monitor',
				id: 'treeViewId',
				useArrows: true,
				rootVisible: false,
				multiSelect: true,
				flex: 1,
				region: 'center',
				store: Ext.data.TreeStore({
					extend: 'Ext.data.TreeStore	',
					model: "ServerStatusModel",
					root: {
						text: 'Root',
						expanded: true,
						children: null
					},
					//pageSize: 100,
					learOnLoad: true,
					lazyFill: true,
					autoSync: true,
					autoLoad: true,
					rootVisible: false
				}),
				columns: [
					{
						xtype: 'treecolumn',
						//xtype: 'checkedtreecolumn',
						text: 'Services',
						dataIndex: 'info',
						flex: 1,
						align: 'stretch',
						sortable: false,
						//expanded: false,

					}, {
						//xtype: 'treecolumn',
						text: 'Daemon State',
						dataIndex: 'status',
						width: 160,
						//flex: 1,
						sortable: true
					}, {
						//xtype: 'widgetcolumn',
						//widget: {
						//	xtype: "panel",
						//	layout: "hbox",
						//	border: false,
						//	bodyStyle: {
						//		background: 'transparent',
						//		padding: 0,
						//		margin: 0
						//	},
						//	items: [
						//		{
						//			xtype:"button",
						//			text: 'Start',
						//			tooltip: 'Start srvice',
						//			handler: function (e) {
						//				console.log(e);
						//			},
						//			//componentCls: "page-nav-button",
						//			margin:"0 5 0 0",
						//			iconCls: "delete-icon",
						//		}, {
						//			xtype:"button",
						//			text: 'Stop',
						//			tooltip: 'Stop service',
						//			iconCls: "download-icon",
						//			handler: function (e) {
						//				console.log(e);
						//			},
						//			//componentCls: "page-nav-button"
						//		}
						//	]
						//},
						align: 'center',
						width: 145,
						dataIndex: 'actions',
						text: 'Daemon Control Actions'
					}
				], bodyStyle: {
					background: '#EAEEF2',
					padding: 0
				},
				dockedItems: [
					{
						xtype: 'toolbar',
						padding: "0 3 0 3",
						//style: 'background-color: white;background-image:none;',
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
							}, */{
								xtype: 'button',
								margin: "1.6 0 2 0",
								text: "Switch user",
								iconCls: "switch-user-icon",
								padding: 1.7,
								cls: "toolbar-button",
								handler: function(e) {
									this.setupStartupWindow();
								}.bind(this)
							}, '->', {
								xtype: 'tbseparator',
								border: 1,
								style: {
									borderColor: '#C5D5EA',
									borderStyle: 'solid'
								},
								height: 20,
								margin: "0 0 0 5"
							}, {
								xtype: 'button',
								margin: "1.6 5 2 5",
								text: "Get deamons states",
								iconCls: "update-icon",
								padding: 1.7,
								cls: "toolbar-button",
								handler: this.initComponents.bind(this)
							}, {
								xtype: 'combobox',
								id: "actionsList",
								fieldLabel: 'Choose action',
								labelWidth: 80,
								emptyText: '',
								displayField: 'text',
								filterPickList: true,
								queryMode: 'local',
								store:Ext.create('Ext.data.Store', {
									fields: [
										{ name: 'text', type: 'string' }
									],
									data : [
										{ "text": "Start","action":"start" },
										{ "text": "Pause", "action": "pause" },
										{ "text": "Continue", "action": "continue" },
										{ "text": "Stop", "action": "stop" },
										{ "text": "Restart", "action": "restart" }
									]
								}),
								tpl: Ext.create('Ext.XTemplate',
										 '<ul class="x-list-plain"><tpl for=".">',
											'<li role="option" class="x-boundlist-item" ><img class="{action}-icon"/><div style="display:inline;vertical-align: bottom;border:none;">  {text}</div></li>',
										'</tpl></ul>')
								,
								width: 170,
								margin: "0 0 0 0",
								editable: false,
								hideTrigger: false,
							}, {
								xtype: 'button',
								id: "selectActonElId",
								iconCls: "start-icon",
								margin: "3 0 2 5",
								tooltip: 'Perform action',
								cls: "toolbar-button",
								text:"Start"
							}, {
								xtype: 'tbseparator',
								border: 1,
								style: {
									borderColor: '#C5D5EA',
									borderStyle: 'solid'
								},
								height: 20,
								margin: "0 5 0 5"
							}, {
								xtype: 'combobox',
								id: "updatePeriodElId",
								emptyText: '',
								displayField: 'text',
								filterPickList: true,
								queryMode: 'local',
								width: 160,
								fieldLabel: 'Update period:',
								labelWidth: 80,
								padding: "0px",
								editable: false,
								hideTrigger: false,
								margin: "0 0 0 2",
								store: Ext.create('Ext.data.Store', {
									fields: [
										{ name: 'text', type: 'string' }
									],
									data: [
										{ text: "5 sec." },
										{ text: "10 sec." },
										{ text: "30 sec." },
										{ text: "1 min." },
										{ text: "5 min." },
										{ text: "10 min." },
										{ text: "30 min." }]
								})
							}
						]
					}
				]
			}, {
				xtype: 'propertygrid',
				id: 'grid',
				region: 'east',
				width: 300,
				title: 'Node info',
				split: true,
				sortableColumns: false,
				listeners: {
					beforeedit: function () {
						return false;
					}
				},
				//selModel: new Ext.grid.RowSelectionModel(),
				//onRender: Ext.grid.PropertyGrid.superclass.onRender
			}]
		});

		this.callParent(arguments);
		this.on("afterrender", function () {
			this.treeEl = Ext.getCmp("treeViewId");
			this.propertyGrid = Ext.getCmp("grid");

			this.treeEl.on("itemclick", this.onItemClick.bind(this));
			this.treeEl.on("afteritemexpand", this.afterItemExpand.bind(this));
			this.treeEl.on("afteritemcollapse", this.afterItemCollapse.bind(this));

			this.updatePeriodEl = Ext.getCmp("updatePeriodElId");
			this.updatePeriodEl.on("change", this.onChangeConfig.bind(this));


			Ext.getCmp("actionsList").on("change", this.onActionChange.bind(this));


			this.on("hide", function (scope, eOpts) {
				window.clearTimeout(this.workerTimer);
				window.clearInterval(this.workerTimer);
				this.allowTimer = false;
			}.bind(this));


			this.on("show", function (scope, eOpts) {
				if (this.ready == true) {
					this.allowTimer = true;
					this.getServiceHostInfo();
				}
			}.bind(this));

			this.updateConfig(this.getCookie("serverStatusConfig"));

			String.prototype.reverse = function () {
				var s = "";
				var i = this.length;
				while (i > 0) {
					s += this.substring(i - 1, i);
					i--;
				}
				return s;
			};
			this.allowTimer = true;
			this.initComponents();
		});
	},

	/**********************************************************************************************/
	initComponents: function () {
		window.clearTimeout(this.workerTimer);
		this.getServiceHostInfo();
	},

	/**********************************************************************************************/
	updateConfig:function(cookie) {
		if (cookie != "") {
			var cookieObject = JSON.parse(cookie);
			this.updatePeriod = cookieObject.config.updatePeriod;
			this.updatePeriodEl.setValue(this.timeMap[this.updatePeriod]);
		} else {
			this.updatePeriod = 10000;
			this.updatePeriodEl.setValue(this.timeMap[this.updatePeriod]);
			var config = {
				config: {
					updatePeriod: this.updatePeriod
				}
			};
			this.setCookie("serverStatusConfig", JSON.stringify(config), 10);
		}
	},

	/**********************************************************************************************/
	onChangeConfig: function () {
		if (this.updatePeriodEl.getValue().indexOf("sec") != -1) {
			this.updatePeriod = parseInt(this.updatePeriodEl.getValue()) * 1000;
		} else {
			this.updatePeriod = parseInt(this.updatePeriodEl.getValue()) * 1000 * 60;
		}

		var config = {
			config: {
				updatePeriod: this.updatePeriod
			}
		};
		this.setCookie("serverStatusConfig", JSON.stringify(config), 10);
		this.initComponents();
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

	/**********************************************************************************************/
	setupStartupWindow: function () {
		var window = null;
		var body = [
			{
				layout: {
					type: 'vbox',
					align: 'middle'
				},

				bodyStyle: {
					background: '#EDEDED',
					padding: "3px"
				},
				margin: 0,
				items: [
					{
						xtype:"label",
						text: "Select user role",
						cls: "login-panel-style",
					},
					{
						xtype: 'button',
						id: "adminLoginElId",
						iconCls: "admin-icon",
						margin: "10 0 5 5",
						width:190,
						tooltip: 'Required to control services',
						cls: "toolbar-button x-btn-left",
						text: "Login as administartor",
						handler:function() {
							var layout=Ext.getCmp("logInWindowEl").getLayout();
							layout.setActiveItem(1);
						}
					},
					{
						xtype: 'button',
						id: "userLoginElId",
						iconCls: "user-icon",
						margin: "0 0 0 5",
						width: 190,
						tooltip: "Services control are not available",
						cls: "toolbar-button x-btn-left",
						text: "Login as guest",
						handler: function (e) {
							window.close();
						}.bind(this)
					}
				]
			}, {
				layout: {
					type: 'vbox',
					align: 'stretch'
				},
				bodyStyle: {
					background: '#EDEDED',
					padding: "2px"
				},
				margin: 0,
				items: [
						{
							xtype: "label",
							text: "Enter user name and password",
							cls: "login-panel-style",
							margin: "5 0 5 5"
						},{
							layout: 'column',
							border: false,
							margin: "0 15 0 5",
							bodyStyle: {
								background: '#EDEDED',
							},
							items: [
								{
									xtype: 'textfield',
									name: 'name',
									id: "userNameElId",
									fieldLabel: 'User name',
									labelWidth: 65,
									width: 253,
									allowBlank: true // requires a non-empty value
								},
								Ext.apply({
									xtype: 'button',
									ui: "default-toolbar",
									iconCls: "clearTagsFilterBtn",
									margin: "1 -30 0 5",
									width: 26,
									height: 26,
									tooltip: 'Clear value',
									handler:function(e) {
										Ext.getCmp("userNameElId").setValue("");
									}
								})
							]
						},
						{
							xtype: "panel",
							layout: "hbox",
							margin: "5 0 0 5",
							bodyStyle: {
								background: '#EDEDED',
							},
							border: false,
							items: [
								{
									xtype: 'textfield',
									name: 'pass',
									id: "passElId",
									fieldLabel: 'Password',
									labelWidth: 65,
									inputType: 'password',
									width: 253,
									margin: "0 0 0 0",
									allowBlank: true // requires a non-empty value
								},
								Ext.apply({
									xtype: 'button',
									ui: "default-toolbar",
									iconCls: "clearTagsFilterBtn",
									width: 26,
									height: 26,
									margin: "0 -30 0 5",
									tooltip: 'Clear value',
									handler: function (e) {
										Ext.getCmp("passElId").setValue("");
									}
								}),Ext.apply({
									xtype: 'button',
									ui: "default-toolbar",
									iconCls: "show-pass-icon",
									id:"showPassElId",
									width: 26,
									height: 26,
									margin: "0 5 0 33",
									tooltip: 'Show password',
									enableToggle:true,
									handler: function (e) {
										var button = Ext.getCmp("showPassElId");
										var domEl = document.getElementById("passElId-inputEl");
										if (button.pressed == true) {
											domEl.type = 'text';
											button.setTooltip('Hide password');
										} else {
											button.setTooltip('Show password');
											domEl.type = 'password';
										}
										
									}
								})
							]
						}
				],
				dockedItems: [
					{
						xtype: 'toolbar',
						padding: "1 3 1 3",
						//style: 'background-color: white;background-image:none;',
						dock: "bottom",
						items: [
							'->',
							{
								xtype: "button",
								iconCls: "navigation_back-icon",
								text: "Back",
								cls: "toolbar-button x-btn-left",
								handler: function () {
									var layout = Ext.getCmp("logInWindowEl").getLayout();
									layout.setActiveItem(0);
								},
								margin: "5 5 0 0"
							}, {
								xtype: "button",
								iconCls: "login-icon",
								text: "Log in",
								cls: "toolbar-button x-btn-left",
								margin: "5 0 0 0",
								handler: function (e) {
									window.close();
								}.bind(this)
							}
						]
					}
				]
			}
		];

		window = Ext.create('Ext.window.Window', {
			title: "Select role",
			id:"logInWindowEl",
			height: 172,
			width: 340,
			layout: 'card',
			activeItem: 0,
			region: "center",
			border: false,
			autoDestroy: true,
			animateTarget: this,
			alignTarget: this,
			modal: true,
			shadowOffset: 3,
			shadow: true,
			resizable:false,
			cls: "no-selection",
			items: body
		});

		window.on("afterrender", function () {

		}.bind(this));

		window.show();
	},

	/**********************************************************************************************/
	onActionChange: function (scope, newValue, oldValue, eOpts) {
		var actionButton = Ext.getCmp("selectActonElId");

		if (newValue == "Start") {
			actionButton.setIconCls("start-icon");
			actionButton.setText("Start services");
		} else if (newValue == "Pause") {
			actionButton.setIconCls("pause-icon");
			actionButton.setText("Pause services");
		} else if (newValue == "Continue") {
			actionButton.setIconCls("continue-icon");
			actionButton.setText("Continue services");
		} else if (newValue == "Stop") {
			actionButton.setIconCls("stop-icon");
			actionButton.setText("Stop services");
		} else if (newValue == "Restart") {
			actionButton.setText("Restart services");
			actionButton.setIconCls("restart-icon");
		}
		window.clearTimeout(this.workerTimer);
		this.getServiceHostInfo();
	},

	//Server request functions
	/**********************************************************************************************/
	getServiceHostInfo: function () {

		if (this.allowTimer == true) {
			// Build and send the request
			var requestUrl = "/Watcher/QueryServiceHosts";
			var messagesResponse = "";
			var request = new XMLHttpRequest();
			request.open("POST", requestUrl, true);
			//request.responseType = "text";
			//request.setRequestHeader("Content-type", "application/octet-stream");
			request.onload = this.onRequestMessagesComleted.bind(this, request, "QueryServiceHosts");
			request.onerror = this.onRequestFailed.bind(this, request, "QueryServiceHosts");

			this.performanceFrom = performance.now();
			//this.measureTimer = setInterval(this.waitForEventsResponse, 1,this);
			//this.measureTimer = setInterval(this.waitForEventsResponse, 1,this);
			console.log("QueryServiceHosts started...");
			//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: RequestEvents started...");
			request.send();
		}
	},

	//Response handling functions
	/***********************************************************************************************/
	onRequestMessagesComleted: function (request, requestName) {
		if (request.status == 200) {
			this.responseReady = true;
			var performanceTo = performance.now();
			console.log("Response time for QueryServiceHosts: " + (performanceTo - this.performanceFrom));

			var serviceHostList = JSON.parse(request.response).serviceHostList;
			//console.log(serviceHostList);

			//sorting data by IP
			if (serviceHostList.length != 0) {
				this.dataStorage = serviceHostList.sort(function (x, y) {
					if (x.connectionInfo.ip < y.connectionInfo.ip) {
						return -1;
					}
					if (x.connectionInfo.ip > y.connectionInfo.ip) {
						return 1;
					}
					return 0;
				});

				////group data by IP
				////this.dataStorage
				//for (var i = 0; i < sortedDataArray.lenght; i++) {

				//}


				var tmp = this.findItem(12088, 468201293);
				var curIP = this.dataStorage[0].connectionInfo.ip;
				var tmpPIDList = {};
				this.groupedDataStorage = {};
				for (var i = 0; i < this.dataStorage.length; i++) {
					var curItem = this.dataStorage[i];
					if (curIP != curItem.connectionInfo.ip) {
						this.groupedDataStorage[curIP] = tmpPIDList;
						tmpPIDList = {}
						curIP = curItem.connectionInfo.ip;
					}


					var date = new Date(curItem.lastActivityTime / 1000);
					var lastActivityTime = date.getFullYear() + "-" + this.fixDate((date.getMonth() + 1)) + "-" + this.fixDate(date.getDate()) + " " + this.fixDate(date.getHours()) + ":" + this.fixDate(date.getMinutes()) + ":" + this.fixDate(date.getSeconds());

					tmpPIDList[curItem.processId] = {
						supportedServices: curItem.supportedServices,
						properties: {
							OS:this.operationSystemMap[curItem.operatingSystem],
							cpu:curItem.processorInfo,//processorL1Cache,processorL2Cache,processorL3Cache,logicalCores,physicalCores,numaNodes
							ram:curItem.memoryInfo,//totalPhysicalMemory,availablePhysicalMemory
							isAlive: curItem.isAlive,
							port: curItem.connectionInfo.port,
							parallelCores: curItem.parallelCores,
							peakMemoryUsage: curItem.peakMemoryUsage,
							currentMemoryUsage: curItem.currentMemoryUsage,
							lastActivityTime: lastActivityTime,
							daemonName: curItem.daemonName

						}
					};

					if (i == this.dataStorage.length - 1) {
						this.groupedDataStorage[curIP] = tmpPIDList;
					}
				}

				var data = [];
				for (var ip in this.groupedDataStorage) {
					var tmpPIDList = this.groupedDataStorage[ip];
					var childsLevel1 = [];
					var expanded = false;
					var iterator = 0;

					for (var pid in tmpPIDList) {
						var childsLevel2 = [];
						var childsLevel3 = [];
						var expanded = false;

						var curItem = tmpPIDList[pid];

						var supportedServices = [];
						for (var j = 0; j < curItem.supportedServices.length; j++) {
							supportedServices.push({
								info: curItem.supportedServices[j],
								actions: "",
								leaf: true,
								iconCls: 'service-icon',
								id: "ServerStatusModel-" + ip + "-" + pid + "-service-"+j,
								PID: pid,
								IP: ip,
								pcNode: false,
								processNode: true
							});
						}


						var panel = Ext.create('Ext.panel.Panel', {
							layout: "hbox",
							border: false,
							bodyStyle: {
								background: 'transparent',
								margin: 0
							},
							items: [
								{
									xtype: "button",
									text: 'Start',
									tooltip: 'Start srvice',
									handler: function (e) {
										console.log(e);
									},
									//componentCls: "page-nav-button",
									margin: "2 5 2 2",
									iconCls: "start-icon",
									cls: "toolbar-button",
								}, {
									xtype: "button",
									text: 'Stop',
									tooltip: 'Stop service',
									iconCls: "stop-icon",
									handler: function (e) {
										console.log(e);
									},
									margin: "2 2 2 0",
									cls: "toolbar-button",
								}
							]
						});
						this.add(panel);
						var html = "";
						if (panel.body != undefined) {
							html = panel.body.dom.outerHTML;
						}
						this.remove(panel);

						childsLevel1.push({
							id: "ServerStatusModel-" + ip + "-" + pid + "-PID-" + iterator,
							info: /*"<input id='" +"proc:"+pid+" "+ip + "' type='checkbox'/>*/"<strong>" + curItem.properties.daemonName + ": </strong>" + pid,
							actions: html,
							status: "installed",
							children: supportedServices,
							expanded: expanded,
							leaf: false,
							iconCls: 'server-icon',
							textCls:"margin-left:10px;",
							PID: pid,
							IP: ip,
							pcNode: false,
							processNode: true,
							showCheckBox: true
						});
						iterator++;
					}



					data.push({
						info: "<strong>" + curItem.properties.OS + ": </strong>" + this.num2dot(ip),
						children: childsLevel1,
						expanded: expanded,
						id: "ServerStatusModel-" + ip + pid + "-address",
						leaf: false,
						iconCls: 'pc-icon',
						IP: ip,
						pcNode: true,
						processNode: false
					});
				}


				var root = {
					text: 'Root',
					expanded: true,
					children: data
				};
				this.lastScrollPos = this.treeEl.getView().getScrollY();
				this.treeEl.setRootNode(root);

				this.treeEl.expandAll();
				//for (var key in this.expandedItems) {
				//	this.treeEl.expandPath(this.expandedItems[key]);
				//}
				if (this.lastPID != 0)
					this.getProcInfo(this.lastPID, this.lastIP);
				else
					this.getPCInfo(this.lastIP);
				var store = this.treeEl.getStore();
				if (this.selection != null) {
					for (var i = 0; i < this.selection.length; i++) {
						var index = store.indexOf(this.selection[i])
						this.selectionModel.selectRange(index, index, true);
					}
				}
				this.ready = true;
				this.workerTimer = setTimeout(this.getServiceHostInfo.bind(this), this.updatePeriod);

				console.log("Server status updated in: " + (performance.now() - this.performanceFrom));

			} else this.reportErrorMessage(request, requestName, true);

		}
	},


	/***********************************************************************************************/
	num2dot: function (num) {
		var d = num % 256;
		for (var i = 3; i > 0; i--) {
			num = Math.floor(num / 256);
			d = d + '.' + num % 256;
		}
		return d;
	},

	/***********************************************************************************************/
	fixDate: function (value) {
		if (value < 10) value = "0" + value;
		return value;
	},

	/***********************************************************************************************/
	onRequestFailed: function (request, requestName) {
		this.requestStatusHandler(request.status, requestName);
		this.errorHandling(requestName);
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
	errorHandling: function (requestName) {
		console.log(requestName + " failed.");
		//this.serviceLogObject.treeViewObject.statusLabel.setText("Status: Error occured. Please refresh page.");
		window.clearInterval(this.workerTimer);
		window.clearTimeout(this.workerTimer);
	},

	/***********************************************************************************************/
	findItem: function (PID, IP) {

		if (!Array.prototype.find) {
			Array.prototype.find = function (predicate) {
				if (this == null) {
					throw new TypeError('Array.prototype.find called on null or undefined');
				}
				if (typeof predicate !== 'function') {
					throw new TypeError('predicate must be a function');
				}
				var list = Object(this);
				var length = list.length >>> 0;
				var thisArg = arguments[1];
				var value;

				for (var i = 0; i < length; i++) {
					value = list[i];
					if (predicate.call(thisArg, value, i, list)) {
						return value;
					}
				}
				return undefined;
			};
		}

		var idx = -1;
		return this.dataStorage.find(function (predicate, index) {
			if (predicate.connectionInfo.ip == IP && predicate.processId == PID) {
				idx = index;
				return predicate;
			}
		});
	},

	/**********************************************************************************************/
	onItemClick: function (scope, record, item, index, e, eOpts) {
		//var ss = this.treeEl.getStore().getRange(index,1);

		//this.selectedRecords.push(record);

		this.selection = this.treeEl.getSelection();
		this.selectionModel = this.treeEl.getSelectionModel();

		//console.log(record);
		var text = record.data.info;
		if (record.data.pcNode == true) {
			this.getPCInfo(record.data.IP);
		} else if (record.data.processNode == true) {
			this.getProcInfo(record.data.PID, record.data.IP);
		}
		//console.log(index);

	},

	/***********************************************************************************************/
	getProcInfo: function (PID, IP) {

		this.lastIP = IP;
		this.lastPID = PID;
		var source = {};
		try {
			var props = this.groupedDataStorage[IP][PID].properties;
			source["Daemon Name"] = props.currentMemoryUsage.daemonName;
			source["Process identifier"] = PID;
			source["Listening TCP port"] =parseInt(props.port.toString().reverse());
			source["Peak memory usage"] = (props.peakMemoryUsage / 1000000).toFixed(3) + " MB";
			source["Current memory usage"] = (props.currentMemoryUsage / 1000000).toFixed(3) + " MB";
			var result = (props.isAlive == "true" ? "alive" : "not alive");
			//source["Process status"] = result;
			source["Last successful ping"] = props.lastActivityTime;
			this.propertyGrid.setSource(source);

		} catch (err) {
			console.log("Last selected item doesn't exist!");
		}
	},


	/***********************************************************************************************/
	getPCInfo: function (IP) {

		this.lastIP = IP;
		this.lastPID = 0;
		var source = {};
		try {

			var props = null;
			for (var key in this.groupedDataStorage[IP]) {
				props = this.groupedDataStorage[IP][key].properties;
			}
			source["IP address"] = this.num2dot(IP);
			source["Operating system"] = props.OS;
			source["L1 cache"] = (props.cpu.processorL1Cache/ 1024).toFixed(1) + " KB";
			source["L2 cache"] = (props.cpu.processorL2Cache / 1024).toFixed(1) + " KB";
			source["L3 cache"] = (props.cpu.processorL3Cache / 1024).toFixed(1) + " KB";
			source["Logical cores"] = props.cpu.logicalCores;
			source["Physical cores"] = props.cpu.physicalCores;
			source["NUMA nodes"] = props.cpu.numaNodes;
			source["Total physical memory"] = (props.ram.totalPhysicalMemory / 1000000).toFixed(3) + " MB";
			source["Available physical memory"] = (props.ram.availablePhysicalMemory / 1000000).toFixed(3) + " MB";
			this.propertyGrid.setSource(source);

		} catch (err) {
			console.log("Last selected item doesn't exist!");
		}
	},


	/*********************************************************************************************/
	afterItemExpand: function (node, index, item, eOpts) {

		this.expandedItems[index] = node.getPath();
		//console.log(node.getPath());
	},

	/*********************************************************************************************/
	afterItemCollapse: function (node, index, item, eOpts) {
		if (this.expandedItems.hasOwnProperty(index) == true)
			delete this.expandedItems[index];
	},

	/*********************************************************************************************/
	checkForExpandeded: function (IP, PID) {
		for (var ip in this.groupedDataStorage) {
			var tmpPIDList = this.groupedDataStorage[ip];
			for (var pid in tmpPIDList) {

			}
		}
	},

	/*********************************************************************************************/
	restoreScrollPos: function () {
		this.treeEl.getView().setScrollY(this.lastScrollPos, true);
	},



});