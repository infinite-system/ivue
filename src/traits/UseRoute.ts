import { toValue } from 'vue';
import { config } from '../config';

export class UseRoute {
   get route () { return toValue(config.router?.currentRoute) }
}
