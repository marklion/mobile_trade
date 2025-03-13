<template>
<div class="export_record_show">
    <page-content ref="export_record" body_key="records" enable req_url="/global/get_export_record">
        <template v-slot:default="slotProps">
            <div style="height: 86vh">
                <el-table ref="record_table" :data="slotProps.content" style="width: 100%" stripe height="100%">
                    <el-table-column prop="name" label="文件名称"></el-table-column>
                    <el-table-column prop="create_time" label="导出时间"></el-table-column>
                    <el-table-column>
                        <template slot="header">
                            <el-button type="success" size="mini" @click="refresh">刷新</el-button>
                        </template>
                        <template slot-scope="scope">
                            <div v-if="scope.row.url == 'no'">
                                下载失败
                            </div>
                            <el-button v-else-if="scope.row.url" size="mini" type="text" @click="$download_file(scope.row.url, scope.row.name + scope.row.create_time)">下载</el-button>
                            <div v-else>
                                正在导出
                            </div>
                        </template>
                    </el-table-column>
                </el-table>
            </div>
        </template>
    </page-content>
</div>
</template>

<script>
import PageContent from '../../components/PageContent.vue';
export default {
    name: 'ExportRecord',
    components: {
        "page-content": PageContent,
    },
    data: function () {
        return {};
    },
    methods: {
        refresh: function () {
            this.$refs.export_record.refresh();
        }
    }
}
</script>

<style>

</style>
