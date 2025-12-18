<script>
export default {
    onLaunch: function () {
        console.log('App Launch')
    },
    onShow: async function (options) {
        let path = options.path;
        if (path == 'pages/Driver' || path == 'pages/Ticket') {
            console.log('Driver or Ticket');
        } else {
            await this.$init_self();
        }
    },
    onHide: function () {
        console.log('App Hide')
    }
}
</script>

<style lang="scss">
/* 注意要写在第一行，同时给style标签加入lang="scss"属性 */
@import "uview-ui/index.scss";
</style>
