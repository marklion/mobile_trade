<template>
<div>
    <contract-show-table req_path="/sale_management/contract_get" is_motive></contract-show-table>
</div>
</template>

<script>
import ContractShowTable from '../../components/ContractShowTable.vue'
export default {
    name: 'ContractSold',
    components: {
        'contract-show-table': ContractShowTable,
    },
}
</script>

<style>

</style>
