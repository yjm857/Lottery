import pandas as pd
import numpy as np
import collections
import warnings
import sys

# 경고 메시지 숨기기 (openpyxl 관련)
warnings.filterwarnings('ignore', category=UserWarning, module='openpyxl')

def generate_lotto_numbers(file_path):
    try:
        # Read the excel file
        df = pd.read_excel(file_path)
        
        # Extract the main winning numbers (columns 2 to 7, which are indices 2:8)
        numbers_df = df.iloc[:, 2:8]
        
        # Get all numbers into a single list
        all_numbers = numbers_df.values.flatten().tolist()
        
        # Filter out any non-numeric or NaN values
        all_numbers = [int(n) for n in all_numbers if pd.notna(n)]
        
        # Calculate frequencies
        counts = collections.Counter(all_numbers)
        
        # Ensure all numbers from 1 to 45 are represented
        for i in range(1, 46):
            if i not in counts:
                counts[i] = 0
                
        # Calculate probabilities
        total_drawn = sum(counts.values())
        numbers = list(range(1, 46))
        probabilities = [counts[num] / total_drawn for num in numbers]
        
        # Generate 6 unique numbers based on probabilities
        selected_numbers = np.random.choice(
            numbers, 
            size=6, 
            replace=False, 
            p=probabilities
        )
        
        # Sort the numbers for better readability
        selected_numbers.sort()
        
        return selected_numbers, counts
        
    except Exception as e:
        print(f"Error processing the file: {e}")
        return None, None

if __name__ == "__main__":
    file_path = "c:\\Users\\yjm85\\Project\\Lottery\\Lottery_History.xlsx"
    
    selected, counts = generate_lotto_numbers(file_path)
    
    if selected is not None:
        print("\n================================================")
        print("[ 과거 당첨 횟수(확률) 기반 로또 예상 번호 ]")
        print("================================================")
        print(f"추천 번호: {', '.join(map(str, selected))}")
        print("================================================\n")
        
        print("[ 역대 가장 많이 나온 번호 Top 5 ]")
        for num, count in counts.most_common(5):
            print(f" - {num}번: {count}회")
            
        print("\n[ 역대 가장 적게 나온 번호 Bottom 5 ]")
        for num, count in counts.most_common()[-5:]:
            print(f" - {num}번: {count}회")
