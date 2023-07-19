export class Helpers {
  static asyncForEach = async (array, callback) => {
    if (array) {
      for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
      }
    }
  }
}
