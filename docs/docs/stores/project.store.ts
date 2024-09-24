import { defineStore } from 'pinia';
import { Ref, computed, ref } from 'vue';

import BlacklineApi from '@/services/blackline_api.service';
import { IKeyValue } from '@/types/core';
import { parseErrorMessage } from '@/utils/error';


/**
 * Project store to cache project and provide easy access to the loaded project resources
 */
export const useProjectStore = defineStore('project', () => {

  // Store project
  type Status = 'fetching' | 'fetched' | 'fetchFailed';

  const project = ref<IKeyValue>();
  const status: Ref<Status> = ref('fetching');
  const errorMessage: Ref<string> = ref('');

  const projectRoute = computed(() =>
    project.value?.id ? `project/${project.value?.id}` : ''
  );

  const projectId = computed(() => project.value?.id);

  const setProject = async (code: string) => {
    try {
      status.value = 'fetching';

      project.value = await BlacklineApi.getCustom(code);

      if (!project.value) throw new Error('Project data invalid.');
      errorMessage.value = '';
      status.value = 'fetched';
    } catch (err: any) {
      status.value = 'fetchFailed';
      errorMessage.value = parseErrorMessage(err, 'Unable to get project');
    }
  };


  return {
    project,
    projectId,
    status,
    errorMessage,
    projectRoute,
    setProject,
  };
});
