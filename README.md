# Building containerized cloud infrastructure

The technology barrier for startups is lower than ever with easy access to cloud services and mature open source technologies. In this post, I will talk about my vision for building a container-based cloud infrastructure, focusing on open source technologies in a cloud-vendor agnostic approach.

A common misconception is that Enterprises see open-source as the enemy (full disclosure - currently employed at a large technology firm). On the product side, open source components help accelerate delivery of enterprise products to market. They will also complete against open-source alternatives. It's imperative that an enterprise product differentiate their offering with product features and thought leadership against open-source alternatives. Open-source vendors with a support-only business models find business growth very challenging and often seed the open source offering with paid add-ons / product offerings. Regardless of the vendor offerings, we will only look at the open-source (license friendly) offerings.

The choice of enterprise vs open source software is an organizational decision, based on many factors such as in-house skills, company culture, and cost. If your company core competency is not IT, then building a relationship with an enterprise vendor is a favourable choice. On the other hand, open source software is a good option if your building out a team with a strong technology background. You may even take a hybrid approach of both enterprise and open-source software based on your needs.

In this tutorial, I will describe and demonstrate key areas that you need to design and build out when deploying a cloud-ready digital application. We will focus on building our solution using Docker so we can easily integrate it into a DevOps pipeline to support continous integration and scale in a cloud environment.

In this tutorial series, we will focus on the following areas:

1. **Digital Application**: Gateway, Node.js & Mongodb
2. **Log Management**: ELK (ElasticSearch, Logstash/Logspout, Kibana)
3. **Monitoring**: Prometheus
4. **Elastic Scaling & High Availability**: Deployment on container orchestration platforms (Docker Swarm / Kubernetes)
5. **Managing Security**: managing secrets and 

# Deploy a three-tier digital application

**Duration:** 20 minutes 

