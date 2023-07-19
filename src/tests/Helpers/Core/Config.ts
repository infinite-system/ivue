import { injectable } from 'inversify'

@injectable()
export class Config {
  private apiUrl: string
  constructor() {
    this.apiUrl = 'https://api.logicroom.co/secure-api/ekalashnikov@gmail.com'
  }
}
