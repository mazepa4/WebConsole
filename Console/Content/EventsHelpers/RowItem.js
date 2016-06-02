//RowItem control definition
Ext.define("RowItem", {

	msgEmTime: "",
	msgType: null,
	durTime: "",
	priority: "",
	emId: "",
	emIp: "",
	msgTitle: "",
	msgText: "",
	leaf: "",
	messageId: "",
	parentId: "",
	parentEvent:{},
	canvas: "",
	children: [],
	msgTime: 0,
	loaded: false,
	attachCount:0,
	

	constructor: function (serverMessage, ipList, emList, msgTypes) {
		var date = new Date(serverMessage.messageDeliveryTime / 1000);//this.convertTicksToDate(serverMessage.messageDeliveryTime);
		var title = serverMessage.messageTitle.trim();
		if (title === "" || title==null || title===" " )
			title = "&#60Global service message&#62";

		this.msgEmTime = date.getFullYear() + "-" + this.fixDate((date.getMonth()+1)) + "-" + this.fixDate(date.getDate()) + " " + this.fixDate(date.getHours()) + ":" + this.fixDate(date.getMinutes()) + ":" + this.fixDate(date.getSeconds());//+ " h:m:s:ms:mc",
		this.msgType = msgTypes[serverMessage.messageType],
		this.durTime = "";
		this.priority = serverMessage.priority;
		this.emId = emList[serverMessage.emitterId];
		this.emIp = ipList[serverMessage.emitterIp];
		this.msgTitle = title;
		this.msgText = serverMessage.messageText;
		this.leaf = true;

		this.children = [];
		this.parentEvent = {};
		this.messageId = serverMessage.messageId.toString();
		this.parentId = serverMessage.parentId.toString();
		this.attachCount = serverMessage.attachmentsQuantity;
		this.msgTime = serverMessage.messageEmissionTime;
	},

	convertTicksToDate: function (stringnifiedNumber) {
		var microseconds = goog.math.Long.fromString(stringnifiedNumber, 10);	// goog.math.Long
		var milliseconds = microseconds.div(new goog.math.Long(1000, 0));		// goog.math.Long
		return new Date(milliseconds.toNumber());
	},

	fixDate: function (value) {
		if (value < 10) value = "0" + value;
		return value;
	},
});
