import pandas as pd
import numpy as np
import collections
import warnings
import sys

# 경고 메시지 숨기기 (openpyxl 관련)
warnings.filterwarnings('ignore', category=UserWarning, module='openpyxl')

def generate_lotto_numbers(file_path, years=3):
    try:
        # Read the excel file
        df = pd.read_excel(file_path)
        
        # Calculate number of weeks (1 year = 52 weeks)
        weeks = years * 52
        
        # Extract the main winning numbers 
        # Columns 2 to 7 are indices 2:8
        numbers_df = df.iloc[:weeks, 2:8]
        
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

def print_result(years, selected, counts):
    if selected is not None:
        print("\n================================================")
        print(f"[ 최근 {years}년 당첨 횟수(확률) 기반 로또 예상 번호 ]")
        print("================================================")
        print(f"추천 번호: {', '.join(map(str, selected))}")
        print("================================================\n")
        
        print(f"[ 최근 {years}년 가장 많이 나온 번호 Top 5 ]")
        for num, count in counts.most_common(5):
            print(f" - {num}번: {count}회")
            
        print(f"\n[ 최근 {years}년 가장 적게 나온 번호 Bottom 5 ]")
        for num, count in counts.most_common()[-5:]:
            print(f" - {num}번: {count}회")

if __name__ == "__main__":
    file_path = "c:\\Users\\yjm85\\Project\\Lottery\\Lottery_History.xlsx"
    
    # 1년 (52주)
    selected_1y, counts_1y = generate_lotto_numbers(file_path, years=1)
    print_result(1, selected_1y, counts_1y)
    
    # 2년 (104주)
    selected_2y, counts_2y = generate_lotto_numbers(file_path, years=2)
    print_result(2, selected_2y, counts_2y)
    
    # 3년 (156주)
    selected_3y, counts_3y = generate_lotto_numbers(file_path, years=3)
    print_result(3, selected_3y, counts_3y)
