using Newtonsoft.Json;
using TFrameworkSharp;
using TFrameworkSharp.Logging;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Web.Hosting;
using System.Web.Http;
using Microsoft.Ajax.Utilities;

namespace WebConsole.Controllers
{
	[System.Web.Http.RoutePrefix("Watcher")]
	public class WatcherController : ApiController
	{

		//---------------------------------------------------------------------
		[HttpPost]
		[ActionName("RequestMessages")]
		public HttpResponseMessage RequestMessages([FromUri] int skip, [FromUri] int limit, [FromUri] int statics)
		{
			var inputData = Request.Content.ReadAsStringAsync().Result;
			HttpResponseMessage response = new HttpResponseMessage(HttpStatusCode.OK);

			bool fastStatistics = statics == 1;
			var messagesResponce = new QueryMessagesVariantResponse();

			MessageFilter msgFilter = new MessageFilter();
			if (inputData.Length != 0)
			{
				try
				{
					JsonSerializerSettings jsonformat = new JsonSerializerSettings();
					
					msgFilter = (MessageFilter)JsonConvert.DeserializeObject(inputData, typeof(MessageFilter), jsonformat);
					if (msgFilter.messageTypes == MessageType.Empty)
						msgFilter.messageTypes = MessageType.All;
				}
				catch (Exception ex)
				{
					string error = ex.Message;
				}
			}
			try
			{
				if (msgFilter.textMatch == null) msgFilter.textMatch = "";
				if (msgFilter.titleMatch == null) msgFilter.titleMatch = "";

				
				var stopwatchTotal = new Stopwatch();
				stopwatchTotal.Start();
				
				var format = ResponseFormat.DeflatedJson;

				messagesResponce = MvcApplication.m_watcherService.QueryMessages(msgFilter, skip, limit, fastStatistics, format);

				//byte[] uncompressedBytes = null;
				//using (var stream = new InflaterInputStream(new MemoryStream(messagesResponce.value)))
				//{
				//	MemoryStream memory = new MemoryStream();
				//	byte[] writeData = new byte[4096];
				//	int resLen;
				//	while ((resLen = stream.Read(writeData, 0, writeData.Length)) > 0)
				//	{
				//		memory.Write(writeData, 0, resLen);
				//	}
				//	uncompressedBytes = memory.ToArray();
				//}
				//string str = System.Text.Encoding.Default.GetString(uncompressedBytes);
				
				stopwatchTotal.Stop();
				Trace.WriteLine("TOTAL: " + stopwatchTotal.ElapsedMilliseconds);
				//Trace.WriteLine("Result: " + str);
				
				response.Content = new ByteArrayContent(messagesResponce.value);
				response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
			}
			catch (Exception ex)
			{
				return CreateErrorResponse(HttpStatusCode.InternalServerError, ex.Message);
			}
			return response;
		}


		//---------------------------------------------------------------------
		[HttpPost]
		[ActionName("RequestEmitters")]
		public HttpResponseMessage RequestEmitters([FromUri] int skip, [FromUri] int limit)
		{
			var inputData = Request.Content.ReadAsStringAsync().Result;
			HttpResponseMessage response = new HttpResponseMessage(HttpStatusCode.OK);

			EmitterFilter emFilter = new EmitterFilter() {nameMatch = ""};
			if (inputData.Length != 0)
			{
				try
				{
					emFilter = (EmitterFilter) JsonConvert.DeserializeObject(inputData, typeof (EmitterFilter));
					if (emFilter.nameMatch == null) emFilter.nameMatch = "";
				}
				catch (Exception  ex)
				{
					string error = ex.Message;
				}
			}
			var emittersResponce = new QueryEmittersVariantResponse();
			try
			{
				ResponseFormat format = ResponseFormat.DeflatedJson;

				emittersResponce = MvcApplication.m_watcherService.QueryEmitters(emFilter, skip, limit, true, format);
				response.Content = new ByteArrayContent(emittersResponce.value);
				response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
			}
			catch (Exception ex)
			{
				return CreateErrorResponse(HttpStatusCode.InternalServerError, ex.Message);
			}

			return response;
		}


		//---------------------------------------------------------------------
		[HttpPost]
		[ActionName("QueryAttachments")]
		public HttpResponseMessage QueryAttachments([FromUri] int skip, [FromUri] int limit, [FromUri] int statics)
		{
			var inputData = Request.Content.ReadAsStringAsync().Result;
			HttpResponseMessage response = new HttpResponseMessage(HttpStatusCode.OK);
			bool fastStatistics = statics == 1;

			AttachmentFilter filter = new AttachmentFilter() { nameMatch = "" };
			if (inputData.Length != 0)
			{
				try
				{
					filter = (AttachmentFilter)JsonConvert.DeserializeObject(inputData, typeof(AttachmentFilter));
					if (filter.nameMatch == null) filter.nameMatch = "";
				}
				catch (Exception ex)
				{
					string error = ex.Message;
				}
			}
			var attachmentsResponse = new QueryAttachmentsVariantResponse();
			try
			{
				ResponseFormat format = ResponseFormat.DeflatedJson;
				attachmentsResponse = MvcApplication.m_watcherService.QueryAttachments(filter, 0, 0, fastStatistics, format);
				response.Content = new ByteArrayContent(attachmentsResponse.value);
				 
				response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
			}
			catch (Exception ex)
			{
				return CreateErrorResponse(HttpStatusCode.InternalServerError, ex.Message);
			}

			return response;
		}

