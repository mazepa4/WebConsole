/***************************************************************************************************
*** PagingController
***************************************************************************************************/

Ext.define("PagingController", {
	mixins: ["Ext.mixin.Observable"],
	/*	Events:
		updatePage (skip, limit)
	*/
	pageLeftButton: null,
	pageRightButton: null,
	pageFirstButton: null,
	pageLastButton: null,
	statusTextLabel: null,
	statusTextMetrics: null,
	
	itemsPerPage: 0,
	itemsCount: 0,
	pageIndex: 0,
	pageCount: 0,
	edgePage: false,
	treeGridObject: null,
	readyState:false,

	statusText: "1-10 of 3654",//null,

	/**********************************************************************************************/
	constructor: function (pageLeftButton, pageRightButton, pageFirstButton, pageLastButton, statusTextLabel) {
		this.mixins.observable.constructor.call(this); // call mixins constructor

		this.pageLeftButton = pageLeftButton;
		this.pageRightButton = pageRightButton;
		this.pageFirstButton = pageFirstButton;
		this.pageLastButton = pageLastButton;
		this.statusTextLabel = statusTextLabel;

		if (this.pageLeftButton) {
			this.pageLeftButton.on("click", this.onPageLeft.bind(this));
		}
		if (this.pageRightButton) {
			this.pageRightButton.on("click", this.onPageRight.bind(this));
		}
		if (this.pageFirstButton) {
			this.pageFirstButton.on("click", this.onPageFirst.bind(this));
		}
		if (this.pageLastButton) {
			this.pageLastButton.on("click", this.onPageLast.bind(this));
		}
		if (this.statusTextLabel) {
			var labelElement = this.statusTextLabel.getEl();
		//	labelElement.dom.style.marginTop = "15px";
			labelElement.on("keydown", this.onKeyDown.bind(this));
			labelElement.on("dblclick", this.onStartEdit.bind(this));
			labelElement.on("focusout", this.onCancelEdit.bind(this));
			this.statusTextMetrics = new Ext.util.TextMetrics(labelElement);
			this.statusTextMetrics.el.dom.top = "5";
			//console.log(this.statusTextMetrics);
		}
		this.readyState = true;
	},
	
	/**********************************************************************************************/
	setItemsPerPage: function (itemsPerPage, update) {
		if (this.itemsPerPage != itemsPerPage) {
			this.itemsPerPage = itemsPerPage;

			this.pageCount = this.itemsCount == 0 ? 1 : Math.ceil(Math.max(this.itemsCount / this.itemsPerPage, 1));

			if (this.pageIndex > this.pageCount - 1) {
				this.pageIndex = this.pageCount - 1;
			}
			if (update) {
				this.updateRender();
			}
		}
	
	},

	/**********************************************************************************************/
	setItemsCount: function (itemsCount, update) {
		if (this.itemsCount != itemsCount) {
			this.itemsCount = itemsCount;

			if (this.itemsPerPage == 0) {
				this.itemsPerPage = 1;
			}

			this.pageCount = this.itemsCount == 0 ? 1 : Math.ceil(Math.max(this.itemsCount / this.itemsPerPage, 1));

			if (this.pageIndex > this.pageCount - 1) {
				this.pageIndex = this.pageCount - 1;
			}

			if (update) {
				this.updateRender();
			}
		}
	},

	/**********************************************************************************************/
	updateRender: function () {
		if (this.readyState) {
			var skip = this.pageIndex * this.itemsPerPage;
			var limit = Math.min(this.itemsPerPage, this.itemsCount - skip);

			this.statusText = (this.itemsCount == 0 ? 0 : skip + 1).toString() + "-" + (skip + limit).toString() + " of " + this.itemsCount.toString();
			this.updateLabel();

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
			this.fireEventArgs("Show", [skip, limit]);
		}

	},

	/**********************************************************************************************/
	updateLabel: function () {
		var statusTextWidth = this.statusTextMetrics.getWidth(this.statusText)+5;

		this.statusTextLabel.setWidth(statusTextWidth);
		this.statusTextLabel.getEl().setHtml(this.statusText);
	},

	/**********************************************************************************************/
	scrollToLastPage: function (update) {
		if (this.pageIndex != this.pageCount - 1) {
			this.pageIndex = this.pageCount - 1;

			if (update) {
				this.updateRender();
			}
		}
	},

	/**********************************************************************************************/
	scrollToFirstPage: function (update) {
		if (this.pageIndex != 0) {
			this.pageIndex = 0;

			if (update) {
				this.updateRender();
			}
		}
	},

	/***********************************************************************************************/
	onLastPage: function () {
		this.pageIndex = pageCount-1;
		this.updateRender();
	},

	/**********************************************************************************************/
	onPageLeft: function () {
		if (this.pageIndex > 0) {
			this.pageIndex--;
			this.updateRender();
			this.edgePage = false;
		}
	},

	/**********************************************************************************************/
	onPageRight: function () {
		if (this.pageIndex < this.pageCount - 1) {
			this.pageIndex++;
			this.updateRender();
			this.edgePage = false;
		}
	},

	/**********************************************************************************************/
	onPageFirst: function () {
		this.pageIndex = 0;
		this.updateRender();
	},

	/**********************************************************************************************/
	onPageLast: function () {
		this.pageIndex = this.pageCount - 1;
		this.updateRender();
	},

	/**********************************************************************************************/
	onKeyDown: function (event) {
		var keyCode = event.event.keyCode;

		switch (keyCode) {
			case 27:
				this.onCancelEdit();
				break;

			case 13:
				this.onAcceptEdit();
				break;
		}
	},

	/**********************************************************************************************/
	onStartEdit: function () {
		this.statusTextLabel.getEl().set({ "contenteditable": true });
		this.statusTextLabel.getEl().focus();

		document.execCommand("selectAll", false, null);
	},

	/**********************************************************************************************/
	onAcceptEdit: function () {
		this.statusTextLabel.getEl().set({ "contenteditable": false });

		var text = this.statusTextLabel.getEl().getHtml();
		var itemIndex = this.getPage(text);
		//var itemIndex = parseInt(text);

		if (!isNaN(itemIndex) && itemIndex >= 1 && itemIndex <= this.itemsCount) {
			var pageIndex = Math.floor((itemIndex - 1) / this.itemsPerPage);

			if (this.pageIndex != pageIndex) {
				this.pageIndex = pageIndex;
				this.updateRender();
				return;
			}
		}

		this.updateLabel();
	},

	/**********************************************************************************************/
	onCancelEdit: function () {
		this.statusTextLabel.getEl().set({ "contenteditable": false });
		this.updateLabel();
	},

	/**********************************************************************************************/
	getPage: function (label) {
		var page = -1;
		var tmpStr = "";
		for (var i = 0; i < label.length;i++) {
			var char = label.charAt(i);
			tmpStr = tmpStr + char;
			if (char == "-") {
				try {
					page = parseInt(tmpStr);
					break;
				} catch (exception) {
					console.log(exception);
				}

			}
		}
		return page;
	}



});
