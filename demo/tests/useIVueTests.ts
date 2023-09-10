
import { TAuth } from './TAuth'
import { TApp } from "./TApp";
import { TMessage } from './TMessage'
import { TRouter } from './TRouter'
import { ParentIVueTests } from "./ParentIVueTests";
import { onUnmounted, toRaw, watch, onBeforeUnmount, computed, ref } from "vue";
import { generateHugeArray } from "@/App/Generators/generators";
import { TField } from "./TField";
import { use, init, IVUE, unraw, before } from "@/index";
import { useField } from './useField'
import { App } from '@/App/App';


export function useIVueTests () {

  const app = use(TApp)
  const transientFields = ref([])

  const timeTaken = ref(0)

  timeTaken.value = 0

  const start = Date.now();
  
  // setTimeout(() => {

    for (let i = 0; i < 50_000; i++) {
      transientFields.value.push(useField())
    }

    timeTaken.value = Date.now() - start;

    setInterval(() => {
      transientFields.value[10].x++
    }, 1000)
  // })

  function msToTime (ms: number) {
    const seconds = (ms / 1000)
    const minutes = (ms / (1000 * 60));
    const hours = (ms / (1000 * 60 * 60));
    const days = (ms / (1000 * 60 * 60 * 24));

    if (seconds < 60) return seconds.toFixed(3) + " Seconds";
    else if (minutes < 60) return minutes.toFixed(1) + " Minutes";
    else if (hours < 24) return hours.toFixed(1) + " Hrs";
    else return days.toFixed(1) + " Days"
  }

  return {
    app,
    transientFields,
    timeTaken,
    msToTime
  }
}
