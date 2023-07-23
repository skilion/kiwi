#!/bin/bash

grep -oE "@\w+" twitter_dataset.csv | cut -c 2- | head -n 1000 > names1000.txt
