import { describe, expect, it } from 'vitest';
import { TaskBoard } from '../TaskBoard';
import { TaskDetails } from '../TaskDetails';
import { TaskList } from '../TaskList';
import { Workspace } from '../Workspace';
import { WorkspacePlatformExample } from '../WorkspacePlatformExample';

function changeEvent(value: string) {
  return { target: { value } } as unknown as Event;
}

describe('Workspace platform model', () => {
  it('derives project metrics and filters from task refs', () => {
    const workspace = new Workspace.Class();

    expect(workspace.title).toBe('Product launch');
    expect(workspace.projectTasks).toHaveLength(4);
    expect(workspace.completedCount).toBe(1);
    expect(workspace.completionRate).toBe(25);

    workspace.priorityFilter.value = 'urgent';
    expect(workspace.filteredTasks.map((task) => task.id)).toEqual([
      'OR-241',
      'OR-243',
    ]);

    workspace.search.value = 'readiness';
    expect(workspace.filteredTasks.map((task) => task.id)).toEqual(['OR-243']);
  });

  it('updates every view when a task moves', () => {
    const workspace = new Workspace.Class();
    const task = workspace.tasks.value.find(
      (candidate) => candidate.id === 'OR-241',
    )!;

    expect(workspace.tasksByStatus('in-progress')).toContain(task);
    task.setStatus('done');

    expect(workspace.tasksByStatus('in-progress')).not.toContain(task);
    expect(workspace.tasksByStatus('done')).toContain(task);
    expect(workspace.completionRate).toBe(50);
    expect(workspace.activities.value[0].text).toContain('moved');
  });

  it('creates, selects, and edits a task through the shared graph', () => {
    const workspace = new Workspace.Class();
    workspace.addTask('Prepare launch retrospective');

    const task = workspace.selectedTask!;
    expect(task.title.value).toBe('Prepare launch retrospective');
    expect(task.workspace).toBe(workspace);
    expect(task.assignee?.id).toBe('you');

    task.setAssignee('maya');
    task.addComment('I will bring the design findings.');

    expect(task.assignee?.name).toBe('Maya Chen');
    expect(task.comments.value.at(-1)?.body).toContain('design findings');
  });

  it('computes workload from live task estimates and status', () => {
    const workspace = new Workspace.Class();
    const before = workspace.workloadFor('noah');
    const task = workspace.tasks.value.find(
      (candidate) => candidate.id === 'OR-312',
    )!;

    task.estimateHours.value += 5;
    expect(workspace.workloadFor('noah')).toBe(before + 5);

    task.setStatus('done');
    expect(workspace.workloadFor('noah')).toBe(before - 12);
  });
});

describe('Workspace template models', () => {
  it('owns list actions in TaskList.Class', () => {
    const workspace = Workspace.Class.use();
    workspace.reset();
    const list = new TaskList.Class();
    const task = list.tasksByStatus('backlog')[0];

    list.changeStatus(task, changeEvent('review'));

    expect(list.tasksByStatus('review')).toContain(task);
    expect(list.isComplete('done')).toBe(true);
  });

  it('owns drag state and transitions in TaskBoard.Class', () => {
    const workspace = Workspace.Class.use();
    workspace.reset();
    const board = new TaskBoard.Class();
    const task = board.tasksByStatus('backlog')[0];

    board.startDrag(task);
    board.enterDropTarget('done');
    expect(board.isDragging(task)).toBe(true);
    expect(board.isDropTarget('done')).toBe(true);

    board.drop('done');
    expect(board.tasksByStatus('done')).toContain(task);
    expect(board.isDragging(task)).toBe(false);
    expect(board.isDropTarget('done')).toBe(false);
  });

  it('owns detail form state and event normalization in TaskDetails.Class', () => {
    const workspace = Workspace.Class.use();
    workspace.reset();
    const task = workspace.tasks.value[0];
    const details = new TaskDetails.Class({ task });

    details.updateTitle(changeEvent('Class-owned title'));
    details.comment.value = 'Class-owned comment';
    details.submitComment();

    expect(task.title.value).toBe('Class-owned title');
    expect(task.comments.value.at(-1)?.body).toBe('Class-owned comment');
    expect(details.comment.value).toBe('');
    expect(details.isCommentSubmitDisabled).toBe(true);
  });

  it('owns application-shell task creation in WorkspacePlatformExample.Class', () => {
    const example = new WorkspacePlatformExample.Class();
    example.workspace.reset();

    example.toggleTaskCreation();
    example.newTaskTitle.value = 'Owned by the application class';
    example.submitTask();

    expect(example.workspace.selectedTask?.title.value).toBe(
      'Owned by the application class',
    );
    expect(example.creatingTask.value).toBe(false);
    expect(example.newTaskTitle.value).toBe('');
  });
});
