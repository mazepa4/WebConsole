Ext.define("Ext.AttachmentItem", {
	extend: "Ext.container.Container",
	xtype: "attachItem",
	requires: [
		'Ext.data.*',
		'Ext.grid.*',
		'Ext.window.*'
	],


	attachName: "",
	attachId: 0,
	attachmentDeliveryTime: "",
	attachFormat: 0,
	attachSize: 0,
	messageId: 0,
	attachBlob: null,
	attachment: null,

	contentEl: null,
	attchNameEl: null,
	attchDateEl: null,
	cls: "attachItem no-selection",
	border: true,
	tileSize: {},

	attachItemEl: null,
	loadingMask: null,
	loadingFullAttachMask: null,
	worker: null,
	from: 0,


	//temporary objects for attachment view
	imageView: null,
	hexView: null,
	jsonView: null,
	audioView: null,

	jsonTab: null,
	audioTab: null,
	hexTab: null,
	imageTab: null,
	window: null,
	actionPanel: null,

	previewready: false,

	attachIdFormatMap: {
		10: "Document Json",
		11: "Document Cbor",

		100: "Image Jpeg",

		200: "Audio Wave",
		201: "Audio Flac",
		202: "Audio Mpeg",
		203: "Audio Opus",
		204: "Audio Vorbis",

		1000: "Unknown Blob"
	},


	constructor: function () {
		if (arguments[0] != undefined) {
			var args = arguments[0];
			this.attachment = args.attachment;
			this.tileSize = args.tileSize;
		}
		var attachName = this.attachment.attachmentName;
		var attachmentDeliveryTime = this.attachment.attachmentDeliveryTime;
		var attachId = this.attachment.attachmentId;

		var date = new Date(attachmentDeliveryTime / 1000);

		var attachDate = date.getFullYear() + "-" + this.fixDate((date.getMonth() + 1)) + "-" + this.fixDate(date.getDate()) + " " + this.fixDate(date.getHours()) + ":" + this.fixDate(date.getMinutes()) + ":" + this.fixDate(date.getSeconds());//+ " h:m:s:ms:mc",

		Ext.apply(arguments[0], {
			id: "attachPanel" + attachId,
			bodyStyle: {
				background: 'white'
			},
			items: [
			{
				xtype: 'panel',
				border: false,
				layout: "border",
				id: "actionPanel" + attachId,
				height: 43,
				width: this.tileSize.width - 18,
				bodyBorder: false,
				defaults: {
					collapsible: false,
					split: false,
					bodyPadding: "0 0 0 8"
				},
				cls: "border-panel",
				items: [
				{
					xtype: "panel",
					layout: "vbox",
					region: "west",
					border: false,
					padding: "0 0 0 0",
					items: [
						{
							xtype: "label",
							text: attachDate,
							border: false,

							margin: "0 0 5 0",
							cls: "date-label-style"
						}, {
							xtype: "label",
							text: attachName,
							margin: "0 0 5 0",
							cls: "name-label-style"
						}
					]
				}, {
					xtype: "panel",
					layout: "hbox",
					region: "east",
					hidden: true,
					id: "actionsEl" + +attachId,
					border: false,
					bodyStyle: {
						background: 'transparent',
					},
					items: [
					 new Ext.button.Button({
					 	id: "downloadAttach" + attachId,
					 	tooltip: 'File size: <b>' + (this.attachment.attachmentSize / 1024).toFixed(3) + ' kB</b><br>File type: <b>' +
							(this.attachIdFormatMap[this.attachment.attachmentFormat]) + '</b> ',
					 	text: 'Download attachment',
					 	iconCls: "download-icon",
					 	margin: "3 5 0 0",
					 	handler: this.downloadAttachment.bind(this),
					 }),
					new Ext.button.Button({
						tooltip: 'Delete attachment',
						text: "Delete attachment",
						handler: this.deleteAttachment.bind(this),
						iconCls: "delete-icon",
						margin: "3 5 0 0",
					})]
				}
				]
			}, {
				xtype: "panel",
				id: "clickablePanel" + attachId,
				padding: 5,
				flex: 1,
				bodyCls: "content-conteiner",
				border: true,
				layout: "hbox",
				items: [
				{
					xtype: "panel",
					id: "contentEl" + attachId,
					flex: 1,
					height: "100%",
					width: "100%",
					//height: this.tileSize.height,
					//width: this.tileSize.width,
					cls: "center-content",
					border: false
				}]
			}

			]
		});
		this.callParent(arguments);

		this.on("afterrender", function () {
			this.contentEl = Ext.getCmp("contentEl" + this.attachment.attachmentId);
			Ext.getCmp("clickablePanel" + this.attachment.attachmentId).body.on("click", this.openNewWindow.bind(this));
			this.actionPanel = Ext.getCmp("actionsEl" + attachId);
			this.on("resize", this.onResize.bind(this));
			this.loadingMask = new Ext.LoadMask({ msg: "Please wait...", target: this.contentEl });
			this.loadingMask.show();

			document.getElementById("attachPanel" + this.attachment.attachmentId).addEventListener("mouseover", function (e) {
				this.actionPanel.setHidden(false);
				var parent = this.findParentByType("attachWindow");
				parent.itemHoverAction = true;
			}.bind(this));

			document.getElementById("attachPanel" + this.attachment.attachmentId).addEventListener("mouseout", function (e) {
				this.actionPanel.setHidden(true);
				var parent = this.findParentByType("attachWindow");
				parent.itemHoverAction = false;
			}.bind(this));
		});
	},

	/**********************************************************************************************/
	onResize: function (scope,width, height, oldWidth, oldHeight) {
		switch (this.attachment.attachmentFormat) {
			case 1000:
				var item = Ext.getCmp("hexViewElId" + this.attachment.attachmentId + "-true");
				if (item != undefined) {
					var parent = this.findParentByType("attachWindow");
					item.setSize(parent.attachTileSize.width, parent.attachTileSize.height);
				}
				break;
			case 10:
				var item = Ext.getCmp("hexViewElId" + this.attachment.attachmentId + "-true");
				if (item != undefined) {
					var parent = this.findParentByType("attachWindow");
					item.setSize(parent.attachTileSize.width , parent.attachTileSize.height);
				}
				break;
		}
	},

	openNewWindow: function () {
		var type = "UnknownBlob";
		var ext = this.attachment.attachmentName.split('.').pop();
		var loadingMask = new Ext.LoadMask({ msg: "Please wait...", target: this });

		switch (ext) {
			case "jpg":
				type = "ImageJpeg";
				break;
			case "jpeg":
				type = "ImageJpeg";
				break;
			case "png":
				type = "ImagePng";
				break;
			case "gif":
				type = "ImageGif";
				break;
			case "json":
				type = "DocumentJson";
				break;
			case "wav":
				type = "AudioWave";
				break;
			case "mp3":
				type = "AudioMpeg";
				break;
			case "flac":
				type = "AudioFlac";
				break;
			case "ogg":
				type = "AudioVorbis";
				break;
			default:
				break;
		}

		try {
			this.imageView = null;
			this.hexView = null;
			this.jsonView = null;
			this.audioView = null;

			var jsonTab = null;
			var audioTab = null;
			var hexTab = null;
			var imageTab = null;
			this.window = null;

			var tabControl = Ext.create({
				xtype: 'tabpanel',
				resizeTabs: true,
				enableTabScroll: false,
				layout: {
					type: 'fit',
				},
				cls: " align-content: center;vertical-align:middle;margin: auto;object-position: center; no-selection",
				defaults: {
					bodyPadding: 0
				}
			});

			if (type.indexOf('Image') != -1) {

				this.imageView = this.attachItemEl = Ext.create('Ext.Img', {
					autoEl: 'div'
				});

				imageTab = tabControl.add({
					title: "Image Viewer",
					layout: {
						type: 'hbox',
						pack: 'middle'
					},
					bodyStyle: {
						background: '#FCFCFC',
						padding: 5,
					},
					autoScroll: true,
					scroll: true,
					border: false,
					items: [this.imageView]
				});
			}

			if (type === "DocumentJson") {

				this.jsonView = new Ext.JsonViewer({
					previewMode: false,
					attachId: this.attachment.attachmentId
				});

				jsonTab = tabControl.add({
					xytpe: "panel",
					title: "JsonView",
					layout: {
						type: 'fit'
					},
					border: false,
					items: [this.jsonView]

				});
			}

			if (type.indexOf('Audio') != -1) {

				this.audioView = Ext.create('Ext.panel.Panel', {
					title: "Audio player",
					height: "auto",
					layout: {
						type: 'vbox',
						align: 'stretch',
						pack: 'center'
					}
				});

				audioTab = tabControl.add(this.audioView);
			}


			/*this.hexView = Ext.create("Ext.panel.Panel", {
				id: "hexViewElId",
				height: '100%',
				width: '100%',
				layout: {
					type: 'hbox',
					align: 'stretch'
				},
			});*/

			this.hexView = tabControl.add({
				title: "HexView",
				layout: {
					type: 'fit'
				},
				border: false,
				//items: [this.hexView]
			});

			this.window = Ext.create('Ext.window.Window', {
				title: this.attachment.attachmentName,
				height: Ext.getCmp("siteRoot").getHeight() - 20,
				width: Ext.getCmp("siteRoot").getWidth() - 20,
				minWidth: 822,
				minHeight: 340,
				minButtonWidth:20,
				layout: 'fit',
				autoDestroy: true,
				animateTarget: this.contentEl,
				modal: true,
				shadowOffset: 3,
				shadow: true,
				cls: "no-selection",
				items: [
					tabControl
				]
			});


			this.window.on("afterrender", function () {
				this.loadingFullAttachMask = new Ext.LoadMask({ msg: "Please wait ...", target: this.window });
				this.loadingFullAttachMask.show();
				this.loadAttachment(type);
			}.bind(this));

			this.window.show();

			if (type.indexOf('Image') != -1) {
				tabControl.setActiveTab(imageTab);
			} else tabControl.setActiveTab(hexTab);

			if (type.indexOf('Audio') != -1) {
				tabControl.setActiveTab(audioTab);
			}

			if (type == "DocumentJson") {
				tabControl.setActiveTab(jsonTab);
			}
		} catch (error) {
			Ext.MessageBox.show({
				title: 'Error hapened!',
				msg: "Uncatch error,failed to process attachment data.<br>Exception info: " + error.message,
				buttons: Ext.MessageBox.OK,
				animateTarget: this,
				fn: function () {
					console.log("Uncatch error,failed to process attachment data.Exception info: " + error.message);
				},
				icon: Ext.Msg.ERROR
			});
		}
		loadingMask.hide();
	},

	/***********************************************************************************************/
	startWebWorker: function (format, attachment, responseFormat) {

		try {
			var objData = {
				format: format,
				attachment: attachment,
				responseFormat: responseFormat
			};
			this.from = performance.now();

			this.worker = new Worker('/Content/AttachmentsPlugins/AttachmentGetter.js');
			this.worker.onmessage = this.onWebWorkerComplited.bind(this);
			this.worker.onerror = this.onWebWorkerFail.bind(this);
			this.worker.postMessage(objData);
			console.log("WebWorker started");
		} catch (error) {
			console.log("Failed to get attachment. Exception: " + error);
		}
	},

	/**********************************************************************************************/
	onWebWorkerComplited: function (event) {

		var responce = event.data.response;
		console.log("-----------------------------------");
		this.worker.terminate();
		var to = performance.now();
		console.log("WebWorker complited in: " + (to - this.from));

		var tmpBuffer = null;
		if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1 || navigator.userAgent.toLowerCase().indexOf('edge') > -1) {
			tmpBuffer = responce.slice(0);
		}

		var raw = this.attachResponseHandler(responce);
		var type = event.data.format;
		this.attachBlob=responce;
		if (type == "UnknownBlob") {
			window.setTimeout(function() {
					if (this.hexView.readyState == undefined) {
						this.loadingFullAttachMask = new Ext.LoadMask({ msg: "Please wait ...", target: this.hexView });
						this.loadingFullAttachMask.show();

						var previewDiv = this.hexView.body; //.getEl().createChild({ tag: "div" });
						var container = Ext.getDom(previewDiv);
						this.createHexGrid(container, this.hexView.getWidth(), this.hexView.getHeight(), responce);

						this.loadingFullAttachMask.hide();
						this.hexView.readyState = true;
					}
				}.bind(this), 100);
		}

			this.hexView.on("resize", function (scope,width, height, oldWidth, oldHeight) {
					window.setTimeout(function() {
						this.loadingFullAttachMask = new Ext.LoadMask({ msg: "Please wait ...", target: this.hexView });
						this.loadingFullAttachMask.show();

						var previewDiv = this.hexView.body; //.getEl().createChild({ tag: "div" });
						var container = Ext.getDom(previewDiv);
						this.createHexGrid(container, width, height, this.attachBlob);

						this.loadingFullAttachMask.hide();
					}.bind(this), 100);
			}.bind(this));
		

		if (type.indexOf('Image') != -1) {
			var image = this.getImage(responce);
			this.imageView.setSrc(image);
			this.imageView.updateLayout();
		}

		if (type.indexOf('Audio') != -1) {

			if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1 || navigator.userAgent.toLowerCase().indexOf('edge') > -1) {
				responce = tmpBuffer;
			}

			var newWaveform = this.createWaveform();
			newWaveform.loadAudio(new AudioPlayer(), responce, false, 1);
			this.audioView.add(newWaveform);
			this.audioView.updateLayout();

			this.window.on("beforedestroy", function (scope, eOpts) {
				newWaveform.stopPlayer();
			}.bind(this));
		};

		if (type == "DocumentJson") {
			this.jsonView.setupData(raw);
			this.jsonView.updateLayout();
		}
		this.loadingFullAttachMask.hide();
		console.log("-----------------------------------");
	},

	/**********************************************************************************************/
	onWebWorkerFail: function (e) {
		console.log("Web Worker failed. Exception : " + e.message);
	},

	/**********************************************************************************************/
	initAttachment: function (blobArray) {
		var type = "UnknownBlob";

		if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1 || navigator.userAgent.toLowerCase().indexOf('edge') > -1) {
			this.attachBlob = blobArray.slice(0);
		}
		else {
			this.attachBlob = blobArray;
		}
		var ext = this.attachment.attachmentName.split('.').pop();
		switch (ext) {
			case "jpg":
				type = "ImageJpeg";
				break;
			case "jpeg":
				type = "ImageJpeg";
				break;
			case "png":
				type = "ImagePng";
				break;
			case "gif":
				type = "ImageGif";
				break;
			case "json":
				type = "DocumentJson";
				break;
			case "wav":
				type = "AudioWave";
				break;
			case "mp3":
				type = "AudioMpeg";
				break;
			case "flac":
				type = "AudioFlac";
				break;
			case "ogg":
				type = "AudioVorbis";
				break;
			default:
				break;
		}

		var raw = null;
		try {
			if (type.indexOf('Image') != -1) {
				var image = this.getImage(this.attachBlob, true);

				this.attachItemEl = Ext.create('Ext.Img', {
					src: image,
					cls: "img"
				});
			}

			if (type == "DocumentJson") {
				raw = this.attachResponseHandler(this.attachBlob);
				this.attachItemEl = new Ext.JsonViewer({
					width: "auto",
					cls: 'overflowY: hidden;',
					attachId: this.attachment.attachmentId,
					previewMode: true
				});
			}

			var tmpBuffer = null;

			if (type.indexOf('Audio') != -1) {
				if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1 || navigator.userAgent.toLowerCase().indexOf('edge') > -1) {
					tmpBuffer = this.attachBlob.slice(0);;
				}
				this.attachItemEl = this.createWaveform();
				this.attachItemEl.loadAudio(new AudioPlayer(), this.attachBlob, true, 1);

				if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1 || navigator.userAgent.toLowerCase().indexOf('edge') > -1) {
					this.attachBlob = tmpBuffer;
				}
			}

			if (type == "UnknownBlob") {
				//raw = this.attachResponseHandler(this.attachBlob);
				//this.attachItemEl = Ext.create("Ext.HexViewer", {
				//	attachSizes: {
				//		height: this.tileSize.height - 40,
				//		width: this.tileSize.width - 20
				//	},
				//	attachId: this.attachment.attachmentId,
				//	previewMode: true
				//});
				//this.attachItemEl.on("afterrender", function () {
				//	this.attachItemEl.setupData(this.attachBlob);
				//	//this.attachItemEl.previewDiv.update(this.attachItemEl.previewHtml);
				//}.bind(this));
				this.attachBlob=this.attachBlob.slice(0,350);
				var previewDiv = this.contentEl.body;//.getEl().createChild({ tag: "div" });
				var container = Ext.getDom(previewDiv);
				this.createHexGrid(container, this.tileSize.width, this.tileSize.height, this.attachBlob);

				this.contentEl.on("resize",function(scope,width,height,oldWidth,oldHeight){
					var previewDiv = this.contentEl.body;//.getEl().createChild({ tag: "div" });
					var container = Ext.getDom(previewDiv);
					this.createHexGrid(container, this.contentEl.getWidth(), this.contentEl.getHeight(), this.attachBlob);
				}.bind(this))
				
			}

			if (type == "DocumentJson") {
				this.attachItemEl.on("afterrender", function () {
					this.attachItemEl.setupData(raw);
				}.bind(this));
			}

			if (this.attachItemEl != null)
				this.contentEl.add(this.attachItemEl);

			if (this.loadingMask != null)
				this.loadingMask.hide();
			console.log("ReadAttachment completed.");
			this.previewready = true;
		} catch (error) {
			Ext.MessageBox.show({
				title: 'Error hapened!',
				msg: "Uncatch error,failed to process events data.<br>Exception info: " + error.message,
				buttons: Ext.MessageBox.OK,
				animateTarget: this,
				fn: function () {
					console.log("Uncatch error,failed to process events data.Exception info: " + error.message);
				},
				icon: Ext.Msg.ERROR
			});
			if (this.loadingMask != null)
				this.loadingMask.hide();
		}
		//this.attachBlob = null;
		this.loadingMask.hide();
	},

	/**********************************************************************************************/
	fixDate: function (value) {
		if (value < 10) value = "0" + value;
		return value;
	},

	/**********************************************************************************************/
	getImage: function (arrayBuffer, compress) {
		var img = new Image();
		var uintArray = new Uint8Array(arrayBuffer);
		//var base64String = btoa(String.fromCharCode.apply(null, ));
		var base64String = "", chunksize = 0xffff;
		var len = uintArray.length;

		for (var i = 0; i * chunksize < len; i++) {
			base64String += btoa(String.fromCharCode.apply(null, uintArray.subarray(i * chunksize, (i + 1) * chunksize)));
		}
		img.src = "data:image/jpeg;base64," + (base64String);
		if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1)
			return img.src
		else {
			if (compress == true) {
				var newSrc = this.compressImage(img, 22, "jpg");
				return newSrc;
			}
			else return img.src;
		}
	},

	/**********************************************************************************************/
	createWaveform: function () {
		var newWaveform = new Waveform({
			closable: false,
			title: "Audio player",
			cls: "noselect",
			maxHeight: 400,
			height: "auto"
		});
		return newWaveform;
	},

	/***********************************************************************************************/
	deleteAttachment: function () {
		Ext.MessageBox.confirm('Confirm', 'Are you sure you want to delete "' + this.attachment.attachmentName + '"?', function (btn) {

			if (btn == "yes") {
				var idList = [];
				idList.push(this.attachment.attachmentId);

				var requestUrl = "/Watcher/DeleteAttachments";
				var request = new XMLHttpRequest();
				request.open("POST", requestUrl, true);
				request.responseType = "text";
				request.onload = function (request) {
					if (request.readyState == 4 && request.status == 200) {
						if (request.response == "True") {
							console.log("DeleteAttachments complited successfuly");
							var parent = this.findParentByType("attachWindow");
							parent.updateAttachmentList(this, this.attachment.attachmentId);
						} else console.log("DeleteAttachments failed");
					} else if (request.readyState == 4 && request.status == 500) {
						Ext.MessageBox.show({
							title: 'Error hapened!',
							msg: "The server encountered an unexpected condition which prevented it from fulfilling the request.",
							buttons: Ext.MessageBox.OK,
							animateTarget: this,
							fn: function () {
								console.log("DeleteAttachments failed.");
							},
							icon: Ext.Msg.ERROR
						});
						console.log("The server encountered an unexpected condition which prevented it from fulfilling the request.");
					}
				}.bind(this, request);
				request.onerror = function (request) {
					var result = request.response;
					console.log("DeleteAttachments failed. Error: " + result);
				}.bind(this, request);
				request.send(JSON.stringify(idList));
			}
		}.bind(this));
	},

	/***********************************************************************************************/
	downloadAttachment: function () {

		var type = "unknown";
		var ext = this.attachment.attachmentName.split('.').pop();
		switch (ext) {
			case "jpg":
				type = "image/jpeg";
				break;
			case "jpeg":
				type = "image/jpeg";
				break;
			case "png":
				type = "image/png";
				break;
			case "gif":
				type = "image/gif";
				break;
			case "json":
				type = "application/json";
				break;
			case "wav":
				type = "audio/wave";
				break;
			case "mp3":
				type = "audio/mpeg";
				break;
			case "flac":
				type = "audio/flac";
				break;
			case "ogg":
				type = "audio/vorbis";
				break;
			default:
				break;
		}

		try {

			var objData = {
				attachment: this.attachment,
				responseFormat: "blob"
			};

			this.from = performance.now();
			var worker = new Worker('/Content/AttachmentsPlugins/AttachmentGetter.js');

			worker.onmessage = function (event) {

				worker.terminate();
				var blob = new Blob([event.data.response], { type: type });
				var localUrl = (window.URL || window.webkitURL).createObjectURL(blob);
				if (localUrl) {

					if (navigator.appVersion.toString().indexOf('.NET') > 0 || navigator.userAgent.toLowerCase().indexOf('edge') > -1)

						window.navigator.msSaveBlob(blob, event.data.attachment.attachmentName);
					else {

						window.URL = window.URL || window.webkitURL;

						var link = document.createElement('a');
						link.download = event.data.attachment.attachmentName;
						link.href = localUrl;

						link.onclick = function (e) {
							if ('disabled' in this.dataset) {
								return false;
							}

							link.dataset.disabled = true;
							// Need a small delay for the revokeObjectURL to work properly.
							setTimeout(function () {
								window.URL.revokeObjectURL(link.href);
							}, 1500);
						};
						document.body.appendChild(link);
						link.click();
					}
				}
				else {
					this.downloadButton.setHref("");
					console.log("Unable to create local URL.");
				}
			}
			worker.onerror = function (e) {
				console.log("Web Worker failed. Exception : " + e.message);
			},
			worker.postMessage(objData);
			console.log("WebWorker started");
		} catch (error) {
			console.log("Failed to get attachment. Exception: " + error);
		}
	},

	/***********************************************************************************************/
	attachResponseHandler: function (charData) {
		var binData = null;
		var output = null;
		var responseObject = "";
		try {
			// Turn number array into byte-array
			binData = new Uint8Array(charData);
			try {
				// Convert zipped byteArray back to utf8 string:
				responseObject = new TextDecoder("utf8").decode(binData);
				//	responseObject = this.ab2str(binData.slice(i * 65000, 65000));//new TextDecoder("utf8").decode(binData);
			} catch (error) {
				try {
					responseObject = this.arrayBufferToString(binData);
				} catch (error) {
					console.log(error);
				}
			}
		} catch (error) {
			console.log("Failed to unpack server response.");
		}
		return responseObject;
	},

	/***********************************************************************************************/
	getMimeType: function (format) {
		switch (format) {
			case 10:
				return "DocumentJson";

			case 11:
				return "DocumentCbor";

			case 100:
				return "ImageJpeg";

			case 200:
				return "AudioWave";

			case 201:
				return "AudioFlac";

			case 202:
				return "AudioMpeg";

			case 203:
				return "AudioOpus";

			case 204:
				return "AudioVorbis";
		}


		//switch (format) {
		//	case 16:
		//		return "DocumentJson";

		//	case 17:
		//		return "DocumentCbor";

		//	case 256:
		//		return "ImageJpeg";

		//	case 512:
		//		return "AudioWave";

		//	case 513:
		//		return "AudioFlac";

		//	case 514:
		//		return "AudioMpeg";

		//	case 515:
		//		return "AudioOpus";

		//	case 516:
		//		return "AudioVorbis";
		//}

		return "UnknownBlob";
	},

	/***********************************************************************************************/
	arrayBufferToString: function (buffer) {
		var bufView = new Uint16Array(buffer);
		var length = bufView.length;
		var result = '';
		for (var i = 0; i < length; i += 65535) {
			var addition = 65535;
			if (i + 65535 > length) {
				addition = length - i;
			}
			result += String.fromCharCode.apply(null, bufView.subarray(i, i + addition));
		}
		return result;
	},

	/**
	* Receives an Image Object (can be JPG OR PNG) and returns a new Image Object compressed
	* @param {Image} source_img_obj The source Image Object
	* @param {Integer} quality The output quality of Image Object
	* @param {String} output format. Possible values are jpg and png
	* @return {Image} result_image_obj The compressed Image Object
	*/
	/***********************************************************************************************/
	compressImage: function (source_img_obj, quality, output_format) {

		var mime_type = "image/jpeg";
		if (typeof output_format !== "undefined" && output_format == "png") {
			mime_type = "image/png";
		}

		var cvs = document.createElement('canvas');
		cvs.width = source_img_obj.naturalWidth;
		cvs.height = source_img_obj.naturalHeight;
		var ctx = cvs.getContext("2d").drawImage(source_img_obj, 0, 0);
		var newImageData = cvs.toDataURL(mime_type, quality / 100);
		return newImageData;
	},

	/***********************************************************************************************/
	loadAttachment: function (type) {
		this.startWebWorker(type, this.attachment, "blob");
	},

	/***********************************************************************************************/
	createHexGrid:function(container,width,height,arrayBuffer) {
	
		var Grid = new JSHexGrid.grid({
			width: width,
			byteArr:arrayBuffer,
			height: height,
			container: container,
			dataSrc: JSHexGrid.dataHandler.file(arrayBuffer),
			colors: JSHexGrid.theme.default
		});

		var dimensions = Grid.getDimensions();

		container.innerHTML = "";
		container.style.width = dimensions.width + "px";
		container.style.height = dimensions.height + "px";
		container.style.margin = "0 auto";
		container.style.display = "";
		container.style.overflow = "hidden";
		Grid.render();
		Grid.showFrom(0);
	}
});