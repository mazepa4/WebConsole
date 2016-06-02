/**************************************************************************************************
*** Scroller E:\Work\Sapiens\Dev\Web\WebConsole\Console\favicon.ico
**************************************************************************************************/
Ext.define("Ext.scroller", {
	extend: "Ext.Component",
	xtype: "scroller",
	statics: {
		DragMode: {
			Scroll: 1,
			LeftResize: 2,
			RightResize: 3,
			ReverseScroll: 4
		}
	},


	// Elements
	canvasElement: null,
	drawingContext: null,
	controlWidth: null,
	controlHeight: null,
	scrollerTop: 8,
	scrollerBottom:10,
	scrollerLeft: 15,
	scrollerHeight: 60,
	scrollerWidth: 100,
	optionScrollerRelativeHeight: 0.9,
	optionBarFillColor: "#d6e3f2",
	dragMode: 0,
	minScrollerSize: 20,
	tmpWidth: 0,
	tmpLeft: 0,

	startTicks: 0,
	endTicks: 0,
	treeGridObject: null,
	serviceLog: null,
	delta: 0,

	allowUpdate: true,
	savedImg: null,
	loadingMask: null,
	edgeWidth:15,
	relVal:0,

	scrollerStartTicks:0,
	scrollerEndTicks:0,


	/**********************************************************************************************/
	constructor: function () {
		this.callParent(arguments);
		this.controlWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)-2;
		this.scrollerWidth = this.controlWidth - 30;

		this.on("afterrender", function () {
			
			this.treeGridObject = Ext.getCmp("treeViewId");

			this.serviceLog = Ext.getCmp('servicelogTabId');
			this.loadingMask = new Ext.LoadMask({ msg: "Please wait...", target: this });
		
			this.on("activate", this.onActivate.bind(this));

			this.canvasElement = this.getEl().createChild({ tag: "canvas" });
			this.drawingContext = this.canvasElement.dom.getContext("2d");
			this.drawingContext.msImageSmoothingEnabled = "smooth";
			this.on("resize", this.onResize.bind(this));

			this.canvasElement.on("dragstart", this.onDragStart.bind(this));
			this.canvasElement.on("drag", this.onDragMove.bind(this));
			this.canvasElement.on("dragend", this.onDragEnd.bind(this));
			this.canvasElement.on("mousemove", this.onMouseMove.bind(this));
			

		});
	},

	/**********************************************************************************************/
	resetScroller:function() {
		this.scrollerWidth = this.controlWidth - this.edgeWidth*2;
		this.scrollerLeft = this.edgeWidth;
	},

	/**********************************************************************************************/
	initScroller: function (startTicks, endTicks) {
		var startDate = new Date(this.scrollerStartTicks / 1000);
		var endDate = new Date(this.scrollerEndTicks / 1000);
		var days = startTicks / (1000 * 60 * 60 * 24);
		var hours = startDate.getHours();// / (1000 * 60 * 60);
		var mins =startDate.getMinutes();
		var secs = startDate.getSeconds();

		this.scrollerStartTicks-= ((hours * 1000 * 60 * 60) + (mins * 1000 * 60) +(secs*1000))*1000;

		hours = endDate.getHours();
		mins = endDate.getMinutes();
		secs = endDate.getSeconds();

		this.scrollerEndTicks+= (((23 - hours) * 1000 * 60 * 60) + ((59 - mins) * 1000 * 60) + ((60 - secs) * 1000))*1000;

		//this.loadingMask.show();

		this.updateDrawingContext(this.scrollerEndTicks - this.scrollerStartTicks);
		this.loadingMask.hide();
	},

	/**********************************************************************************************/
	onMouseMove: function (event) {
		var localX = event.pageX - this.canvasElement.getX();
		var localY = event.pageY - this.canvasElement.getY();
		if (this.dragMode == null || this.dragMode == 0) {
			if ((localX >= (this.scrollerLeft-5) && localX <= (this.scrollerLeft + 5)) &&
			(localY >= this.scrollerTop && localY <= this.scrollerTop + this.scrollerHeight)) {
				this.canvasElement.setStyle('cursor', 'e-resize');
			}
				//on resize scroller from rightside
			else if (localX >= (this.scrollerLeft + this.scrollerWidth - 4) && localX <= (this.scrollerLeft + this.scrollerWidth+5) &&
			(localY >= this.scrollerTop && localY <= this.scrollerTop + this.scrollerHeight)) {
				this.canvasElement.setStyle('cursor', 'e-resize');
			}
				//on draging scroller
			else if (localX >= this.scrollerLeft && localX <= (this.scrollerLeft + this.scrollerWidth) &&
			(localY >= this.scrollerTop && localY <= this.scrollerTop + this.scrollerHeight)) {
				this.canvasElement.setStyle('cursor', 'move');
			} else this.canvasElement.setStyle('cursor', 'default');
		}
	},

	/**********************************************************************************************/
	onResize: function (width, height, oldWidth, oldHeight) {
		if (this.canvasElement) {

			
			this.relVal = width / this.controlWidth;

			this.controlHeight = height;
			this.controlWidth = width;

			this.edgeWidth *= this.relVal;
			this.scrollerWidth *= this.relVal;
			this.scrollerLeft *= this.relVal;
			
			//if (this.controlWidth === this.canvasElement - 30) {
			//	this.scrollerWidth = (this.controlHeight-30) * relVal; //width - 30;
			//} else {
			//	this.scrollerWidth *=relVal;
			//	this.scrollerLeft *= relVal;
			//	//this.scrollerLeft *= relVal;
			//}

			//this.scrollerLeft = this.scrollerLeft / relVal;

			this.scrollerHeight = Math.floor(this.controlHeight-5);
			this.viewerTop = this.scrollerHeight;
			this.viewerHeight = this.controlHeight - this.viewerTop;

			this.canvasElement.setSize(width, height);
			this.canvasElement.dom.width = width;
			this.canvasElement.dom.height = height;
		}
		this.updateDrawingContext();
	},

	/***********************************************************************************************/
	onActivate: function (scope, eOpts) {

		
	},


	/**********************************************************************************************/
	onDragStart: function (event, node, options, eOpts) {

		if (event.parentEvent.altKey === true) return;

		var localX = event.pageX - this.canvasElement.getX() - event.deltaX;
		var localY = event.pageY - this.canvasElement.getY() - event.deltaY;

		//on resize scroller from leftside
		if (localX >= (this.scrollerLeft-5) && localX <= (this.scrollerLeft + 5)) {
			this.dragMode = Ext.scroller.DragMode.LeftResize;
			this.canvasElement.setStyle('cursor', 'e-resize');
			this.tmpWidth = this.scrollerWidth;
			this.dragStart = this.scrollerLeft;
			this.tmpLeft = this.scrollerWidth + this.scrollerLeft;
		}
			//on resize scroller from rightside
		else if (localX >= (this.scrollerLeft + this.scrollerWidth - 5) && localX <= (this.scrollerLeft + this.scrollerWidth+5)) {
			this.dragMode = Ext.scroller.DragMode.RightResize;
			this.canvasElement.setStyle('cursor', 'e-resize');
			this.tmpWidth = this.scrollerWidth;
		}
			//on draging scroller
		else if (localX >= this.scrollerLeft && localX <= (this.scrollerLeft + this.scrollerWidth)) {
			this.dragMode = Ext.scroller.DragMode.Scroll;
			this.canvasElement.setStyle('cursor', 'move');
			this.dragStart = this.scrollerLeft;
		}
		//this.delta = 0;
	},
	/**********************************************************************************************/
	onDrag: function (event) {


	},

	/**********************************************************************************************/
	onDragMove: function (event, node, options, eOpts) {

		var localX = event.pageX - this.canvasElement.getX() - event.deltaX;
		var localY = event.pageY - this.canvasElement.getY() - event.deltaY;
		var delta = event.deltaX;

	//	if (this.scrollerLeft>15 && this.scrollerLeft < this.controlWidth-15) {
	//		if (this.dragMode != Ext.scroller.DragMode.RightResize && event.deltaX > 0)
	//			delta = event.deltaX - 7;
	//		else if (this.dragMode != Ext.scroller.DragMode.RightResize && event.deltaX < 0)
	//			delta = event.deltaX + 7;
	//		else if (this.dragMode != Ext.scroller.DragMode.LeftResize && event.deltaX > 0)
	//			delta = event.deltaX - 7;
	//		else if (this.dragMode != Ext.scroller.DragMode.LeftResize && event.deltaX < 0)
	//			delta = event.deltaX + 7;
	//}

		//on draging scroller
		if ((this.dragMode != null && this.dragMode != 0)) {
			if (this.dragMode == Ext.scroller.DragMode.ReverseScroll) {

			} else {

				this.updateScroll(delta, event);
			}
		}
	},

	/**********************************************************************************************/
	onDragEnd: function (event, node, options, eOpts) {
		if (this.dragStart != 0) {
			this.canvasElement.setStyle('cursor', 'default');
			this.dragStart = this.edgeWidth;//15+
			this.dragMode = null;
			var curWidth=this.controlWidth - this.edgeWidth*2;
			var diff=this.scrollerEndTicks-this.scrollerStartTicks;

			var startTicks=((this.scrollerLeft-this.edgeWidth)/(curWidth))*(diff);
			startTicks=(this.scrollerStartTicks+startTicks);
			console.log(new Date(startTicks/1000));
			var endTicks =((this.scrollerLeft+this.scrollerWidth-this.edgeWidth)/(curWidth))*(diff);
			console.log(new Date((this.scrollerStartTicks+endTicks)/1000));
			this.serviceLog.setScrollerEdges(startTicks,this.scrollerStartTicks+endTicks);
			this.fireEventArgs("RefreshView", [6]);
			//var filters = this.getConfigData();

	//	this.setCookie("filtersData", JSON.stringify(this.filters), 99);
		//this.fireEventArgs("RefreshView", [4]);
			//this.getSelectedValues();
			//this.transferDataToPivotGrid();
			//call function on drawing canvas on messages
		}
	},

	/************************************************************************************************/
	getFiltersData: function () {

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

	/**********************************************************************************************/
	updateDrawingContext: function (delta, event) {
		
		this.drawingContext.clearRect(0, 0, this.controlWidth, this.controlHeight);

		// Draw viewer backgrounds
		this.drawingContext.fillStyle = "#FCFCFC";//"#EDEDED";//"RGB(217,229,243)";//"#AED6D9";
		this.drawingContext.fillRect(0, 0, this.controlWidth, this.controlHeight);

		this.drawingContext.lineWidth = 1;

		//draw scroller section
		var my_gradient = this.drawingContext.createLinearGradient(0, 0, 0, this.scrollerHeight*6);
		my_gradient.addColorStop(0, "white");
		my_gradient.addColorStop(1, "RGB(234,234,234)");
		//this.drawingContext.fillStyle = "#dee9f5";//my_gradient;
	//	this.drawingContext.fillRect(0, this.scrollerTop, this.controlWidth, this.scrollerHeight-this.scrollerBottom);

		// Draw Ticks(top,bottom,messages,msg. detail)
		
		this.drawTicks();
		
		// Draw scroller
		//bottom shadow
		var grd = this.drawingContext.createLinearGradient(0,this.scrollerHeight-this.scrollerBottom+20, 0,this.scrollerHeight-this.scrollerBottom-40);
		grd.addColorStop(1, "RGBA(255,255,255,0.1)");
		grd.addColorStop(0, "RGBA(0,0,0,0.2)");
		this.drawingContext.fillStyle = grd;
		this.drawingContext.fillRect(this.scrollerLeft,this.scrollerTop+this.scrollerHeight-this.scrollerBottom, this.scrollerWidth,-80);

		//top shadow
		var grd1 = this.drawingContext.createLinearGradient(0, 5, 0, 40);
		grd1.addColorStop(0, "RGBA(0,0,0,0.2)");
		grd1.addColorStop(1, "RGBA(255,255,255,0.1)");
		this.drawingContext.fillStyle = grd1;
		this.drawingContext.fillRect(this.scrollerLeft, this.scrollerTop, this.scrollerWidth, this.scrollerHeight-this.scrollerBottom);

		// Draw scroller shadow
		var grd = this.drawingContext.createLinearGradient(this.scrollerLeft + this.scrollerWidth, 0, this.scrollerLeft + this.scrollerWidth+7, 0);
		grd.addColorStop(0, "RGBA(0,0,0,0.4)");
		grd.addColorStop(1, "RGBA(255,255,255,0.05)");
		this.drawingContext.fillStyle = grd;
		this.drawingContext.fillRect(this.scrollerLeft + this.scrollerWidth, this.scrollerTop-2, 10, this.scrollerHeight+4-this.scrollerBottom);

		var grd = this.drawingContext.createLinearGradient(this.scrollerLeft-7, 0, this.scrollerLeft, 0);
		grd.addColorStop(0, "RGBA(255,255,255,0.05)");
		grd.addColorStop(1, "RGBA(0,35,107,0.4)");
		this.drawingContext.fillStyle = grd;
		this.drawingContext.fillRect(this.scrollerLeft -10, this.scrollerTop-2, 10, this.scrollerHeight+4-this.scrollerBottom);

		//draw borders
		this.drawingContext.strokeStyle = "#7194FF";
		//top line
		this.drawingContext.lineWidth = 0.4;
		this.drawingContext.moveTo(0, this.scrollerTop - 1);
		this.drawingContext.lineTo(this.controlWidth, this.scrollerTop - 1);

		//bottom line
		this.drawingContext.moveTo(0, this.scrollerTop + this.scrollerHeight + 1-this.scrollerBottom);
		this.drawingContext.lineTo(this.controlWidth, this.scrollerTop + this.scrollerHeight + 1-this.scrollerBottom);

		this.drawingContext.stroke();

		this.drawingContext.beginPath();
		this.drawingContext.strokeStyle = "RGBA(0,0,0,0.5)";//"RGBA(4,64,140,0.7)";
		//left line
		this.drawingContext.lineWidth = 1;
		this.drawingContext.moveTo(this.scrollerLeft, this.scrollerTop-2);
		this.drawingContext.lineTo(this.scrollerLeft, this.scrollerTop + this.scrollerHeight+2-this.scrollerBottom);
		//right line
		this.drawingContext.moveTo(this.scrollerLeft + this.scrollerWidth, this.scrollerTop-2);
		this.drawingContext.lineTo(this.scrollerLeft + this.scrollerWidth, this.scrollerTop + this.scrollerHeight+2-this.scrollerBottom);
		////bottom line
		this.drawingContext.stroke();

		// Draw scroller
		this.drawingContext.fillStyle = "RGBA(237,239,255,0.15)";
		this.drawingContext.fillRect(this.scrollerLeft,this.scrollerTop-2, this.scrollerWidth,this.scrollerHeight-this.scrollerBottom+4);

	},

	/**********************************************************************************************/
	updateScroll: function (delta, event) {

		switch (this.dragMode) {
			case Ext.scroller.DragMode.ReverseScroll:
				break;

			case Ext.scroller.DragMode.Scroll:

				if (this.scrollerLeft >= this.edgeWidth && (delta != undefined)) {
					this.scrollerLeft = this.dragStart + delta;
				}
				if (this.scrollerLeft < this.edgeWidth)
					this.scrollerLeft = this.edgeWidth;
				if ((this.scrollerLeft + this.scrollerWidth) > this.controlWidth - this.edgeWidth)
					this.scrollerLeft = this.controlWidth - this.scrollerWidth - this.edgeWidth;

				this.updateDrawingContext(delta, event);
				break;

			case Ext.scroller.DragMode.RightResize:
				if ((this.scrollerLeft + (this.tmpWidth + delta)) <= this.controlWidth - this.edgeWidth) {
					if (this.scrollerWidth >= this.minScrollerSize) {
						this.scrollerWidth = this.tmpWidth + delta;
					}
					if (this.scrollerWidth <= this.minScrollerSize) {
						this.scrollerWidth = this.minScrollerSize;
					}
				}
				else this.scrollerWidth = this.controlWidth - this.edgeWidth - this.scrollerLeft;
				this.updateDrawingContext(delta, event);
				break;

			case Ext.scroller.DragMode.LeftResize:
				if (this.scrollerLeft >= this.edgeWidth) {
					this.scrollerWidth = this.tmpWidth - delta;
					this.scrollerLeft = this.dragStart + delta;

					if (this.scrollerWidth < this.minScrollerSize)
						this.scrollerWidth = this.minScrollerSize;

					if ((this.tmpLeft - this.scrollerLeft) <= this.minScrollerSize) {
						this.scrollerLeft = this.tmpLeft - this.scrollerWidth;
					}
					if (this.scrollerLeft <= this.edgeWidth) this.scrollerLeft = this.edgeWidth;
				} else this.scrollerLeft = this.edgeWidth;

				if ((this.scrollerLeft + this.scrollerWidth) != this.tmpLeft)
					this.scrollerWidth = this.tmpLeft - this.scrollerLeft;
				if (this.scrollerWidth < this.minScrollerSize)
					this.scrollerWidth = this.minScrollerSize;

				this.updateDrawingContext(delta, event);
				break;
		}
	},

	/**********************************************************************************************/
	updateScroller: function (from, until) {
		if (from != null)
			this.dateFrom = from;
		if (until != null)
			this.dateTo = until;
		if (this.dateTo != null && this.dateFrom != null) {
			this.updateDrawingContext();
		}
	},

	/**********************************************************************************************/
	daydiff: function (first, second) {
		return (second - first) / (1000 * 60 * 60 * 24);
	},

	/**********************************************************************************************/
	drawTicks: function () {
		this.performDrawingTicks(this.scrollerStartTicks, this.scrollerEndTicks, "bottom");
		//if (this.allowUpdate == true) {
			
			
			//this.savedImg = this.drawingContext.getImageData(this.scrollerTop, 0, this.controlWidth, this.controlHeight);
		//} else {
			//this.drawingContext.putImageData(this.savedImg, this.scrollerTop, 0);;
			//this.drawingContext.fillRect(0, 0, this.controlWidth, this.controlHeight);
		//}
	},

	/**********************************************************************************************/
	getTickDetail: function (diffticks,width) {
		var days = (diffticks / (1000 * 60 * 60 * 24*1000));
		var hours = diffticks / (1000 * 60 * 60);
		var mins = diffticks / (1000 * 60);
		var secs = diffticks / (1000);

		var tickCount = parseInt(width / 47);

		if (days < tickCount) {
			tickCount = days;
		}
		var showFlag = "";
		if (days > 16) {
			showFlag = "D";
			// showDays = true;
			//tickCount = days;
			//if (tickCount > 20)//40
			//	tickCount = 20;
			
		}
		//else if (days <= 16 && days > 1) {
		//	showFlag = "H";
		//	//showHours = true;
		//	tickCount = hours;
		//	if (tickCount > 14)//40
		//		tickCount = 14;
		//}
		//else if (days <= 1 && mins > 25) {//40
		//	showFlag = "MN";
		//	// showMins = true;
		//	tickCount = mins;
		//	if (tickCount > 17)//30
		//		tickCount = 16;
		//}
		//else if (mins <= 40 && secs > 20) {
		//	showFlag = "S";
		//	//showSec = true;
		//	tickCount = secs;
		//	if (tickCount > 13)//20
		//		tickCount = 13;
		//}
		//else if (secs <= 13) {//20
		//	showFlag = "MS";
		//	//showMiliSec = true;
		//	tickCount = secs;
		//	if (tickCount > 10)//30
		//		tickCount = 10;
		//}

		//tickCount = parseInt(width / 40);
		return [showFlag, tickCount];	
	},


	/**********************************************************************************************/
	performDrawingTicks: function (startTime, endTime, place) {
	
		var showDays = false;
		var showHours = false;
		var showMins = false;
		var showSec = false;
		var showMiliSec = false;
		this.drawingContext.font = "normal 10.5px arial";

		var diffticks = endTime - startTime;
		var tickDetail = this.getTickDetail(diffticks, this.controlWidth - 30);

		if (tickDetail[0] == "D") showDays = true;
		if (tickDetail[0] == "H") showHours = true;
		if (tickDetail[0] == "MN") showMins = true;
		if (tickDetail[0] == "S") showSec = true;
		if (tickDetail[0] == "MS") showMiliSec = true;


		var tickCount = tickDetail[1];

		var time = startTime;

		var dayTicks = 1000 *60*60*24;	
		var overalDays = Math.floor(diffticks/dayTicks)+1;		
		var dayShift = Math.floor(overalDays/tickCount);																						
		var tickShift = diffticks / (tickCount);

		var xPos = this.edgeWidth;

		//if (place == "up") {
		//	this.drawingContext.fillStyle = "RGB(219,219,219)";//"#AED6D9";
		//	this.drawingContext.fillRect(0, this.scrollerTop, this.controlWidth, this.scrollerTop + 16);
		//}
		//else if (place == "bottom") {
		//	this.drawingContext.fillStyle = "RGB(219,219,219)";//"#AED6D9";
		//	this.drawingContext.fillRect(0, this.scrollerTop + this.scrollerHeight - 30, this.controlWidth, 30);
		//}
		var prevYear = "";
		var dayAcc = 0;
		for (var i = 0; i <= tickCount; i++) {

			//var date = this.serviceLog.convertTicksToDate(startTime);//new Date(time);
			var date = new Date(time / 1000);
			var label = this.fixDate((date.getMonth() + 1)) + "/" + this.fixDate(date.getDate());
			

			//var label = "";
			//var value = "";

			//var month = "", day = "", hour = "", min = "", sec = "", msec = "";
			//month = date.getMonth() + 1;
			//day = date.getDate();
			//hour = date.getHours();
			//min = date.getMinutes();
			//sec = date.getSeconds();
			//msec = date.getMilliseconds();
			//if (month < 10) month = "0" + month;
			//if (day < 10) day = "0" + day;
			//if (hour < 10) hour = "0" + hour;
			//if (min < 10) min = "0" + min;
			//if (sec < 10) sec = "0" + sec;

			//if (showDays == true) {
			//	label =  " mn:dd";
			//	value = (month) + "/" + day;
			//	if (place == "bottom")
			//		label = (month) + "/" + day + " mn:dd";
			//} else if (showHours == true) {
			//	label = " hh:mm";
			//	value = hour + ":" + min;
			//	if (place == "bottom")
			//		label = hour + ":" + min + " hh:mm";
			//} else if (showMins == true) {
			//	label = " hh:mm";
			//	value = hour + ":" + min;
			//	if (place == "bottom")
			//		label = hour + ":" + min + " hh:mm";
			//} else if (showSec == true) {
			//	label = " mm:ss";
			//	value = min + ":" + sec;
			//	if (place == "bottom")
			//		label = min + ":" + sec + " mm:ss";
			//} else if (showMiliSec == true) {
			//	label = " ss:ms";
			//	value = sec + "." + msec;
			//	if (place == "bottom")
			//		label = sec + "." + msec + " ss:ms";
			//}
			this.drawingContext.shadowColor = "white";
			this.drawingContext.shadowBlur = 1;
			this.drawingContext.shadowOffsetX = 0.1;
			this.drawingContext.shadowOffsetY = 0.1;
			if (place == "up") {
				
				var dashList = [10, 0];
				this.drawingContext.setLineDash(dashList);
				if (xPos <= (this.controlWidth - this.edgeWidth)) {

					this.drawingContext.beginPath();
					this.drawingContext.strokeStyle = "black";
					this.drawingContext.moveTo(xPos, this.scrollerTop + 17);
					this.drawingContext.lineTo(xPos, this.scrollerTop + 25);
					this.drawingContext.stroke();
					//this.drawingContext.shadowColor = 'white';
					//this.drawingContext.shadowBlur = 20;
					//this.drawingContext.shadowOffsetX = 0;
					//this.drawingContext.shadowOffsetY = 2;
					this.drawingContext.fillStyle = "blue";
					this.drawingContext.font = "10.5 arial";
					this.drawingContext.fillText(value, xPos+2, this.scrollerTop+9);
					this.drawingContext.fillText(label, xPos, this.scrollerTop + 18);
					xPos += shift;
					time += tickShift;
				}
			} else if (place == "bottom") {
				if (xPos <= (this.controlWidth) ) {
					this.drawingContext.beginPath();
					this.drawingContext.fillStyle = "grey";
				//	var shift = (this.scrollerLeft+this.scrollerWidth-15) / (tickCount);
					var dashList = [3, 0];
					this.drawingContext.setLineDash(dashList);
					this.drawingContext.strokeStyle = "black";
					this.drawingContext.lineWidth = "0.4";
					this.drawingContext.moveTo(xPos, this.scrollerTop + this.scrollerHeight - 30);
					this.drawingContext.lineTo(xPos, this.scrollerTop + this.scrollerHeight - 22);
					this.drawingContext.stroke();
					this.drawingContext.fillStyle = "#2E00FF";
					//this.drawingContext.fillText(label, xPos+2, this.scrollerTop + this.scrollerHeight - 12);

					/*if (showHours == true)
						this.drawingContext.fillText(label, xPos+2, this.scrollerTop + this.scrollerHeight - 2);
					if (showSec == true)
						this.drawingContext.fillText(label, xPos+2, this.scrollerTop + this.scrollerHeight - 2);
					if (showMins == true)
						this.drawingContext.fillText(((month) + "/" + day) + " mn:dd", xPos+2, this.scrollerTop + this.scrollerHeight - 2);*/
					if(i == 0){
						if(prevYear!=date.getFullYear())
							this.drawingContext.fillText(date.getFullYear(), 1, this.scrollerTop + this.scrollerHeight -this.scrollerBottom-22);
						this.drawingContext.fillText(label, 2, this.scrollerTop + this.scrollerHeight -this.scrollerBottom-1);
					}else if(i == tickCount){
						var pos=this.controlWidth -28;
						var date = new Date(endTime / 1000);
						label = this.fixDate((date.getMonth() + 1)) + "/" + this.fixDate(date.getDate());
						if(prevYear!=date.getFullYear())
							this.drawingContext.fillText(date.getFullYear(), pos, this.scrollerTop + this.scrollerHeight -this.scrollerBottom-22);
						this.drawingContext.fillText(label, pos, this.scrollerTop + this.scrollerHeight -this.scrollerBottom-1);
					}else{
						if(prevYear!=date.getFullYear())
							this.drawingContext.fillText(date.getFullYear(), xPos-13, this.scrollerTop + this.scrollerHeight -this.scrollerBottom-22);
						this.drawingContext.fillText(label, xPos-14, this.scrollerTop + this.scrollerHeight -this.scrollerBottom-1);
					}
					dayAcc += dayShift;
					xPos += (dayShift/overalDays)*(this.controlWidth - this.edgeWidth*2);
					//xPos += shift;
					time += dayShift*dayTicks;

					prevYear = date.getFullYear();
				}
			}
		}
		this.drawingContext.shadowColor = "none";
		this.drawingContext.shadowBlur = 0;
		this.drawingContext.shadowOffsetX = 0;
		this.drawingContext.shadowOffsetY = 0;
		//this.drawingContext.shadowColor = 'white';
		//this.drawingContext.shadowBlur = 0;
		//this.drawingContext.shadowOffsetX = 0;
		//this.drawingContext.shadowOffsetY = 0;
		//var count = 0;
		//var startX = this.scrollerLeft-15;
		//var endX = startX + this.scrollerWidth;

		// 24 * 60 * 60 * 1000,

		//var label = "";
		//if (place == "up" && this.msgData != null) {
			//var tick = (this.controlWidth-30) / (diffticks);
			//var counter = 0;
			//for (var i = 0; i < this.msgData.length; i++) {
				//counter++;
				//var item = this.msgData[i];
				//if (item.childsMessage.length > 0) {
				//	count += 2;
					//draw emiter message
					//draw parent and childs strips

					////draw parent strip
					//var start = (item['messageEmissionTime']);
					//var end = (item.childsMessage[0]['messageEmissionTime']);
					//var startX = (start - startTime) * tick + 16;
					////if (startX < 15) alert("!!!!!!");
					//var endX = (end) * tick;
					//var val1 = 0;

					//if (endX < 1) { //check if length of message>1 px
					//	endX = 1;
					//}
					//if (endX > this.scrollerLeft + this.scrollerWidth)
					//	endX = (end - start) * tick;

					//if (item['messageType'] == '1') {
					//	//draw first level RGB(7,160,255)
					//	this.drawingContext.fillStyle =this.infoColor;
					//	this.drawingContext.fillRect(startX, this.scrollerTop + 27, endX, this.scrollerHeight / 8);
					//} else if (item['messageType'] == '2') {
					//	//draw second level RGB(255,216,79)
					//	this.drawingContext.fillStyle = this.warnColor;
					//	var val1 = this.scrollerTop + 27 + this.scrollerHeight / 8;
					//	this.drawingContext.fillRect(startX, val1 + 1, endX, this.scrollerHeight / 8);
					//} else if (item['messageType'] == '4') {
					//	//draw  third level RGB(255,25,0)
					//	this.drawingContext.fillStyle = this.errColor;
					//	var val1 = 0;
					//	val1 +=(this.scrollerTop) + 27 + (this.scrollerHeight/8) + (this.scrollerHeight/8);
					//	this.drawingContext.fillRect(startX, val1 + 4, endX, this.scrollerHeight / 8);
					//}


					////draw child message(draw dash line)
					//start = (item.childsMessage[0]['messageEmissionTime']);
					//startX = (start - startTime) * tick + 16;

					//this.drawingContext.beginPath();
					//this.drawingContext.lineWidth = 1.5;
					//if (item.childsMessage[0]['messageType'] == '1') {
					//	//draw first level RGB(7,160,255)
					//	this.drawingContext.strokeStyle = this.infoColor;
					//	this.drawingContext.moveTo(startX, this.scrollerTop + 27);
					//	this.drawingContext.lineTo(startX, this.scrollerTop + 27 + 15);
					//}
					//else if (item.childsMessage[0]['messageType'] == '2') {
					//	//draw second level RGB(255,216,79)
					//	this.drawingContext.strokeStyle = this.warnColor;
					//	var val1 = 0;
					//	val1 = this.scrollerTop + 27 + this.scrollerHeight / 8;
					//	this.drawingContext.moveTo(startX, val1);
					//	this.drawingContext.lineTo(startX, val1 + 15);
					//} else if (item.childsMessage[0]['messageType'] == '4') {
					//	//draw  third level RGB(255,25,0)
					//	this.drawingContext.strokeStyle = this.errColor;
					//	//alert("Errorr");
					//	var val1 = 0;
					//	val1 += this.scrollerTop + 27 + this.scrollerHeight / 8 + this.scrollerHeight / 8;
					//	this.drawingContext.moveTo(startX, val1);
					//	this.drawingContext.lineTo(startX, val1 + 15);
					//}
					//this.drawingContext.stroke();

					//draw ordinary message
				//} else {
					//count++;

					////draw ordinary message(draw dash line)
					//var start = (item['messageEmissionTime']);
					//var startX = (start - startTime) * tick + 16;
	
					//this.drawingContext.beginPath();
					//this.drawingContext.lineWidth = 1.5;
					//if (item['messageType'] == '0') {
					//	//draw first level RGB(7,160,255)
					//	this.drawingContext.strokeStyle = "green";
					//	this.drawingContext.moveTo(startX, this.scrollerTop + 27);
					//	this.drawingContext.lineTo(startX, this.scrollerTop + 27 + 15);
					//}
					//else if (item['messageType'] == '1') {
					//	//draw first level RGB(7,160,255)
					//	this.drawingContext.strokeStyle = this.infoColor;
					//	this.drawingContext.moveTo(startX, this.scrollerTop + 27);
					//	this.drawingContext.lineTo(startX, this.scrollerTop + 27 + 15);
					//}
					//else if (item['messageType'] == '2') {
					//	//draw second level RGB(255,216,79)
					//	this.drawingContext.strokeStyle = this.warnColor;
					//	var val1 = 0;
					//	val1 = this.scrollerTop + 27 + this.scrollerHeight / 8;
					//	this.drawingContext.moveTo(startX, val1);
					//	this.drawingContext.lineTo(startX, val1 + 15);
					//} else if (item['messageType'] == '4') {
					//	//draw  third level RGB(255,25,0)
					//	this.drawingContext.strokeStyle = this.errColor;
					//	//alert("Errorr");
					//	var val1 = 0;
					//	val1 += this.scrollerTop + 27 + this.scrollerHeight / 8 + this.scrollerHeight / 8;
					//	this.drawingContext.moveTo(startX, val1);
					//	this.drawingContext.lineTo(startX, val1 + 15);
					//}
					//this.drawingContext.closePath();
					//this.drawingContext.stroke();
				//}
			//}
		//}

	},

	/**********************************************************************************************/
	getSelectedValues: function () {

		var fromTicks = this.dateFrom;
		var untilTicks = this.dateTo;

		// 24 * 60 * 60 * 1000,
		var diffticks = untilTicks - fromTicks;

		var days = (diffticks / (1000 * 60 * 60 * 24)) + 1;
		var hours = diffticks / (1000 * 60 * 60);
		var mins = diffticks / (1000 * 60);
		var secs = diffticks / (1000);

		var tickCount = 0;
		var showDays = false;
		var showHours = false;
		var showMins = false;
		var showSec = false;
		var showMiliSec = false;

		var tickDetail = this.getTickDetail(diffticks);

		if (tickDetail[0] == "D") showDays = true;
		if (tickDetail[0] == "H") showHours = true;
		if (tickDetail[0] == "MN") showMins = true;
		if (tickDetail[0] == "S") showSec = true;
		if (tickDetail[0] == "MS") showMiliSec = true;

		tickCount = tickDetail[1];

		var startX = this.scrollerLeft - this.edgeWidth;
		var endX = startX + this.scrollerWidth;

		// 24 * 60 * 60 * 1000,

		var tick2 = (this.controlWidth-30) / diffticks;
		var label = "";

		this.drawingContext.font = "normal 10.5px arial";
		this.drawingContext.fillStyle = "red";
		this.drawingContext.fillText("Start position=" + (startX) + " px", 15, this.scrollerTop + this.scrollerHeight + 10);
		this.drawingContext.fillText("End position=" + endX + " px", 15, this.scrollerTop + this.scrollerHeight + 21);
		this.drawingContext.fillText("Selection Length=" + (endX - startX) + " px", 15, this.scrollerTop + this.scrollerHeight + 32);

		var startTime = ((startX) / tick2) + fromTicks;
		var endTime = (this.scrollerWidth) / tick2 + startTime;

		label = startTime;
		this.drawingContext.fillText("Start value=" + (label), 160, this.scrollerTop + this.scrollerHeight + 10);

		label = endTime;
		this.drawingContext.fillText("End value=" + label, 160, this.scrollerTop + this.scrollerHeight + 21);

		var date = new Date(startTime);
		label = (date.getHours()) + ":" + date.getMinutes() + ":" + date.getSeconds() + "." + date.getMilliseconds();
		this.drawingContext.fillText("Start value=" + (label), 400, this.scrollerTop + this.scrollerHeight + 10);

		date = new Date(endTime);
		label = (date.getHours()) + ":" + date.getMinutes() + ":" + date.getSeconds() + "." + date.getMilliseconds();
		this.drawingContext.fillText("End value=" + label, 400, this.scrollerTop + this.scrollerHeight + 21);

		//bottom ticks
		this.startTick = startTime;
		this.endTick = endTime;
		this.performDrawingTicks(startTime, endTime, "bottom");
	},


	
	
	/**********************************************************************************************/
	fixDate:function(value) {
		if (value < 10) value = "0" + value;
		return value;
	},

	
	/***********************************************************************************************/
	getDate: function (date) {
		var yy = date.getFullYear().toString();
		var mm = (date.getMonth() + 1).toString(); // getMonth() is zero-based
		if (mm < 10) mm = "0" + mm;
		var dd = date.getDate().toString();
		if (dd < 10) dd = "0" + dd;
		var hour = date.getHours().toString();
		if (hour < 10) hour = "0" + hour;
		var min = date.getMinutes().toString();
		if (min < 10) min = "0" + min;
		var sec = date.getSeconds();
		if (sec < 10) sec = "0" + sec;
		var msec = (date.getMilliseconds().toFixed(3)).toString(3);
		var ret = dd + "/" + mm + "/" + yy + "   " + hour + ":" + min + ":" + sec;
		//if (msec< (1000*60*60) && yy<2000) ret = min + ":" + sec + "." + msec;
		return ret;
	}
});