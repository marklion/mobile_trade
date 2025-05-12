<template>
<div v-if="stamp_pic">
    <el-image style="width: 300px;height: 300px;" :zoom-rate="1.2" :preview-src-list="[$make_file_url(stamp_pic)]" :src="$make_file_url(stamp_pic)" fit="cover">
    </el-image>
    <br>
    <el-button type="danger" @click="delete_stamp_pic">删除</el-button>
</div>
<div v-else>
    <el-upload ref="upload" :action="upload_url" :file-list="fileList" :limit="1" :on-success="after_attach_uploaded" :on-error="meet_upload_error" :on-exceed="handle_exceed" :before-upload="before_upload">
        <el-button size="small" type="primary">点击上传</el-button>
    </el-upload>
</div>
</template>

<script>
export default {
    name: 'SealPic',
    description: '磅单印章',
    data() {
        return {
            stamp_pic: '',
            fileList: [],
            upload_url: this.$make_file_url()
        }
    },
    props: {
        set_pic_interface: Function,
        get_pic_interface: Function,
    },
    mounted() {
        this.init_stamp_pic();
    },
    methods: {
        delete_stamp_pic: async function () {
            this.$confirm('确定删除磅单印章图片吗？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                await this.set_pic_interface('');
                this.stamp_pic = '';
                this.$message.success('删除成功');
            });
        },
        after_attach_uploaded: async function (res, file, fileList) {
            if (res) {
                this.stamp_pic = res;
                await this.set_stamp_pic();
                this.$message.success('上传成功');
            } else {
                this.$message.error('上传失败')
            }
        },
        meet_upload_error(err) {
            this.$message.error('上传出错:' + err)
        },
        init_stamp_pic: async function () {
            let ret = await this.get_pic_interface();
            this.stamp_pic = ret;
        },
        set_stamp_pic: async function () {
            await this.set_pic_interface(this.stamp_pic);
        },
        handle_exceed() {
            this.$message.warning('最多只能上传1张图片');
        },
        before_upload(file) {
            const isImage = file.type.indexOf('image') !== -1
            if (!isImage) {
                this.$message.error('只能上传图片文件!')
                return false
            }
            return true
        }
    }
}
</script>
