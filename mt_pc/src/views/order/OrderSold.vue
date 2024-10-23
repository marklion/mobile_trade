<template>
<div>
    <order-show-table req_url="/sale_management/order_search" ></order-show-table>
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
