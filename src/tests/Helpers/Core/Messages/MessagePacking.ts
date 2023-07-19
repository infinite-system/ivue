export class MessagePacking {
  static unpackServerDtoToPm = (dto) => {
    return { success: dto.success, serverMessage: dto.result.message }
  }
}
