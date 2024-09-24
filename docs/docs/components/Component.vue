<script setup lang="ts">
import { ivue } from "../../../lib/ivue";
import { VueDd } from "vue-dd";
import { ref } from 'vue';

class Test2 {
  prop = ref(1);
  prop2 = ref(2);
}
const test = ivue(Test2);
const a = "Coming soon";
</script>
<template>
  

  
  <ClientOnly>
    <vue-dd get-all-properties :save-focus="false" :open-level="1" :inline="false" v-model="test" name="class Test" />
  </ClientOnly>
</template>