## Prerequisites
 * [Docker Toolbox](https://www.docker.com/products/docker-toolbox) for Mac (or Windows) - this tutorial was written using Mac.
 * Intermediate Docker skills - docker concepts are briefly reviewed but its assumed you have previous experience working with Docker.
 * Use `git` to download the artifacts from [here](https://github.com/ozairs/docker). You can use `git clone https://github.com/ozairs/docker` or download the ZIP file from the Web site.
 * Optional: if you prefer to use a GUI to manage docker instead of the command-line, you can download [portainer](http://portainer.io/). Since your running on the local Docker engine, make sure you use the flag `-v /var/run/docker.sock:/var/run/docker.sock`.

In this tutorial, you will deploy a three tier digital application (gateway, server & database) that finds Pokemon! ... umm kinda-of, its not like the mobile app; instead we are simply going to invoke a REST service to retrieve Pokemons stored within a database.

Let's talk about our technology choices ....

* **Database**: using [MongoDB]() as the persistent database. My reasons for selecting **MongoDB** is simplicity (document-oriented persistence model), community (easy to find answers) and found many code snippets with MongoDB & Node.js.
* **Server**: using [Node.js]() as the server runtime. My reasons are based on my programming skills in JavaScript & community-support (100K+ modules).
* **Gateway**: using [API Microgateway]() as the gateway runtime. The gateway component is often not talked about when building a digital application, but its important (and part of my day job so I am quite passionate / bias about it). The gateway will handle the security logic and keep a clear seperation of code from my server tier. The most popular reverse proxy / gateway solution in the open-source community is [nginx](), but extending it would require Lua skills which I don't have (nor the time to learn). Fortunately, the API microgateway is a Node.js-based gateway which includes NGNIX, so I can work with the Node.js gateway using my JavaScript skills and leverage NGINX for its specialized reverse-proxy capabilities.

Now that the awards have been announced, lets use Docker to deploy each component. The runtime flow is `gateway -> server -> database`.

1. In your command prompt, navigate to the `docker` directory where you copied the artifacts for the tutorial. You will see three directories. This directory will be referenced as `$PWD` in future steps.
	* **microgateway**: contains the Swagger files that defines the security policy and route for the backend services deployed in the server.
	* **loopback**: Node.js-based framework for creating APIs & microservices. In our example, it will interact with a database to return data for the application.
	* **mongodb**: empty directory but will be referenced as part of the Docker build
2. The microgateway container will need to be built from the GIT repository [here](https://github.com/strongloop/microgateway). A few steps are needed to setup the environment:
	1. Clone the repository with the command: `git clone https://github.com/strongloop/microgateway.git`.
	2. Switch directory `cd microgateway/`.
	3. Copy the file `$PWD/samples/microgateway.js` into `$PWD/microgateway/microgateway.js`. The folder `process.env.CONFIG_DIR` contains the location of gateway files.
	```
	'use strict';

	var mg = require('../lib/microgw');
	var fs = require('fs');

	// config dir
	process.env.CONFIG_DIR = __dirname + '/definitions/myapp';
	process.env.NODE_ENV = 'development';
	mg.start(4000);
	```
	4. The microgateway uses a YAML file to protect access to the API. Copy the file `$PWD/samples/pokemon_1.0.0.yaml` into `$PWD/microgateway/config/definitions/myapp/pokemon_1.0.0.yaml` and create the appropriate directories.
	5. Open the `Dockerfile` in `$PWD/microgateway` directory and modify the node environment from `production` to `development`.
	```
	ENV NODE_ENV development
	```
	6. Overwrite the Dockerfile from the `PWD/samples/Dockerfile` directory into the `microgateway` directory. The modified entries are shown below:
	```
	.
	.
	COPY package.json microgateway.js ./
	COPY definitions definitions/
	.
	.
	ENV NODE_ENV development
	CMD [ "node", "microgateway.js" ]
	```
3. Build an image for each component. Switch back to the top-level `docker` directory.
	1. Create the mongo container image: `docker build -t $USER/mongodb mongo:latest`. No Dockerfile is used since the image is pulled directly from DockerHub.
	2. Create the loopback container image: `docker build -t $USER/loopback loopback/.`. The `Dockerfile` includes instructions to copy the source code into the container and start it on port 3000.
	3. Create the microgateway container image: `docker build -t $USER/microgateway microgateway/.` The `Dockerfile` includes instructions to copy the source code into the container and start it on port 4000.
3. Make sure the images are built successfully
	```
	$ docker images
	REPOSITORY                                          TAG                 IMAGE ID            CREATED             SIZE
	ozairs/loopback                                     latest              0ed213818bd7        11 minutes ago      728 MB
	ozairs/microgateway                                 latest              34ba9aead272        2 days ago          360 MB
	ozairs/mongodb                                      latest              34ba9aead272        2 days ago          360 MB
	```
4. Deploy the container using the previously built docker images.
	1. Deploy the mongodb (database) container. The `-v` command is a volume mount between the local `mongodb`and the container directory `data/db` where all the data is stored.
	```
	$ docker run -dit --name mongodb -v $PWD/mongodb/data:/data/db $USER/mongodb:latest
	9451ec4cf1795c455c51fce2d95c540e5ca40e2f657b5b0de37ea5bd39d73612
	````
	2. Deploy the loopback (node) container. The `--link alias:container` parameter specifies a dependency on another container with the name `mongodb`. This is similar to a static host entry within a DNS system. In a later step, we will show how to simplify container dependencies.
	```
	$ docker run -dit --name loopback --link mongodb:mongodb $USER/loopback:latest
	9451ec4cf1795c455c51fce2d95c540e5ca40e2f657b5b0de37ea5bd39d73612
	````
	3. Deploy the microgateway container. The `--link alias:container` flag is used to specify that the microgateway container depends on the `loopback` container. The `-p` flag exposes ports to the host system. Notice that only the microgateway is exposing a port. You cannot
	```
	$ docker run -dit --name microgateway -p 4000:4000 --link loopback:loopback $USER/microgateway:latest
	9451ec4cf1795c455c51fce2d95c540e5ca40e2f657b5b0de37ea5bd39d73612
	````
5. Now that you have deployed the three containers, let's send a test message to the microgateway to make sure you get a successful response via communication across each container. The command URL uses the docker exposed port (4000) and includs a special header `X-IBM-Client-Id` which is used to identify the client requests.
	```
	$ curl https://localhost:4000/api/pokemon/1 -H "X-IBM-Client-Id: default" -k
	```
	Hooray! You get back a successful message but lets understand how these containers are able to communicate with each other.

	Containers get deployed within the same (internal) docker network. The containers are not accessible to the host machine unless you specify a port flag (`p`). Each container is provisioned with an IP address which is mapped to the DNS name of the container. The gateway should only accessible to the host (ie laptop) since its the component that will receive the external requests. The loopback and mongodb container cannot be accessed from the host, but these container can access each other using the DNS name of the container.

6. Open the following files to view the hostnames used for routing. If you deploy a container with a different name, you will need to modify these files and re-deploy the container:
	* **microgateway**: API files for applications are deployed as YAML files. These can be hand-created or you can the [API Connect Developer Toolkit](https://www.npmjs.com/package/microgateway).
	```
	cat ./microgateway/definitions/myapp/pokemon_1.0.0.yaml
	.
	.
	.
	assembly:
    execute:
      - invoke:
          target-url: http://loopback:3000/api/pokemon
	```
	* **loopback**: the datasources.json file contains environment information to connect to external data sources.
	```
	cat ./loopback/server/datasources.json
	.
	.
	.
	"mongo": {
		"host": "mongodb",
		"port": 27017,
	}
	```
	* **mongodb**: none needed
	Although the ports `3000` and `27017` are not exposed (`-p`) when creating the Docker container, they will need to be exposed on the Dockerfile to be accessible from other containers.
	```
	EXPOSE 3000
	```
Note: https://dantehranian.wordpress.com/2015/03/25/how-should-i-get-application-configuration-into-my-docker-containers/
7. Now that we have our application running, we will need a way to reproduce this deployment. Using `docker-compose`, its very simple to convert the docker commands into the docker compose format. A `docker-compose.yml` is already provided to demonstrate how to put this together. 
	1. Stop the running containers with the command `docker stop $(docker ps -a -q)`. If you have other containers running outside of this lab, you can manually stop the respective containers.
	2. Copy the `docker-compose.yml` file from `PWD/samples/docker-compose.yml` directory into the project root directory `$PWD`. 
	3. Build and run each container (if you want common prefix for the container names, use the `-p` flag).
	```
	docker-compose up
	```
	4. Verify that the containers are running
	```
	$ docker ps
	CONTAINER ID        IMAGE                                                      COMMAND                  CREATED              STATUS              PORTS                                                                                            NAMES
	c9b9944e19ae        docker_microgateway                                        "node microgateway.js"   About a minute ago   Up About a minute   0.0.0.0:32774->4000/tcp                                                                          docker_microgateway_1
	65eb544aa234        docker_loopback                                            "node server/serve..."   About a minute ago   Up About a minute   3000/tcp                                                                                         docker_loopback_1
	f19cde32534e        docker_mongodb                                             "docker-entrypoint..."   About a minute ago   Up About a minute   27017/tcp                                                                                        docker_mongodb_1
	```
	5. Issue a request to the microgateway to test the deployment.
	```
	$ curl https://localhost:4000/api/pokemon/1 -H "X-IBM-Client-Id: default" -k
	``` 

**Optional**

The API microgateway repository also includes nginx to optimize the microgateway with nginx TLS termination,  enhancing the performance of the API microgateway. 

1. You can modify our `docker-compose.yml` file to include ngnix as part of the deployment.
	```
  	nginx:
		build: nginx
		environment:
		- GATEWAY_DNS=microgateway
		ports:
		- "443:443"
		container_name: nginx
		depends_on:
		- microgateway
	```
2. Stop the existing containers with `docker-compose down`
3. Start the containers again (with the ngnix config) using `docker-compose up`.

Using docker-compose simplifies deployment since all containers are created with a single command, which includes the appropriate docker flags and dependencies. 

In this tutorial, you learned how to deploy a three-tier architecture consisting of a gateway, server and database using Docker. You then used docker-compose to perform the same deployment but using a single command since all docker runtime parameters and dependencies were included in the `docker-compose.yml` file.

# Analytics & Log Management using ELK

**Duration:** 15 minutes 

## Prerequisites
 * [Docker Toolbox](https://www.docker.com/products/docker-toolbox) for Mac (or Windows) - this tutorial was written using Mac.
 * Intermediate Docker skills
 * Use `git` to download the artifacts from [here](https://github.com/ozairs/docker).
 * If you did not complete the previous tutorial from the [series](../master/README.md), then download the project from [here](https://github.com/ozairs/docker) and create the containers using the `docker-compose.yml` file (ie `docker-compose up`)

The most common way to troubleshoot any application is to examine logs. In an container environment, where you might have a large number of transient running containers, you need an automated approach to discovery of containers and their respective logs. The ELK stack (Elastic Search / Logstash / Kibana) provides one of the simplest approach to log management. It delivers tools for collecting and searching logs, enabling DevOps to troubleshoot issues within their application and container infrastructure. We will describe how you use it to obtain logs from your container environment.

Before we dive into building an ELK stack, let's step back and review the components of **ELK**. 

* Logstash/Logspout (E**L**K): Logspout is a log router that attaches to the containers running on the same host and streams the logs to a syslog server. Logstash collects logs from logspout using syslog over tcp or udp.
* Elastic Search from (**E**LK): stores log messages in a distributed store, using sharding technologies for fast search.
* Kibana from (EL**K**): provides a graphical user interface (ie dashboards) for elastic search queries.

The overall flow:
1. Each container writes logs to the file system. 
2. Logspout monitors the log files from (`docker logs <container>`) and sends it to logstash through syslog via TCP.
3. Logstash sends the logs to elastic search
4. Kibana provides a dashboard to view the data from elastic search 

Alternatively, if you did not want to use logspout and would prefer to have the containers directly send logs to logstash, then you can add the following flags to the `docker run` command of each container `--log-driver=syslog --log-opt syslog-address=tcp://$IP_LOGSTASH:5000`. Personally, I think its a lot more work to add flags to each container. Furthermore, logspout will also become more useful when you run containers on multi-host environments.

We will deploy the stack using docker commands and then package the commands into a `docker-compose.yml` file. If you prefer to skip this section and work directly with the docker-compose file, you can skip to the section [here]()

1. Make sure the sample application is running. We will be collecting logs from this application.
	```
	docker ps
	```
2. Navigate to the `elasticsearch` directory `cd elk/elasticsearch`.
3. Examine the conf files in the `elasticsearch` directory. They define the format and log-level of the logs.
4. Enter the command to run the elasticsearch container
	```
	docker run -d --name elasticsearch -p 9200:9200 -v $PWD/elasticdata:/usr/share/elasticsearch/data -v $PWD/conf:/usr/share/elasticsearch/config/ elasticsearch:latest
	```
	This command exposes the port 9200 and maps the directory with the conf files and the elastic search data store.
5. Navigate to the `logstash` directory `cd elk/logstash`. We will deploy a logstash container to collect logs from logspout. It will use a `logstash.conf` file to define the `input` (ie ports and protocol used to collect logs) and `output` (elastic search destination to send the logs)
	```
	input {
		tcp {
			port => 5000
			type => syslog
		}
		udp {
			port => 5000
			type => syslog
		}
		gelf {
			
		}
	}
	output {
		elasticsearch { hosts => "elasticsearch:9200" }
	}
	```
6. Enter the command to run the logstash container
	```
	docker run -it --rm --name logstash -v $PWD/conf:/opt/logstash/conf.d -p 5000:5000 --link elasticsearch:elasticsearch logstash:latest -f /opt/logstash/conf.d/logstash.conf
	```
	This container maps the directory with the `logstash.conf` file into the container. It defines a dependency to elasticsearch container. The `-f` flag defines the control file for the container (based on the mapped volume).
7. Navigate to the `logspout` directory `cd elk/logspout`. Build the logspout container, it has special build triggers so we can't directly deploy it from the source repository.
	```
	docker build -t $USER/logspout .
	```
8. Deploy a logspout container. It will collect logs from each container and route them to a syslog server. Enter the command:
	```
	docker run --name logspout -v "/var/run/docker.sock:/var/run/docker.sock" -e SYSLOG_FORMAT=rfc3164 gliderlabs/logspout syslog://logstash:5000
	```
	We will now deploy logstash to recieve the logs sent by logspout.
6. Kibana can also use a configuration file but we will simply deploy with the command and include environment properties with `-e` flag.
	```
	docker run --name kibana --link elasticsearch:elasticsearch -e ELASTICSEARCH_URL=http://elasticsearch:9200 -p 5601:5601 -d kibana
	```
	This command deploys the kibana container with a dependency on the elastic search container, including an environment variable (`-e`) containing the elastic search endpoint. Notice that port 9200 is exposed on the elastic search container which kibana uses as part of its environment variable. 

7. Let's send a small test message to logstash to setup the elastic search index.
	```
	echo Hello! | nc 127.0.0.1 5000
	```
8. Open The Kibana dashboard at http://localhost:5601. Click **Create** to add an index pattern based on the default pattern `logstash-*` where * is the timestamp. 
	**Note:** index are used to group common log data together. You can create index using event names or based on timestamp.
9. Issue a request to the microgateway to verify that logs are sent to ElasticSearch.
	```
	curl https://localhost:4000/api/pokemon/1 -H "X-IBM-Client-Id: default" -k
	``` 
10. You should see the logs in the Kibana dashboard. Use the search textbox to filter logs from a particular container. Enter `*microgateway` and you will see logs from the microgateway only.

### Deploy ELK using Docker Compose

1. You will run the same ELK stack again but using a `docker-compose.yml` file. 
2. Copy the `docker-compose.yml` file from `$PWD/samples/docker-compose.yml` to `$PWD/elk` directory.
3. Stop the ELK containers.
4. Build and run the ELK containers using docker-compose
	```
	cd elk
	docker-compose up
	```
5. Issue a request to the microgateway to verify that logs are sent to ElasticSearch.
	```
	curl https://localhost/api/pokemon/1 -H "X-IBM-Client-Id: default" -k
	``` 

**Optional:**

Now that you have an ELK stack, there are neat tweaks available to provide analytics from your logs.
We will setup a Kibana dashboard that will geographically locate the destination of the application that generated the logs. You will need to redeploy the logspout container to pick up these new changes.

1. Download the latest GeoIP database from [here](http://geolite.maxmind.com/download/geoip/database/GeoLite2-City.tar.gz)
2. Unzip the file into the directory `elk/logstash/conf`.
	We will use ngnix to identify the IP address. Logstash treats the entire log message as a single field unless a pattern is provided to parse out individual attributes, which allow you to index them and perform neat things like geolocating requests! Logstash does not ship with the nginx pattern so it won't be able to index the ip adddress field in the message. 
3. Modify the `elk/logstash/conf/logstash.conf` to include a `filter` section between the `input` and `output` sections
	```
	filter {
		if  'nginx' in [docker.name] {
			grok {
				match => { "message" => "%{IPORHOST:remote_addr} - %{USERNAME:remote_user} \[%{HTTPDATE:time_local}\] %{QS:request} %{INT:status} %{INT:body_bytes_sent} %{QS:http_referer} %{QS:http_user_agent}" }
			}
			geoip {
				source => "remote_addr"
				target => "geoip"
				database => "/opt/logstash/conf.d/GeoLite2-City.mmdb"
			}
			mutate {
				add_tag => [ "ngnix" ]
			}
		}    
	}
	```
4. Send a sample request and examine the log entries and make you see the `geoip.location` field.
	```
	curl https://localhost:4000/api/pokemon/1 -H "X-IBM-Client-Id: default" -k
	``` 
5. Create a visualization dashboard in Kibana to view the requests on a map
	1. Select **Visualize -> Create a new visualization**, and then select **Tile map**.
	2. Select the existing `logstash-*` index.
	3. Select the following:
		1. **Select buckets type:** Geo Coordinates.
		2. **Aggregation:** Geohash
		3. **Field:** geoip.location
	4. Click **Play** icon. You should now see a map based on the log geodata of the location.


In this tutorial, you learned how to setup an ELK stack that provides access to logs from your containers. Recall that each container sends logs to the local syslog deamon. Logstash collects the logs and sends it to elasticsearch. Kibana provides a dashboard to view the logs from elastic search.

# Container monitoring using Promestheus

**Duration:** 15 minutes 

## Prerequisites
 * [Docker Toolbox](https://www.docker.com/products/docker-toolbox) for Mac (or Windows) - this tutorial was written using Mac.
 * Intermediate Docker skills
 * Use `git` to download the artifacts from [here](https://github.com/ozairs/docker).
 * If you did not complete the previous tutorial from the [series](../master/README.md), then download the project from [here](https://github.com/ozairs/docker) and create the containers using the `docker-compose.yml` file (ie `docker-compose up`)

In previous tutorials you deployed a three-tier application and used the ELK stack to manage logs. Logs help you determine where a potential issue could arise but they don't often tell you if the container is running low on memory (unless you have proactive log scraping) or give you a general view of health across your infrastructure. 

DevOp teams need monitoring tools to proactively determine issues within the environment. There are many great monitioring tools in the market, but Prometheus came out on top in my list of open source solutions. I really liked its user interface (Grafana) and pre-built support for Docker container monitoring.

Let's setup Prometheus in our environment. We won't build each of the containers manually since we have already gone through the steps in previous tutorials. We will simply present a `docker-compose.yml` file with the required containers and quickly walk through the components.

* Prometheus: persistent store of all metrics collected from the host (Docker) system
* Node Exporter: provides metrics of the host machine to Prometheus.
* cAdvisor: provides container metrics to Prometheus.
* Grafana: user interface for viewing metrics stored in Promethus
* AlertManager: create alerts when thresholds are exceeded in Prometheus. This component is not discussed in this tutorial.

Let's deploy Prometheus on our host system to gather metrics from our containers
1. Navigate to the `$PWD/prometheus/` directory and open the `docker-compose.yml` file.
2. Prometheus is built from the base image and maps the volume with the `prometheus.yml` file. The command field sets an environment variable pointing to the `prometheus.yml` file.
	```
	prometheus:
    image: prom/prometheus:latest
	.
	.
	command:
      - '-config.file=/etc/prometheus/prometheus.yml'
	```
3. Node Exporter is built from the base image and assigned a port
	```
	  node-exporter:
    	image: prom/node-exporter
	```
4. Grafana is built from the base image and includes a dependency to prometheus
	```
	  grafana:
    	image: grafana/grafana
	```
5. cAdvisor is built from the base image and includes volume mounts for detecting running docker containers.

**Note**: The docker dashboards for Grafana were downloaded from [here](https://github.com/stefanprodan/dockprom/tree/master/grafana).

Now that we have reviewed the components and the `docker-compose.yml` file, lets deploy the containers.

1. Make sure your in the `$PWD/prometheus` directory and issue the command
	```
	docker-compose up
	```
	This will create all the containers and start streaming the log messages from all of the containers
2. Open a Web browser to http://127.0.0.1:13000 and login with `admin/passw0rd`.
3. Click the Grafana icon and select Data Sources. Click **+Add data source**.
4. Enter the name `Prometheus` and change the **Type** to `Prometheus`.
5. Under **Http settings**, enter the URL http://127.0.0.1:10090 and chagne **Access** to `direct`.
6. Click **Save & Test** and make sure you get a **Success** message.
7. Click the **Dashboards** tab (default is Config tab) and click the blue Import button.
8. Click the Grafana icon and select **Dashboard -> Home**. Click the Prometheus Stats dashboard. You will now see dashboard for the prometheus container. Now that we have validated the Prometheus datasource, we will import docker dashboards.
9. Click **Dashboards -> Import** and enter the ID 893 and click Load. Select the Prometheus datasource and click **Save and Load**. The details for this dashboard are available [here](https://grafana.com/dashboards/893).
	Dashboards can be downloaded from [here](https://grafana.com/dashboards)
10. Click the Grafana icon and select **Dashboard -> Home**. Click the Docker container dashboards to view monitoring data about each container in your environment. Repeat the step to view other dashboards.

**Note**: If you shutdown the containers, all the data will be list. You can preserve the data by mapping the database volumes to a local folder so when the container starts it will use the data from the mapped volume.
	```
	prometheus
	  volumes:
	  - ./prometheus_db:/var/lib/prometheus

	grafana:
	  volumes:
	  - ./grafana_db:/var/lib/grafana
	```

In this tutorial, you learned how to setup a monitoring stack using Prometheus to monitor your Docker environment. Using Grafana, you can view information about the Docker engine, Docker containers and detailed information for Nginx.


## Isolate containers using Docker networking

## Prerequisites
 * [Docker Toolbox](https://www.docker.com/products/docker-toolbox) for Mac (or Windows) - this tutorial was written using Mac.
 * Intermediate Docker skills
 * Use `git` to download the artifacts from [here](https://github.com/ozairs/docker).
 * If you did not complete the previous tutorial from the [series](../master/README.md), then download the project from [here](https://github.com/ozairs/docker) and create the containers using the `docker-compose.yml` file (ie `docker-compose up`)

## Overview

In this tutorial, you will explicitly configure your docker containers to run on seperate network segments. For now, we have not focused on restricting access between containers; although, by default docker creates a default network bridge within each docker-compose deployment. 

The idea is that you have a set of containers that need to communicate with each other, for example the ELK containers, but each of these containers shouldn't have access to the three-tier application (gateway/server/database) containers, only the logspout container will need access to the application since its sending the logs over to the ELK stack. You can create multiple networks. You can add containers to more than one network. Containers cannot communicate with networks that they don't belong to. 

We will visualize the existing deployment and then modify our docker-compose files to deploy the containers on different networks segments.

1. Run Weavescope to visualize the containers their relationships

```
sudo curl -L git.io/scope -o /usr/local/bin/scope
sudo chmod a+x /usr/local/bin/scope
scope launch
```
2. Open a Web browser to the URL http://localhost:4040/.
3. Click the **Containers** link at the top to visualize the running containers. The lines between  represent existing connections.
4. At the bottom, select the **Networks** link. You should see the following networks created by your docker-compose files:
	* application_default
	* elk_default
	* prometheus_default
	* bridge
	These are the default networks created by the docker-compose commands. Its a best practice to define the networks that the containers run on for enhanced security and aids in troubleshooting. When you want to make a container accessible to another network, you publish that port on the host machine.
	Docker provides several network types, such as bridged and overlay. The *bridge* network is the most common networking within a single host. It creates an isolated network for the containers where each container can talk to one another within the network. Containers outside the network must use the published port to access containers within the network.
	In the next step, you will modify the `docker-compose.yml` files to add the networks where they reside.
5. In the `application/docker-compose.yaml`, four containers are defined, where only the nginx container port is exposed to the host. The nginx container only needs to talk to the microgateway container and its port is defined to the host, so we will define it on a separate network called `application_external`. All other containers will be on the network `nternal`. The microgateway will be attached to both `external` and `internal`.
	```
	nginx:
		build: ./microgateway/nginx
		environment:
		- GATEWAY_DNS=microgateway:4000
		ports:
		- "4430:443"
		container_name: nginx
		depends_on:
		- microgateway
		networks: 
		- external
		
	microgateway:
		build: ./microgateway
		ports:
		- "4000:4000"
		depends_on:
		- "loopback"
		networks: 
		- external
		- internal

	loopback:
		build: ./loopback
		depends_on:
		- "mongodb"
		networks: 
		- internal

	mongodb:
		build: ./mongodb
		volumes:
		- "$PWD/mongodb/data:/data/db"
		networks: 
		- internal
	```
6. Add the networks to the ELK `docker-compose.yaml` file with the following:
	* logspout is on the `external` network
	* logstash is on the `external` and `internal` networks
	* elasticsearch and kibana are on the `internal` network
7. Optionally, add each container in the prometheus `docker-compose.yaml` to the `internal` network.
8. Re-run each docker-compose files and you should now see them attached to different networks. 
9. Send a request to nginx to verify that the deployment is successful
	```
	curl https://localhost:4430/api/pokemon/1 -H "X-IBM-Client-Id: default" -k
	``` 

**Note**:
1. The default set of networks available with the command: `docker network ls`. The `bridged` network is run by default.
2. The `docker network inspect <network>` command above shows all the connected containers on a network.

In this tutorial, you attached containers to different network but within the same host. In the next tutorial, you will look at how to deploy containers across multiple hosts using a docker orchestration platform, such as docker swarm.

# Continous Integration using Git and Jenkins

In this tutorial ...

## Configure Jenkins with GitHub SCM repository

1. Build and deploy Jenkins
2. Open the Jenkins UI at https://localhost:8080/
3. Under **Manage Jenkins**, click **Configure System**.
4. Scroll down to GitHub and verify that the API URL is set to https://api.github.com.
5. Leave **Manage hooks** checked and click the **Advance** button. 
6. A new view will appear where you can convert login and password to token. Select the **Form login and password** toggle and enter your credentials. Click the **Convert Token credentials** button.
7. Scroll back to the **Credentials** drop-down and select the recently created GitHub token.
8. Use the **Test connection** button to verify connectivity.

## Create Jenkins Job using Git

1. Switch back to the Jenkins home page and click **New Item** and enter a job name.
2. Select **Freestyle project** and click **OK**.
3. Click **Source Code Management** and enter the repository URL for your Git repository.
4. Click **Build Triggers** tab and select **GitHub hook trigger for GITScm polling**. This option triggers a build when changes are pushed to the Git repository.
5. Click **Build Environment** and check **Add timestamps to the Console Output**
6. Under **Build** click **Add build step** and select **Execute Shell**.
7. Enter the command to close any existing containers
	`sudo docker stop`
	**Note**: Since we are using the docker runtime from your local desktop, you will need `sudo` to run the docker command from another container.
8. Add another build step to remove the containers
	`sudo docker rm --force`
9. Add another build step to build the containers
	`sudo docker build`
10. Add another build step to run the containers
	`sudo docker run`
11. Click Save. Jenkins is ready to monitor your GIT repository and deploy your docker containers whenever you change something on the repository.

Alternatively, you create a Jenkins job file by scanning a Git repository for a Jenkins job file.

1. Switch back to the Jenkins home page and click **New Item** and enter a job name.
2. Select **Multibranch Pipeline** and click **OK**. You will be presented with the Configure screen.
3. Click **Add Source** under **Branch Sources**.
	* Choose **Git**
	* Enter Git repository URL (ie https://github.com/ozairs/myrepo)
4. Click Save and switch back to the home page to see your jobs.

# Create and Run a Docker Swarm

## Prerequisites
 * [Docker Toolbox](https://www.docker.com/products/docker-toolbox) for Mac (or Windows) - this tutorial was written using Mac.
 * Intermediate Docker skills
 * Use `git` to download the artifacts from [here](https://github.com/ozairs/docker).
 
## Orchestrate container deployments using Docker Swarm

In this tutorial, you will learn how to deploy containers using Docker swarm, wich is a Docker orchestration platform to run container across multiple hosts in a highly available topology and scale containers up and down depending on workload and availability.

You will setup a two-node Docker swarm to demonstrate the master and worker node concepts. Each docker swarm must have a master node (host) that is responsible for scheduling and all other nodes within the swarm are worker nodes that communicate with the master node. 

**Important**
 * Stop existing containers run with the `docker-compose` command using `docker-compose down`.

 **Instructions**

1. Use `docker-machine` to provision the master node (i.e. virtual-machine with docker engine provisioned and labelled as master node).

	The flags that you pass into the command depend on the driver that your using. If your using virtualbox, use the command:

	`docker-machine create --driver virtualbox --virtualbox-cpu-count=4 --virtualbox-memory-size=4096 manager-node`

2. Use `docker-machine` to provision the worker node (i.e. virtual-machine with docker engine provisioned and labelled as worker node).

	For Virtualbox, use the command:
	`docker-machine create --driver virtualbox --virtualbox-cpu-count=4 --virtualbox-memory-size=4096 worker1-node`

3. List the nodes that were created using `docker-machine ls`
	```
	NAME           ACTIVE   DRIVER         STATE     URL                         SWARM   DOCKER    ERRORS
	manager-node   -        vmwarefusion   Running   tcp://172.16.154.241:2376           v1.12.2

	worker1-node   -        vmwarefusion   Running   tcp://172.16.154.239:2376           v1.12.3
	```
4. Make the `manager-node` the swarm master 
	```
	eval $(docker-machine env manager-node)
	docker swarm init --advertise-addr $(docker-machine ip manager-node)
	```
5. The response to the `swarm init` action should provide a command to execute on worker nodes. Switch to the worker-node and run the same command.
	```
	eval $(docker-machine env worker1-node)
	docker swarm join \
	--token SWMTKN-1-0dzdhkkye2l2e7c7z0ggkjxdcpk7w9ny0eepmcc8s5foc6a01k-6dwq5cwgffrzs4f0in6vflqig \
	172.16.154.244:2377
	```
6. Examine the **swarm** status of the nodes (docker machines) with the commands:
	```
	eval $(docker-machine env manager-node)
	docker node ls
	ID                           HOSTNAME      STATUS  AVAILABILITY  MANAGER STATUS
	8mi0wjhdkaxhynna4v4s1hsl2 *  manager-node  Ready   Active        Leader
	evjx87a2f54cyzom7fkorev6a    worker1-node  Ready   Active
	```
	
The VIP uses ingress load balancing - all node workers listen for connections to published service ports. When that service is called by external systems, the receiving node will accept the traffic and internally load balance it using an internal DNS service that Docker maintains.

8. Schedule containers in the docker swarm with the command
	`docker service create --replicas 1 --name helloworld alpine ping docker.com`

9. Scale the number of containers instanceswith the command
	`docker service scale gateway=3`


## Multi-Host Deployments of ELK and Prometheus

* Elastic search fails unless the following field is specified: `sysctl -w vm.max_map_count=262144`
* Copy ELK folder into host system
* Add Docker swarm project with variable substitution

* ELK should be deployed with single replica and constraint node.hostname == manager-node

In order to monitor more hosts, all you need to do is to deploy a node-exporter and a cAdvisor container on each host and point the Prometheus server to scrape those.
Aggregate all metrics in a dedicated Prometheus instance that will serve as an overview of your whole infrastructure.

Stop the gateway and schedule exactly one instance on each node within the cluster using the `global` mode option

## Deployment containers on Kubernetes using minikube

In this tutorial ...

Terminology differences between docker swarm
* **Pod**: one or more (tightly-coupled) containers with attached volumes. For example, nginx and microgateway could be deployed in a pod. Kubernetes schedules pods to run, which indirectly run containers.
* **Deployment**: defines an app with pod replicas. For example, it would define that the pod must have two instances for HA. This would be similar to a docker service concept within `docker-compose`.
* **Service**: groups together pods based on labels or other characteristics, enabling service discovery of pods, similar to how `docker-compose` uses the `port` attribute. For example, this would deploy the gateway pod (nginx + microgateway) on port 4430 on the host machine. This is similar to the docker ingress controller.
* **Ingress**: exposes clustered applications to external traffic

At this point, we have focused on defining our containers using docker-compose, so it would be less than ideal if we had to rewrite it again for Kubernetes. Fortunately, someone has already solved the problem. [Kompose](https://github.com/kubernetes-incubator/kompose) is a tool that translates a docker-compose file into Kubernetes resources.