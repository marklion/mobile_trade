<template>
	<view class="page-main">
		<swiper class="swipercard" previous-margin="0" next-margin="0" :circular="false" :autoplay="false"
			:current="currentIndex" @change="eventHandle">
			<block v-for="(item, index) in newQuestionsAnswer" :key="index">
				<swiper-item class="swiperitem">
					<view class="itembox">
						<view class="box-hd">
							<view class="hdname">当前第<view class="text1">{{ index+ 1}}</view>道题</view>
							<view class="hdnum">共{{totalNum}}道题</view>
						</view>
						<view class="contentbox">
							<view class="boxtitle">
								<text class="textl">{{index+1}}、</text>
								<text class="textr">{{item.title}}</text>
							</view>
							<view v-if="item.problemType == 'SINGLE'">
								<view class="boxbody" v-for="(self,idxs) in item.children" :key="idxs">
									<view class="chooseitem" @click="singChoose(index,idxs)">
										<image class="sinchoose-on" v-if="self.isSelect" :src="chooseonImg" mode="">
										</image>
										<view class="sinchoose" v-else></view>
										<view class="bodyr">{{self.alias}}、{{self.answer}}</view>
									</view>
								</view>
							</view>
							<view v-if="item.problemType == 'MULTY'">
								<view class="boxbody" v-for="(self,idxm) in item.children" :key="idxm">
									<view class="chooseitem" @click="multyChoose(index,idxm)">
										<image class="sinchoose-on" v-if="self.isSelect" :src="chooseonImg2" mode="">
										</image>
										<view class="sinchoose sinchoose2" v-else></view>
										<view class="bodyr">{{self.alias}}、{{self.answer}}</view>
									</view>
								</view>
							</view>
							<view class="writeitem" v-if="item.problemType == 'QUESTION'">
								<textarea class="textInfo" v-model="item.userAnswer" @input="bindTextAreaBlur(index)"
									auto-height maxlength="200" placeholder="请输入您的答案" />
							</view>
						</view>
						<view class="footbtn">
							<view class="ftbtn1" @click="back(index)">上一题</view>
							<view class="ftbtn1" v-if="(index + 1) < totalNum" @click="next(index)">下一题</view>
							<view class="ftbtn2" v-else @click="submitData">提交</view>
						</view>
					</view>
				</swiper-item>
			</block>
		</swiper>
	</view>
</template>

<script>
	export default {
		props: {
			//问题列表数据
			dataList: {
				type: Array,
				default () {
					return []
				}
			}
		},
		watch: {
			dataList: {
				deep: true,
				immediate: true,
				handler(newArr) {
					if (newArr.length) {
						this.newQuestionsAnswer = JSON.parse(JSON.stringify(newArr))
						this.totalNum = newArr.length
						this.setEmptyData()
					}
				},
			}
		},
		data() {
			return {
				topBanner: require('../static/banner.png'),
				chooseonImg: require('../static/chooseon.png'),
				chooseonImg2: require('../static/chooseon2.png'),
				totalNum: 0,
				currentIndex: 0,
				newQuestionsAnswer: [],
				formSubmitData: [], //提交所需数据
			};
		},
		methods: {
			//创建提交数组的数据结构
			setEmptyData() {
				this.newQuestionsAnswer.forEach((res) => {
					let userAnswer = ''
					res.children && res.children.forEach(item => {
						if (!item.isSelect) item.isSelect = 0
						else userAnswer = item
					})
					if (res.problemType == 'QUESTION') userAnswer = res.userAnswer
					this.formSubmitData.push({
						id: res.id, //题目id
						userAnswer: userAnswer, //答案
					})
				})
			},
			submitData() {
				for (var i = 0; i < this.formSubmitData.length; i++) {
					if (!this.formSubmitData[i].userAnswer) {
						let toast = '请完成第' + (i + 1) + '题后提交！'
						uni.showToast({
							title: toast,
							icon: 'none'
						})
						this.currentIndex = i
						return
					}
				}
				this.$emit("submit", this.formSubmitData)
			},
			//单选事件
			singChoose(j, e) {
				if (this.newQuestionsAnswer[j].children[e].isSelect) {
					this.newQuestionsAnswer[j].children[e].isSelect = 0
					this.formSubmitData[j].userAnswer = ''
				} else {
					for (var i = 0; i < this.newQuestionsAnswer[j].children.length; i++) {
						if (this.newQuestionsAnswer[j].children[i].isSelect) {
							this.newQuestionsAnswer[j].children[i].isSelect = 0
						}
					}
					this.newQuestionsAnswer[j].children[e].isSelect = 1
					// 这块结合业务逻辑可以进行优化处理
					// 例如只保存用户已选择答案Id等
					this.formSubmitData[j].userAnswer = this.newQuestionsAnswer[j].children[e]
				}
				this.newQuestionsAnswer = JSON.parse(JSON.stringify(this.newQuestionsAnswer))
			},
			//多选事件
			multyChoose(j, e) {
				this.newQuestionsAnswer[j].children[e].isSelect = this.newQuestionsAnswer[j].children[e].isSelect ^ 1
				let obj = []
				for (var i = 0; i < this.newQuestionsAnswer[j].children.length; i++) {
					if (this.newQuestionsAnswer[j].children[i].isSelect) {
						// 这块结合业务逻辑可以进行优化处理
						// 例如 只保存用户已选择答案Id等
						// obj.push(this.newQuestionsAnswer[j].children[i].id)
						obj.push(this.newQuestionsAnswer[j].children[i])
					}
				}
				this.formSubmitData[j].userAnswer = obj
				this.newQuestionsAnswer = JSON.parse(JSON.stringify(this.newQuestionsAnswer))
			},
			//富文本
			bindTextAreaBlur(index) {
				this.formSubmitData[index].userAnswer = this.newQuestionsAnswer[index].userAnswer
			},
			//swiper改变时
			eventHandle(e) {
				// 这块可以结合业务逻辑进行优化处理，如左右滑动切换题目时做一些提示处理等
				this.currentIndex = e.detail.current
			},
			// 上一题
			back(index) {
				if (!index) return
				this.currentIndex = index - 1
			},
			//下一题
			next(index) {
				this.currentIndex = index + 1
			}
		}
	};
