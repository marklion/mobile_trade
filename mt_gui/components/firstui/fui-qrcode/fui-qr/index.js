// 本文件由FirstUI授权予北京卓创维朗科技有限公司（会员ID： 2 81 4，营业执照号： 911  1 01  0 8    M  A 01  L12L XQ）专用，请尊重知识产权，勿私下传播，违者追究法律责任。
import QRCode from './lib/QRCode.js'
import ErrorCorrectLevel from './lib/ErrorCorrectLevel.js'

var qrcode = function(data, opt) {
	opt = opt || {};
	var qr = new QRCode(opt.typeNumber || -1,
						opt.errorCorrectLevel || ErrorCorrectLevel.H);
	qr.addData(data);
	qr.make();

	return qr;
};

qrcode.ErrorCorrectLevel = ErrorCorrectLevel;

export default qrcode;
