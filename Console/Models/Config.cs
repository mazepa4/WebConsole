using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Runtime.Serialization;

namespace WebConsole.Models
{
	public class Attempt : IComparable<Attempt>
	{
		public string			repository;
		public bool				success;
		public string			message;
		public DateTime			time;
		public bool				updated = false;

		public int CompareTo(Attempt other)
		{
			// If other is not a valid object reference, this instance is greater
			if (other == null) return 1;
			return repository.CompareTo(other.repository);
		}
	};

	public class BuildResult
	{
		public string			status;
		public List<ReposLogEntry>	reposLogs;
	};

	public struct ReposLogEntry{
		public string title { set; get; }
		public string[] logs{ set; get; }
	}
}
