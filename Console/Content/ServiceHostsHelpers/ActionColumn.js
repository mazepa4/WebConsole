/**********************************************************************************************/
Ext.define('Ext.ux.grid.column.ActionsColumn', {

	extend: 'Ext.grid.column.Column',
	alias: ['widget.actionscolumn'],
	alternateClassName: 'Ext.grid.ActionsColumn',

	header: "TEXT",//'&#160;',


	sortable: false,
	btns: [],
	constructor: function (config) {
		var me = this,
		cfg = Ext.apply({}, config),
		items = cfg.items || [me],
		l = items.length,
		i,
		item;
		me.btns = new Ext.util.MixedCollection();
		// This is a Container. Delete the items config to be reinstated after construction.
		delete cfg.items;
		me.callParent([cfg]);

		// Items is an array property of ActionButtonColumns
		me.items = items;
		var gv = '';

		// Renderer closure iterates through items creating a button element for each and tagging with an identifying
		me.renderer = function (v, meta, rec, rowIndex, colIndex, store, view) {

			if (gv == '') {
				gv = view;

				var evnts = {
					'actionbuttonclick': true
				}
				Ext.Array.each(items, function (btn) {
					if (btn.handler) { }
					else if (btn.eventName) {
						evnts[btn.eventName] = true;
					} else if (btn.cls) {
						var evntName = btn.cls.replace(/[^a-zA-Z]/, '') + 'click';
						evnts[evntName] = true;
					}
				});
				//view.addEvents(evnts);
			}

			//  Allow a configured renderer to create initial value (And set the other values in the "metadata" argument!)
			v = Ext.isFunction(cfg.renderer) ? cfg.renderer.apply(this, arguments) || '' : '';

			meta.tdCls += Ext.baseCSSPrefix + 'grid-cell-treecolumn';

			//meta.text = "QQQQ";

			for (i = 0; i < l; i++) {

				item = items[i];

				var nid = Ext.id();
				var cls = Ext.baseCSSPrefix + 'action-col-button ' + Ext.baseCSSPrefix + 'action-col-button-' + String(i) + (item.cls ? ' ' + item.cls : '');
				var iconCls = item.iconIndex ? rec.data[item.iconIndex] : (item.iconCls ? item.iconCls : '');
				var fun = Ext.emptyFn;
				var context = me;
				if (item.handler) {
					if (item.context) {
						context = item.context;
					}
					fun = Ext.bind(item.handler, context, [view, rowIndex, colIndex]);
				}
				else {
					(function (item) {
						var eventName = 'actionbuttonclick';
						if (typeof item.eventName != 'undefined') {
							eventName = item.eventName;
						} else if (typeof item.cls != 'undefined') {
							eventName = item.cls.replace(/[^a-zA-Z]/, '') + 'click';
						}
						fun = function () {
							if (eventName != 'actionbuttonclick') {
								view.fireEvent('actionbuttonclick', this, view, rowIndex, colIndex);
							}
							view.fireEvent(eventName, view, rowIndex, colIndex);
						}
					})(item);
				}
				var hide;
				if (typeof item.showIndex != 'undefined') {
					hide = !rec.data[item.showIndex];
				} else if (typeof item.hideIndex != 'undefined') {
					hide = rec.data[item.hideIndex];
				}

				Ext.Function.defer(me.createGridButton, 100, me, [item.text, nid, rec, cls, fun, hide, iconCls]);

				v += '<div id="' + nid + '">&#160;</div>';
			}
			return v;
		};
	},

	/**********************************************************************************************/
	createGridButton: function (value, id, record, cls, fn, hide, iconCls, tooltip) {
		var target = Ext.get(id);
		if (target !== null) {
			var btn = new Ext.Button({
				text: "sssss",//value,
				cls: cls,
				iconCls: iconCls,
				hidden: hide,
				margin: "0 3 0 0",
				handler: fn,
				tooltip: tooltip,
				renderTo: target.parent()
			});
			this.btns.add(btn);
			Ext.get(id).remove();
		}
	},

	/**********************************************************************************************/
	destroy: function () {
		delete this.items;
		delete this.renderer;
		this.btns.each(function (btn) {
			btn.destroy();
		});
		return this.callParent(arguments);
	},

	/**********************************************************************************************/
	cascade: function (fn, scope) {
		fn.call(scope || this, this);
	},

	/**********************************************************************************************/
	getRefItems: function () {
		return [];
	}
});