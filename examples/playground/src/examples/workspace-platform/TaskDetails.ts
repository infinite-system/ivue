import { ref } from 'vue';
import { Reactive } from '../../ivue';
import type { Task } from './Task';
import type { TaskPriority, TaskStatus } from './types';
import { Workspace } from './Workspace';

class $TaskDetails {
  constructor(readonly props: Readonly<TaskDetails.Props>) {}

  get comment() {
    return ref('');
  }

  protected get $workspace() {
    return Workspace.use();
  }

  get task() {
    return this.props.task;
  }

  get members() {
    return this.$workspace.members.value;
  }

  get isCommentSubmitDisabled() {
    return !this.comment.value.trim();
  }

  memberById(memberId: string) {
    return this.$workspace.memberById(memberId);
  }

  close() {
    this.$workspace.closeTask();
  }

  updateTitle(event: Event) {
    this.task.title.value = (event.target as HTMLInputElement).value;
  }

  updateDescription(event: Event) {
    this.task.description.value = (event.target as HTMLTextAreaElement).value;
  }

  updateStatus(event: Event) {
    this.task.setStatus(
      (event.target as HTMLSelectElement).value as TaskStatus,
    );
  }

  updatePriority(event: Event) {
    this.task.setPriority(
      (event.target as HTMLSelectElement).value as TaskPriority,
    );
  }

  updateAssignee(event: Event) {
    this.task.setAssignee((event.target as HTMLSelectElement).value);
  }

  submitComment() {
    this.task.addComment(this.comment.value);
    this.comment.value = '';
  }
}

export namespace TaskDetails {
  export const $Class = $TaskDetails;
  export let Class = Reactive($Class);
  export type Model = InstanceType<typeof Class>;
  export type Instance = typeof Class.Instance;

  /* Types */

  export interface Props {
    task: Task.Model;
  }
}
