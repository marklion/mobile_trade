<template>
<div>
    <order-show-table is_buy req_url="/buy_management/order_search"></order-show-table>
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
