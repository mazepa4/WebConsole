
Math.sign = function (number) {
	return number > 0 ? 1.0 : -1.0;
};

/**************************************************************************************************
*** Point
**************************************************************************************************/
Ext.define("Point", {
	x: 0.0,
	y: 0.0,

	/**********************************************************************************************/
	constructor: function (x, y) {
		this.x = x || 0.0;
		this.y = y || 0.0;
	},

	/**********************************************************************************************/
	makeCopy: function () {
		return new Point(this.x, this.y);
	},

	/**********************************************************************************************/
	length: function () {
		return Math.sqrt((this.x * this.x) + (this.y * this.y));
	},

	/**********************************************************************************************/
	add: function (addend) {
		if (typeof (addend) == "number") {
			this.x += addend;
			this.y += addend;
		}
		else if (typeof (addend) == "object") {
			this.x += addend.x;
			this.y += addend.y;
		}
		return this;
	},

	/**********************************************************************************************/
	subtract: function (subtrahend) {
		if (typeof (subtrahend) == "number") {
			this.x -= subtrahend;
			this.y -= subtrahend;
		}
		else if (typeof (subtrahend) == "object") {
			this.x -= subtrahend.x;
			this.y -= subtrahend.y;
		}
		return this;
	},

	/**********************************************************************************************/
	multiply: function (multiplier) {
		if (typeof (multiplier) == "number") {
			this.x *= multiplier;
			this.y *= multiplier;
		}
		else if (typeof (multiplier) == "object") {
			this.x *= multiplier.x;
			this.y *= multiplier.y;
		}
		return this;
	},

	/**********************************************************************************************/
	normalize: function () {
		var length = this.length();

		if (length == 1 || length == 0) {
			return this;
		}

		var scalefactor = 1.0 / length;

		this.x *= scalefactor;
		this.y *= scalefactor;

		return this;
	}
});

/**************************************************************************************************
*** Rect
**************************************************************************************************/

Ext.define("Rect", {
	left: 0.0,
	top: 0.0,
	right: 0.0,
	bottom: 0.0,

	/**********************************************************************************************/
	constructor: function (left, top, right, bottom) {
		this.left = left || 0.0;
		this.top = top || 0.0;
		this.right = right || 0.0;
		this.bottom = bottom || 0.0;
	},

	/**********************************************************************************************/
	makeCopy: function () {
		return new Rect(this.left, this.top, this.right, this.bottom);
	},

	/**********************************************************************************************/
	leftTop: function () {
		return new Point(this.left, this.top);
	},

	/**********************************************************************************************/
	rightBottom: function () {
		return new Point(this.right, this.bottom);
	},

	/**********************************************************************************************/
	enlarge: function (point, optional) {
		var x, y;

		if (optional) {
			x = point;
			y = optional;
		}
		else {
			x = point.x;
			y = point.y;
		}

		if (this.left > x) {
			this.left = x;
		}
		if (this.top > y) {
			this.top = y;
		}
		if (this.right < x) {
			this.right = x;
		}
		if (this.bottom < y) {
			this.bottom = y;
		}

		return this;
	},

	/**********************************************************************************************/
	hitTest: function (point, optional) {
		var x, y;

		if (optional != null) {
			x = point;
			y = optional;
		}
		else {
			x = point.x;
			y = point.y;
		}

		return x >= this.left && x < this.right && y >= this.top && y < this.bottom;
	},

	/**********************************************************************************************/
	hitTestHorizontal: function (x) {
		return x >= this.left && x < this.right;
	},

	/**********************************************************************************************/
	hitTestVertical: function (y) {
		return y >= this.top && y < this.bottom;
	}
});
