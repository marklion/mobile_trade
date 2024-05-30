const express = require('express');
const app = express();
const port = 39087;

app.post('/thirdParty/zyzl/checkIn', (req, res) => {
    res.send({
        code:'0',
        data:{
            stationName:'tsn',
        }
    });
});

app.post('/thirdParty/zyzl/saveRegister', (req, res)=>{
    res.send({
        code:'0',
    });
});

app.post('/thirdParty/zyzl/changeRegister', (req, res)=>{
    res.send({
        code:'0',
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});