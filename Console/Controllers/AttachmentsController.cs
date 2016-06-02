using System.Web.Mvc;


namespace WebConsole.Controllers
{
	public class AttachmentsController : Controller
	{
		[Route("Attachments")]
		[HttpGet]
		public ActionResult Index()
		{
			return View("Index", "~/Views/Shared/Attachments.cshtml");
		}

		/*
				[HttpGet]
				public ActionResult GetMachineName()
				{
					return Content(Environment.MachineName);
				}

				private class ServiceStatus
				{
					public string name;
					public string status;
					public bool running;
				}
		*/
		//---------------------------------------------------------------------
		/*
				[HttpGet]
				public ActionResult LoadServerStatus()
				{
					//ViewBag.services = new ServiceStatus[services.Length];

					var serverStatusData = new ServiceStatus[services.Length];

					var currService = 0;
					foreach (var serviceName in services)
					{
						using (var service = new ServiceController(serviceName))
						{
							serverStatusData[currService] = new ServiceStatus { name = serviceName };

							try
							{
								serverStatusData[currService].status = service.Status.ToString();
								serverStatusData[currService].running = (service.Status == ServiceControllerStatus.Running);
							}
							catch (Exception)
							{
								serverStatusData[currService].status = "Not installed";
								serverStatusData[currService].running = false;
							}
						}
						++currService;
					}
					return Json(serverStatusData, JsonRequestBehavior.AllowGet);
				}
		*/

		//---------------------------------------------------------------------
		/*
				[HttpGet]
				public ActionResult LoadBuilderLog()
				{
					try
					{
						var logPath = ConfigurationManager.AppSettings.Get("builderLog");
						var jsonData = System.IO.File.ReadAllText(logPath);
						return Content(jsonData);
					}
					catch (Exception message)
					{
						return new HttpStatusCodeResult(HttpStatusCode.InternalServerError, message.ToString());
					}
				}
		*/
		//---------------------------------------------------------------------
		/*
				[HttpPost]
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
							return RedirectToAction("BuilderLog");

						var task = scheduler.GetFolder(tsFolder).Tasks[tsTask];
						if (task == null)
							return RedirectToAction("BuilderLog");

						task.Run(null);

						while (task.State == Microsoft.Win32.TaskScheduler.TaskState.Running)
							System.Threading.Thread.Sleep(500);

						impersonator.UndoImpersonation();
					}

					// Wait for task to complete
					//return RedirectToAction("BuilderLog");
					return Content("Success");
				}
		*/
		//---------------------------------------------------------------------
		/*
				[HttpPost]
				public ActionResult ControlService(string serviceName)
				{
					var domain = ConfigurationManager.AppSettings.Get("runBuildDomain");
					var login = ConfigurationManager.AppSettings.Get("runBuildLogin");
					var pass = ConfigurationManager.AppSettings.Get("runBuildPass");

					var impersonator = new Impersonator();
					if (impersonator.ImpersonateUser(login, domain, pass))
					{
						// Control service
						using (var service = new ServiceController(serviceName))
						{
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

						impersonator.UndoImpersonation();
					}

					// Wait for task to complete
					return Content("Success");
					//return RedirectToAction("Index");
				}
		*/
		//---------------------------------------------------------------------
		/*
				[HttpPost]
				public ActionResult GetJsonActionResult()
				{

					using (var sr = new StreamReader(System.Web.HttpContext.Current.Server.MapPath("~/Content/data.json")))
					{
						//var json = JsonConvert.DeserializeObject<Dictionary<string, string>>(sr.ReadToEnd());
						var text = sr.ReadToEnd();
						return Content(text);
					}


					// Wait for task to complete
					//return Content("Failed responce!");
				}
		*/
		//---------------------------------------------------------------------
		/*
				[HttpPost]
				public ActionResult GetEmiters()
				{

					using (var sr = new StreamReader(System.Web.HttpContext.Current.Server.MapPath("~/Content/emiters.json")))
					{
						//var json = JsonConvert.DeserializeObject<Dictionary<string, string>>(sr.ReadToEnd());
						var text = sr.ReadToEnd();
						return Content(text);
					}


					// Wait for task to complete
					//return Content("Failed responce!");
				}
		*/
		/*
				[HttpPost]
				public ActionResult getMaxMessagesPerPage()
				{
					string maxItemsPerpage = ConfigurationManager.AppSettings["maxItemsPerpage"].ToString();
					return Content(maxItemsPerpage);
				}
		*/
	}
}