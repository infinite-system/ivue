export function SingleBookResultStub(dynamicBookName) {
  return {
    success: true,
    result: [
      {
        bookId: 1,
        name: dynamicBookName !== undefined ? dynamicBookName : 'I, Robot',
        emailOwnerId: 'g@b.com',
        devOwnerId: 'pete+dnd@logicroom.co'
      }
    ]
  }
}
