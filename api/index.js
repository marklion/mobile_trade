const express = require('express');
const app = express();
const result_maker = require('./result');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/version', (req, res) => {
    res.send(result_maker('V1.1'));
});
app.listen(8080, () => console.log('Server running on port 8080'));