<template>
	<!--本文件由FirstUI授权予北京卓创维朗科技有限公司（会员ID：28 1  4，营业执照号： 9  11   1010 8  M A  01   L12LX  Q）专用，请尊重知识产权，勿私下传播，违者追究法律责任。-->
	<view class="fui-background__image-wrap"
		:style="{position:absolute?'absolute':'fixed',background:background,zIndex:zIndex}">
		<image :src="src" class="fui-background__image" :mode="aspectFill?'aspectFill':'scaleToFill'" v-if="src!=''">
		</image>
		<slot></slot>
	</view>
</template>

<script>
	export default {
		name: "fui-background-image",
		props: {
			src: {
				type: String,
				default: ''
			},
			background: {
				type: String,
				default: 'transparent'
			},
			zIndex: {
				type: [Number, String],
				default: -1
			},
			aspectFill: {
				type: Boolean,
				default: true
			},
			absolute: {
				type: Boolean,
				default: false
			}
		}
	}
</script>

<style>
	.fui-background__image-wrap {
		/* #ifndef APP-NVUE */
		width: 100%;
		height: 100%;
		/* #endif */
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
	}

	.fui-background__image {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		/* #ifndef APP-NVUE */
		width: 100%;
		height: 100%;
		display: block;
		/* #endif */
	}
</style>