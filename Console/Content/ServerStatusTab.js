/**************************************************************************************************
*** Server status tab
**************************************************************************************************/
Ext.define("Ext.tab.ServerStatus", {
	extend: "Ext.container.Container",
	xtype: "serverStatusTab",
	title: 'Server status',
	layout: 'border',

	gridPanel: null,
	dataStore: null,
	data: null,

	/**********************************************************************************************/
	constructor: function () {
		this.callParent(arguments);
		this.on("afterrender", function () {
			this.initComponents();
			this.items.add(this.gridPanel);
			this.loadGridData();
		});
	},


	/**********************************************************************************************/
	initComponents: function () {

		Ext.define('ServerStatusModel', {
			extend: 'Ext.data.Model',
			fields: ['name', 'status', 'running']
		});

		this.data = [];
		this.dataStore = Ext.create('Ext.data.Store', { model: 'ServerStatusModel', data: this.data });

		/*this.gridPanel = Ext.create('Ext.grid.Panel', {
			store: this.dataStore,
			//width: 300,
			flex: 1,
			//height: 'auto',
			disableSelection: true,
			collapsible: false,
			animCollapse: false,
			listeners: {
				selectionchange: this.gridSelectionChanged.bind(this)
			},
			viewConfig: {
				getRowClass: function (record, index, rowParams) {
					//if (record.data.status == "Not installed") {
					//	this.setDisabled(true);
					//}
					return record.data.running ? 'table-row-running' : 'table-row-error';
				}
			}
		});*/
	},


	/**********************************************************************************************/
	gridSelectionChanged: function (gridPanel, selected, eOpts) {
		console.log('grid selectionchange');
	},


	/**********************************************************************************************/
	loadGridData: function () {


		//Ext.Ajax.request({
		//	url: "/Default/LoadServerStatus",
		//	async: false,
		//	method: "GET",
		//	success: function (response, opts) {
		//		this.data = Ext.util.JSON.decode(response.responseText);
		//	}.bind(this),
		//	failure: function (response, opts) {
		//		//console.log(response.responseText);
		//	}
		//});
		
		//var requestUrl = "/Watcher/LoadServerStatus";

		//var request = new XMLHttpRequest();
		//request.open("GET", requestUrl, false);
		//request.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
		//request.send();
		
		//this.data = Ext.util.JSON.decode(request.responseText);

		this.dataStore = Ext.create('Ext.data.Store', {
			model: 'ServerStatusModel',
			data: this.data
		});

		//this.reconfigureGrid();
	},


	/**********************************************************************************************/
	rowAction: function (action, index) {
		console.log('rowAction: ' + action);

		this.data[index].status = action ? 'Stopped' : 'Running';
		this.data[index].running = !action;
		this.dataStore = Ext.create('Ext.data.Store', {
			model: 'ServerStatusModel',
			data: this.data
		});
		//this.reconfigureGrid();
	},


	/**********************************************************************************************/
	restartService: function (grid, rowIndex, colInde) {
		var rec = grid.getStore().getAt(rowIndex);

		Ext.Ajax.request({
			url: '/Default/ControlService',
			method: "POST",
			async: false,
			params: {
				serviceName: rec.data.name
			},
			success: function (response, opts) {
				//console.log(response.responseText);
			}.bind(this),
			failure: function (response, opts) {
				//console.log(response.responseText);
			}
		});
		//var requestUrl = "/Watcher/ControlService?serviceName=" + rec.data.name;

		//var request = new XMLHttpRequest();
		//request.open("POST", requestUrl, false);
		//request.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
		//request.send();


	},

	/**********************************************************************************************/
	reconfigureGrid: function () {
		//fields: ['name', 'status', 'running']
		if (this.dataStore!=null)
		this.gridPanel.reconfigure(this.dataStore, [
				{
					text: 'Service',
					dataIndex: 'name',
					flex: 0.4
				},
				{
					text: 'Status',
					dataIndex: 'status',
					flex: 0.3
				},
				{
					text: 'Running',
					dataIndex: 'running',
					flex: 0.2,
					hidden: true,
				},
				{
					xtype: 'actionbuttoncolumn',
					width: 80,
					header: 'Actions',
					items: [
						{
							text: 'RESTART',
							handler: this.restartService.bind(this)
						}
					]
				}
		]);
	}
});