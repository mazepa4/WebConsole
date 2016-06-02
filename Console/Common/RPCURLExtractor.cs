using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace RPC
{
	//---------------------------------------------------------------------
	public class ExtractedURL
	{
		public string	url;
		public string	title;
		public string	text;
		public string	lang;
	}

	//---------------------------------------------------------------------
	public interface IURLExtractor
	{
		ExtractedURL ProcessURL(string url);
		string DetectLanguage(string text);
	}
}