<script setup lang="ts">
import { use } from '@/index'
// import { Mouse } from './tests/Mouse';
// import { IVueTests } from "./tests/IVueTests";
import { TApp } from './tests/TApp';
const app = use(TApp)
</script>
<template>
  <vue-dd v-model="app" name="app" open-level="1" />
  <router-view />
</template>
<style>
@import 'https://fonts.googleapis.com/css?family=Montserrat:400,700,400italic,700italic';
@import 'https://www.w3schools.com/w3css/4/w3.css';



body {
  font-family: 'Montserrat';
  margin: 40px;
}

.navigation-container {
  width: 150px;
  float: left;
}

.navigation-item-header {
  color: 'white';
  padding: 10px;
  margin-left: 3px;
  margin-top: 3px;
}

.navigation-item {
  color: 'white';
  padding: 10px;
  margin-left: 3px;
  margin-top: 3px;
  cursor: pointer;
  text-align: left;
}

.validation-message {
  padding: 13;
  color: 'black';
}

.logo {
  padding-bottom: 20px;
}

.container input[type='text'] {
  width: 140px;
}

.container {
  width: 650px;
  margin: auto;
}

.container .lr-submit {
  padding-left: 20px;
  padding-right: 20px;
  padding-top: 7px;
  padding-bottom: 7px;
  border: none;
  background-color: #5bca06;
  color: #ffffff;
  width: 100px;
}
</style>