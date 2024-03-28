<template>
	<!--本文件由FirstUI授权予北京卓创维朗科技有限公司（会员ID：2 81  4，营业执照号：9   1   1  1 010  8MA01L 1 2 L   XQ）专用，请尊重知识产权，勿私下传播，违者追究法律责任。-->
	<!-- #ifdef APP-PLUS || H5 || MP-ALIPAY || MP-TOUTIAO|| MP-KUAISHOU || MP-JD || MP-360 || MP-LARK -->
	<checkbox-group :name="name">
		<slot></slot>
	</checkbox-group>
	<!-- #endif -->

	<!-- #ifdef MP-WEIXIN || MP-BAIDU || MP-QQ -->
	<fui-form-field :name="name" v-model="vals">
		<slot></slot>
	</fui-form-field>
	<!-- #endif -->
</template>

<script>
	export default {
		name: "fui-checkbox-group",
		emits: ['change', 'input', 'update:modelValue'],
		// #ifdef MP-WEIXIN
		behaviors: ['wx://form-field-group'],
		// #endif
		// #ifdef MP-BAIDU || MP-QQ || H5
		behaviors: ['uni://form-field'],
		// #endif
		props: {
			name: {
				type: String,
				default: ''
			},
			// #ifdef VUE3
			modelValue: {
				type: Array,
				default () {
					return []
				}
			},
			// #endif
			// #ifdef VUE2
			value: {
				type: Array,
				default () {
					return []
				}
			}
			// #endif
		},
		data() {
			return {
				vals: ''
			};
		},
		watch: {
			// #ifdef VUE3
			modelValue(vals) {
				this.modelChange(vals)
			},
			// #endif
			// #ifdef VUE2
			value(vals) {
				this.modelChange(vals)
			}
			// #endif
		},
		created() {
			this.childrens = []
		},
		methods: {
			checkboxChange(e) {
				this.$emit('change', e)
				// TODO vue2 兼容
				this.$emit('input', e.detail.value)
				// TODO vue3 兼容
				// #ifdef VUE3
				this.$emit("update:modelValue", e.detail.value);
				// #endif
			},
			changeValue(checked, target) {
				const vals = []
				this.childrens.forEach(item => {
					if (item.val) {
						vals.push(item.value);
					}
				})
				this.vals = vals;
				let e = {
					detail: {
						value: vals
					}
				}
				this.checkboxChange(e)
			},
			modelChange(vals) {
				this.childrens.forEach(item => {
					if (vals.includes(item.value)) {
						item.val = true;
					} else {
						item.val = false
					}
				})
			}
		}
	}
</script>

<style scoped></style>