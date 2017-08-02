# Container monitoring using Prometheus

**Duration:** 15 minutes 

**Prerequisites**
 * If you did not complete the previous tutorial(s) per the [series](../master/README.md), switch to the `_prereq` directory and run `docker-compose up -f <file>` on each file in the directory.

In previous tutorials you deployed a three-tier application and used the ELK stack to manage logs. Logs help you determine where a potential issue could arise but they don't often tell you if the container is running low on memory (unless you have proactive log scraping) or give you a general view of health across your infrastructure. 

DevOp teams need monitoring tools to proactively determine issues within the environment. There are many great monitioring tools in the market, but Prometheus came out on top in my list of open source solutions. I really liked its user interface (Grafana) and pre-built support for Docker container monitoring.

Let's setup Prometheus in our environment. We won't build each of the containers manually since we have already gone through the steps in previous tutorials. We will use an existing `docker-compose.yml` file with the required containers and quickly walk through the components.

* Prometheus: persistent store of all metrics collected from the host (Docker) system
* Node Exporter: provides metrics of the *host machine* to Prometheus.
* cAdvisor: provides *container* metrics to Prometheus.
* Grafana: user interface for viewing metrics stored in Promethus
* AlertManager: create alerts when thresholds are exceeded in Prometheus. This component is not discussed in this tutorial.

Let's deploy Prometheus on our host system to gather metrics from our containers
1. Navigate to the `$PWD/prometheus/` directory and open the `docker-compose.yml` file.
2. Prometheus is built from a base image and maps volumes based on the `prometheus.yml` file. The command field sets an environment variable pointing to the `prometheus.yml` file.
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

In this tutorial, you learned how to setup a monitoring stack using Prometheus. Using Grafana, you can view information about the Docker engine, Docker containers and detailed information for Nginx.