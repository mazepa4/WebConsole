using System;
using System.Collections.Generic;

namespace Semantic
{
	//---------------------------------------------------------------------
	public enum ETerminator
	{
		TERMINATOR_NONE = 0x00,
		TERMINATOR_DOT = 0x01,
		TERMINATOR_NEWLINE = 0x02,
		TERMINATOR_ENDOFTEXT = 0x04,
	}
	//---------------------------------------------------------------------
	public enum EPunctuation
	{
		PUNCTUATION_NONE = 0x00,
		PUNCTUATION_BREAKING = 0x01,	// breaking punctuation
	}
	//---------------------------------------------------------------------
	public enum EPartOfSpeech
	{
		POS_COORDINATING_CONJUNCTION,						// CC
		POS_CARDINAL_NUMBER,								// CD
		POS_DETERMINER,										// DT
		POS_EXISTENTIAL_THERE,								// EX
		POS_FOREIGN_WORD,									// FW
		POS_PREPOSITION_OR_SUBORDINATING_CONJUNCTION,		// IN
		POS_ADJECTIVE,										// JJ
		POS_ADJECTIVE_COMPARATIVE,							// JJR
		POS_ADJECTIVE_SUPERLATIVE,							// JJS
		POS_LEFT_BRACKETS,									// -LRB-
		POS_LIST_ITEM_MARKER,								// LS
		POS_MODAL,											// MD
		POS_NOUN_SINGULAR_OR_MASS,							// NN
		POS_NOUN_PROPER_SINGULAR,							// NNP
		POS_NOUN_PROPER_PLURAL,								// NNPS
		POS_NOUN_PLURAL,									// NNS
		POS_PREDETERMINER,									// PDT
		POS_POSSESSIVE_ENDING,								// POS
		POS_PUNCTUATION,									// .
		POS_PUNCTUATION_COMMA,								// ,
		POS_PUNCTUATION_COLON,								// :
		POS_PUNCTUATION_DOLLAR,								// $
		POS_PUNCTUATION_ACCENT,								// ``
		POS_PUNCTUATION_APOSTROPHE,							// ''
		POS_PUNCTUATION_HYPHEN,								// HYPH
		POS_PUNCTUATION_AT,									// NFP
		POS_PRONOUN_PERSONAL,								// PRP
		POS_PRONOUN_POSSESSIVE,								// PRP$
		POS_ADVERB,											// RB
		POS_ADVERB_COMPARATIVE,								// RBR
		POS_ADVERB_SUPERLATIVE,								// RBS
		POS_PARTICLE,										// RP
		POS_RIGHT_BRACKETS,									// -RRB-
		POS_SYMBOL,											// SYM
		POS_TO,												// TO
		POS_INTERJECTION,									// UH
		POS_VERB_BASE_FORM,									// VB
		POS_VERB_PAST_TENSE,								// VBD
		POS_VERB_GERUND_OR_PRESENT_PARTICIPLE,				// VBG
		POS_VERB_PAST_PARTICIPLE,							// VBN
		POS_VERB_NON_3RD_PERSON_SINGULAR_PRESENT,			// VBP
		POS_VERB_3RD_PERSON_SINGULAR_PRESENT,				// VBZ
		POS_WH_DETERMINER,									// WDT
		POS_WH_PRONOUN,										// WP
		POS_WH_PRONOUN_POSSESSIVE,							// WP$
		POS_WH_ADVERB,										// WRB
		POS_AFFIX,											// AFX
		POS_ENDING,											// XX

		NUM_PARTS_OF_SPEECH,
	}

	//---------------------------------------------------------------------
	public class TaggedWord
	{
		public string			word;				// clean word form
		public int				sourceWordPos;		// position of word in source text
		public int				sourceWordLen;		// length of word in source text
		public ETerminator		terminator;			// terminator after this word
		public EPunctuation		punctuation;		// punctuation after this word
	};

	[Serializable]
	public class WordAndAffinity
	{
		public string					word { get; set; }
		public float					affinity { get; set; }
		public float					closestNeighbor { get; set; }
	};

	[Serializable]
	public class RelatedWords
	{
		public string					sourceWord { get; set; }
		public float					closestNeighbor { get; set; }
		public WordAndAffinity[]		closestByCos { get; set; }
		public WordAndAffinity[]		closestByCluster { get; set; }
	};

	public interface IClassify
	{
		string DetectLanguage(string text);
		RelatedWords GetRelatedWords(string word, int maxResults);
		double GetTextsAffinity(string text1, string text2);
	}
}
