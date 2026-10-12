<template>
  <div>
    <order-show-table req_url="/customer/order_search_brief" motived />
  </div>
</template>

<script>
import OrderShowTable from '../../components/OrderShowTable.vue'
export default {
    name: 'OrderBuy',
    components: {
        'order-show-table': OrderShowTable,
    },
}
</script>

<style>

</style>
