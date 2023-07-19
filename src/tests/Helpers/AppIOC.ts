import { RouterGateway } from './Routing/RouterGateway'
import { HttpGateway } from './Core/HttpGateway'
import { Types } from './Core/Types'
import getDecorators from 'inversify-inject-decorators';
import { BaseIOC } from './BaseIOC'
import { AppPresenter } from "@/tests/Helpers/AppPresenter.js";
import { xVue } from "@/xVue";
export const container = new BaseIOC().buildBaseTemplate()


container.bind(Types.IDataGateway).to(HttpGateway).inSingletonScope().onActivation(xVue);
container.bind(Types.IRouterGateway).to(RouterGateway).inSingletonScope().onActivation(xVue);
container.bind(Types.IAppPresenter).to(AppPresenter).inSingletonScope().onActivation(xVue);

