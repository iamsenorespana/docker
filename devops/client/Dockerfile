FROM ubuntu:latest
RUN apt-get update && \
apt-get -qq -y install curl

RUN mkdir -p /usr/app/client
COPY client.sh /opt/app/client/client.sh
RUN chmod +x /opt/app/client/client.sh
CMD ["/opt/app/client/client.sh", "https://nginx:4430/api/pokemon/1 -H 'X-IBM-Client-Id: default'"]

#docker run --rm --name client $USER/curl-client