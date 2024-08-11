<template>
	<view>
		<list-show :fetch_function="get_all_paper" :fetch_params="[plan_id, open_id]" v-model="all_paper">
			<view v-for="single_paper in all_paper" :key="single_paper.id">
				<u-cell :title="single_paper.name">
					<view slot="right-icon">
						<fui-button btnSize="mini" text="答题" type="primary"
							@click="begin_exam(single_paper.questions)"></fui-button>
					</view>
				</u-cell>
			</view>
			<Qa v-show="show_qa" :dataList="qa_list" @submit="subData"></Qa>
		</list-show>

	</view>
</template>

<script>
	import ListShow from '../components/ListShow.vue';
	import Qa from '../components/Qa.vue';
	import index from '../uni_modules/uview-ui';
	export default {
		name: 'Exam',
		components: {
			'list-show': ListShow,
			'Qa': Qa
		},
		data: function() {
			return {
				plan_id: 0,
				open_id: '',
				all_paper: [],
				show_qa: false,
				qa_list: []
			}
		},
		methods: {
			get_all_paper: async function(pageNo, [plan_id, open_id]) {
				if (plan_id == 0) {
					return [];
				}
				let resp = await this.$send_req('/global/driver_get_paper', {
					plan_id: plan_id,
					pageNo: pageNo,
					open_id: open_id
				});
				return resp.papers;
			},
			begin_exam: function(qa) {
				this.show_qa = true;
				let tmp = qa.map((item, index) => {
					return {
						id: item.id,
						title: item.name,
						problemType: 'SINGLE',
						isSelect: 0,
						children: item.option_answers.map(({id,name})=>({id:id,answer:name}))
					}
				})
				this.qa_list = tmp;
			},
			subData(data) {
				console.log('提交的数据：' + JSON.stringify(data))
			}
		},
		onLoad: function(option) {
			this.plan_id = parseInt(option.plan_id);
			this.open_id = option.open_id;
		}
	}
</script>

<style>

</style>