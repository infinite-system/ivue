<script setup lang="ts">
import { MessagesPresenter } from './MessagesPresenter'
// { import { withInjection } from '../Providers/Injection' }
// { import { useValidation } from '../Providers/Validation' }
// const [uiMessages] = useValidation()

import { IOC } from '@/tests/Helpers/IOC/IOC'

const vm = IOC.get(MessagesPresenter);
</script>
<template>

    <div v-for="message in vm.messages" :style="{ backgroundColor: 'red'}">
      - {{ message }}
    </div>

    <div v-for="message in vm.clientMessages" :style="{ backgroundColor: 'orange'}">
      - {{ message }}
    </div>

<!--      {props.presenter.messages &&-->
<!--        props.presenter.messages.map((item, i) => {-->
<!--          return (-->
<!--            <div style={{ backgroundColor: 'red' }} key={i}>-->
<!--              {' - '}-->
<!--              {item}-->
<!--            </div>-->
<!--          )-->
<!--        })}-->
<!--      {uiMessages &&-->
<!--        uiMessages.map((item, i) => {-->
<!--          return (-->
<!--            <div style={{ backgroundColor: 'orange' }} key={i}>-->
<!--              {' - '}-->
<!--              {item}-->
<!--            </div>-->
<!--          )-->
<!--        })}-->
</template>
