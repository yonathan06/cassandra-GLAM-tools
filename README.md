# GLAM Wiki Dashboard

The purpose of this project is to Support GLAMs* in monitoring and evaluating
their cooperation with Wikimedia projects. Starting from a Wikimedia Commons
category this tool collects data about usage, views, contributors and topology
of the files inside.

** GLAM - galleries, libraries, archives and museums

## Structure

The project is split into two packages - app & services.

* app - includes an express.js server that functions both as an API and as a front-end server (using mostly handlebars as render engine)
* services - includes python & node.js scripts for ETL (extract, transform & load) and recommendations (not currently active). The ETL includes a new GLAM loader (for when adding a new GLAM to the system), and a daily cron job to updated the analytical data of yesterday for all of the GLAMs in the system.

## Installation - app

Enter the /app folder

```bash
cd app
```

Install Node.js project dependencies:

```bash
npm install
```

**Add a development config file inside the config folder: `./config/config.development.json` With the same structure as in `./config/config.sample.json`**

Run the local server:

```bash
npm run dev
```

## Installation - services

Enter services folder

```bash
cd services
```

Install Python dependencies:

```bash
pip3 install -r requirements.txt
npm install
```

export ENV:

```bash
export ENV="development"
```

**Add a development config file inside the config folder: `./config/config.development.json` With the same structure as in `./config/config.sample.json`**


### Run initdaily.sh - script that run dail.py. Run it with the following commands to do it with a daily cron job
The daily script runs every day at 4:00 AM
Before you run the following commands, note:
1. Be sure the folder is located in $HOME
You can verify this by running the following command in $HOME : python3 $HOME/cassandra-GLAM-tools/services/daily.py  -e development
**Run `crontab -e`, and add the following line: `0 4 * * * cd $HOME/cassandra-GLAM-tools/services && /bin/bash initdaily.sh`**
You can always look to the file cronjobDaily.txt all the times when the daily was running
2. Note that your time on the host is in UTC


### Run new glam listener

```bash
pm2 start new_glam_listener.py --interpreter python3 -- -e development
```
z
## Starting local postgres instance using docker compose

```bash
docker-compose up -d
```
