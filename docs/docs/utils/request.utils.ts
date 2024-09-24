import { AxiosRequestConfig } from 'axios';
import { Notify } from 'quasar';

import { blacklineApi } from '../boot/axios';

export type BlacklineRequestOptions = {
  id?: string;
  successCallback?: (response: any) => Promise<void>;
  notifySuccessMessage?: string;
  query?: string;
  payload?: any;
  paginated?: boolean;
  axiosConfig?: AxiosRequestConfig;
};

const fakeResponseDelay = 0;

/**
 * Helper function to delay request response
 */
const delayRequest = async (fakeResponseDelay: number) => {
  if (fakeResponseDelay && process.env.NODE_ENV === 'development')
    await new Promise((resolve) => setTimeout(resolve, fakeResponseDelay));
};

const responseData = (response: any) => {
  return response.data?.data ? response.data.data : response.data;
};

const responseDataPaginated = (response: any) => {
  return {
    data: response.data?.data,
    pagination: response.data?.pagination,
  };
};

type RequestType = 'get' | 'post' | 'put' | 'delete';

const request = async (
  method: RequestType,
  path: string,
  options?: BlacklineRequestOptions
) => {
  try {
    await delayRequest(fakeResponseDelay);
    const response = await blacklineApi[method](
      path +
        // Append id as parameter if specified
        (options?.id ? '/' + options.id : '') +
        // Append query if specified
        (options?.query ? (('?' + options?.query) as string) : ''),
      // Delete body is part of the configuration object in axios
      method === 'delete' && options?.payload
        ? { data: options?.payload }
        : options?.payload,
      options?.axiosConfig
    );
    if (options?.successCallback) await options.successCallback(response);
    if (options?.notifySuccessMessage)
      Notify.create({
        message: options.notifySuccessMessage,
        color: 'positive',
      });
    return options?.paginated ? responseDataPaginated(response) : responseData(response);
  } catch (err: any) {
    throw err;
  }
};

const RequestUtils = {
  request,
  requestWithPayload: async (
    method: RequestType,
    path: string,
    payload: any,
    options: BlacklineRequestOptions = {}
  ) => await request(method, path, { ...options, payload }),
};

export default RequestUtils;
