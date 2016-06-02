///-------------------------------------------------------------------------------
Ext.define("PagingToolbar", {
	extend: "Ext.toolbar.Toolbar",
	xtype: 'pagingToolbar',
	layout: {
		type: 'hbox',
		align: 'center',
		pack: 'center'
	},
	currentPageIndex: 0,
	itemsOnPage: 0,
	step: 0,
	count: 0,

	statusTextLabel: null,
	pageIndexLabel: null,
	statusTextMetrics: null,
	pageLeftButton: null,
	pageRightButton: null,
	pageFirstButton: null,
	pageLastButton: null,

	itemsPerPage: 0,
	itemsCount: 0,
	pageIndex: 0,
	pageCount: 0,
	treeGridObject: null,
	msgCountEl: null,
	updatePeriodEl: null,
	pageCountLabelEl: null,
	afterColdStart:false,

	statusText: "1-10 of 3654",//null

	///-------------------------------------------------------------------------------
	constructor: function () {
		this.count = arguments[0].count;
		this.shift = arguments[0].shift;
		this.step = arguments[0].step;
		this.currentPageIndex = 0;


		if (arguments[0].itemsOnPage == null)
			arguments[0].itemsOnPage = 250;

		Ext.apply(arguments[0], {
			items: [
			   {
				xtype: 'button',
				id: "pageFirstButton",
				width: 35,
				height: 25,
				text: '<<',
				style: {
					borderColor: '#b5b8c8',
					borderStyle: 'solid'
				},
				cls: "page-nav-button"
			   }, ' ', {
				xtype: 'button',
				id: "pageLeftButton",
				width: 35,
				height:25,
				text: '<',
				style: {
					borderColor: '#b5b8c8',
					borderStyle: 'solid'
				},
				cls: "page-nav-button"
			   }, ' ', {
				xtype: 'label',
				text: 'Page: ',
				cls: "quick-filter-value"
			   }, ' ',
				{
					xtype: 'numberfield',
					id: "pageLabelId",
					anchor: '100%',
					allowDecimals: true,
					enableKeyEvents:true,
					value: 0,
					width: 70,
					minValue: 0,
					//maxValue: 0,
					hideTrigger: true
				}, ' ',{
					xtype: 'label',
					id: "pageCountLabelId",
					text: "of N",
					cls: "quick-filter-value"
				}, ' ',{
					xtype: 'button',
					id: "pageRightButton",
					width: 35,
					height: 25,
					style: {
						borderColor: '#b5b8c8',
						borderStyle: 'solid'
					},
					text: '>',
					cls: "page-nav-button"
				}, ' ', {
					xtype: 'button',
					id: "pageLastButton",
					width: 35,
					height: 25,
					style: {
						borderColor: '#b5b8c8',
						borderStyle: 'solid'
					},
					text: '>>',
					cls: "page-nav-button",
					margin: "0 2 0 0",
				}, ' ',{
					xtype: 'label',
					text:"View "+ this.statusText,//'info',
					id: "statusLabelId",
					cls: "quick-filter-value"
				}, ' ',{
					xtype: 'tbseparator',
					border: 1,
					height: 20,
					style: {
						borderColor: '#C5D5EA',
						borderStyle: 'solid'
					},
					margin: "0 0 0 2",
				}, ' ', {
					xtype: 'label',
					text: 'Show rows:',
					margin: "0 1 0 2",
				}, ' ',
				{
					xtype: 'combobox',
					id: "msgCountElId2",
					emptyText: '',
					displayField: 'text',
					filterPickList: true,
					queryMode: 'local',
					width: 80,//125
					padding: "0px",
					editable: false,
					hideTrigger: false,
					margin: "0 5 0 0",
				}, ' ', {
					xtype: 'label',
					text: 'Update period: '
				}, ' ', {
					xtype: 'combobox',
					id: "updatePeriodElId2",
					emptyText: '',
					displayField: 'text',
					filterPickList: true,
					queryMode: 'local',
					width: 70,
					padding: "0px",
					editable: false,
					hideTrigger: false,
					margin: "0 0 0 2",
				}
			]

		});

		this.callParent(arguments);

		this.on("afterrender", function () {
			this.pageIndexLabel = Ext.getCmp("pageLabelId");
			this.pageIndexLabel.on("keydown", this.onKeyDown.bind(this));
			this.statusTextLabel = Ext.getCmp("statusLabelId");
			this.pageCountLabelEl = Ext.getCmp("pageCountLabelId");

			this.pageLeftButton = Ext.getCmp("pageLeftButton");
			this.pageLeftButton.on("click", this.onPageLeft.bind(this));

			this.pageRightButton = Ext.getCmp("pageRightButton");
			this.pageRightButton.on("click", this.onPageRight.bind(this));

			this.pageFirstButton = Ext.getCmp("pageFirstButton");
			this.pageFirstButton.on("click", this.onPageFirst.bind(this));

			this.pageLastButton = Ext.getCmp("pageLastButton");
			this.pageLastButton.on("click", this.onPageLast.bind(this));

			var emData = [
					{ text: "1000" },
					{ text: "5000" },
					{ text: "10000" },
					{ text: "25000" },
					{ text: "50000" },
					{ text: "Fit to page" }];

			var store = Ext.create('Ext.data.Store', {
				fields: ['text'],
				data: emData
			});

			this.msgCountEl = Ext.getCmp("msgCountElId2");
			this.msgCountEl.on("change", this.onChangeMesageCount.bind(this));
			this.msgCountEl.bindStore(store);
			//


			emData = [
				{ text: "5 sec." },
				{ text: "30 sec." },
				{ text: "1 min." },
				{ text: "5 min." },
				{ text: "10 min" },
				{ text: "30 min" }];

			store = Ext.create('Ext.data.Store', {
				fields: ['text'],
				data: emData
			});

			this.updatePeriodEl = Ext.getCmp("updatePeriodElId2");
			this.updatePeriodEl.on("change", this.onChangeConfig.bind(this));
			this.updatePeriodEl.bindStore(store);
			
			if (this.statusTextLabel) {
				var labelElement = this.statusTextLabel.getEl();
				this.statusTextMetrics = new Ext.util.TextMetrics(labelElement);
				this.statusTextMetrics.el.dom.top = "5";
			}
		}.bind(this));
	},

	///-------------------------------------------------------------------------------
	initialSetup:function(data) {
		this.msgCountEl.setValue(data.config.messageCount);
		this.updatePeriodEl.setValue(data.config.updatePeriod);
	},

	///-------------------------------------------------------------------------------
	onPageLeft: function () {
		if (this.pageIndex > 0) {
			this.pageIndex--;
			this.updatePageIndexLabel();
			this.updateRender(true,true);
		}
	},

	///-------------------------------------------------------------------------------
	onPageRight: function () {
		if (this.pageIndex < this.pageCount - 1) {
			this.pageIndex++;
			this.updatePageIndexLabel();
			this.updateRender(true,true);
		}
	},

	///-------------------------------------------------------------------------------
	onPageLast: function () {
		this.pageIndex = this.pageCount - 1;
		this.updatePageIndexLabel();
		this.updateRender(true,true);
	},

	///-------------------------------------------------------------------------------
	onPageFirst: function () {
		this.pageIndex = 0;
		this.updatePageIndexLabel();
		this.updateRender(true,true);
	},

	///-------------------------------------------------------------------------------
	scrollToFirstPage: function (update) {
		if (this.pageIndex != 0) {
			this.pageIndex = 0;
			this.updatePageIndexLabel();
			if (update) {
				this.updateRender(true);
			}
		}
	},

	///-------------------------------------------------------------------------------
	updateLabel: function () {
		var statusTextWidth = this.statusTextMetrics.getWidth("View "+this.statusText);

		this.statusTextLabel.setWidth(statusTextWidth);
		this.statusTextLabel.getEl().setHtml("View "+this.statusText);
	},

	///-------------------------------------------------------------------------------
	updatePageIndexLabel: function () {
		this.pageIndexLabel.setValue((this.pageIndex+1));
	},

	///-------------------------------------------------------------------------------
	scrollToLastPage: function (update) {
		if (this.pageIndex != this.pageCount - 1) {
			this.pageIndex = this.pageCount - 1;
			console.log("New page:" + this.pageIndex);
			this.pageIndexLabel.setValue(this.pageIndex+1);
			if (update) {
				console.log("New page:" + this.pageIndex);
				this.updateRender(true);
			}
		}
	},

	///-------------------------------------------------------------------------------
	onKeyDown: function (scope, event, eOpts) {
		var keyCode = event.event.keyCode;

		switch (keyCode) {
			case 27:
				this.updatePageIndexLabel();
				break;

			case 13:
				if (this.pageIndexLabel.getValue().toString().indexOf("e") < 0) {
					var value = this.pageIndexLabel.getValue();
					var page = 0;
					if (value > this.pageCount)
						page = this.pageCount - 1;
					else if (value <= 0)
						page = 0;
					else page = value - 1;
			
					if (this.pageIndex ==0 && page == 0)
						this.updatePageIndexLabel();

					if (this.pageIndex != page) {
						this.pageIndex = page;
						this.updatePageIndexLabel();
						this.updateRender(true,true);
					}
				}
				break;
		}
	},

	///-------------------------------------------------------------------------------
	updateRender: function (update, pageNav, newPage) {
		var skip = this.pageIndex * this.itemsPerPage;
		var limit = Math.min(this.itemsPerPage, this.itemsCount - skip);

		this.statusText = (this.itemsCount == 0 ? 0 : skip + 1).toString() + "-" + (skip + limit).toString() + " of " + this.itemsCount.toString();
		this.updateLabel();
		if (update) {
			var buttonStates = {};

			if (this.pageCount <= 1) {
				buttonStates.left = true;
				buttonStates.right = true;
				buttonStates.first = true;
				buttonStates.last = true;
			} else {
				if (this.pageIndex == 0) {
					buttonStates.left = true;
					buttonStates.right = false;
					buttonStates.first = true;
					buttonStates.last = false;
				} else if (this.pageIndex == this.pageCount - 1) {
					buttonStates.left = false;
					buttonStates.right = true;
					buttonStates.first = false;
					buttonStates.last = true;
				} else {
					buttonStates.left = false;
					buttonStates.right = false;
					buttonStates.first = false;
					buttonStates.last = false;
				}
			}

			if (this.pageLeftButton) {
				this.pageLeftButton.setDisabled(buttonStates.left);
			}
			if (this.pageRightButton) {
				this.pageRightButton.setDisabled(buttonStates.right);
			}
			if (this.pageFirstButton) {
				this.pageFirstButton.setDisabled(buttonStates.first);
			}
			if (this.pageLastButton) {
				this.pageLastButton.setDisabled(buttonStates.last);
			}
			this.fireEventArgs("Show", [skip, limit, pageNav, newPage]);
		}
	},

	///-------------------------------------------------------------------------------
	setItemsPerPage: function (itemsPerPage, update) {
		if (this.itemsPerPage != itemsPerPage) {
			this.itemsPerPage = itemsPerPage;

			this.pageCount = this.itemsCount == 0 ? 1 : Math.ceil(Math.max(this.itemsCount / this.itemsPerPage, 1));
			//this.pageCountLabelEl.setText("of " + this.pageCount);

			if (this.pageIndex > this.pageCount - 1) {
				this.pageIndex = this.pageCount - 1;
			}
			this.updatePageIndexLabel();

			if (update) {
				this.updateRender(true);
			}
		}
	},

	///-------------------------------------------------------------------------------
	setItemsCount: function (itemsCount, update,key) {
		
		if (this.itemsCount != itemsCount) {
			this.itemsCount = itemsCount;
		}
		if (this.itemsPerPage == 0) {
				this.itemsPerPage = 1;
			}

		this.pageCount = this.itemsCount == 0 ? 1 : Math.ceil(Math.max(this.itemsCount / this.itemsPerPage, 1));
		
		if (this.pageIndex > this.pageCount - 1) {
			this.pageIndex = this.pageCount - 1;
		}
		this.pageCountLabelEl.setText("of " + this.pageCount);

		var newPage = false;
		if (key == 3) {
			newPage = true;
			this.pageIndex = this.pageCount - 1;
			this.updatePageIndexLabel();
		}
		
		this.updateRender(update,false, newPage);
	},

	///-------------------------------------------------------------------------------
	onChangeConfig: function () {
		this.setItemsPerPage(this.msgCountEl.getValue(), false);
		this.setCookie("config", this.getConfigData(), 10);
		if (this.afterColdStart==true)
			this.fireEventArgs("ChangeViewConfig", [this.msgCountEl.getValue()]);
	},

	///-------------------------------------------------------------------------------
	loadScaleData: function (count, shift) {
		var scale = [];

		for (var i = 0; i <= count; i += shift) {
			scale.push({ 'caption': i, 'take': i })
		}
		var scaleData = Ext.create('Ext.data.Store', {
			fields: ['caption', 'take'],
			data: scale
		});

		return scaleData;
	},

	///-------------------------------------------------------------------------------
	onChangeMesageCount: function () {
		this.setCookie("config", this.getConfigData(), 10);
		this.setItemsPerPage(this.msgCountEl.getValue(), this.afterColdStart);
		if (this.afterColdStart==true)
			this.fireEventArgs("ChangeMsgCount", [4]);
	},


	///-------------------------------------------------------------------------------
	getConfigData: function () {

		var count = 0;
		var updatePeriod = this.updatePeriodEl.getValue();
		var messageCount = this.msgCountEl.getValue();

		var config = {};
		config['updatePeriod'] = updatePeriod;
		config["messageCount"] = messageCount;

		var resultobject = {};

		resultobject["config"] = config;

		return JSON.stringify(resultobject, '\n', null);
	},

	//Cookie operation
	///-------------------------------------------------------------------------------
	setCookie: function (cname, cvalue, exdays) {
		var d = new Date();
		d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
		var expires = "expires=" + d.toUTCString();
		document.cookie = cname + "=" + cvalue + "; " + expires + "path=/ExtendedView";
	},
});
