<script setup lang="ts">
import { useIVueTests } from '../tests/useIVueTests';
import { pre } from '@/utils';
let vm = useIVueTests()
const hugeId = 200

</script>
<template>
  <div style="width:900px; margin:0 auto;">

    <h1>Composable test</h1>
    <!--  <vue-dd v-model="vm" get-all-properties/>-->
{{ vm.msToTime(vm.timeTaken.value) }}
<br />
{{ vm.app.router }}
{{ pre(vm.transientFields.value[0].app.router) }}
<br />
{{ vm.transientFields.value[10].x }}
<input type="text" v-model="vm.app.user.email" />
    <br />
  </div>
</template>
<style>
.rendererParent {
  width: 100%;
  height: 580px;
  border: 1px solid black;
}

h1,
h2,
h3,
h4 {
  font-family: Arial;
  margin: 10px 0;
  padding: 0;
}

h1 {
  font-size: 24px;
}

h2 {
  font-size: 18px;
}

h3 {
  font-size: 16px;
}

h4 {
  font-size: 14px;
  margin: 0 5px;
}

body {
  font-family: Arial;
  font-size: 14px;
  line-height: 200%;
}

.body {
  max-width: 1000px;
  margin: 0 auto;
}

.section {
  padding: 5px 0;
}

.section-alt {
  padding: 15px;
  background: #edf1f6;
  border-radius: 10px;
}

button {
  color: #eee;
  border-radius: 5px;
  border: 0;
  font-size: 16px;
  background: #0075d3;
  margin: 1px 3px;
  padding: 4px 7px;
  display: inline-block;
  cursor: pointer;
}

button:hover {
  background: #08277a;
}

button.pass:hover {
  background: green;
}

button.fail:hover {
  background: red;
}

button:active {
  background: #294dab;
}

input {
  color: #333;
  border-radius: 5px;
  border: 0;
  width: 250px;
  font-size: 16px;
  background: #eee;
  border: 1px solid #0075d3;
  margin: 1px 3px;
  padding: 4px 7px;
  display: inline-block;
}

.mr-10 {
  margin-right: 10px;
}

.pass {
  background: #00c200;
}

.fail {
  background: #c00606
}

td.label {
  text-align: right;
}

td.value {
  padding-left: 20px;
}</style>