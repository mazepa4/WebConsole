//-------------------------------------------------------------------------------------------------
/// AudioFormat
//-------------------------------------------------------------------------------------------------
var AudioFormat = {
	AudioUnknown:		0,					///< Unknown audio format
	AudioWave:			1,					///< Uncompressed Wave with RIFF header
	AudioFlac:			2,					///< FLAC with FLAC header
	AudioMpeg:			3,					///< MPEG layer-3 with id3v2 header
	AudioOpus:			4,					///< Opus audio in Ogg container
	AudioVorbis:		5					///< Vorbis audio in Ogg container
};

navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia);

//-------------------------------------------------------------------------------------------------
/// AudioRecorder
//-------------------------------------------------------------------------------------------------
Ext.define("AudioRecorder", {
	mixins: ["Ext.mixin.Observable"],

	statics: {
		audioContext: window.AudioContext ? new AudioContext() : window.webkitAudioContext ? new webkitAudioContext() : null,
		MediaRecorder: window.MediaRecorder || window.webkitMediaRecorder || window.mozMediaRecorder,

		chunkRecorded: "chunkRecorded",			// (inputBuffers: [Float32Array], inputSamplesCount: Number)
		chunkEncoded: "chunkEncoded"			// (encodedAudio: Blob)
	},

	enableNativeEncoder: false,

	fftSnapshot: null,
	channelCount: 0,

	audioStream: null,
	audioStreamSource: null,
	audioAnalyser: null,

	audioScriptProcessor: null,
	inputBufferLength: 4096,//16384,

	mediaRecorder: null,

	//---------------------------------------------------------------------------------------------
	constructor: function (config) {
		this.mixins.observable.constructor.call(this, config);
	},

	//---------------------------------------------------------------------------------------------
	startRecording: function () {
		if (this.mediaRecorder) {
			if (this.mediaRecorder.state == "inactive") {
				this.mediaRecorder.start();
			}
			else if (this.mediaRecorder.state == "paused") {
				this.mediaRecorder.resume();
			}
		}
		else {
			this.resetRecording();
			navigator.getUserMedia({ audio: true }, this.onStreamConnected.bind(this), this.onStreamFailed.bind(this));
		}
	},

	//---------------------------------------------------------------------------------------------
	stopRecording: function () {
		if (this.mediaRecorder) {
			if (this.mediaRecorder.state == "recording") {
				this.mediaRecorder.pause();
			}
		}
		else {
			this.resetRecording();
		}
	},

	//---------------------------------------------------------------------------------------------
	resetRecording: function () {
		if (this.mediaRecorder) {
			if (this.mediaRecorder.state != "inactive") {
				this.mediaRecorder.stop();
			}
			this.mediaRecorder = null;
		}

		if (this.audioScriptProcessor) {
			this.audioScriptProcessor.disconnect();
			this.audioScriptProcessor = null;
		}

		if (this.audioAnalyser) {
			this.audioAnalyser.disconnect();
			this.audioAnalyser = null;
		}

		if (this.audioSourceStream) {
			this.audioSourceStream.disconnect();
			this.audioSourceStream = null;
		}

		if (this.audioStream) {
			var audioTracks = this.audioStream.getAudioTracks();

			for (var i = 0; i != audioTracks.length; ++i) {
				audioTracks[i].stop();
			}

			this.audioStream = null;
		}

		this.fftSnapshot = null;
	},

	//---------------------------------------------------------------------------------------------
	snapshotFFT: function () {
		if (this.fftSnapshot && this.audioAnalyser) {
			this.audioAnalyser.getByteFrequencyData(this.fftSnapshot);
			return this.fftSnapshot;
		}
		return null;
	},

	//---------------------------------------------------------------------------------------------
	getChannelCount: function () {
		return this.channelCount;
	},

	//---------------------------------------------------------------------------------------------
	getSampleRate: function () {
		return AudioRecorder.audioContext.sampleRate;
	},

	//---------------------------------------------------------------------------------------------
	onStreamConnected: function (audioStream) {
		this.audioStream = audioStream;
	
		// Create stream source
		this.audioStreamSource = AudioRecorder.audioContext.createMediaStreamSource(this.audioStream);

		this.channelCount = this.audioStreamSource.channelCount;

		// Create analyser
		this.audioAnalyser = AudioRecorder.audioContext.createAnalyser();
		this.audioAnalyser.fftSize = 2048;

		this.fftSnapshot = new Uint8Array(this.audioAnalyser.frequencyBinCount);

		this.audioStreamSource.connect(this.audioAnalyser);

		// Create media recorder or script processor
		if (AudioRecorder.MediaRecorder && this.enableNativeEncoder) {
			this.mediaRecorder = new AudioRecorder.MediaRecorder(audioStream);

			this.mediaRecorder.ondataavailable = function (recordingEvent) {
				this.fireEventArgs(AudioRecorder.chunkEncoded, [recordingEvent.data]);
				console.log("Audio was encoded. Type: " + recordingEvent.data.type + ". Size: " + recordingEvent.data.size + ".");
			}.bind(this);

			this.mediaRecorder.start();
		}
		else {
			this.audioScriptProcessor = AudioRecorder.audioContext.createScriptProcessor(this.inputBufferLength, this.channelCount, this.channelCount);

			this.audioScriptProcessor.onaudioprocess = function (audioProcessingEvent) {
				// Copy each input channel into separate buffer
				var inputBuffers = new Array(this.channelCount);
				var inputSamplesCount = audioProcessingEvent.inputBuffer.length;

				for (var channelIndex = 0; channelIndex != this.channelCount; ++channelIndex) {
					inputBuffers[channelIndex] = new Float32Array(inputSamplesCount);

					var inputSamples = audioProcessingEvent.inputBuffer.getChannelData(channelIndex);

					for (var sampleIndex = 0; sampleIndex != inputSamplesCount; ++sampleIndex) {
						inputBuffers[channelIndex][sampleIndex] = inputSamples[sampleIndex];
					}
				}

				// Transmit accumulated samples to caller
				this.fireEventArgs(AudioRecorder.chunkRecorded, [inputBuffers, inputSamplesCount])
			}.bind(this);

			this.audioStreamSource.connect(this.audioScriptProcessor);
			this.audioScriptProcessor.connect(AudioRecorder.audioContext.destination);
		}
	},

	//---------------------------------------------------------------------------------------------
	onStreamFailed: function (errorMessage) {
		console.log("Audio recording is unaccessible.");
	}
});
