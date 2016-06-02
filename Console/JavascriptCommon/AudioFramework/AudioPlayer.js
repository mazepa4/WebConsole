/**************************************************************************************************
*** AudioPlayer
**************************************************************************************************/
Ext.define("AudioPlayer", {
	mixins: ["Ext.mixin.Observable"],

	statics: {
		audioContext: window.AudioContext ? new AudioContext() : window.webkitAudioContext ? new webkitAudioContext() : null,

		audioDecoded: "audioDecoded",
		audioDecodingFailed: "audioDecodingFailed",
		audioPlayingCompleted: "audioPlayingCompleted"
	},

	channelSplitter: null,
	masterGain: null,
	bufferedSource: null,
	audioBuffer: null,

	gainLevel: 1,
	playingStartTime: 0,

	/**********************************************************************************************/
	constructor: function (config) {
		this.mixins.observable.constructor.call(this, config);
	},

	/**********************************************************************************************/
	isLoaded: function () {
		return this.audioBuffer != null;
	},

	/**********************************************************************************************/
	decode: function (soundData) {
		if (!AudioPlayer.audioContext) {
			return false;
		}

		this.free();

		AudioPlayer.audioContext.decodeAudioData(soundData,
			function (buffer) {
				this.audioBuffer = buffer;
				this.fireEvent(AudioPlayer.audioDecoded);
			}.bind(this),
			function (error) {
				this.audioBuffer = null;
				this.fireEvent(AudioPlayer.audioDecodingFailed);
			}.bind(this)
		);

		return true;
	},

	/**********************************************************************************************/
	free: function () {
		this.stopPlaying();

		if (this.audioBuffer) {
			delete this.audioBuffer;
			this.audioBuffer = null;
		}
	},

	/**********************************************************************************************/
	playAudio: function (channelIndex, offset, duration) {
		if (this.audioBuffer) {
			this.stopPlaying();

			var curDest = AudioPlayer.audioContext.destination;

			// Splitter
			if (channelIndex != null && channelIndex != -1) {
				this.channelSplitter = AudioPlayer.audioContext.createChannelSplitter(this.audioBuffer.numberOfChannels);
				this.channelSplitter.connect(AudioPlayer.audioContext.destination, channelIndex);

				curDest = this.channelSplitter;
			}

			// Gain
			this.masterGain = AudioPlayer.audioContext.createGain();
			this.masterGain.gain.value = this.gainLevel;

			this.masterGain.connect(curDest);

			curDest = this.masterGain;

			// Source
			this.bufferedSource = AudioPlayer.audioContext.createBufferSource();
			this.bufferedSource.loop = false;
			this.bufferedSource.buffer = this.audioBuffer;

			this.bufferedSource.onended = function () {
				this.playingStartTime = 0;
				this.fireEvent(AudioPlayer.audioPlayingCompleted);
			}.bind(this);

			this.bufferedSource.connect(curDest);

			if (offset != null) {
				if (duration != null) {
					this.bufferedSource.start(0, offset * 0.001, duration * 0.001);
				}
				else {
					this.bufferedSource.start(0, offset * 0.001);
				}
			}
			else {
				this.bufferedSource.start();
			}

			this.playingStartTime = AudioPlayer.audioContext.currentTime;
		}
	},

	/**********************************************************************************************/
	stopPlaying: function () {
		this.playingStartTime = 0;

		if (this.masterGain) {
			this.masterGain.disconnect();
			this.masterGain = null;
		}
		if (this.bufferedSource) {
			this.bufferedSource.stop(0);
			this.bufferedSource.disconnect();
			this.bufferedSource = null;
		}
	},

	/**********************************************************************************************/
	setGainLevel: function (level) {
		this.gainLevel = level;

		if (this.masterGain) {
			this.masterGain.gain.value = this.gainLevel;
		}
	},

	/**********************************************************************************************/
	getGainLevel: function () {
		return this.gainLevel;
	},

	/**********************************************************************************************/
	getPlayingTime: function () {
		return AudioPlayer.audioContext.currentTime - this.playingStartTime;
	},

	/**********************************************************************************************/
	getChannelCount: function () {
		if (this.audioBuffer) {
			return this.audioBuffer.numberOfChannels;
		}
		return null;
	},

	/**********************************************************************************************/
	getChannelData: function (channelIndex) {
		if (this.audioBuffer) {
			return this.audioBuffer.getChannelData(channelIndex);
		}
		return null;
	},

	/**********************************************************************************************/
	getDuration: function () {
		if (this.audioBuffer) {
			return this.audioBuffer.duration;
		}
		return null;
	},

	/**********************************************************************************************/
	getSampleRate: function () {
		if (this.audioBuffer) {
			return this.audioBuffer.sampleRate;
		}
		return null;
	}
});
