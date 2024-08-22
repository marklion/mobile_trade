function getStringAfter(str, substr) {
	const index = str.indexOf(substr);
	if (index !== -1) {
		return str.substring(index + substr.length);
	}
	return ''; // 如果子字符串不存在，返回空字符串
}
async function get_ticket(id)
{
	var myHeaders = new Headers();
	myHeaders.append("Authorization", "APPCODE b7d2657dc4484135a256c339302e0f09");
	myHeaders.append("Content-Type", "application/json");

	var raw = JSON.stringify({
		"id": id
	});

	var requestOptions = {
		method: 'POST',
		headers: myHeaders,
		body: raw,
		redirect: 'follow'
	};

	let ret = await fetch("https://www.d8sis.cn/mt_api/api/v1/global/get_ticket", requestOptions);
	return await  ret.json()

}
async function print(ip, content)
{
	console.log(ip)
	const escpos = require('escpos');
	escpos.Network = require('escpos-network');

	const device = new escpos.Network(ip);
	const options = { encoding: "GB18030" /* default */ }
	// encoding is optional

	const printer = new escpos.Printer(device, options);

	device.open(function(error){
		console.log(error)
		let width = 0.15;
		let sec_width = width * 2
		printer
			.align('ct')
			.size(0.5, 0.5)
			.text(content.order_company_name + '\n出厂磅单')
			.text('客户:' + content.company_name)
			.align('LT')
			.tableCustom(
				[
					{ text:'物料名称', align:"LEFT", width:width},
					{ text:content.stuff_name, align:"LEFT", width:sec_width},
				])
			.tableCustom([
				{ text:'磅单号码', align:"LEFT", width:width},
				{ text:content.ticket_no, align:"LEFT", width:sec_width},
			])
			.tableCustom([
				{ text:'主车车号', align:"LEFT", width:width},
				{ text:content.plate, align:"LEFT", width:sec_width},
			])
			.tableCustom([
				{ text:'挂车车号', align:"LEFT", width:width},
				{ text:content.behind_plate, align:"LEFT", width:sec_width },
			])
			.tableCustom([
				{ text:'过皮重量', align:"LEFT", width:width},
				{ text:content.p_weight.toFixed(2) + '吨', align:"LEFT", width:sec_width },
			])
			.tableCustom([
				{ text:'过皮日期', align:"LEFT", width:width},
				{ text:content.p_time.substr(0, 10), align:"LEFT", width:sec_width },
			])
			.tableCustom([
				{ text:'过皮时间', align:"LEFT", width:width},
				{ text:content.p_time.substr(10), align:"LEFT", width:sec_width },
			])
			.tableCustom([
				{ text:'过毛重量', align:"LEFT", width:width},
				{ text:content.m_weight.toFixed(2) + '吨', align:"LEFT", width:sec_width },
			])
			.tableCustom([
				{ text:'过毛日期', align:"LEFT", width:width},
				{ text:content.m_time.substr(0, 10), align:"LEFT", width:sec_width },
			])
			.tableCustom([
				{ text:'过毛时间', align:"LEFT", width:width},
				{ text:content.m_time.substr(10), align:"LEFT", width:sec_width },
			])
			.tableCustom([
				{ text:'装车净重', align:"LEFT", width:width},
				{ text:content.count + '吨', align:"LEFT", width:sec_width },
			])
			.tableCustom([
				{ text:'铅封号码', align:"LEFT", width:width},
				{ text:(content.seal_no?content.seal_no:''), align:"LEFT", width:sec_width },
			],)
			.qrimage('http://mt.d8sis.cn/#/pages/Ticket?id=' + content.id, function(err){
				this.cut();
				this.close();
			});
	});
}
async function main()
{

	var usbScanner = require('./usbscanner').usbScanner;
	var getDevices = require('./usbscanner').getDevices;

	//get array of attached HID devices
	var connectedHidDevices = getDevices()

	//print devices
	console.log(connectedHidDevices)

	//initialize new usbScanner - takes optional parmeters vendorId and hidMap - check source for details
	var scanner = new usbScanner({vendorId:7851});

	//scanner emits a data event once a barcode has been read and parsed
	scanner.on("data", async function(code){
		code = code.toLowerCase();
		code = code.slice(0, 4) + ':' + code.slice(4);
		code = code.replace('/3/', '/#/');
		code = code.replace('id', '?id=');
		let id = getStringAfter(code, '?id=');
		let content = await get_ticket(parseInt(id));
		console.log(content);
		const args = process.argv.slice(2);
		print(args[0], content.result)
		console.log("recieved code : " + code);
	});
}
main()