#!/bin/bash
apt update
apt install -y curl
while true; do
    # Replace "ENV_VARIABLE" with the actual environment variable you want to use
    payload="{\"pwd\":\"$DEFAULT_PWD\"}"

    # Send the POST request using curl
    curl -X POST -H "Content-Type: application/json" -d "$payload" http://localhost/api/v1/internal_timeout

    # Sleep for 1 minute before sending the next request
    sleep 60
done