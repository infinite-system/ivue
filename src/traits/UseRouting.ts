import { Traits } from '@/index';
import { UseRouter } from './UseRouter';
import { UseRoute } from './UseRoute';

export class UseRouting {}
Traits(UseRouting, [UseRouter, UseRoute])
export interface UseRouting extends UseRouter, UseRoute {}