<template>
  <ShareDeckDetail :deck-key="route.params.key" :embedded="false" />
</template>

<script setup>
import { useRoute } from 'vue-router'

definePage({
  name: 'ShareDeckDetail',
  props: true,
  meta: { showCardPrice: true },
})

const route = useRoute()
</script>
