import pandas as pd
import collections

# Read the excel file
df = pd.read_excel("c:\\Users\\yjm85\\Project\\Lottery\\Lottery_History.xlsx")

# Extract the winning numbers (columns 2 to 7)
numbers_df = df.iloc[:, 2:8]

# Get all numbers into a single list
all_numbers = numbers_df.values.flatten().tolist()

# Calculate frequencies
counts = collections.Counter(all_numbers)

print("Top 10 most frequent numbers:")
for num, count in counts.most_common(10):
    print(f"Number {num}: {count} times")

print("\nBottom 10 least frequent numbers:")
for num, count in counts.most_common()[-10:]:
    print(f"Number {num}: {count} times")
