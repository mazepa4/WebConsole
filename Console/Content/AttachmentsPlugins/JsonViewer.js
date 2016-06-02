/**************************************************************************************************
*** JsonModel
**************************************************************************************************/
Ext.define('JsonModel', {
	extend: 'Ext.data.TreeModel',
	//extend: 'Ext.data.Model',
	fields: [
		{ name: 'text', type: 'string' },
	],
});



Ext.define("Ext.JsonViewer", {
	extend: "Ext.panel.Panel",
	xtype: "jsonViewer",
	requires: [
		'Ext.data.*',
		'Ext.tree.*',
	],

	bodyEl: null,

	mousePressTimer: null,
	curposition: 0,
	data: [],
	rootDomEl: null,
	attachId: "",
	previewMode: false,
	treeEl: null,
	loadingMask: null,
	timer: null,
	targetEl: null,
	from: 0,

	/**********************************************************************************************/
	constructor: function ()
	{

		this.attachId = arguments[0].attachId;
		this.previewMode = arguments[0].previewMode;

		Ext.apply(arguments[0], {
			items: [
			, {
				 	id: "treeElId" + this.attachId +"-"+ this.previewMode,
				 	xtype: "treepanel",
					autoHeight: false,
				 	scroll: false,
					viewConfig: {
						style: { overflowY: 'visible', overflowX: 'hidden' }
					},
					forceFit: true,
					autoScroll: true,
					border: false,
					useArrows: true,
					height: '100%',
					cls:"tree-scroll",
					rootVisible: false,
					dockedItems: {
						xtype: 'toolbar',
						padding: 0,
						dock: "top",
						items: [{
							xtype: "panel",
							layout: "hbox",
							id: "controlPanel" + this.attachId + "-"+ this.previewMode,
							border: false,
							margin: "5 0 0 0",
							items: [
								{
									xtype: "button",
									text: "Collapse All",
									margin: "0 5 0 0",
									id: "colElId" + this.attachId + "-" + this.previewMode,
								}, {
									xtype: "button",
									text: "Expand All",
									margin: "0 5 0 0",
									id: "expElId" + this.attachId + "-" + this.previewMode,
								}]
						},'->'
						]
					}
				}
			]
		});
		this.callParent(arguments);

		this.on("afterrender", function ()
		{
			

			this.treeEl = Ext.getCmp("treeElId" + this.attachId +"-"+ this.previewMode);
			var parent = this.treeEl.parentNode;

			if (this.previewMode == true)
				Ext.getCmp("controlPanel" + this.attachId + "-"+ this.previewMode).hide();

			
			

			
			this.on("activate", this.onActivate.bind(this));
		});
	},

	/**********************************************************************************************/
	onResize: function (width, height, oldWidth, oldHeight) {
		if (this.previewMode == false)
			this.treeEl.setHeight(this.getHeight());
	},

	/**********************************************************************************************/
	setupData: function (json)
	{
		var i = 0;
		try
		{
			var inputObject = JSON.parse(json);
			
			if (this.previewMode == true)
				inputObject = inputObject.slice(0, 2);

			if (this.previewMode == true) {
				var leaf = this.json2leaf(inputObject);
				var root = {
					text: 'Root',
					expanded: true,
					children: leaf
				};
				this.treeEl.setRootNode(root);

				if (this.previewMode == true)
					this.treeEl.expandAll();
			}
			else if (this.previewMode == false) {

				this.on("resize", this.onResize.bind(this));
				this.loadingMask = new Ext.LoadMask({ msg: "Please wait...", target: this.findParentByType("window") });
				this.loadingMask.show();
				this.from = performance.now();

				setTimeout(function (inputObject) {
					var leaf = this.json2leaf(inputObject);
					var root = {
						text: 'Root',
						expanded: true,
						children: leaf
					};
					this.treeEl.setRootNode(root);
					this.loadingMask.hide();
				}.bind(this), 800, inputObject);
			}
		} catch (error)
		{
			console.log("Failed to display JSON document. Exception: " + error);
			this.treeEl.update("<div style='margin:auto;' ><b>Failed to display JSON document</b></div>");
		}
	},

	/**********************************************************************************************/
	onActivate: function (action, filterAction)
	{

	},

	/**********************************************************************************************/
	json2leaf: function (json) {
	var ret = [];
	for (var i in json) {
		if (json.hasOwnProperty(i)) {
			if (json[i] === null) {
				ret.push({ text: "<b>" + i + "</b>" + ' : null', leaf: true, /*iconCls: 'red.gif' */ });
			} else if (typeof json[i] === 'string') {
				ret.push({ text: "<b>"+i+"</b>"+ ' : "' + json[i] + '"', leaf: true, /*icon: 'blue.gif'*/ });
			} else if (typeof json[i] === 'number') {
				ret.push({ text: "<b>" + i + "</b>" + ' : ' + json[i], leaf: true,/* icon: 'green.gif' */ });
			} else if (typeof json[i] === 'boolean') {
				ret.push({ text: "<b>" + i + "</b>" + ' : ' + (json[i] ? 'true' : 'false'), leaf: true,/* icon: 'yellow.gif'*/ });
			} else if (typeof json[i] === 'object') {
				ret.push({ text: "<b>" + i + "</b>", children: this.json2leaf(json[i]),/* icon: Ext.isArray(json[i]) ? 'array.gif' : 'object.gif'*/ });
			} else if (typeof json[i] === 'function') {
				ret.push({ text: "<b>" + i + "</b>" + ' : function', leaf: true,/* icon: 'red.gif'*/ });
			}
		}
	}
	return ret;
},
});