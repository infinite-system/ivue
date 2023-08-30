import { watch, onMounted, onUnmounted, ref, computed } from "vue";
import { App } from "@/App/App";
import { TRouter } from "./TRouter";

import { use, init } from "@/index";
import { TApp } from "./TApp";

export const useField = ()  => {

  const app = computed(() => {
    return use(TApp)
  })

  const router = computed(() => {
    return use(TRouter)
  })

  const _prop = ref(0)

  const x = ref(0)
  const y = ref(1)

  const interceptableValue = ref('testing')
  const runWithInterceptResult = ref('')

  function runWithIntercept (variable = '') {
    return interceptableValue.value
  }

  function interceptable () {
    console.log('interceptable')
  }

  function increase () {
    _prop.value++
  }

  const email = computed(() => {
    return app.value.user.email
  })

  const prop = computed({
    get () {
      _prop.value
    },
    set (v) {
      _prop.value = v
    }
  })

  const update  = function (event)  {

  }

  function init () {}


  function privateFunc () {
    alert(prop.value)
  }

  watch(() => x.value, n => {
    console.log('n', n)
  })

  return {
    app,
    router,
    _prop,
    prop,
    x,
    y,
    interceptable,
    runWithInterceptResult,
    runWithIntercept,
    increase,
    privateFunc,
    update,
    init,
    email
  }
}