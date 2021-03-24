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

Start a local postgres db instance using docker (make sure you have docker installed):

```bash
docker-compose up -d
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
```

**Add a development config file inside the config folder: `./config/config.development.json` With the same structure as in `./config/config.sample.json`**

## Get data

Create the file `.ssh/config`:

```bash
Host wmflabs
   HostName      tools-dev.wmflabs.org
   User          <user>
   Port          22
   IdentityFile  ~/.ssh/<key>
   LocalForward  3306 itwiki.analytics.db.svc.eqiad.wmflabs:3306
```

Open the SSH tunnel to the WMF databases:

```bash
autossh -f -N wmflabs
```

Create a systemd service unit to auto-launch autossh (optional):

```bash
[Unit]
Description=AutoSSH for stats.wikimedia.swiss database.
 
[Service]
User=<user>
Group=<user>
ExecStart=/usr/bin/autossh -N wmflabs
 
[Install]
WantedBy=multi-user.target
```