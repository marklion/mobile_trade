#!/bin/bash
IS_ADD=${1}
if [ "${IS_ADD}" == "true" ]
then
    sed -i "/const app = express();/a const cors = require('cors'); app.use(cors());" index.js
else
    sed -i "/const cors = require('cors'); app.use(cors());/d" index.js
fi
chmod +w index.js