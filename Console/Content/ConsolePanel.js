/**************************************************************************************************
*** Console panel
**************************************************************************************************/
Ext.define("Ext.panel.Console", {
	extend: "Ext.panel.Panel",
	xtype: "consolePanel",
	tabpanel: null,
	topToolbar: null,
	servicenameLabel: null,

	machineName: null,

	/**********************************************************************************************/
	constructor: function () {
		this.callParent(arguments);

		this.on("afterrender", function (panel) {

			this.topToolbar = Ext.create('Ext.toolbar.Toolbar', {
				height: 45,

				items: [
					{
						xtype: 'label',
						text: 'Server status monitor',
						cls: 'title-text-big',
						margin: '0 10 0 10'

					}, '-',
					{
						xtype: 'label',
						id: 'serviceNameLabelId',
						text: '',
						cls: 'title-text-big',
						margin: '0 10 0 10'
					}
				],

				listeners: {
					afterrender: this.onAfterrenderToolbar.bind(this),
				},
				layout: {
					type: 'hbox',
				}
			});


			this.tabpanel = Ext.create('Ext.tab.Panel', {
				layout: 'fit',
				flex: 1,
				items: [
		
					{
						xtype: 'serverStatusTab',
						id: 'serverstatusTabId',
						layout: 'fit',
					},
					{
						xtype: 'serviceLogTab',
						id: 'servicelogTabId',
						layout: {
							type: 'vbox',
							align: 'stretch'
						},
					}
				],
				listeners: {
					afterrender: this.onAfterRenderTabs.bind(this),
					tabchange: this.onTabChange.bind(this)
				},
			});
			this.items.addAll(this.topToolbar, this.tabpanel);

			this.servicenameLabel = Ext.getCmp('serviceNameLabelId');
			this.selectTab();

		});
	},



	/**********************************************************************************************/
	onAfterrenderToolbar: function (toolbar, eOpts) {
		if (this.servicenameLabel.text == '')
			this.servicenameLabel.setText(this.machineName || this.getMachineName());
	},


	/**********************************************************************************************/
	getMachineName: function () {

		//Ext.Ajax.request({
		//	url: "/Console/GetMachineName",
		//	async: false,
		//	method: "GET",
		//	success: function (response, opts) {
		//		this.machineName = response.responseText;
		//	}.bind(this),
		//	failure: function (response, opts) {
		//		//console.log(response.responseText);
		//	}
		//});

		// Build and send the request
		var requestUrl = "/Watcher/GetMachineName";

		var request = new XMLHttpRequest();
		request.open("GET", requestUrl, false);
		request.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
		request.send();
		this.machineName = request.responseText;
		return this.machineName;
	},


	/**********************************************************************************************/
	selectTab: function () {
		var patchParts = window.location.pathname.split('/');
		var tabId = patchParts[patchParts.length - 1].toLowerCase() + 'TabId';

		if (Ext.getCmp(tabId) != null)
			this.tabpanel.setActiveTab(tabId);

	},


	/**********************************************************************************************/
	onTabChange: function (tabPanel, newCard, oldCard, eOpts) {
		switch (newCard.xtype) {
			case 'builderLogTab':
				this.onBuilderLogTabActivation();
				break;
			case 'serviceLogTab':
				this.onServiceLogTabActivation();
				break;
			default:
				this.onServerStatusTabActivation();
				break;
		}
	},


	/**********************************************************************************************/
	onAfterRenderTabs: function (tabPanel, eOpts) {


	},


	/**********************************************************************************************/
	onBuilderLogTabActivation: function () {
		//window.history.pushState(null, null, '/ExtendedView/BuilderLog');
		this.servicenameLabel.setText('Builder Log');
	},


	/**********************************************************************************************/
	onServiceLogTabActivation: function () {
		//window.history.pushState(null, null, '/ExtendedView/ServiceLog');
		this.servicenameLabel.setText('Service Log');
	},

	/**********************************************************************************************/
	onServerStatusTabActivation: function () {
		//window.history.pushState(null, null, '/ExtendedView/ServerStatus');
		this.servicenameLabel.setText(this.machineName || this.getMachineName());
	}
});
