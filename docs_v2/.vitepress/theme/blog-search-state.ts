import { ref } from 'vue';

// ONE search query for the blog: the index page's search box and the
// sidebar's search box are two views of this same ref, so typing in
// either filters the same list and both show the same text.
export const blogSearchQuery = ref('');
