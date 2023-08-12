import { injectable } from 'inversify'

@injectable()
export class FakeHttpGateway {
  get = async (path) => {}

  post = async (path, requestDto) => {}

  delete = async (path) => {}
}
