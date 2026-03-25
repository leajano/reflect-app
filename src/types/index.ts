export interface Cycle {
  id: number;
  name: string;
  status: 'active' | 'closed';
  created_at: string;
}

export interface Participant {
  id: number;
  name: string;
  role: string;
  team: 'Design' | 'Account' | 'Auctions' | 'Dev';
  cycle_id: number;
  created_at: string;
}

export interface Question {
  id: number;
  text: string;
  category: 'self' | 'peer';
  type: 'open' | 'scale';
  order_index: number;
}

export interface Submission {
  id: number;
  participant_id: number;
  cycle_id: number;
  is_self_review: number;
  token: string;
  submitted_at: string | null;
}

export interface Answer {
  id: number;
  submission_id: number;
  question_id: number;
  answer_text: string | null;
  answer_scale: number | null;
}

export interface Report {
  id: number;
  participant_id: number;
  cycle_id: number;
  content_json: string;
  generated_at: string;
}

export interface ReportContent {
  participant_name: string;
  cycle_name: string;
  generated_at: string;
  what_is_working: {
    summary: string;
    themes: string[];
  };
  blind_spots: {
    summary: string;
    themes: string[];
  };
  start_stop_continue: {
    start: string[];
    stop: string[];
    continue: string[];
  };
  growth_path: {
    summary: string;
    suggested_focus: string;
  };
  scale_scores: {
    communication: number;
    reliability: number;
    collaboration: number;
  };
  overall_narrative: string;
}
