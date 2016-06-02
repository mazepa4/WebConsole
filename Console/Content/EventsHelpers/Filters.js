Ext.define('ComboBoxStorageModel', {
	extend: 'Ext.data.Model',
	fields: [
			{ name: 'text', type: 'string' },
	]
});

//Filters control definition
Ext.define("Ext.FilterPanel", {
	extend: "Ext.panel.Panel",
	xtype: "filterPanel",

	cls: "filters-panel",

	emitters: null,
	ipList: null,
	msgTypes: null,
	lastMessagetime: 0,

	//declare form items ID's
	from_date: null,
	to_date: null, 
	emTagField: null,
	clearEmTagsBtn: null,
	ipTagField: null,
	clearIpTagsBtn: null,
	msgTypeTagField: null,
	clearMsgTypesTagElId: null,
	minPrElId: null,
	maxPrElId: null,
	titleElId: null,
	addTitleBtn: null,
	titlesTagField: null,
	clearTitlesTagsBtn: null,
	textElId: null,
	addTextBtn: null,
	textsTagField: null,
	clearTextsTagsBtn: null,
	haveattachments: null,
	emittersStore: [],
	ipAddrStore: [],
	msgTypeStore: [],
	border: false,
	dateFrom: 0,
	dateTo: 0,
	margin: 0,
	layout: {
		type: 'vbox',
		align: 'stretch'
	},
	
	filterEditorPanel: null,
	filtersViewPanel:null,

	serviceLog:null,

	dateFromDefaultView:null,
	dateToDefaultView:null,

	layoutId: 0,
	
	revDateLabel:null,
	msgTypesLabel:null,
	emittersLabel: null,
	ipLabel:null,
	titleLabel:null,
	textLabel:null,
	prLabel:null,
	attchLabel: null,

	filters: {},

	/**********************************************************************************************/
	constructor: function () {

		this.initEditorView();
		this.initQuickView();
		Ext.apply(arguments[0],
		{
			layout:'card',
			activeItem: 1,
			border: false,
			items:[{
				layout: {
					type: 'vbox',
					align: 'stretch'
				},
				bodyStyle: {
					background: '#EDEDED',
					padding: "3px"
				},
				margin:0,
				items:this.filterEditorPanel
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
				items: this.filtersViewPanel
			}]
		});
		this.callParent(arguments);

		this.on("afterrender", function () {
		
			this.serviceLog = Ext.getCmp('servicelogTabId');
			this.from_date = Ext.getCmp("from_date");
			this.to_date = Ext.getCmp("to_date");
			this.emTagField = Ext.getCmp("emTagField");
			this.ipTagField = Ext.getCmp("ipTagField");
			this.msgTypeTagField = Ext.getCmp("msgTypeTagField");
			this.minPrElId = Ext.getCmp("minPrId");
			this.maxPrElId = Ext.getCmp("maxPrId");
			this.titleElId = Ext.getCmp("titleElId");
			this.textElId = Ext.getCmp("textElId");

			this.textElId.on("change", this.onChange.bind(this));
			this.titleElId.on("change", this.onChange.bind(this));
			
			Ext.getCmp("clearFromDate").on("click", this.onClearFromDate.bind(this));
			Ext.getCmp("clearToDate").on("click", this.onClearToDate.bind(this));

			this.clearEmTagsBtn = Ext.getCmp("clearEmTagsBtn");
			this.clearEmTagsBtn.on("click", this.onClearEmTags.bind(this));

			this.clearIpTagsBtn = Ext.getCmp("clearIpTagsBtn");
			this.clearIpTagsBtn.on("click", this.onClearIpTags.bind(this));


			this.clearMsgTypeTagsBtn = Ext.getCmp("clearMsgTypeTagsBtn");
			this.clearMsgTypeTagsBtn.on("click", this.onClearMsgTypesTags.bind(this));

			Ext.getCmp("clearMinPr").on("click", this.onClearMinPriorTags.bind(this));
			Ext.getCmp("clearMaxPr").on("click", this.onClearMaxPriorTags.bind(this));
			Ext.getCmp("clearAttach").on("click", this.onClearAttachTags.bind(this));

			this.haveattachments = Ext.getCmp("haveattachments");
			var emData = [
							{ text: "Yes" },
							{ text: "No" }];

			var store = Ext.create('Ext.data.Store', {
				fields: ['text'],
				data: emData
			});

			this.haveattachments.bindStore(store);
			this.haveattachments.on("change", this.onChange.bind(this));


			this.revDateLabel=Ext.getCmp("revDateLabel");
			this.msgTypesLabel=Ext.getCmp("msgTypesLabel");
			this.emittersLabel = Ext.getCmp("emittersLabel");
			this.ipLabel=Ext.getCmp("ipLabel");
			this.titleLabel=Ext.getCmp("titleLabel");
			this.textLabel = Ext.getCmp("textLabel");
			this.prLabel = Ext.getCmp("prLabel");
			this.attchLabel=Ext.getCmp("attchLabel");

			Ext.getCmp("applyChangesBtn").on("click", this.onApplyFiltersChanges.bind(this));
			Ext.getCmp("resetFilters").on("click", this.onResetFilters.bind(this));
			Ext.getCmp("nextlayout").on("click", this.onLightLayout.bind(this));
			Ext.getCmp("moreView").on("click", this.onExtendLayout.bind(this));
		});
	},
	
	/**********************************************************************************************/
	onClearMinPriorTags: function () {
		this.minPrElId.setValue(0);
		this.filters = this.getConfigData();
	},

	/**********************************************************************************************/
	onClearMaxPriorTags: function () {
		this.maxPrElId.setValue(0);
		this.filters = this.getConfigData();
	},

	/**********************************************************************************************/
	onClearAttachTags: function () {
		this.haveattachments.setValue("No");
		this.filters = this.getConfigData();
	},
	
	/**********************************************************************************************/
	onExtendLayout: function () {
		var layout = this.getLayout();
		layout.setActiveItem(0);
		this.fireEventArgs("updateTreeSize", []);
	},
	
	/**********************************************************************************************/
	onLightLayout: function () {
		var layout = this.getLayout();
		layout.setActiveItem(1);
		this.fireEventArgs("updateTreeSize", []);
	},

	/************************************************************************************************/
	initQuickView: function () {
		this.filtersViewPanel = [
		{
			xtype: 'panel',
			flex: 1,
			border: false,
			bodyStyle: {
				background: '#EDEDED',
				padding: '0px'
			},
			margin: "0 0 3 0",
			layout: "hbox",
			height:"auto",
			items: [
			{
				xtype: 'panel',
				border: false,
				bodyStyle: {
					background: '#EDEDED',
				},
				width:"auto",
				layout: {
					type: 'vbox',
					defaultMargins: { top: 0, right: 0, bottom: 0, left: 0 },
					padding: '0px'
				},
				items: [
				{
					border: false,
					bodyStyle: {
						background: '#EDEDED',
						padding: '0px'
					},
					layout: "vbox",
					margin: "5 10 0 5",
					width: "auto",
					items: [
					{
						layout: 'column',
						width: "auto",
						border: false,
						bodyStyle: {
							background: '#EDEDED',
						},
						items: [
							{
								xtype: "label",
								text: "Revision date range:",
								margin: "0 3 5 0",
							},{
								xtype: "label",
								text: "not set",
								id: "revDateLabel",
								margin: "0 0 5 0",
								cls: "quick-filter-value"
							}
						]
					},	{
						layout: 'column',
						width: "auto",
						border: false,
						bodyStyle: {
							background: '#EDEDED',
						},
						items: [
							{
								xtype: "label",
								text: "Message types:",
								margin: "0 3 5 0",
							},{
								xtype: "label",
								text: "not set",
								id: "msgTypesLabel",
								margin: "0 0 5 0",
								cls: "quick-filter-value"
							}
						]
					}]
				}]
			}, {
				xtype: 'tbseparator',
				border: 1,
				style: {
					borderColor: '#C5D5EA',
					borderStyle: 'solid'
				},
				margin: "5 5 0 5",
				height: 33
			},{
				border: false,
				bodyStyle: {
					background: '#EDEDED',
					padding: '0px'
				},
				layout: "vbox",
				margin: "5 10 0 5",
				width: "auto",
				items: [{
					layout: 'column',
					width: "auto",
					border: false,
					bodyStyle: {
						background: '#EDEDED',
					},
					items: [
						{
							xtype: "label",
							text: "Emitters:",
							margin: "0 3 5 0",
						},{
							xtype: "label",
							text: "not set",
							id: "emittersLabel",
							margin: "0 0 5 0",
							cls: "quick-filter-value"
						}
					]
				},{
					layout: 'column',
					width: "auto",
					border: false,
					bodyStyle: {
						background: '#EDEDED',
					},
					items: [
						{
							xtype: "label",
							text: "IP's:",
							margin: "0 3 5 0",
						},{
							xtype: "label",
							text: "not set",
							id: "ipLabel",
							margin: "0 0 5 0",
							cls: "quick-filter-value"
						}
					]
				}]
			}, {
				xtype: 'tbseparator',
				border: 1,
				style: {
					borderColor: '#C5D5EA',
					borderStyle: 'solid'
				},
				margin: "5 5 0 5",
				height: 33
			}, {
				border: false,
				bodyStyle: {
					background: '#EDEDED',
					padding: '0px'
				},
				layout: "vbox",
				margin: "5 10 0 5",
				width: "auto",
				items: [{
					layout: 'column',
					width: "auto",
					border: false,
					bodyStyle: {
						background: '#EDEDED',
					},
					items: [
						{
							xtype: "label",
							text: "Titles match:",
							margin: "0 3 5 0",
						},{
							xtype: "label",
							text: "not set",
							id: "titleLabel",
							margin: "0 0 5 0",
							cls: "quick-filter-value"
						}
					]
				},{
					layout: 'column',
					width: "auto",
					border: false,
					bodyStyle: {
						background: '#EDEDED',
					},
					items: [
						{
							xtype: "label",
							text: "Texts match:",
							margin: "0 3 5 0",
						},{
							xtype: "label",
							text: "not set",
							id: "textLabel",
							margin: "0 0 5 0",
							cls: "quick-filter-value"
						}
					]
				}]
			},{
				xtype: 'tbseparator',
				border: 1,
				style: {
					borderColor: '#C5D5EA',
					borderStyle: 'solid'
				},
				margin: "5 5 0 5",
				height: 33
			},{
				border: false,
				bodyStyle: {
					background: '#EDEDED',
					padding: '0px'
				},
				layout: "vbox",
				margin: "5 10 0 5",
				width: "auto",
				items: [{
					layout: 'column',
					width: "auto",
					border: false,
					bodyStyle: {
						background: '#EDEDED',
					},
					items: [
						{
							xtype: "label",
							text: "Events priority:",
							margin: "0 3 5 0",
						},{
							xtype: "label",
							text: "not set",
							id: "prLabel",
							margin: "0 0 5 0",
							cls: "quick-filter-value"
						}
					]
				},{
					layout: 'column',
					width: "auto",
					border: false,
					bodyStyle: {
						background: '#EDEDED',
					},
					items: [
						{
							xtype: "label",
							text: "Attachments availability:",
							margin: "0 3 5 0",
						},{
							xtype: "label",
							text: "not set",
							id: "attchLabel",
							margin: "0 0 5 0",
							cls: "quick-filter-value"
						}
					]
				}]
			},{
				xtype: 'tbseparator',
				border: 1,
				style: {
					borderColor: '#C5D5EA',
					borderStyle: 'solid'
				},
				margin: "5 5 0 5",
				height: 33
			}, Ext.apply({
				xtype: 'button',
				id: "moreView",
				margin: "5 0 0 0",
				text: "Change filters",
				iconCls: "setting-icon",
				cls: "my-button",
				border: true,
				scale: "medium",
				width: 120,
				tooltip: "Show another panel with filters"
			})]
		}];
	},

	/************************************************************************************************/
	initEditorView: function () {
		this.filterEditorPanel = 
			[
				{
					xtype: 'panel',
					flex: 1,
					border: false,
					bodyStyle: {
						background: '#EDEDED',
						padding: '0px'
					},
					margin: "0 0 0 0",
					layout: "hbox",
					items: [
						{
							xtype: 'fieldset',
							flex: 1,
							height: "auto",
							bodyStyle: {
								background: '#EDEDED',
								padding: '10px'
							},
							defaults: {
								labelWidth: 89,
								anchor: '100%',
								layout: {
									type: 'hbox',
								}
							},
							margin: "0 3 3 2",
							items: [
								{
									border: false,
									bodyStyle: {
										background: '#EDEDED',
										padding: '0px'
									},
									layout: "hbox",
									margin: "0 10 0 0",
									width: "auto",
									items: [
										{
											layout: 'vbox',
											border: false,
											margin: "5 5 0 0",
											width: "auto",
											bodyStyle: {
												background: '#EDEDED',
											},
											items: [
												{
													layout: 'column',
													width: "auto",
													border: false,
													bodyStyle: {
														background: '#EDEDED',
													},
													items: [
														{
															xtype: 'datefield',
															fieldLabel: 'Date from',
															id: 'from_date',
															allowNull: true,
															defaultValue:null,
															labelWidth: 60,

															width: 200,
															margin: "0 5 15 0",
															editable: false,
															//value: new Date() // limited to the current date or prior
														}, Ext.apply({
															xtype: 'button',
															ui: "default-toolbar",
															id: "clearFromDate",
															iconCls: "clearTagsFilterBtn",
															width: 26,
															height: 26,
															tooltip: 'Clear from date filter.'
														})
													]
												}, {
													layout: 'column',
													width:"auto",
													border: false,
													bodyStyle: {
														background: '#EDEDED',
													},
													items: [
														{
															xtype: 'datefield',
															fieldLabel: 'Date to',
															editable: false,
															id: 'to_date',
															width: 200,
															allowNull: true,
															defaultValue: null,
															//value: new Date(),
															//maxValue: new Date(new Date().getTime()),  // defaults to today
															margin: "0 5 0 0",
															labelWidth: 60,
														}, Ext.apply({
															xtype: 'button',
															ui: "default-toolbar",
															id: "clearToDate",
															iconCls: "clearTagsFilterBtn",
															width: 26,
															height: 26,
															tooltip: 'Clear until date filter'
														})
													]
												},
											]

										}, {
											xtype: 'tbseparator',
											border: 1,
											style: {
												borderColor: '#C5D5EA',
												borderStyle: 'solid'
											},
											height: 110
										}, {
											layout: 'vbox',
											border: false,
											margin: "5 7 0 7",
											width: "auto",
											bodyStyle: {
												background: '#EDEDED',
											},
											items: [
												{
													layout: 'column',
													border: false,
													margin: "0 0 10 0",
													bodyStyle: {
														background: '#EDEDED',
													},
													items: [
														Ext.apply({
															xtype: 'tagfield',
															id: "emTagField",
															fieldLabel: 'Emitters',
															labelWidth: 45,
															emptyText: 'Select emitters',
															valueField: 'text',
															//editable:false,
															filterPickList: true,
															queryMode: 'local',
															publishes: 'value',
															hideTrigger: true,
															width: 200,
															margin: "2 5 0 0",
															//grow:true,
														}),
														Ext.apply({
															xtype: 'button',
															ui: "default-toolbar",
															id: "clearEmTagsBtn",
															iconCls: "clearTagsFilterBtn",
															width: 26,
															height: 26,
															tooltip: 'Clear tags filter'
														})
													]
												},
											]
										}, {
											xtype: 'tbseparator',
											border: 1,
											style: {
												borderColor: '#C5D5EA',
												borderStyle: 'solid'
											},
											height: 110
										}, {
											layout: 'vbox',
											border: false,
											margin: "5 7 0 7",
											width: "auto",
											bodyStyle: {
												background: '#EDEDED',
											},
											items: [
												{
													layout: 'column',
													border: false,
													margin: "0 0 0 0",
													width: "auto",
													bodyStyle: {
														background: '#EDEDED',
													},
													items: [
														Ext.apply({
															xtype: 'tagfield',
															id: "ipTagField",
															fieldLabel: 'IP',
															labelWidth: 20,
															emptyText: 'Select IP addresses',
															margin: "2 5 0 0",
															valueField: 'text',
															filterPickList: true,
															queryMode: 'local',
															publishes: 'value',
															hideTrigger: true,
															//editable:false,
															width: 150,
														}),
														Ext.apply({
															xtype: 'button',
															ui: "default-toolbar",
															id: "clearIpTagsBtn",
															iconCls: "clearTagsFilterBtn",
															width: 26,
															height: 26,
															tooltip: 'Clear tags filter'
														})
													]
												}
											]
										},{
											xtype: 'tbseparator',
											border: 1,
											style: {
												borderColor: '#C5D5EA',
												borderStyle: 'solid'
											},
											height: 110
										}, {
											layout: 'column',
											border: false,
											margin: "10 7 0 7",
											width: "auto",
											bodyStyle: {
												background: '#EDEDED',
											},
											items: [
												Ext.apply({
													xtype: 'tagfield',
													id: "msgTypeTagField",
													fieldLabel: 'Message types',
													labelWidth: 60,
													emptyText: 'Select message type',
													valueField: 'text',
													filterPickList: true,
													queryMode: 'local',
													publishes: 'value',
													hideTrigger: true,
													width: 200,
													//editable:false,
													margin: "0 5 3 0",
												}),
												Ext.apply({
													xtype: 'button',
													ui: "default-toolbar",
													id: "clearMsgTypeTagsBtn",
													iconCls: "clearTagsFilterBtn",
													width: 26,
													height: 26,
													tooltip: 'Clear tags filter'
												})
											]
										}, {
											xtype: 'tbseparator',
											border: 1,
											style: {
												borderColor: '#C5D5EA',
												borderStyle: 'solid'
											},
											height: 110
										}, {
											layout: 'vbox',
											border: false,
											margin: "5 7 0 7",
											minWidth: 160,
											maxWidth: 160,
											bodyStyle: {
												background: '#EDEDED',
											},
											items: [
												{
													layout: 'column',
													border: false,
													margin: "0 0 0 0",
													bodyStyle: {
														background: '#EDEDED',
													},
													
													items: [
														{
															xtype: 'numberfield',
															name: 'minPriority',
															id: "minPrId",
															fieldLabel: 'Min priority',
															labelWidth: 67,
															value: 0,
															margin: "0 -153 0 0",
															maxValue: 50000,
															minValue: 0,
															size: 30,
															triggerWrapCls: "custom-trigger-wrap"

														},{
															xtype: 'button',
															ui: "default-toolbar",
															id: "clearMinPr",
															iconCls: "clearTagsFilterBtn",
															width: 26,
															height: 26,
															margin: "0 0 0 0",
															tooltip: 'Clear value'
														}
													]
												}, {
													layout: 'column',
													border: false,
													margin: "10 0 0 0",
													bodyStyle: {
														background: '#EDEDED',
													},
													items: [
														{
															xtype: 'numberfield',
															name: 'maxPriority',
															id: "maxPrId",
															fieldLabel: 'Max priority',
															labelWidth: 67,
															value: 0,
															maxValue: 50000,
															minValue: 0,
															size: 30,
															margin: "0	0 0 0",
															triggerWrapCls: "custom-trigger-wrap"
														}, {
															xtype: 'button',
															ui: "default-toolbar",
															id: "clearMaxPr",
															iconCls: "clearTagsFilterBtn",
															acivated: false,
															margin: "0 0 0 -153",
															width: 26,
															height: 26,
															tooltip: 'Clear value'
														}
													]
												},{
													layout: 'column',
													border: false,
													margin: "5 0 0 0",
													bodyStyle: {
														background: '#EDEDED',
													},
													items: [
														{
															xtype: 'combobox',
															id: "haveattachments",
															fieldLabel: 'Attachments availability',
															labelWidth: 67,
															emptyText: '',
															displayField: 'text',
															filterPickList: true,
															queryMode: 'local',
															width: 132,
															margin: "0 0 0 0",
															editable: false,
															hideTrigger: false,
														}, {
															xtype: 'button',
															ui: "default-toolbar",
															id: "clearAttach",
															iconCls: "clearTagsFilterBtn",
															margin: "3 0 0 2",
															width: 26,
															height: 26,
															tooltip: 'Clear value'
														}
													]
												}
											]
										}, {
											xtype: 'tbseparator',
											border: 1,
											style: {
												borderColor: '#C5D5EA',
												borderStyle: 'solid'
											},
											height: 110
										}, {
											xtype: "panel",
											layout: "vbox",
											margin: "10 0 0 0",
											bodyStyle: {
												background: '#EDEDED',
											},
											border: false,
											items: [
												{
													layout: 'column',
													border: false,
													margin: "0 15 0 5",
													bodyStyle: {
														background: '#EDEDED',
													},
													items: [
														{
															xtype: 'textfield',
															name: 'title',
															id: "titleElId",
															fieldLabel: 'Title',
															labelWidth: 30,
															width: 300,
															allowBlank: true // requires a non-empty value
														},
														Ext.apply({
															xtype: 'button',
															id: "clearTitleBtn",
															ui: "default-toolbar",
															iconCls: "clearTagsFilterBtn",
															margin: "1 0 0 5",
															width: 26,
															height: 26,
															tooltip: 'Clear value'
														})
													]
												}, {
													xtype: "panel",
													layout: "column",
													margin: "10 0 0 5",
													bodyStyle: {
														background: '#EDEDED',
													},
													border: false,
													items: [
														{
															xtype: 'textfield',
															name: 'text',
															id: "textElId",
															fieldLabel: 'Text',
															labelWidth: 30,
															width: 300,
															margin: "0 0 0 0",
															allowBlank: true // requires a non-empty value
														},
														Ext.apply({
															xtype: 'button',
															id: "clearTextBtn",
															ui: "default-toolbar",
															iconCls: "clearTagsFilterBtn",
															width: 26,
															height: 26,
															margin: "0 0 0 5",
															tooltip: 'Clear value'
														})
													]
												}
											]
										}
									]
								}, {
									border: false,
									bodyStyle: {
										background: '#EDEDED',
										padding: '0px'
									},
									layout: "hbox",
									margin: "0 10 0 0",
									width: "auto",
									items: [
										//place here second control's row
									]

								}
							]
						}
					]
				}, {
					xtype: 'panel',
					height: "auto",
					width: "100%",
					border: false,
					layout: {
						type: 'vbox',
						align: 'middle'
					},
					bodyStyle: {
						background: '#EDEDED'
					},
					margin: 0,
					items: [
						{
							border: false,
							bodyStyle: {
								background: '#EDEDED',
								padding:"2 2 2 2"
							},
							items: [
								Ext.apply({
									xtype: 'button',
									id: "applyChangesBtn",
									iconCls: "apply-filters-icon",
									text: "Apply filters ",
									border: true,
									tooltip: 'Apply filters and refresh view',
									margin: "2 4 2 2",
									scale: 'medium',
								}),
								Ext.apply({
									xtype: 'button',
									id: "resetFilters",
									iconCls: "reset-filters-icon",
									text: "Reset filters",
									cls: "my-button",
									border: true,
									margin: "2 4 2 2",
									scale: 'medium',
									width: 110,
									tooltip: 'Reset filters and refresh view'
								}),Ext.apply({
									xtype: 'button',
									id: "nextlayout",
									iconCls: "close-icon",
									text: "Close filters",
									cls: "my-button",
									border: true,
									scale: "medium",
									width: 110,
									margin: "2 4 2 2",
									tooltip: "Show another panel with filters"
								})
							]
						}
					],
				}
			];
	},

	/************************************************************************************************/
	onResetFilters: function () {
		if(this.checkForChanges()==true){
			this.from_date.setConfig("value", "null");
			this.dateFrom = 0;
			this.to_date.setConfig("value", "null");
			this.dateTo = 0;

			this.emTagField.clearValue();
			this.ipTagField.clearValue();
			this.msgTypeTagField.setValue(null);
			this.titleElId.setValue("");
			this.textElId.setValue("");
			this.minPrElId.setValue(0);
			this.maxPrElId.setValue(0);
			this.haveattachments.setValue("No");

			this.filters = this.getConfigData();

			this.setCookie("filtersData", JSON.stringify(this.filters), 99);
			this.fireEventArgs("RefreshView", [4]);
	}
	},

	/************************************************************************************************/
	setTitle: function () {
		this.titleElId.setValue("");
		this.filters = this.getConfigData();
	},

	/************************************************************************************************/
	setText: function () {
		this.textElId.setValue("");
		this.filters = this.getConfigData();
	},

	/************************************************************************************************/
	onClearEmTags: function () {
		this.emTagField.clearValue();
		this.filters = this.getConfigData();
	},

	/***********************************************************************************************/
	onClearFromDate:function() {
		this.from_date.setConfig("value", "null");
		this.dateFrom = 0;
		this.filters = this.getConfigData();
	},

	/***********************************************************************************************/
	onClearToDate: function () {
		this.to_date.setConfig("value", "null");
		this.dateTo = 0;//.setValue(new Date(0));
		this.filters = this.getConfigData();
	},

	/***********************************************************************************************/
	onClearIpTags: function () {
		this.ipTagField.clearValue();
		this.filters = this.getConfigData();
	},

	/***********************************************************************************************/
	onClearMsgTypesTags: function () {
		this.msgTypeTagField.setValue(null);
		this.filters = this.getConfigData();
	},

	/***********************************************************************************************/
	onClearTextstags: function () {
		this.textsTagField.clearValue();
		this.filters = this.getConfigData();
	},

	/************************************************************************************************/
	onChange: function (scope, newValue, oldValue, eOpts) {
		//update coockies
		if (this.serviceLog.eventWorker.afterStart == true)
			this.filters = this.getConfigData();
	},

	/************************************************************************************************/
	onDateFromChange: function (scope, newValue, oldValue, eOpts) {
		//update coockies
		if (this.from_date.value != undefined) {
			if (this.from_date.getValue().getTime() > 0)
				this.dateFrom = this.from_date.getValue().getTime();
			else
				this.dateFrom = 0;
		}
		this.filters = this.getConfigData();
	},

	/************************************************************************************************/
	onDateToChange: function (scope, newValue, oldValue, eOpts) {
		//update coockies
		if (this.to_date.value != undefined) {
			if (this.to_date.getValue().getTime() > 0)
				this.dateTo = this.to_date.getValue().getTime();
			else
				this.dateTo = 0;
		}
		this.filters = this.getConfigData();
	},

	/************************************************************************************************/
	onApplyFiltersChanges: function () {
		//alert("OK");
		if(this.checkForChanges()==true){
			this.setCookie("filtersData", JSON.stringify(this.filters), 99);
			this.lastMessagetime = 0;
			this.fireEventArgs("RefreshView",[4]);
		}
	},

	/************************************************************************************************/
	saveQuickFilters: function (decodedData) {
		
		var revDateLabel = "not set";
		var msgTypesLabel = "not set";
		var emLabel = "not set";
		var ipLabel = "not set";
		var titleLabel = "not set";
		var textLabel = "not set";
		var prLabel = "not set";
		var attchLabel = "not set";

		if (decodedData.filters != null) {
		
			//setup dates view
			if (decodedData.filters.deliveryTimeStart == 0 && decodedData.filters.deliveryTimeEnd != 0) {
				var date = new Date(decodedData.filters.deliveryTimeEnd);
				revDateLabel = "to " + date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate();
			} else if (decodedData.filters.deliveryTimeStart != 0 && decodedData.filters.deliveryTimeEnd == 0) {
				var date = new Date(decodedData.filters.deliveryTimeStart);
				revDateLabel = "from " + date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate();
			} else if (decodedData.filtersdeliveryTimeStart != 0 && decodedData.filters.deliveryTimeEnd != 0) {
				var dateFrom = new Date(decodedData.filters.deliveryTimeStart);
				var dateTo = new Date(decodedData.filters.deliveryTimeEnd);
				var strFrom = dateFrom.getFullYear() + "/" + (dateFrom.getMonth() + 1) + "/" + dateFrom.getDate();
				var strTo = dateTo.getFullYear() + "/" + (dateTo.getMonth() + 1) + "/" + dateTo.getDate();
				revDateLabel = strFrom + " - " + strTo;
			}

			var msgTypes = [];
			//setup message types view
			for (var i = 0; i < decodedData.filters.messageTypes.length; i++) {

				if (this.isNumeric(decodedData.filters.messageTypes[i]) == true)

					msgTypes.push(this.getMessageType(decodedData.filters.messageTypes[i]));
				else msgTypes.push(decodedData.filters.messageTypes[i]);
			}
			if (msgTypes.length > 0) {

				msgTypesLabel = msgTypes.toString().replace(",", ", ");
			}

			var selectedEmitters = [];
			for (var j = 0; j < decodedData.filters.emitterIdList.length; j++) {
				var emitter = decodedData.filters.emitterIdList[j];
				if (this.isNumeric(emitter) == true) {
					var name = this.emitters[emitter];
					selectedEmitters.push(name);
				} else {
					selectedEmitters = decodedData.filters.emitterIdList;
					break;
				}
			}
			if (selectedEmitters.length > 0) {
				emLabel = selectedEmitters.toString();
				emLabel=emLabel.replace(',', ', ');
			}

			var selectedIp = [];
			//setup IP label
			for(var i=0;i<decodedData.filters.emitterIpList.length;i++) {
				var ip = decodedData.filters.emitterIpList[i];
				if (this.isNumeric(emitter) == true) {
					selectedIp.push(this.ipList[ip]);
				} else {
					selectedIp.push(ip);
				}
			}
			if (selectedIp.length > 0) {
				ipLabel = selectedIp.toString().replace(",", ", ");
			}

			//setup title and text label
			if (decodedData.filters.titleMatch != "")
				titleLabel = decodedData.filters.titleMatch;
			if (decodedData.filters.textMatch != "")
				textLabel = decodedData.filters.textMatch;

			//setup priority
			if (decodedData.filters.priorityMin == 0 && decodedData.filters.priorityMax != 0) {
				prLabel = "up to " + decodedData.filters.priorityMax;
			} else if (decodedData.filters.priorityMin != 0 && decodedData.filters.priorityMax == 0) {
				prLabel = "from " + decodedData.filters.priorityMin;
			} else if (decodedData.filters.priorityMin != 0 && decodedData.filters.priorityMax != 0) {
				prLabel = decodedData.filters.priorityMin + " - " + decodedData.filters.priorityMax;
			}


			var haveAttch = (decodedData.filters.mustHaveAttachments == true ? "Yes" : "No");
			attchLabel = haveAttch;
			
			this.revDateLabel.el.setText(revDateLabel);
			this.msgTypesLabel.el.setText(msgTypesLabel);
			this.emittersLabel.el.setText(emLabel);
			this.ipLabel.el.setText(ipLabel);
			this.titleLabel.el.setText(titleLabel);
			this.textLabel.el.setText(textLabel);
			this.prLabel.el.setText(prLabel);
			this.attchLabel.el.setText(attchLabel);
		}
	},

	/************************************************************************************************/
	loadConfigFromCoockie: function () {
		
		if (this.serviceLog.eventWorker.afterStart==false) {
			this.from_date.on("change", this.onDateFromChange.bind(this));
			this.to_date.on("change", this.onDateToChange.bind(this));
			this.emTagField.on("change", this.onChange.bind(this));
			this.ipTagField.on("change", this.onChange.bind(this));
			this.msgTypeTagField.on("change", this.onChange.bind(this));
			this.minPrElId.on("change", this.onChange.bind(this));
			this.maxPrElId.on("change", this.onChange.bind(this));
			Ext.getCmp("clearTitleBtn").on("click", this.setTitle.bind(this));
			Ext.getCmp("clearTextBtn").on("click", this.setText.bind(this));
		}
		var dataStr = this.getCookie("filtersData");
	
		
		this.msgTypeTagField.store = this.msgTypeStore;
		this.ipTagField.store = this.ipAddrStore;
		this.emTagField.store = this.emittersStore;
		var attchVal = "No";
		this.haveattachments.setValue(attchVal);
		if (dataStr.length > 0) {
			var decodedData = JSON.parse(dataStr);
			
			this.saveQuickFilters(decodedData);
		
			
			this.dateFrom = decodedData.filters.deliveryTimeStart;
			if (this.dateFrom != 0) 
				this.from_date.setValue(new Date(this.dateFrom));

			this.dateTo = decodedData.filters.deliveryTimeEnd;
			if (this.dateTo != 0) 
				this.to_date.setValue(new Date(this.dateTo));

			
			var selectedEmitters = [];
			for (var j = 0; j < decodedData.filters.emitterIdList.length; j++) {
				var emitter = decodedData.filters.emitterIdList[j];
				if (this.isNumeric(emitter) == true) {
					var name = this.emitters[emitter];
					if (name == undefined) {
						//this.setCookie("filtersData", '{"filters":{"ticks":{"start":0,"end":0},"emitters":{"filtered":[]},"IPs":{"filtered":[]},"priority":{"min":0,"max":0},"msgTypes":{"filtered":[]},"title":"","text":"","attachments":false}}', 10);
					}
					else
						selectedEmitters.push(name);
				} else {
					selectedEmitters = decodedData.filters.emitters.filtered;
					break;
				}
			}
			
			this.emTagField.setValue(selectedEmitters);

			var selectedIP = [];
			for (var j = 0; j < decodedData.filters.emitterIpList.length; j++) {
				var ip = decodedData.filters.emitterIpList[j];
				if (this.isNumeric(ip) == true) {
					var name = this.ipList[ip];
					selectedIP.push(name);
				} else {
					selectedIP = decodedData.filters.emitterIpList;
					break;
				}
			}
			this.ipTagField.setValue(selectedIP);

			var selectedMsgTypes = [];
			for (var j = 0; j < decodedData.filters.messageTypes.length; j++) {
				var msgTypes = decodedData.filters.messageTypes[j];
				if (this.isNumeric(msgTypes) == true) {
					var name = this.getMessageType(msgTypes);
					selectedMsgTypes.push(name);
				} else {
					selectedMsgTypes = decodedData.filters.messageTypes;
					break;
				}
			}
			this.msgTypeTagField.setValue(selectedMsgTypes);

			this.minPrElId.setValue(decodedData.filters.priorityMin);
			this.maxPrElId.setValue(decodedData.filters.priorityMax);

			this.titleElId.setValue(decodedData.filters.titleMatch);

			this.textElId.setValue(decodedData.filters.textMatch);

			attchVal = "No";
			if (decodedData.filters.mustHaveAttachments == true)
				attchVal = "Yes";
			this.haveattachments.setValue(attchVal);
		}
	},

	/************************************************************************************************/
	getConfigData: function () {

		var emitterIdList = [];
		var emitterIpList = [];
		
		var selectedMsgTypes = this.msgTypeTagField.getValue();
		var selectedIp = this.ipTagField.getValue();
		var selectedEmitters = this.emTagField.getValue();

		var mesageTypes = [];
		for (var i = 0; i < selectedMsgTypes.length; i++) {
			mesageTypes.push(this.getMessageTypeId(selectedMsgTypes[i]));
			//mesageType = mesageType | this.getMessageTypeId(selectedMsgTypes[i]);
		}

		for (var i = 0; i < selectedIp.length; i++) {
			emitterIpList.push(this.dot2num(selectedIp[i]));
		}

		for (var i = 0; i < selectedEmitters.length; i++) {
			emitterIdList.push(this.getEmitterId(selectedEmitters[i]));
		}

		var haveAttch = (this.haveattachments.getValue() == "Yes" ? true : false);

		var filters = {};
		filters['deliveryTimeStart'] = this.dateFrom;//this.lastMessagetime + 1;
		filters['deliveryTimeEnd'] = this.dateTo;
		filters['emitterIdList'] = emitterIdList;
		filters['emitterIpList'] = emitterIpList;
		filters['messageTypes'] = mesageTypes;
		filters['priorityMin'] = this.minPrElId.getValue();
		filters['priorityMax'] = this.maxPrElId.getValue();
		filters['titleMatch'] = this.titleElId.getValue();
		filters['textMatch'] = this.textElId.getValue();
		filters['mustHaveAttachments'] = haveAttch;

		var resultobject = {};

		resultobject["filters"] = filters;
		return resultobject; //return JSON.stringify(data);
	},
	
	/************************************************************************************************/
	setCookie: function (cname, cvalue, exdays) {
		var d = new Date();
		d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
		var expires = "expires=" + d.toUTCString();
		document.cookie = cname + "=" + cvalue + "; " + expires + "path=/ExtendedView";
		var decodedData = JSON.parse(cvalue);
		this.saveQuickFilters(decodedData);
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
	getConfigs: function (emitters) {

		if (this.emitters == undefined && emitters!=undefined)
			this.emitters = emitters;

		var filterData = this.getCookie("filtersData");
		var emitterIdList = [];
		var emitterIpList = [];
		var mesageType = 0;
		var priorityMin = 0;
		var priorityMax = 0;
		var title = "";
		var text = "";
		var attachments = false;
		var timeStart = 0;
		var timeEnd = 0;
		if (filterData.length > 0) {

			var data = JSON.parse(filterData);
			var filteredEmittersNames = data.filters.emitters.filtered;
			timeStart = data.filters.ticks.start;
			timeEnd = data.filters.ticks.end;
			
			for (var i = 0; i < filteredEmittersNames.length; i++) {
				var id = this.getEmitterId(filteredEmittersNames[i]);
				if (id != undefined)
					emitterIdList.push(id);
				else {
					var emitter = filteredEmittersNames[i];
					if (this.isNumeric(emitter) == true) {
						emitterIdList.push(emitter);
					}
				}
			}
			
			for (var i = 0; i < data.filters.IPs.filtered.length; i++) {
				emitterIpList.push(this.dot2num(data.filters.IPs.filtered[i]));
			}
			
			var messageTypes = {};
			var list = [];

			for (var i = 0; i < data.filters.msgTypes.filtered.length; i++) {
				list.push(this.getMessageTypeId(data.filters.msgTypes.filtered[i]));
				mesageType = mesageType | this.getMessageTypeId(data.filters.msgTypes.filtered[i]);
			}
			messageTypes['list'] = list;
			messageTypes['value'] = mesageType;

			priorityMin = data.filters.priority.min;
			priorityMax = data.filters.priority.max;

			title = data.filters.title;
			text = data.filters.text;

			attachments = data.filters.attachments;
		}
		var filters = {};
		filters['deliveryTimeStart'] = timeStart;//this.lastMessagetime + 1;
		filters['deliveryTimeEnd'] = timeEnd;
		filters['emitterIdList'] = emitterIdList;
		filters['emitterIpList'] = emitterIpList;
		filters['messageTypes'] = mesageType;
		filters['priorityMin'] = priorityMin;
		filters['priorityMax'] = priorityMax;
		filters['titleMatch'] = title;
		filters['textMatch'] = text;
		filters['mustHaveAttachments'] = attachments;

		var resultobject = {};

		resultobject["filters"] = filters;
	
		return JSON.stringify(resultobject, '\n', null);
	},

	/**********************************************************************************************/
	isNumeric:function(n) {
	  return !isNaN(parseFloat(n)) && isFinite(n);
	},

	/**********************************************************************************************/
	getMessageType: function (value) {
		return this.serviceLog.eventWorker.msgTypesMap[value];
	},

	/**********************************************************************************************/
	getMessageTypeId: function (value) {
		
		for (var key in this.serviceLog.eventWorker.msgTypesMap) {
			if (this.serviceLog.eventWorker.msgTypesMap[key] == value) {
				return key;
			}
		}
		return 4294967295;
	},

	/**********************************************************************************************/
	getEmitterName: function (emId) {
		var name = this.emitters[id];
		return name;
	},

	/**********************************************************************************************/
	getEmitterId: function (emName) {

		for (var key in this.emitters) {
			if (this.emitters[key] == emName) {
				return key;
			}
		}
		return undefined;
	},

	/**********************************************************************************************/
	dot2num: function (dot) {
		var d = dot.split('.');
		var part1 = parseInt(d[3]) * 16777216;
		var part2 = parseInt(d[2]) * 65536;
		var part3 = parseInt(d[1]) * 256;
		var part4 = parseInt(d[0]);
		return part1 + part2 + part3 + part4;
	},

	/**********************************************************************************************/
	num2dot: function (num) {
		var d = num % 256;
		for (var i = 3; i > 0; i--) {
			num = Math.floor(num / 256);
			d = d + '.' + num % 256;
		}
		return d;
	},

	/************************************************************************************************/
	initComponents: function () {

	},

	/************************************************************************************************/
	setUpComponents: function (emitters, ipList, msgTypes, lastMessagetime,specUdate) {

		var performanceFrom = performance.now();
		this.filters = this.getConfigData();
		this.msgTypes = msgTypes;
		this.ipList = ipList;
		var emData = [];

		for (var key in emitters) {	
			emData.push([emitters[key]]);
		}

		this.emittersStore = Ext.create('Ext.data.ArrayStore', {
			model: "ComboBoxStorageModel",
			data: emData
		});

		emData = [];
		for (var key in ipList) {
			emData.push([ipList[key]]);
		}

		this.ipAddrStore = Ext.create('Ext.data.ArrayStore', {
			model: "ComboBoxStorageModel",
			data: emData
		});
	
		if (specUdate == true) {
			this.ipTagField.store = this.ipAddrStore;//.bindStore(this.ipAddrStore);
			this.emTagField.store = this.emittersStore;//.bindStore(this.emittersStore);
		} else {

			var emData = [["Info"], ["Warning"], ["Error"], ["Crash"]];

			this.msgTypeStore = Ext.create('Ext.data.ArrayStore', {
				model: "ComboBoxStorageModel",
				data: emData
			});

			this.dateFromDefaultView = this.from_date;
			this.dateToDefaultView = this.to_date;

			this.lastMessagetime = lastMessagetime + 1;
			this.emitters = emitters;
			
			this.loadConfigFromCoockie();
		}
	},

	/**********************************************************************************************/
	getNumByIP: function(value) {
		for (var key in this.ipList) {
			if (this.ipList[key] == value) {
				return key;
			}
		}
		return undefined;
	},

	/**********************************************************************************************/
	fixDate: function (value) {
		if (value < 10) value = "0" + value;
		return value;
	},

	/**********************************************************************************************/
	checkForChanges:function(){
		var curFilters = this.getConfigData();
		var coockieData	= this.getCookie("filtersData");
		if(coockieData != ""){
			var savedFilters=JSON.parse(coockieData);
			if(savedFilters.filters.deliveryTimeEnd != curFilters.filters.deliveryTimeEnd)
				return true;
			if(savedFilters.filters.deliveryTimeStart != curFilters.filters.deliveryTimeStart)
				return true;
			if(savedFilters.filters.mustHaveAttachments != curFilters.filters.mustHaveAttachments)
				return true;
			if(savedFilters.filters.priorityMax != curFilters.filters.priorityMax)
				return true;
			if(savedFilters.filters.priorityMin != curFilters.filters.priorityMin)
				return true;	
			if(savedFilters.filters.textMatch != curFilters.filters.textMatch)
				return true;
			if(savedFilters.filters.titleMatch != curFilters.filters.titleMatch)
				return true;

			var savedArr = savedFilters.filters.emitterIdList.sort();
			var currArr = curFilters.filters.emitterIdList.sort();
			if(this.isArrayEqual(savedArr,currArr)==false)
				return true;

			savedArr = savedFilters.filters.emitterIpList.sort();
			currArr = curFilters.filters.emitterIpList.sort();
			if(this.isArrayEqual(savedArr,currArr)==false)
				return true;

			savedArr = savedFilters.filters.messageTypes.sort();
			currArr = curFilters.filters.messageTypes.sort();
			if(this.isArrayEqual(savedArr,currArr)==false)
				return true;

			return false;
		}else
			return true;
	},

	/**********************************************************************************************/
	isArrayEqual:function(arr1,arr2){
		if(arr1.length != arr2.length)
			return false;
		else{
			for(var i=0;i<arr1.length;i++){
				if(arr1[i]!=arr2[i])
					return false;
			}
			return true;
		}
	}

});