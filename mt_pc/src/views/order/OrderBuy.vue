<template>
<div>
    <order-show-table req_url="/customer/order_buy_search" motived></order-show-table>
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
