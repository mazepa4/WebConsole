using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using Trainer;
using Npgsql;
using NpgsqlTypes;
using System.Text;
using System.Linq;

namespace Trainer
{
	/// --------------------------------------------------------------------------------------
	public enum AudioFormat												// audio_format
	{
		[EnumLabel("wav")] 
		Wav,
		[EnumLabel("mp3")]
		Mp3,
		[EnumLabel("aac")]
		Aac,
		[EnumLabel("flac")]
		Flac,
		[EnumLabel("opus")]
		Opus,
		[EnumLabel("vorbis")]
		Vorbis
	}

	/// --------------------------------------------------------------------------------------
	public enum Language												// language
	{
		[EnumLabel("en-US")]
		EnUs,
		[EnumLabel("de-DE")]
		DeDe,
		[EnumLabel("fr-FR")]
		FrFr,
		[EnumLabel("es-ES")]
		EsEs,
		[EnumLabel("it-IT")]
		ItIt,
		[EnumLabel("ar-SA")]
		ArSa,
		[EnumLabel("he-IL")]
		HeIl,
		[EnumLabel("pl-PL")]
		PlPl,
		[EnumLabel("ru-RU")]
		RuRu,
		[EnumLabel("uk-UA")]
		UkUa,
		[EnumLabel("tr-TR")]
		TrTr,
	}

	/// --------------------------------------------------------------------------------------
	public enum Origin													// origin
	{
		[EnumLabel("movie")]
		Movie,
		[EnumLabel("phone_talks")]
		PhoneTalks
	}

	/// --------------------------------------------------------------------------------------
	public class Aggregators											// aggregators
	{
		public long						AggregatorId { set; get; }		// aggregator_id
		public long						SourceId { set; get; }			// source_id

		public Aggregators(long aggregatorId, long sourceId)
		{
			this.AggregatorId = aggregatorId;
			this.SourceId = sourceId;
		}
	}

	/// --------------------------------------------------------------------------------------
	public class Utterance												// utterances
	{
		public long						UtteranceId { set; get; }		// utterance_id bigserial (primary key) NOT NULL
		public byte[]					Content { set; get; }			// content bytea
		public AudioFormat				AudioFormat { set; get; }		// audio_format varchar(8) NOT NULL >> audio_format
		public int						TimeStart { set; get; }			// time_start integer (milliseconds) NOT NULL
		public int						TimeDuration { set; get; }		// time_duration integer (milliseconds) NOT NULL
		public long						SpeakerId { set; get; }			// speaker_id bigint (foreign key)
		public Language					Language { set; get; }			// language varchar(8) >> language
		public string[]					Transcribes { set; get; }		// transcribes text[]
		public string					Tags { set; get; }				// tags jsonb { origin: string }
		public long						AggregatorId { set; get; }

		/// ----------------------------------------------------------------------------------
		public Utterance() { }

		/// ----------------------------------------------------------------------------------
		public Utterance(long utteranceId, long aggregatorId, AudioFormat audioFormat, int timeStart,  int timeDuration, Language language, string[] transcribes)
		{
			this.UtteranceId = utteranceId;
			this.AggregatorId = aggregatorId;
			this.AudioFormat = audioFormat;
			this.TimeStart = timeStart;
			this.TimeDuration = timeDuration;
			this.Language = language;
			this.Transcribes = transcribes;
		}
	}

	/// --------------------------------------------------------------------------------------
	public class FullUtterance : Utterance
	{
		public Interim					Interim { set; get; }
		public Origin					Origin { set; get; }
		public long						SourceId { set; get; }
	}

	/// --------------------------------------------------------------------------------------
	public class Speaker												// speakers
	{
		public long						SpeakerId { set; get; }			// speaker_id bigserial (primary key)
	}

	/// --------------------------------------------------------------------------------------
	public class Source													// sources
	{
		public long						SourceId { set; get; }			// source_id bigint (foreign key)
		public long						LargeobjectId { set; get; }		// largeobject_id bigint (loid)
		public string					OriginalName { set; get; }		// original_name
		public string					NormalizedName { set; get; }	// normalized_name
		public Origin					Origin { set; get; }			// origin varchar(8) >> origin
		public AudioFormat				AudioFormat { set; get; }		// audio_format varchar(20) >> audio_format


		/// ----------------------------------------------------------------------------------
		public Source()
		{
			this.SourceId = 0;
			this.LargeobjectId = 0;
			this.OriginalName = string.Empty;
			this.NormalizedName = string.Empty;
			this.Origin = Origin.Movie;
			this.AudioFormat = AudioFormat.Flac;
		}

		/// ----------------------------------------------------------------------------------
		public Source(string name, Origin origin, AudioFormat audioFormat)
		{
			this.Origin = origin;
			this.AudioFormat = audioFormat;
			this.OriginalName = name;
			this.NormalizedName = name;
		}

		/// ----------------------------------------------------------------------------------
		public Source(string name, Origin origin, AudioFormat audioFormat, long sourceId) : this(name, origin, audioFormat)
		{
			this.SourceId = sourceId;
		}

		/// ----------------------------------------------------------------------------------
		public Source(string name, Origin origin, AudioFormat audioFormat, long sourceId, long largeobjectId = 0): this(name, origin, audioFormat)
		{
			this.SourceId = sourceId;
			this.LargeobjectId = largeobjectId;
		}

		/// ----------------------------------------------------------------------------------
		public string GetInsertCommandText(Dictionary<Enum, string> textEnums)
		{
			this.OriginalName = NpgsqlDatabase.EscapeText(this.OriginalName);
			this.NormalizedName = NpgsqlDatabase.EscapeText(this.NormalizedName);
			return $"INSERT INTO sources({(this.SourceId > 0 ? "source_id, " : "")}{(this.LargeobjectId > 0 ? "largeobject_id, " : "")}original_name, normalized_name, origin, audio_format) VALUES({(this.SourceId > 0 ? $"{this.SourceId}, " : "")}{(this.LargeobjectId > 0 ? $"{this.LargeobjectId}, " : "")}'{this.OriginalName}', '{this.NormalizedName}', '{textEnums[this.Origin]}', '{textEnums[this.AudioFormat]}')";
		}
	}

	/// --------------------------------------------------------------------------------------
	public class UtteranceChoice										// utterance_choice
	{
		public string					Transcribe { set; get; }		// transcribe text
		public long[]					Approvals { set; get; }			// approvals bigint[]

		/// ----------------------------------------------------------------------------------
		public UtteranceChoice() { }

		/// ----------------------------------------------------------------------------------
		public UtteranceChoice(long[] approvals, string transcribe )
		{
			this.Approvals = approvals;
			this.Transcribe = transcribe;
		}

		/// ----------------------------------------------------------------------------------
		public static UtteranceChoice Parse(string textResponse)
		{
			long[] approvals = null;
			string transcribe = null;

			var transcribeStartIndex = textResponse.IndexOf("(\"", StringComparison.Ordinal);
			int shiftA = 2, shiftB = 2;
			if (transcribeStartIndex == -1)
			{
				transcribeStartIndex = 0;
				shiftA = 1;
			}
			var transcribeEndIndex = textResponse.LastIndexOf("\",", StringComparison.Ordinal);
			if (transcribeEndIndex == -1)
			{
				transcribeEndIndex = textResponse.LastIndexOf(",", StringComparison.Ordinal);
				shiftB = 1;
			}
			if (transcribeStartIndex != -1 && transcribeEndIndex != -1)
				transcribe = textResponse.Substring(transcribeStartIndex + shiftA, transcribeEndIndex - transcribeStartIndex - shiftB);
			else
			{
				Debug.Assert(false, "unable to parse text response");
			}

			var approvalsStartIndex = textResponse.IndexOf("{", StringComparison.Ordinal);
			var approvalsEndIndex = textResponse.IndexOf("}", StringComparison.Ordinal);
			if (approvalsStartIndex != -1 || approvalsEndIndex != -1)
			{
				var approvalsList = new List<long>();
				var substring = textResponse.Substring(approvalsStartIndex + 1, approvalsEndIndex - approvalsStartIndex - 1);
				var approvalsTextArray = string.IsNullOrEmpty(substring)? new string[] {}: substring.Split(',');
				foreach (var text in approvalsTextArray)
				{
					long userId = 0;
					if (long.TryParse(text, out userId) && userId > 0)
						approvalsList.Add(userId);
				}

				if (approvalsList.Count > 0)
					approvals = approvalsList.ToArray<long>();
			}
			return new UtteranceChoice(approvals: approvals, transcribe: transcribe);
		}

		/// ----------------------------------------------------------------------------------
		public string GetInsertCommandText()
		{
			var commandEntry = new StringBuilder();
			var haveApprovals = this.Approvals != null && this.Approvals.Length > 0;
			commandEntry.Append($"ROW('{ NpgsqlDatabase.EscapeText(this.Transcribe)}'");
			if (haveApprovals)
			{
				commandEntry.Append(", ARRAY[");
				var ai = 0;
				for (; ai < this.Approvals.Length - 1; ai++) commandEntry.Append($"{this.Approvals[ai]}, ");
				commandEntry.Append($"{this.Approvals[ai]}]");
			}
			else
				commandEntry.Append(", NULL");
			commandEntry.Append(")::utterance_choice");
			return commandEntry.ToString();
		}
	}

	/// --------------------------------------------------------------------------------------
	public class Interim												// interims
	{
		public long						InterimId { set; get; }			// bigserial (primary key)
		public long						UtteranceId { set; get; }		// bigint (foreign key)
		public UtteranceChoice[]		Choices { set; get; }			// utterance_choice[]

		/// ----------------------------------------------------------------------------------
		public Interim()
		{
			this.Choices = new UtteranceChoice[] { };
		}

		/// ----------------------------------------------------------------------------------
		public Interim(long utteranceId, UtteranceChoice[] choices)
		{
			this.UtteranceId = utteranceId;
			this.Choices = choices;
		}

		/// ----------------------------------------------------------------------------------
		public Interim(long interimId, long utteranceId, UtteranceChoice[] choices)
		{
			this.InterimId = interimId;
			this.UtteranceId = utteranceId;
			this.Choices = choices;
		}

		/// ----------------------------------------------------------------------------------
		public string GetInsertCommandText ()
		{
			var commandEntry = new StringBuilder();
			var haveChoices = this.Choices != null && this.Choices.Length > 0;
			commandEntry.AppendFormat("INSERT INTO interims({0}utterance_id{1}) VALUES({2}{3}", (this.InterimId > 0 ? "interim_id, " : ""), (haveChoices? ", choices": "" ), (this.InterimId > 0 ? $"{this.InterimId}, " : ""), this.UtteranceId);
			if (haveChoices)
			{
				commandEntry.Append(", ARRAY[");
				var ci = 0;
				for (; ci < this.Choices.Length - 1; ci++) commandEntry.Append($"{this.Choices[ci].GetInsertCommandText()}, ");
				commandEntry.Append($"{this.Choices[ci].GetInsertCommandText()}]");
			}
			commandEntry.Append(")");
			return commandEntry.ToString();
		}
	}

	/// --------------------------------------------------------------------------------------
	public class InterimsLocks											// interims_locks
	{
		public long						LockId { set; get; }			// lock_id bigserial (primary key)
		public long						InterimId { set; get; }			// bigserial (primary key)
		public long						UserId { set; get; }			// bigint
		public DateTime					LockTime { set; get; }			// timestamp

		/// ----------------------------------------------------------------------------------
		public InterimsLocks()
		{
			LockTime = DateTime.MinValue;
		}

		/// ----------------------------------------------------------------------------------
		public InterimsLocks(long lockId, long interimId, long userId, DateTime lockTime)
		{
			this.LockId = lockId;
			this.InterimId = interimId;
			this.UserId = userId;
			this.LockTime = lockTime;
		}
	}

}


/// --------------------------------------------------------------------------------------
public class NpgsqlDatabase
{
	[ThreadStatic]
	private static NpgsqlConnection							_connection;
	[ThreadStatic]
	private static Dictionary<QueryType, NpgsqlCommand>		_commands;
	private static NpgsqlConnectionStringBuilder			_npgsqlConnectionStringBuilder;
	private static Dictionary<Enum, string>					_textEnums;

	/// --------------------------------------------------------------------------------------
	private enum QueryType : byte
	{
		InsertUtteranceFfmpegTool = 0,
		InsertUtterance,
		InsertSpeakerDefault,
		InsertConcreteSpeaker,
		InsertSource,
		InsertInterimForUtterance,
		InsertSourceEmpty,
		UpdateUtteranceText,
		DeleteInterim,
		SelectNextUnprocessedUtteranceGoogleAsr,
		SelectCountOfUnprocessedUtterancesGoogleAsr,
		SelectInterimChoices,
		SelectInterimIdForUtterance,
		SelectUtteranceById,
		SelectUtteranceContentById,
		SelectUtterancesCount,
		SelectUtteranceHeaders,
		InsertInterimLock,
		DeleteInterimLocksByInterimId,
		DeleteInterimLockByLockId,
		UpsertInterimLock,
		SelectInterimsLocks,
		SelectSourceId,
		SelectMovieUtteranceTranscribe,
		SelectRecognizedMoviesUtterancesCount,
		SelectAllMoviesUtterancesCount,
		SelectUtterancessWithTranscribeCount,
		SelectInterimsCount,
		SelectUtteranceWithTranscribeHeaders,
		SelectUtterancesOrigins,
		SelectUtterancesLanguages,
		SelectSourceOriginalNames,
		SelectChoiceApprovals,
		UpdateChoiceApprovals,
		SelectChoicesCount,
		InsertAggregatorDefault,
		SelectNextAggregatorIndex,
		InsertAggregator,
		SelectLastAggregatorIndex,
		UpdateUtteranceAggregatorById,
		InsertUtteranceWithSpeakerAndTags,
		ImportUtterance,
		updateSourceName,
		SelectExistsSourceRow,
		SelectNextSourceId,
		SelectInterimById,
		SelectExistsInterimLockRow,
		SelectNextInterimLockId,
		SelectlanguagesStat
	};

	/// --------------------------------------------------------------------------------------
	public enum User : long
	{
		GoogleChrome = 9223372036854775806,					// bigint max_value -1
		TranscribePairs = 9223372036854775805				// bigint max_value -2
	}

	/// --------------------------------------------------------------------------------------
	public NpgsqlDatabase(NpgsqlConnectionStringBuilder npgsqlcStringBuilder)
	{
		_npgsqlConnectionStringBuilder = npgsqlcStringBuilder;
	}

	/// --------------------------------------------------------------------------------------
	~NpgsqlDatabase()
	{
		_connection?.Close();
		NpgsqlConnection.ClearAllPools();
	}

	/// --------------------------------------------------------------------------------------
	private void ConnectionStateChange(object sender, StateChangeEventArgs e)
	{
		var connection = (NpgsqlConnection) sender;
		Debug.WriteLine($"State: { connection.State} for thread: {System.Threading.Thread.CurrentThread.ManagedThreadId}");
	}

	/// --------------------------------------------------------------------------------------
	public NpgsqlConnection GetConnection(bool prepareCommands = true)
	{
		if (_connection == null)
		{
			_connection = new NpgsqlConnection(_npgsqlConnectionStringBuilder);
			_connection.StateChange += ConnectionStateChange;
		}
		if (_connection.State != ConnectionState.Open)
		{
			try
			{
				_connection.Open();
				if (_commands == null && prepareCommands)
				{
					PrepareEnums(_connection);
					PrepareCommands(_connection);
				}
			}
			catch (Exception e)
			{
				Debug.WriteLine(e.Message);
				_connection?.Close();
				NpgsqlConnection.ClearAllPools();
				_connection = null;
				_connection =  GetConnection();
			}
		}
		return _connection;
	}

	/// --------------------------------------------------------------------------------------
	public bool Ping()
	{
		var connection = GetConnection();
		return connection?.State == ConnectionState.Open;
	}

	/// --------------------------------------------------------------------------------------
	private void PrepareEnums(NpgsqlConnection connection)
	{
		try
		{
			connection.RegisterEnum<AudioFormat>("audio_format");
			connection.RegisterEnum<Language>("language");
			connection.RegisterEnum<Origin>("origin");
		}
		catch (Exception e)
		{
			Debug.Assert(false,e.Message);
		}
		_textEnums = new Dictionary<Enum, string>()
			{
				{ AudioFormat.Wav, "wav" },
				{ AudioFormat.Mp3, "mp3" },
				{ AudioFormat.Aac, "aac" },
				{ AudioFormat.Flac, "flac" },
				{ AudioFormat.Opus, "opus" },
				{ AudioFormat.Vorbis, "vorbis" },

				{ Language.EnUs, "en-US" },
				{ Language.DeDe, "de-DE" },
				{ Language.FrFr, "fr-FR" },
				{ Language.EsEs, "es-ES" },
				{ Language.ItIt, "it-IT" },
				{ Language.ArSa, "ar-SA" },
				{ Language.HeIl, "he-IL" },
				{ Language.PlPl, "pl-PL" },
				{ Language.RuRu, "ru-RU" },
				{ Language.UkUa, "uk-UA" },
				{ Language.TrTr, "tr-TR" },

				{ Origin.Movie, "movie" },
				{ Origin.PhoneTalks, "phone_talks" }
			};
	}

	/// --------------------------------------------------------------------------------------
	private void PrepareCommands(NpgsqlConnection connection)
	{
		_commands = new Dictionary<QueryType, NpgsqlCommand>();
		PrepareSourcesCommands(connection);
		PrepareInterimsLocksCommands(connection);
		PrepareInterimsCommands(connection);
		PrepareSpeakersCommands(connection);
		PrepareUtterancesCommands(connection);
		PrepareAggregatorsCommands(connection);
	}

