// shape we get back from /api/citations
export interface MatchedCitation {
  stepId: string;
  code: string;
  title: string;
  quote: string;
  url: string | null;
  explanation?: string;
}

export interface FollowUpSuggestion {
  title: string;
  detail: string;
}

export interface CitationMatchResult {
  citations: MatchedCitation[];
  followUps: FollowUpSuggestion[];
  modelUsed: boolean;
  note: string;
}
