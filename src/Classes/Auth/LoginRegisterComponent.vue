<script setup lang="ts">
import { LoginRegisterPresenter } from '@/Classes/Auth/LoginRegisterPresenter.js'
import MessagesComponent from '@/Classes/Core/Messages/MessagesComponent.vue'
import { use } from '@/index'

const v = use(LoginRegisterPresenter);

</script>
<template>

  <div class="container">
    <div class="login-register">
      <div class="w3-row">
        <div class="w3-col s4 w3-center">
          <br />
        </div>
        <div class="w3-col s4 w3-center logo">
          <img alt="logo"
               src="https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/themes/2147767979/settings_images/iE7LayVvSHeoYcZWO4Dq_web-logo-pink-light-bg3x.png"
               style="width: 160px; filter: grayscale(100%);">
        </div>

        <div class="w3-col s4 w3-center">

        </div>
      </div>
    </div>

    <button @click="() => { v.email = 'test' }">Set Presenter email</button>

    <div>
      <div class="w3-row">
        <div class="w3-col s4 w3-center">
          <br />
        </div>
        <div class="w3-col s4 w3-center option">
          <input
            class="lr-submit"
            :style="{ backgroundColor: '#e4257d' }"
            type="submit"
            value="login"
            @click.prevent="() => v.option = 'login'"
          />
          <input
            class="lr-submit"
            :style="{ backgroundColor: '#2E91FC' }"
            type="submit"
            value="register"
            @click.prevent="() => {
              v.option = 'register'
            }"
          />
        </div>
        <div class="w3-col s4 w3-center">
          <br />
        </div>
      </div>
      <div
        class="w3-row"
        :style="{
        backgroundColor: v.option === 'login' ? '#E4257D' : '#2E91FC',
        height: '100px',
        paddingTop: '20px',
      }"
      >
        <form
          class="login"
          @submit.prevent="(event) => {
          // event.preventDefault()
          if (v.formValid()) {
            if (v.option === 'login') v.login()
            if (v.option === 'register') v.register()
          }
        }"
        >
          <div class="w3-col s4 w3-center">
            <input
              type="text"
              v-model="v.email"
              placeholder="Email"
            />
          </div>
          <div class="w3-col s4 w3-center">
            <input
              type="text"
              v-model="v.password"
              placeholder="Password"
            />
          </div>
          <div class="w3-col s4 w3-center">
            <input type="submit" class="lr-submit" :value="v.option" />
          </div>

          <br />
        </form>
      </div>
      <MessagesComponent />
    </div>
  </div>
</template>