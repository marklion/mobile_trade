<template>
<div class="region_capacity_show">
    <page-content enable ref="region_list" body_key="region_capacities" req_url="/scale/get_region_capacity">
        <template v-slot:default="slotProps">
            <div style="height: 80vh">
                <el-table :data="slotProps.content" style="width: 100%" stripe height="100%">
                    <el-table-column prop="name" label="区域名称"></el-table-column>
                    <el-table-column prop="parking_count" label="车位数" width="120"></el-table-column>
                    <el-table-column label="关联物料">
                        <template slot-scope="scope">
                            <el-tag
                                v-for="s in (scope.row.stuff || [])"
                                :key="s.id"
                                closable
                                style="margin-right: 6px; margin-bottom: 4px;"
                                @close="del_region_stuff(s)">
                                {{ s.name }}
                            </el-tag>
                            <el-button size="mini" type="text" icon="el-icon-plus" @click="open_add_stuff(scope.row)">添加物料</el-button>
                        </template>
                    </el-table-column>
                    <el-table-column width="160">
                        <template slot="header">
                            <el-button size="mini" type="success" @click="open_add_region">新增区域</el-button>
                        </template>
                        <template slot-scope="scope">
                            <el-button size="mini" type="danger" @click="del_region(scope.row)">删除</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </div>
        </template>
    </page-content>
    <el-dialog title="新增区域容量" :visible.sync="add_region_diag" width="40%" @close="reset_region_form">
        <el-form :model="new_region" ref="new_region" :rules="region_rules" label-width="100px">
            <el-form-item label="区域名称" prop="name">
                <el-input v-model="new_region.name" placeholder="请输入区域名称"></el-input>
            </el-form-item>
            <el-form-item label="车位数" prop="parking_count">
                <el-input-number v-model="new_region.parking_count" :min="0" :precision="0"></el-input-number>
            </el-form-item>
        </el-form>
        <span slot="footer">
            <el-button @click="add_region_diag = false">取消</el-button>
            <el-button type="primary" @click="add_region">确定</el-button>
        </span>
    </el-dialog>
    <el-dialog title="添加物料" :visible.sync="add_stuff_diag" width="40%" @close="reset_stuff_form">
        <el-form :model="new_stuff" ref="new_stuff" :rules="stuff_rules" label-width="100px">
            <el-form-item label="物料" prop="stuff_id">
                <select-search
                    body_key="stuff"
                    get_url="/stuff/get_all"
                    item_label="name"
                    item_value="id"
                    v-model="new_stuff.stuff_id"
                    :permission_array="['stuff']">
                </select-search>
            </el-form-item>
        </el-form>
        <span slot="footer">
            <el-button @click="add_stuff_diag = false">取消</el-button>
            <el-button type="primary" @click="add_region_stuff">确定</el-button>
        </span>
    </el-dialog>
</div>
</template>

<script>
import PageContent from '../../components/PageContent.vue'
import SelectSearch from '../../components/SelectSearch.vue'
export default {
    name: 'RegionCapacity',
    components: {
        'page-content': PageContent,
        'select-search': SelectSearch
    },
    data() {
        return {
            add_region_diag: false,
            add_stuff_diag: false,
            current_region_id: 0,
            new_region: {
                name: '',
                parking_count: 1
            },
            new_stuff: {
                stuff_id: 0
            },
            region_rules: {
                name: [{ required: true, message: '区域名称不能为空', trigger: 'blur' }],
                parking_count: [{ required: true, message: '车位数不能为空', trigger: 'blur' }]
            },
            stuff_rules: {
                stuff_id: [{ required: true, message: '请选择物料', trigger: 'change' }]
            }
        }
    },
    methods: {
        refresh_list() {
            this.$refs.region_list.refresh();
        },
        open_add_region() {
            this.add_region_diag = true;
        },
        reset_region_form() {
            this.new_region = { name: '', parking_count: 1 };
            if (this.$refs.new_region) {
                this.$refs.new_region.resetFields();
            }
        },
        add_region() {
            this.$refs.new_region.validate(async (valid) => {
                if (!valid) {
                    return;
                }
                await this.$send_req('/scale/add_region_capacity', {
                    name: this.new_region.name,
                    parking_count: this.new_region.parking_count
                });
                this.add_region_diag = false;
                this.refresh_list();
            });
        },
        async del_region(row) {
            try {
                await this.$confirm('确认删除该区域容量？关联物料将一并解除。', '提示', { type: 'warning' });
                await this.$send_req('/scale/del_region_capacity', { id: row.id });
                this.refresh_list();
            } catch (e) {
                // cancelled
            }
        },
        open_add_stuff(row) {
            this.current_region_id = row.id;
            this.add_stuff_diag = true;
        },
        reset_stuff_form() {
            this.new_stuff = { stuff_id: 0 };
            this.current_region_id = 0;
            if (this.$refs.new_stuff) {
                this.$refs.new_stuff.resetFields();
            }
        },
        add_region_stuff() {
            this.$refs.new_stuff.validate(async (valid) => {
                if (!valid) {
                    return;
                }
                await this.$send_req('/scale/add_region_stuff', {
                    id: this.current_region_id,
                    stuff_id: this.new_stuff.stuff_id
                });
                this.add_stuff_diag = false;
                this.refresh_list();
            });
        },
        async del_region_stuff(stuff) {
            try {
                await this.$confirm(`确认解除物料「${stuff.name}」与区域的关联？`, '提示', { type: 'warning' });
                await this.$send_req('/scale/del_region_stuff', { stuff_id: stuff.id });
                this.refresh_list();
            } catch (e) {
                // cancelled
            }
        }
    }
}
</script>
