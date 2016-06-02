using System;
using System.Web.Mvc;
using System.Configuration;
using WebConsole.Models;
using System.ServiceProcess;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using System.Diagnostics;

namespace WebConsole.Controllers
{
	[Route("Default")]
	public class DefaultController : Controller
	{
		private readonly string		m_autoBuilderLogPath = ConfigurationManager.AppSettings.Get("builderLog");

		private readonly string[]	services = new string[]
		{
			"apache2",
			"bluetooth"
		};

		public class ServiceStatus
		{
			public string name;
			public string status;
			public bool running;
		}

		//---------------------------------------------------------------------
		[HttpGet]
		[ActionName("Index")]
		public ViewResult Index()
		{
			ViewBag.Message = System.Environment.MachineName;

			// Check for each service status
			ViewBag.services = new ServiceStatus[services.Length];
			int currService = 0;
			foreach (string serviceName in services)
			{
				
				using (var service = new ServiceController(serviceName))
				{
					int status = GetServiceStatus (serviceName);
					ViewBag.services[currService] = new ServiceStatus();
					ViewBag.services[currService].name = serviceName;

					if (status==-1) {
						ViewBag.services [currService].status = "Not installed";
						ViewBag.services [currService].running = false;
					} else if (status==0) {
						ViewBag.services [currService].status = "Stopped";
						ViewBag.services [currService].running = false;
					}
					else{
						ViewBag.services [currService].status = "Running";
						ViewBag.services [currService].running = true;
					}
					/*try
					{
						ViewBag.services[currService].status = service.Status.ToString();
						ViewBag.services[currService].running = (service.Status == ServiceControllerStatus.Running);
					}
					catch (Exception)
					{
						ViewBag.services[currService].status = "Not installed";
						ViewBag.services[currService].running = false;
					}*/
				}

				++currService;
			}

			return View("Index", "~/Views/Shared/LiteLayout.cshtml");
		}

		//---------------------------------------------------------------------
		[HttpGet]
		[ActionName("BuilderLog")]
		public ViewResult BuilderLog()
		{
			ViewBag.Message = "Builder Log";

			string responce_text = String.Empty;
			List<ReposLogEntry> logs = new List<ReposLogEntry> ();

			try{
				string[] files = Directory.GetFiles("/var/log/autobuild-logs/");
				foreach(var fileName in files){
					ReposLogEntry log = new ReposLogEntry();
					log.title = System.IO.Path.GetFileNameWithoutExtension(fileName);
					log.logs = System.IO.File.ReadAllLines(fileName);
					logs.Add(log);
				}
			}	
			catch(Exception ex){
				responce_text = "Error: " + ex.Message;
			}

			BuildResult buildResult = null;

			try
			{
				buildResult = new BuildResult { status = "OK", reposLogs = logs };
			}
			catch (Exception exception)
			{
				buildResult = new BuildResult { status = exception.Message, reposLogs = null };
			}

			//buildResult.attemps.Sort();

			return View("BuilderLog", "~/Views/Shared/LiteLayout.cshtml", buildResult);
		}

		//---------------------------------------------------------------------
		[HttpGet]
		public ActionResult RunAutoBuilder()
		{
			var domain = ConfigurationManager.AppSettings.Get("runBuildDomain");
			var login = ConfigurationManager.AppSettings.Get("runBuildLogin");
			var pass = ConfigurationManager.AppSettings.Get("runBuildPass");
			var tsFolder = ConfigurationManager.AppSettings.Get("taskSchedulerFolder");
			var tsTask = ConfigurationManager.AppSettings.Get("taskSchedulerTask");

			var impersonator = new Impersonator();

			if (impersonator.ImpersonateUser(login, domain, pass))
			{
				// Task scheduler approach
				var scheduler = new Microsoft.Win32.TaskScheduler.TaskService(null, null, null, null);

				if (!scheduler.Connected)
				{
					return RedirectToAction("BuilderLog");
				}

				var task = scheduler.GetFolder(tsFolder).Tasks[tsTask];

				if (task == null)
					return RedirectToAction("BuilderLog");

				task.Run(null);

				while (task.State == Microsoft.Win32.TaskScheduler.TaskState.Running)
					System.Threading.Thread.Sleep(500);

				impersonator.UndoImpersonation();
			}

			// Wait for task to complete
			return RedirectToAction("BuilderLog");
		}


		//---------------------------------------------------------------------
		[HttpPost]
		public ActionResult ControlService(string serviceName)
		{
			var domain = ConfigurationManager.AppSettings.Get("runBuildDomain");
			var login = ConfigurationManager.AppSettings.Get("runBuildLogin");
			var pass = ConfigurationManager.AppSettings.Get("runBuildPass");

			//var impersonator = new Impersonator();
			//if (impersonator.ImpersonateUser(login, domain, pass))
			{
				// Control service
				using (ServiceController service = new ServiceController(serviceName))
				{
					int status = GetServiceStatus (serviceName);
					if (service.Status == ServiceControllerStatus.Stopped)
					{
						service.Start();
						service.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(20.0));
					}
					else if (service.Status == ServiceControllerStatus.Running)
					{
						service.Stop();
						service.WaitForStatus(ServiceControllerStatus.Stopped, TimeSpan.FromSeconds(60.0));
						service.Start();
						service.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(20.0));
					}
				}

				//impersonator.UndoImpersonation();
			}

			// Wait for task to complete
			return RedirectToAction("Index");
		}


		/*
			return -1: service not installed
			return 0: servise not running
			return 1: service runing
		*/
		private int GetServiceStatus(string serviceName)
		{
			string output=PerformTerminalCommand("service", serviceName+" status");
			//check if service exist
			if (!output.Contains ("Loaded: not-found (Reason: No such file or directory)")) {
				if (output.Contains ("Active: active (running)"))
					return 1;
				else if (output.Contains ("Active: inactive (dead)"))
					return 0;
				else
					return -1;
			}
			else 
				return -1;
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
			return StandardOutput;
		}

		[HttpGet]
		public ActionResult GetTime()
		{
			var d = new DateTime();
			var minutes = d.Minute;
			var seconds = d.Second;
			var rest_min = minutes % 5-1;
			var rest_sec = 60-seconds;
			if(rest_min<0) rest_min=0;
			string relult = "Rebuild in: "+rest_min +" minutes "+rest_sec+" seconds.";

			return Content(relult);
		}

	}
}