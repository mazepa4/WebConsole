/**************************************************************************************************
*** Viewport
**************************************************************************************************/
Ext.onReady(function () {


	Ext.QuickTips.init();
	Ext.state.Manager.setProvider(new Ext.state.CookieProvider());

/*
	var panel = Ext.create("Ext.panel.Console", {
		height: '100%',
		layout: {
			type: 'vbox',
			align: 'stretch'
		},
		cls: 'no-selection'
	});
//*/
//	var panel = Ext.create("Ext.panel.Panel", {
//		height: '100%',
//		layout: {
//			type: 'vbox',
//			align: 'stretch'
//		},
//		cls: 'no-selection'
//	});



	//var panel = Ext.create("Ext.TabControl", {
	//	height: '100%',
	//	layout: {
	//		type: 'vbox',
	//		align: 'stretch'
	//	},
	//	cls: 'no-selection'
	//});
	
	var panel1 = Ext.create("Ext.AttachmentWindow", {
		height: '100%',
		width: "100%",
		//layout: 'fit',
		
		flex: 1,
		//cls: 'no-selection'
	});
	

	var viewport = Ext.create("Ext.Viewport", {
		id: "siteRoot",
		xtype: 'layout-center',
		capture: true,
		layout: 'center',
		items: [panel1],
		autoDestroy: false,
	});
});