# Deploying digital applications in a three-tier architecture

**Duration:** 20 minutes 

**Prequisites:** 
* Download the tutorial artifacts by cloning the directory: https://github.com/ozairs/docker.git.

In this tutorial, you will deploy a three tier digital application (gateway, server & database).

Let's talk about our technology choices ....

* **Database**: using [MongoDB]() as the persistent database. My reasons for selecting **MongoDB** is simplicity (document-oriented persistence model), community (easy to find answers) and found many code snippets with MongoDB & Node.js.
* **Server**: using [Node.js]() as the server runtime. My reasons are based on my programming skills in JavaScript & community-support (100K+ modules).
* **Gateway**: using [API Microgateway]() as the gateway runtime. The gateway component is often not talked about when building a digital application, but its important (and part of my day job so I am quite passionate / bias about it). The gateway will handle the security logic and keep a clear seperation of code from my server tier. The most popular reverse proxy / gateway solution in the open-source community is [nginx](https://www.nginx.com/), but extending it would require Lua skills which I don't have (nor the time to learn). Fortunately, the API microgateway is a Node.js-based gateway which includes NGNIX, so I can work with the Node.js gateway using my JavaScript skills and leverage NGINX for its specialized reverse-proxy capabilities.

Now that the awards have been announced, lets use Docker to deploy each component. The runtime flow is `gateway -> server -> database`.

1. In your command prompt, navigate to the `application` directory where you copied the artifacts for the tutorial. You will see two directories. This directory will be referenced as `$PWD` in future steps.
	* **loopback**: Node.js-based framework for creating APIs & microservices. In our example, it will interact with a database to return data for the application.
	* **mongodb**: empty directory but will be referenced as part of the Docker build
2. The microgateway container will need to be built from the GIT repository [here](https://github.com/strongloop/microgateway). A few steps are needed to setup the environment:
	1. Clone the repository with the command: `git clone https://github.com/strongloop/microgateway.git`.
	2. Switch directory `cd microgateway/`.
	3. Create a file `microgateway.js` with the following content. 
	```
	'use strict';

	var mg = require('../lib/microgw');
	var fs = require('fs');

	// config dir
	process.env.CONFIG_DIR = __dirname + '/definitions/myapp';
	process.env.NODE_ENV = 'development';
	mg.start(4000);
	```
	**Note**: The folder `process.env.CONFIG_DIR` contains the location of Open API files.
	4. The microgateway uses a Open API files to enforce access to APIs. Copy the file `$PWD/_samples/superfanz_1.0.0.yaml` into `$PWD/microgateway/definitions/myapp/superfanz_1.0.0.yaml` and create the appropriate directories.
	5. Since we are in development, lets switch any build flags from production. Open the `Dockerfile` in `$PWD/microgateway` directory and modify the node environment from `production` to `development`.
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
3. Build an image for each component. Switch back to the top-level `application` directory.
	1. Create the mongo container image: `docker build -t $USER/mongodb mongo:latest`. No Dockerfile is needed since the image is pulled directly from DockerHub.
	2. Create the loopback container image: `docker build -t $USER/loopback loopback/.`. The `Dockerfile` includes instructions to copy the source code into the container and start it on port 3000.
	3. Create the microgateway container image: `docker build -t $USER/microgateway microgateway/.` The `Dockerfile` includes instructions to copy the source code into the container and start it on port 4000.
4. Make sure the images are built successfully
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
	3. Deploy the microgateway container. The `--link alias:container` flag is used to specify that the microgateway container depends on the `loopback` container. The `-p` flag exposes ports to the host system. Notice that only the microgateway is exposing a port.
	```
	$ docker run -dit --name microgateway -p 4000:4000 --link loopback:loopback $USER/microgateway:latest
	9451ec4cf1795c455c51fce2d95c540e5ca40e2f657b5b0de37ea5bd39d73612
	````
5. Now that you have deployed the three containers, let's send a test message to the microgateway to make sure you get a successful response via communication across each container. The command uses the docker exposed port (4000) and includs a special header `X-IBM-Client-Id` which is used to identify the client requests.
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
7. Now that we have our application running, we will need a way to reproduce this deployment. Using `docker-compose`, its very simple to convert the docker commands into the docker compose format. A sample `docker-compose.yml` is already provided to demonstrate how to put this together. 
	1. Stop the running containers with the command `docker stop $(docker ps -a -q)`. If you have other containers running outside of this lab, you can manually stop the respective containers.
	2. Copy the `docker-compose.yml` file from `PWD/_samples/docker-compose.yml` directory into the project root directory `$PWD/application`. 
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
4. Run the same test again but using port 443 (you should remove the exposed port from the microgateway)
	```
	$ curl https://localhost:4000/api/pokemon/1 -H "X-IBM-Client-Id: default" -k
	```

Using docker-compose simplifies deployment since all containers are created with a single command and it includes the appropriate docker flags and dependencies. 

In this tutorial, you learned how to deploy a three-tier architecture consisting of a gateway, server and database using Docker. You then used docker-compose to perform the same deployment but using a single command since all docker runtime parameters and dependencies are included in the `docker-compose.yml` file.