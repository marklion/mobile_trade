<template>
<el-container>
    <el-main>
        <stamp-pic :get_pic_interface="get_pic_interface" :set_pic_interface="set_pic_interface"></stamp-pic>
    </el-main>
</el-container>
</template>

<script>
import StampPic from '../../components/StampPic.vue';
export default {
    name: 'SealPic',
    description: '磅单印章',
    components: {
        "stamp-pic": StampPic
    },
    data() {
        return {}
    },
    methods: {
        get_pic_interface: async function () {
            let ret = await this.$send_req('/scale/get_stamp_pic');
            return ret.stamp_pic;
        },

        set_pic_interface: async function (pic) {
            await this.$send_req('/scale/set_stamp_pic', {
                stamp_pic: pic
            });
        },
    }
}
</script>
