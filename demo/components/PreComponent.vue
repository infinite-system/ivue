<script setup lang="ts">
import { TUser } from '../tests/TUser';
import { iobj, use, pre } from '@/index';

const ctx = iobj({
  test: 1,
  get user () { return use(TUser) },
})

</script>
<template>
  <pre style="font-size:10px;line-height:12px;">{{ pre(ctx) }}</pre>
</template>