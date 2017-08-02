# Continous Integration using Git and Jenkins

In this tutorial ...

**Prerequisites**
 * If you did not complete the previous tutorial(s) per the [series](../master/README.md), switch to the `_prereq` directory and run `docker-compose up -f <file>` on each file in the directory.

## Deploy project artifacts to GitHub repository

You will need to create a GitHub repository with your Docker artifacts to perform a build using Jenkins. The project structure should be similar to the existing structure of the tutorial.

## Configure Jenkins with GitHub SCM repository

1. Navigate to the Build and deploy Jenkins using the command
	```
	docker-compose up
	```
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