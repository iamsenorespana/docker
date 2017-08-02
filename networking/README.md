# Simplify infrastructure deployments with Docker networking

**Prerequisites**
 * If you did not complete the previous tutorial(s) per the [series](../master/README.md), switch to the `_prereq` directory and run `docker-compose up -f <file>` on each file in the directory.

In this tutorial, you will explicitly configure your docker containers to run on seperate network segments. For now, we have not focused on restricting network access between containers; although, by default docker creates a default network bridge within each docker-compose deployment. 

The idea is that you have a set of containers that need to communicate with each other, for example the ELK containers, but each of these containers shouldn't have access to the three-tier application (gateway/server/database) containers, only the logspout container will need access to the application since its sending the logs over to the ELK stack. You can create multiple networks. You can add containers to more than one network. Containers cannot communicate with networks that they don't belong to. 

We will visualize the existing deployment and then modify our docker-compose files to deploy the containers on different networks segments.

1. Run Weavescope to visualize the containers their relationships

```
sudo curl -L git.io/scope -o /usr/local/bin/scope
sudo chmod a+x /usr/local/bin/scope
scope launch
```
2. Open a Web browser to the URL http://localhost:4040/.
3. Click the **Containers** link at the top to visualize the running containers. The lines between represent existing connections.
4. At the bottom, select the **Networks** link. You should see the following networks created by your docker-compose files:
	* application_default
	* elk_default
	* prometheus_default
	* bridge
	These are the default networks created by the docker-compose commands. Its a best practice to define the networks that the containers run on for enhanced security and aids in troubleshooting. When you want to make a container accessible to another network, you publish that port on the host machine.
	Docker provides several network types, such as bridged and overlay. The *bridge* network is the most common network within a single host. It creates an isolated network for the containers where each container can talk to one another within the network. Containers outside the network must use the published port to access containers within the network.
	In the next step, you will modify the `docker-compose.yml` files to add the networks where they reside.
5. In the `application/docker-compose.yaml`, four containers are defined, where only the nginx container port is exposed to the host. The nginx container only needs to talk to the microgateway container, so we will define it on a separate network  `external`. All other containers will be on the network `internal`. The nginx container will be attached to both `external` and `internal`.
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
		- internal
		
	microgateway:
		build: ./microgateway
		ports:
		- "4000:4000"
		depends_on:
		- "loopback"
		networks: 
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
6. Specify the networks for the ELK `docker-compose.yaml` file with the following:
	* logspout is on the `external` and `internal` networks
	* logstash, elasticsearch and kibana are on the `internal` network
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