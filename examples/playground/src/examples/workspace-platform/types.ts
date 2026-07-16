export type WorkspaceView = 'list' | 'board';
export type TaskStatus = 'backlog' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface MemberSeed {
  id: string;
  name: string;
  initials: string;
  role: string;
  color: string;
  capacity: number;
  online: boolean;
}

export interface ProjectSeed {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface TaskComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface TaskSeed {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  dueOffset: number;
  estimateHours: number;
  tags: string[];
  checklist?: ChecklistItem[];
  comments?: TaskComment[];
}

export interface ActivityEntry {
  id: number;
  actorId: string;
  icon: string;
  text: string;
  createdAt: string;
}

export const STATUS_ORDER: TaskStatus[] = [
  'backlog',
  'in-progress',
  'review',
  'done',
];

export const STATUS_META: Record<
  TaskStatus,
  { label: string; color: string; short: string }
> = {
  backlog: { label: 'Backlog', color: '#94a3b8', short: '○' },
  'in-progress': { label: 'In progress', color: '#6366f1', short: '◐' },
  review: { label: 'Review', color: '#f59e0b', short: '◒' },
  done: { label: 'Complete', color: '#10b981', short: '●' },
};

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; color: string }
> = {
  urgent: { label: 'Urgent', color: '#ef4444' },
  high: { label: 'High', color: '#f97316' },
  normal: { label: 'Normal', color: '#6366f1' },
  low: { label: 'Low', color: '#94a3b8' },
};
