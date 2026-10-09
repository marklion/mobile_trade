<template>
  <div>
    <order-show-table is_buy req_url="/buy_management/order_search_brief" />
  </div>
</template>

<script>
import OrderShowTable from '../../components/OrderShowTable.vue'
export default {
    name: 'OrderBought',
    components: {
        'order-show-table': OrderShowTable,
    },
}
</script>

<style>

</style>