		//---------------------------------------------------------------------
		[HttpPost]
		[ActionName("ReadAttachment")]
		public HttpResponseMessage ReadAttachment([FromUri] ulong id, [FromUri] string format="blob")
		{
			HttpResponseMessage response = new HttpResponseMessage(HttpStatusCode.OK);
			var fileResponse = new FileResponse();
			try
			{
				fileResponse = MvcApplication.m_watcherService.ReadAttachmentEntirely(id);
				response.Content = new ByteArrayContent(fileResponse.fileData);

				if(format=="blob")
					response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
				if (format == "string")
					response.Content.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
			}
			catch (Exception ex)
			{
				return CreateErrorResponse(HttpStatusCode.InternalServerError, ex.Message);
			}	

			return response;
		}

		private static byte[] ReadFile(string filePath)
		{
			byte[] buffer;
			FileStream fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
			try
			{
				int length = (int)fileStream.Length;  // get file length
				buffer = new byte[length];            // create buffer
				int count;                            // actual number of bytes read
				int sum = 0;                          // total number of bytes read

				// read until Read method returns 0 (end of the stream has been reached)
				while ((count = fileStream.Read(buffer, sum, length - sum)) > 0)
					sum += count;  // sum is a buffer offset for next reading
			}
			finally
			{
				fileStream.Close();
			}
			return buffer;
		}

		//---------------------------------------------------------------------
		[HttpPost]
		[ActionName("QueryServiceHosts")]
		public HttpResponseMessage QueryServiceHosts()
		{
			HttpResponseMessage response = new HttpResponseMessage(HttpStatusCode.OK);
			var serviceHostsResponse = new QueryServiceHostsVariantResponse();
			try
			{
				serviceHostsResponse = MvcApplication.m_watcherService.QueryServiceHosts(ResponseFormat.Json);
				response.Content = new ByteArrayContent(serviceHostsResponse.value);
				response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
			}
			catch (Exception ex)
			{
				return CreateErrorResponse(HttpStatusCode.InternalServerError, ex.Message);
			}

			return response;
		}



		//---------------------------------------------------------------------
		[HttpPost]
		[ActionName("DeleteAttachments")]
		public HttpResponseMessage DeleteAttachments()
		{
			var inputData = Request.Content.ReadAsStringAsync().Result;
			HttpResponseMessage response = new HttpResponseMessage(HttpStatusCode.OK);
			try
			{
				var list = (ulong[])JsonConvert.DeserializeObject(inputData, typeof(ulong[]));
				var result = MvcApplication.m_watcherService.DeleteAttachments(list);
				response.Content = new StringContent(result.ToString(), Encoding.UTF8);
			}
			catch (Exception ex)
			{
				return CreateErrorResponse(HttpStatusCode.InternalServerError, ex.Message);
			}

			return response;
		}
		

		//---------------------------------------------------------------------
		/// <summary>
		/// Gets the NetBIOS name of this local computer for web client
		/// </summary>
		/// <returns>A string containing the name of this computer.</returns>
		[HttpGet]
		[ActionName("GetMachineName")]
		public HttpResponseMessage GetMachineName()
		{
			HttpResponseMessage response = new HttpResponseMessage(HttpStatusCode.OK);
			response.Content = new StringContent(Environment.MachineName, Encoding.UTF8);
			return response;
		}


		[HttpGet]
		[ActionName("GetMaxMessagesPerPage")]
		public HttpResponseMessage GetMaxMessagesPerPage()
		{
			HttpResponseMessage response = new HttpResponseMessage(HttpStatusCode.OK);
			string maxItemsPerpage = ConfigurationManager.AppSettings["maxItemsPerpage"].ToString();
			response.Content = new StringContent(maxItemsPerpage, Encoding.UTF8);
			return response;
		}



		/**********************************************************************************************/
		public static HttpResponseMessage CreateErrorResponse(HttpStatusCode statusCode, string errorMessage)
		{
			HttpResponseMessage response = new HttpResponseMessage(statusCode);

			var jsonSettings = new JsonSerializerSettings
			{
				DefaultValueHandling = DefaultValueHandling.Include,
				NullValueHandling = NullValueHandling.Include
			};

			response.Content = new StringContent(JsonConvert.SerializeObject(new { errorMessage = errorMessage }, jsonSettings), Encoding.UTF8);
			response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");

			return response;
		}
	}

}
