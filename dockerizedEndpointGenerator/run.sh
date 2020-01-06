#!/bin/bash
app="paxos.message"
docker build -t ${app} .
docker run -d -p 80:8000 \
	--name=${app} \
	-v $PWD:/app ${app}