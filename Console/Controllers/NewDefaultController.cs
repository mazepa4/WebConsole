using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Web.Hosting;
using System.Web.Http;
using System.Diagnostics;
using WebConsole.Models;

namespace WebConsole.Controllers
{
	[System.Web.Http.RoutePrefix("NewDefault")]
	public class NewDefaultController : ApiController
	{

		/**********************************************************************************************/
		[HttpPost]
		[ActionName("ControlService")]
		public HttpResponseMessage ControlService([FromUri] string serviceName,[FromUri] string action)
		{

			//sudo service --status-all | grep apache2
			string command = serviceName+" "+action;
			string reponseText = String.Empty;
			string output = PerformTerminalCommand ("service", command);
			if (output == "")
				reponseText = "Operation Successfull";
			else
				reponseText = "Error: " + output;	
			// Build response
			var response = new HttpResponseMessage(HttpStatusCode.OK);
			response.Content = new StringContent(reponseText);
			response.Content.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
			return response;
		}

		/**********************************************************************************************/
		[HttpGet]
		[ActionName("CheckAutobuildStatus")]
		public HttpResponseMessage CheckAutobuildStatus()
		{
			string output = PerformTerminalCommand ("ps", "aux");
			//sudo service --status-all | grep apache2
			string status = "Not running";
			int count= System.Text.RegularExpressions.Regex.Matches (output, "autobuild").Count;
			if (count > 1) 
			{
				status = "Running";
			}
			// Build response
			var response = new HttpResponseMessage(HttpStatusCode.OK);
			response.Content = new StringContent(status);
			response.Content.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
			return response;
		}

		[HttpGet]
		[ActionName("GetTime")]
		public HttpResponseMessage GetTime()
		{
			string relult = String.Empty;
			var d = DateTime.Now;
			var minutes = d.Minute;
			var seconds = d.Second;
			var rest_min = 5-minutes % 5-1;
			var rest_sec = 60-seconds;
			if(rest_min<=0) 
				relult =rest_sec+" seconds";
			else
				relult = rest_min +" minutes "+rest_sec+" seconds";
			string[] files = Directory.GetFiles("/var/log/autobuild-logs/");
			if (files.Length != 0) {
				var date = File.GetCreationTime (files [0]);
				relult += ";" + String.Format ("{0:d/M/yyyy HH:mm:ss}", date);
			}
			var response = new HttpResponseMessage(HttpStatusCode.OK);
			response.Content = new StringContent(relult);
			response.Content.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
			return response;
		}

		private string PerformTerminalCommand(string program,string command){
			ProcessStartInfo oInfo = new ProcessStartInfo(program, command);
			oInfo.UseShellExecute = false;
			oInfo.CreateNoWindow = true;

			oInfo.RedirectStandardOutput = true;
			oInfo.RedirectStandardError = true;

			StreamReader srOutput = null;
			StreamReader srError = null;

			Process proc = System.Diagnostics.Process.Start(oInfo);
			proc.WaitForExit();
			srOutput = proc.StandardOutput;
			string StandardOutput = srOutput.ReadToEnd();
			srError = proc.StandardError;
			string StandardError = srError.ReadToEnd();
			int exitCode = proc.ExitCode;
			proc.Close();
			return StandardError!="" ? StandardError:StandardOutput;
		}


	}
}
