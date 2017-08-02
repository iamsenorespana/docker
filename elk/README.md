# Log Management & Analytics using ELK

**Duration:** 15 minutes 

**Prerequisites**
 * If you did not complete the previous tutorial(s) per the [series](../master/README.md), switch to the `_prereq` directory and run `docker-compose up -f <file>` on each file in the directory.

The most common way to troubleshoot any application is to examine logs. In an container environment, where you might have a large number of transient running containers, you need an automated approach to discovery of containers and their respective logs. The ELK stack (Elastic Search / Logstash / Kibana) provides one of the simplest approach to log management. It delivers tools for collecting and searching logs, enabling DevOps to troubleshoot issues within their application and container infrastructure. YOu will learn how you use it to obtain logs from your container environment and obtain deeper analytics into your application.

Before we dive into building an ELK stack, let's step back and review the components of **ELK**. 

* Logstash/Logspout (E**L**K): **Logspout** is a log router that attaches to the containers running on the same host and streams the logs to a syslog server. **Logstash** collects logs from logspout using syslog over tcp or udp.
* Elastic Search from (**E**LK): stores log messages in a distributed store, using sharding / indexing for fast search.
* Kibana from (EL**K**): provides a graphical user interface (ie dashboards) for elastic search queries.

The overall flow:
1. Each container writes logs to the file system. 
2. Logspout monitors the log files from (`docker logs <container>`) and sends it to logstash through syslog via TCP.
3. Logstash sends the logs to elastic search
4. Kibana provides a dashboard to view the data from elastic search 

Alternatively, if you did not want to use logspout and would prefer to have the containers directly send logs to logstash, then you can add the following flags to the `docker run` command of each container `--log-driver=syslog --log-opt syslog-address=tcp://$IP_LOGSTASH:5000`. Personally, I think its a bit messy to add flags to each container. Furthermore, logspout will also become more useful when you run containers on multi-host environments.

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
	This command exposes the port 9200 and creates a volume between the conf files and the elastic search data store.
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
8. Deploy a logspout container (directly from DockerHub). It will collect logs from each container and route them to a syslog server. Enter the command:
	```
	docker run --name logspout -v "/var/run/docker.sock:/var/run/docker.sock" -e SYSLOG_FORMAT=rfc3164 gliderlabs/logspout syslog://logstash:5000
	```
	We will now deploy logstash to recieve the logs sent by logspout.
6. Kibana can also use a configuration file but we will simply deploy with the `docker` command and include environment properties with `-e` flag.
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

## Deploy ELK using Docker Compose**

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

Now that you have an ELK stack, there are neat features available to provide analytics from your logs.
We will setup a Kibana dashboard that will geographically locate the destination of the application that generated the logs. You will need to redeploy the logspout container to pick up these new changes.

1. Download the latest GeoIP database from [here](http://geolite.maxmind.com/download/geoip/database/GeoLite2-City.tar.gz)
2. Unzip the file into the directory `elk/logstash/conf`.
	We will use ngnix to identify the IP address. Logstash treats the entire log message as a single field unless a pattern is provided to parse out individual attributes, which allow you to index them and perform neat things like geolocating requests! Logstash does not ship with the nginx pattern so it won't be able to index the ip adddress field in the message, but we can apply a simple pattern to parse it out.
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

In this tutorial, you learned how to setup an ELK stack that provides access to logs from your containers and allows you to perform searching using Elastic Search via Kibana to provide deep insight into.