# Dataset

## Requirements
- Python 3
- Download the [Twitter Sentiment Dataset](https://www.kaggle.com/datasets/prkhrawsthi/twitter-sentiment-dataset-3-million-labelled-rows) and extract `twitter_dataset.csv` in the current directory
- Deploy the AWS CDK for the backend in order to create the DynamoDB "Messages" table

## Install
```sh
pip install -r requirements.txt
```

## Upload messages to DynamoDB
Run the script:

```sh
python generate_dataset.py twitter_dataset.csv <MessagesDynamoDbTable>
```
