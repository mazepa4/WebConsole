/***************************************************************************************************
*** WaveformAudioData
***************************************************************************************************/
Ext.define("WaveformAudioData", {
	sampleRate: 0,						// Number
	channelCount: 0,					// Number
	sampleCount: 0,						// Number
	decodedAudioData: null,				// [Float32Array]
	encodedAudioData: null,				// ArrayBuffer
	encodedAudioFormat: null,			// AudioFormat

	samplesPerMillisecond: 0,
	audioDuration: 0
});

/***************************************************************************************************
*** Waveform
***************************************************************************************************/
Ext.define("Waveform", {
	extend: "Ext.Component",
	xtype: "waveform",

	statics: {
		DragMode: {
			Scroll: 1,
			LeftResize: 2,
			RightResize: 3,
			ReverseScroll: 4
		},

		loadingCompleted: "loadingCompleted",	// (channelCount : Number)
		loadingFailed: "loadingFailed",			// ()
		playingStarted: "playingStarted",		// ()
		playingFinished: "playingFinished",		// ()
		pageChanged: "pageChanged"				// (timeStart : Number, timeLength : Number)
	},

	// Elements
	canvasElement: null,
	drawingContext: null,
	markerElement: null,

	// Audio content
	loadingState: false,
	gainLevel: 1.0,
	audioPlayer: null,
	audioData: null,
	inputAudio: null,					// raw audio data
	inputAudioFormat: -1,				// raw audio format

	// Speech segments content
	speechSegments: new Array(),

	// Updates only at resizing
	controlWidth: null,
	controlHeight: null,
	scrollerTop: null,
	scrollerHeight: null,
	viewerTop: null,
	viewerHeight: null,

	// Updates on sound loading and at resizing
	scrollerImage: null,				// canvas image
	scrollerThumbPlacement: null,		// { top, height }
	scrollerWaveformPlacements: null,	// array of { top, height }
	viewerWaveformPlacements: null,		// array of { top, height }

	// Updates on scroll, on zoom and on sound loading
	currentTimeShift: null,				// in miliseconds
	currentTimeLength: null,			// in miliseconds
	currentMilisecondsPerPage: null,	// in miliseconds

	// Audio player data
	playerUpdater: null,				// interval id
	playerChannelIndex: 0,
	playerTimeShift: 0,
	playerTimeLength: 0,
	playerMarkerPixelShift: 0,

	// Dragging state
	dragStart: 0,						// dragging shift
	dragMode: null,

	// Initial options
	optionTextFont: "11px tahoma, arial, verdana, sans-serif",
	optionTextColor: "#222222",
	optionTextAlign: "center",
	optionTextBaseline: "bottom",
	optionBarBorderColor: "rgb(153,188,232)",
	optionBarFillColor: "#d6e3f2",
	optionThumbTemplate: {
		topScale: 0.0,
		heightScale: 1.0,
		borderWidth: 2,
		borderColor: "rgb(217,76,64)",
		fillAlpha: 0.25,
		fillColor: "rgb(217,76,64)"
	},
	optionSpeechBarTemplate: {
		topScale: 0.7,
		heightScale: 0.1,
		drawMarks: true,
		borderWidth: 2,
		borderColor: "rgb(76,217,64)",
		fillAlpha: 0.25,
		fillColor: "rgb(76,217,64)"
	},
	optionWaveformColor: "#428bca",
	optionPlayerMarkerColor: "orange",
	optionMeterHeight: 15,
	optionChannelHeight: 320,
	optionScrollerRelativeHeight: 0.2,
	optionMillisecondsPerPage: 10000,
	optionGainLevel: 1.0,

	/**********************************************************************************************/
	constructor: function () {
		this.callParent(arguments);

		/* Load user changed options from cookies */
		var userOptions = Ext.state.Manager.get(this.getId(), {
			playingGainLevel: this.optionGainLevel,
			millisecondsPerPage: this.optionMillisecondsPerPage
		});

		if (userOptions.playingGainLevel) {
			this.gainLevel = userOptions.playingGainLevel;
		}
		else {
			this.gainLevel = this.optionGainLevel;
		}

		if (userOptions.millisecondsPerPage) {
			this.currentMilisecondsPerPage = userOptions.millisecondsPerPage;
		}
		else {
			this.currentMilisecondsPerPage = this.optionMillisecondsPerPage;
		}

		/* After render processing */
		this.on("afterrender", function () {
			this.canvasElement = this.getEl().createChild({ tag: "canvas" });
			this.canvasElement.applyStyles({
				"position": "absolute",
				"left": "0px",
				"top": "0px"
			});

			this.drawingContext = this.canvasElement.dom.getContext("2d");

			this.markerElement = this.getEl().createChild({ tag: "div" });
			this.markerElement.setVisibilityMode(Ext.dom.Element.VISIBILITY);
			this.markerElement.applyStyles({
				"visibility": "hidden",
				"position": "absolute",
				"width": "3px",
				"background-color": this.optionPlayerMarkerColor
			});

			this.on("resize", this.onResize.bind(this));
			this.canvasElement.on("doubletaptap", this.onDoubleTap.bind(this));
			this.canvasElement.on("dragstart", this.onDragStart.bind(this));
			this.canvasElement.on("dragend", this.onDragEnd.bind(this));
			this.canvasElement.on("drag", this.onDragMove.bind(this));
			this.canvasElement.on("touchmove", this.onTouchMove.bind(this));

			if (true == ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch)) {
				// on touch browsers
				this.canvasElement.on("mousedown", this.onMousedown.bind(this));
				this.canvasElement.on("mouseup", this.onMouseup.bind(this));
				
			} else {
				// on desktop browsers
				this.canvasElement.on("tap", this.onTap.bind(this));
			}

			this.onResize(this.getWidth(), this.getHeight());
		});

	},

	/**********************************************************************************************/
	onMousedown: function (event) {
		this.touchX = event.pageX;
		this.touchY = event.pageY;
	},

	/**********************************************************************************************/
	onMouseup: function (event) {
		var deltaX = event.pageX - this.touchX;
		var deltaY = event.pageY - this.touchY;
		if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) {
			this.onTap(event);
			this.touchX = 0;
			this.touchY = 0;
			return;
		}
	},

	/**********************************************************************************************/
	loadAudio: function (audioPlayer, encodedAudioData, saveInputAudio, inputAudioFormat) {
		this.audioPlayer = audioPlayer;
		this.audioPlayer.setGainLevel(this.gainLevel);
		this.audioPlayer.on(AudioPlayer.audioDecoded, this.onAudioDecoded.bind(this));
		this.audioPlayer.on(AudioPlayer.audioDecodingFailed, this.onAudioDecodingFailed.bind(this));
		this.audioPlayer.on(AudioPlayer.audioPlayingCompleted, this.onAudioPlayingCompleted.bind(this));

		this.loadingState = true;
		this.audioData = null;

		// Save input audio data
		if (saveInputAudio) {
			// Copy whole audio data for firefox
			if (Ext.isGecko) {
				this.inputAudio = encodedAudioData.slice(0);
			}
			else {
				this.inputAudio = encodedAudioData;
			}

			this.inputAudioFormat = inputAudioFormat;
		}
		else {
			this.inputAudio = null;
			this.inputAudioFormat = -1;
		}

		this.audioPlayer.decode(encodedAudioData);
	},

	/**********************************************************************************************/
	loadClassification: function (speechSegments, channelIndex) {
		this.speechSegments = speechSegments.slice();

		if (channelIndex) {
			for (var segmentIndex = 0; segmentIndex != this.speechSegments.length; ++segmentIndex) {
				this.speechSegments[segmentIndex].channelIndex = channelIndex;
			}
		}
	},

	/**********************************************************************************************/
	getChannelCount: function () {
		if (!this.audioData) {
			return 0;
		}
		return this.audioData.channelCount;
	},

	/**********************************************************************************************/
	getChannelData: function (channelIndex) {
		if (!this.audioData) {
			return 0;
		}
		if (channelIndex) {
			return this.audioData.channelData[channelIndex];
		}
		return this.audioData.channelData;
	},

	/**********************************************************************************************/
	getSampleCount: function () {
		if (!this.audioData) {
			return 0;
		}
		return this.audioData.sampleCount;
	},

	/**********************************************************************************************/
	getSampleRate: function () {
		if (!this.audioData) {
			return 0;
		}
		return this.audioData.sampleRate;
	},

	/**********************************************************************************************/
	getInputAudio: function () {
		return this.inputAudio;
	},

	/**********************************************************************************************/
	getInputAudioFormat: function () {
		return this.inputAudioFormat;
	},

	/**********************************************************************************************/
	resetContent: function () {
		this.stopPlayer();

		this.loadingState = false;
		this.audioData = null;
		this.inputAudio = null;

		this.speechSegments.splice(0);

		this.updateDrawingContext();
	},

	/**********************************************************************************************/
	setGainLevel: function (gainLevel) {
		this.gainLevel = gainLevel;

		if (this.audioPlayer) {
			this.audioPlayer.setGainLevel(gainLevel);
		}

		this.saveUserChangedOptions();
	},

	/**********************************************************************************************/
	getGainLevel: function () {
		return this.gainLevel;
	},

	/**********************************************************************************************/
	loadPlayer: function (channelIndex, timeRangeStart, timeRangeLength) {
		this.playerChannelIndex = channelIndex;
		this.playerTimeShift = timeRangeStart;
		this.playerTimeLength = timeRangeLength;

		if (this.playerTimeLength == -1) {
			this.playerTimeLength = this.audioData.soundDuration - this.playerTimeShift;
		}

		this.audioPlayer.playAudio(channelIndex, timeRangeStart, timeRangeLength);

		if (channelIndex != -1) {
			this.markerElement.setTop(this.viewerWaveformPlacements[channelIndex].top);
			this.markerElement.setHeight(this.viewerWaveformPlacements[channelIndex].height);
		}
		else {
			this.markerElement.setTop(this.viewerTop);
			this.markerElement.setHeight(this.viewerHeight);
		}

		this.markerElement.setVisible(true);

		var updatePlayer = function () {
			var playerTimeCurrent = this.audioPlayer.getPlayingTime() * 1000 + this.playerTimeShift;

			if (playerTimeCurrent < this.currentTimeShift) {
				this.currentTimeShift = Math.floor(playerTimeCurrent / this.currentMilisecondsPerPage) * this.currentMilisecondsPerPage;
				this.updateDrawingContext();
				this.fireEventArgs(Waveform.pageChanged, [this.currentTimeShift, this.currentTimeLength]);
			}
			else if (playerTimeCurrent >= this.currentTimeShift + this.currentTimeLength) {
				this.currentTimeShift = Math.min(playerTimeCurrent, this.audioData.soundDuration - this.currentTimeLength);
				this.updateDrawingContext();
				this.fireEventArgs(Waveform.pageChanged, [this.currentTimeShift, this.currentTimeLength]);
			}

			var currentPixelShift = Math.round((playerTimeCurrent - this.currentTimeShift) / this.currentTimeLength * this.controlWidth);

			if (this.playerMarkerPixelShift != currentPixelShift) {
				this.playerMarkerPixelShift = currentPixelShift;
				this.markerElement.setLeft(this.playerMarkerPixelShift);
			}
		}.bind(this);

		if (!this.playerUpdater) {
			this.playerUpdater = setInterval(updatePlayer, 10);
		}

		this.fireEvent(Waveform.playingStarted);
	},

	/**********************************************************************************************/
	stopPlayer: function () {
		this.audioPlayer.stopPlaying();
		this.freePlayer();
	},

	/**********************************************************************************************/
	pausePlayer: function () {
		this.audioPlayer.stopPlaying();
		if (this.playerUpdater) {
			clearInterval(this.playerUpdater);
			this.playerUpdater = null;
		}
	},

	/**********************************************************************************************/
	freePlayer: function () {
		if (this.markerElement) {
			this.markerElement.setVisible(false);
		}

		if (this.playerUpdater) {
			clearInterval(this.playerUpdater);
			this.playerUpdater = null;
		}
	},

	/**********************************************************************************************/
	projectTimeRange: function (channelIndex, timeShift, timeLength, projectOnScroller) {
		if (this.audioData && channelIndex < this.audioData.channelCount) {
			var pixelShift = 0;
			var pixelLength = 0;
			var verticalPlacement = null;

			if (projectOnScroller) {
				var milisecondsPerPixel = this.audioData.soundDuration / this.controlWidth;

				pixelShift = Math.round(timeShift / milisecondsPerPixel);
				pixelLength = Math.round(timeLength / milisecondsPerPixel);
				verticalPlacement = this.scrollerWaveformPlacements[channelIndex];
			}
			else {
				var milisecondsPerPixel = this.currentTimeLength / this.controlWidth;

				pixelShift = Math.round((timeShift - this.currentTimeShift) / milisecondsPerPixel);
				pixelLength = Math.round(timeLength / milisecondsPerPixel);

				verticalPlacement = this.viewerWaveformPlacements[channelIndex];
			}

			return new Rect(pixelShift, verticalPlacement.top, pixelShift + pixelLength, verticalPlacement.top + verticalPlacement.height);
		}
		return null;
	},

	/**********************************************************************************************/
	getCurrentTimeShift: function () {
		return this.currentTimeShift;
	},

	/**********************************************************************************************/
	getCurrentTimeLength: function () {
		return this.currentTimeLength;
	},

	/**********************************************************************************************/
	getSoundDuration: function () {
		if (this.audioData.soundDuration != null)
			return this.audioData.soundDuration;

		return 0;
	},

	/**********************************************************************************************/
	saveUserChangedOptions: function () {
		Ext.state.Manager.set(this.getId(), {
			gainLevel: this.gainLevel,
			millisecondsPerPage: this.currentMilisecondsPerPage
		});
	},

	/**********************************************************************************************/
	drawWaveformBackground: function (waveformPlacement) {
		var gradient = this.drawingContext.createLinearGradient(0, waveformPlacement.top, 0, waveformPlacement.top + waveformPlacement.height);

		gradient.addColorStop(0, "#ffffff");
		gradient.addColorStop(0.5, "#e1e1e1");
		gradient.addColorStop(1, "#c8c8c8");

		this.drawingContext.fillStyle = gradient;
		this.drawingContext.fillRect(0, waveformPlacement.top, this.controlWidth, waveformPlacement.height);
	},

	/**********************************************************************************************
		waveformPlacements - array of { top, height } for each channel, in pixels
		pageTimeShift - start of drawing time range, in miliseconds
		pageTimeLength - length of drawing time range, in miliseconds
	*/
	drawWaveform: function (waveformPlacements, pageTimeShift, pageTimeLength) {
		var startIndex = Math.floor(pageTimeShift * this.audioData.indicesPerMilisecond); // must be integer
		var endIndex = Math.min(startIndex + pageTimeLength * this.audioData.indicesPerMilisecond, this.audioData.channelData[0].length);
		var indicesPerPixel = (pageTimeLength * this.audioData.indicesPerMilisecond) / this.controlWidth;
		var channelCount = this.audioData.channelCount;

		var indicesMin = [];
		var indicesMax = [];

		for (var channel = 0; channel != channelCount; ++channel) {
			indicesMin[channel] = 1;
			indicesMax[channel] = -1;
		}

		var indicesTraversed = 0;
		var currentPixel = 0;

		for (var i = startIndex; i < endIndex; ++i) {
			for (var channel = 0; channel != channelCount; ++channel) {
				var currentValue = this.audioData.channelData[channel][i];

				if (indicesMin[channel] > currentValue) {
					indicesMin[channel] = currentValue;
				}
				if (indicesMax[channel] < currentValue) {
					indicesMax[channel] = currentValue;
				}
			}

			++indicesTraversed;

			if (indicesTraversed >= indicesPerPixel) {
				for (var channel = 0; channel != channelCount; ++channel) {
					var minValue = indicesMin[channel];
					var maxValue = indicesMax[channel];
					var topShift = waveformPlacements[channel].top;
					var halfHeight = waveformPlacements[channel].height * 0.5;

					var lineStart = (1 + minValue) * halfHeight;

					this.drawingContext.moveTo(currentPixel, topShift + lineStart);
					this.drawingContext.lineTo(currentPixel + 1, topShift + lineStart + Math.max(1, (maxValue - minValue) * halfHeight));

					indicesMin[channel] = 1;
					indicesMax[channel] = -1;
				}

				++currentPixel;
				indicesTraversed = 0;
			}
		}
	},

	/**********************************************************************************************
		verticalPlacement - { top, height } for bar
		drawingTemplate - drawing template { topScale, heightScale, drawMarks, borderWidth, borderColor, fillAlpha, fillColor }
		pageTimeShift - start of drawing time range, in miliseconds
		pageTimeLength - length of drawing time range, in miliseconds
		barTimeShift - start of bar time range, in miliseconds
		barTimeLength - length of bar time range, in miliseconds
	*/
	drawBar: function (verticalPlacement, drawingTemplate, pageTimeShift, pageTimeLength, barTimeShift, barTimeLength) {
		var milisecondsPerPixel = pageTimeLength / this.controlWidth;

		var barPixelShift = Math.round((barTimeShift - pageTimeShift) / milisecondsPerPixel);
		var barPixelLength = Math.round(barTimeLength / milisecondsPerPixel);

		var barTop = Math.round(verticalPlacement.top + verticalPlacement.height * drawingTemplate.topScale);
		var barHeight = Math.round(verticalPlacement.height * drawingTemplate.heightScale);

		// Fill background
		this.drawingContext.globalAlpha = drawingTemplate.fillAlpha;

		this.drawingContext.fillStyle = drawingTemplate.fillColor;
		this.drawingContext.fillRect(
			barPixelShift + drawingTemplate.borderWidth, barTop,
			barPixelLength - drawingTemplate.borderWidth * 2, barHeight);

		this.drawingContext.globalAlpha = 1;

		// Draw borders
		this.drawingContext.fillStyle = drawingTemplate.borderColor;

		this.drawingContext.fillRect(
			barPixelShift, barTop,
			drawingTemplate.borderWidth, barHeight);

		this.drawingContext.fillRect(
			barPixelShift + barPixelLength - drawingTemplate.borderWidth, barTop,
			drawingTemplate.borderWidth, barHeight);

		if (barTop != verticalPlacement.top) {
			this.drawingContext.fillRect(
				barPixelShift, barTop,
				barPixelLength, drawingTemplate.borderWidth);
		}

		if (barHeight != verticalPlacement.height) {
			this.drawingContext.fillRect(
				barPixelShift, barTop + barHeight - drawingTemplate.borderWidth,
				barPixelLength, drawingTemplate.borderWidth);
		}

		// Draw marks
		if (drawingTemplate.drawMarks) {
			this.drawingContext.fillStyle = "#04408c";

			this.drawingContext.fillText(barTimeShift.toString(), barPixelShift, barTop);
			this.drawingContext.fillText((barTimeShift + barTimeLength).toString(), barPixelShift + barPixelLength, barTop);

			this.drawingContext.fillStyle = drawingTemplate.borderColor;
		}
	},

	/**********************************************************************************************/
	drawTimemarks: function () {
		// draw timemarks top #Tmt   

		var marksOnTop = this.controlWidth / 40; // 40 px width for time in format mm : ss
		var pesMarks = Math.floor(this.audioData.soundDuration / 1000); // marks per each second
		if (pesMarks < marksOnTop)
			marksOnTop = pesMarks;

		var sectionTopTmt = this.scrollerTop;
		var milisecondsPerPageTmt = this.audioData.soundDuration;
		var pageTimeLengthTmt = this.audioData.soundDuration;
		var meterTopTmt = sectionTopTmt;
		var meterHeightTmt = this.optionMeterHeight;
		var indicesPerPixelTmt = (milisecondsPerPageTmt * this.audioData.indicesPerMilisecond) / this.controlWidth;
		// Marks with descriptions
		var milisecondsPerMarkTmt = pageTimeLengthTmt / marksOnTop;
		var markCountTmt = Math.floor(pageTimeLengthTmt / milisecondsPerMarkTmt);

		if (milisecondsPerMarkTmt == 0) return;

		for (var i = 1; i != markCountTmt; ++i) {
			var markShiftTmt = Math.round(i * milisecondsPerMarkTmt * this.audioData.indicesPerMilisecond / indicesPerPixelTmt);
			if (markShiftTmt > this.controlWidth) break;

			this.drawingContext.fillStyle = "rgb(152,200,255)";
			this.drawingContext.fillRect(markShiftTmt - 1, meterTopTmt + meterHeightTmt - 3, 1, 3);
			this.drawingContext.fillStyle = "#428bca";
			this.drawingContext.fillRect(markShiftTmt, meterTopTmt + meterHeightTmt - 3, 1, 3);

			var markMilisecondsTmt = i * milisecondsPerMarkTmt;
			var markTextTmt = this.msToTime(markMilisecondsTmt);

			this.drawingContext.fillStyle = "#04408c";
			this.drawingContext.fillText(markTextTmt, markShiftTmt, meterTopTmt + meterHeightTmt - 2);
		}

		// draw timemarks bottom #Tmb  

		var marksOnBottom = this.controlWidth / 66; // 70 px width for time in format mm : ss: ms

		var meterTopTmb = this.viewerTop;
		var meterHeightTmb = this.optionMeterHeight;
		var milisecondsPerPageTmb = this.currentTimeLength;
		var pageTimeLengthTmb = this.audioData.soundDuration;
		var indicesPerPixelTmb = (milisecondsPerPageTmb * this.audioData.indicesPerMilisecond) / this.controlWidth;

		// Marks with descriptions
		var milisecondsPerMarkTmb = this.currentTimeLength / marksOnBottom; //pageTimeLengthTmb / divCoef;
		var markCountTmb = Math.floor(pageTimeLengthTmb / milisecondsPerMarkTmb);
		milisecondsPerMarkTmb = this.audioData.soundDuration / markCountTmb;

		if (milisecondsPerMarkTmb == 0) { return; }
		var showMs = true;

		for (var j = 1; j != markCountTmb; ++j) {
			var markShiftTmb = Math.round(j * milisecondsPerMarkTmb * this.audioData.indicesPerMilisecond / indicesPerPixelTmb);
			var markShiftTmb2 = Math.round(this.currentTimeShift * this.audioData.indicesPerMilisecond / indicesPerPixelTmb);

			this.drawingContext.fillStyle = "rgb(152,200,255)";
			this.drawingContext.fillRect(markShiftTmb - markShiftTmb2 - 1, meterTopTmb + meterHeightTmb - 3, 1, 3);
			this.drawingContext.fillStyle = "#04408c";
			this.drawingContext.fillRect(markShiftTmb - markShiftTmb2, meterTopTmb + meterHeightTmb - 3, 1, 3);

			var markMilisecondsTmb = j * milisecondsPerMarkTmb;
			var markTextTmb = this.msToTime(markMilisecondsTmb, showMs);

			this.drawingContext.fillStyle = "#04408c";
			this.drawingContext.fillText(markTextTmb, markShiftTmb - markShiftTmb2, meterTopTmb + meterHeightTmb - 2);
		}
	},


	/**********************************************************************************************/
	msToTime: function (msTime, showMs) {
		var milliseconds = parseInt((msTime % 1000))
			, seconds = parseInt((msTime / 1000) % 60)
			, minutes = parseInt((msTime / (1000 * 60)) % 60)
			, hours = parseInt((msTime / (1000 * 60 * 60)) % 24);

		//hours = (hours < 10) ? "0" + hours : hours;
		minutes = (minutes < 10) ? '0' + minutes : minutes;
		seconds = (seconds < 10) ? '0' + seconds : seconds;

		if (showMs) {
			var fMilliseconds = Math.floor(milliseconds / 10) * 10;
			var rMilliseconds = fMilliseconds;
			if (milliseconds < 100) {
				rMilliseconds = '0' + fMilliseconds;

				if (milliseconds < 10) {
					rMilliseconds = '00' + fMilliseconds;
				}
			}
			return minutes + ':' + seconds + ':' + rMilliseconds;
		}

		return minutes + ':' + seconds;
	},


	/**********************************************************************************************/
	updateDrawingContext: function () {
		if (this.loadingState) {
			this.drawingContext.clearRect(0, 0, this.controlWidth, this.controlHeight);
		}
		else if (this.audioData) {
			// Firefox deletes channels data buffers when a playing ends.
			// To bypass this it is needed to reobtain channels data buffers for each channel.
			if (Ext.isGecko && this.audioData.channelData[0].length == 0) {
				for (var channelIndex = 0; channelIndex != this.audioData.channelCount; ++channelIndex) {
					this.audioData.channelData[channelIndex] = this.audioPlayer.getChannelData(channelIndex);
				}
			}

			// Draw scroller
			this.drawingContext.putImageData(this.scrollerImage, 0, this.scrollerTop);

			// Draw viewer backgrounds
			for (var channel = 0; channel != this.audioData.channelCount; ++channel) {
				this.drawWaveformBackground(this.viewerWaveformPlacements[channel]);
			}

			// Draw viewer waveforms
			this.drawingContext.beginPath();

			this.drawWaveform(this.viewerWaveformPlacements, this.currentTimeShift, this.currentTimeLength);

			this.drawingContext.lineWidth = 1;
			this.drawingContext.strokeStyle = this.optionWaveformColor;
			this.drawingContext.stroke();

			// Draw meter background
			this.drawingContext.fillStyle = this.optionBarFillColor;
			this.drawingContext.fillRect(0, this.viewerTop, this.controlWidth, this.optionMeterHeight);

			// Draw meter border
			this.drawingContext.fillStyle = this.optionBarBorderColor;
			this.drawingContext.fillRect(0, this.viewerTop, this.controlWidth, 1);

			this.drawingContext.fillRect(0, this.viewerTop + this.optionMeterHeight, this.controlWidth, 1);

			// Draw thumb bar
			this.drawBar(
				this.scrollerThumbPlacement, this.optionThumbTemplate,
				0, this.audioData.soundDuration, this.currentTimeShift, this.currentTimeLength);

			// Set text parameters
			this.drawingContext.font = this.optionTextFont;
			this.drawingContext.textAlign = this.optionTextAlign;
			this.drawingContext.textBaseline = this.optionTextBaseline;

			// Draw speech segments
			for (var speechSegmentIndex = 0; speechSegmentIndex != this.speechSegments.length; ++speechSegmentIndex) {
				var speechSegment = this.speechSegments[speechSegmentIndex];
				var speechStart = speechSegment.timeStart;
				var speechEnd = speechSegment.timeStart + speechSegment.timeLength;
				var pageStart = this.currentTimeShift;
				var pageEnd = this.currentTimeShift + this.currentTimeLength;

				if ((speechStart >= pageStart && speechStart < pageEnd) ||
					(speechEnd >= pageStart && speechEnd < pageEnd) ||
					(speechStart < pageStart && speechEnd >= pageEnd)) {
					this.drawBar(
						this.viewerWaveformPlacements[speechSegment.channelIndex], this.optionSpeechBarTemplate,
						this.currentTimeShift, this.currentTimeLength,
						speechSegment.timeStart, speechSegment.timeLength);
				}
			}

			this.drawTimemarks();
		}
		else {
			this.drawingContext.fillStyle = "#ffffff";
			this.drawingContext.fillRect(0, 0, this.controlWidth, this.controlHeight);

			//			this.drawingContext.clearRect(0, 0, this.controlWidth, this.controlHeight);
		}
	},

	/**********************************************************************************************/
	updateScroll: function (delta) {
		this.stopPlayer();

		switch (this.dragMode) {
			case Waveform.DragMode.ReverseScroll:
				var newTimeShift = this.currentTimeShift + Math.round(delta / this.controlWidth * this.currentTimeLength);

				if (newTimeShift < 0) {
					newTimeShift = 0;
				}
				else if (newTimeShift > this.audioData.soundDuration - this.currentTimeLength) {
					newTimeShift = this.audioData.soundDuration - this.currentTimeLength;
				}

				if (this.currentTimeShift != newTimeShift) {
					this.currentTimeShift = newTimeShift;

					this.updateDrawingContext();

					this.fireEventArgs(Waveform.pageChanged, [this.currentTimeShift, this.currentTimeLength]);
				}
				break;

			case Waveform.DragMode.Scroll:
				var newTimeShift = this.currentTimeShift + Math.round(delta / this.controlWidth * this.audioData.soundDuration);

				if (newTimeShift < 0) {
					newTimeShift = 0;
				}
				else if (newTimeShift > this.audioData.soundDuration - this.currentTimeLength) {
					newTimeShift = this.audioData.soundDuration - this.currentTimeLength;
				}

				if (this.currentTimeShift != newTimeShift) {
					this.currentTimeShift = newTimeShift;

					this.updateDrawingContext();

					this.fireEventArgs(Waveform.pageChanged, [this.currentTimeShift, this.currentTimeLength]);
				}
				break;

			case Waveform.DragMode.LeftResize:
				var newTimeShift = this.currentTimeShift + Math.round(delta / this.controlWidth * this.audioData.soundDuration);
				var maxTimeShift = Math.round(this.currentTimeShift + this.currentTimeLength - this.currentMilisecondsPerPage * 0.1);

				if (newTimeShift < 0) {
					newTimeShift = 0;
				}
				else if (newTimeShift > maxTimeShift) {
					newTimeShift = maxTimeShift;
				}

				if (this.currentTimeShift != newTimeShift) {
					this.currentMilisecondsPerPage = this.currentTimeShift + this.currentTimeLength - newTimeShift;
					this.currentTimeLength = Math.min(this.currentMilisecondsPerPage, this.audioData.soundDuration);
					this.currentTimeShift = newTimeShift;

					this.updateDrawingContext();

					this.fireEventArgs(Waveform.pageChanged, [this.currentTimeShift, this.currentTimeLength]);
				}
				break;

			case Waveform.DragMode.RightResize:
				var newTimeLength = this.currentTimeLength + Math.round(delta / this.controlWidth * this.audioData.soundDuration);
				var minTimeLength = Math.round(this.currentMilisecondsPerPage * 0.1);

				if (newTimeLength < minTimeLength) {
					newTimeLength = minTimeLength;
				}
				else if (this.currentTimeShift + newTimeLength > this.audioData.soundDuration) {
					newTimeLength = this.audioData.soundDuration - this.currentTimeShift;
				}

				if (this.currentTimeLength != newTimeLength) {
					this.currentMilisecondsPerPage = newTimeLength;
					this.currentTimeLength = Math.min(this.currentMilisecondsPerPage, this.audioData.soundDuration);

					this.updateDrawingContext();

					this.fireEventArgs(Waveform.pageChanged, [this.currentTimeShift, this.currentTimeLength]);
				}
				break;
		}

		this.saveUserChangedOptions();
	},

	/**********************************************************************************************/
	updateCursor: function (pageX, pageY) {
		var localX = pageX - this.canvasElement.getX();
		var localY = pageY - this.canvasElement.getY();

		var thumbRect = this.getThumbRect();

		if (this.dragStart != 0) {
			if (Ext.browser.is.WebKit) {
				this.canvasElement.setStyle("cursor", "-webkit-grabbing");
			}
			else if (Ext.browser.is.Firefox) {
				this.canvasElement.setStyle("cursor", "-moz-grabbing");
			}
		}
		else if (thumbRect && thumbRect.hitTestVertical(localY)) {
			if (Math.abs(localX - thumbRect.left) < 4 || Math.abs(localX - thumbRect.right) < 4) {
				this.canvasElement.setStyle("cursor", "col-resize");
			}
			else if (thumbRect.hitTestHorizontal(localX)) {
				if (Ext.browser.is.WebKit) {
					this.canvasElement.setStyle("cursor", "-webkit-grab");
				}
				else if (Ext.browser.is.Firefox) {
					this.canvasElement.setStyle("cursor", "-moz-grab");
				}
			}
		}
		else {
			this.canvasElement.setStyle("cursor", "auto");
		}
	},

	/**********************************************************************************************/
	updatePrecachedData: function () {
		// Save waveform placements
		this.scrollerWaveformPlacements = this.getWaveformPlacements(this.scrollerTop, this.scrollerHeight);
		this.viewerWaveformPlacements = this.getWaveformPlacements(this.viewerTop, this.viewerHeight);

		// Save thumb placement
		this.scrollerThumbPlacement = this.getSelectionPlacement(this.scrollerWaveformPlacements, this.optionThumbTemplate);

		// Clear background
		this.drawingContext.clearRect(0, this.scrollerTop, this.controlWidth, this.scrollerHeight);

		// Draw waveforms background
		for (var channel = 0; channel != this.audioData.channelCount; ++channel) {
			this.drawWaveformBackground(this.scrollerWaveformPlacements[channel]);
		}

		// Draw waveforms content
		this.drawingContext.beginPath();

		this.drawWaveform(this.scrollerWaveformPlacements, 0, this.audioData.soundDuration);

		this.drawingContext.lineWidth = 1;
		this.drawingContext.strokeStyle = this.optionWaveformColor;
		this.drawingContext.stroke();

		// Draw meter background
		this.drawingContext.fillStyle = this.optionBarFillColor;
		this.drawingContext.fillRect(0, 0, this.controlWidth, this.optionMeterHeight);

		// Draw meter border
		this.drawingContext.fillStyle = this.optionBarBorderColor;
		this.drawingContext.fillRect(0, this.optionMeterHeight, this.controlWidth, 1);

		// Save scroller image
		this.scrollerImage = this.drawingContext.getImageData(0, this.scrollerTop, this.controlWidth, this.scrollerHeight);
	},

	/**********************************************************************************************/
	getWaveformPlacements: function (top, height) {
		var placements = new Array(this.audioData.channelCount);

		var heightWithoutMeter = height - this.optionMeterHeight;
		var heightRemainder = heightWithoutMeter % this.audioData.channelCount;
		var heightAligned = heightWithoutMeter - heightRemainder;
		var heightForWaveform = heightAligned / this.audioData.channelCount;

		for (var i = 0; i != placements.length; ++i) {
			placements[i] = {
				top: top + this.optionMeterHeight + heightRemainder + heightForWaveform * i,
				height: heightForWaveform
			};
		}

		return placements;
	},

	/**********************************************************************************************/
	getSelectionPlacement: function (waveformPlacements, selectionTemplate) {
		var selectionTop = waveformPlacements[0].top;
		var selectionHeight = waveformPlacements[waveformPlacements.length - 1].top + waveformPlacements[waveformPlacements.length - 1].height - selectionTop;

		if (selectionTemplate.topFactor) {
			selectionTop += selectionHeight * selectionTemplate.topFactor;
		}
		if (selectionTemplate.heightFactor) {
			selectionHeight *= selectionTemplate.heightFactor;
		}

		return { top: selectionTop, height: selectionHeight };
	},

	/**********************************************************************************************/
	getThumbRect: function () {
		if (this.audioData) {
			var milisecondsPerPixel = this.audioData.soundDuration / this.controlWidth;

			var left = Math.round(this.currentTimeShift / milisecondsPerPixel);
			var width = Math.round(this.currentTimeLength / milisecondsPerPixel);
			var top = this.scrollerThumbPlacement.top;
			var height = this.scrollerThumbPlacement.height;

			return new Rect(left, top, left + width, top + height);
		}
		return null;
	},

	/**********************************************************************************************/
	hitTestForChannelIndex: function (waveformPlacements, localX, localY) {
		for (var channel = 0; channel != waveformPlacements.length; ++channel) {
			if (localY >= waveformPlacements[channel].top && localY < waveformPlacements[channel].top + waveformPlacements[channel].height) {
				return channel;
			}
		}
		return -1;
	},

	/**********************************************************************************************/
	onResize: function (width, height, oldWidth, oldHeight) {
		width = Math.floor(width);
		height = Math.floor(height);

		this.controlWidth = width;
		this.controlHeight = height;

		this.scrollerTop = 0;
		this.scrollerHeight = Math.floor(this.controlHeight * this.optionScrollerRelativeHeight);

		this.viewerTop = this.scrollerHeight;
		this.viewerHeight = this.controlHeight - this.viewerTop;

		if (this.canvasElement) {
			this.canvasElement.setSize(width, height);
			this.canvasElement.dom.width = width;
			this.canvasElement.dom.height = height;
		}

		if (this.audioData) {
			this.updatePrecachedData();
		}

		if (this.canvasElement) {
			this.updateDrawingContext();
		}
	},

	/**********************************************************************************************/
	onTap: function (event, node, options, eOpts) {
		var localX = event.pageX - this.canvasElement.getX();
		var localY = event.pageY - this.canvasElement.getY();

		if (this.audioData) {
			if (this.playerUpdater) {
				this.stopPlayer();
			}
			else {
				var channelIndex = this.hitTestForChannelIndex(this.viewerWaveformPlacements, localX, localY);

				if (channelIndex != -1) {
					var hittingTimeShift = this.currentTimeShift + Math.round(localX / this.controlWidth * this.currentTimeLength);

					if (event.altKey == true)
						this.loadPlayer(channelIndex, hittingTimeShift);
					else
						this.loadPlayer(-1, hittingTimeShift);
				}
			}
		}
	},

	/**********************************************************************************************/
	onDoubleTap: function (event, node, options, eOpts) {
		var localX = event.pageX - this.canvasElement.getX();
		var localY = event.pageY - this.canvasElement.getY();
	},

	/**********************************************************************************************/
	onTouchMove: function (event, node, options, eOpts) {
		this.updateCursor(event.pageX, event.pageY);
	},

	/**********************************************************************************************/
	onDragStart: function (event, node, options, eOpts) {

		if (event.altKey == true) return;

		var localX = event.pageX - this.canvasElement.getX() - event.deltaX;
		var localY = event.pageY - this.canvasElement.getY() - event.deltaY;

		var thumbRect = this.getThumbRect();

		if (thumbRect && thumbRect.hitTestVertical(localY)) {
			if (Math.abs(localX - thumbRect.left) < 4) {
				this.dragMode = Waveform.DragMode.LeftResize;
			}
			else if (Math.abs(localX - thumbRect.right) < 4) {
				this.dragMode = Waveform.DragMode.RightResize;
			}
			else if (thumbRect.hitTestHorizontal(localX)) {
				this.dragMode = Waveform.DragMode.Scroll;
			}

			this.dragStart = event.deltaX;
		}
		else if (localY >= this.viewerTop && localY < this.viewerTop + this.viewerHeight) {
			this.dragMode = Waveform.DragMode.ReverseScroll;
			this.dragStart = event.deltaX;
		}
	},

	/**********************************************************************************************/
	onDragEnd: function (event, node, options, eOpts) {

		if (this.dragStart != 0) {
			this.updateScroll(event.deltaX - this.dragStart);
			this.dragStart = 0;
			this.dragMode = null;
		}

		this.updateCursor(event.pageX, event.pageY);
	},

	/**********************************************************************************************/
	onDragMove: function (event, node, options, eOpts) {
		if (this.dragStart != 0 && this.dragStart != event.deltaX) {
			if (this.dragMode == Waveform.DragMode.ReverseScroll) {
				this.updateScroll(this.dragStart - event.deltaX);
			}
			else {
				this.updateScroll(event.deltaX - this.dragStart);
			}
			this.dragStart = event.deltaX;
		}
	},

	/**********************************************************************************************/
	onAudioDecoded: function () {
		this.audioData = {};
		this.audioData.soundDuration = this.audioPlayer.getDuration() * 1000;
		this.audioData.sampleRate = this.audioPlayer.getSampleRate();
		this.audioData.channelCount = this.audioPlayer.getChannelCount();
		this.audioData.channelData = new Array(this.audioData.channelCount);

		for (var channelIndex = 0; channelIndex != this.audioData.channelCount; ++channelIndex) {
			this.audioData.channelData[channelIndex] = this.audioPlayer.getChannelData(channelIndex);
		}

		this.audioData.sampleCount = this.audioData.channelData[0].length;
		this.audioData.indicesPerMilisecond = this.audioData.sampleCount / this.audioData.soundDuration;

		this.currentTimeShift = 0;
		this.currentTimeLength = Math.min(this.audioData.soundDuration, this.currentMilisecondsPerPage);

		if (this.optionChannelHeight != 0) {
			this.setHeight(this.optionChannelHeight * this.audioData.channelCount);
		}

		this.loadingState = false;

		this.updatePrecachedData();
		this.updateDrawingContext();

		this.fireEventArgs(Waveform.loadingCompleted, [this.audioData.channelCount]);
		this.fireEventArgs(Waveform.pageChanged, [this.currentTimeShift, this.currentTimeLength]);
	},

	/**********************************************************************************************/
	onAudioDecodingFailed: function () {
		this.audioData = null;

		this.currentTimeShift = 0;
		this.currentTimeLength = 0;

		this.loadingState = false;

		this.updateDrawingContext();

		this.fireEvent(Waveform.loadingFailed);
		this.fireEventArgs(Waveform.pageChanged, [this.currentTimeShift, this.currentTimeLength]);
	},

	/**********************************************************************************************/
	onAudioPlayingCompleted: function () {
		this.fireEvent(Waveform.playingFinished);
		this.freePlayer();
	}
});
