<template>
	<!--本文件由FirstUI授权予北京卓创维朗科技有限公司（会员ID： 281  4，营业执照号：9  11      1     01  08M A 01L12LXQ）专用，请尊重知识产权，勿私下传播，违者追究法律责任。-->
	<view :class="{'fui-form__field':hidden}">
		<slot></slot>
	</view>
</template>

<script>
	//此组件只为form表单提交传递数据使用，暂时用于微信小程序/百度小程序/QQ小程序
	export default {
		emits: ['input', 'update:modelValue'],
		name: "fui-form-field",
		behaviors: ['uni://form-field'],
		props: {
			//是否为隐藏域
			hidden: {
				type: Boolean,
				default: false
			},
			value: {
				type: [Number, String, Array],
				default: ''
			},
			modelValue: {
				type: [Number, String, Array],
				default: ''
			}
		}
	}
</script>

<style scoped>
	.fui-form__field {
		display: none;
		opacity: 0;
	}
</style>