import RequestUtils, {
  type BlacklineRequestOptions,
} from '@/utils/request.utils';

const {
  request,
  requestWithPayload,
} = RequestUtils;


const BlacklineApi = {
  getCustom: async (path: string, options?: BlacklineRequestOptions) =>
    await request('get', path, options),
  postCustom: async (
    path: string,
    payload: any,
    options?: BlacklineRequestOptions
  ) => await requestWithPayload('post', path, payload, options),
  putCustom: async (
    path: string,
    payload: any,
    options?: BlacklineRequestOptions
  ) => await requestWithPayload('put', path, payload, options),
  deleteCustom: async (
    path: string,
    payload: any,
    options?: BlacklineRequestOptions
  ) => await requestWithPayload('delete', path, payload, options),
};

export default BlacklineApi;
