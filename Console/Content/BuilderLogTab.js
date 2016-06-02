/**************************************************************************************************
*** Builder log tab
**************************************************************************************************/
Ext.define("Ext.tab.BuilderLog", {
	extend: "Ext.container.Container",
	xtype: "builderLogTab",
	title: 'Builder log',
	layout: 'border',

	/* GUI*/
	gridPanel: null,
	toolbar: null,
	buildButton: null,
	builderlogLabel: null,


	/* DATA */
	dataStore: null,
	data: null,

	/**********************************************************************************************/
	constructor: function () {
		this.callParent(arguments);

		this.on("afterrender", function () {
			this.initComponents();
			this.items.addAll(this.toolbar, this.gridPanel);
			this.builderlogLabel = Ext.getCmp('builderLogMessageLabelId');
			this.loadGridData();
		});
	},


	/**********************************************************************************************/
	initComponents: function () {

		Ext.define('BuilderLogModel', {
			extend: 'Ext.data.Model',
			fields: ['repository', 'success', 'message', 'time']
		});

		this.data = [];
		this.dataStore = Ext.create('Ext.data.Store', { model: 'BuilderLogModel', data: this.data });

		this.gridPanel = Ext.create('Ext.grid.Panel', {
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
					return record.data.success ? 'table-row-running' : 'table-row-error';
				}
			}
		});

		this.toolbar = Ext.create('Ext.toolbar.Toolbar', {
			height: 40,
			items: [
				{
					xtype: 'button', // default for Toolbars
					text: 'Run AutoBuilder',
					width: 150,
					height: 32,
					border: 1,
					handler: this.build.bind(this),
					style: {
						borderColor: '#99bce9',
						borderStyle: 'solid'
					},
				},
				{
					xtype: 'label',
					id: 'builderLogMessageLabelId',
					text: '',
					cls: 'title-text-big',
					margin: '0 10 0 10'

				}
			]
		});

	},


	/**********************************************************************************************/
	build: function () {
		console.log('build');
		Ext.Ajax.request({
			url: '/Default/RunAutoBuilder',
			method: "POST",
			async: false,
			success: function (response, opts) {
				//console.log(response.responseText);
			}.bind(this),
			failure: function (response, opts) {
				//console.log(response.responseText);
			}
		});

	},

	/**********************************************************************************************/
	gridSelectionChanged: function (gridPanel, selected, eOpts) {
		console.log('grid selectionchange');
	},


	/**********************************************************************************************/
	transformBuilderLog: function (json) {

		var data = Ext.util.JSON.decode(json);;
		var log = [];
		var message = data.message || '';
		this.builderlogLabel.setText(message);

		for (var i = 0; i < data.attemps.length; i++) {
			log.push({
				message: data.attemps[i].message,
				repository: data.attemps[i].repository,
				success: data.attemps[i].success,
				time: this.parseDate(data.attemps[i].time)
			});
		}
		return log;
	},


	/**********************************************************************************************/
	parseDate: function (jsonDate) {
		var ticks = parseInt(jsonDate.match(/\d+/g)[0]);
		var date = new Date(ticks);

		var hh = date.getHours();
		var mm = date.getMinutes();
		if (hh < 10) hh = "0" + hh;
		if (mm < 10) mm = "0" + mm;

		return date.toDateString() + '  ' + hh + ':' + mm;
	},

	/**********************************************************************************************/
	loadGridData: function () {


		Ext.Ajax.request({
			url: "/Default/LoadBuilderLog",
			async: false,
			method: "GET",
			success: function (response, opts) {
				this.data = this.transformBuilderLog(response.responseText);
			}.bind(this),
			failure: function (response, opts) {
				//console.log(response.responseText);
			}
		});

		this.dataStore = Ext.create('Ext.data.Store', {
			model: 'BuilderLogModel',
			data: this.data
		});

		this.reconfigureGrid();
	},



	/**********************************************************************************************/
	reconfigureGrid: function () {
		this.gridPanel.reconfigure(this.dataStore, [
				{
					text: 'Application name1',
					dataIndex: 'repository',
					width: 200
				},
				{
					text: 'Last build attempt',
					dataIndex: 'time',
					width: 200
				},
				{
					text: 'Errors',
					dataIndex: 'message',
					flex: 0.9,
				},
				{
					text: 'Success',
					dataIndex: 'success',
					flex: 0.2,
					hidden: true,
				}
		]);
	}
});