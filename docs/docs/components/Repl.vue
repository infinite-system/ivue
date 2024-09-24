
<script setup lang="ts">
  import { onBeforeMount, ref } from 'vue'
import { Repl, useStore, useVueImportMap } from '@vue/repl'
import Monaco from '@vue/repl/monaco-editor'
// import '@vue/repl/style.css'
// ^ no longer needed after 3.0


const { vueVersion, defaultVersion, importMap } = useVueImportMap({

})
const imports = ref({ ...importMap.value });
console.log('importMap', importMap.value)
const store = useStore({
  vueVersion,
  builtinImportMap: imports
});
onBeforeMount(() => {
  store.setFiles({ 'App.vue':`<script setup>
import { ref } from 'vue';
<\/script><template>Hello<\/template>`
}, 'App.vue');
})
  
</script>
<template>
  <Repl :store="store"
        :showCompileOutput="false"
        :clearConsole="false" :editor="Monaco" />
</template>