const fs = require('fs');

function createCpuRecorder(getActivity, filePath = '/database/cpu_record.log') {
    let lastRecordTime = 0;
    let suppressedRecords = 0;

    return function recordCpuUsage(req, cpuUsageCores, cpuLimitCores, totalCpuCores) {
        const now = Date.now();
        if (now - lastRecordTime < 5000) {
            suppressedRecords++;
            return;
        }
        const suppressed = suppressedRecords;
        suppressedRecords = 0;
        lastRecordTime = now;
        let activity;
        try {
            activity = getActivity(now);
        } catch (error) {
            activity = { activity_error: error.message };
        }
        const record = {
            time: new Date(now).toISOString(),
            cpu_usage_cores: Number(cpuUsageCores.toFixed(3)),
            cpu_limit_cores: cpuLimitCores,
            total_cpu_cores: totalCpuCores,
            suppressed_records: suppressed,
            trigger_request: {
                method: req.method,
                path: req.path,
            },
            ...activity,
        };
        fs.appendFile(filePath, JSON.stringify(record) + '\n', (error) => {
            if (error) {
                console.error('写入 CPU 日志失败:', error.message);
            }
        });
    };
}

module.exports = createCpuRecorder;
