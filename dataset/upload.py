import boto3, csv, sys, time
from botocore.exceptions import ClientError

if len(sys.argv) != 3:
	print("Usage:")
	print("upload.py <twitter_dataset.csv> <MessagesDynamoDbTable>")
	exit(0)

reader = csv.reader(open(sys.argv[1], "r"), quotechar="\"")
next(reader, None)  # skip the headers

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(sys.argv[2])

start_at = 0

last_time_ms = time.time_ns() // 1000_000
written = 0
try:
	with table.batch_writer() as writer:
		for row in reader:
			messageId = int(row[0])

			if messageId < start_at:
				continue

			text = row[1]
			writer.put_item(Item={
				"MessageId": messageId,
				"Text": text
			})

			written += 1

			delta_time_ms = (time.time_ns() // 1000_000) - last_time_ms
			if (delta_time_ms > 10_000):
				print(f"{written / (delta_time_ms / 1000)} w/s")
				print(messageId)
				last_time_ms = time.time_ns() // 1000_000
				written = 0

except ClientError as err:
	print(f"Couldn't load data into table {table.name}. Here's why: {err.response['Error']['Code']}: {err.response['Error']['Message']}")
	raise
