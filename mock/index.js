const express = require('express');
const app = express();
app.use(express.json());
const port = 39087;

function log_req(req) {
    console.log(`Request: ${req.method} ${req.url}`);
    console.log(`Body: ${JSON.stringify(req.body)}`);
}
app.post('/thirdParty/zyzl/checkIn', (req, res) => {
    log_req(req);
    res.send({
        code: '0',
        data: {
            stationName: 'tsn',
        }
    });
});

app.post('/thirdParty/zyzl/saveRegister', (req, res) => {
    log_req(req);
    res.send({
        code: '0',
    });
});

app.post('/thirdParty/zyzl/changeRegister', (req, res) => {
    log_req(req);
    res.send({
        code: '0',
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});