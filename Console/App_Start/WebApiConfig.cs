using System.Configuration;
using System.Web.Http;
using System;
using TFrameworkSharp.Logging;
using TFrameworkSharp.RPC;

namespace WebConsole
{
	public static class WebApiConfig
	{
		private static RPCController m_rpcController = null;

		public static void Register(HttpConfiguration config)
		{
			// Setup http routes
			config.MapHttpAttributeRoutes();

			config.Routes.MapHttpRoute(
				name: "DefaultApi",
				routeTemplate: "{controller}/{action}/{id}",
				defaults: new { id = RouteParameter.Optional }
			);

			// Create RPC proxies
			m_rpcController = new RPCController();

#if DEV_BUILD
			MvcApplication.m_watcherService = m_rpcController.GetProxy<IWatcher >(
				ConfigurationManager.ConnectionStrings["WatcherRpcEndpoint"].ConnectionString,
				Int32.Parse(ConfigurationManager.AppSettings["WatcherRpcPortDev"]));
#else
			MvcApplication.m_watcherService = m_rpcController.GetProxy<IWatcher >(
				ConfigurationManager.ConnectionStrings["WatcherRpcEndpoint"].ConnectionString,
				Int32.Parse(ConfigurationManager.AppSettings["WatcherRpcPort"]));
#endif
		}
	}
}
