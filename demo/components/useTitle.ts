import { watchEffect, onUnmounted } from 'vue'

/**
 * A composable function to set the document title.
 * It's reactive and cleans up after itself.
 * * @param title A function that returns the new title string.
 * Passing a function allows it to be reactive.
 * Example: useTitle(() => `My Page - ${pageName.value}`)
 */
export function useTitle(title: () => string) {
  // Store the original title to reset it later
  const originalTitle = document.title

  // watchEffect runs immediately and whenever any reactive
  // dependencies inside the function change.
  watchEffect(() => {
    document.title = title()
  })

  // Reset the title to the original when the component is unmounted
  onUnmounted(() => {
    document.title = originalTitle
  })
}
