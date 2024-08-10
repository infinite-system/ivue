<script setup lang="ts">
import { IVueTests } from "../tests/IVueTests";
import { use, pre } from '@/index'

let vm: IVueTests = use(IVueTests)
const hugeId = 3000;
</script>
<template>

    <div
      style="color:green"
      v-if="vm.timeTaken"
    >Loaded in {{ vm.msToTime(vm.timeTaken) }}.</div>

    <div v-if="hugeId in vm.hugeArray">
      <h3>Editing Record #{{ hugeId.toLocaleString("en-US") }}</h3>
      user: <input v-model="vm.hugeArray[hugeId].struct.user" /><br />
      text: <input v-model="vm.hugeArray[hugeId].struct.text" />
      <pre style="font-size:10px; line-height:10px;">{{ vm.hugeArray[hugeId] }}</pre>
    </div>
  
</template>