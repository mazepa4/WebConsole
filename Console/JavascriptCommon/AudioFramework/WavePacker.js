/**************************************************************************************************
*** WavePacker
**************************************************************************************************/
Ext.define("WavePacker", {
	sampleRate: 0,
	channelCount: 0,
	sampleCount: 0,
	audioChunks: null,

	/**********************************************************************************************/
	constructor: function (sampleRate, channelCount, sampleCount, audioChunks) {
		this.sampleRate = sampleRate;
		this.channelCount = channelCount;
		this.sampleCount = sampleCount;
		this.audioChunks = audioChunks;
	},

	/**********************************************************************************************/
	pack: function () {
		var audioDataLength = this.channelCount * this.sampleCount * 2;

		var buffer = new ArrayBuffer(44 + audioDataLength);
		var view = new DataView(buffer);

		// File description header (the ASCII text string "RIFF")
		this.writeString(view, 0, "RIFF");
		// Size of file (the file size not including the "RIFF" description (4 bytes) and file description (4 bytes), this is file size - 8)
		view.setUint32(4, 32 + audioDataLength, true);
		// WAV description header (the ASCII text string "WAVE")
		this.writeString(view, 8, "WAVE");
		// Format description header (the ASCII text string "fmt ", the space is also included)
		this.writeString(view, 12, "fmt ");
		// Size of WAVE section chunck ((2 bytes) + mono/stereo flag (2 bytes) + sample rate (4 bytes) + bytes per sec (4 bytes) + block alignment (2 bytes) + bits per sample (2 bytes), this is usually 16)
		view.setUint32(16, 16, true);
		// Type of WAVE format (this is a PCM header = $01 (linear quntization), other values indicates some forms of compression)
		view.setUint16(20, 1, true);
		// Number of channels (mono ($01) or stereo ($02))
		view.setUint16(22, this.channelCount, true);
		// Samples per second (the frequency of quantization (usually 44100 Hz, 22050 Hz, ...))
		view.setUint32(24, this.sampleRate, true);
		// Bytes per second (speed of data stream = Number_of_channels*Samples_per_second*Bits_per_Sample/8)
		view.setUint32(28, this.channelCount * this.sampleRate * 2, true);
		// Block alignment (number of bytes in elementary quantization = Number_of_channels*Bits_per_Sample/8)
		view.setUint16(32, this.channelCount * 2, true);
		// Bits per sample
		view.setUint16(34, 16, true);
		// Data chunk identifier
		this.writeString(view, 36, "data");
		// Data chunk length
		view.setUint32(40, audioDataLength, true);

		// Data offset
		var offset = 44;

		// Iterate over chunks
		for (var chunkIndex = 0; chunkIndex != this.audioChunks.length; ++chunkIndex) {
			// Iterate over samples in chunk
			for (var sampleIndex = 0; sampleIndex != this.audioChunks[chunkIndex][0].length; ++sampleIndex) {
				// Iterate over channels for each sample
				for (var channelIndex = 0; channelIndex != this.channelCount; ++channelIndex) {
					var sample = this.audioChunks[chunkIndex][channelIndex][sampleIndex];

					view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);

					offset += 2;
				}
			}
		}

		return buffer;
	},

	/**********************************************************************************************/
	writeString: function (view, offset, string) {
		for (var i = 0; i != string.length; ++i) {
			view.setUint8(offset + i, string.charCodeAt(i));
		}
	}
});
