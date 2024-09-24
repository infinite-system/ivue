import axios, { AxiosInstance } from 'axios';

import EnvironmentService from '@/services/environment.service';
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
  }
}

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
const blacklineApi = axios.create({
  baseURL: EnvironmentService.server,
});
blacklineApi.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error.response)
);


const api = blacklineApi;

export { api, blacklineApi };
