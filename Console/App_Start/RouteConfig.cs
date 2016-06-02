using System.Web.Mvc;
using System.Web.Routing;

namespace WebConsole
{
	public class RouteConfig
	{
		public static void RegisterRoutes(RouteCollection routes)
		{
			routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

			routes.MapRoute(
				name: "Default",
				url: "",
				defaults: new { controller = "Default", action = "Index" }
			);

			/*routes.MapRoute(
				name: "Services",
				url: "Services/",
				defaults: new { controller = "Default", action = "Index" }
			);*/

			routes.MapRoute(
				name: "BuilderLog",
				url: "BuilderLog/",
				defaults: new { controller = "Default", action = "BuilderLog" }
			);

			routes.MapRoute(
				name: "RunAutobuilder",
				url: "RunAutobuilder/",
				defaults: new { controller = "Default", action = "RunAutobuilder" }
			);

			routes.MapRoute(
				name: "ControlService",
				url: "ControlService/",
				defaults: new { controller = "Default", action = "ControlService" }
			);

			/*routes.MapRoute(
				name: "ExtendedView",
				url: "ExtendedView/",
				defaults: new { controller = "Extended", action = "Index" }
			);

			routes.MapRoute(
				name: "AttachmentsView",
				url: "Attachments/{action}/{id}",
				defaults: new { controller = "Attachments", action = "Index",id = UrlParameter.Optional }
			);*/
		}
	}
}
