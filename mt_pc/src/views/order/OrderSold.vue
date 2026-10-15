<template>
  <div>
    <order-show-table req_url="/sale_management/order_search_brief" />
  </div>
</template>

<script>
import OrderShowTable from '../../components/OrderShowTable.vue'
export default {
    name: 'OrderSold',
    components: {
        'order-show-table': OrderShowTable,
    },
}
</script>

<style>

</style>