	/// --------------------------------------------------------------------------------------
	public void CreateTables(NpgsqlConnection connection = null)
	{
		var dropAllCommandText = @"
			DROP TABLE IF EXISTS public.interims_locks; 
			DROP SEQUENCE IF EXISTS public.interims_locks_lock_id_seq; 
			DROP TABLE IF EXISTS public.interims; 
			DROP SEQUENCE IF EXISTS public.interims_interim_id_seq; 
			DROP TABLE IF EXISTS public.utterances;
			DROP SEQUENCE IF EXISTS public.utterances_utterance_id_seq;
			DROP TABLE IF EXISTS public.aggregators; 
			DROP SEQUENCE IF EXISTS public.aggregators_aggregator_id_seq; 
			DROP TABLE IF EXISTS public.sources;
			DROP SEQUENCE IF EXISTS public.sources_source_id_seq;
			DROP TABLE IF EXISTS public.speakers;
			DROP SEQUENCE IF EXISTS public.speakers_speaker_id_seq;
			DROP TYPE IF EXISTS public.audio_format; 
			DROP TYPE IF EXISTS public.language; 
			DROP TYPE IF EXISTS public.origin; 
			DROP TYPE IF EXISTS public.utterance_choice;";

		var createEnumsCommandText = @"
			CREATE TYPE public.audio_format AS ENUM ('wav', 'mp3', 'aac', 'flac', 'opus', 'vorbis'); 
			CREATE TYPE public.language AS ENUM ('en-US', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'ar-SA', 'he-IL', 'pl-PL', 'ru-RU', 'uk-UA', 'tr-TR'); 
			CREATE TYPE public.origin AS ENUM ('movie', 'phone_talks'); 
			CREATE TYPE public.utterance_choice AS (transcribe text, approvals bigint[]); 
			ALTER TYPE public.audio_format OWNER TO postgres; 
			ALTER TYPE public.language OWNER TO postgres; 
			ALTER TYPE public.origin OWNER TO postgres; 
			ALTER TYPE public.utterance_choice OWNER TO postgres;";

		var createAggregatorsTableCommandText = @"
			CREATE SEQUENCE public.aggregators_aggregator_id_seq 
			INCREMENT 1 
			MINVALUE 1 
			MAXVALUE 9223372036854775807 
			START 1 
			CACHE 1; 
			ALTER TABLE public.aggregators_aggregator_id_seq OWNER TO postgres; 

			CREATE TABLE public.aggregators
			( 
			aggregator_id bigint NOT NULL DEFAULT nextval('aggregators_aggregator_id_seq'::regclass), 
			source_id bigint, 
			CONSTRAINT aggregators_pkey PRIMARY KEY (aggregator_id), 
			CONSTRAINT aggregators_source_id_fkey FOREIGN KEY (source_id) 
				REFERENCES public.sources (source_id) MATCH SIMPLE 
				ON UPDATE NO ACTION ON DELETE CASCADE 
			) 
			WITH (OIDS=FALSE); 
			ALTER TABLE public.aggregators OWNER TO postgres;";

		var createInterimsTableCommandText = @"
			CREATE SEQUENCE public.interims_interim_id_seq 
			INCREMENT 1 
			MINVALUE 1 
			MAXVALUE 9223372036854775807 
			START 1 
			CACHE 1; 
			ALTER TABLE public.interims_interim_id_seq OWNER TO postgres; 

			CREATE TABLE public.interims 
			( 
			interim_id bigint NOT NULL DEFAULT nextval('interims_interim_id_seq'::regclass), 
			utterance_id bigint NOT NULL, 
			choices utterance_choice[], 
			CONSTRAINT interims_pkey PRIMARY KEY (interim_id), 
			CONSTRAINT interims_utterance_id_fkey FOREIGN KEY (utterance_id) 
				REFERENCES public.utterances (utterance_id) MATCH SIMPLE 
				ON UPDATE NO ACTION ON DELETE CASCADE 
			) 
			WITH (OIDS=FALSE); 
			ALTER TABLE public.interims OWNER TO postgres;";

		var createInterimsLocksTableCommandText = @"
			CREATE SEQUENCE public.interims_locks_lock_id_seq
			INCREMENT 1
			MINVALUE 1
			MAXVALUE 9223372036854775807
			START 1
			CACHE 1;
			ALTER TABLE public.interims_locks_lock_id_seq OWNER TO postgres;

			CREATE TABLE public.interims_locks
			(
			lock_id bigint NOT NULL DEFAULT nextval('interims_locks_lock_id_seq'::regclass),
			interim_id bigint NOT NULL,
			user_id bigint NOT NULL,
			lock_time timestamp without time zone NOT NULL,
			CONSTRAINT interims_locks_pkey PRIMARY KEY (lock_id),
			CONSTRAINT interims_locks_interim_id_fkey FOREIGN KEY (interim_id)
				REFERENCES public.interims (interim_id) MATCH SIMPLE
				ON UPDATE NO ACTION ON DELETE CASCADE
			)
			WITH ( OIDS=FALSE);
			ALTER TABLE public.interims_locks OWNER TO postgres;";

		var createSourcesTableCommandText = @"
			CREATE SEQUENCE public.sources_source_id_seq
			INCREMENT 1
			MINVALUE 1
			MAXVALUE 9223372036854775807
			START 1
			CACHE 1;
			ALTER TABLE public.sources_source_id_seq OWNER TO postgres;

			CREATE TABLE public.sources
			(
			source_id bigint NOT NULL DEFAULT nextval('sources_source_id_seq'::regclass),
			largeobject_id bigint,
			original_name text NOT NULL,
			normalized_name tsvector NOT NULL,
			origin origin NOT NULL,
			audio_format audio_format NOT NULL,
			CONSTRAINT sources_pkey PRIMARY KEY (source_id)
			)
			WITH (OIDS=FALSE);
			ALTER TABLE public.sources OWNER TO postgres;";

		var createSpeakersTableCommandText = @"
			CREATE SEQUENCE public.speakers_speaker_id_seq
			INCREMENT 1
			MINVALUE 1
			MAXVALUE 9223372036854775807
			START 1
			CACHE 1;
			ALTER TABLE public.speakers_speaker_id_seq
			OWNER TO postgres;

			CREATE TABLE public.speakers
			(
			speaker_id bigint NOT NULL DEFAULT nextval('speakers_speaker_id_seq'::regclass),
			CONSTRAINT speakers_pkey PRIMARY KEY (speaker_id)
			)
			WITH (OIDS=FALSE);
			ALTER TABLE public.speakers OWNER TO postgres;";

		var createUtterancesTableCommandText = @"
			CREATE SEQUENCE public.utterances_utterance_id_seq
			INCREMENT 1
			MINVALUE 1
			MAXVALUE 9223372036854775807
			START 1
			CACHE 1;
			ALTER TABLE public.utterances_utterance_id_seq OWNER TO postgres;

			CREATE TABLE public.utterances
			(
			utterance_id bigint NOT NULL DEFAULT nextval('utterances_utterance_id_seq'::regclass),
			aggregator_id bigint,
			content bytea NOT NULL,
			audio_format audio_format NOT NULL,
			time_start integer NOT NULL,
			time_duration integer NOT NULL,
			speaker_id bigint,
			language language,
			transcribes text[],
			tags jsonb,
			CONSTRAINT utterances_pkey PRIMARY KEY (utterance_id),
			CONSTRAINT utterances_aggregator_id_fkey FOREIGN KEY (aggregator_id)
				REFERENCES public.aggregators (aggregator_id) MATCH SIMPLE
				ON UPDATE NO ACTION ON DELETE CASCADE,
			CONSTRAINT utterances_speaker_id_fkey FOREIGN KEY (speaker_id)
				REFERENCES public.speakers (speaker_id) MATCH SIMPLE
				ON UPDATE NO ACTION ON DELETE SET NULL
			)
			WITH (OIDS=FALSE);
			ALTER TABLE public.utterances OWNER TO postgres;";

		var stopwatch = new Stopwatch();
		stopwatch.Start();
		if (connection == null)
			connection = GetConnection(false);
		try
		{
			var dropAllCommand = new NpgsqlCommand(dropAllCommandText, connection);
			var createEnumsCommand = new NpgsqlCommand(createEnumsCommandText, connection);
			var createAggregatorsTableCommand = new NpgsqlCommand(createAggregatorsTableCommandText, connection);
			var createInterimsTableCommand = new NpgsqlCommand(createInterimsTableCommandText, connection);
			var createInterimsLocksTableCommand = new NpgsqlCommand(createInterimsLocksTableCommandText, connection);
			var createSourcesTableCommand = new NpgsqlCommand(createSourcesTableCommandText, connection);
			var createSpeakersTableCommand = new NpgsqlCommand(createSpeakersTableCommandText, connection);
			var createUtterancesTableCommand = new NpgsqlCommand(createUtterancesTableCommandText, connection);

			using (var transaction = connection.BeginTransaction())
			{
				dropAllCommand.ExecuteNonQuery();
				createEnumsCommand.ExecuteNonQuery();
				createSpeakersTableCommand.ExecuteNonQuery();
				createSourcesTableCommand.ExecuteNonQuery();
				createAggregatorsTableCommand.ExecuteNonQuery();
				createUtterancesTableCommand.ExecuteNonQuery();
				createInterimsTableCommand.ExecuteNonQuery();
				createInterimsLocksTableCommand.ExecuteNonQuery();
				transaction.Commit();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		finally
		{
			stopwatch.Stop();
			Debug.WriteLine($"create tables in {stopwatch.ElapsedMilliseconds} ms");
		}
	}

	#region Prepare commands
	/// --------------------------------------------------------------------------------------
	private void PrepareAggregatorsCommands(NpgsqlConnection connection)
	{
		var insertAggregatorDefaultCommand = new NpgsqlCommand("INSERT INTO aggregators(source_id) VALUES(@source_id) RETURNING aggregator_id", connection);
		insertAggregatorDefaultCommand.Parameters.Add("source_id", NpgsqlDbType.Bigint);
		insertAggregatorDefaultCommand.Prepare();
		_commands.Add(QueryType.InsertAggregatorDefault, insertAggregatorDefaultCommand);

		var insertAggregatorCommand = new NpgsqlCommand("INSERT INTO aggregators(aggregator_id, source_id) VALUES(@aggregator_id, @source_id) RETURNING aggregator_id", connection);
		insertAggregatorCommand.Parameters.Add("aggregator_id", NpgsqlDbType.Bigint);
		insertAggregatorCommand.Parameters.Add("source_id", NpgsqlDbType.Bigint);
		insertAggregatorCommand.Prepare();
		_commands.Add(QueryType.InsertAggregator, insertAggregatorCommand);

		var selectNextAggregatorIndexCommand = new NpgsqlCommand("SELECT nextval(pg_get_serial_sequence('aggregators','aggregator_id'))", connection);
		selectNextAggregatorIndexCommand.Prepare();
		_commands.Add(QueryType.SelectNextAggregatorIndex, selectNextAggregatorIndexCommand);

		var selectLastAggregatorIndexCommand = new NpgsqlCommand("SELECT aggregator_id FROM aggregators ORDER BY aggregator_id DESC limit 1", connection);
		selectLastAggregatorIndexCommand.Prepare();
		_commands.Add(QueryType.SelectLastAggregatorIndex, selectLastAggregatorIndexCommand);
	}

	/// --------------------------------------------------------------------------------------
	private void PrepareSourcesCommands(NpgsqlConnection connection)
	{
		var insertSourceCommand = connection.CreateCommand();
		insertSourceCommand.CommandText = @"
			INSERT INTO sources(source_id, largeobject_id, original_name, normalized_name, origin, audio_format) 
			VALUES(@source_id, @largeobject_id, @original_name, @normalized_name, @origin, @audio_format) 
			RETURNING source_id";
		insertSourceCommand.Parameters.AddRange(new[]
		{
			new NpgsqlParameter("source_id", NpgsqlDbType.Bigint),
			new NpgsqlParameter("largeobject_id", NpgsqlDbType.Bigint),
			new NpgsqlParameter("original_name", NpgsqlDbType.Text),
			new NpgsqlParameter("normalized_name", NpgsqlDbType.TsVector),
			new NpgsqlParameter() {ParameterName = "origin", NpgsqlDbType = NpgsqlDbType.Enum, EnumType = typeof(Origin) },
			new NpgsqlParameter() { ParameterName = "audio_format", NpgsqlDbType = NpgsqlDbType.Enum, EnumType = typeof(AudioFormat) },
		});
		insertSourceCommand.Prepare();
		_commands.Add(QueryType.InsertSource, insertSourceCommand);

		var insertSourceCommandEmpty = connection.CreateCommand();
		insertSourceCommandEmpty.CommandText = @"
			INSERT INTO sources(source_id, original_name, normalized_name, origin, audio_format) 
			VALUES(@source_id, @original_name, @normalized_name, @origin, @audio_format) 
			RETURNING source_id";
		insertSourceCommandEmpty.Parameters.AddRange(new[]
		{
			new NpgsqlParameter("source_id", NpgsqlDbType.Bigint),
			new NpgsqlParameter("original_name", NpgsqlDbType.Text),
			new NpgsqlParameter("normalized_name", NpgsqlDbType.TsVector),
			new NpgsqlParameter() {ParameterName = "origin", NpgsqlDbType = NpgsqlDbType.Enum, EnumType = typeof(Origin) },
			new NpgsqlParameter() { ParameterName = "audio_format", NpgsqlDbType = NpgsqlDbType.Enum, EnumType = typeof(AudioFormat) },
		});
		insertSourceCommandEmpty.Prepare();
		_commands.Add(QueryType.InsertSourceEmpty, insertSourceCommandEmpty);

		var selectExistsSourceRowCommand = connection.CreateCommand();
		selectExistsSourceRowCommand.CommandText = "SELECT EXISTS(SELECT 1 FROM sources WHERE source_id=@source_id)";
		selectExistsSourceRowCommand.Parameters.Add("source_id", NpgsqlDbType.Bigint);
		selectExistsSourceRowCommand.Prepare();
		_commands.Add(QueryType.SelectExistsSourceRow, selectExistsSourceRowCommand);

		var selectNextSourceIdCommand = connection.CreateCommand();
		selectNextSourceIdCommand.CommandText = "SELECT nextval('sources_source_id_seq')";
		selectNextSourceIdCommand.Prepare();
		_commands.Add(QueryType.SelectNextSourceId, selectNextSourceIdCommand);

		var updateSourceNameCommand = connection.CreateCommand();
		updateSourceNameCommand.CommandText = @"
			UPDATE sources SET original_name=@original_name, normalized_name=@normalized_name WHERE source_id = @source_id";
		updateSourceNameCommand.Parameters.AddRange(new[]
		{
			new NpgsqlParameter("original_name", NpgsqlDbType.Text),
			new NpgsqlParameter("normalized_name", NpgsqlDbType.TsVector),
			new NpgsqlParameter("source_id", NpgsqlDbType.Bigint)
		});
		updateSourceNameCommand.Prepare();
		_commands.Add(QueryType.updateSourceName, updateSourceNameCommand);

		var selectSourceIdCommand = connection.CreateCommand();
		selectSourceIdCommand.CommandText = @"
			SELECT source_id, largeobject_id, original_name, normalized_name, origin, audio_format FROM sources 
			WHERE original_name = @original_name
			AND normalized_name = @normalized_name
			AND  origin = @origin 
			AND audio_format = @audio_format";
		selectSourceIdCommand.Parameters.AddRange(new[]
		{
			new NpgsqlParameter("original_name", NpgsqlDbType.Text),
			new NpgsqlParameter("normalized_name", NpgsqlDbType.TsVector),
			new NpgsqlParameter() { ParameterName = "origin", NpgsqlDbType = NpgsqlDbType.Enum, EnumType = typeof(Origin) },
			new NpgsqlParameter() { ParameterName = "audio_format", NpgsqlDbType = NpgsqlDbType.Enum, EnumType = typeof(AudioFormat) }
		});
		selectSourceIdCommand.Prepare();
		_commands.Add(QueryType.SelectSourceId, selectSourceIdCommand);

		var selectSourceOriginalNamesCommand = connection.CreateCommand();
		selectSourceOriginalNamesCommand.CommandText = "SELECT original_name FROM sources";
		selectSourceOriginalNamesCommand.Prepare();
		_commands.Add(QueryType.SelectSourceOriginalNames, selectSourceOriginalNamesCommand);
	}

	/// --------------------------------------------------------------------------------------
	private void PrepareInterimsCommands(NpgsqlConnection connection)
	{
		var insertInterimForUtteranceCommand = connection.CreateCommand();
		insertInterimForUtteranceCommand.CommandText = "INSERT INTO interims(utterance_id) VALUES(@utterance_id)";
		insertInterimForUtteranceCommand.Parameters.Add("utterance_id", NpgsqlDbType.Bigint);
		insertInterimForUtteranceCommand.Prepare();
		_commands.Add(QueryType.InsertInterimForUtterance, insertInterimForUtteranceCommand);

		var deleteInterimCommand = connection.CreateCommand();//
		deleteInterimCommand.CommandText = "DELETE FROM interims WHERE interim_id = @interim_id";
		deleteInterimCommand.Parameters.Add("interim_id", NpgsqlDbType.Bigint);
		deleteInterimCommand.Prepare();
		_commands.Add(QueryType.DeleteInterim, deleteInterimCommand);

		var selectInterimsChoicesCommand = connection.CreateCommand();
		selectInterimsChoicesCommand.CommandText = "SELECT unnest(choices) FROM interims WHERE interim_id = @interim_id";
		selectInterimsChoicesCommand.AllResultTypesAreUnknown = true; // Read everything as strings
		selectInterimsChoicesCommand.Parameters.Add("interim_id", NpgsqlDbType.Bigint);
		selectInterimsChoicesCommand.Prepare();
		_commands.Add(QueryType.SelectInterimChoices, selectInterimsChoicesCommand);

		var selectInterimByIdCommand = connection.CreateCommand();
		selectInterimByIdCommand.CommandText = "SELECT interims.utterance_id, utterances.content, unnest(interims.choices) as choice FROM interims LEFT JOIN utterances ON utterances.utterance_id = interims.utterance_id WHERE interim_id = @interim_id";
		selectInterimByIdCommand.UnknownResultTypeList = new[] { false, false, true };
		selectInterimByIdCommand.Parameters.Add("interim_id", NpgsqlDbType.Bigint);
		selectInterimByIdCommand.Prepare();
		_commands.Add(QueryType.SelectInterimById, selectInterimByIdCommand);

		var selectInterimIdForUtteranceCommand = connection.CreateCommand();
		selectInterimIdForUtteranceCommand.CommandText = "SELECT interim_id FROM interims WHERE utterance_id = @utterance_id";
		selectInterimIdForUtteranceCommand.Parameters.Add("utterance_id", NpgsqlDbType.Bigint);
		selectInterimIdForUtteranceCommand.Prepare();
		_commands.Add(QueryType.SelectInterimIdForUtterance, selectInterimIdForUtteranceCommand);

		var selectMovieUtteranceTranscribeCommand = connection.CreateCommand();
		selectMovieUtteranceTranscribeCommand.CommandText = "SELECT choices[@choice_index] FROM interims WHERE utterance_id = @utterance_id ";
		selectMovieUtteranceTranscribeCommand.AllResultTypesAreUnknown = true;
		selectMovieUtteranceTranscribeCommand.Parameters.Add("choice_index", NpgsqlDbType.Bigint);
		selectMovieUtteranceTranscribeCommand.Parameters.Add("utterance_id", NpgsqlDbType.Bigint);
		selectMovieUtteranceTranscribeCommand.Prepare();
		_commands.Add(QueryType.SelectMovieUtteranceTranscribe, selectMovieUtteranceTranscribeCommand);

		var selectInterimsCountCommand = connection.CreateCommand();
		selectInterimsCountCommand.CommandText = "SELECT COUNT(*) FROM interims";
		selectInterimsCountCommand.Prepare();
		_commands.Add(QueryType.SelectInterimsCount, selectInterimsCountCommand);

		var selectChoiceApprovalsCommand = connection.CreateCommand();
		selectChoiceApprovalsCommand.CommandText = "SELECT choices[@choice_index].approvals FROM interims WHERE interim_id = @interim_id";
		selectChoiceApprovalsCommand.Parameters.Add(new NpgsqlParameter("choice_index", NpgsqlDbType.Integer));
		selectChoiceApprovalsCommand.Parameters.Add(new NpgsqlParameter("interim_id", NpgsqlDbType.Bigint));
		selectChoiceApprovalsCommand.Prepare();
		_commands.Add(QueryType.SelectChoiceApprovals, selectChoiceApprovalsCommand);

		var updateChoiceApprovalsCommand = connection.CreateCommand();
		updateChoiceApprovalsCommand.CommandText = "UPDATE interims SET choices[@choice_index].approvals = @approvals WHERE interim_id = @interim_id";
		updateChoiceApprovalsCommand.Parameters.Add(new NpgsqlParameter("choice_index", NpgsqlDbType.Integer));
		updateChoiceApprovalsCommand.Parameters.Add(new NpgsqlParameter("interim_id", NpgsqlDbType.Bigint));
		updateChoiceApprovalsCommand.Parameters.Add(new NpgsqlParameter("approvals", NpgsqlDbType.Array | NpgsqlDbType.Bigint));
		_commands.Add(QueryType.UpdateChoiceApprovals, updateChoiceApprovalsCommand);

		var selectChoicesCountCommand = connection.CreateCommand();
		selectChoicesCountCommand.CommandText = "SELECT array_length(choices, 1) FROM interims WHERE interim_id = @interim_id";
		selectChoicesCountCommand.Parameters.Add(new NpgsqlParameter("interim_id", NpgsqlDbType.Bigint));
		selectChoicesCountCommand.Prepare();
		_commands.Add(QueryType.SelectChoicesCount, selectChoicesCountCommand);
	}

	/// --------------------------------------------------------------------------------------
	private void PrepareInterimsLocksCommands(NpgsqlConnection connection)
	{
		var insertInterimLockCommand = connection.CreateCommand();
		insertInterimLockCommand.CommandText = "INSERT INTO interims_locks(interim_id, user_id, lock_time) VALUES(@interim_id, @user_id, @lock_time)";
		insertInterimLockCommand.Parameters.Add("interim_id", NpgsqlDbType.Bigint);
		insertInterimLockCommand.Parameters.Add("user_id", NpgsqlDbType.Bigint);
		insertInterimLockCommand.Parameters.Add("lock_time", NpgsqlDbType.Timestamp);
		insertInterimLockCommand.Prepare();
		_commands.Add(QueryType.InsertInterimLock, insertInterimLockCommand);

		var deleteInterimLockByInterimIdCommand = connection.CreateCommand();
		deleteInterimLockByInterimIdCommand.CommandText = "DELETE FROM interims_locks WHERE interim_id = @interim_id";
		deleteInterimLockByInterimIdCommand.Parameters.Add("interim_id", NpgsqlDbType.Bigint);
		deleteInterimLockByInterimIdCommand.Prepare();
		_commands.Add(QueryType.DeleteInterimLocksByInterimId, deleteInterimLockByInterimIdCommand);

		var deleteInterimLockByLockIdCommand = connection.CreateCommand();
		deleteInterimLockByLockIdCommand.CommandText = "DELETE FROM interims_locks WHERE lock_id = @lock_id";
		deleteInterimLockByLockIdCommand.Parameters.Add("lock_id", NpgsqlDbType.Bigint);
		deleteInterimLockByLockIdCommand.Prepare();
		_commands.Add(QueryType.DeleteInterimLockByLockId, deleteInterimLockByLockIdCommand);
		
		var upsertInterimLockCommand = connection.CreateCommand();
		upsertInterimLockCommand.CommandText = @"
			UPDATE interims_locks SET lock_time = @lock_time WHERE interim_id = @interim_id AND user_id = @user_id; 
			INSERT INTO interims_locks (lock_id, interim_id, user_id, lock_time) SELECT @lock_id, @interim_id, @user_id, @lock_time 
			WHERE NOT EXISTS (SELECT * FROM interims_locks WHERE interim_id = @interim_id AND user_id = @user_id);";
		upsertInterimLockCommand.Parameters.Add("lock_id", NpgsqlDbType.Bigint);
		upsertInterimLockCommand.Parameters.Add("interim_id", NpgsqlDbType.Bigint);
		upsertInterimLockCommand.Parameters.Add("user_id", NpgsqlDbType.Bigint);
		upsertInterimLockCommand.Parameters.Add("lock_time", NpgsqlDbType.Timestamp);
		upsertInterimLockCommand.Prepare();
		_commands.Add(QueryType.UpsertInterimLock, upsertInterimLockCommand);

		var selectInterimsLocksCommand = connection.CreateCommand();
		selectInterimsLocksCommand.CommandText = "SELECT lock_id, interim_id, user_id, lock_time FROM interims_locks WHERE interim_id = @interim_id";
		selectInterimsLocksCommand.Parameters.Add("interim_id", NpgsqlDbType.Bigint);
		selectInterimsLocksCommand.Prepare();
		_commands.Add(QueryType.SelectInterimsLocks, selectInterimsLocksCommand);

		var selectExistsRowCommand = connection.CreateCommand();
		selectExistsRowCommand.CommandText = "SELECT EXISTS(SELECT 1 FROM interims_locks WHERE lock_id=@lock_id)";
		selectExistsRowCommand.Parameters.Add("lock_id", NpgsqlDbType.Bigint);
		selectExistsRowCommand.Prepare();
		_commands.Add(QueryType.SelectExistsInterimLockRow, selectExistsRowCommand);

		var selectNextInterimLockIdCommand = connection.CreateCommand();
		selectNextInterimLockIdCommand.CommandText = "SELECT nextval('interims_locks_lock_id_seq')";//"SELECT nextval(pg_get_serial_sequence('interims_locks','lock_id'))"
		selectNextInterimLockIdCommand.Prepare();
		_commands.Add(QueryType.SelectNextInterimLockId, selectNextInterimLockIdCommand);


	}

	/// --------------------------------------------------------------------------------------
	private void PrepareSpeakersCommands(NpgsqlConnection connection)
	{
		var insertSpeakerDefaultCommand = connection.CreateCommand();
		insertSpeakerDefaultCommand.CommandText = "INSERT INTO speakers DEFAULT VALUES RETURNING speaker_id";
		insertSpeakerDefaultCommand.Prepare();
		_commands.Add(QueryType.InsertSpeakerDefault, insertSpeakerDefaultCommand);

		var insertSpeakerCommand = connection.CreateCommand();
		insertSpeakerCommand.CommandText = "INSERT INTO speakers(speaker_id) VALUES(@speaker_id)";//SpeakerDefaultInsert
		insertSpeakerCommand.Parameters.Add("speaker_id", NpgsqlDbType.Bigint);
		insertSpeakerCommand.Prepare();
		_commands.Add(QueryType.InsertConcreteSpeaker, insertSpeakerCommand);
	}

	/// --------------------------------------------------------------------------------------
	private void PrepareUtterancesCommands(NpgsqlConnection connection)
	{
		var insertIntoUtterancesFfmpegTool = connection.CreateCommand();
		insertIntoUtterancesFfmpegTool.CommandText = @"
			INSERT INTO utterances(aggregator_id, content, audio_format, time_start, time_duration, language) 
			VALUES(@aggregator_id, @content, @audio_format, @time_start, @time_duration, @language) 
			RETURNING utterance_id";
		insertIntoUtterancesFfmpegTool.Parameters.AddRange(new[]
		{
			new NpgsqlParameter("aggregator_id", NpgsqlDbType.Bigint),
			new NpgsqlParameter("content", NpgsqlDbType.Bytea),
			new NpgsqlParameter() { ParameterName = "audio_format", NpgsqlDbType = NpgsqlDbType.Enum, EnumType = typeof(AudioFormat) },
			new NpgsqlParameter("time_start", NpgsqlDbType.Integer),
			new NpgsqlParameter("time_duration", NpgsqlDbType.Integer),
			new NpgsqlParameter() { ParameterName = "language", NpgsqlDbType = NpgsqlDbType.Enum, EnumType = typeof(Language) },
		});
		insertIntoUtterancesFfmpegTool.Prepare();
		_commands.Add(QueryType.InsertUtteranceFfmpegTool, insertIntoUtterancesFfmpegTool);

		var importUtteranceCommand = connection.CreateCommand();
		importUtteranceCommand.CommandText = @"
			INSERT INTO utterances(utterance_id, aggregator_id, content, audio_format, time_start, time_duration, language, transcribes) 
			VALUES(@utterance_id, @aggregator_id, @content, @audio_format, @time_start, @time_duration, @language, @transcribes)";
		importUtteranceCommand.Parameters.AddRange(new[]
		{
			new NpgsqlParameter("utterance_id", NpgsqlDbType.Bigint),
			new NpgsqlParameter("aggregator_id", NpgsqlDbType.Bigint),
			new NpgsqlParameter("content", NpgsqlDbType.Bytea),
			new NpgsqlParameter { ParameterName = "audio_format", NpgsqlDbType = NpgsqlDbType.Enum, EnumType = typeof(AudioFormat) },
			new NpgsqlParameter("time_start", NpgsqlDbType.Integer),
			new NpgsqlParameter("time_duration", NpgsqlDbType.Integer),
			new NpgsqlParameter() { ParameterName = "language", NpgsqlDbType = NpgsqlDbType.Enum, EnumType = typeof(Language) },
			new NpgsqlParameter("transcribes", NpgsqlDbType.Array | NpgsqlDbType.Text)
		});
		importUtteranceCommand.Prepare();
		_commands.Add(QueryType.ImportUtterance, importUtteranceCommand);

		var insertUtteranceCommand = connection.CreateCommand();
		insertUtteranceCommand.CommandText = @"
			INSERT INTO utterances(aggregator_id, content, audio_format, time_start, time_duration, language, transcribes) 
			VALUES(@aggregator_id, @content, @audio_format, @time_start, @time_duration, @language, @transcribes)";
		insertUtteranceCommand.Parameters.AddRange(new[]
		{
			new NpgsqlParameter("aggregator_id", NpgsqlDbType.Bigint),
			new NpgsqlParameter("content", NpgsqlDbType.Bytea),
			new NpgsqlParameter { ParameterName = "audio_format", NpgsqlDbType = NpgsqlDbType.Enum, EnumType = typeof(AudioFormat) },
			new NpgsqlParameter("time_start", NpgsqlDbType.Integer),
			new NpgsqlParameter("time_duration", NpgsqlDbType.Integer),
			new NpgsqlParameter() { ParameterName = "language", NpgsqlDbType = NpgsqlDbType.Enum, EnumType = typeof(Language) },
			new NpgsqlParameter("transcribes", NpgsqlDbType.Array | NpgsqlDbType.Text)
		});
		insertUtteranceCommand.Prepare();
		_commands.Add(QueryType.InsertUtterance, insertUtteranceCommand);

		var insertUtteranceWithSpeakerCommand = connection.CreateCommand();
		insertUtteranceWithSpeakerCommand.CommandText = @"
			INSERT INTO utterances(aggregator_id, content, audio_format, time_start, time_duration, speaker_id, language, transcribes, tags) 
			VALUES(@aggregator_id, @content, @audio_format, @time_start, @time_duration, @speaker_id, @language, @transcribes, @tags)";
		insertUtteranceWithSpeakerCommand.Parameters.AddRange(new[]
		{
			new NpgsqlParameter("aggregator_id", NpgsqlDbType.Bigint),
			new NpgsqlParameter("content", NpgsqlDbType.Bytea),
			new NpgsqlParameter { ParameterName = "audio_format", NpgsqlDbType = NpgsqlDbType.Enum, EnumType = typeof(AudioFormat) },
			new NpgsqlParameter("time_start", NpgsqlDbType.Integer),
			new NpgsqlParameter("time_duration", NpgsqlDbType.Integer),
			new NpgsqlParameter("speaker_id", NpgsqlDbType.Bigint),
			new NpgsqlParameter() { ParameterName = "language", NpgsqlDbType = NpgsqlDbType.Enum, EnumType = typeof(Language) },
			new NpgsqlParameter("transcribes", NpgsqlDbType.Array | NpgsqlDbType.Text),
			new NpgsqlParameter("tags", NpgsqlDbType.Jsonb)
		});
		insertUtteranceWithSpeakerCommand.Prepare();
		_commands.Add(QueryType.InsertUtteranceWithSpeakerAndTags, insertUtteranceWithSpeakerCommand);

		var updateUtteranceTextCommand = connection.CreateCommand();
		updateUtteranceTextCommand.CommandText = "UPDATE utterances SET transcribes = @transcribes WHERE utterance_id = @utterance_id";
		updateUtteranceTextCommand.Parameters.Add(new NpgsqlParameter("transcribes", NpgsqlDbType.Array | NpgsqlDbType.Text));
		updateUtteranceTextCommand.Parameters.Add(new NpgsqlParameter("utterance_id", NpgsqlDbType.Bigint));
		updateUtteranceTextCommand.Prepare();
		_commands.Add(QueryType.UpdateUtteranceText, updateUtteranceTextCommand);

		var selectUtteranceGoogleAsrEntry2 = @"
				LEFT JOIN utterances ON utterances.utterance_id = interims.utterance_id 
				LEFT JOIN aggregators ON utterances.aggregator_id = aggregators.aggregator_id 
				LEFT JOIN sources ON aggregators.source_id = sources.source_id 
				LEFT JOIN interims_locks ON interims_locks.interim_id = interims.interim_id 
				WHERE (utterances.transcribes IS NULL OR utterances.transcribes = '{}') 
				AND (interims_locks.lock_id IS NULL OR (interims_locks.user_id = @user_id AND interims_locks.lock_time < @time))";
		//var selectUtteranceGoogleAsrEntry = new StringBuilder();
		//selectUtteranceGoogleAsrEntry.Append("LEFT JOIN utterances ON utterances.utterance_id = interims.utterance_id ");
		//selectUtteranceGoogleAsrEntry.Append("LEFT JOIN aggregators ON utterances.aggregator_id = aggregators.aggregator_id ");
		//selectUtteranceGoogleAsrEntry.Append("LEFT JOIN sources ON aggregators.source_id = sources.source_id ");
		//selectUtteranceGoogleAsrEntry.Append("LEFT JOIN interims_locks ON interims_locks.interim_id = interims.interim_id ");
		//selectUtteranceGoogleAsrEntry.Append("WHERE ");
		//selectUtteranceGoogleAsrEntry.Append("(utterances.transcribes IS NULL OR utterances.transcribes = '{}') AND ");
		//selectUtteranceGoogleAsrEntry.Append("( ");
		//selectUtteranceGoogleAsrEntry.Append("interims_locks.lock_id IS NULL OR ");
		//selectUtteranceGoogleAsrEntry.Append("( ");
		//selectUtteranceGoogleAsrEntry.Append("interims_locks.user_id = @user_id AND ");
		//selectUtteranceGoogleAsrEntry.Append("interims_locks.lock_time < @time ");
		//selectUtteranceGoogleAsrEntry.Append(" )");
		//selectUtteranceGoogleAsrEntry.Append(" )");
		var selectNextUnprocessedUtteranceGoogleAsrCommand = connection.CreateCommand();
		selectNextUnprocessedUtteranceGoogleAsrCommand.CommandText = $@"
			SELECT utterances.utterance_id, aggregators.source_id, utterances.content, sources.origin, utterances.audio_format, 
			utterances.time_start, utterances.time_duration, utterances.language, utterances.transcribes, interims.interim_id FROM interims 
			{selectUtteranceGoogleAsrEntry2} 
			ORDER BY utterances.utterance_id ASC LIMIT 1";
		selectNextUnprocessedUtteranceGoogleAsrCommand.Parameters.Add(new NpgsqlParameter("user_id", NpgsqlDbType.Bigint));
		selectNextUnprocessedUtteranceGoogleAsrCommand.Parameters.Add(new NpgsqlParameter("time", NpgsqlDbType.Timestamp));
		selectNextUnprocessedUtteranceGoogleAsrCommand.Prepare();
		_commands.Add(QueryType.SelectNextUnprocessedUtteranceGoogleAsr, selectNextUnprocessedUtteranceGoogleAsrCommand);

		var selectUnprocessedUtterancesCounteGoogleAsrCommand = new NpgsqlCommand($"SELECT COUNT(*) FROM interims {selectUtteranceGoogleAsrEntry2}", connection);
		selectUnprocessedUtterancesCounteGoogleAsrCommand.Parameters.Add(new NpgsqlParameter("user_id", NpgsqlDbType.Bigint));
		selectUnprocessedUtterancesCounteGoogleAsrCommand.Parameters.Add(new NpgsqlParameter("time", NpgsqlDbType.Timestamp));
		selectUnprocessedUtterancesCounteGoogleAsrCommand.Prepare();
		_commands.Add(QueryType.SelectCountOfUnprocessedUtterancesGoogleAsr, selectUnprocessedUtterancesCounteGoogleAsrCommand);
		
		var selectUtteranceByIdCommand = connection.CreateCommand();
		selectUtteranceByIdCommand.CommandText = @"
			SELECT utterances.utterance_id, aggregators.aggregator_id, aggregators.source_id, utterances.content, sources.origin, utterances.audio_format, 
			utterances.time_start, utterances.time_duration, utterances.language, utterances.transcribes, interims.interim_id FROM utterances 
			LEFT JOIN interims ON utterances.utterance_id = interims.utterance_id 
			LEFT JOIN aggregators ON utterances.aggregator_id = aggregators.aggregator_id 
			LEFT JOIN sources ON aggregators.source_id = sources.source_id 
			WHERE utterances.utterance_id = @utterance_id";
		selectUtteranceByIdCommand.Parameters.Add(new NpgsqlParameter("utterance_id", NpgsqlDbType.Bigint));
		selectUtteranceByIdCommand.Prepare();
		_commands.Add(QueryType.SelectUtteranceById, selectUtteranceByIdCommand);

		var selectUtteranceContentByIdCommand = connection.CreateCommand();
		selectUtteranceContentByIdCommand.CommandText = "SELECT content FROM utterances WHERE utterance_id = @utterance_id";
		selectUtteranceContentByIdCommand.Parameters.Add(new NpgsqlParameter("utterance_id", NpgsqlDbType.Bigint));
		selectUtteranceContentByIdCommand.Prepare();
		_commands.Add(QueryType.SelectUtteranceContentById, selectUtteranceContentByIdCommand);

		var selectUtteranceHeaders = connection.CreateCommand();
		selectUtteranceHeaders.CommandText = @" 
			SELECT utterances.utterance_id, utterances.aggregator_id, sources.origin, utterances.audio_format, 
			utterances.time_start, utterances.time_duration, utterances.language, interims.interim_id 
			FROM utterances 
			LEFT JOIN interims ON utterances.utterance_id = interims.utterance_id 
			LEFT JOIN aggregators ON utterances.aggregator_id = aggregators.aggregator_id 
			LEFT JOIN sources ON aggregators.source_id = sources.source_id 
			ORDER BY utterances.utterance_id ASC 
			LIMIT @limit OFFSET @offset";
		selectUtteranceHeaders.Parameters.Add(new NpgsqlParameter("limit", NpgsqlDbType.Integer));
		selectUtteranceHeaders.Parameters.Add(new NpgsqlParameter("offset", NpgsqlDbType.Integer));
		selectUtteranceHeaders.Prepare();
		_commands.Add(QueryType.SelectUtteranceHeaders, selectUtteranceHeaders);
		
		var selectUtteranceWithTranscribeHeaders =	connection.CreateCommand();
		selectUtteranceWithTranscribeHeaders.CommandText = @" 
			SELECT utterances.utterance_id, utterances.aggregator_id, sources.origin, utterances.audio_format, 
			utterances.time_start, utterances.time_duration, utterances.language, interims.interim_id FROM utterances 
			LEFT JOIN interims ON utterances.utterance_id = interims.utterance_id 
			LEFT JOIN aggregators ON utterances.aggregator_id = aggregators.aggregator_id 
			LEFT JOIN sources ON aggregators.source_id = sources.source_id 
			WHERE utterances.transcribes IS NOT NULL AND utterances.transcribes != '{}' 
			ORDER BY utterances.utterance_id ASC 
			LIMIT @limit OFFSET @offset";
		selectUtteranceWithTranscribeHeaders.Parameters.Add(new NpgsqlParameter("limit", NpgsqlDbType.Integer));
		selectUtteranceWithTranscribeHeaders.Parameters.Add(new NpgsqlParameter("offset", NpgsqlDbType.Integer));
		selectUtteranceWithTranscribeHeaders.Prepare();
		_commands.Add(QueryType.SelectUtteranceWithTranscribeHeaders, selectUtteranceWithTranscribeHeaders);

		var selectRecognizedMoviesUtterancesCountCommand = connection.CreateCommand();
		selectRecognizedMoviesUtterancesCountCommand.CommandText = @" 
			SELECT COUNT(*) FROM utterances 
			LEFT JOIN aggregators ON utterances.aggregator_id = aggregators.aggregator_id 
			LEFT JOIN sources ON aggregators.source_id = sources.source_id 
			WHERE sources.origin = 'movie' AND (utterances.transcribes IS NOT NULL AND utterances.transcribes != '{}')";
		selectRecognizedMoviesUtterancesCountCommand.Prepare();
		_commands.Add(QueryType.SelectRecognizedMoviesUtterancesCount, selectRecognizedMoviesUtterancesCountCommand);


		var selectAllMoviesUtterancesCountCommand = connection.CreateCommand();
		selectAllMoviesUtterancesCountCommand.CommandText = @" 
			SELECT COUNT(*) FROM utterances 
			LEFT JOIN aggregators ON utterances.aggregator_id = aggregators.aggregator_id 
			LEFT JOIN sources ON aggregators.source_id = sources.source_id 
			WHERE sources.origin = 'movie'";
		selectAllMoviesUtterancesCountCommand.Prepare();
		_commands.Add(QueryType.SelectAllMoviesUtterancesCount, selectAllMoviesUtterancesCountCommand);

		var selectUtterancesWithTranscribeCountCommand = connection.CreateCommand();
		selectUtterancesWithTranscribeCountCommand.CommandText = "SELECT COUNT(*) FROM utterances  WHERE transcribes IS NOT NULL OR transcribes != '{}'";
		selectUtterancesWithTranscribeCountCommand.Prepare();
		_commands.Add(QueryType.SelectUtterancessWithTranscribeCount, selectUtterancesWithTranscribeCountCommand);

		var selectUtterancesCountCommand = connection.CreateCommand();
		selectUtterancesCountCommand.CommandText = "SELECT COUNT(*) FROM utterances";
		selectUtterancesCountCommand.Prepare();
		_commands.Add(QueryType.SelectUtterancesCount, selectUtterancesCountCommand);

		var selectUtterancesOriginsCommand = connection.CreateCommand();
		selectUtterancesOriginsCommand.CommandText = @" 
			SELECT DISTINCT sources.origin FROM utterances 
			LEFT JOIN aggregators ON utterances.aggregator_id = aggregators.aggregator_id 
			LEFT JOIN sources ON aggregators.source_id = sources.source_id";
		selectUtterancesOriginsCommand.Prepare();
		_commands.Add(QueryType.SelectUtterancesOrigins, selectUtterancesOriginsCommand);

		var selectUtterancesLanguagesCommand = connection.CreateCommand();
		selectUtterancesLanguagesCommand.CommandText = "SELECT DISTINCT language FROM utterances";
		selectUtterancesLanguagesCommand.Prepare();
		_commands.Add(QueryType.SelectUtterancesLanguages, selectUtterancesLanguagesCommand);

		var updateUtteranceAggregatorByIdCommand = connection.CreateCommand();
		updateUtteranceAggregatorByIdCommand.CommandText = "UPDATE utterances SET aggregator_id = @aggregator_id WHERE utterance_id = @utterance_id";
		updateUtteranceAggregatorByIdCommand.Parameters.Add("aggregator_id", NpgsqlDbType.Bigint);
		updateUtteranceAggregatorByIdCommand.Parameters.Add("utterance_id", NpgsqlDbType.Bigint);
		updateUtteranceAggregatorByIdCommand.Prepare();
		_commands.Add(QueryType.UpdateUtteranceAggregatorById, updateUtteranceAggregatorByIdCommand);

		var selectlanguagesStatCommand = connection.CreateCommand();
		selectlanguagesStatCommand.CommandText = @" 
			SELECT utterances.language, count(utterances.utterance_id), SUM(utterances.time_duration - utterances.time_start * 2) FROM utterances
			LEFT JOIN aggregators ON utterances.aggregator_id = aggregators.aggregator_id
			LEFT JOIN sources ON aggregators.source_id = sources.source_id
			WHERE(utterances.transcribes IS NOT NULL AND utterances.transcribes != '{}')
			GROUP BY utterances.language ORDER BY count DESC";
		selectlanguagesStatCommand.Prepare();
		_commands.Add(QueryType.SelectlanguagesStat, selectlanguagesStatCommand);
	}

	#endregion

	/// --------------------------------------------------------------------------------------
	public void InsertUtterancesFfmpeg(IList<FullUtterance> list, NpgsqlConnection connection = null, bool binaryImport = false) // ++
	{
		binaryImport = false;
		var stopwatch = new Stopwatch();
		stopwatch.Start();
		if (connection == null)
			connection = GetConnection();
		try
		{
			//if (binaryImport)
			//{
			//	using (var writer = connection.BeginBinaryImport("COPY utterances(content, origin, audio_format, time_start, time_duration, language, transcribes) FROM STDIN BINARY"))
			//	{
			//		foreach (var item in list)
			//		{
			//			writer.StartRow();
			//			writer.Write(item.Content, NpgsqlDbType.Bytea);
			//			writer.Write(item.Origin, NpgsqlDbType.Text);
			//			writer.Write(item.AudioFormat, NpgsqlDbType.Enum);
			//			writer.Write(item.TimeStart, NpgsqlDbType.Integer);
			//			writer.Write(item.TimeDuration, NpgsqlDbType.Integer);
			//			writer.Write(item.Language, NpgsqlDbType.Enum);
			//			writer.Write(item.Transcribes, NpgsqlDbType.Array | NpgsqlDbType.Text);
			//			writer.WriteNull();
			//			//writer.WriteRow(item.Content, _textEnums[item.Origin], _textEnums[item.AudioFormat], item.TimeStart, item.TimeDuration, _textEnums[item.Language], item.Transcribes);
			//		}
			//	}
			//}
			//else
			//{
			using (var transaction = connection.BeginTransaction())
			{
				foreach (var item in list)
				{
					if (item.Transcribes.Length == 0 || (item.AggregatorId == 0 && item.SourceId == 0))
					{
						Debug.Assert(false, "Wrong input data");
						continue;
					}
					if(item.AggregatorId == 0 )
						item.AggregatorId = this.InsertAggregator(sourceId: item.SourceId, connection: connection);
					var insertUtteranceCommand = _commands[QueryType.InsertUtteranceFfmpegTool];
					insertUtteranceCommand.Connection = connection;
					insertUtteranceCommand.Parameters["aggregator_id"].Value = item.AggregatorId;
					insertUtteranceCommand.Parameters["content"].Value = item.Content;
					insertUtteranceCommand.Parameters["audio_format"].Value = item.AudioFormat;
					insertUtteranceCommand.Parameters["time_start"].Value = item.TimeStart;
					insertUtteranceCommand.Parameters["time_duration"].Value = item.TimeDuration;
					insertUtteranceCommand.Parameters["language"].Value = item.Language;
					item.UtteranceId = (long)insertUtteranceCommand.ExecuteScalar();
					var choiceTranscribe = new StringBuilder();
					foreach (var part in item.Transcribes) choiceTranscribe.Append(part);
					var interim = new Interim(item.UtteranceId, new[] { new UtteranceChoice() { Transcribe = choiceTranscribe.ToString() }});
					var insertInterimCommand = new NpgsqlCommand(interim.GetInsertCommandText(), connection);
					insertInterimCommand.ExecuteNonQuery();
				}
				transaction.Commit();
			}
			//}
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		finally
		{
			stopwatch.Stop();
			Debug.WriteLineIf(binaryImport, $"insert {list.Count} utterances in {stopwatch.ElapsedMilliseconds} ms, binary: {binaryImport}");
		}
	}

	/// --------------------------------------------------------------------------------------
	public void InsertUtterances(IList<Utterance> list, NpgsqlConnection connection = null, bool binaryImport = false) // -/+
	{
		binaryImport = false;
		var stopwatch = new Stopwatch();
		stopwatch.Start();
		if (connection == null)
			connection = GetConnection();
		try
		{
			//if (binaryImport)
			//{
			//	using (var writer = connection.BeginBinaryImport("COPY utterances(source_id, content, origin, audio_format, time_start, time_duration, speaker_id, language, transcribes, tags) FROM STDIN BINARY"))
			//	{
			//		foreach (var item in list)
			//			writer.WriteRow(item.SourceId, item.Content, item.Origin, item.AudioFormat, item.TimeStart, item.TimeDuration, item.SpeakerId, item.Language, item.Transcribes, item.Tags);
			//	}
			//}
			//else
			//{
			PrepareEnums(connection);
			using (var transaction = connection.BeginTransaction())
			{
				foreach (var item in list)
				{
					if (item.AggregatorId == 0 )
						throw new InvalidDataException($"Wrong input data: empty aggregator ({item.AggregatorId == 0})");
					var withSpeakerAndTags = item.SpeakerId > 0 & !string.IsNullOrEmpty(item.Tags);
					var command = withSpeakerAndTags ? _commands[QueryType.InsertUtteranceWithSpeakerAndTags]: _commands[QueryType.InsertUtterance];
					command.Connection = connection;
					command.Parameters["aggregator_id"].Value = item.AggregatorId;
					command.Parameters["content"].Value = item.Content;
					command.Parameters["audio_format"].Value = item.AudioFormat;
					command.Parameters["time_start"].Value = item.TimeStart;
					command.Parameters["time_duration"].Value = item.TimeDuration;
					if(withSpeakerAndTags)
						command.Parameters["speaker_id"].Value = item.SpeakerId;
					command.Parameters["language"].Value = item.Language;
					command.Parameters["transcribes"].Value = item.Transcribes;
					if (withSpeakerAndTags)
						command.Parameters["tags"].Value = item.Tags;
					command.ExecuteNonQuery();
				}
				transaction.Commit();
			}
			//}
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		finally
		{
			stopwatch.Stop();
			Debug.WriteLineIf(binaryImport, $"insert {list.Count} utterances in {stopwatch.ElapsedMilliseconds} ms, binary: {binaryImport}");
		}
	}

	/// --------------------------------------------------------------------------------------
	public void ImportUtterances(IList<Utterance> list, NpgsqlConnection connection = null)
	{
		var stopwatch = new Stopwatch();
		stopwatch.Start();
		if (connection == null)
			connection = GetConnection();
		Utterance cur = null;
		try
		{
			PrepareEnums(connection);
			using (var transaction = connection.BeginTransaction())
			{
				foreach (var item in list)
				{
					cur = item;
					var command = _commands[QueryType.ImportUtterance];
					command.Connection = connection;
					command.Parameters["utterance_id"].Value = item.UtteranceId;
					command.Parameters["aggregator_id"].Value = item.AggregatorId;
					command.Parameters["content"].Value = item.Content;
					command.Parameters["audio_format"].Value = item.AudioFormat;
					command.Parameters["time_start"].Value = item.TimeStart;
					command.Parameters["time_duration"].Value = item.TimeDuration;
					command.Parameters["language"].Value = item.Language;
					command.Parameters["transcribes"].Value = item.Transcribes;
					command.ExecuteNonQuery();
				}
				transaction.Commit();
			}
			//}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		finally
		{
			stopwatch.Stop();
			Debug.WriteLine($"insert {list.Count} utterances in {stopwatch.ElapsedMilliseconds} ms");
		}
	}
	/// --------------------------------------------------------------------------------------
	public long InsertSpeaker(NpgsqlConnection connection = null) 
	{
		long newId = 0;
		if (connection == null)
			connection = GetConnection();
		var command = _commands[QueryType.InsertSpeakerDefault];
		command.Connection = connection;
		try
		{
			newId = (long)command.ExecuteScalar();
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return newId;
	}

	/// --------------------------------------------------------------------------------------
	public long InsertAggregator(long sourceId, long aggregatorId = 0, NpgsqlConnection connection = null)
	{
		if(connection == null)
			connection = GetConnection();
		var insertAggregatorCommand = aggregatorId > 0 ? _commands[QueryType.InsertAggregator] : _commands[QueryType.InsertAggregatorDefault];
		insertAggregatorCommand.Connection = connection;
		insertAggregatorCommand.Parameters["source_id"].Value = sourceId;
		if(aggregatorId > 0)
			insertAggregatorCommand.Parameters["aggregator_id"].Value = aggregatorId;
		try
		{
			aggregatorId = (long)insertAggregatorCommand.ExecuteScalar();
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return aggregatorId;
	}

	/// --------------------------------------------------------------------------------------
	public long SelectNextAggregatorId(NpgsqlConnection connection = null)
	{
		long aggregatorId = 0;
		if (connection == null)
			connection = GetConnection();
		var selectAggregatorId = _commands[QueryType.SelectNextAggregatorIndex];
		selectAggregatorId.Connection = connection;
		try
		{
			aggregatorId = (long)selectAggregatorId.ExecuteScalar();
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return aggregatorId;
	}

	/// --------------------------------------------------------------------------------------
	public long SelectLastAggregatorId(NpgsqlConnection connection = null)
	{
		long aggregatorId = 0;
		if (connection == null)
			connection = GetConnection();
		var selectAggregatorId = _commands[QueryType.SelectLastAggregatorIndex];
		selectAggregatorId.Connection = connection;
		try
		{
			using (var reader = selectAggregatorId.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					aggregatorId = (long)reader["aggregator_id"];
				}
				reader.Close();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return aggregatorId;
	}


	/// --------------------------------------------------------------------------------------
	public void RemoveAggregatorsById(List<long> aggregatorIdsList, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		var commandEntry = new StringBuilder();
		commandEntry.Append("DELETE FROM aggregators WHERE aggregators.aggregator_id IN(");
		var aggregatorPos = 0;
		for (; aggregatorPos < aggregatorIdsList.Count - 1; aggregatorPos++)
			commandEntry.AppendFormat("{0}, ", aggregatorIdsList[aggregatorPos]);
		commandEntry.AppendFormat("{0})", aggregatorIdsList[aggregatorPos]);
		var command = new NpgsqlCommand(commandEntry.ToString(), connection);
		try
		{
			command.ExecuteNonQuery();
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
	}


	/// --------------------------------------------------------------------------------------
	public void InsertAggregators(IList<Aggregators> aggregators,  NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		try
		{
			using (var writer = connection.BeginBinaryImport("COPY aggregators(aggregator_id, source_id) FROM STDIN BINARY"))
			{
				foreach (var item in aggregators)
					writer.WriteRow(item.AggregatorId, item.SourceId);
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
	}

	/// --------------------------------------------------------------------------------------
	public void InsertInterimsLocks(IList<InterimsLocks> interimsLocksList, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		try
		{
			using (var writer = connection.BeginBinaryImport("COPY interims_locks(lock_id, interim_id, user_id, lock_time) FROM STDIN BINARY"))
			{
				foreach (var item in interimsLocksList)
					writer.WriteRow(item.LockId, item.InterimId, item.UserId, item.LockTime);
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
	}

	/// --------------------------------------------------------------------------------------
	public void InsertSpeaker(ulong speakerId, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		var command = _commands[QueryType.InsertConcreteSpeaker];
		command.Connection = connection;
		command.Parameters["speaker_id"].Value = speakerId;
		try
		{
			command.ExecuteNonQuery();
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
	}

	/// --------------------------------------------------------------------------------------
	public long InsertSource(Source source, NpgsqlConnection connection = null)
	{
		var stopwatch = new Stopwatch();
		if (connection == null)
			connection = GetConnection();
		var command = source.LargeobjectId > 0 ? _commands[QueryType.InsertSource]: _commands[QueryType.InsertSourceEmpty];
		var nextIdCmd = _commands[QueryType.SelectNextSourceId];
		var existsRow = _commands[QueryType.SelectExistsSourceRow];
		command.Connection = connection;
		nextIdCmd.Connection = connection;
		existsRow.Connection = connection;
		stopwatch.Start();
		try
		{
			var sourceId = 0L;
			var existsSource = true;
			do
			{
				var sourceIdObject = nextIdCmd.ExecuteScalar();
				if (sourceIdObject.GetType() != typeof(DBNull))
					sourceId = (long)sourceIdObject;
				existsRow.Parameters["source_id"].Value = sourceId;
				existsSource = (bool)existsRow.ExecuteScalar();
				Debug.WriteLineIf(existsSource, $"source_id({sourceId}) is exists: {existsSource}");
			} while (existsSource);

			if (source.LargeobjectId > 0) command.Parameters["largeobject_id"].Value = source.LargeobjectId;
			command.Parameters["source_id"].Value = sourceId;
			command.Parameters["original_name"].Value = source.OriginalName;
			command.Parameters["normalized_name"].Value = NpgsqlTsVector.Parse(source.NormalizedName);
			command.Parameters["origin"].Value = source.Origin;
			command.Parameters["audio_format"].Value = source.AudioFormat;
			source.SourceId = (long)command.ExecuteScalar();
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		finally
		{
			stopwatch.Stop();
			Debug.WriteLine($"insert source in {stopwatch.ElapsedMilliseconds} ms");
		}
		return source.SourceId;
	}

	/// --------------------------------------------------------------------------------------
	public void RenameSource(long sourceId, string newName, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		try
		{
			var command = _commands[QueryType.updateSourceName];
			command.Connection = connection;
			command.Parameters["original_name"].Value = newName;
			command.Parameters["normalized_name"].Value = NpgsqlTsVector.Parse(newName);
			command.Parameters["source_id"].Value = sourceId;
			command.ExecuteNonQuery();
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
	}

	/// --------------------------------------------------------------------------------------
	public void InsertSources(IList<Source> list, NpgsqlConnection connection = null)
	{
		var stopwatch = new Stopwatch();
		stopwatch.Start();
		if (connection == null)
			connection = GetConnection();
		var commandEntry = string.Empty;
		try
		{
			using (var transaction = connection.BeginTransaction())
			{
				foreach (var item in list)
				{
					commandEntry = item.GetInsertCommandText(_textEnums);
					var command = new NpgsqlCommand(commandEntry, connection);
					command.ExecuteNonQuery();
				}
				transaction.Commit();
			}
		}
		catch (Exception  e)
		{
			Debug.WriteLine(commandEntry);
			Debug.Assert(false, e.Message);
		}
		finally
		{
			stopwatch.Stop();
			Debug.WriteLine($"insert {list.Count} sources in {stopwatch.ElapsedMilliseconds} ms");
		}
	}

	/// --------------------------------------------------------------------------------------
	public void InsertInterims(IList<Interim> list, NpgsqlConnection connection = null)
	{
		var stopwatch = new Stopwatch();
		stopwatch.Start();
		if (connection == null)
			connection = GetConnection();
		var commandText = string.Empty;
		try
		{
			using (var transaction = connection.BeginTransaction())
			{
				foreach (var item in list)
				{
					commandText = item.GetInsertCommandText();
					var command = new NpgsqlCommand(commandText, connection);
					command.ExecuteNonQuery();
				}
				transaction.Commit();
			}
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		finally
		{
			stopwatch.Stop();
			Debug.WriteLine($"insert {list.Count} sources in {stopwatch.ElapsedMilliseconds} ms");
		}
	}

	/// --------------------------------------------------------------------------------------
	public void UpdateUtteranceTranscribe(long utteranceId, string[] transcribes, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		try
		{
			var command = _commands[QueryType.UpdateUtteranceText];
			command.Connection = connection;
			command.Parameters["transcribes"].Value = transcribes;
			command.Parameters["utterance_id"].Value = utteranceId;
			command.ExecuteNonQuery();
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
	}

	/// --------------------------------------------------------------------------------------
	public void UpdateUtterancesAggregatorId(List<FullUtterance> grouppedUtterances, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		try
		{
			using (var transaction = connection.BeginTransaction())
			{
				foreach (var item in grouppedUtterances)
				{
					var command = _commands[QueryType.UpdateUtteranceAggregatorById];
					command.Connection = connection;
					command.Parameters["aggregator_id"].Value = item.AggregatorId;
					command.Parameters["utterance_id"].Value = item.UtteranceId;
					command.ExecuteNonQuery();
				}
				transaction.Commit();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
	}

	/// --------------------------------------------------------------------------------------
	public long SelectCountOfUnrecognizedGoogleAsr(DateTime dt, NpgsqlConnection connection = null)
	{
		long count = 0;
		if (connection == null)
			connection = GetConnection();
		try
		{
			var utterancesCountCommand = _commands[QueryType.SelectCountOfUnprocessedUtterancesGoogleAsr];
			utterancesCountCommand.Connection = connection;
			utterancesCountCommand.Parameters["user_id"].Value = NpgsqlDatabase.User.GoogleChrome;
			utterancesCountCommand.Parameters["time"].Value = dt.ToString("yyyy-MM-dd HH:mm:ss");
			count = (long)utterancesCountCommand.ExecuteScalar();
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		return count;
	}

	/// --------------------------------------------------------------------------------------
	public long SelectCountOfRecognizedByGoogleAsr(NpgsqlConnection connection = null)
	{
		long count = 0;
		if (connection == null)
			connection = GetConnection();
		try
		{
			var utterancesCountCommand = _commands[QueryType.SelectRecognizedMoviesUtterancesCount];
			utterancesCountCommand.Connection = connection;
			count = (long)utterancesCountCommand.ExecuteScalar();
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		return count;
	}

	/// --------------------------------------------------------------------------------------
	public long SelectCountOfAllMovieUtterances(NpgsqlConnection connection = null)
	{
		long count = 0;
		if (connection == null)
			connection = GetConnection();
		try
		{
			var utterancesCountCommand = _commands[QueryType.SelectAllMoviesUtterancesCount];
			utterancesCountCommand.Connection = connection;
			count = (long)utterancesCountCommand.ExecuteScalar();
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		return count;
	}

	/// --------------------------------------------------------------------------------------
	public long[] LoadRecognitionInfo(DateTime dt, NpgsqlConnection connection = null)
	{
		var info = new long[3];
		if (connection == null)
			connection = GetConnection();
		try
		{
			using (var transaction = connection.BeginTransaction())
			{
				var allUtterancesCountCommand = _commands[QueryType.SelectAllMoviesUtterancesCount];
				var recognizedUtterancesCountCommand = _commands[QueryType.SelectRecognizedMoviesUtterancesCount];
				var unrecognizedUtterancesCountCommand = _commands[QueryType.SelectCountOfUnprocessedUtterancesGoogleAsr];
				allUtterancesCountCommand.Connection = connection;
				recognizedUtterancesCountCommand.Connection = connection;
				unrecognizedUtterancesCountCommand.Connection = connection;
				unrecognizedUtterancesCountCommand.Parameters["user_id"].Value = NpgsqlDatabase.User.GoogleChrome;
				unrecognizedUtterancesCountCommand.Parameters["time"].Value = dt.ToString("yyyy-MM-dd HH:mm:ss");
				info[0] = (long) allUtterancesCountCommand.ExecuteScalar();
				info[1] = (long) recognizedUtterancesCountCommand.ExecuteScalar();
				info[2] = (long) unrecognizedUtterancesCountCommand.ExecuteScalar();
				transaction.Commit();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return info;
	}

	/// --------------------------------------------------------------------------------------
	public string SelectUtteranceGroups(List<string> languagesFilter, NpgsqlConnection connection = null)
	{
		var entry = new StringBuilder();
		if (connection == null)
			connection = GetConnection();

		var commandEntry = new StringBuilder();
		commandEntry.Append("SELECT utterances.utterance_id, utterances.aggregator_id, utterances.transcribes, utterances.language FROM utterances ");
		commandEntry.Append("LEFT JOIN aggregators ON aggregators.aggregator_id = utterances.aggregator_id ");
		//commandEntry.Append("LEFT JOIN interims ON interims.utterance_id = utterances.utterance_id ");
		commandEntry.Append("WHERE ");
		commandEntry.Append("(utterances.aggregator_id IN( ");
		commandEntry.Append("SELECT utterances.aggregator_id FROM utterances ");
		commandEntry.Append("WHERE utterances.transcribes IS NOT NULL AND utterances.transcribes != '{}' ");
		commandEntry.Append("GROUP BY utterances.aggregator_id  HAVING COUNT(*) > 1 ");
		commandEntry.Append(") ");
		commandEntry.Append(") ");
		if (languagesFilter.Count > 1)
		{
			commandEntry.Append("AND utterances.language IN (");
			var ci = 0;
			for (; ci < languagesFilter.Count - 1; ci++) commandEntry.Append($"\'{languagesFilter[ci]}\', ");
			commandEntry.Append($"\'{languagesFilter[ci]}\' ) ");
		}
		commandEntry.Append("ORDER BY utterances.aggregator_id ASC, utterances.language ASC");
		var command = new NpgsqlCommand(commandEntry.ToString(), connection);
		long lastAggregator = 0;
		try
		{
			using (var reader = command.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					var aggregatorId = (long)reader["aggregator_id"];
					var transcribesArray = (string[])reader["transcribes"];
					var line = $"{reader["language"]}	{transcribesArray[0]}	";
					entry.Append((aggregatorId == lastAggregator || lastAggregator == 0)? line: Environment.NewLine + line);
					lastAggregator = aggregatorId;
				}
				reader.Close();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return entry.ToString();
	}

	/// --------------------------------------------------------------------------------------
	public List<List<FullUtterance>> SelectTextGroupsByLanguagesList2(List<string> languagesFilter, NpgsqlConnection connection = null)
	{
		var grouppedUtterances = new List<List<FullUtterance>>();
		if (connection == null)
			connection = GetConnection();

		var languageFilterEnry = new StringBuilder();
		if (languagesFilter.Count > 1)
		{
			languageFilterEnry.Append("AND utterances.language IN (");
			var ci = 0;
			for (; ci < languagesFilter.Count - 1; ci++) languageFilterEnry.Append($"\'{languagesFilter[ci]}\', ");
			languageFilterEnry.Append($"\'{languagesFilter[ci]}\' ) ");
		}
		try
		{
			var selectUnionCommand = new NpgsqlCommand($@"
				SELECT groups.aggregator_id, array_agg(groups.text) as variants, array_agg(groups.language) as languages, array_agg(groups.utterance_id) as utterances, count(groups.language) as count
				FROM (
					SELECT utterances.transcribes[1] as text, utterances.utterance_id as utterance_id, 
					utterances.aggregator_id as aggregator_id, utterances.language as language FROM utterances 
					LEFT JOIN aggregators ON aggregators.aggregator_id = utterances.aggregator_id 
					WHERE (utterances.aggregator_id IN( 
						SELECT utterances.aggregator_id FROM utterances 
						WHERE utterances.transcribes IS NOT NULL AND utterances.transcribes != '{{}}'
						GROUP BY utterances.aggregator_id  HAVING COUNT(*) > 1)
					) {languageFilterEnry} 
					UNION ALL
					SELECT interims.choices[1].transcribe as text, interims.utterance_id as utterance_id, 
					utterances.aggregator_id as aggregator_id, utterances.language as language FROM interims 
					LEFT JOIN utterances ON utterances.utterance_id = interims.utterance_id 
					LEFT JOIN aggregators ON aggregators.aggregator_id = utterances.aggregator_id 
					WHERE (utterances.aggregator_id IN( 
						SELECT utterances.aggregator_id FROM utterances 
						WHERE utterances.transcribes IS NULL OR utterances.transcribes = '{{}}'
						GROUP BY utterances.aggregator_id  HAVING COUNT(*) > 1)
					) {languageFilterEnry} ORDER BY aggregator_id ASC, language ASC
				) as groups
				GROUP  BY groups.aggregator_id
				ORDER BY count DESC", connection);
			selectUnionCommand.CommandTimeout = 60000;
			using (var reader = selectUnionCommand.ExecuteReader())
			{
				while (true)
				{
					var canRead = reader.Read() ? true : false;
					if (!canRead) break;
					if (!reader.IsOnRow) continue;
					var aggregatorIdEntry = reader["aggregator_id"];
					var variantsEntry = reader["variants"];
					var languagesEntry = reader["languages"];
					var utterancesEntry = reader["utterances"];
					var countEntry = reader["count"];

					if (aggregatorIdEntry is DBNull || variantsEntry is DBNull || languagesEntry is DBNull || countEntry is DBNull || utterancesEntry is DBNull)
						continue;
					var localGroup = new List<FullUtterance>();
					var aggregatorId = (long)aggregatorIdEntry;
					var variants = (string[])variantsEntry;
					var languages = (Language[])languagesEntry;
					var utterances = (long[])utterancesEntry;
					var count = (long)countEntry;

					for (var i = 0; i < count; i++)
					{
						if (!string.IsNullOrEmpty(variants[i]))
							localGroup.Add(new FullUtterance()
							{
								UtteranceId = utterances[i],
								Transcribes = new[] { variants[i] },
								AggregatorId = aggregatorId,
								Language = languages[i]
							});
					}
					if (localGroup.Count == 0) continue;
					grouppedUtterances.Add(localGroup.ToList());
					localGroup.Clear();
				}
				reader.Close();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return grouppedUtterances;
	}


	/// --------------------------------------------------------------------------------------
	public List<List<FullUtterance>> SelectTextGroupsByLanguagesList(List<string> languagesFilter, NpgsqlConnection connection = null)
	{
		var grouppedUtterances = new List<List<FullUtterance>>();
		if (connection == null)
			connection = GetConnection();

		var languageFilterEnry = new StringBuilder();
		if (languagesFilter.Count > 1)
		{
			languageFilterEnry.Append("AND utterances.language IN (");
			var ci = 0;
			for (; ci < languagesFilter.Count - 1; ci++) languageFilterEnry.Append($"\'{languagesFilter[ci]}\', ");
			languageFilterEnry.Append($"\'{languagesFilter[ci]}\' ) ");
		}
		try
		{
			var selectUtterancesTextGroupsCommand = new NpgsqlCommand($@"
					SELECT utterances.transcribes[1] as text, utterances.utterance_id, 
					utterances.aggregator_id, utterances.language FROM utterances 
					LEFT JOIN aggregators ON aggregators.aggregator_id = utterances.aggregator_id 
					WHERE (utterances.aggregator_id IN( 
							SELECT utterances.aggregator_id FROM utterances 
							WHERE utterances.transcribes IS NOT NULL AND utterances.transcribes != '{{}}' 
							GROUP BY utterances.aggregator_id  HAVING COUNT(*) > 1)
					) {languageFilterEnry} ORDER BY utterances.aggregator_id ASC, utterances.language ASC", connection);

			var selectInterimsTextGroupsCommand = new NpgsqlCommand($@"
					SELECT interims.choices[1].transcribe as text, interims.utterance_id, 
					utterances.aggregator_id, utterances.language FROM interims 
					LEFT JOIN utterances ON utterances.utterance_id = interims.utterance_id 
					LEFT JOIN aggregators ON aggregators.aggregator_id = utterances.aggregator_id 
					WHERE (utterances.aggregator_id IN( 
						SELECT utterances.aggregator_id FROM utterances 
						WHERE utterances.transcribes IS NULL OR utterances.transcribes = '{{}}' 
						GROUP BY utterances.aggregator_id  HAVING COUNT(*) > 1)
					) {languageFilterEnry} ORDER BY utterances.aggregator_id ASC, utterances.language ASC", connection);

			selectUtterancesTextGroupsCommand.CommandTimeout = 60000;
			selectInterimsTextGroupsCommand.CommandTimeout = 60000;
			using (var transaction = connection.BeginTransaction())
			{
				using (var reader = selectUtterancesTextGroupsCommand.ExecuteReader())
				{
					var localGroup = new List<FullUtterance>();
					long lastAggregatorId = 0;
					while (true)
					{
						var canRead = reader.Read()? true: false;
						if (!canRead) break;

						if (!reader.IsOnRow) continue;
						var transcribes = reader["text"];
						var utteranceId = reader["utterance_id"];
						var aggregatorId = reader["aggregator_id"];
						var language = reader["language"];
						if (transcribes is DBNull || utteranceId is DBNull || aggregatorId is DBNull || language is DBNull)
							continue;
						var utterance = new FullUtterance()
						{
							Transcribes = new[] { (string)transcribes },
							UtteranceId = (long)utteranceId,
							AggregatorId = (long)aggregatorId,
							Language = (Language)language
						};
						if (lastAggregatorId == 0 || lastAggregatorId != utterance.AggregatorId)
						{
							lastAggregatorId = utterance.AggregatorId;
							if (localGroup.Count > 0)
							{
								grouppedUtterances.Add(localGroup.ToList());
								localGroup.Clear();
							}
						}
						localGroup.Add(utterance);
					}
					reader.Close();
					grouppedUtterances.Add(localGroup.ToList());
					localGroup.Clear();
				}

				using (var reader = selectInterimsTextGroupsCommand.ExecuteReader())
				{
					var localGroup = new List<FullUtterance>();
					long lastAggregatorId = 0;
					while (true)
					{
						var canRead = reader.Read() ? true : false;
						if (!canRead) break;
						if (!reader.IsOnRow) continue;
						var transcribes = reader["text"];
						var utteranceId = reader["utterance_id"];
						var aggregatorId = reader["aggregator_id"];
						var language = reader["language"];
						if (transcribes is DBNull || utteranceId is DBNull || aggregatorId is DBNull || language is DBNull)
							continue;
						var utterance = new FullUtterance()
						{
							Transcribes = new[] { (string)transcribes },
							UtteranceId = (long)utteranceId,
							AggregatorId = (long)aggregatorId,
							Language = (Language)language
						};
						if (lastAggregatorId == 0 || lastAggregatorId != utterance.AggregatorId)
						{
							lastAggregatorId = utterance.AggregatorId;
							if (localGroup.Count > 0)
							{
								grouppedUtterances.Add(localGroup.ToList());
								localGroup.Clear();
							}
						}
						localGroup.Add(utterance);
					}
					reader.Close();
					grouppedUtterances.Add(localGroup.ToList());
					localGroup.Clear();
				}

				transaction.Commit();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return grouppedUtterances;
	}

	/// --------------------------------------------------------------------------------------
	public List<List<FullUtterance>> SelectGrouppedUtterancesByLanguagesList(List<string> languagesFilter, NpgsqlConnection connection = null)
	{
		var grouppedUtterances = new List<List<FullUtterance>>();
		if (connection == null)
			connection = GetConnection();

		var commandEntry = new StringBuilder();
		commandEntry.Append("SELECT utterances.utterance_id, utterances.aggregator_id, utterances.transcribes, utterances.language FROM utterances ");
		commandEntry.Append("LEFT JOIN aggregators ON aggregators.aggregator_id = utterances.aggregator_id ");
		commandEntry.Append("WHERE ");
		commandEntry.Append("(utterances.aggregator_id IN( ");
		commandEntry.Append("SELECT utterances.aggregator_id FROM utterances ");
		commandEntry.Append("WHERE utterances.transcribes IS NOT NULL AND utterances.transcribes != '{}' ");
		commandEntry.Append("GROUP BY utterances.aggregator_id  HAVING COUNT(*) > 1 ");
		commandEntry.Append(") ");
		commandEntry.Append(") ");
		if (languagesFilter.Count > 1)
		{
			commandEntry.Append("AND utterances.language IN (");
			var ci = 0;
			for (; ci < languagesFilter.Count - 1; ci++) commandEntry.Append($"\'{languagesFilter[ci]}\', ");
			commandEntry.Append($"\'{languagesFilter[ci]}\' ) ");
		}
		commandEntry.Append("ORDER BY utterances.aggregator_id ASC, utterances.language ASC");
		var command = new NpgsqlCommand(commandEntry.ToString(), connection);
		try
		{
			using (var reader = command.ExecuteReader())
			{
				var localGroup = new List<FullUtterance>();
				long lastAggregatorId = 0;
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					var utterance = new FullUtterance()
					{
						UtteranceId = (long)reader["utterance_id"],
						AggregatorId = (long)reader["aggregator_id"],
						Transcribes = (string[])reader["transcribes"],
						Language = (Language)reader["language"]
					};
					if (lastAggregatorId == 0 || lastAggregatorId != utterance.AggregatorId)
					{
						lastAggregatorId = utterance.AggregatorId;
						if (localGroup.Count > 0)
						{
							grouppedUtterances.Add(localGroup.ToList());
							localGroup.Clear();
						}
					}
					localGroup.Add(utterance);
				}
				reader.Close();
				grouppedUtterances.Add(localGroup.ToList());
				localGroup.Clear();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return grouppedUtterances;

	}

	/// --------------------------------------------------------------------------------------
	public IList<FullUtterance> SelectUtterancesBySourceName(string sourceName = "", long sourceId = 0, NpgsqlConnection connection = null)
	{
		var utterances = new List<FullUtterance>();
		if (connection == null)
			connection = GetConnection();
		try
		{
			var commandEntry = new StringBuilder();
			commandEntry.Append("SELECT utterances.utterance_id, utterances.language, utterances.audio_format, utterances.aggregator_id, utterances.time_start,utterances.time_duration, utterances.transcribes ");
			commandEntry.Append("FROM utterances ");
			commandEntry.Append("LEFT JOIN aggregators ON utterances.aggregator_id = aggregators.aggregator_id ");
			commandEntry.Append("LEFT JOIN sources ON aggregators.source_id = sources.source_id ");
			commandEntry.Append("WHERE ");
			if(!string.IsNullOrEmpty(sourceName))
				commandEntry.Append($"sources.original_name LIKE '{sourceName}' AND ");
			else if (sourceId > 0)
				commandEntry.Append($"sources.source_id = {sourceId} AND ");
			else
				throw new InvalidDataException($"Wrong input data (source: {sourceName}, sourceId: {sourceId})");
			commandEntry.Append("utterances.transcribes IS NOT NULL AND ");
			commandEntry.Append("utterances.transcribes != '{}' ");
			var command = new NpgsqlCommand(commandEntry.ToString(), connection);
			using (var reader = command.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					var utterance = new FullUtterance
					{
						UtteranceId = (long)reader["utterance_id"],
						AggregatorId = (long)reader["aggregator_id"],
						TimeStart = (int)reader["time_start"],
						TimeDuration = (int)reader["time_duration"],
						Language = (Language)reader["language"],
						AudioFormat = (AudioFormat)reader["audio_format"],
						Transcribes = (string[])reader["transcribes"]
					};
					utterances.Add(utterance);
				}
				reader.Close();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return utterances;
	}

	/// --------------------------------------------------------------------------------------
	public FullUtterance SelectUtteranceById(long utteranceId, NpgsqlConnection connection = null)
	{
		FullUtterance utterance = null;
		if (connection == null)
			connection = GetConnection();
		try
		{
			var selecttUtterancesByIdCommand = _commands[QueryType.SelectUtteranceById];
			selecttUtterancesByIdCommand.Connection = connection;
			selecttUtterancesByIdCommand.Parameters["utterance_id"].Value = utteranceId;
			using (var reader = selecttUtterancesByIdCommand.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					utterance = new FullUtterance
					{
						UtteranceId = (long) reader["utterance_id"],
						SourceId = (long) reader["source_id"],
						AggregatorId = (long)reader["aggregator_id"],
						Content = (byte[]) reader["content"],
						Origin = (Origin)reader["origin"],
						AudioFormat = (AudioFormat)reader["audio_format"],
						TimeStart = (int) reader["time_start"],
						TimeDuration = (int) reader["time_duration"],
						Language = (Language)reader["language"]
					};
					var transcribes = reader["transcribes"];
					if (transcribes.GetType() != typeof (DBNull))
						utterance.Transcribes = (string[]) transcribes;
					long nullableInterimId = 0;
					long.TryParse(reader["interim_id"].ToString(), out nullableInterimId);
					if (nullableInterimId > 0)
						utterance.Interim = new Interim() { InterimId = nullableInterimId, UtteranceId = utterance.UtteranceId };
				}
				reader.Close();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}

		return utterance;
	}

	/// --------------------------------------------------------------------------------------
	public string SelectMovieUtteranceTranscribeText(long utteranceId, long choiceIndex = 1, NpgsqlConnection connection = null)
	{
		var result = string.Empty;
		if (connection == null)
			connection = GetConnection();
		try
		{
			var selecttUtterancesHeadersCommand = _commands[QueryType.SelectMovieUtteranceTranscribe];
			selecttUtterancesHeadersCommand.Connection = connection;
			selecttUtterancesHeadersCommand.Parameters["choice_index"].Value = choiceIndex;
			selecttUtterancesHeadersCommand.Parameters["utterance_id"].Value = utteranceId;
			var text = (string)selecttUtterancesHeadersCommand.ExecuteScalar();
			result = text.Substring(text.IndexOf("\"", StringComparison.Ordinal) + 1, text.LastIndexOf("\"", StringComparison.Ordinal) - text.IndexOf("\"", StringComparison.Ordinal) - 1);
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		return result;
	}

	/// --------------------------------------------------------------------------------------
	public IList<Origin> SelectUtterancesOrigins(NpgsqlConnection connection = null)
	{
		var result = new List<Origin>();
		if (connection == null)
			connection = GetConnection();
		try
		{
			var command = _commands[QueryType.SelectUtterancesOrigins];
			command.Connection = connection;
			using (var reader = command.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					result.Add((Origin)reader["origin"]);
				}
				reader.Close();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return result;
	}

	/// --------------------------------------------------------------------------------------
	public IList<Language> SelectUtterancesLanguages(NpgsqlConnection connection = null)
	{
		var result = new List<Language>();
		if (connection == null)
			connection = GetConnection();
		try
		{
			var command = _commands[QueryType.SelectUtterancesLanguages];
			command.Connection = connection;
			using (var reader = command.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					result.Add((Language)reader["language"]);
				}
				reader.Close();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return result;
	}

	/// --------------------------------------------------------------------------------------
	public IList<string> SelectSourcesNames(NpgsqlConnection connection = null)
	{
		var result = new List<string>();
		if (connection == null)
			connection = GetConnection();
		try
		{
			var command = _commands[QueryType.SelectSourceOriginalNames];
			command.Connection = connection;
			using (var reader = command.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					result.Add((string)reader["original_name"]);
				}
				reader.Close();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return result;
	}

	/// --------------------------------------------------------------------------------------
	private string PrepareUtteranceFilter(bool withTranscribe, string movieName, IList<Language> languages, IList<Origin> origins, NpgsqlConnection connection = null)
	{
		var filterEntry = new StringBuilder(" WHERE (");
		bool m = false;
		if (withTranscribe)
		{
			filterEntry.Append("(utterances.transcribes IS NOT NULL AND utterances.transcribes != '{}')");
			m = true;
		}
		if (languages != null && languages.Count > 0)
		{
			filterEntry.Append(m ? " AND (" : " (");
			filterEntry.Append("utterances.language IN (");
			var li = 0;
			for (; li < languages.Count- 1; li++) filterEntry.Append($"'{_textEnums[languages[li]]}', ");
			filterEntry.Append($"'{_textEnums[languages[li]]}')");
			filterEntry.Append(")");
			m = true;
		}
		if (origins != null && origins.Count > 0)
		{
			filterEntry.Append(m ? " AND (" : " (");
			filterEntry.Append("sources.origin IN (");
			var oi = 0;
			for (; oi < origins.Count - 1; oi++) filterEntry.Append($"'{_textEnums[origins[oi]]}', ");
			filterEntry.Append($"'{_textEnums[origins[oi]]}')");
			filterEntry.Append(")");
			m = true;
		}
		if (movieName != string.Empty)
		{
			filterEntry.Append(m ? " AND (" : " (");
			filterEntry.Append($"sources.original_name LIKE \'%{movieName}%\')");
		}
		filterEntry.Append(")");
		return filterEntry.ToString();
	}

	/// --------------------------------------------------------------------------------------
	public long SelectUtterancesCount(bool withTranscribe = false, string movieNameFilter = "", IList<Language> languagesFilter = null, IList<Origin> originsFilter = null, NpgsqlConnection connection = null)
	{
		long count = 0;
		if (connection == null)
			connection = GetConnection();
		try
		{
			var utterancesCountCommand = connection.CreateCommand();
			var filter = (withTranscribe || movieNameFilter != "" || languagesFilter != null || originsFilter != null)
				? PrepareUtteranceFilter(withTranscribe, movieNameFilter, languagesFilter, originsFilter)
				: string.Empty;
			utterancesCountCommand.CommandText = $@"
				SELECT COUNT(*) FROM utterances 
				LEFT JOIN interims ON utterances.utterance_id = interims.utterance_id 
				LEFT JOIN aggregators ON utterances.aggregator_id = aggregators.aggregator_id 
				LEFT JOIN sources ON aggregators.source_id = sources.source_id 
				{filter}";
			count = (long)utterancesCountCommand.ExecuteScalar();
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		return count;
	}

	/// --------------------------------------------------------------------------------------
	public IList<FullUtterance> SelectUtterancesHeaders(long skip, long limit, bool withTranscribe = false, string movieNameFilter = "", List<Language> languagesFilter = null, List<Origin> originsFilter = null, NpgsqlConnection connection = null)
	{
		var result = new List<FullUtterance>();
		if (connection == null)
			connection = GetConnection();
		try
		{
			var utterancesHeadersCommand = connection.CreateCommand();
			var filter = (withTranscribe || movieNameFilter != string.Empty || languagesFilter != null || originsFilter != null)
				? PrepareUtteranceFilter(withTranscribe, movieNameFilter, languagesFilter, originsFilter)
				: string.Empty;
			utterancesHeadersCommand.CommandText = $@"
				SELECT utterances.utterance_id, sources.source_id, sources.origin, utterances.audio_format, utterances.time_start, 
				utterances.time_duration, utterances.language, interims.interim_id FROM utterances 
				LEFT JOIN interims ON utterances.utterance_id = interims.utterance_id 
				LEFT JOIN aggregators ON utterances.aggregator_id = aggregators.aggregator_id 
				LEFT JOIN sources ON aggregators.source_id = sources.source_id 
				{filter} ORDER BY utterances.utterance_id ASC LIMIT {limit} OFFSET {skip}";

			using (var reader = utterancesHeadersCommand.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					var newElement = new FullUtterance()
					{
						UtteranceId = (long)reader["utterance_id"],
						SourceId = (long)reader["source_id"],
						Origin = (Origin)reader["origin"],
						AudioFormat = (AudioFormat)reader["audio_format"],
						TimeStart = (int)reader["time_start"],
						TimeDuration = (int)reader["time_duration"],
						Language = (Language)reader["language"]
					};
					long nullableInterimId = 0;
					long.TryParse(reader["interim_id"].ToString(), out nullableInterimId);
					if (nullableInterimId > 0)
						newElement.Interim = new Interim() { InterimId = nullableInterimId, UtteranceId = newElement.UtteranceId };
					result.Add(newElement);
				}
				reader.Close();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return result;
	}

	/// --------------------------------------------------------------------------------------
	public byte[] SelectUtteranceContentById(long utteranceId, NpgsqlConnection connection = null)
	{
		var result = new byte[]{};
		if (connection == null)
			connection = GetConnection();
		try
		{
			var utteranceContentCommand = _commands[QueryType.SelectUtteranceContentById];
			utteranceContentCommand.Connection = connection;
			utteranceContentCommand.Parameters["utterance_id"].Value = utteranceId;
			result = (byte[])utteranceContentCommand.ExecuteScalar();
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		return result;
	}

	/// --------------------------------------------------------------------------------------
	public List<FullUtterance> SelectNextPair()
	{
		var nextPair = new List<FullUtterance>();

		return nextPair;
	}

	/// --------------------------------------------------------------------------------------
	public static T CastEnum<T>(string textValue)
	{
		var type = typeof(T);
		if (!type.IsEnum) throw new InvalidOperationException();
		foreach (var field in type.GetFields())
		{
			var attribute = Attribute.GetCustomAttribute(field,
				typeof(EnumLabelAttribute)) as EnumLabelAttribute;
			if (attribute != null)
			{
				if (attribute.Label == textValue)
					return (T)field.GetValue(null);
			}
			else
			{
				if (field.Name == textValue)
					return (T)field.GetValue(null);
			}
		}
		throw new ArgumentException("Not found.", textValue);
	}

	/// --------------------------------------------------------------------------------------
	public static string CastEnum(Enum value)
	{
		var type = value.GetType();
		if (!type.IsEnum)
			throw new InvalidOperationException();

		foreach (var field in type.GetFields())
		{
			var attribute = Attribute.GetCustomAttribute(field,
				typeof(EnumLabelAttribute)) as EnumLabelAttribute;

			if (attribute != null && value.ToString() == field.Name)
				return attribute.Label;
		}
		return string.Empty;
	}

	/// --------------------------------------------------------------------------------------
	public static string ClearText(string input)
	{
		return input.Replace('-', ' ')
					.Replace('–', ' ')
					.Replace('.', ' ')
					.Replace(',', ' ')
					.Replace(':', ' ')
					.Replace('?', ' ')
					.Replace('´', ' ')
					.Replace('!', ' ')
					.Replace("  ", " ")
					.Trim();
	}

	/// --------------------------------------------------------------------------------------
	public static string EscapeText(string input)
	{
		return input.Replace("'", "''");//.Replace("´", "\'");///*.Replace("\"", "\"\"")*/.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_").Replace("?", "\\?");
	}

	/// --------------------------------------------------------------------------------------
	public FullUtterance SelectNextElementForGoogleAsr(DateTime dt, bool lockInterim = false, NpgsqlConnection connection = null)
	{
		FullUtterance utterance = null;
		if (connection == null)
			connection = GetConnection();
		try
		{
			var selectNextUtteranceCommand = _commands[QueryType.SelectNextUnprocessedUtteranceGoogleAsr];
			selectNextUtteranceCommand.Connection = connection;
			selectNextUtteranceCommand.Parameters["user_id"].Value = User.GoogleChrome;
			selectNextUtteranceCommand.Parameters["time"].Value = dt.ToString("yyyy-MM-dd HH:mm:ss");

			var stopWatch  = new Stopwatch();
			stopWatch.Start();
			using (var transaction = connection.BeginTransaction())
			{
				using (var reader = selectNextUtteranceCommand.ExecuteReader())
				{
					while (reader.Read())
					{
						if (!reader.IsOnRow) continue;
						utterance = new FullUtterance
						{
							UtteranceId = (long)reader["utterance_id"],
							SourceId = (long)reader["source_id"],
							Content = (byte[])reader["content"],
							Origin = (Origin)reader["origin"],
							AudioFormat = (AudioFormat)reader["audio_format"],
							TimeStart = (int)reader["time_start"],
							TimeDuration = (int)reader["time_duration"],
							Language = (Language)reader["language"],
							Interim = new Interim() { InterimId = (long)reader["interim_id"] }
						};
					}
					reader.Close();
				}
				if(lockInterim && utterance!=null)
					this.LockInterim(utterance.Interim.InterimId, (long)User.GoogleChrome, DateTime.UtcNow, connection);
				transaction.Commit();
			}
			stopWatch.Stop();
			var sec = stopWatch.ElapsedMilliseconds;
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		return utterance;
	}

	/// --------------------------------------------------------------------------------------
	public void UpdateInterim(Interim source, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		try
		{
			var haveChoices = source.Choices != null && source.Choices.Length > 0;
			var commandEntry = new StringBuilder();
			commandEntry.Append("UPDATE interims SET choices = ");
			if (haveChoices)
			{
				commandEntry.Append(" ARRAY[ ");
				var ci = 0;
				for (; ci < source.Choices.Length - 1; ci++) commandEntry.Append($"{source.Choices[ci].GetInsertCommandText()}, ");
				commandEntry.Append($"{source.Choices[ci].GetInsertCommandText()} ]  ");
			}else
				commandEntry.Append("NULL  ");

			commandEntry.Append($" WHERE interim_id = {source.InterimId}");

			var comand = new NpgsqlCommand(commandEntry.ToString(), connection);
			comand.ExecuteNonQuery();
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
	}

	/// --------------------------------------------------------------------------------------
	private bool CheckDistance(string a, string b, byte maxDistance = 3, NpgsqlConnection connection = null)
	{
		var d = 0;
		var wordsA = a.Split(' ');
		var wordsB = b.Split(' ');
		if (wordsA.Length != wordsB.Length)
			return false;
		for (var i = 0; i < wordsA.Length; i++)
		{
			var wordA = wordsA[i];
			var wordB = wordsB[i];
			var distance = CalcDistance(wordA, wordB);
			if (distance >= maxDistance)
				d++;
		}		
		return d == 0;
	}

	/// --------------------------------------------------------------------------------------
	public void ProcessGoogleAsrResults(long utteranceId, List<string> results, NpgsqlConnection connection = null)
	{
		byte maxDistance = 3;
		if (connection == null)
			connection = GetConnection();
		var actions = new List<string>();

		// todo: remove 
		NpgsqlCommand selectInterimIdCommand;
		long interimId = 0;
		List<UtteranceChoice> choices = new List<UtteranceChoice>();
		string transcribeText = string.Empty;
		bool updateUtteranceTransribe = false;
		// todo: remove
		try
		{
			using (var transaction = connection.BeginTransaction())
			{
				selectInterimIdCommand = _commands[QueryType.SelectInterimIdForUtterance];
				selectInterimIdCommand.Connection = connection;
				selectInterimIdCommand.Parameters["utterance_id"].Value = utteranceId;
				interimId = (long)selectInterimIdCommand.ExecuteScalar();
				actions.Add("select interim");
				// TODO: select first choice by SQL request directly
				choices = this.SelectInterimChoices(interimId, connection);
				actions.Add("select interim choices");
				// TODO: remove extra symbols by regual exp
				if (string.IsNullOrEmpty(choices[0].Transcribe))
				{
					actions.Add("empty transcribe");
					Debug.Assert(true, "empty transcribe");
					return;
				}
				transcribeText = choices[0].Transcribe
					.Replace('-', ' ')
					.Replace('–', ' ')
					.Replace('.', ' ')
					.Replace('"', ' ')
					//.Replace('\'', ' ')
					.Replace(',', ' ')
					.Replace(':', ' ')
					.Replace('?', ' ')
					.Replace('!', ' ')
					.Replace("  ", " ")
					.Trim();

				// check distance
				updateUtteranceTransribe = false;
				foreach (var result in results)
				{
					var success = this.CheckDistance(transcribeText, result, maxDistance);
					Debug.WriteLine($"success: {success} comparison between text #1 \"{transcribeText}\" and text #2 \"{result}\"");
					if (!success) continue;
					updateUtteranceTransribe = true;
					break;
				}
				actions.Add("check distance");
				// update choices
				if (!updateUtteranceTransribe)
				{
					if (choices.Count > 1 && choices.Count == results.Count + 1)
					{
						for (var ri = 0; ri < results.Count; ri++)
							choices[ri + 1] = new UtteranceChoice() { Transcribe = results[ri] };
					}
					else
					{
						var newChoices = new List<UtteranceChoice>() { new UtteranceChoice() { Transcribe = transcribeText } };
						for (var ri = 0; ri < results.Count; ri++)
							newChoices.Add(new UtteranceChoice() { Transcribe = results[ri] });
						choices = newChoices;
					}
					this.UpdateInterim(new Interim()
					{
						InterimId = interimId,
						Choices = choices.ToArray()
					}, connection);
					actions.Add("update interim with new choices");
				}
				else
				{
					// TODO: remove interim from database & update utterance transcribe
					this.DeleteInterim(interimId, connection);
					actions.Add("delete interim");
					this.UpdateUtteranceTranscribe(utteranceId, new[] { transcribeText }, connection);
					actions.Add("update transcribe");
				}
				transaction.Commit();
				actions.Add("update choices");
			}
		}
		catch(Exception  e)
		{
			if(actions.Count > 0 || interimId!= 0 && utteranceId != 0)
				Debug.Assert(false, e.Message);
		}
	}

	/// --------------------------------------------------------------------------------------
	public uint UploadLargeObject(Stream objectStream, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		var manager = new NpgsqlLargeObjectManager(connection);
		var oid = manager.Create();
		var uid = uint.MinValue;
		try
		{
			using (var transaction = connection.BeginTransaction())
			{
				using (var stream = manager.OpenReadWrite(oid))
				{
					var buffer = new byte[objectStream.Length];
					objectStream.Read(buffer, 0, buffer.Length);
					stream.Write(buffer, 0, buffer.Length);
					stream.Seek(0, System.IO.SeekOrigin.Begin);
				}
				transaction.Commit();
			}
			uid = oid;
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		return uid;
	}

	/// --------------------------------------------------------------------------------------
	public Stream ReadLargeObject(uint id, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		var manager = new NpgsqlLargeObjectManager(connection);
		var largeObjectStream = new MemoryStream();
		try
		{
			using (var transaction = connection.BeginTransaction())
			{
				using (var stream = manager.OpenReadWrite(id))
				{
					var buffer = new byte[stream.Length];
					stream.Read(buffer, 0, buffer.Length);
					largeObjectStream.Write(buffer, 0, buffer.Length);
				}
				transaction.Commit();
			}
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		return largeObjectStream;
	}

	/// --------------------------------------------------------------------------------------
	public void DeleteInterim(long interimId, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		try
		{
			var command = _commands[QueryType.DeleteInterim];
			command.Connection = connection;
			command.Parameters["interim_id"].Value = interimId;
			command.ExecuteNonQuery();
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
	}

	/// --------------------------------------------------------------------------------------
	public void DeleteInterimLocks(long interimId, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		try
		{
			var command = _commands[QueryType.DeleteInterimLocksByInterimId];
			command.Connection = connection;
			command.Parameters["interim_id"].Value = interimId;
			command.ExecuteNonQuery();
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
	}

	/// --------------------------------------------------------------------------------------
	public void DeleteInterimLockById(long lockId, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		try
		{
			var command = _commands[QueryType.DeleteInterimLockByLockId];
			command.Connection = connection;
			command.Parameters["lock_id"].Value = lockId;
			command.ExecuteNonQuery();
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
	}

	/// --------------------------------------------------------------------------------------
	public List<InterimsLocks> SelectInterimLocks(long interimId, NpgsqlConnection connection = null)
	{
		var interimLocks = new List<InterimsLocks>();
		if (connection == null)
			connection = GetConnection();
		try
		{
			var selectInterimLocks = _commands[QueryType.SelectInterimsLocks];
			selectInterimLocks.Connection = connection;
			selectInterimLocks.Parameters["interim_id"].Value = interimId;
			// load locks
			using (var reader = selectInterimLocks.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					interimLocks.Add(new InterimsLocks()
					{
						LockId = (long)reader["lock_id"],
						InterimId = (long)reader["interim_id"],
						UserId = (long)reader["user_id"],
						LockTime = (DateTime)reader["lock_time"]
					});
				}
				reader.Close();
			}
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		return interimLocks;
	}


	/// --------------------------------------------------------------------------------------
	private string PrepareInterimFilter(long userIdFilter, DateTime dateFilter, string movieName, List<Language> languages, List<Origin> origins)
	{
		var filterEntry = new StringBuilder(" WHERE (");
		bool m = false;
		if (true)
		{
			filterEntry.Append("(utterances.transcribes IS NULL OR utterances.transcribes = '{}')");
			m = true;
		}
		if (languages != null && languages.Count > 0)
		{
			filterEntry.Append(m ? " AND (" : " (");
			filterEntry.Append("utterances.language IN (");
			var li = 0;
			for (; li < languages.Count - 1; li++) filterEntry.Append($"'{_textEnums[languages[li]]}', ");
			filterEntry.Append($"'{_textEnums[languages[li]]}')");
			filterEntry.Append(")");
			m = true;
		}
		if (origins != null && origins.Count > 0)
		{
			filterEntry.Append(m ? " AND (" : " (");
			filterEntry.Append("sources.origin IN (");
			var oi = 0;
			for (; oi < origins.Count - 1; oi++) filterEntry.Append($"'{_textEnums[origins[oi]]}', ");
			filterEntry.Append($"'{_textEnums[origins[oi]]}')");
			filterEntry.Append(")");
			m = true;
		}
		if (movieName != string.Empty)
		{
			filterEntry.Append(m ? " AND (" : " (");
			filterEntry.Append($"sources.original_name LIKE \'%{movieName}%\')");
		}
		if (userIdFilter > 0)
			filterEntry.Append($" AND interims.interim_id NOT IN(SELECT interims_locks.interim_id FROM interims_locks WHERE interims_locks.user_id = {userIdFilter} AND interims_locks.lock_time > '{dateFilter}')");
		filterEntry.Append(")");
		return filterEntry.ToString();
	}


	/// --------------------------------------------------------------------------------------
	public long SelectInterimsCount(long userIdFilter, DateTime dateFilter, string movieName = "", List<Language> languages = null, List<Origin> origins = null, NpgsqlConnection connection = null)
	{
		long count = 0;
		if (connection == null)
			connection = GetConnection();
		try
		{
			var filter = (userIdFilter!= 0 || movieName != string.Empty || languages != null || origins != null)
				? this.PrepareInterimFilter(userIdFilter, dateFilter, movieName, languages, origins)
				: string.Empty;
			var selectInterimsCountCommand = connection.CreateCommand();
			selectInterimsCountCommand.CommandText = $@"
				SELECT COUNT(*) FROM interims 
				LEFT JOIN utterances ON interims.utterance_id = utterances.utterance_id 
				LEFT JOIN aggregators ON utterances.aggregator_id = aggregators.aggregator_id 
				LEFT JOIN sources ON aggregators.source_id = sources.source_id
				LEFT JOIN interims_locks ON interims_locks.interim_id = interims.interim_id
				{filter}";
			count = (long)selectInterimsCountCommand.ExecuteScalar();
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return count;
	}

	/// --------------------------------------------------------------------------------------
	public long SelectTimeDurationSum(string movieName = "", List<Language> languages = null, List<Origin> origins = null, NpgsqlConnection connection = null)
	{
		long time = 0;
		if (connection == null)
			connection = GetConnection();
		try
		{
			var filter = (movieName != string.Empty || languages != null || origins != null)
				? PrepareUtteranceFilter(withTranscribe: true, movieName: movieName, languages: languages, origins: origins)
				: string.Empty;
			var selectInterimsCountCommand = connection.CreateCommand();
			selectInterimsCountCommand.CommandText = $@"
				SELECT SUM(time_duration-time_start*2) FROM utterances 
				LEFT JOIN interims ON interims.utterance_id = utterances.utterance_id 
				LEFT JOIN aggregators ON utterances.aggregator_id = aggregators.aggregator_id 
				LEFT JOIN sources ON aggregators.source_id = sources.source_id
				{filter}";
			time = (long) selectInterimsCountCommand.ExecuteScalar();
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return time;
	}

	/// --------------------------------------------------------------------------------------
	public List<Statistics> SelectVoiceStatistics(NpgsqlConnection connection = null)
	{
		var statList = new List<Statistics>();
		if (connection == null)
			connection = GetConnection();
		try
		{
			var selectStatCommand = _commands[QueryType.SelectlanguagesStat];
			selectStatCommand.Connection = connection;
			using (var reader = selectStatCommand.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					var element = new Statistics()
					{
						Language = CastEnum((Language)reader["language"]),
						Count = (long)reader["count"],
						Time = (long)reader["sum"],
					};
					statList.Add(element);
				}
				reader.Close();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return statList;
	}

	/// --------------------------------------------------------------------------------------
	public List<Interim> SelectInterimsHeaders(long skip, long limit, long userIdFilter, DateTime dateFilter, string movieName = "", List<Language> languages = null, List<Origin> origins = null,  NpgsqlConnection connection = null)
	{
		var result = new List<Interim>();
		if (connection == null)
			connection = GetConnection();
		try
		{
			var filter = (userIdFilter != 0 || movieName != string.Empty || languages != null || origins != null)
				? this.PrepareInterimFilter(userIdFilter, dateFilter, movieName, languages, origins)
				: string.Empty;
			var utterancesHeadersCommand = connection.CreateCommand();
			utterancesHeadersCommand.CommandText = $@"
				SELECT interims.interim_id, interims.utterance_id FROM interims 
				LEFT JOIN utterances ON interims.utterance_id = utterances.utterance_id
				LEFT JOIN aggregators ON utterances.aggregator_id = aggregators.aggregator_id 
				LEFT JOIN sources ON aggregators.source_id = sources.source_id 
				LEFT JOIN interims_locks ON interims_locks.interim_id = interims.interim_id {filter}
				ORDER BY utterances.utterance_id ASC LIMIT {limit} OFFSET {skip}";
			using (var reader = utterancesHeadersCommand.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					var newElement = new Interim()
					{
						InterimId = (long)reader["interim_id"],
						UtteranceId = (long)reader["utterance_id"],
					};
					result.Add(newElement);
				}
				reader.Close();
			}

			// lock 

		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return result;
	}

	/// --------------------------------------------------------------------------------------
	public FullUtterance SelectInterimById(long interimId, NpgsqlConnection connection = null)
	{
		FullUtterance result = null;
		if (connection == null)
			connection = GetConnection();
		try
		{
			var selectInterimByIdCommand = _commands[QueryType.SelectInterimById];
			selectInterimByIdCommand.Parameters["interim_id"].Value = interimId;
			selectInterimByIdCommand.Connection = connection;
			long utteranceId = 0;
			byte[] content = null;
			using (var reader = selectInterimByIdCommand.ExecuteReader())
			{
				var choicesList = new List<UtteranceChoice>();
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					if (utteranceId == 0)
						utteranceId = (long)reader["utterance_id"];
					if (content == null)
						content = (byte[])reader["content"];
					var choiceText = (string)reader["choice"];
					var choice = UtteranceChoice.Parse(choiceText);
					choicesList.Add(choice);
				}
				reader.Close();
				result = new FullUtterance()
				{
					UtteranceId = utteranceId,
					Content = content,
					Interim = new  Interim(interimId: interimId, utteranceId: utteranceId, choices: choicesList.ToArray())
				};
				choicesList.Clear();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return result;
	}


	/// --------------------------------------------------------------------------------------
	public List<UtteranceChoice> SelectInterimChoices(long interimId, NpgsqlConnection connection = null)
	{
		var interimChoices = new List<UtteranceChoice>();
		if (connection == null)
			connection = GetConnection();
		try
		{
			var selectInterimChoices = _commands[QueryType.SelectInterimChoices];
			selectInterimChoices.Connection = connection;
			selectInterimChoices.Parameters["interim_id"].Value = interimId;
			using (var reader = selectInterimChoices.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					interimChoices.Add(UtteranceChoice.Parse(reader.GetString(0)));
				}
				reader.Close();
			}
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		return interimChoices;
	}

	/// --------------------------------------------------------------------------------------
	public void LockInterims(List<long> interimsIdList, long userId, DateTime lockTime, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		if (interimsIdList?.Count == 0)
			return;
		var data = new List<KeyValuePair<long, long>>(); // lock_id - interim_id
		try
		{
			var nextIdCmd = _commands[QueryType.SelectNextInterimLockId];
			var existsRow = _commands[QueryType.SelectExistsInterimLockRow];
			nextIdCmd.Connection = connection;
			existsRow.Connection = connection;
			var lockId = 0L;
			while (data.Count < interimsIdList.Count)
			{
				var lockIdObject = nextIdCmd.ExecuteScalar();
				if (lockIdObject.GetType() != typeof (DBNull))
					lockId = (long) lockIdObject;
				existsRow.Parameters["lock_id"].Value = lockId;
				var existsLock = (bool)existsRow.ExecuteScalar();
				Debug.WriteLineIf(existsLock, $"lockId({lockId}) is exists: {existsLock}");
				if (!existsLock)
					data.Add(new KeyValuePair<long, long>(lockId, interimsIdList[data.Count]));
			}
			var commandText = $"INSERT INTO interims_locks (lock_id, interim_id, user_id, lock_time) VALUES{string.Join(", ", data.Select(x => $"({x.Key}, {x.Value}, {userId}, '{lockTime}')").ToArray())}";
			var insertCommand = new NpgsqlCommand(commandText, connection);
			insertCommand.ExecuteNonQuery();
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
	}

	/// --------------------------------------------------------------------------------------
	public void LockInterim(long interimId, long userId, DateTime lockTime, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		try
		{
			var nextIdCmd = _commands[QueryType.SelectNextInterimLockId];
			var existsRow = _commands[QueryType.SelectExistsInterimLockRow];
			var upsertInterimLockCommand = _commands[QueryType.UpsertInterimLock];
			nextIdCmd.Connection = connection;
			existsRow.Connection = connection;
			upsertInterimLockCommand.Connection = connection;
			var lockId = 0L; 
			var existsLock = true;
			do
			{
				var lockIdObject = nextIdCmd.ExecuteScalar();
				if (lockIdObject.GetType() != typeof(DBNull))
					lockId = (long)lockIdObject;
				existsRow.Parameters["lock_id"].Value = lockId;
				existsLock = (bool)existsRow.ExecuteScalar();
				Debug.WriteLineIf(existsLock, $"lockId({lockId}) is exists: {existsLock}");
			} while (existsLock);
			upsertInterimLockCommand.Parameters["lock_id"].Value = lockId;
			upsertInterimLockCommand.Parameters["interim_id"].Value = interimId;
			upsertInterimLockCommand.Parameters["user_id"].Value = userId;
			upsertInterimLockCommand.Parameters["lock_time"].Value = lockTime;
			upsertInterimLockCommand.ExecuteNonQuery();
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
	}

	/// --------------------------------------------------------------------------------------
	public void ChoiceVariant(long interimId, long userId, int variantIndex, bool removeSelection = false, bool cleanUpdate = true, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		try
		{
			using (var transaction = connection.BeginTransaction())
			{
				var choicesCount = this.SelectChoicesCount(interimId, connection);
				for (var index = 0; index < choicesCount; index++)
				{
					var approvals = this.SelectChoiceApprovals(interimId, index, connection);
					var containsUser = approvals.Contains(userId);
					var addApproval = !containsUser && !removeSelection && index == variantIndex;
					var removeApproval = containsUser && removeSelection && index == variantIndex;
					// add approval id 
					if (addApproval)
					{
						approvals.Add(userId);
						this.UpdateChoiceApprovals(interimId, index, approvals, connection);
					}
					// remove approval id
					else if (removeApproval || (containsUser && cleanUpdate))
					{
						approvals.Remove(userId);
						this.UpdateChoiceApprovals(interimId, index, approvals, connection);
					}
					// find & remove choices from all variants (cleanUpdate)
					if ((addApproval || removeApproval) && !cleanUpdate)
						break;
				}
				transaction.Commit();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}

	}

	/// --------------------------------------------------------------------------------------
	public List<long> SelectChoiceApprovals(long interimId, int choiceIndex, NpgsqlConnection connection = null)
	{
		var approvals = new List<long>();
		if(connection == null)
			connection = GetConnection();
		var selectChoiceApprovalsCommand = _commands[QueryType.SelectChoiceApprovals];
		selectChoiceApprovalsCommand.Connection = connection;
		selectChoiceApprovalsCommand.Parameters["choice_index"].Value = choiceIndex + 1;
		selectChoiceApprovalsCommand.Parameters["interim_id"].Value = interimId;
		try
		{
			using (var reader = selectChoiceApprovalsCommand.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					var presentApprovals = reader["approvals"];
					if (presentApprovals.GetType() != typeof(DBNull))
						approvals.AddRange((long[])presentApprovals);
				}
				reader.Close();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return approvals;
	}

	/// --------------------------------------------------------------------------------------
	public void UpdateChoiceApprovals(long interimId, int choiceIndex, IEnumerable<long> approvals, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		try
		{
			var updateChoiceApprovalsCommand = _commands[QueryType.UpdateChoiceApprovals];
			updateChoiceApprovalsCommand.Connection = connection;
			updateChoiceApprovalsCommand.Parameters["choice_index"].Value = choiceIndex + 1;
			updateChoiceApprovalsCommand.Parameters["interim_id"].Value = interimId;
			updateChoiceApprovalsCommand.Parameters["approvals"].Value = approvals.ToArray();
			updateChoiceApprovalsCommand.ExecuteNonQuery();
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
	}

	/// --------------------------------------------------------------------------------------
	public int SelectChoicesCount(long interimId, NpgsqlConnection connection = null)
	{
		var count = 0;
		if (connection == null)
			connection = GetConnection();
		try
		{
			var selectChoicesCountCommand = _commands[QueryType.SelectChoicesCount];
			selectChoicesCountCommand.Parameters["interim_id"].Value = interimId;
			selectChoicesCountCommand.Connection = connection;
			count = (int)selectChoicesCountCommand.ExecuteScalar();
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return count;
	}

	/// --------------------------------------------------------------------------------------
	public void InsertInterimLock(long interimId, long userId, DateTime lockTime, NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		try
		{
			var upsertInterimLockCommand = _commands[QueryType.InsertInterimLock];
			upsertInterimLockCommand.Connection = connection;
			upsertInterimLockCommand.Parameters["interim_id"].Value = interimId;
			upsertInterimLockCommand.Parameters["user_id"].Value = userId;
			upsertInterimLockCommand.Parameters["lock_time"].Value = lockTime;
			upsertInterimLockCommand.ExecuteNonQuery();
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
	}

	/// --------------------------------------------------------------------------------------
	public long InsertSourceIfNotExist(Source source, NpgsqlConnection connection = null)
	{
		long sourceId = 0;
		if (connection == null)
			connection = GetConnection();
		try
		{
			var selectSourceIdCommand = _commands[QueryType.SelectSourceId];
			selectSourceIdCommand.Connection = connection;
			selectSourceIdCommand.Parameters["original_name"].Value = source.OriginalName;
			selectSourceIdCommand.Parameters["normalized_name"].Value = NpgsqlTsVector.Parse(source.NormalizedName);
			selectSourceIdCommand.Parameters["origin"].Value = source.Origin;
			selectSourceIdCommand.Parameters["audio_format"].Value = source.AudioFormat;
			using (var reader = selectSourceIdCommand.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					sourceId = (long) reader["source_id"];
				}
				reader.Close();
			}
			if (sourceId == 0)
				sourceId = this.InsertSource(source: source, connection: connection);
		}
		catch (Exception  e)
		{
			Debug.Assert(false, e.Message);
		}
		return sourceId;
	}

	/// --------------------------------------------------------------------------------------
	public List<Aggregators> SelectAggregators(NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		var aggregators = new List<Aggregators>();
		try
		{
			var selectCommand = new NpgsqlCommand("SELECT aggregator_id, source_id FROM aggregators", connection);

			using (var reader = selectCommand.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					var aggregatorId = (long)reader["aggregator_id"];
					var sourceId = (long)reader["source_id"];
					aggregators.Add(new Aggregators(aggregatorId: aggregatorId, sourceId: sourceId));
				}
				reader.Close();
			}

		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return aggregators;
	}

	/// --------------------------------------------------------------------------------------
	public List<Utterance> SelectUtterancesData(NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		var utterances = new List<Utterance>();
		try
		{
			var selectCommand = new NpgsqlCommand("SELECT utterance_id, aggregator_id, audio_format, time_start, time_duration, language, transcribes FROM utterances", connection);
			selectCommand.CommandTimeout = 20000;
			using (var reader = selectCommand.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					var utteranceId = (long)reader["utterance_id"];
					var aggregatorId = (long)reader["aggregator_id"];
					var audioFormat = (AudioFormat) reader["audio_format"];
					var timeStart = (int) reader["time_start"];
					var timeDuration = (int) reader["time_duration"];
					var language = (Language)reader["language"];
					var transcribes = reader["transcribes"];
					var transcribesArray = transcribes.GetType() != typeof(DBNull)? (string[])transcribes: new string[] {};
					utterances.Add(new Utterance(utteranceId: utteranceId, aggregatorId: aggregatorId, audioFormat: audioFormat, timeStart: timeStart, timeDuration: timeDuration, language: language, transcribes: transcribesArray));
				}
				reader.Close();
			}

		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return utterances;
	}

	/// --------------------------------------------------------------------------------------
	public Dictionary<long, byte[]> SelectUtterancesContent(List<long> utterancesIdList, NpgsqlConnection connection = null)
	{
		var contentStore = new Dictionary<long, byte[]>();
		if (connection == null)
			connection = GetConnection();
		var utterancesIdsEntry = new StringBuilder();
		var idCounter = 0;
		for (; idCounter < utterancesIdList.Count - 1; idCounter++)
			utterancesIdsEntry.AppendFormat("{0}, ", utterancesIdList[idCounter]);
		utterancesIdsEntry.AppendFormat("{0}", utterancesIdList[idCounter]);
		try
		{
			var selectCommand = new NpgsqlCommand($"SELECT utterance_id, content FROM utterances WHERE utterance_id IN ({utterancesIdsEntry.ToString()})", connection);
			selectCommand.CommandTimeout = 20000;
			using (var reader = selectCommand.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					var utteranceId = (long)reader["utterance_id"];
					var content = (byte[])reader["content"];
					contentStore.Add(utteranceId, content);
				}
				reader.Close();
			}

		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return contentStore;
	}

	/// --------------------------------------------------------------------------------------
	public List<InterimsLocks> SelectInterimsLocks(NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		var locks = new List<InterimsLocks>();
		try
		{
			var selectCommand = new NpgsqlCommand("SELECT lock_id, interim_id, user_id, lock_time FROM interims_locks", connection);

			using (var reader = selectCommand.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					var lockId = (long) reader["lock_id"];
					var interimId = (long) reader["interim_id"];
					var userId = (long) reader["user_id"];
					var lockTime = (DateTime) reader["lock_time"];
					locks.Add(new InterimsLocks(lockId: lockId, interimId: interimId, userId: userId, lockTime: lockTime));
				}
				reader.Close();
			}

		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return locks;
	}

	/// --------------------------------------------------------------------------------------
	public List<Interim> SelectInterims(NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		var interims = new List<Interim>();
		try
		{
			var selectCommand = new NpgsqlCommand("SELECT interim_id, utterance_id, unnest(choices) as choice FROM interims", connection);
			selectCommand.CommandTimeout = 20000;
			selectCommand.UnknownResultTypeList = new[] { false, false, true };
			using (var reader = selectCommand.ExecuteReader())
			{
				long oldInterimId = 0;
				long oldUtteranceId = 0;
				var choicesList = new List<UtteranceChoice>();
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					var interimId = (long)reader["interim_id"];
					var utteranceId = (long)reader["utterance_id"];
					var choiceText = (string)reader["choice"];
					var choice = UtteranceChoice.Parse(choiceText);
					if ((oldInterimId != 0 && oldUtteranceId != 0) && (oldInterimId != interimId && oldUtteranceId != utteranceId))
					{
						interims.Add(new Interim(interimId: oldInterimId, utteranceId: oldUtteranceId, choices: choicesList.ToArray()));
						choicesList.Clear();
					}
					choicesList.Add(choice);
					oldInterimId = interimId;
					oldUtteranceId = utteranceId;
				}
				reader.Close();
				interims.Add(new Interim(interimId: oldInterimId, utteranceId: oldUtteranceId, choices: choicesList.ToArray()));
				choicesList.Clear();
			}
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return interims;
	}

	/// --------------------------------------------------------------------------------------
	public List<Source> SelectSources(NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		var sources = new List<Source>();
		try
		{
			var selectCommand = new NpgsqlCommand("SELECT source_id, original_name, origin, audio_format FROM sources", connection);

			using (var reader = selectCommand.ExecuteReader())
			{
				while (reader.Read())
				{
					if (!reader.IsOnRow) continue;
					var sourceId = (long)reader["source_id"];
					var name = (string)reader["original_name"];
					var origin = (Origin)reader["origin"];
					var audioFormat = (AudioFormat)reader["audio_format"];
					sources.Add(new Source(name: name, origin: origin, audioFormat: audioFormat, sourceId: sourceId));
				}
				reader.Close();
			}

		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return sources;
	}

	/// --------------------------------------------------------------------------------------
	public List<Aggregators> SelectAggregators2(NpgsqlConnection connection = null)
	{
		if (connection == null)
			connection = GetConnection();
		var aggregators = new List<Aggregators>();
		try
		{
		}
		catch (Exception e)
		{
			Debug.Assert(false, e.Message);
		}
		return aggregators;

	}

	/// --------------------------------------------------------------------------------------
	/// Damerau-Levenshtein algorithm in C#. 
	/// https://gist.github.com/449595/cb33c2d0369551d1aa5b6ff5e6a802e21ba4ad5c
	private int CalcDistance(string original, string modified)
	{
		var lenOrig = original.Length;
		var lenDiff = modified.Length;

		var matrix = new int[lenOrig + 1, lenDiff + 1];
		for (var i = 0; i <= lenOrig; i++)
			matrix[i, 0] = i;
		for (var j = 0; j <= lenDiff; j++)
			matrix[0, j] = j;

		for (var i = 1; i <= lenOrig; i++)
		{
			for (var j = 1; j <= lenDiff; j++)
			{
				var cost = modified[j - 1] == original[i - 1] ? 0 : 1;
				var vals = new[] {
						matrix[i - 1, j] + 1,
						matrix[i, j - 1] + 1,
						matrix[i - 1, j - 1] + cost
					};
				matrix[i, j] = vals.Min();
				if (i > 1 && j > 1 && original[i - 1] == modified[j - 2] && original[i - 2] == modified[j - 1])
					matrix[i, j] = Math.Min(matrix[i, j], matrix[i - 2, j - 2] + cost);
			}
		}
		return matrix[lenOrig, lenDiff];
	}

	/// --------------------------------------------------------------------------------------
	public class Statistics
	{
		public string Language { set; get; }
		public long Count { set; get; }
		public long Time { set; get; }
	}
}
