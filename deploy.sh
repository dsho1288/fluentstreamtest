docker login --username AWS -p $(aws ecr get-login-password --region us-east-2) 895334981351.dkr.ecr.us-east-2.amazonaws.com
docker build -t fluentstream .
docker tag fluentstream:latest 895334981351.dkr.ecr.us-east-2.amazonaws.com/fluentstream:latest
docker push 895334981351.dkr.ecr.us-east-2.amazonaws.com/fluentstream:latest

