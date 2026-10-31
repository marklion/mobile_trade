<template>
  <div class="region_capacity_show">
    <page-content ref="region_list" enable body_key="region_capacities" req_url="/scale/get_region_capacity">
      <template v-slot:default="slotProps">
        <div style="height: 80vh">
          <el-table :data="slotProps.content" style="width: 100%" stripe height="100%">
            <el-table-column prop="name" label="区域名称" />
            <el-table-column prop="parking_count" label="车位数" width="120" />
            <el-table-column label="是否开启" width="100">
              <template slot-scope="scope">
                <el-switch
                  :value="scope.row.is_open"
                  active-color="#13ce66"
                  @change="toggle_open(scope.row)"
                />
              </template>
            </el-table-column>
            <el-table-column label="关联物料">
              <template slot-scope="scope">
                <el-tag
                  v-for="s in (scope.row.stuff || [])"
                  :key="s.id"
                  closable
                  style="margin-right: 6px; margin-bottom: 4px;"
                  @close="del_region_stuff(s)"
                >
                  {{ s.name }}
                </el-tag>
                <el-button size="mini" type="text" icon="el-icon-plus" @click="open_add_stuff(scope.row)">添加物料</el-button>
              </template>
            </el-table-column>
            <el-table-column width="200">
              <template slot="header">
                <el-button size="mini" type="success" @click="open_add_region">新增区域</el-button>
              </template>
              <template slot-scope="scope">
                <el-button size="mini" type="primary" @click="open_edit_region(scope.row)">编辑</el-button>
                <el-button size="mini" type="danger" @click="del_region(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </page-content>
    <el-dialog :title="editing_id ? '编辑区域容量' : '新增区域容量'" :visible.sync="region_diag" width="40%" @close="reset_region_form">
      <el-form ref="region_form" :model="region_form" :rules="region_rules" label-width="100px">
        <el-form-item label="区域名称" prop="name">
          <el-input v-model="region_form.name" placeholder="请输入区域名称" />
        </el-form-item>
        <el-form-item label="车位数" prop="parking_count">
          <el-input-number v-model="region_form.parking_count" :min="0" :precision="0" />
        </el-form-item>
        <el-form-item v-if="editing_id" label="是否开启">
          <el-switch v-model="region_form.is_open" active-color="#13ce66" />
          <span style="margin-left: 8px; color: #909399; font-size: 12px;">关闭后该区域不参与自动叫号</span>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="region_diag = false">取消</el-button>
        <el-button type="primary" @click="save_region">确定</el-button>
      </span>
    </el-dialog>
    <el-dialog title="添加物料" :visible.sync="add_stuff_diag" width="40%" @close="reset_stuff_form">
      <el-form ref="new_stuff" :model="new_stuff" :rules="stuff_rules" label-width="100px">
        <el-form-item label="物料" prop="stuff_id">
          <select-search
            v-model="new_stuff.stuff_id"
            body_key="stuff"
            get_url="/stuff/get_all"
            item_label="name"
            item_value="id"
            :permission_array="['stuff']"
          />
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
            region_diag: false,
            editing_id: 0,
            add_stuff_diag: false,
            current_region_id: 0,
            region_form: {
                name: '',
                parking_count: 1,
                is_open: false
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
            this.$refs.region_list.refresh()
        },
        open_add_region() {
            this.editing_id = 0
            this.region_diag = true
        },
        open_edit_region(row) {
            this.editing_id = row.id
            this.region_form = {
                name: row.name,
                parking_count: row.parking_count,
                is_open: !!row.is_open
            }
            this.region_diag = true
        },
        reset_region_form() {
            this.editing_id = 0
            this.region_form = { name: '', parking_count: 1, is_open: false }
            if (this.$refs.region_form) {
                this.$refs.region_form.resetFields()
            }
        },
        save_region() {
            this.$refs.region_form.validate(async(valid) => {
                if (!valid) {
                    return
                }
                if (this.editing_id) {
                    await this.$send_req('/scale/update_region_capacity', {
                        id: this.editing_id,
                        name: this.region_form.name,
                        parking_count: this.region_form.parking_count,
                        is_open: this.region_form.is_open
                    })
                } else {
                    await this.$send_req('/scale/add_region_capacity', {
                        name: this.region_form.name,
                        parking_count: this.region_form.parking_count
                    })
                }
                this.region_diag = false
                this.refresh_list()
            })
        },
        async toggle_open(row) {
            try {
                await this.$send_req('/scale/update_region_capacity', {
                    id: row.id,
                    name: row.name,
                    parking_count: row.parking_count,
                    is_open: !row.is_open
                })
                this.refresh_list()
            } catch (e) {
                this.refresh_list()
            }
        },
        async del_region(row) {
            try {
                await this.$confirm('确认删除该区域容量？关联物料将一并解除。', '提示', { type: 'warning' })
                await this.$send_req('/scale/del_region_capacity', { id: row.id })
                this.refresh_list()
            } catch (e) {
                // cancelled
            }
        },
        open_add_stuff(row) {
            this.current_region_id = row.id
            this.add_stuff_diag = true
        },
        reset_stuff_form() {
            this.new_stuff = { stuff_id: 0 }
            this.current_region_id = 0
            if (this.$refs.new_stuff) {
                this.$refs.new_stuff.resetFields()
            }
        },
        add_region_stuff() {
            this.$refs.new_stuff.validate(async(valid) => {
                if (!valid) {
                    return
                }
                await this.$send_req('/scale/add_region_stuff', {
                    id: this.current_region_id,
                    stuff_id: this.new_stuff.stuff_id
                })
                this.add_stuff_diag = false
                this.refresh_list()
            })
        },
        async del_region_stuff(stuff) {
            try {
                await this.$confirm(`确认解除物料「${stuff.name}」与区域的关联？`, '提示', { type: 'warning' })
                await this.$send_req('/scale/del_region_stuff', { stuff_id: stuff.id })
                this.refresh_list()
            } catch (e) {
                // cancelled
            }
        }
    }
}
</script>
