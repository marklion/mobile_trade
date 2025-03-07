<template>
<div>
    <contract-show-table req_path="/buy_management/contract_get" is_buy is_motive></contract-show-table>
</div>
</template>

<script>
import ContractShowTable from '../../components/ContractShowTable.vue'
export default {
    name: 'ContractBought',
    components: {
        'contract-show-table': ContractShowTable,
    },
}
</script>

<style>

</style>
