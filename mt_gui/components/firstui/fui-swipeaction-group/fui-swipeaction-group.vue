<template>
	<!--本文件由FirstUI授权予北京卓创维朗科技有限公司（会员ID： 2 8 14，营业执照号：9111  0 1    0  8M A01 L    12L  XQ）专用，请尊重知识产权，勿私下传播，违者追究法律责任。-->
	<view>
		<slot></slot>
	</view>
</template>

<script>
	export default {
		name: "fui-swipeaction-group",
		data() {
			return {};
		},
		created() {
			this.children = [];
		},
		methods: {
			reset() {
				// wxs 会自己计算组件大小，所以无需执行下面代码
				// #ifndef APP-VUE || H5 || MP-WEIXIN
				this.children.forEach(child => {
					child.init()
				})
				// #endif
			},
			close() {
				this.children.forEach(child => {
					// #ifdef APP-VUE || H5 || MP-WEIXIN
					child.isShow = false;
					// #endif

					// #ifndef APP-VUE || H5 || MP-WEIXIN
					child.close()
					// #endif
				})
			},
			closeAuto(child) {
				// #ifndef APP-VUE || H5 || MP-WEIXIN
				if (this.openItem && this.openItem !== child) {
					this.openItem.close()
				}
				this.openItem = child
				// #endif

				// #ifdef APP-VUE || H5 || MP-WEIXIN
				this.children.forEach(item => {
					if (item !== child) {
						item.isShow = false;
					}
				})
				// #endif
			}
		}
	}
</script>

<style scoped></style>