<template>
<div>
    <contract-show-table req_path="/supplier/contract_get" is_buy></contract-show-table>
</div>
</template>

<script>
import ContractShowTable from '../../components/ContractShowTable.vue'
export default {
    name: 'ContractSale',
    components: {
        'contract-show-table': ContractShowTable,
    },
}
</script>

<style>

</style>
