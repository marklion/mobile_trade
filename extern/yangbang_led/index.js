const { spawn } = require('child_process');
const moment = require('moment');
async function get_plans() {
    var myHeaders = new Headers();
    myHeaders.append("token", "project api code");
    myHeaders.append("Content-Type", "application/json");
    let ret = [];
    let page = 0;
    while (1) {
        var raw = JSON.stringify({
            "end_time": moment().format('YYYY-MM-DD'),
            "hide_manual_close": true,
            "pageNo": page,
            "start_time": moment().format('YYYY-MM-DD'),
            "status": 2
        });

        var requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: raw,
            redirect: 'follow'
        };

        let fet_ret = await fetch("https://www.d8sis.cn/mt_api/api/v1/sale_management/order_search", requestOptions);
        let tmp_plans = (await fet_ret.json()).result.plans;
        if (tmp_plans.length == 0) {
            break;
        }
        ret = ret.concat(tmp_plans);
        page++;
    }
    return ret;
}

var g_show_content = {
    have_not_check_in: {
        title: '  未排号',
        plates: [],
        cur_page: 0,
        count_per_page: 2,
    },
    have_not_call: {
        title: '等待叫号',
        plates: [],
        cur_page: 0,
        count_per_page: 2,
    },
    have_not_enter: {
        title: '  请进厂',
        plates: [],
        cur_page: 0,
        count_per_page: 2,
    },
    running: {
        title: '正在装车',
        plates: [],
        cur_page: 0,
        count_per_page: 2,
    },
    page_update: function () {
        let content_json = JSON.parse(JSON.stringify(g_show_content));
        Object.keys(content_json).forEach(key => {
            let ele = g_show_content[key]
            let total_count = ele.plates.length;
            let next_count = total_count - (ele.cur_page * ele.count_per_page + ele.count_per_page);
            if (next_count > 0) {
                ele.cur_page += 1;
            }
            else {
                ele.cur_page = 0;
            }
        })
    },
    make_pair_content: function (c1, c2, line_count) {
        let output = '';
        output += c1.title;
        output += '|';
        output += c2.title;
        output += '\n';
        for (let index = 0; index < line_count; index++) {
            let tmp = c1.plates[c1.cur_page * line_count + index];
            let empty = ' '.repeat(8);
            output += tmp ? tmp : empty;
            output += '|';
            tmp = c2.plates[c2.cur_page * line_count + index];
            output += tmp ? tmp : empty;
            output += '\n';
        }
        return output;
    },
    show: function () {
        let show_content =
            this.make_pair_content(this.have_not_check_in, this.have_not_call, 2) +
            '-'.repeat(8) + '+' + '-'.repeat(8) + '\n' +
            this.make_pair_content(this.have_not_enter, this.running, 2);
        console.log(show_content);
        const program = spawn('./a.out', ['10.25.122.120', '5005', '12']);
        program.stdin.write(show_content);
        program.stdin.end();
        // 监听标准输出和标准错误
        program.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        program.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
        program.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
        });
    }
}

function refresh_data(have_not_check_in, have_not_call, have_not_enter, running) {
    g_show_content.have_not_check_in.plates = have_not_check_in;
    g_show_content.have_not_call.plates = have_not_call;
    g_show_content.have_not_enter.plates = have_not_enter;
    g_show_content.running.plates = running;
    g_show_content.page_update();
    g_show_content.show();
}

async function led_action() {
    let plans = await get_plans();
    let have_not_check_in = [];
    let have_not_call = [];
    let have_not_enter = [];
    let running = [];
    for (let index = 0; index < plans.length; index++) {
        const element = plans[index];
        let plate = element.main_vehicle.plate;
        if (element.enter_time) {
            running.push(plate)
        } else if (element.call_time) {
            have_not_enter.push(plate)
        } else if (element.check_in_time) {
            have_not_call.push(plate)
        } else {
            have_not_check_in.push(plate)
        }
    }
    refresh_data(have_not_check_in, have_not_call, have_not_enter, running);
}
async function main() {
    led_action();
    setInterval(led_action, 15000);
}
main()