</script>

<style scoped>
	.page-main {
		width: 100%;
		height: 100%;
	}

	.topbox {
		width: 100%;
		height: 140rpx;
		position: relative;
	}

	.topbox .topimg {
		width: 100%;
		height: 100%;
	}

	.topbox .imgtext {
		position: absolute;
		bottom: 60rpx;
		left: 58rpx;
		font-size: 36rpx;
		font-weight: normal;
		color: #FFFFFF;
		line-height: 36rpx;
		text-shadow: 0rpx 2rpx 4rpx rgba(0, 0, 0, 0.5);

	}

	.swipercard {
		width: 100%;
		height: calc(100vh - 316rpx);
		background: #FFFFFF;
	}

	.itembox {
		width: calc(100% - 96rpx);
		padding: 32rpx 48rpx;
	}

	.box-hd {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 4rpx dashed #f0f0f0;
		padding-bottom: 16rpx;
		padding-left: 16rpx;
	}

	.hdname {
		width: 400rpx;
		font-size: 28rpx;
		display: flex;
		align-items: flex-start;
		font-weight: 500;
		color: #666666;
		line-height: 40rpx;
	}

	.text1 {
		color: #1FA474;
		font-size: 40rpx;
		line-height: 32rpx;
	}

	.hdnum {
		font-size: 28rpx;
		font-weight: 400;
		color: #666666;
		line-height: 42rpx;
	}

	.contentbox {
		font-size: 30rpx;
		color: #333333;
		margin-top: 48rpx;
	}

	.boxtitle .textl {
		width: 50rpx;
		height: 34rpx;
		background: linear-gradient(90deg, #C3FFDA 0%, #ffffff 100%);
	}

	.boxbody {
		padding-left: 40rpx;
		line-height: 64rpx;
		margin: 16rpx 0;
	}

	.chooseitem {
		display: flex;
		align-items: center;
	}

	.sinchoose {
		width: 28rpx;
		height: 28rpx;
		margin-right: 16rpx;
		border-radius: 50%;
		background: #FFFFFF;
		border: 2rpx solid #BFBDBD;
	}

	.sinchoose2 {
		border-radius: 6rpx;
	}

	.sinchoose-on {
		width: 32rpx;
		height: 32rpx;
		margin-right: 16rpx;
	}

	.writeitem textarea {
		min-height: 164rpx;
		margin: 24rpx auto;
		padding: 16rpx;
		border: 2rpx solid #EBEBEB;
		border-radius: 4px;
		font-size: 30rpx;
		color: #333333;
	}

	.footbtn {
		display: flex;
		justify-content: space-between;
		margin-top: 112rpx;
		padding: 0 24rpx;
	}

	.ftbtn1 {
		width: 270rpx;
		height: 80rpx;
		line-height: 80rpx;
		text-align: center;
		border: 2rpx solid #1FA474;
		font-size: 30rpx;
		font-weight: 500;
		color: #1FA474;
	}

	.ftbtn2 {
		width: 270rpx;
		height: 80rpx;
		line-height: 80rpx;
		text-align: center;
		background: #1FA474;
		font-size: 30rpx;
		font-weight: 500;
		color: #FFFFFF;
	}
</style>