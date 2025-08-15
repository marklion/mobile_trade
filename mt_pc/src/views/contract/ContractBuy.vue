<template>
<div>
    <contract-show-table req_path="/customer/contract_get" enable_charge></contract-show-table>
</div>
</template>

<script>
import ContractShowTable from '../../components/ContractShowTable.vue'
export default {
    name: 'ContractBuy',
    components: {
        'contract-show-table': ContractShowTable,
    },
}
</script>

<style>

</style>
