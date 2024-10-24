<template>
<div>
    <order-show-table req_url="/supplier/order_sale_search" is_buy motived></order-show-table>
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
