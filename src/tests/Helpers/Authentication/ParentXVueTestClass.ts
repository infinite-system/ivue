
import { inject, injectable } from 'inversify'
import { MessagesRepository } from "@/tests/Helpers/Core/Messages/MessagesRepository";

@injectable()
export abstract class ParentXVueTestClass {

  @inject(MessagesRepository) messagesRepository: MessagesRepository

  private parentPrivate = 111

  prop = 'test'

  nonReactiveProp = {
    test: {
      test: true
    }
  }

  showValidationWarning = null

  messagesObservables = {}

  // constructor() {}

  init() {
    this.showValidationWarning = false
    this.reset()
  }


  parentValue = 'Text from parent class'
  parentValueAlert() {
    alert(this.parentValue)
  }

  abstract reset(): void
}