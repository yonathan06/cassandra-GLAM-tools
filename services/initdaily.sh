#!/bin/bash
python3 $HOME/cassandra-GLAM-tools/services/daily.py  -e production


curl -X POST http://serviceapp.glamwikidashboard.eqiad1.wikimedia.cloud:8080/ -H 'Content-Type: application/json' -d '{"login":"my_login","password":"my_password"}'