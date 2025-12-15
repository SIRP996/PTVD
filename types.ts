export interface Scene {
  id: string;
  startTime: string; // e.g., "00:00"
  endTime: string;   // e.g., "00:05"
  type: string;      // e.g., "Mở đầu thu hút", "Điểm bán hàng"
  visualDescription: string;
  audioScript: string;
}

export interface ScriptAnalysis {
  id: string;
  userId: string; // ID của người dùng sở hữu kịch bản
  title: string;
  videoName: string;
  createdAt: number;
  tags: string[];
  scenes: Scene[];
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  OPTIMIZING = 'OPTIMIZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface VideoInputState {
  file: File | null;
  url: string;
}