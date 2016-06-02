using System;
using TFrameworkSharp;

namespace VoiceGate
{
	/***************************************************************************************************
	*** AudioSegment
	***************************************************************************************************/
	[Serializable]
	public class AudioSegment
	{
		public ushort					channelIndex { get; set; }
		public uint						timeStart { get; set; }		// miliseconds
		public uint						timeLength { get; set; }	// miliseconds
	}

	/***************************************************************************************************
	*** SpeechSegment
	***************************************************************************************************/
	[Serializable]
	public class SpeechSegment : AudioSegment
	{
		public string					lang { get; set; }			// en-US, fr-FR, ru-RU
		public string					text { get; set; }
	}

	//-------------------------------------------------------------------------------------------------
	/// AudioFormat
	//-------------------------------------------------------------------------------------------------
	[Serializable]
	public enum AudioFormat : uint
	{
		AudioUnknown	= 0x00000000u,			///< Unknown audio format
		AudioWave,								///< Uncompressed Wave with RIFF header
		AudioFlac,								///< FLAC with FLAC header
		AudioMpeg,								///< MPEG layer-3 with id3v2 header
		AudioOpus,								///< Opus audio in Ogg container
		AudioVorbis								///< Vorbis audio in Ogg container
	};

	public static class AudioFormatExtensions
	{
		public static string Stringnify(this AudioFormat audioFormat)
		{
			switch (audioFormat)
			{
			case AudioFormat.AudioWave:
				return "wave";

			case AudioFormat.AudioFlac:
				return "flac";

			case AudioFormat.AudioMpeg:
				return "mpeg";

			case AudioFormat.AudioOpus:
				return "opus";

			case AudioFormat.AudioVorbis:
				return "vorbis";

			case AudioFormat.AudioUnknown:
				return "unknown";
			}

			return string.Empty;
		}
	}

	/***************************************************************************************************
	*** AudioFilter
	***************************************************************************************************/
	[Serializable]
	public enum AudioFilter : uint
	{
		CopySource = 0,
		AddNoise,
		Denoise
	};

	public static class AudioFilterExtensions
	{
		public static string Stringnify(this AudioFilter audioFilter)
		{
			switch (audioFilter)
			{
			case AudioFilter.CopySource:
				return "copysource";

			case AudioFilter.AddNoise:
				return "addnoise";

			case AudioFilter.Denoise:
				return "denoise";
			}

			return string.Empty;
		}
	}


	/***************************************************************************************************
	*** MultipleFileResponse
	***************************************************************************************************/
	[Serializable]
	public class MultipleFileResponse
	{
		public string					errorMessage  { get; set; }
		public byte[][]					fileData { get; set; }
	}

	/***************************************************************************************************
	*** SpeechSegmentsResponse
	***************************************************************************************************/
	[Serializable]
	public class SpeechSegmentsVariantResponse
	{
		public uint type { get; set; }
		public SpeechSegmentsResponse value { get; set; }
	}

	[Serializable]
	public class SpeechSegmentsResponse
	{
		public string					errorMessage { get; set; }
		public SpeechSegment[]			speechSegmentList { get; set; }
	}

	/***************************************************************************************************
	*** IVoiceGate
	***************************************************************************************************/
	public interface IVoiceGate
	{
		/**********************************************************************************************
			inputAudio		- audio data in supported format
			inputFormat		- input audio format
			audioFilter		- filter identifier to apply to decoded audio
			outputFormat	- requested audio format for output file
			return			- FileResponse, that is a file in specified output format
		*/
		FileResponse ModifyAudio(byte[] inputAudio, AudioFormat inputFormat, AudioFilter audioFilter, AudioFormat outputFormat);

		/**********************************************************************************************
			inputAudio		- audio data in supported format
			inputFormat		- input audio format
			audioFilter		- filter identifier to apply to decoded audio
			outputSegments	- array of time ranges
			outputFormat	- output audio format
			return			- MultipleFileResponse, that is an array of files in specified output format
		*/
		MultipleFileResponse SegmentizeAudio(byte[] inputAudio, AudioFormat inputFormat, AudioFilter audioFilter, AudioSegment[] outputSegments, AudioFormat outputFormat);

		/**********************************************************************************************
			inputAudio		- audio data in supported format
			inputFormat		- input audio format
			responseFormat	- specifies response serialization format, see \ref ResponseFormat
			return			- SpeechSegmentsVariantResponse, that serialized to format, specified by responseFormat
		*/
		SpeechSegmentsVariantResponse ClassifySpeech(byte[] inputAudio, AudioFormat inputFormat, ResponseFormat responseFormat);

		/**********************************************************************************************
			inputAudio		- input audio data in specified format
			inputFormat		- input audio format
			outputFormat	- output audio format
			return			- MultipleFileResponse, that is an array of files in specified output format
		*/
		MultipleFileResponse SegmentizeSpeech(byte[] inputAudio, AudioFormat inputFormat, AudioFormat outputFormat);
	}
}
